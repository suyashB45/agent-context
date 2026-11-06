# Product website

The official website is https://agentcontext.suyashb.me. Visitors use it for
installation, docs and downloads. They run the MCP service and React dashboard
on their computer or team server; Vercel does not host the SQLite service.

## Website contributors

Use Node.js 24+ and npm at the repository root:

```bash
npm ci
npm run build
npm run site:preview
```

The static preview is http://127.0.0.1:8770. This preview is only for website
contributors. For live editing after preparing downloads, run
`npm run site:serve -- --port 8770` instead. The MCP dashboard uses port 8765.

`npm run build` checks documentation, bundles the MCP runtime, creates release
archives, prepares verified public downloads, builds Next.js and checks the
export. Published npm downloads must match `site/published-release.json`;
an internet connection or a matching local cached archive is required. The
source download contains current source. Do not republish version 0.4.0 to
ship website changes. A changed npm release needs a new version.

## Source layout

| Location | Purpose |
| --- | --- |
| `app/` | App Router pages, SEO metadata, sitemap, robots and global CSS |
| `site/src/sections/` | One component per landing-page section |
| `site/src/components/` | Navigation, SVG icons, tabs, copy feedback, motion |
| `site/src/content.js` | Landing copy, sample data and roadmap placeholders |
| `site/src/docs-content.js` | Documentation navigation metadata |
| `site/config.json` | Product identity, release status, origin and profile links |
| `site/published-release.json` | Immutable published npm archive integrity |
| `scripts/build-site.mjs` | Prepare public downloads and license notices |
| `out/` | Generated Next.js static export; do not commit |

The visual identity uses black surfaces, green for recorded work and blue for
the next session. `app/identity.css` holds the theme and responsive bridge
layout. The hero shows illustrative handoff activity, never a live connection
or client verification claim.

Tailwind CSS is processed through PostCSS; Framer Motion handles interaction
transitions. Fonts use system sans-serif and monospace stacks, with no font
service required. The dashboard preview uses illustrative data, labeled
“Example data”. The preview is code and SVG rather than a remote image or video;
its component has a separate lazy-loaded JavaScript chunk.

The site defaults to dark mode. The light toggle saves only the theme preference
in browser storage. It never stores an MCP token. Copy buttons use the Clipboard
API, which requires HTTPS or a trusted localhost origin. If copying fails, the
command remains selectable.

## Accessibility and responsive review

Before deployment, run `npm run check`, `npm run docs:check` and `npm run build`.
The build checks nine rendered pages, their local links/assets and download
checksums. Review these browser behaviors separately:

- Layout and horizontal overflow at 375px, tablet widths and 1440px.
- Dark and light contrast, keyboard focus and the skip link.
- Mobile navigation; Escape closes it and restores focus to its button.
- Tabs with arrow keys, Home/End; selected panels and copy feedback.
- Reduced-motion preference, including the terminal and scroll transitions.
- Downloads and external links on the actual deployed HTTPS URL.

Copy verification and successful compilation do not establish browser testing
or compatibility with every MCP client. Keep existing honest limits visible.

## Vercel

Import the repository root (`./`). Use the Next.js preset, Node 24.x,
`npm ci --ignore-scripts --no-audit --no-fund` to install,
`npm run build` to build and `out` as the output directory. These settings are
in `vercel.json`. Remove any old project-level override that uses `site/dist`.
Update `origin` in `site/config.json` if the public domain changes. No database,
instance token or model API key belongs in website environment variables.

See the [release guide](release.md#5-deploy-the-product-website-to-vercel)
for deployment and live verification. The public site allows inline Next.js
hydration scripts in its Content Security Policy. The local MCP dashboard
keeps its separate runtime security policy.
