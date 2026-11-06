import { ensurePublishedPackage } from './published-package.mjs';
import { releaseBasename } from '../src/release-files.mjs';
import { copyFile, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const config = JSON.parse(await readFile('site/config.json', 'utf8'));
if (pkg.version !== config.version || pkg.name !== config.packageName) throw new Error('Package and site release metadata differ.');
const origin = new URL(config.origin);
if (!['https:', 'http:'].includes(origin.protocol) || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('Website origin must be an HTTP(S) origin without a path or credentials.');
if (config.repositoryUrl && !/^https:\/\/github\.com\/[^/]+\/[^/]+\/?$/.test(config.repositoryUrl)) throw new Error('Use a GitHub repository URL.');
for (const link of config.profileLinks || []) {
  if (!link || typeof link.label !== 'string' || !link.label.trim() || typeof link.url !== 'string') throw new Error('Profile links require a label and URL.');
  const url = new URL(link.url);
  if (!['https:', 'http:', 'mailto:'].includes(url.protocol) || url.username || url.password) throw new Error('Profile links must use HTTP(S) or mailto without credentials.');
}
if (config.npmPublished) await ensurePublishedPackage({ root, pkg, release: JSON.parse(await readFile('site/published-release.json', 'utf8')) });
const archive = releaseBasename(pkg.name, pkg.version);
const files = [{ path: `dist/npm/${archive}.tgz`, kind: 'npm' }, { path: `dist/release/${archive}-source.tar.gz`, kind: 'source' }];
for (const item of files) await stat(item.path);
await rm('public/downloads', { recursive: true, force: true });
await mkdir('public/downloads', { recursive: true });
await mkdir('public/licenses', { recursive: true });
await mkdir('public/docs', { recursive: true });
await copyFile('LICENSE', 'public/docs/LICENSE.txt');
for (const name of ['react', 'react-dom', 'scheduler', 'framer-motion', 'motion-dom', 'motion-utils', 'next', 'tailwindcss']) {
  let copied = false;
  for (const filename of ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'license.md']) {
    try { await copyFile(`node_modules/${name}/${filename}`, `public/licenses/${name}-LICENSE.txt`); copied = true; break; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  if (!copied) throw new Error(`Missing license for ${name}`);
}
const manifest = { source_commit: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || null, name: pkg.name, version: pkg.version, npm_published: config.npmPublished, repository_url: config.repositoryUrl, downloads: [] };
for (const item of files) {
  const filename = item.path.split('/').at(-1), data = await readFile(item.path);
  await copyFile(item.path, 'public/downloads/' + filename);
  manifest.downloads.push({ kind: item.kind, filename, bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') });
}
await writeFile('public/downloads/release.json', JSON.stringify(manifest, null, 2) + '\n');
console.log('Prepared verified release downloads and license notices for Next.js.');
