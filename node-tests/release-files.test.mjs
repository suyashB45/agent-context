import test from 'node:test';
import assert from 'node:assert/strict';
import { releaseBasename } from '../src/release-files.mjs';
import { readFileSync } from 'node:fs';

test('scoped package downloads use npm-compatible filenames without nested scope paths', () => {
  assert.equal(releaseBasename('@suyashb/agent-context', '0.4.0'), 'suyashb-agent-context-0.4.0');
  assert.equal(releaseBasename('agent-context', '1.2.3'), 'agent-context-1.2.3');
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
  assert.equal(pkg.name, '@suyashb/agent-context');
  assert.deepEqual(pkg.bin, { 'agent-context': 'bin/agent-context.mjs' });
});
