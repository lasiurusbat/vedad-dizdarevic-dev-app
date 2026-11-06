import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

for (const scheme of ['light', 'dark'] as const) {
  test(`Sorted case study has no axe violations (${scheme})`, async ({ browser }) => {
    const page = await (await browser.newContext({ colorScheme: scheme })).newPage();
    await page.goto('/projects/sorted/');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([]);
  });
}

test('Sorted case study: private repo noted, screenshots served from /_astro/ with alt text', async ({
  page,
}) => {
  await page.goto('/projects/sorted/');
  // The fact sheet closes with the source row; a private repository is noted, never linked.
  const source = page.locator('.fact').filter({ hasText: 'Source code' });
  await expect(source.locator('dd')).toHaveText('Private repository');
  await expect(source.locator('a')).toHaveCount(0);
  // Three screenshots, each as a light/dark pair; only the version for the active theme shows.
  const imgs = page.locator('figure img');
  await expect(imgs).toHaveCount(6);
  await expect(page.locator('figure img:visible')).toHaveCount(3);
  for (const img of await imgs.all()) {
    expect(await img.getAttribute('src')).toMatch(/^\/_astro\/.+\.webp$/);
    expect((await img.getAttribute('alt'))!.length).toBeGreaterThan(30);
  }
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('Sorted is on the home page work section', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#work').getByRole('link', { name: /Sorted/ })).toBeVisible();
});

test('Sorted: fact sheet, then stats, then the problem; the cost card sits in the body', async ({
  page,
}) => {
  await page.goto('/projects/sorted/');
  const top = async (selector: string) => (await page.locator(selector).first().boundingBox())!.y;
  const facts = await top('.facts');
  const stats = await top('dl.stats');
  const problem = await top('main h2:text-is("The problem")');
  expect(facts).toBeLessThan(stats);
  expect(stats).toBeLessThan(problem);
  // The cost card sits in its decision's section (one table only).
  await expect(page.locator('main table')).toHaveCount(1);
  expect(await top('main table')).toBeGreaterThan(
    await top('main h2:text-is("Cost per environment")'),
  );
});

for (const width of [390, 1440]) {
  test(`Sorted at ${width}px: each decision section has its trade-off note`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/projects/sorted/');
    const notes = page.getByRole('note', { name: 'Trade-off' });
    await expect(notes).toHaveCount(4);
    const text = (await page.locator('.prose > p').first().boundingBox())!;
    for (const note of await notes.all()) {
      await expect(note.getByText('Gained', { exact: true })).toBeVisible();
      await expect(note.getByText('Price', { exact: true })).toBeVisible();
      const box = (await note.boundingBox())!;
      if (width >= 1280) {
        // Desktop: in the right column, beside the text, never over it.
        expect(box.x).toBeGreaterThanOrEqual(text.x + text.width);
      } else {
        // Phones: in the text column, under the heading.
        expect(box.x + box.width).toBeLessThanOrEqual(text.x + text.width + 1);
      }
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
