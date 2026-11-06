import { parseArgs } from 'node:util';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkLaunch } from './launch-checks.mjs';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const { values } = parseArgs({ options: { site: { type: 'string' }, output: { type: 'string' } } });
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const config = JSON.parse(await readFile('site/config.json', 'utf8'));
const site = new URL(values.site || config.origin || 'https://agentcontext.suyashb.me');
if (site.protocol !== 'https:' || site.pathname !== '/' || site.username || site.password || site.search || site.hash) throw new Error('--site must be an HTTPS origin without a path or credentials.');
const repository = new URL(config.repositoryUrl).pathname.replace(/^\//, '').replace(/\/$/, '');
const report = await checkLaunch({ site: site.origin, repository, version: pkg.version, packageName: pkg.name,
  installPackage: async (data) => {
    const temporary = await mkdtemp(join(tmpdir(), 'agent-context-live-install-'));
    try {
      const tarball = join(temporary, 'package.tgz'); await writeFile(tarball, data);
      const result = spawnSync(process.execPath, [resolve('scripts/verify-package.mjs'), tarball], { encoding: 'utf8', timeout: 60000 });
      if (result.error || result.status !== 0 || !result.stdout.includes('Clean offline global npm install')) {
        const failure = new Error('Downloaded package installation could not be verified: ' + (result.error?.message || result.stderr || 'no successful verification output'));
        failure.status = result.error || result.status === null || result.status === 0 ? 'blocked' : 'fail';
        throw failure;
      }
      return 'Installed the live download in a temporary prefix; command shim, bundled assets, version, and token command passed.';
    } finally { await rm(temporary, { recursive: true, force: true }); }
  },
});
const output = resolve(values.output || 'dist/release/launch-verification.json');
await mkdir(resolve(output, '..'), { recursive: true });
await writeFile(output, JSON.stringify(report, null, 2) + '\n');
for (const check of report.checks) console.log(`${check.status.toUpperCase()} ${check.name}: ${typeof check.details === 'string' ? check.details : JSON.stringify(check.details)}`);
console.log('Launch ready: ' + report.launch_ready + '\nReport: ' + output);
process.exitCode = report.launch_ready ? 0 : report.checks.some((check) => check.status === 'fail') ? 1 : 2;
