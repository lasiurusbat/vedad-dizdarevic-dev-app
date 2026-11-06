import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// The site is dark by default, whatever the device setting. The header switch turns light on,
// the choice persists across pages, and the switch only shows with JavaScript. Theme-specific
// images follow it, and only the visible one is downloaded.
const bg = (page: import('@playwright/test').Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const DARK = 'rgb(15, 16, 26)';
const WHITE = 'rgb(255, 255, 255)';

for (const device of ['light', 'dark'] as const) {
  test(`dark by default on a ${device} device; the switch turns light on and persists`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: device });
    await page.goto('/');
    const toggle = page.locator('[data-theme-toggle]');
    await expect(toggle).toBeVisible();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme');
    expect(await bg(page)).toBe(DARK);
    await expect(toggle).toHaveAccessibleName('Switch to light theme');
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0f101a');

    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(await bg(page)).toBe(WHITE);
    await expect(toggle).toHaveAccessibleName('Switch to dark theme');

    // Applied before paint on the next page (theme.js in <head>), and the page is still clean.
    await page.goto('/de/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(await bg(page)).toBe(WHITE);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#ffffff');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);

    // And back to dark.
    await page.locator('[data-theme-toggle]').click();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme');
    expect(await bg(page)).toBe(DARK);
  });
}

test('dark without JavaScript too', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, colorScheme: 'light' });
  const page = await context.newPage();
  await page.goto('/');
  expect(await bg(page)).toBe(DARK);
  await context.close();
});

test('screenshots follow the switch; only the visible version loads', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await page.locator('[data-theme-toggle]').click();
  await page.goto('/projects/sorted/');
  const gallery = page.locator('[data-gallery]');
  await gallery.scrollIntoViewIfNeeded();
  const dark = gallery.locator('img.only-dark').first();
  const light = gallery.locator('img.only-light').first();
  await expect(light).toBeVisible();
  await expect(dark).toBeHidden();
  await expect
    .poll(() => light.evaluate((i: HTMLImageElement) => i.naturalWidth))
    .toBeGreaterThan(0);
  expect(await dark.evaluate((i: HTMLImageElement) => i.currentSrc)).toBe('');
});

test('switch is hidden without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('[data-theme-toggle]')).toBeHidden();
  await context.close();
});
