import type { CacheClass } from './paths';

// Rollout: report-only first; flip to `Content-Security-Policy` once the browser
// console shows no violations on every page (see tech-stack.md, Security headers).
const CSP = [
  "default-src 'none'",
  "script-src 'self' https://static.cloudflareinsights.com https://challenges.cloudflare.com",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self' https://cloudflareinsights.com",
  'frame-src https://challenges.cloudflare.com',
  "form-action 'self'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "manifest-src 'self'",
  'upgrade-insecure-requests',
].join('; ');

export const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy-Report-Only': CSP,
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

/** What browsers and shared caches see. */
export const BROWSER_CACHE: Record<CacheClass, string> = {
  immutable: 'public, max-age=31536000, immutable',
  static: 'public, max-age=86400',
  html: 'public, max-age=0, must-revalidate',
};

/** How long Cloudflare's edge keeps the object (HTML is also purged on deploy). */
export const EDGE_TTL_SECONDS: Record<CacheClass, number> = {
  immutable: 31536000,
  static: 86400,
  html: 300,
};

export function withSecurityHeaders(headers: Headers): Headers {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  return headers;
}
