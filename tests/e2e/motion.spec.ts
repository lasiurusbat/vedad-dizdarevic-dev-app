import { expect, test, type Locator, type Page } from '@playwright/test';

/*
 * Behaviour that lives in small client scripts and CSS motion: the screenshot gallery's buttons
 * and edge fades, the random hero architecture variant, and what prefers-reduced-motion turns off.
 */

const gallery = (page: Page) => page.locator('[data-gallery]').first();
const scrollLeft = (track: Locator) => track.evaluate((el) => el.scrollLeft);

/** Clicks a gallery button and waits until the smooth scroll it starts has come to rest. */
async function step(button: Locator, track: Locator) {
  const before = await scrollLeft(track);
  await button.click();
  await expect.poll(() => scrollLeft(track)).not.toBe(before);
  await expect
    .poll(() =>
      track.evaluate(
        (el) =>
          new Promise<boolean>((done) => {
            const a = el.scrollLeft;
            setTimeout(() => done(el.scrollLeft === a), 150);
          }),
      ),
    )
    .toBe(true);
}

test.describe('screenshot gallery', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('prev/next buttons and edge fades follow the scroll position', async ({ page }) => {
    await page.goto('/projects/sorted/');
    const root = gallery(page);
    await root.scrollIntoViewIfNeeded();
    const track = root.locator('[data-track]');
    const prev = root.getByRole('button', { name: 'Previous screenshot' });
    const next = root.getByRole('button', { name: 'Next screenshot' });

    // At the start: only the end fades, only "next" works.
    await expect(prev).toBeVisible();
    await expect(prev).toBeDisabled();
    await expect(next).toBeEnabled();
    await expect(track).toHaveClass(/fade-end/);
    await expect(track).not.toHaveClass(/fade-start/);

    // One step in: both edges fade, both buttons work.
    await step(next, track);
    await expect(track).toHaveClass(/fade-start/);
    await expect(prev).toBeEnabled();

    // To the end: the end fade goes, "next" is disabled.
    for (let i = 0; i < 10 && (await next.isEnabled()); i++) await step(next, track);
    await expect(next).toBeDisabled();
    await expect(track).not.toHaveClass(/fade-end/);
    await expect(track).toHaveClass(/fade-start/);

    // And back to the start.
    for (let i = 0; i < 10 && (await prev.isEnabled()); i++) await step(prev, track);
    await expect(prev).toBeDisabled();
    await expect.poll(() => scrollLeft(track)).toBeLessThanOrEqual(2);
    await expect(track).not.toHaveClass(/fade-start/);
  });

  test('the buttons are labelled in German', async ({ page }) => {
    await page.goto('/de/projects/sorted/');
    const root = gallery(page);
    await expect(root.getByRole('button', { name: 'Vorheriger Screenshot' })).toBeDisabled();
    await expect(root.getByRole('button', { name: 'Nächster Screenshot' })).toBeEnabled();
  });

  test('without JavaScript the row still scrolls and the buttons stay hidden', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();
    await page.goto('/projects/sorted/');
    const root = gallery(page);
    await expect(root.locator('[data-controls]')).toBeHidden();
    const track = root.locator('[data-track]');
    await expect(track).toHaveCSS('overflow-x', 'auto');
    expect(await track.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    await context.close();
  });
});

test.describe('hero architecture', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  const visible = (page: Page) => page.locator('[data-hero-arch] [data-variant]:not(.is-hidden)');

  test('exactly one variant shows, and never the same one twice in a row', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-hero-arch] [data-variant]')).toHaveCount(3);
    let last: string | null = null;
    for (let i = 0; i < 6; i++) {
      if (i > 0) await page.reload();
      await expect(visible(page)).toHaveCount(1);
      await expect(visible(page)).toBeVisible();
      const id = await visible(page).getAttribute('data-variant');
      expect(id).not.toBe(last);
      last = id;
    }
  });

  test('still exactly one variant when sessionStorage is blocked', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'sessionStorage', {
        get() {
          throw new DOMException('blocked', 'SecurityError');
        },
      });
    });
    await page.goto('/');
    await expect(visible(page)).toHaveCount(1);
    await expect(visible(page)).toBeVisible();
  });

  test('hidden on phones, so the calls to action stay in the first view', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.locator('[data-hero-arch]')).toBeHidden();
  });
});

test.describe('reduced motion', () => {
  test.use({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });

  test('the hero does not animate', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-hero-arch]')).toHaveCSS('animation-name', 'none');
    await expect(page.locator('.status-dot').first()).toHaveCSS('animation-name', 'none');
    // The travelling packets are gone; the picked variant itself still shows.
    const shown = page.locator('[data-hero-arch] [data-variant]:not(.is-hidden)');
    await expect(shown).toBeVisible();
    for (const pkt of await shown.locator('.pkt').all()) await expect(pkt).toBeHidden();
  });

  test('the gallery neither zooms nor scrolls smoothly', async ({ page }) => {
    await page.goto('/projects/sorted/');
    const root = gallery(page);
    await root.scrollIntoViewIfNeeded();
    const img = root.locator('.shot img:visible').first();
    await expect(img).toHaveCSS('animation-name', 'none');
    await img.hover();
    await expect(img).toHaveCSS('transform', 'none');

    // Instant scroll: the position has moved in the same task as the click.
    const track = root.locator('[data-track]');
    const moved = await track.evaluate((el) => {
      el.closest('[data-gallery]')!.querySelector<HTMLButtonElement>('[data-next]')!.click();
      return el.scrollLeft;
    });
    expect(moved).toBeGreaterThan(0);
  });
});

test('with motion allowed, the gallery zooms on hover', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/projects/sorted/');
  const root = gallery(page);
  await root.scrollIntoViewIfNeeded();
  const img = root.locator('.shot img:visible').first();
  await img.hover();
  await expect(img).not.toHaveCSS('transform', 'none');
});
