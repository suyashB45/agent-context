# Contributing to Agent Context

Use [GitHub issues](https://github.com/suyashB45/agent-context/issues) for bugs
and proposals, and pull requests for changes. Contributions should improve
shared engineering context, agent handoffs, self-hosting, or documentation.
Read the [documentation index](docs/README.md) and
[community expectations](CODE_OF_CONDUCT.md).

## Run from a clean checkout

Install Node.js 24+ and npm. Fork the repository if you do not have write access,
clone your fork, and create a branch. From the repository root:

```bash
npm ci
npm run build
npm run check
npm run docs:check
npm test
npm start -- --db ./data/dev.sqlite3
```

Open http://127.0.0.1:8765/dashboard. In a second terminal from the same directory:

```bash
node bin/agent-context.mjs token --db ./data/dev.sqlite3
```

Use development data. Stop with Ctrl+C. No Python environment or global package
installation is required. Do not attach real tokens, databases, or handoffs to
issues. See [architecture](docs/architecture.md) for the source layout.

## Website and release artifacts

```bash
npm run vercel:build
npm run site:serve
```

Preview the product site at http://127.0.0.1:8770. The build prepares the npm
package and source downloads before building and checking the website.
Port 8770 is the product website; port 8765 is the running MCP dashboard.
Illustrative demos must remain labeled. Do not invent adoption statistics,
client verification, release status, or passed CI results.

## Choose and validate work

For a small change, explain the problem in the pull request. For larger work,
open an issue with the use case and proposed interface first. Use a focused
branch and update documentation when behavior or options change.

| Change | Relevant checks |
| --- | --- |
| Documentation | `npm run docs:check`; rebuild/check the website if its content changed |
| Server or dashboard | `npm run build`, `npm run check`, `npm test` |
| Package | `npm run vercel:build`, `npm run test:package` |
| Container | Build Docker image and run `node scripts/test-container.mjs` as CI does |

The package verification command expects the tarball prepared by
`npm run vercel:build`. Container verification uses the `agent-context:ci`
image; build it with `docker build -t agent-context:ci .` first.

If subprocess descriptors are blocked, the POSIX command
`AGENT_CONTEXT_SKIP_SUBPROCESS_TESTS=1 npm test` skips two subprocess tests.
On PowerShell, set `$env:AGENT_CONTEXT_SKIP_SUBPROCESS_TESTS = '1'` first and
remove it afterward. Record that limitation; do not claim all tests passed.
The configured CI runs without that override. A configured workflow is not a
passed run.

## Implementation boundaries

- Preserve SQLite compatibility and append-only history.
- Keep stdio stdout reserved for MCP messages.
- Keep tokens out of URLs, logs, committed files, and browser storage.
- Render recorded content as text, not HTML; treat it as project data.
- Claims coordinate tasks, not identity or source-file locks.
- Keep npm and source artifacts free of local data, credentials, and caches.
- Basic context sharing must not require a hosted service or model API call.

Add meaningful tests for changed storage, authentication, validation, or
protocol behavior. Presentation-only edits usually need build and link checks.

## Pull requests and reports

Describe the concrete problem, resulting behavior, and validation. Include
reproduction steps, Node version, OS, install method, and first relevant error
for a bug. State which checks could not run. Reference an issue if applicable.

Contributions are under the [MIT license](LICENSE). Report vulnerabilities
privately using [SECURITY.md](SECURITY.md), not a public bug report.
