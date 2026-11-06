# MCP and command reference

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


## CLI actions

| Action | Behavior |
| --- | --- |
| No action, or `dashboard` | Start the local dashboard and HTTP MCP service |
| `stdio` | Start the MCP subprocess; stdout is reserved for protocol messages |
| `config` | Print stdio JSON for `--client generic`, `cursor`, `vscode`, or `gemini` |
| `token` | Show the configured token or provision the local instance token |
| `keygen` | Print a new random token; does not rotate a running server |
| `check` | Check an existing database for integrity |
| `backup` | Back up an existing database to the new `--output` file |

Run `agent-context --help` for the complete options list. `--db` selects the
SQLite file. `--host` and `--port` control HTTP binding. Repeat `--allowed-host`
and `--allowed-origin` for each exact additional Host/Origin value.

HTTP defaults: host `127.0.0.1`, port `8765`, maximum body 262144 bytes,
600 protected requests per minute, and 32 protected concurrent requests.
Use `--max-body-bytes`, `--requests-per-minute`, and `--max-inflight` to change
them. The initial request-rate burst is also 600; limits are process-local.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `AGENT_CONTEXT_DB` | Database filename; `--db` takes precedence |
| `AGENT_CONTEXT_HOST` | HTTP bind address; `--host` takes precedence |
| `AGENT_CONTEXT_PORT` | HTTP port; `--port` takes precedence |
| `AGENT_CONTEXT_TRANSPORT` | `stdio` or `streamable-http`; explicit action selects the mode |
| `AGENT_CONTEXT_TOKEN` | Explicit instance token |
| `AGENT_CONTEXT_TOKEN_FILE` | Read the instance token from this file |

Use only one token source: token environment variable, token-file environment
variable, or `--token-file`. Without a configured source, dashboard mode persists
an `access-token` file beside the database. `config` does not create files or
include credentials. It generates local stdio settings; HTTP header formats are
client-specific. See [client setup](clients.md).

`AGENT_CONTEXT_PUBLIC_HOST` and `AGENT_CONTEXT_PUBLIC_ORIGIN` are Compose
substitution variables used by `compose.yaml`, not general CLI settings.

## HTTP endpoints

| Endpoint | Access | Purpose |
| --- | --- | --- |
| `/dashboard` | Public static shell | Login UI; project records require API authentication |
| `/mcp` | Bearer token | Streamable HTTP MCP transport |
| `/healthz` | Public | Process liveness |
| `/readyz` | Bearer token | Database readability, not write-capacity or disk-space proof |
| `/api/*` | Bearer token | Dashboard APIs, including the local database path for setup |

The operator API is used by the bundled dashboard; MCP is the documented agent
integration. Do not put a token in the URL. The browser holds it only in page
memory. See [operations](operations.md) for deployment and backup procedures.
