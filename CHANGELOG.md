# Changelog

## 0.4.0

- Add generic, Cursor, VS Code/Copilot, and Gemini CLI configuration output.
- Add client selection in the dashboard and website, shared-database setup,
  and guidance for remote MCP clients.

- Name the product Agent Context and preserve legacy database/environment settings.
- Add Vercel deployment configuration and custom-domain setup instructions.

- Add a prerendered React launch website, documentation pages, interactive
  handoff example, and real package/source downloads with checksums.
- Add a source-allowlist release archive, contributor docs, community
  guidelines, issue templates, and launch verification in CI.
- Replace the active dashboard with React and a bundled production browser build.
- Add an npm CLI backed entirely by Node.js 24 and built-in SQLite; no Python or
  native dependency compilation is needed for the npm installation.
- Bundle runtime dependencies and third-party licenses into a shareable `.tgz`.
- Preserve the earlier SQLite schema, recorded handoffs, task leases, and retry IDs.
- Add Node service, real SDK HTTP, React rendering, and global npm package checks.
- Update Docker and release CI for the React/Node package on Linux, macOS, and Windows.

The npm CLI defaults to the dashboard. Agent subprocess configurations must use
the explicit `stdio` action or `--mcp`. Use `--db` to select an existing source
checkout's database. Public npm publication remains a separate release step.

## 0.2.0

- Add an embedded local dashboard for projects, tasks, agents, handoffs,
  decisions, searchable context, activity, and client connection instructions.
- Add `dashboard` and `token` commands for first-run local setup.
- Require bearer authentication for HTTP unless explicitly opting into local
  development mode; add secret-file configuration and token generation.
- Add exact Host/Origin checks, request size/rate/concurrency limits, safe
  request logging, liveness, and authenticated readiness.
- Add private data file creation, a versioned legacy migration, integrity
  checks, and consistent backups that never overwrite existing files.
- Make task creation retryable with request IDs.
- Add portable package metadata, runtime dependency constraints, Docker Compose,
  a non-root container image, an HTTPS proxy example, and release CI.
- Add real SDK HTTP tests for authentication and persisted agent handoffs.

Upgrade note: existing HTTP commands now need a configured token or
`--allow-unauthenticated-local`. `dashboard` automatically provisions a token.
The default stdio transport and original tools remain available. Existing
source-checkout databases remain in place and are initialized transactionally.

## 0.1.0

- Initial SQLite project context, append-only updates, search, task leases,
  optimistic revisions, MCP tools/resources/prompts, and stdio/HTTP adapters.
