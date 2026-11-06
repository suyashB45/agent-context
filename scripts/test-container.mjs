import { spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';

const name = 'agent-context-ci-' + randomUUID().slice(0, 8), volume = name + '-data';
const token = randomBytes(48).toString('base64url');
function docker(args, check = true) {
  const result = spawnSync('docker', args, { encoding: 'utf8', env: { ...process.env, AGENT_CONTEXT_TOKEN: token }, timeout: 60000 });
  if (check && result.status !== 0) throw new Error(result.stderr || 'Docker command failed');
  return result.stdout;
}
async function healthy(port) {
  for (let attempt = 0; attempt < 100; attempt++) {
    try { const response = await fetch(`http://127.0.0.1:${port}/healthz`, { headers: { Host: '127.0.0.1:8765' }, signal: AbortSignal.timeout(1000) }); if (response.ok) return; } catch { /* Wait for startup. */ }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('Container did not become healthy');
}
async function exchange(port, write) {
  const url = `http://127.0.0.1:${port}/mcp`;
  const denied = await fetch(url, { method: 'POST', body: '{}', headers: { Host: '127.0.0.1:8765', 'Content-Type': 'application/json' } });
  assert.equal(denied.status, 401);
  const client = new Client({ name: 'container-ci', version: '1' });
  await client.connect(new StreamableHTTPClientTransport(new URL(url), { requestInit: { headers: { Authorization: `Bearer ${token}`, Host: '127.0.0.1:8765' } } }));
  try {
    assert.equal((await client.listTools()).tools.length, 10);
    if (write) {
      assert.ok(!(await client.callTool({ name: 'create_project', arguments: { project_id: 'ci', name: 'CI' } })).isError);
      assert.ok(!(await client.callTool({ name: 'record_update', arguments: { project_id: 'ci', agent_id: 'ci', kind: 'handoff', summary: 'Survives restart' } })).isError);
    } else assert.equal((await client.callTool({ name: 'get_context', arguments: { project_id: 'ci' } })).structuredContent.handoffs[0].summary, 'Survives restart');
  } finally { await client.close(); }
}
try {
  docker(['run', '-d', '--name', name, '--env', 'AGENT_CONTEXT_TOKEN', '--read-only', '--tmpfs', '/tmp:rw,noexec,nosuid,size=32m', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true', '--publish', '127.0.0.1::8765', '--volume', `${volume}:/data`, 'agent-context-mcp:ci']);
  const port = Number(docker(['port', name, '8765/tcp']).trim().split(':').at(-1));
  await healthy(port); await exchange(port, true);
  docker(['restart', name]); await healthy(port); await exchange(port, false);
  console.log('Non-root/read-only container, authenticated MCP, and persistence after restart: OK');
} finally { docker(['rm', '-f', name], false); docker(['volume', 'rm', volume], false); }
