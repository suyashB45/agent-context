import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { settings, localToken, readToken, keygen, defaultDatabase, environmentValue } from '../src/config.mjs';
import { main } from '../src/cli.mjs';

test('HTTP fails closed and development mode refuses public binding', () => {
  assert.throws(() => settings({}), /requires a token/);
  assert.equal(settings({ allowUnauthenticatedLocal: true }).host, '127.0.0.1');
  assert.throws(() => settings({ allowUnauthenticatedLocal: true, host: '0.0.0.0' }), /loopback/);
});
test('credentials have explicit sources and strong token validation', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'ac-config-')); t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, 'token'); writeFileSync(path, 'x'.repeat(64) + '\n');
  assert.equal(readToken(path, {}), 'x'.repeat(64));
  assert.throws(() => readToken(path, { AGENT_CONTEXT_TOKEN: 'y'.repeat(64) }), /not both/);
  for (const token of ['', 'short', 'x'.repeat(513), 'é'.repeat(64), 'has spaces '.repeat(5)]) assert.throws(() => readToken(undefined, { AGENT_CONTEXT_TOKEN: token }), /Invalid bearer/);
  assert.match(keygen(), /^[A-Za-z0-9_-]{64}$/);
});
test('first-run dashboard tokens persist privately outside the installation', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'ac-key-')); t.after(() => rmSync(dir, { recursive: true, force: true }));
  const database = join(dir, 'data', 'context.sqlite3');
  const first = localToken(database, undefined, {});
  assert.equal(localToken(database, undefined, {}), first);
  const path = join(dir, 'data', 'access-token');
  assert.equal(readFileSync(path, 'utf8').trim(), first);
  if (process.platform !== 'win32') assert.equal(statSync(path).mode & 0o777, 0o600);
  assert.ok(defaultDatabase({ XDG_DATA_HOME: dir }, 'linux').startsWith(dir));
});
test('host/origin wildcards, invalid URLs, and unsafe request limits are rejected', () => {
  const base = { token: 'x'.repeat(64) };
  for (const fields of [{ port: 0 }, { maxInflight: 0 }, { requestsPerMinute: true }, { maxBodyBytes: 1 },
    { allowedHosts: ['*'] }, { allowedHosts: ['https://example.com'] },
    { allowedOrigins: ['https://example.com/path'] }, { allowedOrigins: ['https://user:pass@example.com'] }]) assert.throws(() => settings({ ...base, ...fields }));
});

test('CLI help, version, validation, and explicit actions work without a subprocess', async (t) => {
  const original = console.log, transport = process.env.AGENT_CONTEXT_TRANSPORT;
  const output = [];
  console.log = (...args) => output.push(args.join(' '));
  t.after(() => { console.log = original; if (transport === undefined) delete process.env.AGENT_CONTEXT_TRANSPORT; else process.env.AGENT_CONTEXT_TRANSPORT = transport; });
  await main(['--version']); assert.equal(output.pop(), '0.4.0');
  await main(['--help']); assert.ok(output.pop().includes('Start the React dashboard'));
  await assert.rejects(main(['--unknown-option']), /Unknown option/);
  await assert.rejects(main(['serve', 'backup']), /one action/);
  process.env.AGENT_CONTEXT_TRANSPORT = 'stdio';
  await main(['keygen']); assert.match(output.pop(), /^[A-Za-z0-9_-]{64}$/);
});

test('rebranding reuses the existing default database and credentials', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'agent-context-mcp-legacy-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const legacy = join(dir, 'handoffra', 'context.sqlite3');
  mkdirSync(join(dir, 'handoffra')); writeFileSync(legacy, 'existing database');
  assert.equal(defaultDatabase({ XDG_DATA_HOME: dir }, 'linux'), legacy);
  const token = 'x'.repeat(64);
  assert.equal(readToken(undefined, { HANDOFFRA_TOKEN: token }), token);
  assert.equal(environmentValue('DB', { HANDOFFRA_DB: legacy }), legacy);
  assert.throws(() => readToken(undefined, { HANDOFFRA_TOKEN: token, AGENT_CONTEXT_TOKEN: 'y'.repeat(64) }), /Conflicting/);
  assert.throws(() => readToken(undefined, { HANDOFFRA_TOKEN: token, AGENT_CONTEXT_TOKEN_FILE: 'token' }), /not both/);
  mkdirSync(join(dir, 'agent-context-mcp')); const current = join(dir, 'agent-context-mcp', 'context.sqlite3');
  writeFileSync(current, 'new database');
  assert.equal(defaultDatabase({ XDG_DATA_HOME: dir }, 'linux'), current);
});
