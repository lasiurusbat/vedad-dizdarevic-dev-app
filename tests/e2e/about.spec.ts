import { expect, test } from '@playwright/test';

const pages = [
  {
    path: '/',
    sortedHref: '/projects/sorted/',
    factsTitle: 'At a glance',
    labels: [
      'Background',
      'Training',
      'Working towards',
      'Open to',
      'Languages',
      'Away from the terminal',
    ],
  },
  {
    path: '/de/',
    sortedHref: '/de/projects/sorted/',
    factsTitle: 'Auf einen Blick',
    labels: [
      'Hintergrund',
      'Weiterbildung',
      'In Vorbereitung',
      'Offen für',
      'Sprachen',
      'Abseits des Terminals',
    ],
  },
];

for (const p of pages) {
  test.describe(`About on ${p.path}`, () => {
    test('has a lead, two body paragraphs and a facts list', async ({ page }) => {
      await page.goto(p.path);
      const about = page.locator('#about');
      await expect(about.locator('.prose > p')).toHaveCount(3);

      const facts = about.getByRole('complementary', { name: p.factsTitle });
      await expect(facts).toBeVisible();
      await expect(facts.locator('dt')).toHaveText(p.labels);
      // Every label has a non-empty value next to it.
      for (const dd of await facts.locator('dd').all()) {
        await expect(dd).not.toBeEmpty();
      }
      await expect(facts.locator('dd')).toHaveCount(p.labels.length);
    });

    test('the lead is set larger than the body paragraphs', async ({ page }) => {
      await page.goto(p.path);
      const size = (selector: string) =>
        page.locator(selector).evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      const lead = await size('#about .prose > p:nth-child(1)');
      const body = await size('#about .prose > p:nth-child(2)');
      expect(lead).toBeGreaterThan(body);
    });

    test('links Sorted in the second body paragraph only', async ({ page }) => {
      await page.goto(p.path);
      const links = page.locator('#about .prose').getByRole('link');
      await expect(links).toHaveCount(1);
      await expect(links).toHaveText('Sorted');
      await expect(links).toHaveAttribute('href', p.sortedHref);
      await expect(page.locator('#about .prose > p:nth-child(3) a')).toHaveCount(1);
    });

    test('facts sit beside the text on desktop and below it on phones', async ({ page }) => {
      const box = async (selector: string) => (await page.locator(selector).boundingBox())!;

      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(p.path);
      let text = await box('#about .prose');
      let facts = await box('#about aside');
      expect(facts.x).toBeGreaterThanOrEqual(text.x + text.width);
      expect(Math.abs(facts.y - text.y)).toBeLessThan(40);

      await page.setViewportSize({ width: 390, height: 900 });
      text = await box('#about .prose');
      facts = await box('#about aside');
      expect(facts.y).toBeGreaterThanOrEqual(text.y + text.height);
      // Same left edge and nothing wider than the viewport.
      expect(Math.abs(facts.x - text.x)).toBeLessThan(2);
      expect(facts.x + facts.width).toBeLessThanOrEqual(390);
    });

    test('body text stays under 80 characters per line', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(p.path);
      // Longest rendered line, counted character by character across every text node (the
      // paragraph contains a link), grouping characters by their vertical position.
      const longest = await page.locator('#about .prose > p:nth-child(3)').evaluate((el) => {
        const lines = new Map<number, number>();
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const range = document.createRange();
        for (
          let node = walker.nextNode() as Text | null;
          node;
          node = walker.nextNode() as Text | null
        ) {
          for (let i = 0; i < node.length; i++) {
            range.setStart(node, i);
            range.setEnd(node, i + 1);
            const top = Math.round(range.getBoundingClientRect().top / 4);
            lines.set(top, (lines.get(top) ?? 0) + 1);
          }
        }
        return Math.max(...lines.values());
      });
      // Guard: a paragraph this long must wrap, so the measure really counted lines.
      expect(longest).toBeGreaterThan(30);
      expect(longest).toBeLessThan(80);
    });
  });
}
