import { execFileSync } from 'node:child_process';
import type { APIRoute } from 'astro';
import { locales, useTranslations, type Locale } from '../../i18n';
import { getCaseStudies, slugOf } from '../../lib/caseStudies';
import { OWNER, ogImagePath } from '../../site';

/** The picture a shared link shows, one per page and language, rendered with Typst at build time. */
interface Card {
  lang: Locale;
  heading: string;
  detail: string;
  role: string;
}

export async function getStaticPaths() {
  const paths: { params: { name: string }; props: Card }[] = [];
  const nameOf = (path: string) => path.replace(/^\/og\/|\.png$/g, '');
  for (const lang of locales) {
    const t = useTranslations(lang);
    // The name is the wordmark on every card, so the home card leads with the role.
    paths.push({
      params: { name: nameOf(ogImagePath(lang)) },
      props: { lang, heading: t.role, detail: t.availability, role: '' },
    });
    for (const entry of await getCaseStudies(lang)) {
      // "Sorted: the AWS platform behind ..." becomes a large name and a line of detail.
      const [heading = '', ...rest] = entry.data.title.split(': ');
      paths.push({
        params: { name: nameOf(ogImagePath(lang, slugOf(entry))) },
        props: { lang, heading, detail: rest.join(': '), role: t.role },
      });
    }
  }
  return paths;
}

export const GET: APIRoute = ({ props }) => {
  const { lang, heading, detail, role } = props as Card;
  const inputs = Object.entries({ name: OWNER, lang, heading, detail, role }).flatMap(
    ([key, value]) => ['--input', `${key}=${value}`],
  );
  const png = execFileSync(
    'typst',
    [
      'compile',
      'src/og/card.typ',
      '-',
      '--format',
      'png',
      '--ppi',
      '72',
      '--root',
      '.',
      '--font-path',
      '../cv/fonts',
      '--ignore-system-fonts',
      ...inputs,
    ],
    { maxBuffer: 5 * 1024 * 1024 },
  );
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
