"""Exercise a running HTTP instance using the real SDK; no writes by default."""

import argparse
import json
from pathlib import Path

import anyio
import httpx2
from mcp import Client
from mcp.client.streamable_http import streamable_http_client

from agent_context_mcp.config import read_token


async def check(url, token, host_header=None):
    headers = {"Authorization": "Bearer " + token} if token else {}
    if host_header:
        headers["Host"] = host_header
    async with httpx2.AsyncClient(headers=headers, timeout=10) as http:
        async with Client(streamable_http_client(url, http_client=http), read_timeout_seconds=10) as client:
            tools = await client.list_tools()
            names = {tool.name for tool in tools.tools}
            assert "get_context" in names and "record_update" in names, "Missing required tools"
            result = await client.call_tool("list_projects", {})
            assert not result.is_error, "list_projects failed"
            data = result.structured_content or json.loads(result.content[0].text)
            print(json.dumps({"status": "ok", "tools": len(names), "projects_on_first_page": len(data["projects"])}))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://127.0.0.1:8765/mcp")
    parser.add_argument("--token-file", type=Path)
    args = parser.parse_args()
    token = read_token(args.token_file)
    anyio.run(check, args.url, token)


if __name__ == "__main__":
    main()
