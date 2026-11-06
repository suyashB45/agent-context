# Agent Context

Shared project memory and task handoffs for MCP-compatible coding agents.
Run it on your own computer or a team server, with a React dashboard and local
SQLite storage. One agent records the work; the next reads the context before
continuing.

[Website](https://agentcontext.suyashb.me) ·
[Source](https://github.com/suyashB45/agent-context) ·
[npm package](https://www.npmjs.com/package/@suyashb/agent-context) ·
[Documentation](docs/README.md) · [Contributing](CONTRIBUTING.md) ·
[MIT license](LICENSE)

![Agent Context dashboard illustration with shared project memory, an example handoff and task lease](docs/images/agent-context-overview.svg)

*Illustrative overview with example data, not a screenshot of a live instance.*

## Release status

**Version 0.4.0 is published** as
[`@suyashb/agent-context`](https://www.npmjs.com/package/@suyashb/agent-context).
The product website is https://agentcontext.suyashb.me. CI verification covers
the tested revision; see the release guide for checking a deployment and package.

Requires **Node.js 24+ and npm**. Python, a cloud model, and a model API key are
not required by Agent Context. Your chosen coding agent or model may have its
own requirements. See [compatibility](docs/compatibility.md).

The npm package is **`@suyashb/agent-context`** and its CLI is **`agent-context`**.
The unscoped npm package `agent-context-mcp` belongs to another maintainer; it is
not this project.

## Install from npm

Public package: [@suyashb/agent-context on npm](https://www.npmjs.com/package/@suyashb/agent-context).

```bash
npm install -g @suyashb/agent-context
agent-context
```

Then follow the dashboard and agent connection instructions below. Pin a release
with `npm install -g @suyashb/agent-context@0.4.0` when reproducibility is needed.

## Quick start: downloaded npm package

Download `suyashb-agent-context-0.4.0.tgz` from the
[official website](https://agentcontext.suyashb.me) or build it from this source checkout. Open a terminal in the
folder containing that file, then:

```bash
npm install -g ./suyashb-agent-context-0.4.0.tgz
agent-context
```

Open **http://127.0.0.1:8765/dashboard**. Keep the service terminal open. In a
second terminal, retrieve the login token:

```bash
agent-context token
```

Paste the token into the dashboard, create a project, and open **Connect agents**.
Reloading the dashboard requires entering the token again because it is kept
only in page memory. To stop the service, press Ctrl+C in its terminal.

## Quick start: source checkout

From the repository root containing `package.json`:

```bash
npm ci
npm run build:runtime
npm start -- --db ./data/dev.sqlite3
```

In another terminal, from the same directory:

```bash
node bin/agent-context.mjs token --db ./data/dev.sqlite3
```

This runs the Node/React application without a global install. Generated
`build/` and `dist/` files are not committed to Git. To build and install the
shareable npm package after `npm run build:runtime`:

```bash
npm pack --ignore-scripts --pack-destination dist/npm
npm install -g ./dist/npm/suyashb-agent-context-0.4.0.tgz
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
agent-context config --client generic --db /absolute/path/to/shared/context.sqlite3
```

Use `--client cursor`, `--client vscode`, or `--client gemini` for those formats.
Merge the printed entry into existing settings; the command does not edit files.
Enable the server tools and start a fresh agent session. The dashboard generates
JSON using its actual database path.

Each local stdio client starts `agent-context stdio`; no HTTP token is needed.
For this agent-only setup, you do not need a separate running HTTP service or
dashboard. Start the local dashboard only when you want to inspect the history.
For remote clients, use the running host's endpoint and token. See [client setup](docs/clients.md).

## Make handoffs part of the workflow

![Workflow: read context, claim a task, record progress, then hand off to the next agent](docs/images/agent-context-workflow.svg)

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

## Website and local application

Visit **https://agentcontext.suyashb.me** for the product website, documentation,
and downloads. Users do not run the product website on their computer.

The `agent-context` command starts your **local MCP service and React dashboard**
at http://127.0.0.1:8765/dashboard. This is the application that stores your
project context. The public website and local dashboard serve different purposes.
Website deployment is covered in the [maintainer guide](docs/release.md); optional
website development preview is covered in [CONTRIBUTING.md](CONTRIBUTING.md).

## Contribute and get help

Report reproducible bugs and propose changes through
[GitHub issues](https://github.com/suyashB45/agent-context/issues).
Read [CONTRIBUTING.md](CONTRIBUTING.md), [community expectations](CODE_OF_CONDUCT.md),
and [the roadmap](ROADMAP.md). Report vulnerabilities privately as described in
[SECURITY.md](SECURITY.md).

The earlier Python prototype remains in the source repository as historical
reference. Its executable is `agent-context-mcp`; the Node release uses
`agent-context`, so the commands are distinct. Keep the same explicit `--db`
when migrating an existing database. See the
[legacy Python guide](https://github.com/suyashB45/agent-context/blob/main/docs/legacy-python.md).

## Product website development

The public product website is https://agentcontext.suyashb.me. End users only
run the MCP service and dashboard locally. The website source uses Next.js App
Router, Tailwind CSS and Framer Motion; it is separate from the MCP runtime.

For website contributors, see [website development](docs/website.md).
`npm run build` generates and checks the full static website in `out/`, with
its docs and verified downloads. Vercel imports the repository root using the
Next.js preset and that build command. `npm run build:runtime` only builds the
MCP service and local React dashboard.
