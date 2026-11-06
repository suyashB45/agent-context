# Compatibility

Agent Context connects through MCP rather than a model-provider API. Use an
agent or host that can list and call MCP tools over stdio or Streamable HTTP.
A plain model endpoint or chat application without an MCP integration cannot
connect by itself. Enable or approve the tools according to your client's policy.

## Systems

| System | Requirements | Verification |
| --- | --- | --- |
| Linux | Node.js 24+, npm, writable local data directory | Local package installation and automated service checks passed in this environment |
| macOS | Node.js 24+, npm, writable local data directory | Designed for it; CI configured, results not verified here |
| Windows | Node.js 24+, npm, writable local data directory | Designed for it; CI configured, results not verified here |

Python and native dependency compilation are not required for the npm package.
Your model's RAM, GPU, and storage requirements are separate. Mobile apps and
arbitrary embedded systems are not advertised as supported server targets.

## Clients

Configuration examples cover Claude Code, Codex, Cursor, VS Code/Copilot,
Gemini CLI, and generic MCP hosts. The generator handles the different JSON
wrapper used by VS Code. Other clients may require adapting the configuration
through their MCP settings editor. See [client setup](clients.md).

The server's tests exercise MCP SDK clients. Configuration examples do not
establish end-to-end verification of every named client or version.

## Local models

```text
Local model ↔ MCP-capable agent or host ↔ Agent Context
```

Use a tool-capable model through a local runtime such as Ollama or llama.cpp,
and a host that can execute the model's tool requests through MCP. The host may
be your coding agent or a runtime with an MCP integration. Model template,
client support, and reliable tool calling all matter.

1. Start the model and select its endpoint in the compatible host.
2. Configure Agent Context in the host using stdio or Streamable HTTP.
3. Enable tools and use the same project ID as other agents.
4. Ask it to call `list_projects`, create a test project, record a handoff, and
   read it with `get_context`. Confirm actual tool calls and stored results.

Agent Context does not require a cloud-model API key. A fully local workflow
is possible when your model, host, and tools all run locally and require no
external service. We have not benchmarked every model or host combination.

References: [Ollama tool calling](https://github.com/ollama/ollama/blob/main/docs/capabilities/tool-calling.mdx)
and [llama.cpp server](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md).

## Teams and verification

Local stdio processes share the same database path. Remote clients connect to
one server rather than opening a network-shared SQLite file. See the
[team guide](team.md) for LAN, VPN, SSH, and HTTPS setup.

Automated checks cover storage, concurrency, leases, backups, migration,
authentication, MCP SDK handoffs, rendering, and client configuration. In the
restricted development environment, two subprocess tests are explicitly skipped;
CI is configured to run them without that skip. Actual sockets, browser UI,
containers, client applications, and team networks need verification on an
unrestricted host. Do not describe these as verified until their checks pass.
