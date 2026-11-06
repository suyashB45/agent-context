# Operations and self-hosting

`agent-context --help` lists all commands. HTTP binds to loopback and uses
a private bearer token by default. To supply your own credentials, set
`AGENT_CONTEXT_TOKEN`, `AGENT_CONTEXT_TOKEN_FILE`, or `--token-file`. Set only
one token source. `agent-context keygen` generates a fresh random token.
Rotate by replacing it, restarting the service, and updating clients.

Local development can explicitly opt out of authentication:

```bash
agent-context --allow-unauthenticated-local
```

This refuses a non-loopback bind. Remote access should use HTTPS through a
reverse proxy with exact Host/Origin allowlists:

```bash
agent-context --host 127.0.0.1 --allowed-host context.example.com --allowed-origin https://context.example.com --db /srv/agent-context/context.sqlite3 --token-file /path/to/token
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
instances for unrelated users or teams. See [security boundaries](../SECURITY.md).

### Docker from a source checkout

The multi-stage image builds React and the Node service, then runs only the
compiled package as a non-root user. From the source directory:

Install Node.js 24+, npm, Docker, and Docker Compose. From the repository root:

```bash
npm ci
npm run build:runtime
node bin/agent-context.mjs keygen
```

Copy `.env.example` to `.env` if it does not already exist. Set
`AGENT_CONTEXT_TOKEN` to the generated value, preserving any existing settings.
Keep `.env` private. Then start the container:

```bash
docker compose up -d --build
```

Compose publishes port 8765 on host loopback, runs as a non-root user with a
read-only container filesystem, and persists SQLite in a named volume. Run one
instance per volume on a local disk. Do not scale replicas against that file.

For remote use, configure [the Caddy example](../examples/Caddyfile), replace its
hostname, and set `AGENT_CONTEXT_PUBLIC_HOST=your.hostname` and
`AGENT_CONTEXT_PUBLIC_ORIGIN=https://your.hostname` in `.env`. Configure proxy
timeouts and your firewall for that environment. DNS, certificates, and hosting
are not provisioned by this package.

## Backups and upgrades

```bash
agent-context backup --db /path/to/context.sqlite3 --output /path/to/backups/context-2026-11-06.sqlite3
agent-context check --db /path/to/backups/context-2026-11-06.sqlite3
```

Backups include committed WAL data and refuse to overwrite existing files.
Choose a fresh filename each time, retain an off-host copy, and test restores.
To restore, stop all clients and the server, preserve the old database and its
`-wal`/`-shm` files together, put the verified backup at the configured path, set
its ownership for the service user, and restart. Do not copy stale WAL sidecars
onto a restored backup or replace a live database.

For Docker:

```bash
docker compose exec agent-context node /app/bin/agent-context.mjs backup --output /data/backup.sqlite3
docker compose cp agent-context:/data/backup.sqlite3 ./backup.sqlite3
```

Upgrade a global installation by installing a newer package tarball, or through
npm after publication. Back up first. Docker upgrades use
`docker compose up -d --build`; avoid `docker compose down -v` to retain data.


## Choose a team network

Use the [team guide](team.md) for same Wi-Fi/LAN, VPN, SSH tunnels, and HTTPS.
Plain LAN HTTP is unencrypted. Use a private VPN, SSH tunnel, or HTTPS for
routine access. Keep the application token enabled for every shared instance.

## Existing installations

Use the same explicit `--db` when starting the service, retrieving its token,
connecting local agents, and backing up. Relative paths resolve from the current
working directory. Prefer an absolute path for services and editors.

| Platform | Default database directory |
| --- | --- |
| Linux | `$XDG_DATA_HOME/agent-context-mcp`, or `~/.local/share/agent-context-mcp` |
| macOS | `~/Library/Application Support/agent-context-mcp` |
| Windows | `%LOCALAPPDATA%\agent-context-mcp` |

The filename is `context.sqlite3`. If the new default database does not exist,
an existing database in the earlier `handoffra` default directory is reused.
Legacy `HANDOFFRA_*` environment settings remain accepted. Conflicting legacy
and current settings are rejected. No records are moved or cleared automatically.

The retained Python prototype uses the command `agent-context-mcp`. The scoped
npm package `@suyashb/agent-context` uses the distinct command `agent-context`.
When running from source, use `node bin/agent-context.mjs`. The database directory
remains `agent-context-mcp` for compatibility with existing installations.
