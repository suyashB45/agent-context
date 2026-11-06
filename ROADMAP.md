# Roadmap

This roadmap describes planned work, not currently shipped capabilities.

## Open-source launch

- Publish the source repository and its contribution guidelines.
- Run the configured desktop-platform, package, and container CI checks.
- Publish the reviewed npm artifact under an available name owned by the maintainer.
- Deploy the public website and verify its package/source downloads.
- Add the verified repository, npm, and website URLs to package metadata.

## Context quality

- Full-text retrieval and better filtering for larger histories.
- Explicit superseding of decisions and richer project summaries.
- Context export/import and documented retention controls.

## Agent experience

- Optional client setup helpers with previewed configuration changes.
- Clearer stale-claim recovery and file-overlap visibility.
- Session checkpoints and compact handoff templates.

## Operations

- More restore and fault-injection coverage.
- Instance diagnostics that preserve private project data.
- Optional per-client credentials with clearly defined permissions.

The core remains self-hosted project context through MCP. Provider routing and
hosted multi-tenant accounts are outside the current product scope.
