import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
const files = ['README.md', 'CONTRIBUTING.md', 'CODE_OF_CONDUCT.md', 'SECURITY.md', 'ROADMAP.md', 'CHANGELOG.md', 'examples/AGENT_INSTRUCTIONS.md', '.github/PULL_REQUEST_TEMPLATE.md'];
for (const name of await readdir('docs')) if (name.endsWith('.md')) files.push('docs/' + name);
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const site = JSON.parse(await readFile('site/config.json', 'utf8'));
if (pkg.name !== site.packageName || pkg.version !== site.version) throw new Error('Package and website release metadata differ.');
const withoutFences = (text) => text.replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\s*$/gm, '');
function anchors(text) {
  const found = new Set(), counts = new Map();
  for (const match of withoutFences(text).matchAll(/^#{1,6}\s+(.+?)\s*#*$/gm)) {
    const base = match[1].toLowerCase().replace(/[^\p{L}\p{N}_\-\s]/gu, '').trim().replace(/\s/g, '-');
    const count = counts.get(base) || 0;
    found.add(count ? `${base}-${count}` : base); counts.set(base, count + 1);
  }
  for (const match of text.matchAll(/\bid=["']([^"']+)["']/g)) found.add(match[1]);
  return found;
}
let checked = 0;
const errors = [];
for (const file of files) {
  const text = await readFile(file, 'utf8');
  for (const match of withoutFences(text).matchAll(/!?\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
    const href = match[1];
    if (/^[a-z][a-z\d+.-]*:/i.test(href) || href.startsWith('//')) continue;
    const [path, fragment] = href.split('#');
    const destination = path ? resolve(dirname(resolve(file)), decodeURIComponent(path.split('?')[0])) : resolve(file);
    const local = relative(root, destination);
    if (local === '..' || local.startsWith('..' + sep)) { errors.push(`${file}: link escapes repository: ${href}`); continue; }
    const info = await stat(destination).catch(() => null);
    if (!info) { errors.push(`${file}: missing ${href}`); continue; }
    if (fragment && destination.endsWith('.md')) {
      const target = await readFile(destination, 'utf8');
      if (!anchors(target).has(decodeURIComponent(fragment))) errors.push(`${file}: missing anchor ${href}`);
    }
    checked++;
  }
  if (!file.endsWith('legacy-python.md') && file !== 'CHANGELOG.md') {
    for (const match of text.matchAll(/agent-context-mcp-(\d+\.\d+\.\d+)\.tgz/g)) {
      if (match[1] !== pkg.version) errors.push(`${file}: outdated package filename ${match[0]}`);
    }
  }
}
if (errors.length) throw new Error(errors.join('\n'));
console.log(`Verified ${files.length} Markdown documents, ${checked} local links/anchors, and current release metadata. External links were not network-verified.`);
