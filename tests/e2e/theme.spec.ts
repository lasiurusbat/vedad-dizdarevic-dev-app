import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// The header switch overrides the device setting, persists across pages, and only shows with
// JavaScript. Theme-specific images follow it, and only the visible one is downloaded.
const bg = (page: import('@playwright/test').Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

for (const scheme of ['light', 'dark'] as const) {
  const other = scheme === 'light' ? 'dark' : 'light';

  test(`switch overrides a ${scheme} device setting and persists`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/');
    const toggle = page.locator('[data-theme-toggle]');
    await expect(toggle).toBeVisible();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme');
    const before = await bg(page);

    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', other);
    expect(await bg(page)).not.toBe(before);
    await expect(toggle).toHaveAccessibleName(
      other === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
    );

    // Applied before paint on the next page (theme.js in <head>), and the page is still clean.
    await page.goto('/de/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', other);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
}

test('screenshots follow the switch; only the visible version loads', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await page.locator('[data-theme-toggle]').click();
  await page.goto('/projects/sorted/');
  const gallery = page.locator('[data-gallery]');
  await gallery.scrollIntoViewIfNeeded();
  const dark = gallery.locator('img.only-dark').first();
  const light = gallery.locator('img.only-light').first();
  await expect(dark).toBeVisible();
  await expect(light).toBeHidden();
  await expect
    .poll(() => dark.evaluate((i: HTMLImageElement) => i.naturalWidth))
    .toBeGreaterThan(0);
  expect(await light.evaluate((i: HTMLImageElement) => i.currentSrc)).toBe('');
});

test('switch is hidden without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('[data-theme-toggle]')).toBeHidden();
  await context.close();
});
