import { closeSync, existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { isIP } from 'node:net';
import { randomBytes } from 'node:crypto';

export const VERSION = '0.4.0';
export function defaultDatabase(env = process.env, platform = process.platform) {
  const base = platform === 'win32' ? (env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local'))
    : platform === 'darwin' ? join(homedir(), 'Library', 'Application Support')
      : (env.XDG_DATA_HOME || join(homedir(), '.local', 'share'));
  const current = join(base, 'agent-context-mcp', 'context.sqlite3');
  const legacy = join(base, 'handoffra', 'context.sqlite3');
  return !existsSync(current) && existsSync(legacy) ? legacy : current;
}
export const keygen = () => randomBytes(48).toString('base64url');
export const isLoopback = (host) => host === 'localhost' || host === '::1' || (isIP(host) === 4 && host.startsWith('127.'));

export function environmentValue(name, env = process.env) {
  const current = env[`AGENT_CONTEXT_${name}`], legacy = env[`HANDOFFRA_${name}`];
  if (current !== undefined && legacy !== undefined && current !== legacy) throw new Error(`Conflicting AGENT_CONTEXT_${name} and HANDOFFRA_${name}.`);
  return current ?? legacy;
}
export function readToken(tokenFile, env = process.env) {
  tokenFile ||= environmentValue('TOKEN_FILE', env);
  const configuredToken = environmentValue('TOKEN', env);
  if (configuredToken !== undefined && tokenFile) throw new Error('Set AGENT_CONTEXT_TOKEN or a token file, not both.');
  const token = tokenFile ? readFileSync(resolve(tokenFile), 'utf8').trim() : configuredToken;
  if (token !== undefined && !/^[A-Za-z0-9._~+/=-]{32,512}$/.test(token)) throw new Error('Invalid bearer token. Use keygen to generate a strong token.');
  return token;
}
export function localToken(database, tokenFile, env = process.env) {
  const configured = readToken(tokenFile, env);
  if (configured !== undefined) return configured;
  const path = join(dirname(resolve(database)), 'access-token');
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  try {
    const descriptor = openSync(path, 'wx', 0o600);
    try { writeFileSync(descriptor, `${keygen()}\n`); } finally { closeSync(descriptor); }
  } catch (error) { if (error.code !== 'EEXIST') throw error; }
  return readToken(path, {});
}
export function settings(input = {}) {
  const result = {
    database: resolve(input.database || defaultDatabase()), host: input.host || '127.0.0.1', port: input.port ?? 8765,
    token: input.token, allowUnauthenticatedLocal: input.allowUnauthenticatedLocal ?? false,
    allowedHosts: input.allowedHosts || [], allowedOrigins: input.allowedOrigins || [],
    requestsPerMinute: input.requestsPerMinute ?? 600, maxInflight: input.maxInflight ?? 32,
    maxBodyBytes: input.maxBodyBytes ?? 262144, log: input.log ?? true,
  };
  for (const [key, min, max] of [['port', 1, 65535], ['requestsPerMinute', 1, 100000], ['maxInflight', 1, 256], ['maxBodyBytes', 1024, 4194304]]) {
    if (!Number.isInteger(result[key]) || result[key] < min || result[key] > max) throw new Error(`${key} must be an integer from ${min} to ${max}.`);
  }
  if (result.allowUnauthenticatedLocal && !isLoopback(result.host)) throw new Error('Unauthenticated HTTP may bind only to loopback.');
  if (result.token === undefined && !result.allowUnauthenticatedLocal) throw new Error('HTTP requires a token. Set AGENT_CONTEXT_TOKEN or --token-file.');
  if (result.token !== undefined && !/^[A-Za-z0-9._~+/=-]{32,512}$/.test(result.token)) throw new Error('Invalid bearer token.');
  for (const host of result.allowedHosts) if (!host || /[*/\\@?#\s]/.test(host)) throw new Error('Allowed hosts must be exact Host header values without a scheme.');
  for (const origin of result.allowedOrigins) {
    let url; try { url = new URL(origin); } catch { throw new Error('Invalid allowed origin.'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin || origin.includes('*')) throw new Error('Allowed origins must be exact http(s) origins without paths.');
  }
  result.trustedHosts = new Set(['127.0.0.1', 'localhost', '[::1]', `127.0.0.1:${result.port}`, `localhost:${result.port}`, `[::1]:${result.port}`, ...result.allowedHosts]);
  result.trustedOrigins = new Set([`http://127.0.0.1:${result.port}`, `http://localhost:${result.port}`, `http://[::1]:${result.port}`, ...result.allowedOrigins]);
  return result;
}
export function existingDatabase(path) {
  if (!existsSync(path)) throw new Error('Database does not exist. Start the service with this --db path first.');
}
