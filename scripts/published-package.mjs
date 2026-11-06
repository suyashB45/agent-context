import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { releaseBasename } from '../src/release-files.mjs';

export function matchesPublishedPackage(data, release) {
  return 'sha512-' + createHash('sha512').update(data).digest('base64') === release.integrity
    && createHash('sha1').update(data).digest('hex') === release.shasum;
}

export async function ensurePublishedPackage({ root, pkg, release, fetchImpl = fetch }) {
  if (release.name !== pkg.name || release.version !== pkg.version) throw new Error('Published package record does not match this release. Update it when publishing a new version.');
  const url = new URL(release.tarball);
  if (url.protocol !== 'https:' || url.hostname !== 'registry.npmjs.org' || url.username || url.password) throw new Error('Published package URL must use the npm registry.');
  const filename = releaseBasename(pkg.name, pkg.version) + '.tgz';
  const destination = join(root, 'dist/npm', filename);
  let data;
  for (const path of [destination, join(root, 'dist/published', filename)]) {
    const candidate = await readFile(path).catch((error) => { if (error.code !== 'ENOENT') throw error; });
    if (candidate && matchesPublishedPackage(candidate, release)) { data = candidate; break; }
  }
  if (!data) {
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Cannot retrieve published npm package: HTTP ${response.status}`);
    const reader = response.body.getReader(), chunks = []; let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        size += value.byteLength; if (size > 25 * 1024 * 1024) throw new Error('Published npm package exceeds download limit.');
        chunks.push(value);
      }
    } finally { await reader.cancel().catch(() => {}); }
    data = Buffer.concat(chunks);
    if (!matchesPublishedPackage(data, release)) throw new Error('Published npm package integrity mismatch.');
  }
  await mkdir(join(root, 'dist/npm'), { recursive: true });
  await writeFile(destination, data);
  return destination;
}
