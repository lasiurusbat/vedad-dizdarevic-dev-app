import { gzipSync } from 'node:zlib';
import { expect, test, type Page } from '@playwright/test';

/*
 * Page weight once a visitor has seen everything: each diagram mounted and each visible image
 * loaded, which Lighthouse does not see (both load on scroll). Text counts gzipped, as Cloudflare
 * serves it; fonts and images count as they are. The CV is a download, so it does not count.
 */
const KB = 1024;
const JS_WITHOUT_DIAGRAM = 20 * KB;
const JS_WITH_DIAGRAM = 140 * KB;
const CSS = 30 * KB;
const PAGE_WEIGHT = 500 * KB;

const PAGES = [
  '/',
  '/de/',
  '/404.html',
  '/de/datenschutz/',
  '/projects/sorted/',
  '/de/projects/sorted/',
  '/projects/rainalert/',
  '/de/projects/rainalert/',
  '/projects/this-site/',
  '/de/projects/this-site/',
];
const TEXT = new Set(['document', 'script', 'stylesheet']);

async function showEverything(page: Page) {
  for (const diagram of await page.locator('[data-diagram]').all()) {
    await diagram.scrollIntoViewIfNeeded();
    await expect(diagram.locator('.react-flow__node').first()).toBeVisible();
  }
  // Lazy images in a sideways gallery may never reach the viewport here. Images hidden for the
  // other theme stay out: a visitor does not load them either.
  await page.evaluate(() => {
    for (const image of document.images) {
      if (image.offsetParent) image.loading = 'eager';
    }
  });
  await expect
    .poll(() =>
      page.evaluate(() => [...document.images].every((i) => !i.offsetParent || i.complete)),
    )
    .toBe(true);
  await page.waitForLoadState('networkidle');
}

for (const path of PAGES) {
  test(`${path} stays within its budgets`, async ({ page, baseURL }) => {
    const sizes = { script: 0, stylesheet: 0, total: 0 };
    const reads: Promise<void>[] = [];
    page.on('response', (response) => {
      const url = new URL(response.url());
      if (url.origin !== new URL(baseURL!).origin) return;
      if (response.status() !== 200 || url.pathname.startsWith('/cv/')) return;
      const type = response.request().resourceType();
      reads.push(
        response.body().then((body) => {
          const size = TEXT.has(type) ? gzipSync(body).length : body.length;
          sizes.total += size;
          if (type === 'script' || type === 'stylesheet') sizes[type] += size;
        }),
      );
    });

    await page.goto(path);
    await showEverything(page);
    await Promise.all(reads);

    const hasDiagram = (await page.locator('[data-diagram]').count()) > 0;
    expect(sizes.script, 'JavaScript').toBeLessThanOrEqual(
      hasDiagram ? JS_WITH_DIAGRAM : JS_WITHOUT_DIAGRAM,
    );
    expect(sizes.stylesheet, 'CSS').toBeLessThanOrEqual(CSS);
    expect(sizes.total, 'page weight').toBeLessThanOrEqual(PAGE_WEIGHT);
  });
}
