# Connect coding agents

Agent Context uses MCP rather than a model-specific integration. A client needs
MCP tool support over stdio or Streamable HTTP. A model or chat application
without an MCP client cannot connect by itself. Client policies may require
approving or enabling server tools.

## Local agents

Install the downloadable npm package first. Generate JSON for your client:

```bash
agent-context-mcp config --client generic --db /absolute/path/to/shared/context.sqlite3
agent-context-mcp config --client cursor --db /absolute/path/to/shared/context.sqlite3
agent-context-mcp config --client vscode --db /absolute/path/to/shared/context.sqlite3
agent-context-mcp config --client gemini --db /absolute/path/to/shared/context.sqlite3
```

The command prints configuration only. It does not change client files or
create a database. Merge its server entry into your existing configuration.
Without `--db`, it uses the same default database selection as the server.

| Client | Configuration |
| --- | --- |
| Cursor | `.cursor/mcp.json` or `~/.cursor/mcp.json`; `mcpServers` wrapper |
| VS Code / Copilot | `.vscode/mcp.json`; `servers` wrapper and `type: stdio` |
| Gemini CLI | Its `settings.json` MCP configuration; `mcpServers` wrapper |
| Other clients | Use the MCP server editor or adapt the generic JSON wrapper |

Use the client’s own configuration editor for Cline, Roo Code, Windsurf, or
another integration; provide command `agent-context-mcp` and arguments
`stdio`, `--db`, and the same absolute database filename as separate arguments.
The generic JSON is a common format, not a guarantee that every client uses
the same wrapper. Keep any existing settings.

All local processes must point to the same database. Starting a stdio client
with a different path creates a separate context store. No HTTP token is
needed for stdio. Use the same `--db` when starting the dashboard.

The executable must be available to your editor, which may have a different
PATH from your terminal. Use the installed executable’s absolute path if needed.
Do not launch `agent-context-mcp` without `stdio` from an MCP client: the default
command starts the HTTP service. Enable the server’s tools and start a fresh
agent session after setup.

Claude Code and Codex registration commands are in the README and the website’s
client guide. They use the same MCP tools and database as every other client.

## Remote agents

Run Agent Context on a persistent server reachable by the client. Select
Streamable HTTP in the client’s MCP setup, use the server’s `/mcp` URL, and
configure `Authorization: Bearer <instance-token>` through the client’s secret
settings. Follow that client’s header configuration format. Choose a network
method from the [team connection guide](team.md):

| Method | Client endpoint |
| --- | --- |
| Same Wi-Fi / LAN | Host private IP, such as `http://192.168.1.50:8765/mcp` |
| Private VPN | VPN-reachable address or private HTTPS hostname |
| SSH tunnel | `http://127.0.0.1:8765/mcp` while the forwarding tunnel is open |
| Shared HTTPS server | Your reverse-proxy domain, such as `https://context.example.com/mcp` |

Replace example addresses with your actual host. Use the host's token and
configure exact Host/Origin allowlists. Plain LAN HTTP is unencrypted; prefer
VPN, SSH, or HTTPS for routine team access.

`localhost` always refers to the computer running the client. A cloud coding
agent cannot reach your laptop’s localhost by default. With an explicitly
configured SSH forwarding tunnel, a local endpoint can reach the shared server. The public Vercel website hosts
documentation and downloads; it is not your SQLite MCP instance.

## Shared workflow

Use the same project ID across clients and a unique agent ID per session.
Add the workflow from `examples/AGENT_INSTRUCTIONS.md` to each client’s project
instruction file, such as AGENTS.md, CLAUDE.md, GEMINI.md, or editor rules.
Preserve existing instructions. Agents must read context before editing and
record progress and a handoff afterward. Context is recorded work, not an
automatic import of conversations or repository contents.

To verify setup, ask an agent to list projects, create a test project, and
record a handoff. Ask a different agent connected to the same database to read
that project’s context. Verify the handoff appears before using real tasks.

## Client references

- [Cursor MCP configuration](https://prod.cursor.com/help/customization/mcp)
- [VS Code MCP configuration](https://code.visualstudio.com/docs/agents/reference/mcp-configuration)
- [Gemini CLI MCP servers](https://geminicli.com/docs/tools/mcp-server/)

These are configuration references. End-to-end UI testing of every third-party
client has not been performed; the server’s automated tests use the MCP SDK.
