// Minimal static server for site/dist, so the tests do not depend on `astro preview`.
// Mirrors the Worker's rules: /foo/ -> foo/index.html, /foo -> 301 /foo/, missing -> 404.html + 404.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../../site/dist', import.meta.url)));
const port = Number(process.env.PORT ?? 4173);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
};

async function exists(file) {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

createServer(async (req, res) => {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost');
  const clean = normalize(decodeURIComponent(pathname));
  let file = join(root, clean.endsWith('/') ? `${clean}index.html` : clean);
  if (!file.startsWith(root)) {
    res.writeHead(400).end();
    return;
  }
  if (!extname(clean) && !clean.endsWith('/') && (await exists(join(file, 'index.html')))) {
    res.writeHead(301, { Location: `${pathname}/` }).end();
    return;
  }
  let status = 200;
  if (!(await exists(file))) {
    file = join(root, '404.html');
    status = 404;
  }
  const body = await readFile(file);
  res.writeHead(status, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
  res.end(body);
}).listen(port, '127.0.0.1', () => console.log(`serving ${root} on http://127.0.0.1:${port}`));
