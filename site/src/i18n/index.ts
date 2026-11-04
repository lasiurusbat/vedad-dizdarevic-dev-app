import { getRelativeLocaleUrl } from 'astro:i18n';
import { de } from './de';
import { en, type Messages } from './en';

export const locales = ['en', 'de'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

const messages: Record<Locale, Messages> = { en, de };

export function isLocale(value: string | undefined): value is Locale {
  return locales.includes(value as Locale);
}

/** Locale of the current page; Astro sets `currentLocale` from the URL prefix. */
export function getLocale(currentLocale: string | undefined): Locale {
  return isLocale(currentLocale) ? currentLocale : defaultLocale;
}

export function useTranslations(locale: Locale): Messages {
  return messages[locale];
}

/** URL of a page in a locale. `path` has no leading slash, e.g. '' or 'cv'. */
export function localeUrl(locale: Locale, path = ''): string {
  return getRelativeLocaleUrl(locale, path);
}

/**
 * The same page in every locale, derived from the current pathname
 * ('/de/cv/' -> { en: '/cv/', de: '/de/cv/' }). Used by the language switch and hreflang.
 */
export function alternateUrls(pathname: string): Record<Locale, string> {
  const path = pathname.replace(/^\/de(?=\/|$)/, '').replace(/^\/+/, '');
  return { en: localeUrl('en', path), de: localeUrl('de', path) };
}
