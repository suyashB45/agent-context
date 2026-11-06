# Troubleshooting

Start with `node --version`, `npm --version`, and
`agent-context --version`. Report these with your OS, install method,
reproduction steps, and the first relevant error in
[GitHub issues](https://github.com/suyashB45/agent-context/issues).
Remove credentials and private project content from reports.

## ENOENT or a tarball “seems to be corrupted” warning

Read the final error. `ENOENT` means npm cannot find the supplied path; a retry
warning does not prove the archive is corrupt.

For a downloaded file, open a terminal in the folder containing it:

```bash
npm install -g ./suyashb-agent-context-0.4.0.tgz
```

For a source checkout, generate the ignored build artifacts first:

```bash
npm ci
npm run build:runtime
npm pack --ignore-scripts --pack-destination dist/npm
npm install -g ./dist/npm/suyashb-agent-context-0.4.0.tgz
```

If a downloaded file really is incomplete, download it again and compare its
SHA-256 digest with the website's `/downloads/release.json`. Checksums detect
file mismatch; they are not a signature or proof of a trusted publisher.

## Command not found or the Python version starts

The npm CLI needs Node.js 24+. Check `npm prefix -g` and ensure its executable
directory is on your terminal/editor PATH. A GUI editor may have a different
PATH from your shell. In MCP config, use the installed executable's absolute
path if needed. On Windows, account for the npm command shim as required by your
client. If global installation fails with permissions errors, use a user-owned
Node/npm installation rather than changing application data ownership blindly.

The retained Python prototype uses `agent-context-mcp`. The new Node command is
`agent-context`, provided by npm package `@suyashb/agent-context`. From source,
select the Node launcher explicitly:

```bash
node bin/agent-context.mjs --version
```

Build first if `build/npm/cli.mjs` is missing.

## Port already in use

Stop the older service, or start with `--port 8766` and update every client URL.
Custom Host/Origin allowlists must use the actual port. A port conflict also
prevents an SSH tunnel from binding; stop the teammate's local server before
using the tunnel example in the [team guide](team.md).

## Token rejected or different project history

Retrieve the token on the host with the same `--db` and credential settings as
the running instance. Do not retrieve a token from a teammate's unrelated local
installation. If the host uses `--token-file`, use that setting for token lookup
as well. Set only one token source. Restart after rotating a token and update
clients. Reloading the dashboard clears its in-memory token.

Relative database paths depend on the current directory. Check the absolute
path and project ID match in every local process. For remote clients, check the
endpoint points to the shared host. Running separate servers creates separate
history unless they use the same local database.

## HTTP failures

| Result | Check |
| --- | --- |
| Connection refused / timeout | Service running, host awake, correct IP/port, firewall, network isolation, VPN/tunnel |
| 401 | Correct host token supplied in Authorization header |
| 403 | Exact browser Origin allowed, including scheme and non-default port |
| 421 | Exact Host allowed, including non-default port; never use 0.0.0.0 as client URL |
| 413 | Body exceeded the configured size limit; split the update |
| 429 | Request rate exceeded; follow Retry-After |
| 503 | Protected concurrency limit or unavailable service; follow Retry-After when present and retry later |

Use [team connections](team.md) for network recipes. Plain LAN HTTP does not
encrypt credentials; VPN, SSH, and HTTPS provide encrypted routes.

## Agent connects but does not record work

Enable the server's MCP tools and start a fresh agent session. A stdio
configuration must include the `stdio` action. Add the
[shared workflow](../examples/AGENT_INSTRUCTIONS.md) to the instruction file the
agent reads. Verify with a test project and actual tool calls. For local models,
check tool calling in both the model/template and host.

A connected server does not automatically scan repositories or copy chat
history. Task claims do not prevent overlapping file edits.

## Vercel shows a wrong page, build failure, or preset mismatch

Import the entire repository with Root Directory `./`, preset **Next.js**, Node
**24.x**, build `npm run build`, and output `.next`. Keep
`vercel.json` at the repository root. Read the first failed build step rather
than only the final non-zero exit message. Ensure the deployed Git commit
contains the current package and matching site configuration.

The official product website is https://agentcontext.suyashb.me. Users run only
the MCP service/dashboard locally. Vercel hosts the product website, not the
persistent SQLite MCP instance. See [release and deployment](release.md).

## Restricted development environment

If listening sockets or child-process descriptors are blocked, do not interpret
missing output as success. Run those checks on an unrestricted development host
or CI. The documented optional skip is for two subprocess tests only; report it
when used. Browser and Docker verification need their corresponding tools.

### Vercel: NEXT_NO_ROUTES_MANIFEST

If compilation and page checks pass but Vercel looks for
`out/routes-manifest.json`, the Next.js adapter is using the static export
folder as its build directory. Set Output Directory to `.next` and deploy the
corrected commit. The tracked `vercel.json` pins that value. Keep `output:
'export'` in `next.config.mjs`; `out/` remains the local static export. Do not
copy or fabricate a routes manifest in `out/`.
