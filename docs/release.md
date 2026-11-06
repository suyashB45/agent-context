# Maintainer release and deployment guide

The source is MIT licensed. Publishing the repository, npm package, and website
are separate actions. A successful build does not prove any of them is public.
Do not announce installation commands or deployment URLs until verified.

## 1. Prepare a versioned source revision

Use Node.js 24+, npm, Git, and accounts with rights to the intended GitHub,
npm, and Vercel destinations. The configured repository is
https://github.com/suyashB45/agent-context. Package-name ownership still needs
registry verification before first publication.

For a version change, update `package.json`, the root entries in
`package-lock.json`, `site/config.json`, `VERSION` in `src/config.mjs`, the
launcher/package test expectations, default archive names in release scripts,
current install examples, and the changelog. Search for the old version and
review every match; preserve historical changelog entries. npm versions cannot
be overwritten after publication.

Keep `.env`, tokens, `.npmrc`, databases, local caches, and hosting account
metadata out of Git. Review `git status`, the source diff, and release contents.

## 2. Run verification from a clean checkout

```bash
npm ci
npm run check
npm run docs:check
npm run build
npm test
npm run vercel:build
npm run test:package
```

`vercel:build` builds the runtime, packages the installable archive, exports
allowlisted source, builds the website, and checks its pages/downloads.
`test:package` performs a clean offline installation of the prepared tarball.
It requires working subprocess descriptors. Do not silently skip failures.

Run the configured GitHub Actions jobs on Linux, macOS, Windows, and Docker.
Check their actual results. Directly verify at least two different MCP clients
can exchange a handoff, and test a restore. Record any remaining limits in the
release notes. A workflow file or generated config is not proof of support.

## 3. Review and publish the source release

The generated files for this version are:

| Artifact | Location |
| --- | --- |
| npm package | `dist/npm/agent-context-mcp-0.4.0.tgz` |
| source archive | `dist/release/agent-context-mcp-0.4.0-source.tar.gz` |
| product website | `site/dist/` |
| download sizes and SHA-256 digests | `site/dist/downloads/release.json` |

Review archive entries before sharing. The source archive contains a per-file
`SOURCE-MANIFEST.json`. The npm package bundles its runtime, dashboard, and
third-party licenses. Neither should contain private data or credentials.
Checksums detect mismatched files, not publisher identity.

Push the reviewed commit to the public repository. Create a GitHub release for
that exact commit/tag (for this version, `v0.4.0`). Attach the reviewed npm and
source archives plus their checksum manifest. Include release-specific changes,
install instructions, verification results, and limitations. Do not label
unverified systems or client UIs as tested.

## 4. Publish npm separately

Confirm the selected package name is available to you or owned by your account.
If a scope is needed, update the name, lockfile, site config, archive examples,
and release scripts together before building again. Follow
[npm's publishing and authentication requirements](https://docs.npmjs.com/cli/v11/commands/npm-publish/).
Authenticate through npm's supported flow; do not commit a token or put it in
website settings.

```bash
npm whoami
npm publish ./dist/npm/agent-context-mcp-0.4.0.tgz --access public
```

After the registry confirms publication, verify the exact version:

```bash
npm view agent-context-mcp@0.4.0 version
npm install -g agent-context-mcp@0.4.0
agent-context-mcp --version
```

Verify a fresh install outside the source directory and an actual MCP handoff.
Only then set `npmPublished` to true in `site/config.json`, update README release
status and registry instructions, and rebuild/redeploy the website. Keep the
already published package immutable; any package change needs a new version.

## 5. Deploy the product website to Vercel

Import the repository root, not the `site` subdirectory. The included
`vercel.json` declares:

| Setting | Value |
| --- | --- |
| Root Directory | `./` |
| Application / Framework Preset | Other |
| Node.js | 24.x |
| Install Command | `npm ci --ignore-scripts --no-audit --no-fund` |
| Build Command | `npm run vercel:build` |
| Output Directory | `site/dist` |

No MCP instance token or model API key is needed to build this static site.
The build uses the Vercel deployment hostname for canonical links unless
`SITE_URL` or `site/config.json` sets a public origin. Use the actual successful
deployment URL; a requested project name is not proof of an available domain.
See [Vercel configuration](https://vercel.com/docs/project-configuration/vercel-json).

Verify the homepage, all docs pages, GitHub/profile links, both downloads, and
`/downloads/release.json` on the deployed URL. Test installing the package
actually downloaded from that site. If deployment protection limits access,
configure the intended public audience before announcing a public launch.

Vercel serves product docs and downloads. Users run the persistent SQLite MCP
service on their own computers or servers. `site:serve` is a local preview,
not a production start command for Vercel.

## 6. Connect a custom domain

Add the actual domain in Vercel Project Settings > Domains. Apply the exact
DNS records Vercel provides at the domain registrar. Set production environment
variable `SITE_URL=https://your-domain.example` and redeploy. Use an origin
without a path, query, fragment, or credentials. Verify DNS, HTTPS, canonical
URLs, and sitemap after deployment. Do not put a personal portfolio URL here
unless it actually hosts this product website.

`site/config.json` also controls the GitHub link, creator credit, and optional
`profileLinks` (`label` plus `url`). Verify these destinations and rebuild after
changing them. Set `homepage` in package metadata only to a verified product
website URL when preparing a new package release.

## 7. Announce only verified capabilities

Use a clear description: “Self-hosted shared context and handoffs for
MCP-compatible coding agents.” State Node.js requirements, supported transports,
that agents must record their work, and that each instance is one trusted team.
Link the install guide, team guide, release notes, issues, and security contact.
Distinguish tested combinations from planned support.

For local website review at any point:

```bash
npm run vercel:build
npm run site:serve
```

Open http://127.0.0.1:8770. The MCP dashboard is a separate service on port 8765.
