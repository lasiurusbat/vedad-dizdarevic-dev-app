import { expect, test, type Locator } from '@playwright/test';

/*
 * Light coverage for the case-study components that are plain markup: TechStack, ScalingPath and
 * DashboardMap. Accessibility is covered by the axe sweep over every page; this checks that each
 * renders its data with the intended semantics and fits a phone.
 */

const tops = async (items: Locator) =>
  Promise.all((await items.all()).map(async (i) => Math.round((await i.boundingBox())!.y)));

test('TechStack: platform layers, then the workload set apart', async ({ page }) => {
  for (const [path, label, layers, workload] of [
    [
      '/projects/sorted/',
      'Sorted tech stack by layer',
      ['Edge', 'Cloud', 'Infrastructure as code', 'CI/CD', 'Observability'],
      'Workload',
    ],
    [
      '/projects/rainalert/',
      'Rain Alert tech stack by layer',
      ['Edge', 'Platform', 'Container', 'CI/CD', 'Operations'],
      'Workload',
    ],
  ] as const) {
    await page.goto(path);
    const stack = page.getByRole('group', { name: label });
    await expect(stack.locator('dl:not(.is-workload) > .layer > dt')).toHaveText([...layers]);
    await expect(stack.locator('dl.is-workload dt')).toHaveText([workload]);
    // Every layer says what it does and lists at least one tool.
    for (const layer of await stack.locator('.layer').all()) {
      await expect(layer.locator('dd.role')).not.toBeEmpty();
      expect(await layer.locator('dd.tools li').count()).toBeGreaterThan(0);
    }
  }
});

test('ScalingPath: three ordered stages, the current one marked, code rendered as code', async ({
  page,
}) => {
  await page.goto('/projects/sorted/');
  const path = page.getByRole('list', { name: 'Sorted availability and scaling, in three stages' });
  const stages = path.locator(':scope > li');
  await expect(stages).toHaveCount(3);
  await expect(path.getByRole('heading', { level: 3 })).toHaveText([
    'Self-healing, two-zone network',
    'Multi-AZ production',
    'Scale out',
  ]);
  // The status is stated in words; only the running stage gets the filled node.
  await expect(stages.locator('.status')).toHaveText([
    'Running today',
    'Three flags away',
    'Designed, not yet built',
  ]);
  await expect(path.locator('.is-current')).toHaveCount(1);
  await expect(stages.first()).toHaveClass(/is-current/);
  // `backticks` in the data become <code>, without the backticks.
  await expect(path.locator('code', { hasText: 'db_multi_az' })).toBeVisible();
  await expect(path).not.toContainText('`');
});

test('ScalingPath runs down on phones and across on wide screens', async ({ page }) => {
  const stages = page.locator('ol.path > li');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/projects/sorted/');
  const narrow = await tops(stages);
  expect(narrow[0]).toBeLessThan(narrow[1]!);
  expect(narrow[1]).toBeLessThan(narrow[2]!);

  await page.setViewportSize({ width: 1440, height: 900 });
  const wide = await tops(stages);
  expect(new Set(wide).size).toBe(1);
});

test('DashboardMap: panels grouped by layer, each with its source, no values', async ({ page }) => {
  await page.goto('/projects/sorted/');
  const map = page.locator('figure.dash');
  await expect(map.locator('figcaption')).toContainText('Sorted Grafana Monitoring Setup');
  await expect(map.getByRole('heading', { level: 3 })).toHaveText([
    'Availability',
    'Load balancer',
    'Compute',
    'Database',
    'Mail and alerts',
  ]);
  // Every group is a named region with at least one panel; every panel has a decorative glyph.
  for (const name of ['Availability', 'Load balancer', 'Compute', 'Database', 'Mail and alerts']) {
    const group = map.getByRole('region', { name });
    expect(await group.locator('li.panel').count()).toBeGreaterThan(0);
  }
  const panels = map.locator('li.panel');
  expect(await panels.count()).toBeGreaterThanOrEqual(12);
  for (const glyph of await map.locator('li.panel svg.glyph').all()) {
    await expect(glyph).toHaveAttribute('aria-hidden', 'true');
  }
  await expect(map.locator('code', { hasText: 'HealthyHostCount' })).toBeVisible();
  // No live numbers (they would read as a claim about traffic), and the page says so.
  await expect(map).toContainText('No values are shown here on purpose.');
});

test('German labels name the same components', async ({ page }) => {
  await page.goto('/de/projects/sorted/');
  await expect(
    page.getByRole('group', { name: 'Tech-Stack von Sorted nach Schichten' }),
  ).toBeVisible();
  await expect(
    page.getByRole('list', { name: 'Verfügbarkeit und Skalierung von Sorted, in drei Stufen' }),
  ).toBeVisible();
  await expect(page.locator('figure.dash figcaption')).toContainText(
    'Grafana-Monitoring-Setup von Sorted',
  );
});

test('the three components fit a 360px phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/projects/sorted/');
  for (const el of [
    page.getByRole('group', { name: 'Sorted tech stack by layer' }),
    page.locator('ol.path'),
    page.locator('figure.dash'),
  ]) {
    const box = (await el.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(360);
  }
});
