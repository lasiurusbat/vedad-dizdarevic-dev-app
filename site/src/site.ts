/** Site-wide constants that are not translated. */
import type { Locale } from './i18n';

export const GITHUB_URL = 'https://github.com/lasiurusbat';
export const LINKEDIN_URL = 'https://www.linkedin.com/in/vedad-dizdarevic-b154305/';
/**
 * Each language in its own language, so the switch reads correctly in either UI locale. The link
 * text is "EN" plus a screen-reader-only "English": WCAG 2.5.3 wants the accessible name to start
 * with the visible text.
 */
export const LANGUAGE_NAMES = { en: 'English', de: 'Deutsch' } as const;
export const OWNER = 'Vedad Dizdarevic';

/**
 * Turnstile site key: public by design (Terraform output `turnstile_site_key`). `astro dev` uses
 * Cloudflare's always-pass test key, because the real one only works on the live domain. The
 * production build must never fall back to the test key, which would pass everything.
 */
const TURNSTILE_LIVE_KEY = '0x4AAAAAAFxPwm9i2F3KvORZ';
export const TURNSTILE_SITE_KEY: string =
  import.meta.env.PUBLIC_TURNSTILE_SITE_KEY ??
  (import.meta.env.DEV ? '1x00000000000000000000AA' : TURNSTILE_LIVE_KEY);

/** The CV in a language. Built from cv/data.yaml by cv/build.sh as part of the site build. */
export const cvUrl = (locale: Locale) => `/cv/Vedad_Dizdarevic_CV_${locale.toUpperCase()}.pdf`;
/** The share image of a page: a case study by its slug, otherwise the home page's. */
export const ogImagePath = (locale: Locale, slug = 'home') => `/og/${slug}-${locale}.png`;
export const CONTACT_EMAIL = 'hello@vedad-dizdarevic.dev';
