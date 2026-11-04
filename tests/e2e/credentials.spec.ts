import { expect, test } from '@playwright/test';

for (const [path, title, inProgress] of [
  ['/', 'Certifications', 'In progress'],
  ['/de/', 'Zertifizierungen', 'In Vorbereitung'],
] as const) {
  test(`credentials on ${path}`, async ({ page }) => {
    await page.goto(path);
    const skills = page.locator('#skills');
    await expect(skills.getByRole('heading', { name: title })).toBeVisible();
    await expect(skills.getByText('AWS Certified Solutions Architect – Associate')).toBeVisible();
    await expect(skills.getByText(inProgress)).toBeVisible();
    // No badge until the certification is earned, and every verify link is external.
    await expect(skills.locator('img')).toHaveCount(0);
    for (const a of await skills.locator('a[href^="https://"]').all()) {
      await expect(a).toHaveAttribute('rel', /noopener/);
    }
  });
}
