# Maintainer release guide

The repository and npm name must belong to the maintainer. Do not publish under
an inferred account or claim a release exists before the registry confirms it.

## Validate and prepare

```bash
npm ci
npm run build
npm run check
npm test
mkdir -p dist/npm
npm pack --pack-destination dist/npm
npm run test:package
npm run release:source
npm run site:build
```

Run CI on the intended repository, including container and desktop-platform
checks. Review the package and source archive for private data. Keep test skips
explicit and record verification limitations in the release notes.

## Publish the repository

Create a public GitHub repository under an account or organization you control.
Keep `.env`, tokens, databases, node_modules, caches, and site-hosting identity
metadata out of the public source. Use the generated source archive as the
reviewable release payload; it is produced from a source allowlist.

Set `repository.url`, `bugs.url`, and `homepage` in package.json to verified
destinations, then rebuild the package. For the website, configure the verified
repository URL in `site/config.json` so its source links point to the real project.

## Publish npm

Authenticate on a machine that can reach npm and has rights to the selected
package name. Publish the exact reviewed tarball:

```bash
npm publish ./dist/npm/agent-context-mcp-0.4.0.tgz --access public
```

Verify the registry package and install it into a fresh environment before
switching the website to registry commands. Set `npmPublished` to true in
`site/config.json` only after this succeeds. If an npm scope is needed, update
the package name, lockfile, website config, and install examples together.

## Website

`site/dist/` is a static React site with prerendered HTML, documentation,
package/source downloads, checksums, and a workflow example. It contains no
project database or dashboard access token. Use `npm run site:serve` to review
it locally at http://127.0.0.1:8770.

Deploy this repository as a Vercel project using the included `vercel.json`.
Use Node.js 24 in Project Settings. Vercel runs `npm run vercel:build`, which
builds the local application, creates its downloadable npm and source archives,
and verifies the six-page website. The output directory is `site/dist`.
The Vercel deployment serves the public website and downloads. Users run the
SQLite MCP service on their own computers or persistent servers.

The build reads Vercel's deployment hostname automatically. For a custom domain,
add the domain under Vercel Project Settings > Domains, apply the exact DNS
records Vercel supplies, and set `SITE_URL=https://your-domain.example` in the
production environment. Redeploy after changing it so canonical URLs and the
sitemap match the domain. `SITE_URL` must be an origin without a path.

For a local release preview, run:

```bash
npm run vercel:build
npm run site:serve
```

Verify the actual deployment URL, documentation links, and both downloads
before announcing the website. Publish npm separately; website deployment does
not publish a package to the npm registry.
