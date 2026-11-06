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
async function openDiagram(page: Page, path = PAGE) {
  await page.goto(path);
  await page.locator('.diagram-mount').first().scrollIntoViewIfNeeded();
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

test('the Sorted case study shows the diagram under the production CSP', async ({ page }) => {
  const diagram = await openDiagram(page, '/projects/sorted/');
  await expect(diagram.locator('.react-flow__node-service')).toHaveCount(15);
  expect(await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp)).toEqual([]);
  await expect(page.getByRole('heading', { name: 'Architecture' })).toBeVisible();
});

test('the Sorted case study shows the release path under the production CSP', async ({ page }) => {
  await page.goto('/projects/sorted/');
  await page.locator('[data-diagram="sorted-release"]').scrollIntoViewIfNeeded();
  const diagram = page.getByRole('group', { name: /release/i });
  await expect(diagram.locator('.react-flow__node-service')).toHaveCount(8);
  await expect(diagram.locator('.react-flow__edge')).toHaveCount(7);
  expect(await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp)).toEqual([]);
});

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

test('desktop: dragging works only after zooming in, the wheel scrolls the page', async ({
  page,
}) => {
  const diagram = await openDiagram(page);
  const viewport = diagram.locator('.react-flow__viewport');
  const transform = () => viewport.evaluate((el) => getComputedStyle(el).transform);
  const box = (await diagram.boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const drag = async () => {
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 80, cy + 40, { steps: 6 });
    await page.mouse.up();
  };

  // At the fitted view the whole diagram is visible: dragging does nothing.
  await expect(diagram).toHaveAttribute('data-pan', 'false');
  const fitted = await transform();
  await drag();
  expect(await transform()).toBe(fitted);

  // The plain wheel scrolls the page.
  const scrollBefore = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 300);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollBefore);

  // Ctrl+wheel zooms in; from then on dragging pans.
  await page.mouse.move(cx, cy);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -400);
  await page.keyboard.up('Control');
  await expect(diagram).toHaveAttribute('data-pan', 'true');
  const zoomed = await transform();
  expect(zoomed).not.toBe(fitted);
  await drag();
  expect(await transform()).not.toBe(zoomed);
});

test('desktop: the figure is wider and taller than the text column', async ({ page }) => {
  const diagram = await openDiagram(page);
  const box = (await diagram.boundingBox())!;
  expect(box.width).toBeGreaterThan(1000);
  expect(box.height).toBeGreaterThanOrEqual(700);
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

test('path buttons trace one path and dim the rest, under the production CSP', async ({ page }) => {
  // Hidden until the diagram mounts, so a visitor without JavaScript never sees dead buttons.
  await page.goto('/projects/sorted/');
  const bar = page.getByRole('group', { name: 'Trace a path' });
  await expect(bar).toBeHidden();
  const diagram = await openDiagram(page, '/projects/sorted/');
  await expect(bar).toBeVisible();
  await expect(bar.getByRole('button')).toHaveCount(4);
  await expect(bar.getByRole('button', { name: 'Everything' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await bar.getByRole('button', { name: 'Mail' }).click();
  await expect(bar.getByRole('button', { name: 'Mail' })).toHaveAttribute('aria-pressed', 'true');
  await expect(bar.getByRole('button', { name: 'Everything' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await expect(diagram.locator('.react-flow__node-service.vdd-on')).toHaveCount(8);
  await expect(diagram.locator('.react-flow__node-service.vdd-dim')).toHaveCount(7);
  await expect(diagram.locator('.react-flow__edge.vdd-on')).toHaveCount(8);
  await expect(page.locator('[data-path-status]')).toContainText('SES receipt rule');

  await bar.getByRole('button', { name: 'Releases' }).click();
  await expect(diagram.locator('.react-flow__node-service.vdd-on')).toHaveCount(4);

  await bar.getByRole('button', { name: 'Everything' }).click();
  await expect(diagram.locator('.vdd-on, .vdd-dim')).toHaveCount(0);
  await expect(page.locator('[data-path-status]')).toBeEmpty();

  // Only the production diagram has paths; the release diagram has no buttons.
  await expect(page.locator('[data-paths]')).toHaveCount(1);
  expect(await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp)).toEqual([]);
  const results = await new AxeBuilder({ page }).include('figure').analyze();
  expect(results.violations).toEqual([]);
});
