import { releaseBasename } from '../src/release-files.mjs';
import { mkdtempSync, existsSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const tarball = resolve(process.argv[2] || `dist/npm/${releaseBasename(pkg.name, pkg.version)}.tgz`);
const prefix = mkdtempSync(join(tmpdir(), 'agent-context-package-'));
try {
  const npm = process.env.npm_execpath;
  if (!npm) throw new Error('Run this through npm run test:package so the npm CLI path is available.');
  const installed = spawnSync(process.execPath, [npm, 'install', '--offline=false', '--global', '--prefix', prefix,
    '--cache', join(prefix, 'cache'), '--no-audit', '--no-fund', tarball], { encoding: 'utf8', timeout: 30000 });
  assert.equal(installed.status, 0, installed.stderr);
  const root = join(prefix, ...(process.platform === 'win32' ? [] : ['lib']), 'node_modules', ...pkg.name.split('/'));
  const entry = join(root, 'bin', 'agent-context.mjs');
  assert.ok(existsSync(entry), 'npm must actually create the installed package');
  assert.ok(existsSync(join(prefix, ...(process.platform === 'win32' ? [] : ['bin']), process.platform === 'win32' ? 'agent-context.cmd' : 'agent-context')), 'Global npm command shim is missing');
  assert.ok(existsSync(join(root, 'build', 'npm', 'public', 'dashboard.js')));
  const version = spawnSync(process.execPath, [entry, '--version'], { cwd: tmpdir(), encoding: 'utf8', timeout: 5000 });
  assert.equal(version.status, 0); assert.equal(version.stdout.trim(), '0.4.0');
  const token = spawnSync(process.execPath, [entry, 'token', '--db', join(prefix, 'data', 'db.sqlite3')], { cwd: tmpdir(), encoding: 'utf8', timeout: 5000 });
  assert.equal(token.status, 0); assert.match(token.stdout.trim(), /^[A-Za-z0-9_-]{64}$/);
  console.log('Clean global npm install, command shim, packaged assets, version, and token command: OK');
} finally { rmSync(prefix, { recursive: true, force: true }); }
