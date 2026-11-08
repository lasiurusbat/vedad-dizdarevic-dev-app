import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { SECURITY_HEADERS } from '../../worker/src/headers';

const SITE = 'https://vedad-dizdarevic.dev';
const CSP = SECURITY_HEADERS['Content-Security-Policy']!.split('; ')
  .filter((d) => d !== 'upgrade-insecure-requests')
  .join('; ');

const DIST = new URL('../../site/dist/', import.meta.url);
const sitemap = () => readFile(new URL('sitemap-0.xml', DIST), 'utf8');

/** Every page the sitemap lists, as a path. */
async function sitemapPaths(): Promise<string[]> {
  return [...(await sitemap()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (m) => new URL(m[1]!).pathname,
  );
}

const jsonLd = async (page: Page) =>
  JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? '') as {
    '@type': string;
    [key: string]: unknown;
  };

test('every page has its own title and description, and a canonical URL to itself', async ({
  page,
}) => {
  const paths = await sitemapPaths();
  expect(paths.length).toBeGreaterThanOrEqual(8);
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  for (const path of paths) {
    await page.goto(path);
    titles.add(await page.title());
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description?.length, path).toBeGreaterThanOrEqual(70);
    descriptions.add(description!);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${SITE}${path}`);
    await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(3);
  }
  expect(titles.size).toBe(paths.length);
  expect(descriptions.size).toBe(paths.length);
});

test('the sitemap lists each page with its translation, and robots.txt points at it', async () => {
  const xml = await sitemap();
  const paths = await sitemapPaths();
  for (const path of ['/', '/de/', '/projects/sorted/', '/de/projects/sorted/']) {
    expect(paths).toContain(path);
  }
  expect(paths.some((p) => p.includes('404') || p.startsWith('/og/'))).toBe(false);
  expect(xml).toContain(`hreflang="de" href="${SITE}/de/"`);
  const robots = await readFile(new URL('robots.txt', DIST), 'utf8');
  expect(robots).toContain(`Sitemap: ${SITE}/sitemap-index.xml`);
});

test('every page has share tags and its own 1200 x 630 PNG', async ({ page }) => {
  const paths = await sitemapPaths();
  const images = new Set<string>();
  const content = (selector: string) => page.locator(selector).getAttribute('content');
  for (const path of paths) {
    await page.goto(path);
    expect(await content('meta[property="og:title"]'), path).toBe(await page.title());
    expect(await content('meta[property="og:description"]'), path).toBe(
      await content('meta[name="description"]'),
    );
    expect(await content('meta[property="og:url"]'), path).toBe(`${SITE}${path}`);
    expect(await content('meta[property="og:type"]'), path).toBe(
      path.includes('/projects/') ? 'article' : 'website',
    );
    const german = path.startsWith('/de/');
    expect(await content('meta[property="og:locale"]'), path).toBe(german ? 'de_DE' : 'en_US');
    expect(await content('meta[property="og:locale:alternate"]'), path).toBe(
      german ? 'en_US' : 'de_DE',
    );
    expect(await content('meta[name="twitter:card"]'), path).toBe('summary_large_image');

    const url = new URL((await content('meta[property="og:image"]'))!);
    expect(url.origin, path).toBe(SITE);
    images.add(url.pathname);
    // Over HTTP, as a crawler gets it; width and height are in the PNG's first chunk.
    const response = await page.request.get(url.pathname);
    expect(response.headers()['content-type'], path).toBe('image/png');
    const png = await response.body();
    expect(png.subarray(1, 4).toString(), path).toBe('PNG');
    expect([png.readUInt32BE(16), png.readUInt32BE(20)], path).toEqual([1200, 630]);
    expect(png.length, path).toBeLessThan(300 * 1024);
  }
  expect(images.size).toBe(paths.length);
});

test('the 404 page claims no canonical URL or translations', async ({ page }) => {
  await page.goto('/404.html');
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(0);
  await expect(page.locator('meta[property="og:url"]')).toHaveCount(0);
});

for (const [path, role] of [
  ['/', 'Cloud & DevOps Engineer'],
  ['/de/', 'Cloud- & DevOps-Engineer'],
] as const) {
  test(`${path}: JSON-LD names the person, with GitHub and LinkedIn`, async ({ page }) => {
    await page.goto(path);
    expect(await jsonLd(page)).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: 'Vedad Dizdarevic',
      jobTitle: role,
      url: `${SITE}${path}`,
      sameAs: [
        'https://github.com/lasiurusbat',
        'https://www.linkedin.com/in/vedad-dizdarevic-b154305/',
      ],
    });
  });
}

test('a case study has JSON-LD for an article by that person, in its language', async ({
  page,
}) => {
  await page.goto('/de/projects/sorted/');
  const data = await jsonLd(page);
  expect(data).toMatchObject({
    '@type': 'Article',
    inLanguage: 'de',
    url: `${SITE}/de/projects/sorted/`,
    author: { '@type': 'Person', name: 'Vedad Dizdarevic' },
  });
  expect(data.headline).toBe(await page.locator('h1').textContent());
});

test('the JSON-LD block breaks nothing under the production CSP', async ({ page }) => {
  await page.route('**/*', async (route) => {
    if (route.request().resourceType() !== 'document') return route.fallback();
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: { ...response.headers(), 'content-security-policy': CSP },
    });
  });
  const violations: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && /Content Security Policy/i.test(m.text()))
      violations.push(m.text());
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(violations).toEqual([]);
});
