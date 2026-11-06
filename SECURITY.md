# Operating and security boundaries

Agent Context is designed for a single trusted user or team per instance.
Anyone holding its bearer token can read and write every project in that
instance. Self-reported agent IDs and project slugs do not establish identity
or enforce tenant isolation. Use separate instances for separate trust groups.

Local stdio uses the launching user's filesystem permissions. HTTP defaults to
loopback and requires a bearer token; unauthenticated loopback mode must be
explicitly requested. Non-loopback unauthenticated binding is rejected.
`dashboard` provisions a private local token if credentials were not configured.

HTTP checks Host and Origin allowlists, rejects duplicate security headers,
caps request bodies, and limits protected concurrency and request volume.
Limits apply to one process; run the bundled single-worker deployment. The
public dashboard shell and static assets contain no project data. Operator APIs
require the same bearer token as MCP. The browser keeps the token in memory.
Stored content is rendered as text, with a restrictive Content Security Policy.

This is pre-provisioned bearer authentication, not an OAuth authorization server.
Interactive OAuth discovery, per-user permissions, scoped API keys, and API key
administration are not implemented. Do not place unrelated public users behind
the same instance and token.

Use an encrypted route for remote access: HTTPS through a reverse proxy,
a private VPN, or an SSH tunnel. Plain LAN HTTP exposes credentials and data. Keep the application port
private, set exact Host/Origin allowlists, configure proxy connection/time limits,
and protect credentials and backup files. Origin validation is not CORS support.
The service does not trust forwarded headers for identity and never accepts
credentials from query strings. Avoid putting tokens in URLs or recorded updates.

SQLite requires local durable storage. Do not use a network filesystem or
multiple horizontally scaled replicas. Monitor disk space and application
errors, back up with the SQLite backup command, and rehearse restores before
upgrading. Dependency constraints capture tested versions, not signed provenance
or a guarantee that those versions are free of vulnerabilities. The npm release
uses `package-lock.json` for its build dependencies and bundles runtime libraries
with their licenses. `constraints.txt` applies to the retained Python version.

Records contain client-reported facts and can include inaccurate or hostile
text. Agents must inspect actual repository state and treat saved content as
data rather than higher-priority instructions. Task claims are advisory workflow
coordination; they do not lock files or stop a credential holder from
impersonating another agent.

## Reporting a vulnerability

Email the maintainer privately at
[suyashbalasubramaniam@gmail.com](mailto:suyashbalasubramaniam@gmail.com).
Use a subject such as `Agent Context security report`. Include the affected
version, impact, minimal reproduction, and relevant environment. Remove tokens,
private project content, and real database files. Do not open a public issue
with exploit details or credentials. Coordinate disclosure with the maintainer.

This is the maintainer's contact address, not a dedicated security service.
No guaranteed response time or formal support period is offered for this early
release. Reports should target the current Node/React version. The retained
Python prototype is historical and is not the active npm product.
