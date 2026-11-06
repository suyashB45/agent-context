import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const skip = process.env.HANDOFFRA_SKIP_SUBPROCESS_TESTS === '1' ? 'Subprocess descriptors explicitly disabled in this restricted environment' : false;
test('installed CLI launcher reports version and rejects unknown options', { skip }, () => {
  const run = (...args) => spawnSync(process.execPath, [resolve('bin/handoffra.mjs'), ...args], { encoding: 'utf8', timeout: 5000 });
  const version = run('--version'); assert.equal(version.status, 0); assert.equal(version.stdout.trim(), '0.4.0');
  const invalid = run('--unknown-option'); assert.equal(invalid.status, 1); assert.ok(invalid.stderr.includes('Unknown option'));
});
test('real SDK stdio subprocesses share persisted project context', { skip, timeout: 10000 }, async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'ac-cli-')); t.after(() => rmSync(directory, { recursive: true, force: true }));
  const connect = async () => {
    const transport = new StdioClientTransport({ command: process.execPath, args: [resolve('bin/handoffra.mjs'), 'stdio', '--db', join(directory, 'db.sqlite3')], stderr: 'pipe' });
    const client = new Client({ name: 'test-agent', version: '1' });
    try { await client.connect(transport); return client; } catch (error) { await transport.close(); throw error; }
  };
  const first = await connect();
  try {
    assert.equal((await first.listTools()).tools.length, 10);
    assert.ok(!(await first.callTool({ name: 'create_project', arguments: { project_id: 'demo', name: 'Demo' } })).isError);
    assert.ok(!(await first.callTool({ name: 'record_update', arguments: { project_id: 'demo', agent_id: 'agent-a', kind: 'handoff', summary: 'Implemented login' } })).isError);
  } finally { await first.close(); }
  const second = await connect();
  try { assert.equal((await second.callTool({ name: 'get_context', arguments: { project_id: 'demo' } })).structuredContent.handoffs[0].summary, 'Implemented login'); }
  finally { await second.close(); }
});
