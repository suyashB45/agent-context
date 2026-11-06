from dataclasses import replace
import json
from pathlib import Path
import tempfile
import unittest

import anyio
import httpx2
from mcp import Client
from mcp.client.streamable_http import streamable_http_client

from agent_context_mcp.config import HTTPSettings
from agent_context_mcp.http import HTTPBoundary, build_http_app
from async_helpers import run_async


TOKEN = "test-token-" + "x" * 48


class HTTPTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.settings = HTTPSettings(Path(self.temp.name) / "context.sqlite3", token=TOKEN,
                                     allowed_hosts=("testserver",))

    def test_auth_health_hosts_origins_and_headers(self):
        async def run():
            app = build_http_app(self.settings)
            async with app.app.router.lifespan_context(app.app):
                async with httpx2.AsyncClient(transport=httpx2.ASGITransport(app=app), base_url="http://testserver") as client:
                    self.assertEqual((await client.get("/healthz")).status_code, 200)
                    root = await client.get("/")
                    self.assertEqual(root.status_code, 307)
                    self.assertEqual(root.headers["location"], "/dashboard")
                    for headers in [{}, {"Authorization": "Bearer wrong"}, {"Authorization": "Basic " + TOKEN}]:
                        result = await client.post("/mcp", headers=headers, json={})
                        self.assertEqual(result.status_code, 401)
                        self.assertIn("Bearer", result.headers["www-authenticate"])
                        self.assertIn("x-request-id", result.headers)
                        self.assertEqual(result.headers["cache-control"], "no-store")
                        self.assertNotIn(TOKEN, result.text)
                    self.assertEqual((await client.get("/readyz")).status_code, 401)
                    auth = {"Authorization": "Bearer " + TOKEN}
                    self.assertEqual((await client.get("/readyz", headers=auth)).status_code, 200)
                    self.assertEqual((await client.get("/healthz", headers={"Host": "evil.example"})).status_code, 421)
                    self.assertEqual((await client.get("/healthz", headers={"Origin": "https://evil.example"})).status_code, 403)
                    result = await client.post("/mcp", headers=[("Authorization", "Bearer " + TOKEN), ("Authorization", "Bearer " + TOKEN)], json={})
                    self.assertEqual(result.status_code, 401)
        run_async(run)

    def test_http_sdk_round_trip_and_handoff_after_restart(self):
        async def call(client, name, arguments):
            result = await client.call_tool(name, arguments)
            self.assertFalse(result.is_error, str(result.content))
            return result.structured_content or json.loads(result.content[0].text)

        async def session(app, create):
            async with app.app.router.lifespan_context(app.app):
                async with httpx2.AsyncClient(transport=httpx2.ASGITransport(app=app),
                                             headers={"Authorization": "Bearer " + TOKEN}) as http:
                    async with Client(streamable_http_client("http://testserver/mcp", http_client=http)) as client:
                        self.assertEqual(len((await client.list_tools()).tools), 10)
                        if create:
                            await call(client, "create_project", {"project_id": "demo", "name": "Demo"})
                            await call(client, "record_update", {"project_id": "demo", "agent_id": "agent-a", "kind": "handoff", "summary": "Ready for agent B"})
                        else:
                            result = await call(client, "get_context", {"project_id": "demo"})
                            self.assertEqual(result["handoffs"][0]["summary"], "Ready for agent B")
                            resource = await client.read_resource("context://projects/demo")
                            self.assertIn("Ready for agent B", str(resource.contents))
                            invalid = await client.call_tool("get_context", {"project_id": "missing"})
                            self.assertTrue(invalid.is_error)

        async def run():
            await session(build_http_app(self.settings), True)
            await session(build_http_app(self.settings), False)
        run_async(run)

    def test_body_size_limit_including_chunked_upload(self):
        async def body():
            for _ in range(5):
                yield b"x" * 512

        async def run():
            app = build_http_app(replace(self.settings, max_body_bytes=1024))
            async with app.app.router.lifespan_context(app.app):
                headers = {"Authorization": "Bearer " + TOKEN, "Content-Type": "application/json", "Accept": "application/json, text/event-stream"}
                async with httpx2.AsyncClient(transport=httpx2.ASGITransport(app=app), base_url="http://testserver", headers=headers) as client:
                    self.assertEqual((await client.post("/mcp", content="x" * 2048)).status_code, 413)
                    self.assertEqual((await client.post("/mcp", content=body())).status_code, 413)
        run_async(run)

    def test_rate_limits_and_token_redaction(self):
        async def run():
            app = build_http_app(replace(self.settings, requests_per_minute=1))
            async with app.app.router.lifespan_context(app.app):
                async with httpx2.AsyncClient(transport=httpx2.ASGITransport(app=app), base_url="http://testserver", headers={"Authorization": "Bearer " + TOKEN}) as client:
                    with self.assertLogs("agent_context_mcp.http", level="INFO") as logs:
                        self.assertEqual((await client.get("/readyz?token=" + TOKEN)).status_code, 200)
                        response = await client.get("/readyz")
                        self.assertEqual(response.status_code, 429)
                        self.assertIn("retry-after", response.headers)
                    self.assertNotIn(TOKEN, "\n".join(logs.output))
        run_async(run)

    def test_concurrency_limit_rejects_excess_requests(self):
        async def run():
            entered, release = anyio.Event(), anyio.Event()

            async def slow(scope, receive, send):
                entered.set()
                await release.wait()
                await send({"type": "http.response.start", "status": 200, "headers": []})
                await send({"type": "http.response.body", "body": b"ok"})

            app = HTTPBoundary(slow, replace(self.settings, max_inflight=1))
            async with httpx2.AsyncClient(transport=httpx2.ASGITransport(app=app), base_url="http://testserver", headers={"Authorization": "Bearer " + TOKEN}) as client:
                async with anyio.create_task_group() as group:
                    group.start_soon(client.get, "/mcp")
                    await entered.wait()
                    self.assertEqual((await client.get("/mcp")).status_code, 503)
                    release.set()
        run_async(run)

    def test_explicit_browser_origin(self):
        async def run():
            app = build_http_app(replace(self.settings, allowed_origins=("https://trusted.example",)))
            async with httpx2.AsyncClient(transport=httpx2.ASGITransport(app=app), base_url="http://testserver") as client:
                self.assertEqual((await client.get("/healthz", headers={"Origin": "https://trusted.example"})).status_code, 200)
        run_async(run)

    def test_dashboard_shell_and_assets_are_public_but_data_is_protected(self):
        async def run():
            app = build_http_app(self.settings)
            async with httpx2.AsyncClient(transport=httpx2.ASGITransport(app=app), base_url="http://testserver") as client:
                result = await client.get("/dashboard")
                self.assertEqual(result.status_code, 200)
                self.assertIn("Your workspace, in sync.", result.text)
                self.assertIn("frame-ancestors 'none'", result.headers["content-security-policy"])
                for asset in ["dashboard.js", "dashboard.css"]:
                    result = await client.get("/assets/" + asset)
                    self.assertEqual(result.status_code, 200)
                    self.assertNotIn(TOKEN, result.text)
                for endpoint in ["/api/projects", "/api/overview", "/api/activity", "/api/agents"]:
                    self.assertEqual((await client.get(endpoint)).status_code, 401)
        run_async(run)

    def test_dashboard_operator_workflow(self):
        async def run():
            app = build_http_app(self.settings)
            headers = {"Authorization": "Bearer " + TOKEN, "Origin": "http://localhost:8765"}
            async with httpx2.AsyncClient(transport=httpx2.ASGITransport(app=app), base_url="http://testserver", headers=headers) as client:
                result = await client.post("/api/projects", json={"project_id": "web", "name": "Web Project", "description": "Shared context"})
                self.assertEqual(result.status_code, 200)
                result = await client.post("/api/projects/web/tasks", json={"title": "Build API", "request_id": "retry-task"})
                task_id = result.json()["id"]
                retry = await client.post("/api/projects/web/tasks", json={"title": "Build API", "request_id": "retry-task"})
                self.assertEqual(retry.json()["id"], task_id)
                handoff = {"kind": "handoff", "summary": "<script>alert(1)</script>", "details": "Next: write tests", "request_id": "handoff"}
                self.assertEqual((await client.post("/api/projects/web/updates", json=handoff)).status_code, 200)
                context = (await client.get("/api/projects/web")).json()
                self.assertEqual(context["handoffs"][0]["details"], "Next: write tests")
                self.assertEqual(len((await client.get("/api/projects/web/tasks")).json()["tasks"]), 1)
                self.assertEqual(len((await client.get("/api/projects/web/search?q=write")).json()["events"]), 1)
                activity = (await client.get("/api/activity?kind=handoff&project=web")).json()
                self.assertEqual(activity["events"][0]["project_name"], "Web Project")
                overview = (await client.get("/api/overview")).json()
                self.assertEqual(overview["projects"], 1)
                self.assertEqual(overview["agents_today"], 1)
                agents = (await client.get("/api/agents")).json()["agents"]
                self.assertEqual(agents[0]["agent_id"], "dashboard")
                for path in ["/api/projects?offset=bad", "/api/activity?before=bad", "/api/agents?offset=bad"]:
                    self.assertEqual((await client.get(path)).status_code, 400)
                self.assertEqual((await client.post("/api/projects", json=[])).status_code, 400)
                self.assertEqual((await client.post("/api/projects", content="{")).status_code, 400)
                self.assertEqual((await client.post("/api/projects/web/updates", json={"kind": "invalid", "summary": "bad"})).status_code, 400)
        run_async(run)

    def test_dashboard_write_limit_and_origin_check(self):
        async def run():
            app = build_http_app(replace(self.settings, max_body_bytes=1024))
            async with httpx2.AsyncClient(transport=httpx2.ASGITransport(app=app), base_url="http://testserver", headers={"Authorization": "Bearer " + TOKEN}) as client:
                result = await client.post("/api/projects", json={"project_id": "too-big", "name": "x" * 2048})
                self.assertEqual(result.status_code, 413)
                result = await client.post("/api/projects", headers={"Origin": "http://evil.example"}, json={"project_id": "no", "name": "No"})
                self.assertEqual(result.status_code, 403)
        run_async(run)
