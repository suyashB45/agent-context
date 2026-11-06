import { readdir, readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
for (const directory of ['src', 'scripts', 'bin', 'node-tests', 'web/src', 'site/src']) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isFile() || !/\.(mjs|js|jsx)$/.test(entry.name)) continue;
    await transform(await readFile(`${directory}/${entry.name}`, 'utf8'), { loader: entry.name.endsWith('.jsx') ? 'jsx' : 'js', target: 'es2022' });
  }
}
console.log('JavaScript and React JSX syntax checks passed.');
