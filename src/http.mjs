import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { settings } from './config.mjs';
import { Store, ContextError } from './store.mjs';
import { mcpHandler, operations } from './mcp.mjs';

const CSP = "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'";
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });
class HTTPError extends Error { constructor(status, message) { super(message); this.status = status; } }
class Bucket {
  constructor(capacity) { this.capacity = capacity; this.tokens = capacity; this.updated = performance.now(); }
  take() {
    const current = performance.now();
    this.tokens = Math.min(this.capacity, this.tokens + (current - this.updated) * this.capacity / 60000); this.updated = current;
    if (this.tokens < 1) return false;
    this.tokens -= 1; return true;
  }
}
async function body(request, maxBytes) {
  if (Number(request.headers.get('content-length')) > maxBytes) throw new HTTPError(413, 'Request body too large');
  if (!request.body) return {};
  const reader = request.body.getReader(), chunks = []; let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      length += value.length;
      if (length > maxBytes) { await reader.cancel(); throw new HTTPError(413, 'Request body too large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new HTTPError(400, 'Invalid JSON body'); }
}
const number = (params, name, fallback) => {
  if (!params.has(name)) return fallback;
  const raw = params.get(name);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw))) throw new HTTPError(400, 'Invalid pagination value');
  return Number(raw);
};

export function createApplication(input, options = {}) {
  const config = settings(input);
  const store = options.store || new Store(config.database);
  const mcp = mcpHandler(store, config.maxBodyBytes);
  const rate = new Bucket(config.requestsPerMinute), failed = new Bucket(60);
  const secret = config.token === undefined ? null : createHash('sha256').update(config.token).digest();
  const publicDir = options.publicDir || fileURLToPath(new URL('./public/', import.meta.url));
  const assets = new Map([
    ['/dashboard', ['index.html', 'text/html; charset=utf-8']],
    ['/assets/dashboard.js', ['dashboard.js', 'application/javascript; charset=utf-8']],
    ['/assets/dashboard.css', ['dashboard.css', 'text/css; charset=utf-8']],
  ]);
  let inflight = 0;

  function authenticated(request) {
    if (secret === null) return true;
    const header = request.headers.get('authorization') || '';
    const match = /^Bearer ([A-Za-z0-9._~+/=-]{32,512})$/i.exec(header);
    return Boolean(match && timingSafeEqual(createHash('sha256').update(match[1]).digest(), secret));
  }
  async function api(request, url) {
    const path = url.pathname, params = url.searchParams;
    if (request.method === 'GET') {
      if (path === '/readyz') return json(store.check());
      if (path === '/api/connection') return json({ database: config.database });
      if (path === '/api/overview') return json(store.overview());
      if (path === '/api/projects') return json(store.listProjects({ limit: number(params, 'limit', 50), offset: number(params, 'offset', 0) }));
      if (path === '/api/agents') return json(store.agents({ limit: number(params, 'limit', 50), offset: number(params, 'offset', 0) }));
      if (path === '/api/activity') return json(store.activity({ project_id: params.get('project') || null, kind: params.get('kind') || null, before_event_id: number(params, 'before', null) }));
      const match = /^\/api\/projects\/([^/]+)(?:\/(tasks|search))?$/.exec(path);
      if (match) {
        const project_id = decodeURIComponent(match[1]);
        if (match[2] === 'tasks') return json(store.listTasks({ project_id, status: params.get('status') || 'all', offset: number(params, 'offset', 0), limit: number(params, 'limit', 30) }));
        if (match[2] === 'search') return json(store.searchContext({ project_id, query: params.get('q') || '', before_event_id: number(params, 'before', null) }));
        return json(store.getContext({ project_id }));
      }
    }
    if (request.method === 'POST') {
      if ((request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase() !== 'application/json') throw new HTTPError(415, 'Content-Type must be application/json');
      const data = await body(request, config.maxBodyBytes);
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new HTTPError(400, 'Expected an object');
      if (path === '/api/projects') return json(store.createProject(operations.create_project.schema.parse(data)));
      const match = /^\/api\/projects\/([^/]+)\/(tasks|updates)$/.exec(path);
      if (match) {
        const project_id = decodeURIComponent(match[1]);
        if (match[2] === 'tasks') {
          const allowed = ['title', 'description', 'files', 'request_id'];
          if (Object.keys(data).some((key) => !allowed.includes(key))) throw new HTTPError(400, 'Invalid request fields');
          return json(store.createTask(operations.create_task.schema.parse({ ...data, project_id, agent_id: 'dashboard' })));
        }
        const allowed = ['kind', 'summary', 'details', 'files', 'request_id'];
        if (Object.keys(data).some((key) => !allowed.includes(key))) throw new HTTPError(400, 'Invalid request fields');
        return json(store.recordUpdate(operations.record_update.schema.parse({ ...data, project_id, agent_id: 'dashboard' })));
      }
    }
    return json({ error: 'Not found' }, 404);
  }

  async function dispatch(request) {
    const url = new URL(request.url), path = url.pathname;
    const host = request.headers.get('host') || url.host;
    if (!config.trustedHosts.has(host)) return json({ error: 'Invalid Host header' }, 421);
    const origin = request.headers.get('origin');
    if (origin !== null && !config.trustedOrigins.has(origin)) return json({ error: 'Invalid Origin header' }, 403);
    if (request.method === 'GET') {
      if (path === '/') return new Response(null, { status: 307, headers: { location: '/dashboard' } });
      if (path === '/healthz') return json({ status: 'ok' });
      if (assets.has(path)) {
        const [file, contentType] = assets.get(path);
        return new Response(await readFile(join(publicDir, file)), { headers: { 'content-type': contentType } });
      }
    }
    if (!authenticated(request)) return failed.take() ? json({ error: 'Bearer token required' }, 401, { 'www-authenticate': 'Bearer realm="agent-context"' }) : json({ error: 'Too many authentication failures' }, 429, { 'retry-after': '60' });
    if (!rate.take()) return json({ error: 'Request limit reached' }, 429, { 'retry-after': '60' });
    if (inflight >= config.maxInflight) return json({ error: 'Server busy; retry later' }, 503, { 'retry-after': '1' });
    inflight += 1;
    try {
      if (path === '/mcp') return await mcp.fetch(request);
      return await api(request, url);
    } finally { inflight -= 1; }
  }
  return {
    config, store,
    async fetch(request) {
      const id = randomUUID(), started = performance.now(); let response;
      try { response = await dispatch(request); }
      catch (error) {
        if (error instanceof ContextError) response = json({ error: error.message }, 400);
        else if (error instanceof HTTPError) response = json({ error: error.message }, error.status);
        else if (error?.name === 'ZodError' || error instanceof URIError) response = json({ error: 'Invalid request fields' }, 400);
        else response = json({ error: 'Service temporarily unavailable' }, 503);
      }
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries({ 'x-request-id': id, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'content-security-policy': CSP })) headers.set(key, value);
      if (config.log) {
        const path = new URL(request.url).pathname;
        process.stderr.write(JSON.stringify({ event: 'http_request', request_id: id, method: request.method, route: ['/mcp', '/', '/dashboard', '/healthz', '/readyz'].includes(path) ? path : 'other', status: response.status, duration_ms: Math.round((performance.now() - started) * 100) / 100 }) + '\n');
      }
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    },
    async close() { await mcp.close(); if (!options.store) store.close(); },
  };
}

export function nodeServer(application) {
  const server = createServer({ requestTimeout: 15000, headersTimeout: 10000 }, async (request, response) => {
    try {
      for (const name of ['host', 'origin', 'authorization']) {
        let count = 0;
        for (let index = 0; index < request.rawHeaders.length; index += 2) if (request.rawHeaders[index].toLowerCase() === name) count += 1;
        if (count > 1 || (name === 'host' && count === 0)) { response.writeHead(400); response.end('Invalid security headers'); return; }
      }
      const controller = new AbortController();
      response.on('close', () => { if (!response.writableEnded) controller.abort(); });
      const headers = new Headers();
      for (let index = 0; index < request.rawHeaders.length; index += 2) headers.append(request.rawHeaders[index], request.rawHeaders[index + 1]);
      const options = { method: request.method, headers, signal: controller.signal };
      if (!['GET', 'HEAD'].includes(request.method)) { options.body = Readable.toWeb(request); options.duplex = 'half'; }
      const webRequest = new Request(new URL(request.url, `http://${request.headers.host}`), options);
      const result = await application.fetch(webRequest);
      response.writeHead(result.status, Object.fromEntries(result.headers));
      if (result.body) Readable.fromWeb(result.body).on('error', () => response.destroy()).pipe(response);
      else response.end();
    } catch { if (!response.headersSent) response.writeHead(503); response.end(); }
  });
  server.keepAliveTimeout = 5000;
  return server;
}
