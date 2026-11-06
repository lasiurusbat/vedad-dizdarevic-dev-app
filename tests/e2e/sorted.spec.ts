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
  const facts = await top('dl.facts');
  const stats = await top('dl.stats');
  const problem = await top('main h2:text-is("The problem")');
  expect(facts).toBeLessThan(stats);
  expect(stats).toBeLessThan(problem);
  // The cost card comes after the decisions, from the MDX body (one table only).
  await expect(page.locator('main table')).toHaveCount(1);
  expect(await top('main table')).toBeGreaterThan(
    await top('main h2:text-is("Decisions and trade-offs")'),
  );
});
