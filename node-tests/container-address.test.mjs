import test from 'node:test';
import assert from 'node:assert/strict';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { containerAddress } from '../scripts/container-address.mjs';
import { fixture, TOKEN } from './helpers.mjs';

test('container published-port requests pass the configured allowlists without overriding Host', async (t) => {
  const address = containerAddress(32123);
  const previous = fixture(t, true);
  assert.equal((await previous.app.fetch(new Request(address.origin + '/healthz'))).status, 421);
  const args = address.serverArguments;
  const { app } = fixture(t, true, {
    allowedHosts: [args[args.indexOf('--allowed-host') + 1]],
    allowedOrigins: [args[args.indexOf('--allowed-origin') + 1]],
  });
  assert.equal((await app.fetch(new Request(address.origin + '/healthz'))).status, 200);
  assert.equal((await app.fetch(new Request(address.origin + '/mcp', { method: 'POST' }))).status, 401);
  const client = new Client({ name: 'container-published-port-test', version: '1' });
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL(address.origin + '/mcp'), {
      requestInit: { headers: { Authorization: `Bearer ${TOKEN}` } },
      fetch: (url, init) => app.fetch(new Request(url, init)),
    }));
    assert.equal((await client.listTools()).tools.length, 10);
  } finally { await client.close(); }
  for (const port of [0, 65536, '32123', NaN]) assert.throws(() => containerAddress(port), /Invalid/);
});
