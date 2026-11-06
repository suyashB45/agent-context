from concurrent.futures import ThreadPoolExecutor
from multiprocessing import get_context
from pathlib import Path
import tempfile
import unittest

from agent_context_mcp.store import ContextError, Store


def contender(path, task_id, agent_id):
    store = Store(path)
    try:
        return store.claim_task("demo", task_id, agent_id, 1)["owner"]
    except ContextError:
        return None


class StoreTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / "context.sqlite3"
        self.store = Store(self.path)
        self.store.create_project("demo", "Demo")

    def task(self):
        return self.store.create_task("demo", "planner", "Build login", files=["src/auth.py"])

    def test_persistence_between_process_instances(self):
        self.store.record_update("demo", "claude-1", "handoff", "Login added",
                                 "Next: add password reset", files=["src/auth.py"], git_ref="abc123")
        context = Store(self.path).get_context("demo")
        self.assertEqual(context["handoffs"][0]["agent_id"], "claude-1")
        self.assertEqual(context["handoffs"][0]["files"], ["src/auth.py"])

    def test_project_isolation_and_cross_project_task_rejection(self):
        task = self.task()
        self.store.create_project("other", "Other")
        self.store.record_update("demo", "agent", "note", "Private to demo")
        self.assertEqual(self.store.get_updates("other")["events"], [])
        with self.assertRaises(ContextError):
            self.store.record_update("other", "agent", "note", "Wrong task", task_id=task["id"])
        with self.assertRaises(ContextError):
            self.store.claim_task("other", task["id"], "agent", 1)

    def test_only_one_concurrent_claimant(self):
        task = self.task()
        with ThreadPoolExecutor(max_workers=8) as executor:
            winners = list(executor.map(lambda i: contender(self.path, task["id"], f"agent-{i}"), range(8)))
        self.assertEqual(sum(w is not None for w in winners), 1)

    def test_only_one_claimant_across_processes(self):
        task = self.task()
        with get_context("spawn").Pool(4) as pool:
            winners = pool.starmap(contender, [(self.path, task["id"], f"agent-{i}") for i in range(4)])
        self.assertEqual(sum(w is not None for w in winners), 1)

    def test_claim_renew_and_release(self):
        task = self.task()
        claimed = self.store.claim_task("demo", task["id"], "codex-1", 1)
        renewed = self.store.claim_task("demo", task["id"], "codex-1", claimed["version"])
        self.assertGreater(renewed["lease_until"], claimed["lease_until"])
        released = self.store.update_task("demo", task["id"], "codex-1", renewed["version"], "pending", "Handing off")
        self.assertIsNone(released["owner"])
        taken = self.store.claim_task("demo", task["id"], "claude-2", released["version"])
        self.assertEqual(taken["owner"], "claude-2")

    def test_stale_revision_and_wrong_owner_rejected(self):
        task = self.task()
        self.store.claim_task("demo", task["id"], "codex-1", 1)
        for agent, version in [("codex-1", 1), ("claude-1", 2)]:
            with self.assertRaises(ContextError):
                self.store.update_task("demo", task["id"], agent, version, "completed", "Done")

    def test_expired_claim_can_be_reclaimed(self):
        task = self.task()
        self.store.claim_task("demo", task["id"], "crashed-agent", 1)
        with self.store.connect(write=True) as db:
            db.execute("UPDATE tasks SET lease_until=0 WHERE id=?", (task["id"],))
        with self.assertRaises(ContextError):
            self.store.update_task("demo", task["id"], "crashed-agent", 2, "completed", "Too late")
        taken = self.store.claim_task("demo", task["id"], "replacement", 2)
        self.assertEqual(taken["owner"], "replacement")

    def test_completed_task_cannot_be_claimed(self):
        task = self.task()
        self.store.claim_task("demo", task["id"], "a", 1)
        self.store.update_task("demo", task["id"], "a", 2, "completed", "Tests passed")
        with self.assertRaises(ContextError):
            self.store.claim_task("demo", task["id"], "a", 3)

    def test_idempotent_updates_and_payload_conflicts(self):
        payload = dict(project_id="demo", agent_id="a", kind="note", summary="Once", request_id="retry-1")
        first = self.store.record_update(**payload)
        self.assertEqual(first, self.store.record_update(**payload))
        with self.assertRaises(ContextError):
            self.store.record_update(**{**payload, "summary": "Different"})
        self.assertEqual(len(self.store.get_updates("demo")["events"]), 1)

    def test_cursor_pagination_never_skips_updates(self):
        self.store.create_project("other", "Other")
        for i in range(7):
            self.store.record_update("demo", "a", "progress", str(i))
            self.store.record_update("other", "b", "progress", "interleaved")
        cursor, summaries = 0, []
        while True:
            page = self.store.get_updates("demo", cursor, limit=2)
            cursor = page["next_cursor"]
            summaries.extend(e["summary"] for e in page["events"])
            if not page["has_more"]:
                break
        self.assertEqual(summaries, list(map(str, range(7))))
        self.assertEqual(self.store.get_updates("demo", cursor)["events"], [])
        self.store.record_update("demo", "c", "progress", "new")
        self.assertEqual(self.store.get_updates("demo", cursor)["events"][0]["summary"], "new")

    def test_context_bounds_and_snapshot_cursor(self):
        for i in range(4):
            self.store.record_update("demo", "a", "decision", f"Choice {i}")
        context = self.store.get_context("demo", limit=2)
        self.assertTrue(context["decisions_truncated"])
        self.assertEqual(len(context["recent_updates"]), 2)
        self.store.record_update("demo", "b", "handoff", "New handoff")
        updates = self.store.get_updates("demo", context["latest_event_id"])
        self.assertEqual(len(updates["events"]), 1)

    def test_literal_search_and_search_pagination(self):
        for i in range(3):
            self.store.record_update("demo", "a", "note", f"100% progress {i}")
        self.store.record_update("demo", "a", "note", "unrelated")
        page = self.store.search_context("demo", "%", limit=2)
        self.assertEqual(len(page["events"]), 2)
        second = self.store.search_context("demo", "%", limit=2, before_event_id=page["next_before_event_id"])
        self.assertEqual(len(second["events"]), 1)
        self.assertIsNone(second["next_before_event_id"])
        self.assertEqual(self.store.search_context("demo", "' OR 1=1 --")["events"], [])

    def test_validation(self):
        for files in [["../secrets"], ["/etc/passwd"], ["C:\\secret"], ["x"] * 51]:
            with self.assertRaises(ContextError):
                self.store.record_update("demo", "a", "note", "Invalid paths", files=files)
        for limit in [0, 101, True]:
            with self.assertRaises(ContextError):
                self.store.get_updates("demo", limit=limit)
        with self.assertRaises(ContextError):
            self.store.record_update("demo", "", "note", "Empty agent")
        with self.assertRaises(ContextError):
            self.store.create_project("demo", "Different project")

    def test_task_and_project_pagination(self):
        for i in range(4):
            self.store.create_task("demo", "a", f"Task {i}")
        page = self.store.list_tasks("demo", limit=2)
        second = self.store.list_tasks("demo", limit=2, offset=page["next_offset"])
        self.assertEqual(len({t["id"] for t in page["tasks"] + second["tasks"]}), 4)
        self.assertIsNone(second["next_offset"])
        self.store.create_project("other", "Other")
        self.assertEqual(self.store.list_projects(limit=1)["next_offset"], 1)

    def test_task_creation_retries_do_not_duplicate_work(self):
        payload = dict(project_id="demo", agent_id="a", title="Once", request_id="task-retry")
        first = self.store.create_task(**payload)
        second = self.store.create_task(**payload)
        self.assertEqual(first["id"], second["id"])
        self.assertEqual(len(self.store.list_tasks("demo")["tasks"]), 1)
        with self.assertRaises(ContextError):
            self.store.create_task(**{**payload, "title": "Different"})

    def test_backup_contains_wal_records_and_never_overwrites(self):
        self.store.record_update("demo", "a", "handoff", "Durable update")
        backup = Path(self.temp.name) / "backup.sqlite3"
        self.store.backup(backup)
        restored = Store(backup)
        self.assertEqual(restored.get_context("demo")["handoffs"][0]["summary"], "Durable update")
        self.assertEqual(restored.check(full=True)["status"], "ok")
        with self.assertRaises(FileExistsError):
            self.store.backup(backup)
        with self.assertRaises(FileExistsError):
            self.store.backup(self.path)

    def test_legacy_migration_preserves_existing_rows(self):
        self.store.record_update("demo", "a", "note", "Existing row")
        with self.store.connect(write=True) as db:
            db.execute("DROP TABLE task_requests")
            db.execute("PRAGMA user_version=0")
        migrated = Store(self.path)
        self.assertEqual(migrated.check()["schema_version"], 1)
        self.assertEqual(migrated.get_updates("demo")["events"][0]["summary"], "Existing row")
        self.assertEqual(migrated.create_task("demo", "a", "After upgrade", request_id="new")["title"], "After upgrade")

    def test_future_schema_is_rejected(self):
        with self.store.connect(write=True) as db:
            db.execute("PRAGMA user_version=999")
        with self.assertRaises(ContextError):
            Store(self.path)

    def test_invalid_file_containers_and_control_characters(self):
        for files in ["", {}, False, ["source\nfile.py"]]:
            with self.assertRaises(ContextError):
                self.store.record_update("demo", "a", "note", "Bad files", files=files)

    def test_dashboard_activity_filters_and_agents(self):
        self.store.create_project("other", "Other")
        self.store.record_update("demo", "agent-a", "handoff", "Next agent")
        self.store.record_update("demo", "agent-b", "decision", "Use SQLite")
        self.store.record_update("other", "agent-a", "progress", "Working")
        task = self.store.create_task("demo", "agent-a", "Assigned")
        self.store.claim_task("demo", task["id"], "agent-a", 1)
        self.assertEqual(len(self.store.activity(project_id="demo", kind="handoff")["events"]), 1)
        first = self.store.activity(limit=2)
        second = self.store.activity(before_event_id=first["next_before_event_id"], limit=2)
        self.assertTrue(set(e["id"] for e in first["events"]).isdisjoint(e["id"] for e in second["events"]))
        agents = {agent["agent_id"]: agent for agent in self.store.agents()["agents"]}
        self.assertEqual(agents["agent-a"]["projects"], 2)
        self.assertEqual(agents["agent-a"]["claimed_tasks"], 1)
        self.assertEqual(self.store.overview()["agents_today"], 2)


if __name__ == "__main__":
    unittest.main()
