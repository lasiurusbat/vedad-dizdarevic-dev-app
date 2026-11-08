import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker, { type Env } from '../src/index';
import { SECURITY_HEADERS } from '../src/headers';

const ORIGIN = 'https://contact.example.test';
const LAMBDA = 'https://abc.lambda-url.eu-central-1.on.aws/';
const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

const env: Env = {
  SITE_BUCKET: 'test-bucket',
  AWS_REGION: 'eu-central-1',
  AWS_ACCESS_KEY_ID: 'AKIATEST',
  AWS_SECRET_ACCESS_KEY: 'secret',
  CONTACT_FUNCTION_URL: LAMBDA,
  TURNSTILE_SECRET_KEY: 'turnstile-secret',
};

const fields = {
  name: 'Ada',
  email: 'ada@example.com',
  type: 'job',
  language: 'en',
  message: 'A message that is long enough.',
};
const good = { ...fields, token: 'good-token', website: '' };

interface Outbound {
  url: string;
  method: string;
  authorization: string | null;
  body: Record<string, unknown>;
}

function fakeUpstreams(options: {
  turnstile?: Record<string, unknown> | 'down';
  lambda?: number | 'down';
}) {
  const calls: Outbound[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      const text = await request.text();
      calls.push({
        url: request.url,
        method: request.method,
        authorization: request.headers.get('authorization'),
        body: text ? (JSON.parse(text) as Record<string, unknown>) : {},
      });
      if (request.url === SITEVERIFY) {
        const answer = options.turnstile ?? {
          success: true,
          hostname: new URL(ORIGIN).hostname,
          action: 'contact',
        };
        if (answer === 'down') throw new Error('network');
        return Response.json(answer);
      }
      if (options.lambda === 'down') throw new Error('network');
      return new Response('{}', { status: options.lambda ?? 200 });
    }),
  );
  return calls;
}

async function call(init: RequestInit & { origin?: string | null } = {}, config: Env = env) {
  const headers = new Headers(init.headers);
  if (init.origin !== null) headers.set('Origin', init.origin ?? ORIGIN);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const ctx = createExecutionContext();
  const response = await worker.fetch(
    new Request(`${ORIGIN}/api/contact`, { method: 'POST', ...init, headers }),
    config,
    ctx,
  );
  await waitOnExecutionContext(ctx);
  return response;
}

const post = (body: unknown) => call({ body: JSON.stringify(body) });
const errorOf = async (response: Response) => ((await response.json()) as { error?: string }).error;

describe('POST /api/contact', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('verifies the token, then forwards only the known fields, signed', async () => {
    const calls = fakeUpstreams({});
    const response = await post({ ...good, extra: 'dropped' });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

    expect(calls.map((c) => c.url)).toEqual([SITEVERIFY, LAMBDA]);
    expect(calls[0]!.body).toMatchObject({ secret: 'turnstile-secret', response: 'good-token' });
    expect(calls[1]!.method).toBe('POST');
    expect(calls[1]!.authorization).toMatch(/^AWS4-HMAC-SHA256 .*\/lambda\/aws4_request/);
    expect(calls[1]!.body).toEqual(fields);
  });

  it('sets the security headers and is never cached', async () => {
    fakeUpstreams({});
    const response = await post(good);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    for (const name of Object.keys(SECURITY_HEADERS)) {
      expect(response.headers.get(name)).toBe(SECURITY_HEADERS[name]);
    }
  });

  it.each(['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS'])('answers %s with 405', async (method) => {
    const calls = fakeUpstreams({});
    const response = await call({ method });
    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('POST');
    expect(calls).toHaveLength(0);
  });

  it.each([
    ['another site', 'https://evil.example'],
    ['no origin', null],
    ['a similar host', `${ORIGIN}.evil.example`],
  ])('rejects %s before calling anything', async (_label, origin) => {
    const calls = fakeUpstreams({});
    const response = await call({ origin, body: JSON.stringify(good) });
    expect(response.status).toBe(403);
    expect(await errorOf(response)).toBe('origin');
    expect(calls).toHaveLength(0);
  });

  it('rejects a body that is not JSON by type', async () => {
    const calls = fakeUpstreams({});
    const response = await call({
      body: 'name=Ada',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(response.status).toBe(415);
    expect(calls).toHaveLength(0);
  });

  it('rejects a body over the limit, even when Content-Length does not say so', async () => {
    const calls = fakeUpstreams({});
    const big = JSON.stringify({ ...good, message: 'x'.repeat(17 * 1024) });
    expect((await call({ body: big })).status).toBe(413);
    const stream = new Response(big).body!;
    const chunked = await call({ body: stream, duplex: 'half' } as RequestInit);
    expect(chunked.status).toBe(413);
    expect(calls).toHaveLength(0);
  });

  it.each([
    ['broken JSON', '{nope'],
    ['an array', '[]'],
    ['null', 'null'],
  ])('answers 400 to %s', async (_label, body) => {
    const calls = fakeUpstreams({});
    expect((await call({ body })).status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it('answers a filled honeypot like a success and sends nothing', async () => {
    const calls = fakeUpstreams({});
    const response = await post({ ...good, website: 'https://spam.example' });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(calls).toHaveLength(0);
  });

  it.each([
    ['no token', { ...fields, website: '' }],
    ['an empty token', { ...good, token: '' }],
    ['a token that is not text', { ...good, token: 42 }],
    ['an oversized token', { ...good, token: 'x'.repeat(2049) }],
  ])('rejects %s without calling Turnstile or the Lambda', async (_label, body) => {
    const calls = fakeUpstreams({});
    const response = await post(body);
    expect(response.status).toBe(403);
    expect(await errorOf(response)).toBe('verification');
    expect(calls).toHaveLength(0);
  });

  it.each([
    ['a failed challenge', { success: false, 'error-codes': ['invalid-input-response'] }],
    ['a reused token', { success: false, 'error-codes': ['timeout-or-duplicate'] }],
    ['another hostname', { success: true, hostname: 'evil.example', action: 'contact' }],
    ['another action', { success: true, hostname: 'contact.example.test', action: 'login' }],
  ])('rejects %s and never reaches the Lambda', async (_label, turnstile) => {
    const calls = fakeUpstreams({ turnstile });
    const response = await post(good);
    expect(response.status).toBe(403);
    expect(await errorOf(response)).toBe('verification');
    expect(calls.map((c) => c.url)).toEqual([SITEVERIFY]);
  });

  it.each([
    ['Turnstile being down', 'down' as const],
    ['a bad secret', { success: false, 'error-codes': ['invalid-input-secret'] }],
  ])("answers 503, not the visitor's fault, for %s", async (_label, turnstile) => {
    const calls = fakeUpstreams({ turnstile });
    const response = await post(good);
    expect(response.status).toBe(503);
    expect(calls.map((c) => c.url)).toEqual([SITEVERIFY]);
  });

  it('answers 503 and calls nothing when a secret is not configured', async () => {
    const calls = fakeUpstreams({});
    const response = await call(
      { body: JSON.stringify(good) },
      { ...env, TURNSTILE_SECRET_KEY: '' },
    );
    expect(response.status).toBe(503);
    expect(calls).toHaveLength(0);
  });

  it("passes the Lambda's 400 on", async () => {
    fakeUpstreams({ lambda: 400 });
    const response = await post(good);
    expect(response.status).toBe(400);
    expect(await errorOf(response)).toBe('invalid');
  });

  it.each([502, 503, 403, 'down' as const])(
    'answers 502 when the Lambda gives %s',
    async (lambda) => {
      const calls = fakeUpstreams({ lambda });
      const response = await post(good);
      expect(response.status).toBe(502);
      expect(await errorOf(response)).toBe('send_failed');
      expect(calls.filter((c) => c.url === LAMBDA)).toHaveLength(1);
    },
  );
});
