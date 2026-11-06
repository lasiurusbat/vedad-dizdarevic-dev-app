import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { themeState } from './theme-state';

const widths = [360, 390, 768, 1280];
const schemes = ['light', 'dark'] as const;
const pages = [
  { path: '/', lang: 'en', contact: 'Contact', other: { label: /Deutsch/, href: '/de/' } },
  { path: '/de/', lang: 'de', contact: 'Kontakt', other: { label: /English/, href: '/?lang=en' } },
];
// The header shows every link inline from the `lg` breakpoint (1024px) up.
const INLINE_NAV_MIN = 1024;

async function contactLink(page: Page, name: string, width: number) {
  if (width < INLINE_NAV_MIN) await page.locator('details[data-menu] summary').click();
  return page.getByRole('link', { name, exact: true }).first();
}

for (const scheme of schemes) {
  test.describe(`${scheme} theme`, () => {
    test.use({ storageState: themeState(scheme) });

    for (const p of pages) {
      for (const width of widths) {
        test(`${p.path} at ${width}px`, async ({ page }, testInfo) => {
          await page.setViewportSize({ width, height: 900 });
          await page.goto(p.path);
          await page.evaluate(() => document.fonts.ready);

          await expect(page.locator('html')).toHaveAttribute('lang', p.lang);

          // No horizontal scroll.
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
          );
          expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(0);

          // The Contact link is reachable from the header (inline, or inside the menu).
          const contact = await contactLink(page, p.contact, width);
          await expect(contact).toBeVisible();
          await page.keyboard.press('Escape');

          // The language switch is always visible and points at the equivalent page.
          const other = page.getByRole('link', { name: p.other.label });
          await expect(other.first()).toBeVisible();
          await expect(other.first()).toHaveAttribute('href', p.other.href);

          // Touch targets in the header are at least 44px tall.
          const small = await page.evaluate(() =>
            [...document.querySelectorAll('header a, header summary')]
              .filter((el) => (el as HTMLElement).offsetParent !== null)
              .map((el) => ({ text: el.textContent?.trim(), h: el.getBoundingClientRect().height }))
              .filter((x) => x.h < 44),
          );
          expect(small, 'header targets under 44px').toEqual([]);

          const shot = await page.screenshot({
            fullPage: true,
            path: `screenshots/${p.lang}-${width}-${scheme}.png`,
          });
          await testInfo.attach(`${p.lang}-${width}-${scheme}`, {
            body: shot,
            contentType: 'image/png',
          });
        });
      }

      test(`${p.path} has no axe violations`, async ({ page }) => {
        await page.goto(p.path);
        const results = await new AxeBuilder({ page }).analyze();
        expect(results.violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([]);
      });

      test(`${p.path} menu has no axe violations when open`, async ({ page }) => {
        await page.setViewportSize({ width: 360, height: 800 });
        await page.goto(p.path);
        await page.locator('details[data-menu] summary').click();
        const results = await new AxeBuilder({ page }).analyze();
        expect(results.violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([]);
      });
    }

    test('404 page has no axe violations', async ({ page }) => {
      await page.goto('/404.html');
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([]);
    });
  });
}

test.describe('menu', () => {
  test('opens and closes without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 360, height: 800 },
    });
    const page = await context.newPage();
    await page.goto('/');
    const details = page.locator('details[data-menu]');
    await expect(details).not.toHaveAttribute('open', '');
    await details.locator('summary').click();
    await expect(details.getByRole('link', { name: 'Contact', exact: true })).toBeVisible();
    await context.close();
  });

  test('closes after choosing a link and on Escape (with JavaScript)', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/');
    const details = page.locator('details[data-menu]');
    await details.locator('summary').click();
    await expect(details).toHaveAttribute('open', '');
    await page.keyboard.press('Escape');
    await expect(details).not.toHaveAttribute('open', '');
    await details.locator('summary').click();
    await page.getByRole('link', { name: 'About', exact: true }).first().click();
    await expect(details).not.toHaveAttribute('open', '');
  });
});

test('skip link is the first tab stop and lands on main', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);
});

test('no inline scripts or styles (CSP)', async ({ page }) => {
  for (const path of ['/', '/de/', '/404.html']) {
    await page.goto(path);
    const inline = await page.evaluate(() => ({
      scripts: [...document.scripts].filter((s) => !s.src).length,
      styles: document.querySelectorAll('style').length,
      styleAttrs: document.querySelectorAll('[style]').length,
    }));
    expect(inline, path).toEqual({ scripts: 0, styles: 0, styleAttrs: 0 });
  }
});
