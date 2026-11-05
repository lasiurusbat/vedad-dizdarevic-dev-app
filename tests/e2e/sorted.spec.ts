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
  await expect(page.getByText('Source code: private repository')).toBeVisible();
  const imgs = page.locator('figure img');
  await expect(imgs).toHaveCount(3);
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
