# Maintainer release and deployment guide

The source is MIT licensed. Publishing the repository, npm package, and website
are separate actions. A successful build does not prove any of them is public.
Do not announce installation commands or deployment URLs until verified.

## 1. Prepare a versioned source revision

Use Node.js 24+, npm, Git, and accounts with rights to the intended GitHub,
npm, and Vercel destinations. The configured repository is
https://github.com/suyashB45/agent-context. The npm account confirmed for publication is `suyashb`, so the package uses
`@suyashb/agent-context`. The unscoped `agent-context-mcp` package belongs to
another maintainer and is not this project. Verify the scoped name before publishing.

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
npm run test:package
```

`npm run build` builds the runtime, packages the installable archive, exports
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
| npm package | `dist/npm/suyashb-agent-context-0.4.0.tgz` |
| source archive | `dist/release/suyashb-agent-context-0.4.0-source.tar.gz` |
| product website | `out/` |
| download sizes and SHA-256 digests | `out/downloads/release.json` |

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
npm publish ./dist/npm/suyashb-agent-context-0.4.0.tgz --access public
```

After the registry confirms publication, verify the exact version:

```bash
npm view @suyashb/agent-context@0.4.0 version
npm install -g @suyashb/agent-context@0.4.0
agent-context --version
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
| Application / Framework Preset | Next.js |
| Node.js | 24.x |
| Install Command | `npm ci --ignore-scripts --no-audit --no-fund` |
| Build Command | `npm run build` |
| Output Directory | `.next` (Next.js adapter) |

`out/` remains the generated static export used by the local preview and
checks. Vercel’s Next.js adapter reads `.next/` build manifests before packaging
that export. Do not point the adapter at `out/`; that causes
`NEXT_NO_ROUTES_MANIFEST`. The repository configuration pins `.next` to override
older project settings.

No MCP instance token or model API key is needed to build this static site.
Canonical links and the sitemap use `origin` in `site/config.json`. Use the actual successful
deployment URL; a requested project name is not proof of an available domain.
See [Vercel configuration](https://vercel.com/docs/project-configuration/vercel-json).

Verify the homepage, all docs pages, GitHub/profile links, both downloads, and
`/downloads/release.json` on the deployed URL. Test installing the package
actually downloaded from that site. If deployment protection limits access,
configure the intended public audience before announcing a public launch.

Vercel serves product docs and downloads. Users run the persistent SQLite MCP
service on their own computers or servers. Users visit the official website;
its build output is deployed by Vercel.

## 6. Connect a custom domain

Add the actual domain in Vercel Project Settings > Domains. Apply the exact
DNS records Vercel provides at the domain registrar. Set `origin` in `site/config.json` to the new public HTTPS URL and redeploy. Use an origin
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

The official product website is https://agentcontext.suyashb.me. Users visit it
in their browser; they only run the MCP service/dashboard locally. Optional
website development preview instructions belong in [CONTRIBUTING.md](../CONTRIBUTING.md).

## Automated live launch verification

After pushing and deploying the intended commit, run from a clean source checkout
with dependencies installed and working access to GitHub, npm, and the website:

```bash
npm run verify:launch -- --site https://agentcontext.suyashb.me
```

The command checks the push CI run and all four jobs for current main, public
product/doc pages, both live download checksums, npm version/repository/integrity,
identical website and registry npm tarballs, and a clean temporary installation
of the website download. It verifies command shim, assets, version, and token
creation. It does not drive a browser or third-party agent UI.

The website manifest records `source_commit` from Vercel or GitHub's build
environment. Older deployments without that field must be redeployed. If npm
publication passes but the site still says pending, update the release status
and redeploy before re-running the final check.

The JSON report is saved to `dist/release/launch-verification.json`. Exit 0 means
all checks passed; exit 1 means an observed mismatch/failure; exit 2 means checks
are blocked by connectivity, permissions, or missing evidence. A network error
is not proof a service is down or a package unpublished. Public GitHub API rate
limits may require retrying later. This command never publishes or changes
accounts and never announces a launch.

## Preserve published package bytes on website updates

`site/published-release.json` records the verified npm tarball URL, SHA-512
integrity, and SHA-1 shasum for the current public release. When `npmPublished`
is true, the site build uses those exact bytes for its npm download. A fresh
CI/Vercel build retrieves the archive from npm; a matching local copy can be
reused. Rebuilding the website must not replace an immutable registry release
with a newly packed archive containing later docs or metadata changes.

For a new version, update package/site versions together and set `npmPublished`
to false while preparing the candidate archive. Publish and verify that version,
update the release record from registry metadata, then set `npmPublished` to true. In restricted
local environments, `dist/published/` can hold the verified archive as a local
cache. It is ignored by Git and excluded from source exports. A mismatched
checksum or unavailable required download fails the build.

A public `0.0.0-stage` placeholder is not a working release. For staged
publishing, review the entry with `npm stage list @suyashb/agent-context` and
`npm stage view STAGE_ID`, then approve it with `npm stage approve STAGE_ID`
and complete 2FA. Confirm the actual version through the public registry before
updating the publication flag. Do not infer publication from a success line alone.
