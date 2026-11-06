# Agent Context

A self-hosted MCP server with a **React dashboard**, distributed as an npm
package. Claude, Codex, and other MCP clients share project context, decisions,
task claims, and handoffs through one persistent SQLite database.

The project is MIT licensed. See [CONTRIBUTING.md](CONTRIBUTING.md),
[the architecture guide](docs/architecture.md), and [ROADMAP.md](ROADMAP.md).

**Requires Node.js 24+. No Python, AI API key, native compilation, or separate
frontend server is needed.** The published build bundles its server dependencies
and compiled React assets; users do not build the dashboard themselves.

## Install the downloadable package

The npm registry release is pending. The installable package is available in
`dist/npm/agent-context-mcp-0.4.0.tgz`. Share this file; anyone with Node.js 24+
can install it, including offline:

```bash
npm install -g ./agent-context-mcp-0.4.0.tgz
agent-context-mcp
```

From this source directory, the equivalent install is:

```bash
npm install -g ./dist/npm/agent-context-mcp-0.4.0.tgz
```

Once a maintainer publishes the package to npm, users will be able to run:

```bash
npm install -g agent-context-mcp
agent-context-mcp
```

Or, without a global installation, after publication:

```bash
npx agent-context-mcp
```

These registry commands depend on the package being published under that name;
this source checkout does not publish anything automatically. If the name is
unavailable, choose an npm scope before publishing and update installation
commands to match. See [Publishing](#publishing).

## Open the React dashboard

The default command starts the local dashboard and HTTP MCP endpoint:

```bash
agent-context-mcp
```

Open **http://127.0.0.1:8765/dashboard**. In another terminal, retrieve the login
token:

```bash
agent-context-mcp token
```

Paste it into the dashboard. The first run provisions a private token beside
the database and reuses it on later runs. The browser keeps the token in memory,
so reloading requires reconnecting. The token is not put in a URL, cookie, or
browser storage. `agent-context-mcp dashboard` is an explicit alias for the
default command.

The React dashboard includes:

- Overview of projects, open tasks, recent updates, and contributing agents.
- Projects with task creation, decisions, handoffs, and searchable context.
- Agents with their reported activity and live task claims.
- Paginated activity with project and update-type filters.
- Copyable Claude Code and Codex connection instructions for your instance.

The overview refreshes every eight seconds while visible. Other screens have a
manual refresh button so reading older pages is not interrupted. Agent activity
means recorded work, not a live connection or heartbeat.

## Keep your existing project data

The Node service preserves the SQLite schema used by the earlier Python
release. To use an existing database, pass its exact path:

```bash
agent-context-mcp --db /absolute/path/to/your/context.sqlite3
agent-context-mcp token --db /absolute/path/to/your/context.sqlite3
```

For the original source-checkout database on this machine:

```bash
agent-context-mcp --db "$HOME/Desktop/agent-context-mcp/data/context.sqlite3"
```

Use the same `--db` for token retrieval, backups, and agent connections. Existing
records are not moved or cleared. New installations default to the OS user data
directory: `$XDG_DATA_HOME/agent-context-mcp` or `~/.local/share/agent-context-mcp`
on Linux, Application Support on macOS, and LocalAppData on Windows. Set
`AGENT_CONTEXT_DB` to override it. Existing default databases under
`handoffra` are reused when no Agent Context default database exists. Legacy
`HANDOFFRA_*` settings remain supported; conflicting old and new values are
rejected. Data is stored outside a global npm install,
so upgrading the package does not replace it.

Stop an older server using port 8765 before starting this version, or choose
`--port 8766`.

## Connect coding agents

### Local stdio

Each agent launches a process sharing the same database. No HTTP service or
bearer token is needed for stdio. **The npm CLI requires the `stdio` action**
when launched by an MCP client; its default action opens the HTTP service.

```bash
codex mcp add agent-context -- agent-context-mcp stdio --db /absolute/path/to/shared/context.sqlite3
claude mcp add --scope user agent-context -- agent-context-mcp stdio --db /absolute/path/to/shared/context.sqlite3
```

If the agent cannot find global npm executables, use the absolute path to the
installed command. [examples/mcp.json](examples/mcp.json) shows a stdio entry for
clients using the common `mcpServers` configuration shape.

### HTTP

Keep the service running. In the shell that starts your agents, export the
instance's token:

```bash
export AGENT_CONTEXT_TOKEN="$(agent-context-mcp token)"
codex mcp add agent-context --url http://127.0.0.1:8765/mcp --bearer-token-env-var AGENT_CONTEXT_TOKEN
claude mcp add --scope user --transport http agent-context http://127.0.0.1:8765/mcp --header "Authorization: Bearer $AGENT_CONTEXT_TOKEN"
```

Use the same custom `--db` when retrieving a token if you started the server
with one. Claude's header command stores the resolved token in its client
configuration; protect that file. [examples/codex.toml](examples/codex.toml)
shows Codex's environment-based token configuration. Choose one transport per
registration name and restart existing client sessions after changing it.

On PowerShell, set `$env:AGENT_CONTEXT_TOKEN = agent-context-mcp token` before
registering the client, and use `$env:AGENT_CONTEXT_TOKEN` in the Claude header.
This is an operator-provisioned bearer token, not an interactive OAuth login.

### Tell agents to use shared context

Run agents from the repository you are building. Add this instruction to
`AGENTS.md` for Codex and `CLAUDE.md` for Claude, preserving existing content:

```text
Use agent-context MCP for project ID "my-project".
Use a unique agent_id per session.
Read get_context and list_tasks before working.
If the project does not exist, create it and record its architecture,
current progress, and remaining work after inspecting this repository.
Claim a task before editing; renew its lease before expiry.
Record changes, file paths, decisions, and test results.
Before stopping, record a handoff and complete or release your task.
```

Use the **same project ID** in every agent. The server shares recorded facts;
it does not automatically capture conversations, inspect repositories, or
verify code. See [examples/AGENT_INSTRUCTIONS.md](examples/AGENT_INSTRUCTIONS.md).

## Configuration and self-hosting

`agent-context-mcp --help` lists all commands. HTTP binds to loopback and uses
a private bearer token by default. To supply your own credentials, set
`AGENT_CONTEXT_TOKEN`, `AGENT_CONTEXT_TOKEN_FILE`, or `--token-file`. Set only
one token source. `agent-context-mcp keygen` generates a fresh random token.
Rotate by replacing it, restarting the service, and updating clients.

Local development can explicitly opt out of authentication:

```bash
agent-context-mcp --allow-unauthenticated-local
```

This refuses a non-loopback bind. Remote access should use HTTPS through a
reverse proxy with exact Host/Origin allowlists:

```bash
agent-context-mcp --host 127.0.0.1 --allowed-host context.example.com --allowed-origin https://context.example.com --db /srv/agent-context/context.sqlite3 --token-file /path/to/token
```

The service checks Host and Origin, limits HTTP bodies to 256 KiB, defaults to
600 protected requests/minute with a burst of 600, and caps protected concurrent
requests at 32. Override these with `--max-body-bytes`, `--requests-per-minute`,
and `--max-inflight`. Limits apply per process. Host/Origin wildcards are not
accepted. Exact local dashboard origins are allowed by default; the allowlist
does not enable cross-origin browser CORS.

`/healthz` is public liveness; authenticated `/readyz` checks database readability.
Readiness does not prove write capacity or available disk space. Run `check`
for integrity and monitor storage usage. Logs omit credentials, request bodies,
project paths, and query strings.

Every token holder has the same access to all projects in one instance. Agent
IDs are self-reported; task claims coordinate work, not identity. Run separate
instances for unrelated users or teams. See [SECURITY.md](SECURITY.md).

### Docker from a source checkout

The multi-stage image builds React and the Node service, then runs only the
compiled package as a non-root user. From the source directory:

```bash
umask 077
printf 'AGENT_CONTEXT_TOKEN=' > .env
node bin/agent-context-mcp.mjs keygen >> .env
docker compose up -d --build
```

Build the source with `npm ci` and `npm run build` first if the local CLI bundle
does not exist. Compose publishes port 8765 on host loopback, uses a read-only
container filesystem, and persists SQLite in a named volume. Use one instance
per data volume on a local disk. Do not use a network filesystem or scale
replicas against the same SQLite file.

For remote use, configure [examples/Caddyfile](examples/Caddyfile), replace its
hostname, and set `AGENT_CONTEXT_PUBLIC_HOST=your.hostname` and
`AGENT_CONTEXT_PUBLIC_ORIGIN=https://your.hostname` in `.env`. Configure proxy
timeouts and your firewall for that environment. DNS, certificates, and hosting
are not provisioned by this package.

## Backups and upgrades

```bash
agent-context-mcp backup --db /path/to/context.sqlite3 --output /path/to/backups/context-2026-11-06.sqlite3
agent-context-mcp check --db /path/to/backups/context-2026-11-06.sqlite3
```

Backups include committed WAL data and refuse to overwrite existing files.
Choose a fresh filename each time, retain an off-host copy, and test restores.
To restore, stop all clients and the server, preserve the old database and its
`-wal`/`-shm` files together, put the verified backup at the configured path, set
its ownership for the service user, and restart. Do not copy stale WAL sidecars
onto a restored backup or replace a live database.

For Docker:

```bash
docker compose exec agent-context node /app/bin/agent-context-mcp.mjs backup --output /data/backup.sqlite3
docker compose cp agent-context:/data/backup.sqlite3 ./backup.sqlite3
```

Upgrade a global installation by installing a newer package tarball, or through
npm after publication. Back up first. Docker upgrades use
`docker compose up -d --build`; avoid `docker compose down -v` to retain data.

## MCP tools

| Tool | Purpose |
| --- | --- |
| `create_project` | Create a project with a stable slug |
| `list_projects` | Discover projects with pagination |
| `get_context` | Read recent work, decisions, handoffs, and open tasks |
| `record_update` | Record progress, decision, handoff, blocker, test, or note |
| `get_updates` | Read events after a cursor without skipping pages |
| `search_context` | Search summaries, details, and file references |
| `create_task` | Create a pending task with safe retry IDs |
| `list_tasks` | Read owners, live leases, status, and versions |
| `claim_task` | Atomically claim or renew a task using its current version |
| `update_task` | Update, block, complete, or release your current claim |

Leases default to 30 minutes and can be renewed for 30 seconds to 24 hours.
Every task change increments `version`; reread after conflicts. `blocked`
retains a lease, while `pending` and `completed` release it. Expired claims can
be reassigned. Claims do not lock files; check overlapping tasks and use Git
worktrees for concurrent edits.

`record_update` and `create_task` support `request_id`. Matching retries return
the existing record; conflicting payloads fail. Task retries return current
state. Context includes truncation flags. For full history, paginate
`get_updates(after_event_id=0)` using `next_cursor` while `has_more` is true.
For future changes after a snapshot, start from `latest_event_id`. Task/project
lists use offsets. The server also provides `context://projects/{project_id}`
and a `resume_project` prompt.

## Development

```bash
npm ci
npm run build
npm run check
npm test
npm start
```

When running from source, retrieve the dashboard token in another terminal with
`node bin/agent-context-mcp.mjs token`. If you supplied a custom `--db` to
`npm start -- --db ...`, supply the same path when retrieving the token.

The source is organized as `src/` (Node service), `web/src/` (React),
`node-tests/` (tests), and `build/npm/` (compiled distributable). Runtime
libraries are bundled, so consumers install no separate dependencies. Build
scripts verify that external imports are Node built-ins and include bundled
third-party licenses.

Tests cover storage, concurrency, leases, migration, backups, authentication,
HTTP/SDK handoffs, React rendering, escaping stored text, and token handling.
Two subprocess tests can be explicitly skipped with
`AGENT_CONTEXT_SKIP_SUBPROCESS_TESTS=1` in restricted environments; CI runs them
without that override. HTTP tests use the SDK's real fetch transport without
opening network sockets. Browser rendering and container checks require the
corresponding tools on the test host.

The earlier Python implementation is retained in `agent_context_mcp/`; its
setup is documented in `docs/legacy-python.md`. It is not included in the npm
package. The active React/Node release is version 0.4.0.

## Public website and source release

`site/src/` contains a separate React product website with an interactive
handoff example, documentation, and real package/source downloads. The site is
prerendered to static HTML so its content is readable before JavaScript loads.
It does not contain your dashboard token or private project data.

Prepare its release files and build it:

```bash
mkdir -p dist/npm
npm pack --pack-destination dist/npm
npm run release:source
npm run site:build
npm run site:check
npm run site:serve
```

Open http://127.0.0.1:8770 for the product site. This is separate from the local
workspace at port 8765. `site/dist/` can be deployed as a static site.

`dist/release/agent-context-mcp-0.4.0-source.tar.gz` is an inspectable source
archive generated from a source allowlist. It includes a per-file checksum
manifest and excludes data files, credentials, caches, and hosting identity.
The site's download manifest includes SHA-256 checksums for both releases.

`site/config.json` controls the verified repository link and whether the npm
registry release is live. Until publication is confirmed, the site offers the
downloadable tarball and source archive. It does not advertise registry commands
as already working. See [the maintainer release guide](docs/release.md).

## Publishing

Create the package and test an offline global installation:

```bash
mkdir -p dist/npm
npm pack --pack-destination dist/npm
npm run test:package
```

Review the tarball contents and choose an npm name you control. Then, from an
npm-authenticated machine with publishing rights:

```bash
npm publish ./dist/npm/agent-context-mcp-0.4.0.tgz --access public
```

Publishing requires an npm account and the registry's current authentication
requirements. No credentials are stored in this repository, and no publish
step runs automatically. The checked-in CI workflow tests Node 24 on Linux,
macOS, and Windows, plus a container persistence test. A workflow file alone
does not establish a passed CI run; execute it in your repository before release.

## Public website and Vercel

The React website includes documentation and downloadable npm/source releases.
Import this repository into Vercel with Node.js 24; `vercel.json` configures the
build and output directory. Set `SITE_URL` after connecting your custom domain.
See [the deployment and release guide](docs/release.md) for DNS and npm publishing.
