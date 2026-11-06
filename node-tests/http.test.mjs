import test from 'node:test';
import assert from 'node:assert/strict';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { createApplication } from '../src/http.mjs';
import { fixture, request, TOKEN } from './helpers.mjs';

test('public React shell and assets contain no credentials; data requires bearer auth', async (t) => {
  const { app } = fixture(t, true);
  for (const path of ['/dashboard', '/assets/dashboard.js', '/assets/dashboard.css', '/healthz']) {
    const result = await app.fetch(new Request('http://localhost:8765' + path));
    assert.equal(result.status, 200, path); assert.ok(!String(await result.text()).includes(TOKEN));
    assert.ok(result.headers.get('content-security-policy').includes("frame-ancestors 'none'"));
  }
  const root = await app.fetch(request('/')); assert.equal(root.status, 307); assert.equal(root.headers.get('location'), '/dashboard');
  for (const path of ['/api/connection', '/api/overview', '/api/projects', '/api/agents', '/api/activity', '/readyz']) {
    const result = await app.fetch(request(path, { headers: { Authorization: 'Bearer wrong' } }));
    assert.equal(result.status, 401); assert.ok(result.headers.get('www-authenticate').startsWith('Bearer'));
    assert.ok(result.headers.get('x-request-id')); assert.equal(result.headers.get('cache-control'), 'no-store');
  }
});
test('untrusted hosts, origins, and repeated bearer values are rejected', async (t) => {
  const { app } = fixture(t, true);
  assert.equal((await app.fetch(request('/healthz', { headers: { Host: 'evil.example' } }))).status, 421);
  assert.equal((await app.fetch(request('/healthz', { headers: { Origin: 'https://evil.example' } }))).status, 403);
  assert.equal((await app.fetch(request('/api/overview', { headers: { Authorization: `Bearer ${TOKEN}, Bearer ${TOKEN}` } }))).status, 401);
});
test('dashboard writes, retry IDs, searching and statistics share the MCP database', async (t) => {
  const { app } = fixture(t, true);
  const post = async (path, data) => {
    const result = await app.fetch(request(path, { method: 'POST', headers: { Origin: 'http://localhost:8765' }, body: JSON.stringify(data) }));
    assert.equal(result.status, 200, await result.clone().text()); return result.json();
  };
  await post('/api/projects', { project_id: 'web', name: 'Web Project' });
  const payload = { title: 'Build API', request_id: 'task-retry' };
  assert.equal((await post('/api/projects/web/tasks', payload)).id, (await post('/api/projects/web/tasks', payload)).id);
  await post('/api/projects/web/updates', { kind: 'handoff', summary: '<script>alert(1)</script>', details: 'Next: tests' });
  const context = await (await app.fetch(request('/api/projects/web'))).json(); assert.equal(context.handoffs[0].details, 'Next: tests');
  assert.equal((await (await app.fetch(request('/api/projects/web/search?q=tests'))).json()).events.length, 1);
  assert.equal((await (await app.fetch(request('/api/activity?kind=handoff'))).json()).events[0].project_name, 'Web Project');
  assert.equal((await (await app.fetch(request('/api/agents'))).json()).agents[0].agent_id, 'dashboard');
  assert.equal((await (await app.fetch(request('/api/overview'))).json()).open_tasks, 1);
  assert.equal((await app.fetch(request('/readyz'))).status, 200);
});
test('invalid JSON, unknown fields, pagination and oversized bodies fail safely', async (t) => {
  const { app } = fixture(t, true, { maxBodyBytes: 1024 });
  for (const data of ['{', '[]', JSON.stringify({ project_id: 'x', name: 'X', extra: true })]) assert.equal((await app.fetch(request('/api/projects', { method: 'POST', body: data }))).status, 400);
  for (const path of ['/api/projects?offset=bad', '/api/activity?before=-1', '/api/agents?limit=101']) assert.equal((await app.fetch(request(path))).status, 400);
  assert.equal((await app.fetch(request('/api/projects', { method: 'POST', body: 'x'.repeat(2048) }))).status, 413);
  assert.equal((await app.fetch(request('/api/projects', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{}' }))).status, 415);
  const stream = new ReadableStream({ start(controller) { for (let i = 0; i < 5; i++) controller.enqueue(new Uint8Array(512)); controller.close(); } });
  const streamed = new Request('http://localhost:8765/api/projects', { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: stream, duplex: 'half' });
  assert.equal((await app.fetch(streamed)).status, 413);
});
test('per-instance request limits return retry headers', async (t) => {
  const { app } = fixture(t, true, { requestsPerMinute: 1 });
  assert.equal((await app.fetch(request('/api/overview'))).status, 200);
  const result = await app.fetch(request('/api/overview')); assert.equal(result.status, 429); assert.equal(result.headers.get('retry-after'), '60');
});
test('protected concurrent request limit rejects excess requests', async (t) => {
  const { app } = fixture(t, true, { maxInflight: 1 });
  let release;
  const stream = new ReadableStream({ start(controller) { release = () => { controller.enqueue(new TextEncoder().encode('{}')); controller.close(); }; } });
  const pending = app.fetch(new Request('http://localhost:8765/api/projects', { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: stream, duplex: 'half' }));
  const result = await app.fetch(request('/api/overview')); assert.equal(result.status, 503);
  release(); await pending;
});
test('real SDK HTTP clients list tools and share handoffs across app restart', { timeout: 10000 }, async (t) => {
  const { app, database } = fixture(t, true);
  const connect = async (application) => {
    const client = new Client({ name: 'test-agent', version: '1' });
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:8765/mcp'), {
      requestInit: { headers: { Authorization: `Bearer ${TOKEN}` } },
      fetch: (url, init) => application.fetch(new Request(url, init)),
    });
    await client.connect(transport); return client;
  };
  const first = await connect(app);
  try {
    assert.equal((await first.listTools()).tools.length, 10);
    assert.ok(!(await first.callTool({ name: 'create_project', arguments: { project_id: 'shared', name: 'Shared' } })).isError);
    assert.ok(!(await first.callTool({ name: 'record_update', arguments: { project_id: 'shared', agent_id: 'agent-a', kind: 'handoff', summary: 'Ready for agent B' } })).isError);
  } finally { await first.close(); }
  const restarted = createApplication({ database, token: TOKEN, log: false });
  let second;
  try {
    second = await connect(restarted);
    const result = await second.callTool({ name: 'get_context', arguments: { project_id: 'shared' } });
    assert.equal(result.structuredContent.handoffs[0].agent_id, 'agent-a');
    const resource = await second.readResource({ uri: 'context://projects/shared' }); assert.ok(resource.contents[0].text.includes('Ready for agent B'));
    const invalid = await second.callTool({ name: 'get_context', arguments: { project_id: 'missing' } }); assert.equal(invalid.isError, true);
  } finally { await second?.close(); await restarted.close(); }
});

test('connection setup exposes the actual shared database only with authentication', async (t) => {
  const { app } = fixture(t, true);
  const response = await app.fetch(request('/api/connection'));
  assert.equal(response.status, 200);
  const connection = await response.json();
  assert.equal(connection.database, app.config.database);
  assert.equal(JSON.stringify(connection).includes(TOKEN), false);
});
