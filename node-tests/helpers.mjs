import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Store } from '../src/store.mjs';
import { createApplication } from '../src/http.mjs';

export const TOKEN = 'test-token-' + 'x'.repeat(48);
export function fixture(t, application = false, overrides = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'agent-context-test-'));
  const database = join(directory, 'context.sqlite3');
  if (application) {
    const app = createApplication({ database, token: TOKEN, log: false, ...overrides }, { publicDir: resolve('build/npm/public') });
    t.after(async () => { await app.close(); rmSync(directory, { recursive: true, force: true }); });
    return { directory, database, app, store: app.store };
  }
  const store = new Store(database);
  t.after(() => { store.close(); rmSync(directory, { recursive: true, force: true }); });
  store.createProject({ project_id: 'demo', name: 'Demo' });
  return { directory, database, store };
}
export const request = (path, options = {}) => new Request('http://localhost:8765' + path, {
  ...options, headers: { Authorization: `Bearer ${TOKEN}`, ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }), ...options.headers },
});
