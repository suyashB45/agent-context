import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { defaultDatabase, environmentValue, existingDatabase, keygen, localToken, readToken, VERSION } from './config.mjs';
import { Store } from './store.mjs';
import { buildServer } from './mcp.mjs';
import { createApplication, nodeServer } from './http.mjs';

const HELP = `Handoffra ${VERSION}

Usage: handoffra [dashboard|stdio|token|keygen|check|backup] [options]

  dashboard    Start the React dashboard and HTTP MCP service (default)
  stdio        Start an MCP subprocess for coding agents; also --mcp
  token        Show or provision the local instance access token
  keygen       Generate a fresh token
  check        Check an existing database for integrity
  backup       Back up an existing database to --output (never overwrites)

Options:
  --db PATH               SQLite file (also HANDOFFRA_DB)
  --host HOST             Bind address (default 127.0.0.1)
  --port PORT             HTTP port (default 8765)
  --token-file PATH       Read credentials from a file
  --allowed-host HOST     Additional exact Host header (repeatable)
  --allowed-origin URL    Additional exact browser origin (repeatable)
  --allow-unauthenticated-local  Development only; refuses non-loopback
  --requests-per-minute N --max-inflight N --max-body-bytes N
  --output PATH           New backup filename
  --help                  Show this help
  --version               Show installed version

HTTP also accepts HANDOFFRA_TOKEN or HANDOFFRA_TOKEN_FILE.
Requires Node.js 24 or newer. No Python, native compilation or API key needed.
`;

export async function main(argv = process.argv.slice(2)) {
  const { values, positionals } = parseArgs({ args: argv, allowPositionals: true, options: {
    db: { type: 'string' }, host: { type: 'string' }, port: { type: 'string' },
    'token-file': { type: 'string' }, output: { type: 'string' }, transport: { type: 'string' },
    'allowed-host': { type: 'string', multiple: true }, 'allowed-origin': { type: 'string', multiple: true },
    'allow-unauthenticated-local': { type: 'boolean' }, mcp: { type: 'boolean' },
    'requests-per-minute': { type: 'string' }, 'max-inflight': { type: 'string' }, 'max-body-bytes': { type: 'string' },
    help: { type: 'boolean', short: 'h' }, version: { type: 'boolean', short: 'v' },
  } });
  if (values.help) { console.log(HELP); return; }
  if (values.version) { console.log(VERSION); return; }
  if (positionals.length > 1) throw new Error('Expected one action. Run --help.');
  const transport = values.transport || environmentValue('TRANSPORT');
  if (transport && !['stdio', 'streamable-http'].includes(transport)) throw new Error('Unknown transport.');
  let action = values.mcp ? 'stdio' : (positionals[0] || (transport === 'stdio' ? 'stdio' : 'dashboard'));
  if (action === 'serve') action = transport === 'stdio' ? 'stdio' : 'dashboard';
  if (!['dashboard', 'stdio', 'token', 'keygen', 'check', 'backup'].includes(action)) throw new Error('Unknown action. Run --help.');
  if (action === 'keygen') { console.log(keygen()); return; }
  const database = resolve(values.db || environmentValue('DB') || defaultDatabase());
  if (action === 'token') { console.log(localToken(database, values['token-file'])); return; }
  if (['backup', 'check'].includes(action)) {
    existingDatabase(database);
    if (action === 'backup' && !values.output) throw new Error('backup requires --output pointing to a new file.');
    const store = new Store(database);
    try { console.log(JSON.stringify(action === 'backup' ? await store.backup(values.output) : store.check(true))); }
    finally { store.close(); }
    return;
  }
  if (action === 'stdio') {
    const store = new Store(database);
    const handle = serveStdio(() => buildServer(store), { onerror: () => process.stderr.write('MCP transport error\n') });
    let closed = false;
    const close = async () => { if (closed) return; closed = true; await handle.close(); store.close(); };
    process.once('SIGINT', close); process.once('SIGTERM', close); process.once('beforeExit', close);
    return;
  }
  const token = values['allow-unauthenticated-local'] ? readToken(values['token-file']) : localToken(database, values['token-file']);
  const app = createApplication({ database, token, host: values.host || environmentValue('HOST') || '127.0.0.1',
    port: Number(values.port || environmentValue('PORT') || 8765),
    allowedHosts: values['allowed-host'] || [], allowedOrigins: values['allowed-origin'] || [],
    allowUnauthenticatedLocal: values['allow-unauthenticated-local'] || false,
    requestsPerMinute: values['requests-per-minute'] === undefined ? 600 : Number(values['requests-per-minute']),
    maxInflight: values['max-inflight'] === undefined ? 32 : Number(values['max-inflight']),
    maxBodyBytes: values['max-body-bytes'] === undefined ? 262144 : Number(values['max-body-bytes']),
  });
  const server = nodeServer(app);
  let closing = false;
  const close = () => {
    if (closing) return; closing = true;
    const timer = setTimeout(() => server.closeAllConnections(), 20000); timer.unref();
    server.close(async () => { clearTimeout(timer); await app.close(); });
  };
  process.once('SIGINT', close); process.once('SIGTERM', close);
  server.once('error', async (error) => {
    await app.close();
    process.stderr.write(error.code === 'EADDRINUSE' ? 'Port is already in use. Stop the old server or choose --port.\n' : `Cannot start server (${error.code || 'unknown error'}).\n`);
    process.exitCode = 1;
  });
  server.listen(app.config.port, app.config.host, () => {
    const host = app.config.host.includes(':') ? `[${app.config.host}]` : app.config.host;
    process.stderr.write(`Handoffra ${VERSION}\nDashboard: http://${host}:${app.config.port}/dashboard\nMCP endpoint: http://${host}:${app.config.port}/mcp\nShow the access token with: handoffra token --db ${JSON.stringify(database)}\n`);
  });
}
