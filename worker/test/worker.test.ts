import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker, { type Env } from '../src/index';
import { SECURITY_HEADERS } from '../src/headers';

const env: Env = {
  SITE_BUCKET: 'test-bucket',
  AWS_REGION: 'eu-central-1',
  AWS_ACCESS_KEY_ID: 'AKIATEST',
  AWS_SECRET_ACCESS_KEY: 'secret',
  CONTACT_FUNCTION_URL: 'https://abc.lambda-url.eu-central-1.on.aws/',
  TURNSTILE_SECRET_KEY: 'turnstile-secret',
};

type Objects = Record<string, { body: string; type: string }>;

/** Replaces the outbound fetch with an in-memory S3. Missing keys answer 403 like a private bucket. */
function fakeS3(objects: Objects, failing = false) {
  const calls: { method: string; path: string; authorization: string | null }[] = [];
  const stub = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    const path = decodeURIComponent(url.pathname.slice(1));
    calls.push({
      method: request.method,
      path,
      authorization: request.headers.get('authorization'),
    });
    if (failing) return new Response('boom', { status: 500 });
    const object = objects[path];
    if (!object) return new Response('<Error/>', { status: 403 });
    return new Response(request.method === 'HEAD' ? null : object.body, {
      status: 200,
      headers: { 'Content-Type': object.type, ETag: '"abc"' },
    });
  });
  vi.stubGlobal('fetch', stub);
  return calls;
}

// The edge cache persists across tests in a file, so each call gets its own origin
// (the cache key includes the host) unless a test passes one to hit the cache on purpose.
let origin = 0;
async function call(path: string, init?: RequestInit, host = `t${origin++}.example.test`) {
  const ctx = createExecutionContext();
  const response = await worker.fetch(new Request(`https://${host}${path}`, init), env, ctx);
  await waitOnExecutionContext(ctx);
  return response;
}

const site: Objects = {
  'index.html': { body: '<h1>home</h1>', type: 'text/html' },
  'de/index.html': { body: '<h1>hallo</h1>', type: 'text/html' },
  '404.html': { body: '<h1>nope</h1>', type: 'text/html' },
  '_astro/app.abc.css': { body: 'body{}', type: 'text/css' },
  'cv.pdf': { body: 'pdf', type: 'application/pdf' },
};

beforeEach(() => {
  fakeS3(site);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('serving', () => {
  it('serves the root from index.html with passthrough headers', async () => {
    const response = await call('/');
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('<h1>home</h1>');
    expect(response.headers.get('Content-Type')).toBe('text/html');
    expect(response.headers.get('ETag')).toBe('"abc"');
  });

  it('signs requests to the regional bucket endpoint', async () => {
    const calls = fakeS3(site);
    await call('/de/');
    expect(calls[0]).toMatchObject({ method: 'GET', path: 'de/index.html' });
    expect(calls[0]?.authorization).toMatch(
      /^AWS4-HMAC-SHA256 Credential=AKIATEST\/.*\/eu-central-1\/s3\//,
    );
  });

  it('answers HEAD without a body', async () => {
    const response = await call('/', { method: 'HEAD' });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('');
  });
});

describe('redirects', () => {
  it('redirects /de to /de/ and keeps the query', async () => {
    const response = await call('/de?ref=cv');
    expect(response.status).toBe(301);
    expect(response.headers.get('Location')).toBe('/de/?ref=cv');
  });

  it('does not redirect when the directory page does not exist', async () => {
    const response = await call('/missing');
    expect(response.status).toBe(404);
  });
});

describe('404 handling', () => {
  it('serves 404.html with status 404 for a missing key', async () => {
    const response = await call('/nothing/');
    expect(response.status).toBe(404);
    expect(await response.text()).toBe('<h1>nope</h1>');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('falls back to plain text when 404.html is missing too', async () => {
    fakeS3({});
    const response = await call('/nothing/');
    expect(response.status).toBe(404);
    expect(await response.text()).toBe('Not found\n');
  });

  it('treats path traversal as not found without touching S3', async () => {
    const calls = fakeS3(site);
    const response = await call('/..%2fsecret.txt');
    expect(response.status).toBe(404);
    expect(calls.every((c) => c.path === '404.html')).toBe(true);
  });
});

describe('upstream errors', () => {
  it('answers 502 when S3 fails', async () => {
    fakeS3(site, true);
    const response = await call('/');
    expect(response.status).toBe(502);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
});

describe('methods', () => {
  it.each(['POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'])('rejects %s with 405', async (method) => {
    const response = await call('/', { method });
    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('GET, HEAD');
  });
});

describe('cache headers', () => {
  it('marks hashed assets immutable', async () => {
    const response = await call('/_astro/app.abc.css');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
  });

  it('revalidates HTML in browsers', async () => {
    const response = await call('/');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=0, must-revalidate');
  });

  it('caches PDFs for a day', async () => {
    const response = await call('/cv.pdf');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=86400');
  });

  it('serves a second request from the edge cache', async () => {
    const calls = fakeS3(site);
    await call('/cv.pdf', undefined, 'cache.example.test');
    const second = await call('/cv.pdf', undefined, 'cache.example.test');
    expect(second.status).toBe(200);
    expect(calls.filter((c) => c.path === 'cv.pdf')).toHaveLength(1);
    expect(second.headers.get('Cache-Control')).toBe('public, max-age=86400');
  });
});

describe('security headers', () => {
  const paths = ['/', '/_astro/app.abc.css', '/nothing/', '/de'];

  it.each(paths)('are present on GET %s', async (path) => {
    const response = await call(path);
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      expect(response.headers.get(name), `${name} on ${path}`).toBe(value);
    }
  });

  it('are present on 405 and 502 responses', async () => {
    const rejected = await call('/', { method: 'POST' });
    fakeS3(site, true);
    const failed = await call('/');
    for (const response of [rejected, failed]) {
      for (const name of Object.keys(SECURITY_HEADERS)) {
        expect(response.headers.has(name), name).toBe(true);
      }
    }
  });

  it('keeps the CSP in report-only mode for now', async () => {
    const response = await call('/');
    expect(response.headers.has('Content-Security-Policy')).toBe(false);
    expect(response.headers.get('Content-Security-Policy-Report-Only')).toContain(
      "default-src 'none'",
    );
  });
});

describe('language redirect (DACH)', () => {
  const from = (country?: string, headers: Record<string, string> = {}) =>
    ({ headers, cf: country ? { country } : undefined }) as RequestInit;

  it.each(['DE', 'AT', 'CH', 'LU', 'LI'])(
    'sends a fresh visit from %s to /de/',
    async (country) => {
      const response = await call('/', from(country));
      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('/de/');
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      expect(response.headers.get('Strict-Transport-Security')).toBeTruthy();
    },
  );

  it('keeps the query string', async () => {
    const response = await call('/?utm_source=x', from('DE'));
    expect(response.headers.get('Location')).toBe('/de/?utm_source=x');
  });

  it.each(['US', 'GB', 'FR', 'XX', 'T1'])('leaves a visit from %s on English', async (country) => {
    const response = await call('/', from(country));
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('<h1>home</h1>');
  });

  it('does nothing without a country', async () => {
    expect((await call('/', from())).status).toBe(200);
  });

  it('respects an explicit English choice (?lang=en)', async () => {
    expect((await call('/?lang=en', from('DE'))).status).toBe(200);
  });

  it('does not redirect someone already browsing the site', async () => {
    const sameOrigin = await call('/', from('DE', { 'Sec-Fetch-Site': 'same-origin' }));
    expect(sameOrigin.status).toBe(200);
    const host = 'ref.example.test';
    const viaReferer = await call(
      '/',
      from('DE', { Referer: `https://${host}/projects/x/` }),
      host,
    );
    expect(viaReferer.status).toBe(200);
  });

  it('still redirects when the Referer is another site or unparsable', async () => {
    expect((await call('/', from('DE', { Referer: 'https://www.linkedin.com/' }))).status).toBe(
      302,
    );
    expect((await call('/', from('DE', { Referer: 'not a url' }))).status).toBe(302);
    expect((await call('/', from('DE', { 'Sec-Fetch-Site': 'cross-site' }))).status).toBe(302);
  });

  it('only redirects the home page', async () => {
    expect((await call('/de/', from('DE'))).status).toBe(200);
    expect((await call('/cv.pdf', from('DE'))).status).toBe(200);
  });

  it('redirects HEAD the same way', async () => {
    const response = await call('/', { ...from('DE'), method: 'HEAD' });
    expect(response.status).toBe(302);
  });
});
