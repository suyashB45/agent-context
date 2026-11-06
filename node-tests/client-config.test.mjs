import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { clientConfiguration, CLIENT_PROFILES } from '../src/client-config.mjs';
import { main } from '../src/cli.mjs';

test('client configurations preserve space-containing paths as a single argument and select the right wrapper', () => {
  const database = 'C:\\Users\\My Name\\context.sqlite3';
  for (const { id } of CLIENT_PROFILES) {
    const config = clientConfiguration({ client: id, database });
    const server = (id === 'vscode' ? config.servers : config.mcpServers)['agent-context'];
    assert.deepEqual(server.args, ['stdio', '--db', database]);
    assert.equal(server.command, 'agent-context');
    if (id === 'vscode') assert.equal(server.type, 'stdio');
  }
  assert.throws(() => clientConfiguration({ client: 'unknown', database }), /Unknown client/);
  assert.throws(() => clientConfiguration({ database: '' }), /database path/);
});

test('config CLI emits parseable settings without creating data or tokens', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'agent-config-')); t.after(() => rmSync(dir, { recursive: true, force: true }));
  const database = join(dir, 'not-created', 'context.sqlite3');
  const original = console.log, output = [];
  console.log = (text) => output.push(text); t.after(() => { console.log = original; });
  await main(['config', '--client', 'vscode', '--db', database]);
  const config = JSON.parse(output.pop());
  assert.deepEqual(config.servers['agent-context'].args, ['stdio', '--db', database]);
  assert.equal(existsSync(join(dir, 'not-created')), false);
  await assert.rejects(main(['config', '--client', 'unknown', '--db', database]), /Unknown client/);
  await assert.rejects(main(['config', '--transport', 'streamable-http', '--db', database]), /stdio configuration/);
});
