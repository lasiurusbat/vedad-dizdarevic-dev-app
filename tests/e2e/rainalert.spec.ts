import { expect, test } from '@playwright/test';
import { SECURITY_HEADERS } from '../../worker/src/headers';

// axe in both themes and the page structure: case-studies.spec.ts.
const CSP = SECURITY_HEADERS['Content-Security-Policy-Report-Only']!.split('; ')
  .filter((d) => d !== 'upgrade-insecure-requests')
  .join('; ');

test('Rain Alert: public repo linked, single images in the gallery', async ({ page }) => {
  await page.goto('/projects/rainalert/');
  const source = page.locator('.fact').filter({ hasText: 'Source code' });
  await expect(source.getByRole('link')).toHaveAttribute(
    'href',
    'https://github.com/lasiurusbat/RainAlert',
  );
  // No light/dark pairs: one image per card, shown in both themes, through the image pipeline.
  const imgs = page.locator('[data-gallery] img');
  await expect(imgs).toHaveCount(3);
  await expect(
    page.locator('[data-gallery] img.only-dark, [data-gallery] img.only-light'),
  ).toHaveCount(0);
  for (const img of await imgs.all()) {
    expect(await img.getAttribute('src')).toMatch(/^\/_astro\/.+\.webp$/);
    expect((await img.getAttribute('alt'))!.length).toBeGreaterThan(30);
  }
  // The artwork is labelled as AI-generated.
  await expect(page.locator('[data-gallery]')).toContainText('AI-generated illustration');
  await expect(page.getByRole('note', { name: 'Trade-off' })).toHaveCount(5);
});

test('Rain Alert diagram renders and traces both paths under the production CSP', async ({
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
  await page.goto('/projects/rainalert/');
  await page.locator('[data-diagram="rainalert-release"]').scrollIntoViewIfNeeded();
  const diagram = page.getByRole('group', { name: /Rain Alert release and request paths/ });
  await expect(diagram.locator('.react-flow__node-service')).toHaveCount(12);
  await expect(diagram.locator('.react-flow__edge')).toHaveCount(13);

  const bar = page.getByRole('group', { name: 'Trace a path' });
  await bar.getByRole('button', { name: 'Releases' }).click();
  await expect(diagram.locator('.react-flow__node-service.vdd-on')).toHaveCount(8);
  await bar.getByRole('button', { name: 'Requests' }).click();
  await expect(diagram.locator('.react-flow__node-service.vdd-on')).toHaveCount(6);
  await expect(page.locator('[data-path-status]')).toContainText('OpenWeather');
  expect(violations).toEqual([]);
});
