import { readdir, readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
async function check(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) { await check(path); continue; }
    if (!entry.isFile() || !/\.(mjs|js|jsx)$/.test(entry.name)) continue;
    await transform(await readFile(path, 'utf8'), { loader: entry.name.endsWith('.jsx') ? 'jsx' : 'js', target: 'es2022' });
  }
}
for (const directory of ['src', 'scripts', 'bin', 'node-tests', 'web/src', 'site/src', 'app']) await check(directory);
console.log('JavaScript and React JSX syntax checks passed.');
