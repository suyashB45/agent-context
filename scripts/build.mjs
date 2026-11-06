import { build } from 'esbuild';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { builtinModules, createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
process.chdir(fileURLToPath(root));
await rm('build/npm', { recursive: true, force: true });
await mkdir('dist/npm', { recursive: true });
await mkdir('build/npm/public', { recursive: true });
const server = await build({ entryPoints: ['src/cli.mjs'], outfile: 'build/npm/cli.mjs', bundle: true, platform: 'node', format: 'esm', target: 'node24', legalComments: 'external', packages: 'bundle', metafile: true,
  banner: { js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);" },
});
for (const output of Object.values(server.metafile.outputs)) {
  for (const dependency of output.imports) {
    if (dependency.external && !dependency.path.startsWith('node:') && !builtinModules.includes(dependency.path)) throw new Error(`Unbundled runtime dependency: ${dependency.path}`);
  }
}
await build({ entryPoints: ['web/src/main.jsx'], outfile: 'build/npm/public/dashboard.js', bundle: true, platform: 'browser', format: 'iife', target: ['es2022'], minify: true, legalComments: 'external', define: { 'process.env.NODE_ENV': '"production"' }, jsx: 'automatic' });
// esbuild emits dashboard.css beside its JavaScript entry.
await copyFile('web/index.html', 'build/npm/public/index.html');
const require = createRequire(import.meta.url);
await mkdir('build/npm/licenses', { recursive: true });
const notices = [];
for (const name of ['@modelcontextprotocol/server', '@modelcontextprotocol/core', 'zod', 'react', 'react-dom', 'scheduler']) {
  const location = require.resolve(name === '@modelcontextprotocol/server' || name === '@modelcontextprotocol/core' ? name : `${name}/package.json`);
  let directory = dirname(location);
  while (true) {
    try { const data = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8')); if (data.name === name) break; } catch { /* Find the package root from its exported entry. */ }
    const parent = dirname(directory); if (parent === directory) throw new Error(`Cannot find package root for ${name}`); directory = parent;
  }
  const metadata = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'));
  const label = name.replaceAll('/', '__').replace('@', '');
  for (const filename of ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'NOTICE', 'NOTICE.md']) {
    try { await copyFile(join(directory, filename), `build/npm/licenses/${label}-${filename}`); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  notices.push(`${name}@${metadata.version} — ${metadata.license || 'see bundled license'}`);
}
await writeFile('build/npm/THIRD_PARTY_NOTICES.txt', 'Bundled third-party software; corresponding license files are in licenses/.\n\n' + notices.join('\n') + '\n');
console.log('Built Node MCP service and React dashboard in build/npm.');
