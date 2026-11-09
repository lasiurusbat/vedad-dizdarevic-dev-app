import AxeBuilder from '@axe-core/playwright';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { themeState } from './theme-state';

// Covers every page of the site, found by following internal links from both home pages
// (plus the 404 page), so a new page is checked without touching this file.
// Per page: no horizontal scroll, no broken images, no console errors, and axe at phone width.

const WIDTHS = [360, 768, 1280];
const THEMES = ['dark', 'light'] as const;

async function discoverPages(request: APIRequestContext): Promise<string[]> {
  const seen = new Set<string>();
  const queue = ['/', '/de/'];
  while (queue.length) {
    const path = queue.shift()!;
    if (seen.has(path)) continue;
    seen.add(path);
    const res = await request.get(path);
    expect(res.status(), `GET ${path}`).toBe(200);
    for (const m of (await res.text()).matchAll(/<a\b[^>]*?\shref="([^"#?]+)[^"]*"/g)) {
      const href = m[1];
      // Internal pages only: a path ending in "/" (files such as PDFs and images are skipped).
      if (href.startsWith('/') && href.endsWith('/') && !seen.has(href)) queue.push(href);
    }
  }
  return [...seen, '/404.html'].sort();
}

async function visit(page: Page, path: string) {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  await page.goto(path, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  return errors;
}

test('the sweep finds the whole site', async ({ request }) => {
  const pages = await discoverPages(request);
  // Home, privacy policy and three case studies, in two languages, plus the 404 page.
  expect(pages.length).toBeGreaterThanOrEqual(11);
  for (const p of ['/', '/de/', '/datenschutz/', '/de/datenschutz/', '/404.html']) {
    expect(pages).toContain(p);
  }
});

for (const theme of THEMES) {
  test.describe(`${theme} theme`, () => {
    test.use({ storageState: themeState(theme) });

    for (const width of WIDTHS) {
      test(`every page at ${width}px: no overflow, no broken images, no console errors`, async ({
        page,
        request,
      }) => {
        test.setTimeout(120_000);
        await page.setViewportSize({ width, height: 900 });
        const problems: string[] = [];
        for (const path of await discoverPages(request)) {
          const errors = await visit(page, path);
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
          );
          if (overflow > 0) problems.push(`${path}: scrolls sideways by ${overflow}px`);

          // Lazy images only load when near the viewport: scroll through the page first.
          await page.evaluate(async () => {
            for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight) {
              window.scrollTo(0, y);
              await new Promise((r) => setTimeout(r, 30));
            }
            window.scrollTo(0, 0);
          });
          await page.waitForLoadState('networkidle');
          const broken = await page.evaluate(() =>
            [...document.images]
              .filter((img) => img.complete && img.naturalWidth === 0)
              .map((img) => img.currentSrc || img.src),
          );
          for (const src of broken) problems.push(`${path}: broken image ${src}`);
          for (const e of errors) problems.push(`${path}: console error: ${e}`);
        }
        expect(problems).toEqual([]);
      });
    }

    test('every page has no axe violations at phone width', async ({ page, request }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width: 360, height: 800 });
      const problems: string[] = [];
      for (const path of await discoverPages(request)) {
        await visit(page, path);
        const { violations } = await new AxeBuilder({ page }).analyze();
        for (const v of violations) problems.push(`${path}: ${v.id} (${v.nodes.length} node(s))`);
      }
      expect(problems).toEqual([]);
    });
  });
}
