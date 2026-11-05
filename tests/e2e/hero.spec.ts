import { expect, test } from '@playwright/test';

const widths = [360, 390, 768, 1280];
const pages = [
  {
    path: '/',
    lang: 'en',
    role: 'Cloud & DevOps Engineer',
    availability: /open to full-time roles and freelance work/i,
    positioning: /production-ready cloud platforms through infrastructure as code/i,
    about: /more than a decade in 3D\/CGI/i,
    contact: 'Contact',
    contactHref: '/#contact',
  },
  {
    path: '/de/',
    lang: 'de',
    role: 'Cloud- & DevOps-Engineer',
    availability: /offen für festanstellung und freiberufliche projekte/i,
    positioning: /produktionsreife cloud-plattformen mit infrastructure as code/i,
    about: /über zehn jahre habe ich in 3D\/CGI/i,
    contact: 'Kontakt',
    contactHref: '/de/#contact',
  },
];

for (const p of pages) {
  for (const width of widths) {
    test(`hero on ${p.path} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(p.path);
      const hero = page.locator('section[aria-labelledby="hero-title"]');

      // One h1, the name; role, availability and positioning are visible above the fold.
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(hero.getByRole('heading', { level: 1 })).toHaveText('Vedad Dizdarevic');
      await expect(hero.getByText(p.role, { exact: true })).toBeVisible();
      await expect(hero.getByText(p.availability)).toBeVisible();
      await expect(hero.getByText(p.positioning)).toBeVisible();
      // The career change lives in About, not in the hero.
      await expect(hero.getByText(/3D\/CGI/)).toHaveCount(0);
      await expect(page.locator('#about').getByText(p.about)).toBeVisible();

      // Contact, GitHub and LinkedIn are reachable from the hero itself, with 44px targets.
      const contact = hero.getByRole('link', { name: p.contact, exact: true });
      await expect(contact).toBeVisible();
      await expect(contact).toHaveAttribute('href', p.contactHref);
      for (const name of ['GitHub', 'LinkedIn']) {
        const link = hero.getByRole('link', { name, exact: true });
        await expect(link).toBeVisible();
        await expect(link).toHaveAttribute('href', /^https:\/\//);
      }
      for (const box of await hero.getByRole('link').all()) {
        expect((await box.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
      }

      // No dead "Download CV" button before a CV exists (CV_URL in site/src/site.ts).
      await expect(hero.getByRole('link', { name: /download cv|lebenslauf/i })).toHaveCount(0);
    });
  }

  test(`every header and hero anchor on ${p.path} has a target section`, async ({ page }) => {
    await page.goto(p.path);
    const hashes = await page.$$eval('a[href*="#"]', (links) =>
      links.map((a) => new URL((a as HTMLAnchorElement).href).hash).filter((h) => h.length > 1),
    );
    expect(hashes.length).toBeGreaterThan(0);
    for (const hash of new Set(hashes)) {
      if (hash === '#main') continue; // skip link target
      await expect(page.locator(hash), hash).toHaveCount(1);
    }
  });
}
