import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { Worker } from 'node:worker_threads';
import { Store, ContextError } from '../src/store.mjs';
import { fixture } from './helpers.mjs';

const task = (store) => store.createTask({ project_id: 'demo', agent_id: 'planner', title: 'Build login', files: ['src/auth.js'] });
test('persists handoffs between independent store instances', (t) => {
  const { store, database } = fixture(t);
  store.recordUpdate({ project_id: 'demo', agent_id: 'claude-1', kind: 'handoff', summary: 'Login added', details: 'Next: password reset' });
  const second = new Store(database);
  try { assert.equal(second.getContext({ project_id: 'demo' }).handoffs[0].details, 'Next: password reset'); }
  finally { second.close(); }
});
test('projects cannot reference one another’s tasks', (t) => {
  const { store } = fixture(t), work = task(store);
  store.createProject({ project_id: 'other', name: 'Other' });
  assert.deepEqual(store.getUpdates({ project_id: 'other' }).events, []);
  assert.throws(() => store.claimTask({ project_id: 'other', task_id: work.id, agent_id: 'a', expected_version: 1 }), ContextError);
  assert.throws(() => store.recordUpdate({ project_id: 'other', agent_id: 'a', kind: 'note', summary: 'Wrong task', task_id: work.id }), ContextError);
});
test('claims reject stale versions and wrong owners; renewal and release work', (t) => {
  const { store } = fixture(t), work = task(store);
  const claimed = store.claimTask({ project_id: 'demo', task_id: work.id, agent_id: 'a', expected_version: 1 });
  assert.equal(claimed.version, 2);
  assert.throws(() => store.updateTask({ project_id: 'demo', task_id: work.id, agent_id: 'a', expected_version: 1, status: 'completed', summary: 'Stale' }), ContextError);
  assert.throws(() => store.updateTask({ project_id: 'demo', task_id: work.id, agent_id: 'b', expected_version: 2, status: 'completed', summary: 'Wrong owner' }), ContextError);
  const renewed = store.claimTask({ project_id: 'demo', task_id: work.id, agent_id: 'a', expected_version: 2 });
  assert.ok(renewed.lease_until >= claimed.lease_until);
  const released = store.updateTask({ project_id: 'demo', task_id: work.id, agent_id: 'a', expected_version: 3, status: 'pending', summary: 'Handing off' });
  assert.equal(released.owner, null);
  assert.equal(store.claimTask({ project_id: 'demo', task_id: work.id, agent_id: 'b', expected_version: 4 }).owner, 'b');
});
test('expired claims can be reassigned, completed tasks cannot', (t) => {
  const { store } = fixture(t), work = task(store);
  store.claimTask({ project_id: 'demo', task_id: work.id, agent_id: 'a', expected_version: 1 });
  store.run('UPDATE tasks SET lease_until=0 WHERE id=?', work.id);
  assert.throws(() => store.updateTask({ project_id: 'demo', task_id: work.id, agent_id: 'a', expected_version: 2, status: 'completed', summary: 'Expired' }), ContextError);
  const reassigned = store.claimTask({ project_id: 'demo', task_id: work.id, agent_id: 'b', expected_version: 2 });
  store.updateTask({ project_id: 'demo', task_id: work.id, agent_id: 'b', expected_version: reassigned.version, status: 'completed', summary: 'Tests passed' });
  assert.throws(() => store.claimTask({ project_id: 'demo', task_id: work.id, agent_id: 'b', expected_version: 4 }), ContextError);
});
test('concurrent independent worker connections produce only one claimant', { timeout: 10000 }, async (t) => {
  const { store, database } = fixture(t), work = task(store);
  const workers = Array.from({ length: 4 }, (_, index) => new Worker(new URL('./claim-worker.mjs', import.meta.url), { workerData: { database, taskId: work.id, agent: `agent-${index}` } }));
  t.after(async () => { await Promise.all(workers.map((worker) => worker.terminate())); });
  const results = await Promise.all(workers.map((worker) => new Promise((resolve, reject) => { worker.once('message', resolve); worker.once('error', reject); })));
  assert.equal(results.filter(Boolean).length, 1);
});
test('update and task retries are idempotent and reject conflicting payloads', (t) => {
  const { store } = fixture(t);
  const update = { project_id: 'demo', agent_id: 'a', kind: 'progress', summary: 'Once', request_id: 'update-1' };
  assert.equal(store.recordUpdate(update).id, store.recordUpdate(update).id);
  assert.throws(() => store.recordUpdate({ ...update, summary: 'Changed' }), ContextError);
  const work = { project_id: 'demo', agent_id: 'a', title: 'Once', request_id: 'task-1' };
  assert.equal(store.createTask(work).id, store.createTask(work).id);
  assert.throws(() => store.createTask({ ...work, title: 'Changed' }), ContextError);
  // Python’s legacy JSON serialization included spaces in the stored request payload.
  store.run('UPDATE task_requests SET payload=? WHERE project_id=? AND request_id=?', '["a", "Once", "", []]', 'demo', 'task-1');
  assert.equal(store.createTask(work).title, 'Once');
});
test('cursor pagination never skips interleaved project updates', (t) => {
  const { store } = fixture(t); store.createProject({ project_id: 'other', name: 'Other' });
  for (let index = 0; index < 7; index++) {
    store.recordUpdate({ project_id: 'demo', agent_id: 'a', kind: 'progress', summary: String(index) });
    store.recordUpdate({ project_id: 'other', agent_id: 'b', kind: 'progress', summary: 'Other' });
  }
  let cursor = 0; const summaries = [];
  while (true) { const page = store.getUpdates({ project_id: 'demo', after_event_id: cursor, limit: 2 }); summaries.push(...page.events.map((e) => e.summary)); cursor = page.next_cursor; if (!page.has_more) break; }
  assert.deepEqual(summaries, Array.from({ length: 7 }, (_, i) => String(i)));
  assert.deepEqual(store.getUpdates({ project_id: 'demo', after_event_id: cursor }).events, []);
});
test('literal search handles SQL wildcards and has lossless pagination', (t) => {
  const { store } = fixture(t);
  for (let index = 0; index < 3; index++) store.recordUpdate({ project_id: 'demo', agent_id: 'a', kind: 'note', summary: `100% done ${index}` });
  store.recordUpdate({ project_id: 'demo', agent_id: 'a', kind: 'note', summary: 'Unrelated' });
  const first = store.searchContext({ project_id: 'demo', query: '%', limit: 2 });
  const last = store.searchContext({ project_id: 'demo', query: '%', limit: 2, before_event_id: first.next_before_event_id });
  assert.equal(first.events.length, 2); assert.equal(last.events.length, 1); assert.equal(last.next_before_event_id, null);
  assert.deepEqual(store.searchContext({ project_id: 'demo', query: "' OR 1=1 --" }).events, []);
});
test('context truncation and snapshot cursor expose future updates', (t) => {
  const { store } = fixture(t);
  for (let index = 0; index < 4; index++) store.recordUpdate({ project_id: 'demo', agent_id: 'a', kind: 'decision', summary: `Choice ${index}` });
  const context = store.getContext({ project_id: 'demo', limit: 2 });
  assert.equal(context.decisions_truncated, true); assert.equal(context.decisions.length, 2);
  store.recordUpdate({ project_id: 'demo', agent_id: 'b', kind: 'handoff', summary: 'Next' });
  assert.equal(store.getUpdates({ project_id: 'demo', after_event_id: context.latest_event_id }).events.length, 1);
});
test('backup includes committed records and never overwrites files', async (t) => {
  const { store, directory, database } = fixture(t);
  store.recordUpdate({ project_id: 'demo', agent_id: 'a', kind: 'handoff', summary: 'Durable' });
  const path = join(directory, 'backup.sqlite3'); await store.backup(path);
  const restored = new Store(path);
  try {
    assert.equal(restored.getContext({ project_id: 'demo' }).handoffs[0].summary, 'Durable');
    assert.equal(restored.check(true).status, 'ok');
  } finally { restored.close(); }
  const before = readFileSync(path); await assert.rejects(store.backup(path)); assert.deepEqual(readFileSync(path), before);
  await assert.rejects(store.backup(database));
});
test('legacy migration preserves records and future schemas are rejected', (t) => {
  const { store, database } = fixture(t);
  store.recordUpdate({ project_id: 'demo', agent_id: 'a', kind: 'note', summary: 'Keep me' });
  store.db.exec('DROP TABLE task_requests; PRAGMA user_version=0;');
  const migrated = new Store(database);
  assert.equal(migrated.check().schema_version, 1); assert.equal(migrated.getUpdates({ project_id: 'demo' }).events[0].summary, 'Keep me');
  migrated.close(); store.db.exec('PRAGMA user_version=999;');
  assert.throws(() => new Store(database), ContextError);
});
test('dashboard summaries and agent claims come from recorded data', (t) => {
  const { store } = fixture(t), work = task(store);
  store.claimTask({ project_id: 'demo', task_id: work.id, agent_id: 'codex', expected_version: 1 });
  store.recordUpdate({ project_id: 'demo', agent_id: 'claude', kind: 'handoff', summary: 'Next steps' });
  assert.equal(store.overview().open_tasks, 1);
  assert.equal(store.activity({ kind: 'handoff' }).events.length, 1);
  assert.equal(store.agents().agents.find((a) => a.agent_id === 'codex').claimed_tasks, 1);
});
test('invalid paths, containers, booleans, and bounds are rejected', (t) => {
  const { store } = fixture(t);
  for (const paths of [['../secret'], ['/etc/passwd'], ['C:\\secret'], ['line\nfile'], false, {}]) assert.throws(() => store.recordUpdate({ project_id: 'demo', agent_id: 'a', kind: 'note', summary: 'Invalid', files: paths }), ContextError);
  for (const limit of [0, 101, true]) assert.throws(() => store.getUpdates({ project_id: 'demo', limit }), ContextError);
});
