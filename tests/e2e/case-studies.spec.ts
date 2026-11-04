import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// The e2e build includes the draft "example" case study (SHOW_DRAFTS=1 in playwright.config.ts).
const studies = [
  { path: '/projects/example/', lang: 'en', title: 'Example case study', problem: 'The problem' },
  {
    path: '/de/projects/example/',
    lang: 'de',
    title: 'Beispiel-Fallstudie',
    problem: 'Das Problem',
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
      // problem, decisions, outcome, links, then the MDX write-up: at least five h2 sections
      expect(await page.locator('main h2').count()).toBeGreaterThanOrEqual(5);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test(`${s.path} links back to the work section`, async ({ page }) => {
    await page.goto(s.path);
    const back = page.locator('main a[href$="#work"]');
    await expect(back).toHaveAttribute('href', s.lang === 'en' ? '/#work' : '/de/#work');
  });
}

test('the home page card opens the case study, in both languages', async ({ page }) => {
  for (const [home, href, title] of [
    ['/', '/projects/example/', 'Example case study'],
    ['/de/', '/de/projects/example/', 'Beispiel-Fallstudie'],
  ]) {
    await page.goto(home);
    const card = page.locator('#work').getByRole('link', { name: title });
    await expect(card).toHaveAttribute('href', href);
    await card.click();
    await expect(page).toHaveURL(href);
    await expect(page.locator('h1')).toHaveText(title);
  }
});

test('language switch and hreflang point at the translation', async ({ page }) => {
  await page.goto('/projects/example/');
  await expect(page.getByRole('link', { name: /Deutsch/ })).toHaveAttribute(
    'href',
    '/de/projects/example/',
  );
  const hreflangs = await page.$$eval('link[rel="alternate"][hreflang]', (links) =>
    links.map(
      (l) => `${l.getAttribute('hreflang')} ${new URL((l as HTMLLinkElement).href).pathname}`,
    ),
  );
  expect(hreflangs).toEqual([
    'en /projects/example/',
    'de /de/projects/example/',
    'x-default /projects/example/',
  ]);
});
