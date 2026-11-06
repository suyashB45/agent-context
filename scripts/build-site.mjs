import { releaseBasename } from '../src/release-files.mjs';
import { build } from 'esbuild';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { copyFile, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const config = JSON.parse(await readFile('site/config.json', 'utf8'));
if (pkg.version !== config.version || pkg.name !== config.packageName) throw new Error('Update site/config.json to match the actual package release.');
if (config.repositoryUrl && !/^https:\/\/github\.com\/[^/]+\/[^/]+\/?$/.test(config.repositoryUrl)) throw new Error('Use a verified GitHub repository URL or null.');
for (const link of config.profileLinks || []) {
  if (!link || typeof link.label !== 'string' || !link.label.trim() || typeof link.url !== 'string') throw new Error('Profile links require a label and URL.');
  const url = new URL(link.url);
  if (!['https:', 'http:', 'mailto:'].includes(url.protocol) || url.username || url.password) throw new Error('Profile links must use http(s) or mailto without credentials.');
}
const archive = releaseBasename(pkg.name, pkg.version);
const files = [
  { path: `dist/npm/${archive}.tgz`, kind: 'npm' },
  { path: `dist/release/${archive}-source.tar.gz`, kind: 'source' },
];
for (const item of files) await stat(item.path).catch(() => { throw new Error(`Prepare ${item.path} before building the public download site.`); });
await rm('site/dist', { recursive: true, force: true });
await mkdir('site/dist/assets', { recursive: true });
await mkdir('site/dist/downloads', { recursive: true });
await build({ entryPoints: ['site/src/main.jsx'], outfile: 'site/dist/assets/site.js', bundle: true, platform: 'browser', format: 'iife', minify: true, legalComments: 'external', target: 'es2022', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' } });
await build({ entryPoints: ['site/src/App.jsx'], outfile: 'build/site/ssr.mjs', bundle: true, platform: 'node', format: 'esm', external: ['react'], jsx: 'automatic' });
const { LandingPage, DocsPage, docs } = await import(pathToFileURL(join(root, 'build/site/ssr.mjs')).href + '?build=' + Date.now());
const escape = (text) => String(text).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const deploymentHost = process.env.VERCEL_ENV === 'production'
  ? (process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL)
  : process.env.VERCEL_URL;
const originUrl = new URL(process.env.SITE_URL || config.origin || (deploymentHost ? `https://${deploymentHost}` : 'http://127.0.0.1:8770'));
if (!['http:', 'https:'].includes(originUrl.protocol) || originUrl.username || originUrl.password || originUrl.pathname !== '/' || originUrl.search || originUrl.hash) throw new Error('SITE_URL must be an http(s) origin without a path or credentials.');
const origin = originUrl.origin;
const pages = [{ path: '/', page: 'landing', title: 'Agent Context — Different agents. Same understanding.', description: 'An open-source MCP server for shared project context, decisions, task claims, and handoffs across coding agents. Self-hosted, with a React dashboard.', component: createElement(LandingPage) },
  ...docs.map((doc) => ({ path: doc.href, page: doc.id, title: `${doc.id === 'overview' ? 'Documentation' : doc.title} — Agent Context`, description: doc.subtitle, component: createElement(DocsPage, { page: doc.id }) }))];
for (const page of pages) {
  const directory = join('site/dist', page.path); await mkdir(directory, { recursive: true });
  const content = `<!doctype html>\n<html lang="en" data-page="${escape(page.page)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>${escape(page.title)}</title><meta name="description" content="${escape(page.description)}"><meta property="og:title" content="${escape(page.title)}"><meta property="og:description" content="${escape(page.description)}"><meta property="og:type" content="website"><meta property="og:url" content="${escape(origin + page.path)}"><link rel="canonical" href="${escape(origin + page.path)}"><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/site.css"><script src="/assets/site.js" defer></script></head><body><div id="root">${renderToString(page.component)}</div></body></html>\n`;
  await writeFile(join(directory, 'index.html'), content);
}
await writeFile('site/dist/assets/favicon.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="9" fill="#111a15"/><path d="m20 6 13 8v13l-13 7L7 27V14l13-8Zm0 15 13-7M20 21v13M7 14l13 7" fill="none" stroke="#b8f7d8" stroke-width="1.6"/></svg>');
await copyFile('LICENSE', 'site/dist/docs/LICENSE.txt');
await mkdir('site/dist/assets/licenses', { recursive: true });
for (const name of ['react', 'react-dom', 'scheduler']) await copyFile(`node_modules/${name}/LICENSE`, `site/dist/assets/licenses/${name}-LICENSE.txt`);
const release = { source_commit: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || null, name: pkg.name, version: pkg.version, npm_published: config.npmPublished, repository_url: config.repositoryUrl, downloads: [] };
for (const item of files) {
  const name = item.path.split('/').at(-1), contents = await readFile(item.path);
  await copyFile(item.path, `site/dist/downloads/${name}`);
  release.downloads.push({ kind: item.kind, filename: name, bytes: contents.length, sha256: createHash('sha256').update(contents).digest('hex') });
}
await writeFile('site/dist/downloads/release.json', JSON.stringify(release, null, 2) + '\n');
await writeFile('site/dist/robots.txt', `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
await writeFile('site/dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map((page) => `<url><loc>${origin + page.path}</loc></url>`).join('')}</urlset>\n`);
await writeFile('site/dist/_headers', `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'\n`);
console.log(`Built ${pages.length} prerendered React pages with package/source downloads in site/dist.`);
