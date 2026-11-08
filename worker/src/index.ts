import { AwsClient } from 'aws4fetch';
import { type ContactEnv, handleContact } from './contact';
import { BROWSER_CACHE, EDGE_TTL_SECONDS, withSecurityHeaders } from './headers';
import { GERMAN_HOME, wantsGermanHome } from './locale';
import { cacheClass, resolvePath } from './paths';

export interface Env extends ContactEnv {
  SITE_BUCKET: string;
}

const PASS_THROUGH = ['Content-Type', 'Content-Length', 'ETag', 'Last-Modified'];

function s3Url(env: Env, key: string): string {
  const path = key.split('/').map(encodeURIComponent).join('/');
  return `https://${env.SITE_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${path}`;
}

function signedFetch(env: Env, key: string, method: 'GET' | 'HEAD'): Promise<Response> {
  // One retry only: the default (10, with backoff) could stall a request for many seconds.
  const aws = new AwsClient({
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    service: 's3',
    region: env.AWS_REGION,
    retries: 1,
  });
  return aws.fetch(s3Url(env, key), { method });
}

/** Applies browser cache policy and security headers; the edge TTL header is dropped. */
function finalize(source: Response, key: string, status = source.status): Response {
  const headers = new Headers();
  for (const name of PASS_THROUGH) {
    const value = source.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (status === 200) headers.set('Cache-Control', BROWSER_CACHE[cacheClass(key)]);
  else headers.set('Cache-Control', 'no-store');
  return new Response(source.body, { status, headers: withSecurityHeaders(headers) });
}

/** Returns the object as a cacheable 200, from the edge cache or S3; any other status is passed on. */
async function loadObject(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  key: string,
): Promise<Response> {
  const cacheKey = new Request(new URL(`/${key}`, request.url).toString());
  const cache = caches.default;

  if (request.method === 'GET') {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }

  const upstream = await signedFetch(env, key, request.method as 'GET' | 'HEAD');
  if (upstream.status === 200 && request.method === 'GET') {
    const stored = new Response(upstream.body, upstream);
    stored.headers.set('Cache-Control', `public, max-age=${EDGE_TTL_SECONDS[cacheClass(key)]}`);
    const [forClient, forCache] = [stored.clone(), stored];
    ctx.waitUntil(cache.put(cacheKey, forCache));
    return forClient;
  }
  return upstream;
}

async function notFound(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  try {
    const page = await loadObject(request, env, ctx, '404.html');
    if (page.status === 200) return finalize(page, '404.html', 404);
  } catch {
    // fall through to the plain page
  }
  const headers = withSecurityHeaders(new Headers({ 'Content-Type': 'text/plain; charset=utf-8' }));
  headers.set('Cache-Control', 'no-store');
  return new Response(request.method === 'HEAD' ? null : 'Not found\n', { status: 404, headers });
}

function badGateway(request: Request): Response {
  const headers = withSecurityHeaders(new Headers({ 'Content-Type': 'text/plain; charset=utf-8' }));
  headers.set('Cache-Control', 'no-store');
  return new Response(request.method === 'HEAD' ? null : 'Bad gateway\n', {
    status: 502,
    headers,
  });
}

/** 302, never cached: the answer depends on where the visitor is. */
function germanHomeRedirect(url: URL): Response {
  const headers = withSecurityHeaders(
    new Headers({
      Location: GERMAN_HOME + url.search,
      'Cache-Control': 'no-store',
      Vary: 'Referer, Sec-Fetch-Site',
    }),
  );
  return new Response(null, { status: 302, headers });
}

function methodNotAllowed(): Response {
  const headers = withSecurityHeaders(new Headers({ Allow: 'GET, HEAD' }));
  headers.set('Cache-Control', 'no-store');
  return new Response(null, { status: 405, headers });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/contact') return handleContact(request, env);
    if (request.method !== 'GET' && request.method !== 'HEAD') return methodNotAllowed();

    if (wantsGermanHome(request, url)) return germanHomeRedirect(url);

    const target = resolvePath(url.pathname);
    if (target.kind === 'invalid') return notFound(request, env, ctx);

    try {
      if (target.kind === 'directory') {
        // `/foo` → 301 `/foo/`, but only when the page exists.
        const probe = await signedFetch(env, target.key, 'HEAD');
        if (probe.status !== 200) {
          return probe.status === 403 || probe.status === 404
            ? await notFound(request, env, ctx)
            : badGateway(request);
        }
        const headers = withSecurityHeaders(
          new Headers({
            Location: target.location + url.search,
            'Cache-Control': 'public, max-age=3600',
          }),
        );
        return new Response(null, { status: 301, headers });
      }

      const object = await loadObject(request, env, ctx, target.key);
      if (object.status === 200) return finalize(object, target.key);
      // A private bucket answers 403 for a missing key when s3:ListBucket is not granted.
      if (object.status === 403 || object.status === 404) return await notFound(request, env, ctx);
      return badGateway(request);
    } catch {
      return badGateway(request);
    }
  },
} satisfies ExportedHandler<Env>;
