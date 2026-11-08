import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { SECURITY_HEADERS } from '../../worker/src/headers';
import { useTheme } from './theme-state';

/* The screenshot gallery's full-size view: each image is a link, opened in a native <dialog>. */

const CSP = SECURITY_HEADERS['Content-Security-Policy']!.split('; ')
  .filter((d) => d !== 'upgrade-insecure-requests')
  .join('; ');

const visibleLinks = (page: Page) => page.locator('[data-gallery] a[data-zoom]:visible');
const lightbox = (page: Page) => page.locator('[data-lightbox]');
const fullImage = (page: Page) => page.locator('[data-stage] img');

async function openFirst(page: Page) {
  const link = visibleLinks(page).first();
  await link.scrollIntoViewIfNeeded();
  await link.click();
  await expect(lightbox(page)).toBeVisible();
  await expect
    .poll(() => fullImage(page).evaluate((i: HTMLImageElement) => i.naturalWidth))
    .not.toBe(0);
  return link;
}

test('Sorted: an image opens at full size and closes again, focus back on its link', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/projects/sorted/');
  const link = await openFirst(page);
  const img = fullImage(page);
  expect(await img.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBe(1440);
  expect(await img.getAttribute('src')).toBe(await link.getAttribute('href'));
  expect((await img.getAttribute('alt'))!.length).toBeGreaterThan(30);
  await expect(page.locator('[data-caption]')).not.toBeEmpty();
  // Sorted's screenshots stay labelled as demo data at full size.
  await expect(lightbox(page).getByText('Demo data')).toBeVisible();
  // Fits the window as it is, so there is nothing to toggle.
  await expect(page.locator('[data-actual]')).toBeHidden();

  await page.keyboard.press('Escape');
  await expect(lightbox(page)).toBeHidden();
  await expect(link).toBeFocused();
  await expect(img).toHaveCount(0);
});

test('a light/dark pair opens the version of the active theme', async ({ page }) => {
  await useTheme(page, 'light');
  await page.goto('/projects/sorted/');
  const thumb = await visibleLinks(page).first().getAttribute('href');
  await openFirst(page);
  const light = await fullImage(page).getAttribute('src');
  expect(light).toBe(thumb);
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(lightbox(page)).toBeHidden();

  await useTheme(page, 'dark');
  await page.reload();
  await openFirst(page);
  expect(await fullImage(page).getAttribute('src')).not.toBe(light);
});

test('Rain Alert: actual size shows every pixel and can be scrolled, then fits again', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/projects/rainalert/');
  await openFirst(page);
  const img = fullImage(page);
  const stage = page.locator('[data-stage]');
  const actual = page.getByRole('button', { name: 'Actual size' });
  expect(await img.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBe(2497);
  expect(await img.evaluate((i) => i.clientWidth)).toBeLessThanOrEqual(1280);

  await actual.click();
  await expect(actual).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => img.evaluate((i) => i.clientWidth)).toBe(2497);
  await stage.evaluate((s) => s.scrollTo(s.scrollWidth, 0));
  expect(await stage.evaluate((s) => s.scrollLeft)).toBeGreaterThan(0);

  await img.click();
  await expect(actual).toHaveAttribute('aria-pressed', 'false');
  expect(await img.evaluate((i) => i.clientWidth)).toBeLessThanOrEqual(1280);
});

test('a click beside the image closes it; the page does not scroll behind it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/projects/rainalert/');
  await openFirst(page);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe(
    'hidden',
  );
  await page.locator('[data-stage]').click({ position: { x: 3, y: 3 } });
  await expect(lightbox(page)).toBeHidden();
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe(
    'hidden',
  );
});

test('a new-tab click is left to the browser', async ({ page, context }) => {
  await page.goto('/projects/sorted/');
  const link = visibleLinks(page).first();
  await link.scrollIntoViewIfNeeded();
  const [tab] = await Promise.all([
    context.waitForEvent('page'),
    link.click({ modifiers: ['ControlOrMeta'] }),
  ]);
  await expect(lightbox(page)).toBeHidden();
  await expect(tab).toHaveURL(/\/_astro\/.+\.webp$/);
  await tab.close();
});

test('on a phone the image fits with the page unscrolled sideways', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/projects/rainalert/');
  await openFirst(page);
  const box = (await fullImage(page).boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(360);
  const close = (await page.getByRole('button', { name: 'Close' }).boundingBox())!;
  expect(close.height).toBeGreaterThanOrEqual(44);
  expect(close.width).toBeGreaterThanOrEqual(44);
});

test('German labels', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/de/projects/rainalert/');
  await expect(visibleLinks(page).first()).toContainText('in voller Größe ansehen');
  await openFirst(page);
  await expect(page.getByRole('button', { name: 'Originalgröße' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Schließen' })).toBeVisible();
});

test('without JavaScript the link opens the image itself', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/projects/rainalert/');
  const link = page.locator('[data-gallery] a[data-zoom]').first();
  await link.scrollIntoViewIfNeeded();
  await link.click();
  await expect(page).toHaveURL(/\/_astro\/.+\.webp$/);
  await context.close();
});

test('works under the production CSP', async ({ page }) => {
  await page.route('**/*', async (route) => {
    if (route.request().resourceType() !== 'document') return route.continue();
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
  await page.goto('/projects/rainalert/');
  await openFirst(page);
  await page.getByRole('button', { name: 'Actual size' }).click();
  await expect.poll(() => fullImage(page).evaluate((i) => i.clientWidth)).toBe(2497);
  expect(violations).toEqual([]);
});

for (const theme of ['dark', 'light'] as const) {
  test(`the open lightbox has no axe violations (${theme})`, async ({ page }) => {
    await useTheme(page, theme);
    await page.goto('/projects/sorted/');
    await openFirst(page);
    const { violations } = await new AxeBuilder({ page }).include('[data-lightbox]').analyze();
    expect(violations).toEqual([]);
  });
}
