import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../site/dist/', import.meta.url)));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.tgz': 'application/gzip', '.gz': 'application/gzip' };
const server = createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let file = resolve(root, '.' + pathname);
    if (!file.startsWith(root + sep) && file !== root) { response.writeHead(403); response.end(); return; }
    let info = await stat(file); if (info.isDirectory()) { file = join(file, 'index.html'); info = await stat(file); }
    if (!info.isFile()) throw new Error('Not found');
    response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Content-Length': info.size, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
    if (request.method === 'HEAD') response.end(); else createReadStream(file).on('error', () => response.destroy()).pipe(response);
  } catch { response.writeHead(404); response.end('Not found'); }
});
server.on('error', (error) => { process.stderr.write(`Cannot preview site: ${error.code}\n`); process.exitCode = 1; });
server.listen(8770, '127.0.0.1', () => console.log('Handoffra launch site: http://127.0.0.1:8770'));
process.once('SIGINT', () => server.close()); process.once('SIGTERM', () => server.close());
