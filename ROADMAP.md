# Roadmap

This roadmap describes planned work, not currently shipped capabilities.

## Open-source launch

- Verify the public repository contains the current release commit and guides.
- Run the configured desktop-platform, package, and container CI checks.
- Publish the reviewed npm artifact under an available name owned by the maintainer.
- Deploy the public website and verify its package/source downloads.
- Add the verified repository, npm, and website URLs to package metadata.

## Context quality

- Full-text retrieval and better filtering for larger histories.
- Explicit superseding of decisions and richer project summaries.
- Context export/import and documented retention controls.

## Agent experience

- Optional client setup helpers that preview and merge configuration changes.
  Read-only JSON generation and website/dashboard client selectors already ship.
- Clearer stale-claim recovery and file-overlap visibility.
- Session checkpoints and compact handoff templates.

## Operations

- More restore and fault-injection coverage.
- Instance diagnostics that preserve private project data.
- Optional per-client credentials with clearly defined permissions.

The core remains self-hosted project context through MCP. Provider routing and
hosted multi-tenant accounts are outside the current product scope.

## Priorities after the scoped launch

- Publish `@suyashb/agent-context`; do not use the occupied unscoped name.
- Demonstrate two real clients handing off a feature and compare that workflow
  with shared Markdown. Publish measured results rather than performance claims.
- Explore opt-in lifecycle checkpoints with clear limits for crashes and clients
  that do not expose hooks; do not claim automatic capture until implemented.
- Design per-client identity, revocation, and permissions before advertising
  separate user access. Document migration and storage boundaries.
- Evaluate optional file-path claims, conflict visibility, and richer retrieval.
  File claims alone must not be described as filesystem locks.
