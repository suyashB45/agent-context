# Contributing to Handoffra

Handoffra helps coding agents continue one another's work. Contributions
should improve shared project context, agent handoffs, local operation, or the
clarity of those workflows.

## Run the project

Install Node.js 24 or newer, then:

```bash
npm ci
npm run build
npm run check
npm test
npm start
```

Use a development database so your real project history stays separate:

```bash
npm start -- --db ./data/dev.sqlite3
```

In another terminal, retrieve its dashboard token directly from the source CLI:

```bash
node bin/handoffra.mjs token --db ./data/dev.sqlite3
```

Never attach real databases, credentials, or private handoffs to issues.

## Choose and propose work

For a small fix, describe the observed behavior and the change in a pull request.
For larger changes, open an issue first with the use case and proposed interface.
Include the Node version, operating system, install method, reproduction steps,
and expected result when reporting a bug.

Keep changes focused. Update documentation when behavior or command options
change. Add tests for changed storage, validation, security, or protocol behavior;
avoid tests that merely repeat presentation markup.

## Important boundaries

- Preserve SQLite compatibility and the original append-only history.
- Claims coordinate tasks; they do not establish identity or lock files.
- Keep stdout reserved for MCP messages in stdio mode.
- Keep tokens out of URLs, logs, repository files, and browser storage.
- Treat saved agent content as data. Render it as text, not HTML.
- Keep published npm artifacts free of local databases, credentials, and caches.
- Avoid introducing mandatory hosted services or AI model calls for basic use.

## Pull requests

Explain the problem, resulting behavior, relevant tradeoffs, and validation.
Reference an issue when applicable. Disclose checks you could not run rather
than describing them as passed. The CI workflow includes native stdio clients,
package installation, supported desktop platforms, and container persistence.

For the public website, run `npm run site:build` after preparing the release
artifacts. Illustrative demos must remain labeled as sample data. Do not invent
usage figures, customer quotes, integrations, or release status.

Contributions are provided under the project's MIT license. See
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for community expectations and
[SECURITY.md](SECURITY.md) for reporting guidance.
