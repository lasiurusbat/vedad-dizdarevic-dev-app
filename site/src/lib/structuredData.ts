import { localeUrl, useTranslations, type Locale } from '../i18n';
import { GITHUB_URL, LINKEDIN_URL, OWNER, ogImagePath } from '../site';

/** schema.org data for search engines. Facts only: nothing here that the pages do not show. */
const SITE = 'https://vedad-dizdarevic.dev';

export function personLd(locale: Locale) {
  return {
    '@type': 'Person',
    name: OWNER,
    jobTitle: useTranslations(locale).role,
    url: new URL(localeUrl(locale), SITE).href,
    sameAs: [GITHUB_URL, LINKEDIN_URL],
  };
}

export function articleLd(
  locale: Locale,
  headline: string,
  description: string,
  path: string,
  slug: string,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    description,
    inLanguage: locale,
    url: new URL(path, SITE).href,
    image: new URL(ogImagePath(locale, slug), SITE).href,
    author: personLd(locale),
  };
}
