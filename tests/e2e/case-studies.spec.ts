import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { themeState } from './theme-state';

// Runs against the production build (no drafts): every case study, in both languages.
const studies = [
  {
    path: '/projects/sorted/',
    lang: 'en',
    title: 'Sorted: the AWS platform behind a live multi-tenant SaaS',
    problem: 'The problem',
    cta: 'Get in touch',
  },
  {
    path: '/de/projects/sorted/',
    lang: 'de',
    title: 'Sorted: die AWS-Plattform hinter einem live betriebenen Multi-Tenant-SaaS',
    problem: 'Das Problem',
    cta: 'Kontakt aufnehmen',
  },
  {
    path: '/projects/rainalert/',
    lang: 'en',
    title: 'Rain Alert: from git tag to a checked release, on free tiers',
    problem: 'The problem',
    cta: 'Get in touch',
  },
  {
    path: '/de/projects/rainalert/',
    lang: 'de',
    title: 'Rain Alert: vom Git-Tag zum geprüften Release, auf kostenlosen Tarifen',
    problem: 'Das Problem',
    cta: 'Kontakt aufnehmen',
  },
  {
    path: '/projects/this-site/',
    lang: 'en',
    title: 'This site: a private S3 bucket behind a Cloudflare Worker, with no stored keys in CI',
    problem: 'The problem',
    cta: 'Get in touch',
  },
  {
    path: '/de/projects/this-site/',
    lang: 'de',
    title:
      'Diese Website: ein privater S3-Bucket hinter einem Cloudflare Worker, ohne gespeicherte Schlüssel in der CI',
    problem: 'Das Problem',
    cta: 'Kontakt aufnehmen',
  },
];

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} theme`, () => {
    test.use({ storageState: themeState(scheme) });

    for (const s of studies) {
      test(`${s.path} has no axe violations`, async ({ page }) => {
        await page.goto(s.path);
        const results = await new AxeBuilder({ page }).analyze();
        expect(results.violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([]);
      });
    }
  });
}

for (const s of studies) {
  for (const width of [360, 1280]) {
    test(`${s.path} at ${width}px: structure, no horizontal scroll`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(s.path);
      await expect(page.locator('html')).toHaveAttribute('lang', s.lang);
      await expect(page.locator('h1')).toHaveText(s.title);
      await expect(page.getByRole('heading', { level: 2, name: s.problem })).toBeVisible();
      // outcome (screen-reader heading), problem, then the MDX sections with at least one
      // decision: at least four h2 sections
      expect(await page.locator('main h2').count()).toBeGreaterThanOrEqual(4);
      // every case study ends with a link to the contact section
      const cta = page.getByRole('link', { name: s.cta });
      await expect(cta).toBeVisible();
      await expect(cta).toHaveAttribute('href', /#contact$/);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test(`${s.path} links back to the work section`, async ({ page }) => {
    await page.goto(s.path);
    // At the top of the article, and again as the secondary action in the closing band.
    const back = page.locator('main a[href$="#work"]');
    await expect(back).toHaveCount(2);
    for (const link of await back.all()) {
      await expect(link).toHaveAttribute('href', s.lang === 'en' ? '/#work' : '/de/#work');
    }
  });
}

test('the home page card opens the case study, in both languages', async ({ page }) => {
  for (const [home, href, title] of [
    ['/', '/projects/sorted/', 'Sorted'],
    ['/de/', '/de/projects/sorted/', 'Sorted'],
  ]) {
    await page.goto(home);
    const card = page
      .locator('#work')
      .getByRole('link', { name: new RegExp(title) })
      .first();
    await expect(card).toHaveAttribute('href', href);
    await card.click();
    await expect(page).toHaveURL(href);
    await expect(page.locator('h1')).toContainText(title);
  }
});

test('language switch and hreflang point at the translation', async ({ page }) => {
  await page.goto('/projects/sorted/');
  await expect(page.getByRole('link', { name: /Deutsch/ })).toHaveAttribute(
    'href',
    '/de/projects/sorted/',
  );
  const hreflangs = await page.$$eval('link[rel="alternate"][hreflang]', (links) =>
    links.map(
      (l) => `${l.getAttribute('hreflang')} ${new URL((l as HTMLLinkElement).href).pathname}`,
    ),
  );
  expect(hreflangs).toEqual([
    'en /projects/sorted/',
    'de /de/projects/sorted/',
    'x-default /projects/sorted/',
  ]);
});

test('the closing band links each case study to the next, wrapping round, in both languages', async ({
  page,
}) => {
  for (const [from, label, to, title] of [
    ['/projects/sorted/', 'Next case study', '/projects/rainalert/', 'Rain Alert'],
    ['/projects/rainalert/', 'Next case study', '/projects/this-site/', 'This site'],
    ['/projects/this-site/', 'Next case study', '/projects/whocalledback/', 'WhoCalledBack'],
    ['/projects/whocalledback/', 'Next case study', '/projects/sorted/', 'Sorted'],
    ['/de/projects/sorted/', 'Nächste Fallstudie', '/de/projects/rainalert/', 'Rain Alert'],
    ['/de/projects/rainalert/', 'Nächste Fallstudie', '/de/projects/this-site/', 'Diese Website'],
    [
      '/de/projects/this-site/',
      'Nächste Fallstudie',
      '/de/projects/whocalledback/',
      'WhoCalledBack',
    ],
    ['/de/projects/whocalledback/', 'Nächste Fallstudie', '/de/projects/sorted/', 'Sorted'],
  ]) {
    await page.goto(from);
    const next = page.locator('aside.closing').getByRole('link', { name: new RegExp(label) });
    await expect(next).toHaveAttribute('href', to);
    await expect(next).toContainText(title);
    await next.click();
    await expect(page).toHaveURL(to);
    await expect(page.locator('h1')).toContainText(title);
  }
});

test('WhoCalledBack header illustration: decorative, four ports, beside the title on desktop only', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/projects/whocalledback/');
  const illo = page.locator('.case-head .illo');
  await expect(illo).toBeVisible();
  await expect(illo).toHaveAttribute('aria-hidden', 'true');
  await expect(illo.locator('.socket')).toHaveCount(4);
  await page.setViewportSize({ width: 390, height: 900 });
  await expect(illo).toBeHidden();
});

// WhoCalledBack is a teaser: Phase 1 runs on a Raspberry Pi, nothing is deployed to AWS. Nothing on
// its card or page may look live, and the status must say so in words, in both languages.
for (const [home, path, chip, status] of [
  ['/', '/projects/whocalledback/', 'In progress', /not yet deployed to AWS/],
  ['/de/', '/de/projects/whocalledback/', 'In Arbeit', /noch nicht auf AWS deployt/],
] as const) {
  test(`WhoCalledBack is marked in progress, never live (${home})`, async ({ page }) => {
    await page.goto(home);
    const card = page.locator('article.card', { has: page.locator(`a[href="${path}"]`) });
    await expect(card).toContainText(chip);
    await page.goto(path);
    await expect(page.locator('.status')).toContainText(status);
    await expect(page.locator('.live-dot')).toHaveCount(0);
    await expect(page.locator('.status-link')).toHaveCount(0);
  });
}

// The header illustration reaches past the article's column into the right margin on purpose. A
// clip on the article once cut its last 100px off, so no ancestor (the illustration's own frame
// aside) may clip it short of its right edge. The illustration shows from 64rem up.
for (const lang of ['', 'de/']) {
  for (const slug of ['sorted', 'rainalert', 'this-site', 'whocalledback']) {
    for (const width of [1100, 1440, 1920]) {
      test(`/${lang}projects/${slug}/ at ${width}px: the header illustration is not clipped`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`/${lang}projects/${slug}/`);
        const { artRight, clipRights } = await page.evaluate(() => {
          const illo = document.querySelector('.case-head .illo') as HTMLElement;
          let artRight = 0;
          for (const el of illo.querySelectorAll('svg *')) {
            const r = el.getBoundingClientRect();
            if (r.width || r.height) artRight = Math.max(artRight, r.right);
          }
          const clipRights: number[] = [];
          for (let el = illo.parentElement; el; el = el.parentElement) {
            if (getComputedStyle(el).overflowX !== 'visible') {
              clipRights.push(el.getBoundingClientRect().right);
            }
          }
          return { artRight, clipRights };
        });
        for (const right of clipRights) expect(right).toBeGreaterThanOrEqual(artRight);
        // And nothing makes the page scroll sideways because of it.
        const scrolls = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
        );
        expect(scrolls).toBe(false);
      });
    }
  }
}

// A stat value such as the German "−64 %" must stay on one line, on a phone (two columns) and on
// a desktop (four), for every case study in both languages.
for (const lang of ['', 'de/']) {
  for (const slug of ['sorted', 'rainalert', 'this-site', 'whocalledback']) {
    for (const width of [360, 1440]) {
      test(`/${lang}projects/${slug}/ at ${width}px: stat values stay on one line`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`/${lang}projects/${slug}/`);
        const lines = await page
          .locator('.stat dd')
          .evaluateAll((els) =>
            els.map(
              (el) => el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).fontSize),
            ),
          );
        expect(lines.length).toBeGreaterThan(0);
        for (const l of lines) expect(l).toBeLessThanOrEqual(1.2);
      });
    }
  }
}

test('the German Sorted stat shows "−64 %" whole', async ({ page }) => {
  await page.goto('/de/projects/sorted/');
  await expect(page.locator('.stat dd')).toHaveText(['0', '22', '−64 %', '6']);
});

// "Where it stands" on WhoCalledBack is a status track: three stages in order, each named by its
// state in words (the markers are decoration), with a next step under every stage.
for (const [path, states] of [
  ['/projects/whocalledback/', ['Running', 'Not yet checked', 'Planned']],
  ['/de/projects/whocalledback/', ['Läuft', 'Noch nicht geprüft', 'Geplant']],
] as const) {
  test(`WhoCalledBack status track: stages by state (${path})`, async ({ page }) => {
    await page.goto(path);
    const track = page.locator('ol.track');
    await expect(track.locator(':scope > li')).toHaveCount(3);
    await expect(track.locator('.state')).toHaveText([...states]);
    await expect(track.locator('.next')).toHaveCount(3);
    await expect(track.locator('.marker[aria-hidden="true"]')).toHaveCount(3);
  });
}
