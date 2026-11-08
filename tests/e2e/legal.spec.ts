import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { useTheme } from './theme-state';

const PAGES = [
  ['/datenschutz/', 'Privacy policy', 'en'],
  ['/de/datenschutz/', 'Datenschutzerklärung', 'de'],
] as const;

for (const [path, heading, lang] of PAGES) {
  test(`${path}: names the operator and stays out of search results`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    await expect(page.locator('h1')).toHaveText(heading);
    const main = page.locator('main');
    await expect(main).toContainText('Vedad Dizdarevic');
    await expect(main.locator('a[href="mailto:hello@vedad-dizdarevic.dev"]')).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
    await expect(main).toContainText('Add Rabbit LLC');
    await expect(main).toContainText('Northern Virginia');
    // The formatter can put a line break between a link and the punctuation after it.
    expect(await main.innerText()).not.toMatch(/ [.,]/);
  });

  test(`${path}: the owner's section has no postal address`, async ({ page }) => {
    await page.goto(path);
    const owner = page.locator('main h2').first().locator('xpath=following-sibling::p[1]');
    await expect(owner).toContainText('Vedad Dizdarevic');
    expect(await owner.innerText()).not.toMatch(/\b\d{5}\b|str(\.|asse|aße)/i);
  });
}

for (const theme of ['dark', 'light'] as const) {
  for (const [path] of PAGES) {
    test(`${path} has no axe violations (${theme})`, async ({ page }) => {
      await useTheme(page, theme);
      await page.goto(path);
      const { violations } = await new AxeBuilder({ page }).analyze();
      expect(violations).toEqual([]);
    });
  }
}

test('the footer links the policy everywhere, in the language of the page', async ({ page }) => {
  for (const [from, name, href] of [
    ['/', 'Privacy policy', '/datenschutz/'],
    ['/projects/sorted/', 'Privacy policy', '/datenschutz/'],
    ['/404.html', 'Privacy policy', '/datenschutz/'],
    ['/de/', 'Datenschutz', '/de/datenschutz/'],
    ['/de/projects/sorted/', 'Datenschutz', '/de/datenschutz/'],
  ] as const) {
    await page.goto(from);
    await expect(page.locator('footer').getByRole('link', { name, exact: true })).toHaveAttribute(
      'href',
      href,
    );
  }
});

test('the two versions of the policy point at each other', async ({ page }) => {
  await page.goto('/datenschutz/');
  await expect(page.locator('link[rel="alternate"][hreflang="de"]')).toHaveAttribute(
    'href',
    /\/de\/datenschutz\/$/,
  );
});

test("the contact form's privacy note links the policy in each language", async ({ page }) => {
  for (const [path, href] of [
    ['/', '/datenschutz/'],
    ['/de/', '/de/datenschutz/'],
  ] as const) {
    await page.goto(path);
    await expect(page.locator(`[data-contact] a[href="${href}"]`)).toBeVisible();
  }
});

test('the sitemap leaves out the policy', async ({ page }) => {
  const sitemap = await (await page.request.get('/sitemap-0.xml')).text();
  expect(sitemap).toContain('/projects/sorted/');
  expect(sitemap).not.toContain('datenschutz');
});

test('the statements on cookies and storage hold: none set, nothing stored by default', async ({
  page,
  context,
}) => {
  await page.goto('/projects/sorted/');
  expect(await context.cookies()).toEqual([]);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});
