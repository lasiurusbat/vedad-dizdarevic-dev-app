import { expect, test } from '@playwright/test';
import { SECURITY_HEADERS } from '../../worker/src/headers';

// axe in both themes and the page structure: case-studies.spec.ts.
const CSP = SECURITY_HEADERS['Content-Security-Policy-Report-Only']!.split('; ')
  .filter((d) => d !== 'upgrade-insecure-requests')
  .join('; ');

test('This site: both repositories linked, the gaps listed', async ({ page }) => {
  await page.goto('/projects/this-site/');
  const main = page.locator('main');
  for (const repo of ['vedad-dizdarevic-dev-app', 'vedad-dizdarevic-dev-infra']) {
    await expect(
      main.locator(`a[href="https://github.com/lasiurusbat/${repo}"]`).first(),
    ).toBeVisible();
  }
  const limits = page.getByRole('table', { name: /Limitations of this site/ });
  await expect(limits.locator('tbody tr')).toHaveCount(7);
  await expect(limits).toContainText('The CSP is report-only');
  await expect(limits).toContainText('The contact form is not live');
});

test('This site diagram renders and traces its three paths under the production CSP', async ({
  page,
}) => {
  await page.route('**/*', async (route) => {
    if (route.request().resourceType() !== 'document') return route.continue();
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: { ...response.headers(), 'content-security-policy': CSP },
    });
  });
  const violations: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && /Content Security Policy/i.test(m.text()))
      violations.push(m.text());
  });
  await page.goto('/projects/this-site/');
  await page.locator('[data-diagram="site-platform"]').scrollIntoViewIfNeeded();
  const diagram = page.getByRole('group', { name: /How vedad-dizdarevic.dev is served/ });
  await expect(diagram.locator('.react-flow__node-service')).toHaveCount(11);
  await expect(diagram.locator('.react-flow__edge')).toHaveCount(12);

  const bar = page.getByRole('group', { name: 'Trace a path' });
  await bar.getByRole('button', { name: 'Requests' }).click();
  await expect(diagram.locator('.react-flow__node-service.vdd-on')).toHaveCount(4);
  await bar.getByRole('button', { name: 'Contact and alerts' }).click();
  await expect(diagram.locator('.react-flow__node-service.vdd-on')).toHaveCount(6);
  await expect(page.locator('[data-path-status]')).toContainText('Planned');
  await bar.getByRole('button', { name: 'Deploys' }).click();
  await expect(diagram.locator('.react-flow__node-service.vdd-on')).toHaveCount(4);
  expect(violations).toEqual([]);
});

test('the footer links to this case study on every page, in both languages', async ({ page }) => {
  for (const [from, name, href] of [
    ['/', 'How this site is built', '/projects/this-site/'],
    ['/projects/sorted/', 'How this site is built', '/projects/this-site/'],
    ['/de/', 'Wie diese Website gebaut ist', '/de/projects/this-site/'],
  ]) {
    await page.goto(from);
    await expect(page.locator('footer').getByRole('link', { name })).toHaveAttribute('href', href);
  }
});

test('This site header illustration: decorative, six headers, beside the title on desktop only', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/projects/this-site/');
  const illo = page.locator('.case-head .illo');
  await expect(illo).toBeVisible();
  await expect(illo).toHaveAttribute('aria-hidden', 'true');
  await expect(illo.locator('.stamp text')).toHaveText([
    'CSP',
    'HSTS',
    'X-Frame',
    'nosniff',
    'Referrer',
    'Permissions',
  ]);
  await page.setViewportSize({ width: 390, height: 900 });
  await expect(illo).toBeHidden();
});
