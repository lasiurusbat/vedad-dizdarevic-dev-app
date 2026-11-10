import { getCollection, type CollectionEntry } from 'astro:content';
import { type Locale, isLocale, localeUrl } from '../i18n';

export type CaseStudy = CollectionEntry<'caseStudies'>;

const showDrafts = import.meta.env.DEV || import.meta.env.SHOW_DRAFTS === '1';

/** Entry ids look like `en/my-project`; the folder is the language. */
export function localeOf(entry: CaseStudy): Locale {
  const folder = entry.id.split('/')[0];
  if (!isLocale(folder)) throw new Error(`Case study "${entry.id}" is not in an en/ or de/ folder`);
  return folder;
}

export function slugOf(entry: CaseStudy): string {
  return entry.id.split('/').slice(1).join('/');
}

export function caseStudyPath(locale: Locale, slug: string): string {
  return localeUrl(locale, `projects/${slug}`);
}

/** Published case studies in one language, in display order. */
export async function getCaseStudies(locale: Locale): Promise<CaseStudy[]> {
  const all = await getCollection('caseStudies', (e) => showDrafts || !e.data.draft);
  return all
    .filter((e) => localeOf(e) === locale)
    .sort((a, b) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title));
}

/** Static paths for the case study pages of one language: `slug` as the param, the entry as a prop. */
export async function caseStudyPaths(locale: Locale) {
  const entries = await getCaseStudies(locale);
  return entries.map((entry) => ({ params: { slug: slugOf(entry) }, props: { entry } }));
}

/** Which languages a project exists in, as locale -> path (for the language switch and hreflang). */
export async function translationsOf(slug: string): Promise<Partial<Record<Locale, string>>> {
  const all = await getCollection('caseStudies', (e) => showDrafts || !e.data.draft);
  const result: Partial<Record<Locale, string>> = {};
  for (const e of all)
    if (slugOf(e) === slug) result[localeOf(e)] = caseStudyPath(localeOf(e), slug);
  return result;
}

/**
 * The case study after this one in display order, wrapping round to the first, so every page
 * points to another. Undefined when the language has only this one.
 */
export async function nextCaseStudy(
  locale: Locale,
  slug: string,
): Promise<{ title: string; href: string } | undefined> {
  const entries = await getCaseStudies(locale);
  if (entries.length < 2) return undefined;
  const i = entries.findIndex((e) => slugOf(e) === slug);
  const next = entries[(i + 1) % entries.length];
  return {
    title: next.data.title,
    href: caseStudyPath(locale, slugOf(next)),
  };
}
