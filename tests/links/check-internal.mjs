// Checks every internal link and #fragment in the built site (site/dist).
// No dependencies. Usage: node tests/links/check-internal.mjs [distDir]
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';

const dist = resolve(process.argv[2] ?? 'site/dist');
if (!existsSync(dist)) {
  console.error(`No build at ${dist}. Run the site build first.`);
  process.exit(2);
}

const origin = 'https://vedad-dizdarevic.dev';
const htmlFiles = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (extname(p) === '.html') htmlFiles.push(p);
  }
})(dist);

// URL path (as a browser would request it) -> file on disk, or null.
function fileFor(pathname) {
  const clean = decodeURIComponent(pathname);
  const candidates = clean.endsWith('/')
    ? [join(dist, clean, 'index.html')]
    : [join(dist, clean), join(dist, clean, 'index.html')];
  return candidates.find((c) => existsSync(c) && statSync(c).isFile()) ?? null;
}

const idCache = new Map();
function idsIn(file) {
  if (!idCache.has(file)) {
    const html = readFileSync(file, 'utf8');
    const ids = new Set();
    for (const m of html.matchAll(/\s(?:id|name)=(?:"([^"]*)"|'([^']*)'|([^\s>"']+))/g)) {
      ids.add(m[1] ?? m[2] ?? m[3]);
    }
    idCache.set(file, ids);
  }
  return idCache.get(file);
}

const attr =
  /<(?:a|link|img|script|source|area)\b[^>]*?\s(?:href|src)=(?:"([^"]*)"|'([^']*)'|([^\s>"']+))/gi;
const problems = [];
let checked = 0;

for (const file of htmlFiles) {
  const page = '/' + file.slice(dist.length + 1).replace(/index\.html$/, '');
  const html = readFileSync(file, 'utf8');
  for (const m of html.matchAll(attr)) {
    const raw = (m[1] ?? m[2] ?? m[3]).trim();
    if (!raw || /^(mailto:|tel:|data:|javascript:)/i.test(raw)) continue;
    let url;
    try {
      url = new URL(raw, origin + page);
    } catch {
      problems.push(`${page}: unparseable link "${raw}"`);
      continue;
    }
    if (url.origin !== origin) continue; // external: checked weekly by lychee
    checked++;
    const target = fileFor(url.pathname);
    if (!target) {
      problems.push(`${page}: ${raw} -> no such file (${url.pathname})`);
      continue;
    }
    if (url.hash.length > 1 && extname(target) === '.html') {
      const id = decodeURIComponent(url.hash.slice(1));
      if (!idsIn(target).has(id)) problems.push(`${page}: ${raw} -> no element with id "${id}"`);
    }
  }
}

console.log(`Checked ${checked} internal links in ${htmlFiles.length} pages.`);
if (problems.length) {
  console.error(`\n${problems.length} broken:\n` + [...new Set(problems)].join('\n'));
  process.exit(1);
}
