import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { checkLaunch } from '../scripts/launch-checks.mjs';

const hash = (data, kind = 'sha256', encoding = 'hex') => createHash(kind).update(data).digest(encoding);
const commit = 'a'.repeat(40), site = 'https://product.example';
function fixture(options = {}) {
  const npm = Buffer.from('reviewed npm archive'), source = Buffer.from('source archive');
  const registry = options.registryBytes || npm;
  let installs = 0;
  const params = { site, repository: 'owner/project', packageName: '@suyashb/agent-context', version: '0.4.0',
    installPackage: async (bytes) => { installs++; assert.deepEqual(bytes, npm); return 'temporary install checked'; },
    fetchImpl: async (input) => {
      if (options.networkError) throw new Error('offline', { cause: { code: 'EAI_AGAIN' } });
      const url = new URL(input);
      if (url.hostname === 'api.github.com') {
        if (url.pathname.endsWith('/commits/main')) return Response.json({ sha: commit });
        if (url.pathname.endsWith('/ci.yml/runs')) return Response.json({ workflow_runs: [{ id: 7, head_sha: commit, status: options.running ? 'in_progress' : 'completed', conclusion: options.ciFailure ? 'failure' : 'success', html_url: 'https://github.com/owner/project/actions/runs/7' }] });
        return Response.json({ jobs: ['package (ubuntu-latest, 24)', 'package (windows-latest, 24)', 'package (macos-latest, 24)', 'container'].map((name) => ({ name, conclusion: options.skippedJob && name === 'container' ? 'skipped' : 'success' })) });
      }
      if (url.hostname === 'registry.npmjs.org') {
        if (url.pathname.endsWith('.tgz')) return new Response(registry);
        if (options.unpublished) return new Response('not found', { status: 404 });
        return Response.json({ name: params.packageName, version: params.version, repository: { url: options.wrongRepository ? 'https://github.com/other/project.git' : 'git+https://github.com/owner/project.git' }, dist: { tarball: 'https://registry.npmjs.org/archive.tgz', integrity: 'sha512-' + hash(registry, 'sha512', 'base64') } });
      }
      if (url.pathname === '/downloads/release.json') return Response.json({ name: params.packageName, version: params.version, source_commit: options.staleSite ? 'b'.repeat(40) : commit, npm_published: !options.pending, downloads: [{ kind: 'npm', filename: 'package.tgz', bytes: npm.length, sha256: options.corruptDownload ? '0'.repeat(64) : hash(npm) }, { kind: 'source', filename: 'source.tar.gz', bytes: source.length, sha256: hash(source) }] });
      if (url.pathname.endsWith('/package.tgz')) return new Response(npm);
      if (url.pathname.endsWith('/source.tar.gz')) return new Response(source);
      return new Response('<html><title>Agent Context</title><div id="root">Agent Context</div></html>');
    },
  };
  return { params, installs: () => installs };
}
const check = (report, name) => report.checks.find((item) => item.name === name);

test('launch readiness requires current CI, matching live/registry artifacts, and a fresh install', async () => {
  const f = fixture(), report = await checkLaunch(f.params);
  assert.equal(report.launch_ready, true);
  assert.equal(report.checks.length, 5);
  assert.ok(report.checks.every((item) => item.status === 'pass'));
  assert.equal(f.installs(), 1);
});
test('missing connectivity is blocked evidence, not proof of an unpublished package', async () => {
  const f = fixture({ networkError: true }), report = await checkLaunch(f.params);
  assert.equal(report.launch_ready, false);
  assert.ok(report.checks.every((item) => item.status === 'blocked'));
  assert.equal(f.installs(), 0);
});
test('failed and skipped CI jobs cannot pass the launch gate', async () => {
  for (const options of [{ ciFailure: true }, { skippedJob: true }]) {
    const report = await checkLaunch(fixture(options).params);
    assert.equal(check(report, 'remote-ci').status, 'fail');
    assert.equal(report.launch_ready, false);
  }
  const report = await checkLaunch(fixture({ running: true }).params);
  assert.equal(check(report, 'remote-ci').status, 'blocked');
});
test('corrupt live downloads are rejected before installation', async () => {
  const f = fixture({ corruptDownload: true }), report = await checkLaunch(f.params);
  assert.equal(check(report, 'live-website-and-downloads').status, 'fail');
  assert.equal(f.installs(), 0);
});
test('unpublished versions and a different npm repository fail publication checks', async () => {
  for (const options of [{ unpublished: true }, { wrongRepository: true }]) {
    const report = await checkLaunch(fixture(options).params);
    assert.equal(check(report, 'npm-publication').status, 'fail');
    assert.equal(report.launch_ready, false);
  }
});
test('stale website commits, pending status, and different registry bytes fail consistency', async () => {
  for (const options of [{ staleSite: true }, { pending: true }, { registryBytes: Buffer.from('different npm archive') }]) {
    const report = await checkLaunch(fixture(options).params);
    assert.equal(check(report, 'release-consistency').status, 'fail');
    assert.equal(report.launch_ready, false);
  }
});
