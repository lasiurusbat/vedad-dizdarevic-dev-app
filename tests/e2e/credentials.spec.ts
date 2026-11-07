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

test('Skills: eight groups from the CV, platform first, as plain lists', async ({ page }) => {
  for (const [path, first, last, iam] of [
    ['/', 'Cloud (AWS)', 'Ways of working', 'IAM (OIDC, least privilege)'],
    ['/de/', 'Cloud (AWS)', 'Arbeitsweise', 'IAM (OIDC, Least Privilege)'],
  ]) {
    await page.goto(path);
    const groups = page.locator('#skills h3');
    // Eight skill groups, then the certifications heading.
    await expect(groups).toHaveCount(9);
    await expect(groups.first()).toHaveText(first);
    await expect(groups.nth(7)).toHaveText(last);
    await expect(page.locator('#skills').getByText(iam, { exact: true })).toBeVisible();
    await expect(page.locator('#skills').getByText('Terraform', { exact: true })).toBeVisible();
    // No bars, meters or percentages.
    await expect(
      page.locator('#skills [role="progressbar"], #skills meter, #skills progress'),
    ).toHaveCount(0);
    await expect(page.locator('#skills')).not.toContainText('%');
  }
});
