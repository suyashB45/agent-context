> Historical Python prototype. New installations should follow the Node.js/React
> [quick start](../README.md). Do not install both executables into the same active
> PATH without choosing which one to run. This guide does not describe the active
> npm package or its React dashboard.

# Agent Context MCP

A self-hosted shared memory server for coding agents. Claude, Codex, and other
MCP clients can read project context, coordinate tasks, and leave handoffs for
one another. Each installation serves one trusted user or team workspace.

## Install from this source

Python 3.11+ is required. The package has not been published to a registry yet.
From this directory:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -c constraints.txt .
```

On Windows use `.venv\Scripts\python.exe` and
`.venv\Scripts\agent-context-mcp.exe`. For a command available across projects,
use `pipx install /path/to/agent-context-mcp` instead. `constraints.txt` records
the tested runtime versions; it is a constraints file, not a hash-verified lock.

## Start the local dashboard

After installation, one command starts the local service and dashboard:

```bash
.venv/bin/agent-context-mcp dashboard
```

Open `http://127.0.0.1:8765/dashboard`. In another terminal, show your instance's
access token and paste it into the dashboard:

```bash
.venv/bin/agent-context-mcp token
```

The dashboard command creates a private token next to the database on first
use and reuses it on later runs. If you choose a custom `--db`, use that same
option for the `token` command. Explicit environment or file credentials take
precedence. The token is kept only in the page's memory and must be entered
again after reloading; it is not written to browser storage.

The local dashboard provides:

- Overview of projects, open tasks, recent work, and contributing agents.
- Projects with task creation, decisions, handoffs, and searchable context.
- Agents with their reported activity and current task claims.
- Activity filters and paginated history across projects.
- Connection instructions for Claude Code, Codex, and other MCP clients.

Project data comes from the same SQLite database used by the MCP tools.
Dashboard contributions appear under the `dashboard` identity. Agent activity
indicates recorded work, not a live heartbeat. No frontend build, CDN, or
separate web server is required. The experience is inspired by
[OmniRoute's self-hosted dashboard](https://github.com/cheaper-inference/OmniRoute),
with this package focused on shared project context.

## Local agents: stdio

This is the easiest setup. Each client starts a process, and processes share one
SQLite database. No HTTP server or bearer token is needed.

```bash
codex mcp add agent-context -- /absolute/path/to/.venv/bin/agent-context-mcp --db /absolute/path/to/shared/context.sqlite3
claude mcp add --scope user agent-context -- /absolute/path/to/.venv/bin/agent-context-mcp --db /absolute/path/to/shared/context.sqlite3
```

Replace the paths with your installation and data file. Both commands must use
the **same absolute database path**. Restart existing agent sessions.
[examples/mcp.json](../examples/mcp.json) provides the equivalent stdio entry for
clients using a `mcpServers` configuration object.

Run agents from your actual repository, not from the server source directory:

```bash
cd /path/to/your/project
codex
```

Give each agent this instruction, using the same project ID in every client:

```text
Use agent-context MCP for project ID "my-project".
Use a unique agent_id for this session.
Read get_context and list_tasks before working.
If the project doesn't exist, create it, inspect this repository,
and record its architecture, current progress, and remaining work.
Claim a task before editing and renew its lease before expiry.
After changes, record changed files, decisions, and test results.
Before stopping, record a handoff and complete or release your task.
```

Add this text to your project's `AGENTS.md` for Codex and `CLAUDE.md` for Claude,
preserving existing instructions. A fuller workflow is in
[examples/AGENT_INSTRUCTIONS.md](../examples/AGENT_INSTRUCTIONS.md).
The server shares recorded engineering facts; it does not automatically read
agent conversations, inspect repositories, or execute code.

## HTTP service

Generate a token and start the server. Set your own absolute data path:

```bash
export AGENT_CONTEXT_TOKEN="$(.venv/bin/agent-context-mcp keygen)"
.venv/bin/agent-context-mcp --transport streamable-http --db /absolute/path/to/shared/context.sqlite3
```

Keep the token in a password manager or secret file so you can reconnect later.
As an alternative to the environment variable, use `--token-file /path/to/token`.
Set only one token source. Tokens must be 32–512 ASCII token characters; `keygen`
creates a random 64-character token. Rotate by replacing it and restarting the
server, then updating clients.

The MCP endpoint is `http://127.0.0.1:8765/mcp`. The root URL redirects to the
dashboard. `/healthz` is public liveness; `/readyz` checks database readability
and requires authentication when enabled. Readiness is not a full write/disk
capacity probe; run `check` for integrity and monitor storage space.

For local development without authentication, explicitly opt in:

```bash
.venv/bin/agent-context-mcp --transport streamable-http --allow-unauthenticated-local
```

This option refuses a non-loopback bind address. It is intended only for trusted
local development. HTTP with a token also defaults to loopback.

### Connect Codex and Claude over HTTP

Keep the service running. Export the same `AGENT_CONTEXT_TOKEN` in the terminal
that launches Codex, then register the endpoint:

```bash
codex mcp add agent-context --url http://127.0.0.1:8765/mcp --bearer-token-env-var AGENT_CONTEXT_TOKEN
codex mcp list
```

[examples/codex.toml](../examples/codex.toml) shows the equivalent configuration.
If you already registered `agent-context` using stdio, choose one transport and
update the existing registration rather than adding a second entry with the
same name. The command syntax follows the
[official OpenAI MCP setup](https://developers.openai.com/learn/docs-mcp).

For Claude Code, with the token available in your shell:

```bash
claude mcp add --scope user --transport http agent-context http://127.0.0.1:8765/mcp --header "Authorization: Bearer $AGENT_CONTEXT_TOKEN"
```

Claude's header registration stores the resolved token in its client
configuration; protect that file. For other clients, supply the same endpoint
and an `Authorization: Bearer ...` header using their secret configuration.
Authentication uses an operator-provisioned token, not an interactive OAuth
login. Clients that require OAuth discovery need an external OAuth gateway;
this package does not claim to provide one.

Read-only HTTP smoke check from a machine with network access:

```bash
.venv/bin/python scripts/smoke_http.py --url http://127.0.0.1:8765/mcp
```

It lists tools and projects without creating project data. It reads the token
from the environment or `--token-file`.

## Docker self-hosting

Docker Compose builds from the source; no public image is assumed. Create a
private `.env` without printing the generated token:

```bash
umask 077
printf 'AGENT_CONTEXT_TOKEN=' > .env
.venv/bin/agent-context-mcp keygen >> .env
docker compose up -d --build
```

The service runs as UID/GID 10001, with a read-only container filesystem, a
writable named volume at `/data`, dropped capabilities, bounded logs, and a
health check. The published port is bound to host loopback. The container has
one process and one worker; use one instance per SQLite data volume on a local
disk. Do not scale replicas against a shared network filesystem.

For remote users, configure HTTPS on your host with
[examples/Caddyfile](../examples/Caddyfile). Replace its hostname and add
`AGENT_CONTEXT_PUBLIC_HOST=your.hostname` and
`AGENT_CONTEXT_PUBLIC_ORIGIN=https://your.hostname` to `.env` before recreating the
container. Caddy preserves the public Host header, which the application checks.
The application also rejects unapproved Origin headers, limits requests to
600/minute with a burst of 600, caps concurrent protected requests at 32, and
limits HTTP bodies to 256 KiB. These are per-process workspace limits.
Configure your reverse proxy's connection/time limits and network firewall for
your environment. The application does not set up DNS, certificates, or hosting.

For a non-Docker deployment behind a proxy:

```bash
agent-context-mcp --transport streamable-http --host 127.0.0.1 --allowed-host context.example.com --allowed-origin https://context.example.com --db /srv/agent-context/context.sqlite3 --token-file /path/to/token
```

The local dashboard's exact loopback origins are allowed by default. Use
`--allowed-origin https://trusted.example` for a dashboard served through a
different origin. This allowlist does not enable browser CORS. There are no wildcard
allowlist options. Proxy forwarding headers are not trusted for authentication.

## Data, upgrades, and backups

Set `--db` or `AGENT_CONTEXT_DB` explicitly for a long-running service. Without
one, new installations use the OS user data directory. Existing source checkouts
keep using `data/context.sqlite3` when that file already exists. No existing
project data is moved. SQLite initializes the legacy schema transactionally and
rejects schemas newer than this version supports.

Back up before an upgrade. The backup command includes committed WAL data and
refuses to overwrite existing files:

```bash
agent-context-mcp backup --db /path/to/context.sqlite3 --output /path/to/backups/context-2026-11-06.sqlite3
agent-context-mcp check --db /path/to/backups/context-2026-11-06.sqlite3
```

For Docker, create a backup in its data volume and copy it out:

```bash
docker compose exec agent-context agent-context-mcp backup --output /data/backup.sqlite3
docker compose cp agent-context:/data/backup.sqlite3 ./backup.sqlite3
```

Choose a new backup filename on each run. Keep an off-host copy and test
restores. To restore, stop every process using the database, preserve the old
database and its `-wal`/`-shm` files together in a separate directory, and put the
verified backup at the configured database path. Ensure it belongs to the
service user, then restart and run `check`. Do not copy stale WAL sidecars onto
the restored backup. Never replace the file while clients are connected.

Upgrading a source installation uses `pip install -c constraints.txt .`; Docker
uses `docker compose up -d --build`. Existing databases remain in their data
volume. Do not use `docker compose down -v` if you want to retain that volume.

## Tools and coordination

| Tool | Purpose |
| --- | --- |
| `create_project` | Create a stable project slug; identical retries are safe |
| `list_projects` | Discover projects, with offset pagination |
| `get_context` | Recent work, decisions, handoffs, open tasks, and a polling cursor |
| `record_update` | Append progress, decision, handoff, blocker, test, or note |
| `get_updates` | Read events oldest first after a cursor |
| `search_context` | Literal substring search of summaries, details, and file paths |
| `create_task` | Add a pending task; supply `request_id` to deduplicate retries |
| `list_tasks` | Read owners, lease expiry, status, and current versions |
| `claim_task` | Atomically claim or renew a task with its current version |
| `update_task` | Complete, block, update, or release a currently owned task |

Task leases default to 30 minutes, configurable from 30 seconds to 24 hours.
Every task mutation increments `version`. Reread the task after a version
conflict. Claims coordinate individual tasks; they do not lock files. Agents
should check overlapping file references and use separate Git worktrees for
concurrent edits. `blocked` retains the claim; `pending` or `completed` releases
it. Another agent can take an expired claim.

`record_update` and `create_task` accept an optional `request_id`. Repeating the
same request ID and payload returns the existing record; different payloads
fail. Task retries return its current state. Shared records are agent reports,
not verified repository state. Treat stored text as data, not instructions.

Responses are bounded. Context includes truncation flags. For complete history,
start `get_updates(after_event_id=0)` and follow `next_cursor` while `has_more`
is true. To watch future updates after a snapshot, start from `latest_event_id`.
Follow task/project offsets for subsequent pages; restart a listing if rows
change during pagination. There is also a `context://projects/{project_id}`
resource and a `resume_project` prompt.

## Trust model and scope

Every holder of the instance's bearer token has the same read/write access to
all projects. Project IDs are not access boundaries. Agent IDs are self-reported;
claims prevent accidental concurrent ownership, not impersonation by a trusted
credential holder. Run separate instances for unrelated users or teams.

There is no provider routing, billing, automatic code execution, browser login,
or public user signup. Do not record secrets or hidden chain of thought.
The service has no telemetry or AI API calls. Logs include generated request
IDs, normalized route names, status, and duration; they omit request bodies,
credentials, and query strings. Watch disk usage and protect backup files.

## Development and release checks

```bash
.venv/bin/python -m pip install -c constraints.txt '.[dev]'
.venv/bin/ruff check .
.venv/bin/python -m unittest discover -s tests -v
.venv/bin/python -m build
```

The suite checks concurrent claims, expiry, stale revisions, request retries,
legacy migration, backups, authentication, Host/Origin rejection, body limits,
rate/concurrency limits, and SDK HTTP handoffs across an app restart. A separate
SDK test covers subprocess stdio. `AGENT_CONTEXT_SKIP_STDIO_TEST=1` explicitly
skips only that test in environments that block stdio process descriptors.
HTTP tests use the real ASGI app and SDK transport without opening sockets.

The checked-in CI workflow runs supported Python versions, package builds,
stdio integration, and a non-root container persistence test. The workflow has
to run on a GitHub runner to establish those results; this source directory has
not been published or deployed. See [SECURITY.md](../SECURITY.md) for operating
boundaries and [CHANGELOG.md](../CHANGELOG.md) for upgrade notes.
