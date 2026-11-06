# Agent Context

Shared project memory and task handoffs for MCP-compatible coding agents.
Run it on your own computer or a team server, with a React dashboard and local
SQLite storage. One agent records the work; the next reads the context before
continuing.

[Source](https://github.com/suyashB45/agent-context) ·
[Documentation](docs/README.md) · [Contributing](CONTRIBUTING.md) ·
[MIT license](LICENSE)

## Release status

This checkout prepares **0.4.0**, an early release. The public npm registry
release is pending (`site/config.json` has `npmPublished: false`). Install the
reviewed downloadable package or build from source; installation by registry
name is not yet the documented working path. The repository contains deployment
configuration, not proof of a live website or passed remote CI run.

Requires **Node.js 24+ and npm**. Python, a cloud model, and a model API key are
not required by Agent Context. Your chosen coding agent or model may have its
own requirements. See [compatibility](docs/compatibility.md).

## Quick start: downloaded npm package

Download `agent-context-mcp-0.4.0.tgz` from the product website when available,
or obtain the reviewed artifact from the maintainer. Open a terminal in the
folder containing that file, then:

```bash
npm install -g ./agent-context-mcp-0.4.0.tgz
agent-context-mcp
```

Open **http://127.0.0.1:8765/dashboard**. Keep the service terminal open. In a
second terminal, retrieve the login token:

```bash
agent-context-mcp token
```

Paste the token into the dashboard, create a project, and open **Connect agents**.
Reloading the dashboard requires entering the token again because it is kept
only in page memory. To stop the service, press Ctrl+C in its terminal.

## Quick start: source checkout

From the repository root containing `package.json`:

```bash
npm ci
npm run build
npm start -- --db ./data/dev.sqlite3
```

In another terminal, from the same directory:

```bash
node bin/agent-context-mcp.mjs token --db ./data/dev.sqlite3
```

This runs the Node/React application without a global install. Generated
`build/` and `dist/` files are not committed to Git. To build and install the
shareable npm package after `npm run build`:

```bash
npm pack --ignore-scripts --pack-destination dist/npm
npm install -g ./dist/npm/agent-context-mcp-0.4.0.tgz
```

The downloaded-package path and source-checkout path differ. An `ENOENT` error
means the file is missing at the supplied path. See [troubleshooting](docs/troubleshooting.md).

## Connect coding agents

Use an agent or host with MCP tool support over **stdio** or **Streamable HTTP**.
Claude Code, Codex, Cursor, VS Code/Copilot, Gemini CLI, and other MCP clients can
use the same server interface. Configuration examples are not a claim that every
client version has been tested.

For local agents, generate configuration with the same absolute database path
used by the dashboard:

```bash
agent-context-mcp config --client generic --db /absolute/path/to/shared/context.sqlite3
```

Use `--client cursor`, `--client vscode`, or `--client gemini` for those formats.
Merge the printed entry into existing settings; the command does not edit files.
Enable the server tools and start a fresh agent session. The dashboard generates
JSON using its actual database path.

Each local stdio client starts `agent-context-mcp stdio`; no HTTP token is needed.
For remote clients, use the running host's endpoint and token. See [client setup](docs/clients.md).

## Make handoffs part of the workflow

Use the same project ID for every agent and a unique agent ID per session. Add
[the shared workflow](examples/AGENT_INSTRUCTIONS.md) to the instruction file
your client reads, preserving existing content. For example:

```text
Use agent-context MCP for project ID "my-project".
Use a unique agent_id per session.
Read get_context and list_tasks before editing; create the project if needed.
Claim a task and renew its lease before expiry.
Record progress, decisions, changed files, and exact test results.
Before stopping, record a handoff and complete or release the task.
```

Verify setup by asking one agent to record a test handoff, then another to read
it from the same project. Agents must inspect the repository and record their
findings; the server does not automatically capture conversations or scan code.

## Connect your team

Run one shared instance with one persistent database. Teammates keep their own
agents and models and connect using Streamable HTTP.

| Method | Best fit |
| --- | --- |
| Same Wi-Fi / LAN | One private office or home network |
| Private VPN | Teammates in different locations |
| SSH tunnel | Existing SSH access to the host |
| HTTPS server | Always-on shared service |

Follow [team connection methods](docs/team.md) for commands, allowlists,
firewall guidance, and token setup. Plain LAN HTTP is unencrypted; prefer VPN,
SSH, or HTTPS for routine access. Do not share a live SQLite file on a network
drive. Teammates use the host's token, not a token from their own separate server.

## What it provides

- Persistent project context, decisions, test reports, and handoffs.
- Task claims with expiring leases, optimistic versions, and safe retry IDs.
- Paginated history and literal search across recorded work.
- A React dashboard for projects, tasks, agents, activity, and connection setup.
- Database integrity checks and consistent backups.

Every token holder can read and write every project in an instance. Agent IDs
are self-reported; claims do not lock source files. Individual accounts, OAuth,
project permissions, and automatic conversation capture are not implemented.
Use separate instances for unrelated trust groups. See [SECURITY.md](SECURITY.md).

## Documentation

| Need | Guide |
| --- | --- |
| Find a starting point | [Documentation index](docs/README.md) |
| Connect an editor or agent | [Client setup](docs/clients.md) |
| Check systems and local models | [Compatibility](docs/compatibility.md) |
| Share with teammates | [Team connections](docs/team.md) |
| Configure, containerize, back up, or upgrade | [Operations](docs/operations.md) |
| Look up commands and MCP tools | [Reference](docs/reference.md) |
| Resolve installation or connection errors | [Troubleshooting](docs/troubleshooting.md) |
| Develop and contribute | [Contributing](CONTRIBUTING.md) |
| Publish npm and deploy the website | [Maintainer release guide](docs/release.md) |
| Understand the implementation | [Architecture](docs/architecture.md) |

The public website serves docs and package/source downloads. The local dashboard
runs at port **8765**; the website preview runs at **8770**. They are separate.
To build the website and its downloadable artifacts from source:

```bash
npm run vercel:build
npm run site:serve
```

Import the repository root into Vercel, choose **Other**, use Node.js **24.x**,
build command `npm run vercel:build`, and output directory `site/dist`.
The included `vercel.json` declares these build settings. Domain/DNS setup and
npm publication are separate steps in the release guide.

## Contribute and get help

Report reproducible bugs and propose changes through
[GitHub issues](https://github.com/suyashB45/agent-context/issues).
Read [CONTRIBUTING.md](CONTRIBUTING.md), [community expectations](CODE_OF_CONDUCT.md),
and [the roadmap](ROADMAP.md). Report vulnerabilities privately as described in
[SECURITY.md](SECURITY.md).

The earlier Python prototype remains in the source repository for compatibility
and historical reference. It is not the active npm product. Its command uses
the same executable name; deactivate the Python virtual environment or use the
Node CLI's absolute path to avoid selecting it accidentally. See the
[legacy Python guide](https://github.com/suyashB45/agent-context/blob/main/docs/legacy-python.md).
