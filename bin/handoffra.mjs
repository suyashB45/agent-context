#!/usr/bin/env node
try {
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('Node.js 24 or newer is required.');
  const { main } = await import('../build/npm/cli.mjs');
  await main();
} catch (error) {
  process.stderr.write(`handoffra: ${error.message}\n`);
  process.exitCode = 1;
}
