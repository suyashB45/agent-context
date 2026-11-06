import { readFile, readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const root = resolve('site/dist');
const htmlFiles = [];
async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await visit(path); else if (entry.name.endsWith('.html')) htmlFiles.push(path);
  }
}
await visit(root);
assert.equal(htmlFiles.length, 9, 'Landing page plus eight documentation pages must be built.');
let links = 0;
for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  assert.ok(html.includes('id="root"') && html.includes('Agent Context'), 'Pages must be prerendered, not empty React shells.');
  assert.ok(html.includes('<title>') && html.includes('name="description"'));
  for (const match of html.matchAll(/(?:href|src)="(\/[^"<>]*)"/g)) {
    const url = new URL(match[1].replaceAll('&amp;', '&'), 'https://local.invalid');
    let target = join(root, decodeURIComponent(url.pathname));
    const info = await stat(target).catch(() => { throw new Error(`Broken local link in ${file}: ${match[1]}`); });
    if (info.isDirectory()) target = join(target, 'index.html');
    await stat(target);
    if (url.hash && target.endsWith('.html')) {
      const destination = await readFile(target, 'utf8');
      assert.ok(destination.includes(`id="${url.hash.slice(1)}"`), `Missing anchor ${match[1]}`);
    }
    links++;
  }
}
const manifest = JSON.parse(await readFile(join(root, 'downloads/release.json'), 'utf8'));
for (const entry of manifest.downloads) {
  const data = await readFile(join(root, 'downloads', entry.filename));
  assert.equal(data.length, entry.bytes); assert.equal(createHash('sha256').update(data).digest('hex'), entry.sha256);
}
console.log(`Verified ${htmlFiles.length} prerendered pages, ${links} internal links/assets, and all download checksums.`);
