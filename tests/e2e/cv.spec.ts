import { expect, test } from '@playwright/test';

for (const [path, name, file] of [
  ['/', 'Download CV', 'Vedad_Dizdarevic_CV_EN.pdf'],
  ['/de/', 'Lebenslauf herunterladen', 'Vedad_Dizdarevic_CV_DE.pdf'],
] as const) {
  test(`the CV on ${path} is linked in that language and is a real PDF`, async ({
    page,
    request,
  }) => {
    await page.goto(path);
    const href = `/cv/${file}`;
    const hero = page.getByRole('link', { name });
    await expect(hero).toHaveAttribute('href', href);
    await expect(hero).toHaveAttribute('download');

    // Header on wide screens.
    await expect(page.locator('header nav').first().locator(`a[href="${href}"]`)).toBeVisible();

    const response = await request.get(href);
    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toContain('application/pdf');
    expect((await response.body()).subarray(0, 5).toString()).toBe('%PDF-');
  });
}

test('the CV is in the phone menu', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/de/');
  await page.locator('summary').first().click();
  const link = page.locator('details[data-menu] a[href="/cv/Vedad_Dizdarevic_CV_DE.pdf"]');
  await expect(link).toBeVisible();
  expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
});
