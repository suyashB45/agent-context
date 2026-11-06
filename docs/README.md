# Documentation

Agent Context is a self-hosted MCP context server, not an AI model provider.
The active product is the Node.js 24+/React npm package. Start with the
[README quick start](../README.md#quick-start-downloaded-npm-package).

| You want to… | Read |
| --- | --- |
| Install a package or run from source | [Quick start](../README.md#quick-start-source-checkout) |
| Connect your coding agent | [Client setup](clients.md) |
| Understand OS, model, and tool requirements | [Compatibility](compatibility.md) |
| Share context between computers | [Team connections](team.md) |
| Configure tokens, Docker, backups, or upgrades | [Operations](operations.md) |
| Look up actions, environment variables, or MCP tools | [Reference](reference.md) |
| Fix a failure | [Troubleshooting](troubleshooting.md) |
| Work on the implementation | [Contributing](../CONTRIBUTING.md) and [architecture](architecture.md) |
| Publish a release or Vercel website | [Release guide](release.md) |
| Report a security issue | [Security reporting](../SECURITY.md) |

## Choose a connection

**One computer:** local stdio clients and the dashboard share the same absolute
database path. **Several computers:** one persistent host exposes Streamable
HTTP through LAN, VPN, SSH forwarding, or HTTPS. Everyone uses the same project
ID and the host's token. Separate databases do not share history automatically.

## Product website and local dashboard

The product website contains docs and downloadable releases. It does not store
your team context. `npm run site:serve` previews it at port 8770 after a website
build. The installed MCP server serves its dashboard at port 8765 and owns your
SQLite database. Deploying the product website does not deploy that server.

## Reading examples

Replace `/absolute/path/...`, `context.example.com`, `192.168.1.50`, usernames,
and tokens with your own values. Example addresses are not live services.
Commands are run from the repository root unless they say otherwise. A relative
`--db` path is resolved from the terminal's working directory; use an absolute
path for editors and services. Preserve existing client configurations.

## Release and verification status

The checkout builds version 0.4.0. npm publication remains pending until the
maintainer verifies the registry release and updates `site/config.json`.
The configured CI targets Linux, macOS, Windows, and a container; configuration
alone is not proof those jobs passed. Automated checks have run in the current
Linux environment. Every editor UI, operating system, local model, and network
recipe has not been verified. See [compatibility](compatibility.md).
