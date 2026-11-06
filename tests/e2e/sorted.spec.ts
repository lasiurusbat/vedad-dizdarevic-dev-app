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
  // The cost card sits in its decision's section.
  await expect(page.locator('main .cost table')).toHaveCount(1);
  expect(await top('main .cost table')).toBeGreaterThan(
    await top('main h2:text-is("Cost per environment")'),
  );
});

for (const width of [390, 1100, 1440]) {
  test(`Sorted at ${width}px: each decision opens with its trade-off ledger`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/projects/sorted/');
    const notes = page.getByRole('note', { name: 'Trade-off' });
    await expect(notes).toHaveCount(4);
    for (const note of await notes.all()) {
      await expect(note.locator('dt').filter({ hasText: 'Gained' })).toBeVisible();
      await expect(note.locator('dt').filter({ hasText: 'Price' })).toBeVisible();
      // Directly under the decision's heading, inside the text column.
      const heading = note.locator('xpath=preceding-sibling::*[1]');
      await expect(heading).toHaveJSProperty('tagName', 'H2');
      const h = (await heading.boundingBox())!;
      const box = (await note.boundingBox())!;
      expect(box.y).toBeGreaterThanOrEqual(h.y + h.height);
      expect(box.x).toBeGreaterThanOrEqual(h.x - 1);
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test('Sorted ends with the limitations table and the closing band', async ({ page }) => {
  await page.goto('/projects/sorted/');
  const limits = page.getByRole('table', { name: /Limitations of the Sorted platform/ });
  await expect(limits.getByRole('columnheader')).toHaveText(['Gap', 'Next step']);
  await expect(limits.locator('tbody tr')).toHaveCount(6);
  const band = page.getByRole('complementary', {
    name: 'Need a platform like this for your product?',
  });
  await expect(band.getByRole('link', { name: 'Get in touch' })).toHaveAttribute(
    'href',
    '/#contact',
  );
  await expect(band.getByRole('link', { name: 'See more work' })).toHaveAttribute('href', '/#work');
});
