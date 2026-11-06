import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { ensurePublishedPackage } from '../scripts/published-package.mjs';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'published-package-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const pkg = { name: '@suyashb/agent-context', version: '0.4.0' }, bytes = Buffer.from('immutable published archive');
  const release = { ...pkg, tarball: 'https://registry.npmjs.org/@suyashb/agent-context/-/agent-context-0.4.0.tgz', integrity: 'sha512-' + createHash('sha512').update(bytes).digest('base64'), shasum: createHash('sha1').update(bytes).digest('hex') };
  return { root, pkg, release, bytes, file: join(root, 'dist/npm/suyashb-agent-context-0.4.0.tgz') };
}
test('website keeps the published bytes when a local rebuild differs', async (t) => {
  const f = await fixture(t);
  await mkdir(join(f.root, 'dist/npm'), { recursive: true });
  await mkdir(join(f.root, 'dist/published'), { recursive: true });
  await writeFile(f.file, 'later local rebuild');
  await writeFile(join(f.root, 'dist/published/suyashb-agent-context-0.4.0.tgz'), f.bytes);
  await ensurePublishedPackage({ ...f, fetchImpl: () => { throw new Error('No network should be needed'); } });
  assert.deepEqual(await readFile(f.file), f.bytes);
});
test('clean website builds download and verify the exact registry artifact', async (t) => {
  const f = await fixture(t); let calls = 0;
  await ensurePublishedPackage({ ...f, fetchImpl: async (url) => { calls++; assert.equal(String(url), f.release.tarball); return new Response(f.bytes); } });
  assert.equal(calls, 1); assert.deepEqual(await readFile(f.file), f.bytes);
});
test('corrupt registry responses cannot replace a local archive', async (t) => {
  const f = await fixture(t); await mkdir(join(f.root, 'dist/npm'), { recursive: true }); await writeFile(f.file, 'local rebuild');
  await assert.rejects(ensurePublishedPackage({ ...f, fetchImpl: async () => new Response('corrupt') }), /integrity mismatch/);
  assert.equal(await readFile(f.file, 'utf8'), 'local rebuild');
});
test('published release record must match the version being built', async (t) => {
  const f = await fixture(t);
  await assert.rejects(ensurePublishedPackage({ ...f, release: { ...f.release, version: '0.5.0' } }), /does not match/);
});
