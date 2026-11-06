"""CI-only Docker persistence and authenticated HTTP test against an isolated volume."""

import json
import os
import secrets
import subprocess
import time
import urllib.request
from uuid import uuid4

import anyio
import httpx2
from mcp import Client
from mcp.client.streamable_http import streamable_http_client


def docker(*args, check=True, env=None):
    return subprocess.run(["docker", *args], check=check, capture_output=True, text=True, env=env)


async def exchange(url, token, write):
    headers = {"Authorization": "Bearer " + token, "Host": "127.0.0.1:8765"}
    async with httpx2.AsyncClient(headers=headers, timeout=10) as http:
        unauthorized = await http.post(url, json={}, headers={"Authorization": "Bearer invalid"})
        assert unauthorized.status_code == 401
        async with Client(streamable_http_client(url, http_client=http), read_timeout_seconds=10) as client:
            assert len((await client.list_tools()).tools) == 10
            if write:
                result = await client.call_tool("create_project", {"project_id": "container-test", "name": "Container Test"})
                assert not result.is_error
                result = await client.call_tool("record_update", {"project_id": "container-test", "agent_id": "ci", "kind": "handoff", "summary": "Survives a container restart"})
            else:
                result = await client.call_tool("get_context", {"project_id": "container-test"})
                assert "Survives a container restart" in str(result.content)
            assert not result.is_error


def wait_for_health(port):
    for _ in range(100):
        try:
            request = urllib.request.Request(f"http://127.0.0.1:{port}/healthz", headers={"Host": "127.0.0.1:8765"})
            with urllib.request.urlopen(request, timeout=1) as response:
                if response.status == 200:
                    return
        except OSError:
            time.sleep(0.2)
    raise RuntimeError("Container did not become healthy")


def main():
    suffix = uuid4().hex[:12]
    name, volume = "context-ci-" + suffix, "context-data-ci-" + suffix
    token = secrets.token_urlsafe(48)
    try:
        docker("run", "-d", "--name", name, "--env", "AGENT_CONTEXT_TOKEN", "--read-only",
               "--tmpfs", "/tmp:rw,noexec,nosuid,size=32m", "--cap-drop", "ALL", "--security-opt", "no-new-privileges:true",
               "--publish", "127.0.0.1::8765", "--volume", volume + ":/data", "agent-context-mcp:ci",
               env={**os.environ, "AGENT_CONTEXT_TOKEN": token})
        port = int(docker("port", name, "8765/tcp").stdout.strip().rsplit(":", 1)[1])
        wait_for_health(port)
        anyio.run(exchange, f"http://127.0.0.1:{port}/mcp", token, True)
        docker("restart", name)
        wait_for_health(port)
        anyio.run(exchange, f"http://127.0.0.1:{port}/mcp", token, False)
        print(json.dumps({"status": "ok", "container": "non-root/read-only", "persistence": "verified after restart"}))
    finally:
        docker("rm", "-f", name, check=False)
        docker("volume", "rm", volume, check=False)


if __name__ == "__main__":
    main()
