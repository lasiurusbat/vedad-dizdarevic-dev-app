import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { useTheme } from './theme-state';

for (const [path, status, preferred, services, project, cta] of [
  ['/', 'Available now', 'Preferred', 'What I can do for your team', 'Rain Alert', 'Email me'],
  [
    '/de/',
    'Ab sofort verfügbar',
    'Bevorzugt',
    'Was ich für Ihr Team tun kann',
    'Rain Alert',
    'E-Mail',
  ],
] as const) {
  test(`Work with me on ${path}: status, terms, grid, a way to get in touch`, async ({ page }) => {
    await page.goto(path);
    const hire = page.locator('#hire');
    await expect(hire).toContainText(status);
    await expect(hire).toContainText(preferred);
    await expect(hire).toContainText('Frankfurt');
    await expect(hire.getByRole('heading', { name: services })).toBeVisible();
    await expect(hire.getByRole('link', { name: cta })).toHaveAttribute(
      'href',
      'mailto:hello@vedad-dizdarevic.dev',
    );

    const table = hire.getByRole('table');
    await expect(table.getByRole('rowheader')).toHaveCount(8);
    await expect(table.getByRole('columnheader', { name: project })).toBeVisible();

    // Kubernetes is outside the three case studies: no dots, its repository linked instead.
    const k8s = table.getByRole('row', { name: /Kubernetes/ });
    await expect(k8s.locator('a.dot')).toHaveCount(0);
    const source = k8s.getByRole('link', { name: /SRE-Project/ });
    await expect(source).toHaveAttribute('href', 'https://github.com/lasiurusbat/sre-project');
    await expect(source).toHaveAttribute('target', '_blank');
    await expect(source).toHaveAttribute('rel', /noopener/);

    // Each project heading sits above its own column of dots.
    const heads = await table.getByRole('columnheader').locator('a').all();
    const firstRow = table.getByRole('row').nth(1).getByRole('cell');
    for (const [i, head] of heads.entries()) {
      const a = (await head.boundingBox())!;
      const b = (await firstRow.nth(i + 1).boundingBox())!;
      expect(Math.abs(a.x + a.width / 2 - (b.x + b.width / 2))).toBeLessThan(2);
    }
  });

  test(`every dot on ${path} lands on a section that exists`, async ({ page, request }) => {
    await page.goto(path);
    const dots = page.locator('#hire a.dot');
    expect(await dots.count()).toBeGreaterThan(10);
    const hrefs = await dots.evaluateAll((els) => els.map((e) => e.getAttribute('href')!));
    for (const href of hrefs) {
      const [url, fragment] = href.split('#');
      const response = await request.get(url!);
      expect(response.ok(), url).toBe(true);
      expect(await response.text(), href).toContain(`id="${fragment}"`);
    }
  });
}

test('Work with me on a phone: fits, with 44px targets', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/de/');
  const fits = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  );
  expect(fits).toBe(true);
  for (const link of await page.locator('#hire a').all()) {
    const box = (await link.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
  }
});

for (const theme of ['dark', 'light'] as const) {
  test(`Work with me has no axe violations (${theme})`, async ({ page }) => {
    await useTheme(page, theme);
    await page.goto('/');
    const { violations } = await new AxeBuilder({ page }).include('#hire').analyze();
    expect(violations).toEqual([]);
  });
}
