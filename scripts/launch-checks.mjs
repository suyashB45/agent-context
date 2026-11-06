import { createHash } from 'node:crypto';

class CheckError extends Error {
  constructor(message, status = 'fail') { super(message); this.status = status; }
}
const digest = (data, algorithm = 'sha256') => createHash(algorithm).update(data).digest('hex');
const requireThat = (condition, message) => { if (!condition) throw new CheckError(message); };
const routes = ['/', '/docs/', '/docs/quickstart/', '/docs/clients/', '/docs/compatibility/', '/docs/team/', '/docs/self-hosting/', '/docs/troubleshooting/', '/docs/contributing/'];

export async function checkLaunch({ site, repository, version, packageName, fetchImpl = fetch, installPackage }) {
  const checks = [], evidence = {};
  async function run(name, operation) {
    try { const details = await operation(); checks.push({ name, status: 'pass', details }); }
    catch (error) { checks.push({ name, status: error.status || 'blocked', details: error.message }); }
  }
  async function read(url, limit = 2 * 1024 * 1024, unavailable = 'fail') {
    let response;
    try { response = await fetchImpl(url, { headers: { 'User-Agent': 'Agent-Context-Launch-Check', Accept: '*/*' }, signal: AbortSignal.timeout(15000) }); }
    catch (error) { throw new CheckError(`Cannot reach ${new URL(url).host}: ${error.cause?.code || error.message}`, 'blocked'); }
    if (!response.ok) throw new CheckError(`${url}: HTTP ${response.status}`, response.status === 429 || response.status >= 500 ? 'blocked' : unavailable);
    requireThat(!Number.isFinite(Number(response.headers.get('content-length'))) || Number(response.headers.get('content-length')) <= limit, 'Response exceeds size limit.');
    const reader = response.body.getReader(); const chunks = []; let size = 0;
    try {
      while (true) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength; requireThat(size <= limit, 'Response exceeds size limit.'); chunks.push(value); }
    } finally { await reader.cancel().catch(() => {}); }
    return Buffer.concat(chunks);
  }
  async function json(url, unavailable) {
    const contents = await read(url, undefined, unavailable);
    try { return JSON.parse(contents.toString('utf8')); } catch { throw new CheckError(`${url}: expected JSON, received another response.`); }
  }
  const github = `https://api.github.com/repos/${repository}`;
  await Promise.all([
    run('remote-ci', async () => {
      const commit = await json(github + '/commits/main', 'blocked');
      requireThat(/^[a-f0-9]{40}$/.test(commit.sha || ''), 'GitHub did not return a main-branch commit.');
      evidence.commit = commit.sha;
      const result = await json(github + '/actions/workflows/ci.yml/runs?branch=main&event=push&per_page=100', 'blocked');
      const workflow = result.workflow_runs?.find((item) => item.head_sha === commit.sha);
      requireThat(workflow, `No push CI run found for current main ${commit.sha}.`);
      if (workflow.status !== 'completed') throw new CheckError(`CI is ${workflow.status}: ${workflow.html_url}`, 'blocked');
      requireThat(workflow.conclusion === 'success', `CI concluded ${workflow.conclusion}: ${workflow.html_url}`);
      const jobs = await json(github + `/actions/runs/${workflow.id}/jobs?per_page=100`, 'blocked');
      requireThat(jobs.jobs?.length >= 4 && jobs.jobs.every((job) => job.conclusion === 'success'), 'CI jobs are missing, skipped, cancelled, or failed.');
      for (const platform of ['ubuntu-latest', 'windows-latest', 'macos-latest', 'container']) requireThat(jobs.jobs.some((job) => job.name.includes(platform)), `Missing CI job: ${platform}`);
      evidence.ci_url = workflow.html_url;
      return { commit: commit.sha, url: workflow.html_url, jobs: jobs.jobs.map((job) => job.name) };
    }),
    run('live-website-and-downloads', async () => {
      for (const route of routes) {
        const html = (await read(site + route)).toString('utf8');
        requireThat(html.includes('Agent Context') && html.includes('id="root"'), `Expected product page missing at ${route}; check deployment protection and deployed commit.`);
      }
      const manifest = await json(site + '/downloads/release.json');
      requireThat(manifest.name === packageName && manifest.version === version, 'Live download manifest does not match this package/version.');
      const results = [];
      for (const kind of ['npm', 'source']) {
        const item = manifest.downloads?.find((file) => file.kind === kind);
        requireThat(item && /^[A-Za-z0-9._-]+$/.test(item.filename || ''), `Missing or invalid ${kind} download filename.`);
        const data = await read(site + '/downloads/' + item.filename, 25 * 1024 * 1024);
        requireThat(data.length === item.bytes && digest(data) === item.sha256, `${kind} download size or SHA-256 does not match the live manifest.`);
        results.push({ kind, bytes: data.length, sha256: digest(data) });
        if (kind === 'npm') evidence.websitePackage = data;
      }
      evidence.manifest = manifest;
      return { site, pages: routes.length, downloads: results };
    }),
    run('npm-publication', async () => {
      const metadata = await json(`https://registry.npmjs.org/${encodeURIComponent(packageName)}/${encodeURIComponent(version)}`);
      requireThat(metadata.name === packageName && metadata.version === version, 'npm returned a different package/version.');
      const expectedRepository = 'github.com/' + repository.toLowerCase();
      const repoUrl = typeof metadata.repository === 'string' ? metadata.repository : metadata.repository?.url;
      const actualRepository = String(repoUrl || '').toLowerCase().replace(/^git\+/, '').replace(/^git@github\.com:/, 'https://github.com/').replace(/\.git\/?$/, '').replace(/\/$/, '');
      requireThat(actualRepository === 'https://' + expectedRepository || actualRepository === 'git://' + expectedRepository, 'Published npm repository does not match the intended GitHub repository.');
      const tarball = new URL(metadata.dist?.tarball);
      requireThat(tarball.protocol === 'https:' && tarball.hostname === 'registry.npmjs.org', 'Unexpected npm tarball destination.');
      const data = await read(tarball.href, 25 * 1024 * 1024);
      const integrity = createHash('sha512').update(data).digest('base64');
      requireThat(String(metadata.dist?.integrity || '').split(/\s+/).includes('sha512-' + integrity), 'Registry tarball does not match its SHA-512 integrity.');
      evidence.registrySha256 = digest(data);
      return { name: metadata.name, version: metadata.version, repository: repoUrl, sha256: evidence.registrySha256 };
    }),
  ]);
  await run('release-consistency', async () => {
    if (!evidence.manifest || !evidence.commit || !evidence.registrySha256) throw new CheckError('Remote CI, website, or registry evidence is unavailable.', 'blocked');
    requireThat(evidence.manifest.source_commit === evidence.commit, 'Website was not built from current main, or lacks source_commit metadata. Redeploy the reviewed commit.');
    requireThat(evidence.manifest.npm_published === true, 'Live website still marks the npm release as pending. Verify publication, update release status, and redeploy.');
    requireThat(digest(evidence.websitePackage) === evidence.registrySha256, 'Website npm download differs from the registry tarball for this version.');
    return 'Website commit matches current main; website and npm serve identical package bytes.';
  });
  await run('fresh-download-install', async () => {
    if (!evidence.manifest || !evidence.websitePackage) throw new CheckError('A verified website package download is unavailable.', 'blocked');
    if (!installPackage) throw new CheckError('No package installer supplied.', 'blocked');
    return await installPackage(evidence.websitePackage);
  });
  return { checked_at: new Date().toISOString(), site, repository, version, launch_ready: checks.every((check) => check.status === 'pass'), checks };
}
