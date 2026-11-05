import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { SECURITY_HEADERS } from '../../worker/src/headers';

// The Worker sends the CSP in production; the static server used here does not. Re-apply it as an
// enforcing header (minus upgrade-insecure-requests, which would break plain-http localhost) so a
// violation by the diagram island shows up as a failure, not as a report nobody reads.
const CSP = SECURITY_HEADERS['Content-Security-Policy-Report-Only']!.split('; ')
  .filter((d) => d !== 'upgrade-insecure-requests')
  .join('; ');

const PAGE = '/projects/example/';

/** The diagram mounts when it scrolls into view, so bring it there first. */
async function openDiagram(page: Page) {
  await page.goto(PAGE);
  await page.locator('.diagram-mount').scrollIntoViewIfNeeded();
  const diagram = page.getByRole('group', { name: /architecture/i });
  await expect(diagram.locator('.react-flow__node-service').first()).toBeVisible();
  return diagram;
}

test.beforeEach(async ({ page }) => {
  await page.route('**/*', async (route) => {
    // The CSP travels with the HTML document; scripts, styles and fonts need no header.
    if (route.request().resourceType() !== 'document') return route.continue();
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: { ...response.headers(), 'content-security-policy': CSP },
    });
  });
  await page.addInitScript(() => {
    (window as unknown as { __csp: string[] }).__csp = [];
    document.addEventListener('securitypolicyviolation', (event) => {
      (window as unknown as { __csp: string[] }).__csp.push(
        `${event.violatedDirective}: ${event.blockedURI || 'inline'}`,
      );
    });
  });
});

test('diagram renders under the production CSP without violations', async ({ page }) => {
  const diagram = await openDiagram(page);
  await expect(diagram.locator('.react-flow__node-service')).toHaveCount(15);
  await expect(diagram.locator('.react-flow__edge')).toHaveCount(15);
  expect(await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp)).toEqual([]);
});

for (const scheme of ['light', 'dark'] as const) {
  test(`${scheme} theme: the mounted diagram has no axe violations`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await openDiagram(page);
    const results = await new AxeBuilder({ page }).include('figure').analyze();
    expect(results.violations).toEqual([]);
  });
}

test('text alternative lists the flow', async ({ page }) => {
  await page.goto(PAGE);
  await page.goto(PAGE);
  await page.getByText('Text description of the diagram').click();
  await expect(page.getByRole('listitem').filter({ hasText: 'GuardDuty scans' })).toBeVisible();
});

test('mobile: page keeps its width, scrolls over the diagram, text stays readable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  const diagram = await openDiagram(page);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  // React Flow's d3-zoom sets touch-action: none, which would trap a vertical swipe.
  expect(
    await diagram.locator('.react-flow__pane').evaluate((el) => getComputedStyle(el).touchAction),
  ).not.toBe('none');
  // Text keeps at least ~10px at the rendered zoom (13px font x zoom).
  const zoom = await diagram.locator('.react-flow__viewport').evaluate((el) => {
    const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
    return m.a;
  });
  expect(zoom * 13).toBeGreaterThanOrEqual(10);
  const before = await page.evaluate(() => window.scrollY);
  const d = (await page.locator('.diagram-mount').boundingBox())!;
  await page.mouse.move(d.x + d.width / 2, d.y + d.height / 2);
  await page.mouse.wheel(0, 300);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
});

test('screenshots for review', async ({ page }) => {
  const diagram = await openDiagram(page);
  await page.waitForTimeout(500);
  await diagram.screenshot({ path: 'screenshots/diagram-desktop.png' });
  await page.setViewportSize({ width: 360, height: 740 });
  await openDiagram(page);
  await page.waitForTimeout(500);
  await diagram.screenshot({ path: 'screenshots/diagram-mobile.png' });
});
