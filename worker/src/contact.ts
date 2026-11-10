import { FIELDS } from '@vdd/contact-schema';
import { AwsClient } from 'aws4fetch';
import { withSecurityHeaders } from './headers';

export interface ContactEnv {
  AWS_REGION: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  CONTACT_FUNCTION_URL: string;
  TURNSTILE_SECRET_KEY: string;
}

const MAX_BODY_BYTES = 16 * 1024;
const MAX_TOKEN_LENGTH = 2048;
const TURNSTILE_ACTION = 'contact';
const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const SITEVERIFY_TIMEOUT_MS = 5_000;
// Above the Lambda's own 10 s timeout, so its answer arrives first.
const LAMBDA_TIMEOUT_MS = 12_000;
// Turnstile errors that are this side's fault or Cloudflare's, not the visitor's.
const NOT_THE_VISITOR = ['missing-input-secret', 'invalid-input-secret', 'internal-error'];

function json(status: number, body: Record<string, unknown>, extra?: HeadersInit): Response {
  const headers = withSecurityHeaders(new Headers(extra));
  headers.set('Content-Type', 'application/json');
  headers.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify(body), { status, headers });
}

const fail = (status: number, error: string, extra?: HeadersInit) => json(status, { error }, extra);

/** Reads the body but stops at the limit, whatever Content-Length claims. Null when too large. */
async function readLimited(request: Request): Promise<string | null> {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

type Verdict = 'passed' | 'rejected' | 'unavailable';

async function verifyTurnstile(
  token: string,
  request: Request,
  hostname: string,
  env: ContactEnv,
): Promise<Verdict> {
  try {
    const response = await fetch(SITEVERIFY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: env.TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: request.headers.get('CF-Connecting-IP') ?? undefined,
      }),
      signal: AbortSignal.timeout(SITEVERIFY_TIMEOUT_MS),
    });
    const result = (await response.json()) as {
      success?: boolean;
      hostname?: string;
      action?: string;
      'error-codes'?: string[];
    };
    if (result.success && result.hostname === hostname && result.action === TURNSTILE_ACTION) {
      return 'passed';
    }
    const codes = result['error-codes'] ?? [];
    console.warn(JSON.stringify({ contact: 'turnstile_failed', codes }));
    return codes.some((code) => NOT_THE_VISITOR.includes(code)) ? 'unavailable' : 'rejected';
  } catch (error) {
    console.error(JSON.stringify({ contact: 'turnstile_unreachable', error: String(error) }));
    return 'unavailable';
  }
}

/** POST /api/contact: origin, size and Turnstile here; the Lambda validates the fields and sends. */
export async function handleContact(request: Request, env: ContactEnv): Promise<Response> {
  if (request.method !== 'POST') return fail(405, 'method', { Allow: 'POST' });

  const url = new URL(request.url);
  if (request.headers.get('Origin') !== url.origin) return fail(403, 'origin');
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) {
    return fail(415, 'content_type');
  }
  if (Number(request.headers.get('Content-Length') ?? 0) > MAX_BODY_BYTES) {
    return fail(413, 'too_large');
  }

  const raw = await readLimited(request);
  if (raw === null) return fail(413, 'too_large');

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return fail(400, 'invalid');
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return fail(400, 'invalid');
  }

  // Only bots fill this in. They get the same answer as a success, so they learn nothing.
  if (typeof body.website === 'string' && body.website !== '') {
    console.log(JSON.stringify({ contact: 'honeypot' }));
    return json(200, { ok: true });
  }

  const token = body.token;
  if (typeof token !== 'string' || token === '' || token.length > MAX_TOKEN_LENGTH) {
    return fail(403, 'verification');
  }
  if (!env.TURNSTILE_SECRET_KEY || !env.CONTACT_FUNCTION_URL) {
    console.error(JSON.stringify({ contact: 'not_configured' }));
    return fail(503, 'unavailable');
  }

  const verdict = await verifyTurnstile(token, request, url.hostname, env);
  if (verdict === 'rejected') return fail(403, 'verification');
  if (verdict === 'unavailable') return fail(503, 'unavailable');

  // No retries: a retry after a slow success would send the mail twice.
  const aws = new AwsClient({
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    service: 'lambda',
    region: env.AWS_REGION,
    retries: 0,
  });

  try {
    const response = await aws.fetch(env.CONTACT_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Only the fields the Lambda needs: never the token or anything else that was posted.
      body: JSON.stringify(Object.fromEntries(FIELDS.map((field) => [field, body[field]]))),
      signal: AbortSignal.timeout(LAMBDA_TIMEOUT_MS),
    });
    if (response.ok) return json(200, { ok: true });
    if (response.status === 400) return fail(400, 'invalid');
    console.error(JSON.stringify({ contact: 'lambda_failed', status: response.status }));
    return fail(502, 'send_failed');
  } catch (error) {
    console.error(JSON.stringify({ contact: 'lambda_unreachable', error: String(error) }));
    return fail(502, 'send_failed');
  }
}
