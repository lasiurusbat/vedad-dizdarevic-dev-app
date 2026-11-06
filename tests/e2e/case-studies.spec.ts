import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Runs against the production build (no drafts): Sorted is the case study in both languages.
const studies = [
  {
    path: '/projects/sorted/',
    lang: 'en',
    title: 'Sorted: the AWS platform behind a live multi-tenant SaaS',
    problem: 'The problem',
    cta: 'Get in touch',
  },
  {
    path: '/de/projects/sorted/',
    lang: 'de',
    title: 'Sorted: die AWS-Plattform hinter einem live betriebenen Multi-Tenant-SaaS',
    problem: 'Das Problem',
    cta: 'Kontakt aufnehmen',
  },
];

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} theme`, () => {
    test.use({ colorScheme: scheme });

    for (const s of studies) {
      test(`${s.path} has no axe violations`, async ({ page }) => {
        await page.goto(s.path);
        const results = await new AxeBuilder({ page }).analyze();
        expect(results.violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([]);
      });
    }
  });
}

for (const s of studies) {
  for (const width of [360, 1280]) {
    test(`${s.path} at ${width}px: structure, no horizontal scroll`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(s.path);
      await expect(page.locator('html')).toHaveAttribute('lang', s.lang);
      await expect(page.locator('h1')).toHaveText(s.title);
      await expect(page.getByRole('heading', { level: 2, name: s.problem })).toBeVisible();
      // outcome (screen-reader heading), problem, then the MDX sections with at least one
      // decision: at least four h2 sections
      expect(await page.locator('main h2').count()).toBeGreaterThanOrEqual(4);
      // every case study ends with a link to the contact section
      const cta = page.getByRole('link', { name: s.cta });
      await expect(cta).toBeVisible();
      await expect(cta).toHaveAttribute('href', /#contact$/);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test(`${s.path} links back to the work section`, async ({ page }) => {
    await page.goto(s.path);
    // At the top of the article, and again as the secondary action in the closing band.
    const back = page.locator('main a[href$="#work"]');
    await expect(back).toHaveCount(2);
    for (const link of await back.all()) {
      await expect(link).toHaveAttribute('href', s.lang === 'en' ? '/#work' : '/de/#work');
    }
  });
}

test('the home page card opens the case study, in both languages', async ({ page }) => {
  for (const [home, href, title] of [
    ['/', '/projects/sorted/', 'Sorted'],
    ['/de/', '/de/projects/sorted/', 'Sorted'],
  ]) {
    await page.goto(home);
    const card = page
      .locator('#work')
      .getByRole('link', { name: new RegExp(title) })
      .first();
    await expect(card).toHaveAttribute('href', href);
    await card.click();
    await expect(page).toHaveURL(href);
    await expect(page.locator('h1')).toContainText(title);
  }
});

test('language switch and hreflang point at the translation', async ({ page }) => {
  await page.goto('/projects/sorted/');
  await expect(page.getByRole('link', { name: /Deutsch/ })).toHaveAttribute(
    'href',
    '/de/projects/sorted/',
  );
  const hreflangs = await page.$$eval('link[rel="alternate"][hreflang]', (links) =>
    links.map(
      (l) => `${l.getAttribute('hreflang')} ${new URL((l as HTMLLinkElement).href).pathname}`,
    ),
  );
  expect(hreflangs).toEqual([
    'en /projects/sorted/',
    'de /de/projects/sorted/',
    'x-default /projects/sorted/',
  ]);
});
