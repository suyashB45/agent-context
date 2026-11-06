"""Real SDK round trips; run after installing the project's dependencies."""

from contextlib import asynccontextmanager
import importlib.util
import os
from pathlib import Path
import sys
import tempfile
import unittest

from async_helpers import run_async


@unittest.skipUnless(importlib.util.find_spec("mcp"), "MCP SDK not installed")
class MCPTests(unittest.TestCase):
    @unittest.skipIf(os.environ.get("AGENT_CONTEXT_SKIP_STDIO_TEST") == "1", "stdio explicitly disabled in this restricted environment")
    def test_stdio_round_trip(self):
        from mcp import Client
        from mcp.client.stdio import StdioServerParameters
        import anyio

        @asynccontextmanager
        async def connected(params):
            async with Client(params) as client:
                async def keepalive():
                    while True:
                        await anyio.sleep(0.05)
                        await client.session.send_ping()
                async with anyio.create_task_group() as group:
                    group.start_soon(keepalive)
                    yield client
                    group.cancel_scope.cancel()

        async def run(database):
            params = StdioServerParameters(
                command=sys.executable,
                args=["-m", "agent_context_mcp.server", "--db", str(database)],
                cwd=str(Path(__file__).resolve().parent.parent),
            )
            async with connected(params) as client:
                tools = await client.list_tools()
                self.assertEqual(len(tools.tools), 10)
                result = await client.call_tool("create_project", {"project_id": "demo", "name": "Demo"})
                self.assertFalse(result.is_error)
                await client.call_tool("record_update", {
                    "project_id": "demo", "agent_id": "agent-a", "kind": "handoff", "summary": "Implemented login",
                })
            # A second agent starts a new process and sees the first agent's persisted work.
            async with connected(params) as client:
                result = await client.call_tool("get_context", {"project_id": "demo"})
                self.assertFalse(result.is_error)
                self.assertIn("Implemented login", str(result.content))
                invalid = await client.call_tool("get_context", {"project_id": "missing"})
                self.assertTrue(invalid.is_error)
                resources = await client.list_resource_templates()
                self.assertEqual(len(resources.resource_templates), 1)
                context = await client.read_resource("context://projects/demo")
                self.assertIn("Implemented login", str(context.contents))

        with tempfile.TemporaryDirectory() as directory:
            run_async(lambda: run(Path(directory) / "context.sqlite3"))
