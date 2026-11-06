import { availableContainerPort, containerAddress } from './container-address.mjs';
import { spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';

const name = 'agent-context-ci-' + randomUUID().slice(0, 8), volume = name + '-data';
const token = randomBytes(48).toString('base64url');
function docker(args, check = true) {
  const result = spawnSync('docker', args, { encoding: 'utf8', env: { ...process.env, AGENT_CONTEXT_TOKEN: token }, timeout: 60000 });
  if (check && (result.error || result.status !== 0)) throw new Error(`Docker ${args[0]} failed: ${result.error?.message || result.stderr || 'no diagnostic output'}`);
  return args[0] === 'logs' ? (result.stdout || '') + (result.stderr || '') : result.stdout || '';
}
async function healthy(port) {
  const deadline = Date.now() + 30000;
  let diagnostic = 'No response';
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/healthz`, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
      diagnostic = `HTTP ${response.status}`; await response.body?.cancel();
    } catch (error) { diagnostic = error.cause?.code || error.message; }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Container did not become healthy: ${diagnostic}`);
}
async function exchange(port, write) {
  const url = `http://127.0.0.1:${port}/mcp`;
  const denied = await fetch(url, { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } });
  assert.equal(denied.status, 401);
  const client = new Client({ name: 'container-ci', version: '1' });
  const transport = new StreamableHTTPClientTransport(new URL(url), { requestInit: { headers: { Authorization: `Bearer ${token}` } } });
  try {
    await client.connect(transport);
    assert.equal((await client.listTools()).tools.length, 10);
    if (write) {
      assert.ok(!(await client.callTool({ name: 'create_project', arguments: { project_id: 'ci', name: 'CI' } })).isError);
      assert.ok(!(await client.callTool({ name: 'record_update', arguments: { project_id: 'ci', agent_id: 'ci', kind: 'handoff', summary: 'Survives restart' } })).isError);
    } else assert.equal((await client.callTool({ name: 'get_context', arguments: { project_id: 'ci' } })).structuredContent.handoffs[0].summary, 'Survives restart');
  } finally { await client.close(); await transport.close(); }
}
const address = containerAddress(await availableContainerPort());
try {
  docker(['run', '-d', '--name', name, '--env', 'AGENT_CONTEXT_TOKEN', '--read-only', '--tmpfs', '/tmp:rw,noexec,nosuid,size=32m', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true', '--publish', address.publish, '--volume', `${volume}:/data`, 'agent-context:ci', ...address.serverArguments]);
  const port = Number(address.host.split(':').at(-1));
  console.log(`Testing container through ${address.origin}`);
  await healthy(port); await exchange(port, true);
  docker(['restart', name]); await healthy(port); await exchange(port, false);
  console.log('Non-root/read-only container, authenticated MCP, and persistence after restart: OK');
} catch (error) {
  const redact = (text) => String(text).replaceAll(token, '[redacted]');
  console.error('Container state:', redact(docker(['inspect', '--format', '{{json .State}}', name], false)));
  console.error('Container logs:', redact(docker(['logs', '--tail', '80', name], false)));
  throw error;
} finally { docker(['rm', '-f', name], false); docker(['volume', 'rm', volume], false); }
