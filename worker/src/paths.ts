export type Resolved =
  | { kind: 'object'; key: string }
  | { kind: 'directory'; key: string; location: string }
  | { kind: 'invalid' };

/**
 * Maps a request path to an S3 key.
 *  - `/` and `/foo/`  → `index.html`, `foo/index.html`
 *  - `/foo.css`       → `foo.css`
 *  - `/foo` (no extension, no slash) → `directory`: the caller checks that
 *    `foo/index.html` exists and redirects to `/foo/`, otherwise it is a 404.
 */
export function resolvePath(pathname: string): Resolved {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return { kind: 'invalid' };
  }
  if (!decoded.startsWith('/') || decoded.includes('\0') || decoded.includes('\\')) {
    return { kind: 'invalid' };
  }

  const trailingSlash = decoded.endsWith('/');
  const segments = decoded.slice(1).split('/');
  if (trailingSlash) segments.pop();
  if (segments.some((s) => s === '' || s === '.' || s === '..')) return { kind: 'invalid' };

  const dir = segments.join('/');
  if (trailingSlash) {
    return { kind: 'object', key: dir === '' ? 'index.html' : `${dir}/index.html` };
  }
  const last = segments[segments.length - 1] ?? '';
  if (last.includes('.')) return { kind: 'object', key: dir };
  return { kind: 'directory', key: `${dir}/index.html`, location: `${pathname}/` };
}

export type CacheClass = 'immutable' | 'static' | 'html';

/** Cache policy by key: hashed assets forever, media for a day, everything else revalidated. */
export function cacheClass(key: string): CacheClass {
  if (key.startsWith('_astro/')) return 'immutable';
  if (/\.(pdf|woff2?|png|jpe?g|webp|avif|gif|svg|ico)$/i.test(key)) return 'static';
  return 'html';
}
