// Smoke test against the live site. Plain Node (node:test, global fetch), no dependencies.
//   BASE_URL     default https://vedad-dizdarevic.dev
//   SITE_BUCKET  optional; enables the direct-bucket-access check
//   AWS_REGION   default eu-central-1
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';

const base = new URL(process.env.BASE_URL ?? 'https://vedad-dizdarevic.dev');
const bucket = process.env.SITE_BUCKET;
const region = process.env.AWS_REGION ?? 'eu-central-1';

const SIX_HEADERS = [
  'content-security-policy-report-only',
  'permissions-policy',
  'referrer-policy',
  'strict-transport-security',
  'x-content-type-options',
  'x-frame-options',
];

function assertSecurityHeaders(response, label) {
  for (const name of SIX_HEADERS) {
    assert.ok(response.headers.has(name), `${label}: missing ${name}`);
  }
}

// A deploy purges the cache and updates the Worker; give the edge a moment to settle.
async function get(url, init = {}, attempts = 3) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try {
      last = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000) });
      if (last.status < 500) return last;
    } catch (error) {
      last = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  if (last instanceof Error) throw last;
  return last;
}

test('GET / returns the page with all six security headers', async () => {
  const response = await get(base);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /text\/html/);
  assertSecurityHeaders(response, '/');
  const html = await response.text();
  assert.match(html, /<h1/);
});

test('a random path returns 404 with the custom page and security headers', async () => {
  const response = await get(new URL(`/${randomUUID()}/`, base));
  assert.equal(response.status, 404);
  assertSecurityHeaders(response, '404');
  assert.match(await response.text(), /<h1/);
});

test('POST / is rejected with 405', async () => {
  const response = await get(base, { method: 'POST' });
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'GET, HEAD');
});

test('www redirects to the apex with 301', async () => {
  const url = new URL(base);
  url.hostname = `www.${base.hostname}`;
  url.pathname = '/some/path/';
  url.search = '?q=1';
  const response = await get(url, { redirect: 'manual' });
  assert.equal(response.status, 301);
  const location = new URL(response.headers.get('location') ?? '');
  assert.equal(location.hostname, base.hostname);
  assert.equal(location.pathname, '/some/path/');
  assert.equal(location.search, '?q=1');
});

test('http redirects to https with 301', async () => {
  const url = new URL(base);
  url.protocol = 'http:';
  const response = await get(url, { redirect: 'manual' });
  assert.equal(response.status, 301);
  assert.equal(new URL(response.headers.get('location') ?? '').protocol, 'https:');
});

test('the bucket refuses direct access', { skip: !bucket && 'SITE_BUCKET not set' }, async () => {
  const response = await fetch(`https://${bucket}.s3.${region}.amazonaws.com/index.html`, {
    signal: AbortSignal.timeout(10_000),
  });
  assert.equal(response.status, 403);
});
