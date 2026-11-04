/**
 * First-visit language choice: visitors from the German-speaking countries land on `/de/`,
 * everyone else on `/` (English). No cookie, no stored state (the Datenschutz page promises none),
 * so the redirect must never trap someone who then chooses English. It only applies to a fresh
 * visit to exactly `/`:
 *  - `?lang=` present: the language switch's English link is `/?lang=en`, an explicit choice.
 *  - `Sec-Fetch-Site: same-origin`, or a same-origin `Referer`: the visitor is already browsing the
 *    site (e.g. clicking "Work" from a case study page, which links to `/#work`).
 * Deep links such as `/projects/x/` are never redirected.
 */

/** Germany, Austria, Switzerland, Luxembourg, Liechtenstein (ISO 3166-1 alpha-2, as Cloudflare reports it). */
export const GERMAN_COUNTRIES: ReadonlySet<string> = new Set(['DE', 'AT', 'CH', 'LU', 'LI']);

export const GERMAN_HOME = '/de/';

export function wantsGermanHome(request: Request, url: URL): boolean {
  if (url.pathname !== '/') return false;
  if (url.searchParams.has('lang')) return false;

  const country = (request.cf?.country as string | undefined)?.toUpperCase();
  if (!country || !GERMAN_COUNTRIES.has(country)) return false;

  if (request.headers.get('Sec-Fetch-Site') === 'same-origin') return false;
  const referer = request.headers.get('Referer');
  if (referer) {
    try {
      if (new URL(referer).origin === url.origin) return false;
    } catch {
      // An unparsable Referer says nothing about where the visitor came from.
    }
  }
  return true;
}
