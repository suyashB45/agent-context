import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { createApi } from '../web/src/api.js';

test('React renders the login screen and escapes hostile recorded content', async () => {
  await build({ entryPoints: ['web/src/App.jsx'], bundle: true, platform: 'node', format: 'esm', outfile: 'build/tests/react.mjs', external: ['react'], jsx: 'automatic' });
  const { App, EventList } = await import('../build/tests/react.mjs');
  const login = renderToStaticMarkup(createElement(App));
  assert.ok(login.includes('Instance access token'));
  assert.ok(login.includes('Open workspace'));
  const hostile = '<script>alert("saved data")</script>';
  const events = renderToStaticMarkup(createElement(EventList, { items: [{ id: 1, agent_id: 'agent', project_id: 'demo', kind: 'handoff', summary: hostile, details: hostile, files: [], created_at: new Date().toISOString() }] }));
  assert.ok(!events.includes('<script>'));
  assert.ok(events.includes('&lt;script&gt;'));
});
test('React API client sends bearer headers without credentials in URLs or cookies', async (t) => {
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original; });
  let observed;
  globalThis.fetch = async (url, options) => { observed = { url, options }; return Response.json({ projects: [] }); };
  const token = 'memory-token-' + 'x'.repeat(48);
  await createApi(token)('/api/projects');
  assert.equal(observed.url, '/api/projects');
  assert.equal(observed.options.headers.Authorization, `Bearer ${token}`);
  assert.equal(observed.options.credentials, 'omit');
  assert.equal(observed.options.cache, 'no-store');
});
test('React API client disconnects on revoked credentials', async (t) => {
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original; });
  let disconnected = false;
  globalThis.fetch = async () => Response.json({ error: 'Bearer token required' }, { status: 401 });
  await assert.rejects(createApi('old-token', () => { disconnected = true; })('/api/projects'), /Bearer token required/);
  assert.equal(disconnected, true);
});
