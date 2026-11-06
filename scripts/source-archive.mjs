import { releaseBasename } from '../src/release-files.mjs';
import { createReadStream, createWriteStream, existsSync } from 'node:fs';
import { lstat, mkdir, readFile, readdir, rename } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';

const root = fileURLToPath(new URL('../', import.meta.url));
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const prefix = releaseBasename(pkg.name, pkg.version);
const destination = join(root, 'dist/release', `${prefix}-source.tar.gz`);
const files = [];
const topFiles = ['next.config.mjs', 'postcss.config.mjs', 'vercel.json', 'package.json', 'package-lock.json', 'README.md', 'LICENSE', 'SECURITY.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'CODE_OF_CONDUCT.md', 'ROADMAP.md', 'Dockerfile', 'compose.yaml', '.env.example', '.gitignore', '.dockerignore', 'pyproject.toml', 'MANIFEST.in', 'constraints.txt', 'site/config.json', 'site/published-release.json', 'site/.gitignore'];
const roots = ['app', 'src', 'web', 'bin', 'node-tests', 'examples', 'docs', '.github', 'agent_context_mcp', 'tests', 'site/src'];

async function collect(path) {
  const stat = await lstat(path);
  if (stat.isSymbolicLink()) throw new Error(`Refusing a symlink in source export: ${relative(root, path)}`);
  if (stat.isDirectory()) {
    for (const name of (await readdir(path)).sort()) {
      if (['.git', '__pycache__', 'node_modules', '.venv', '.openai', 'dist', 'data', 'secrets'].includes(name)) continue;
      await collect(join(path, name));
    }
  } else if (stat.isFile() && !/\.(pyc|sqlite3|tgz)$/.test(path)) files.push(path);
}
for (const name of topFiles) if (existsSync(join(root, name))) await collect(join(root, name));
for (const name of roots) await collect(join(root, name));
for (const name of (await readdir(join(root, 'scripts'))).sort()) if (/\.(mjs|py)$/.test(name)) await collect(join(root, 'scripts', name));

function tarHeader(name, size, executable) {
  const data = Buffer.alloc(512);
  if (Buffer.byteLength(name) > 100) throw new Error('Source archive path exceeds the supported header length.');
  const octal = (value, width) => value.toString(8).padStart(width - 1, '0') + '\0';
  data.write(name, 0, 100); data.write(octal(executable ? 0o755 : 0o644, 8), 100);
  data.write(octal(0, 8), 108); data.write(octal(0, 8), 116);
  data.write(octal(size, 12), 124); data.write(octal(0, 12), 136);
  data.fill(32, 148, 156); data.write('0', 156); data.write('ustar\0', 257); data.write('00', 263);
  const checksum = data.reduce((sum, byte) => sum + byte, 0);
  data.write(checksum.toString(8).padStart(6, '0') + '\0 ', 148);
  return data;
}
const manifest = [];
async function* entries() {
  for (const file of [...new Set(files)].sort()) {
    const name = relative(root, file).split('\\').join('/');
    const content = await readFile(file);
    manifest.push({ path: name, bytes: content.length, sha256: createHash('sha256').update(content).digest('hex') });
    yield tarHeader(`${prefix}/${name}`, content.length, name.startsWith('bin/'));
    yield content;
    if (content.length % 512) yield Buffer.alloc(512 - content.length % 512);
  }
  const content = Buffer.from(JSON.stringify({ name: pkg.name, version: pkg.version, files: manifest }, null, 2) + '\n');
  yield tarHeader(`${prefix}/SOURCE-MANIFEST.json`, content.length, false); yield content;
  if (content.length % 512) yield Buffer.alloc(512 - content.length % 512);
  yield Buffer.alloc(1024);
}
await mkdir(dirname(destination), { recursive: true });
const temporary = destination + `.tmp-${process.pid}`;
await pipeline(Readable.from(entries()), createGzip({ level: 9 }), createWriteStream(temporary));
await rename(temporary, destination);
const hash = createHash('sha256');
for await (const chunk of createReadStream(destination)) hash.update(chunk);
console.log(JSON.stringify({ archive: relative(root, destination), files: manifest.length, sha256: hash.digest('hex') }));
