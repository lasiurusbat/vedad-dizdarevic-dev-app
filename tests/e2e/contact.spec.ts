import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { SECURITY_HEADERS } from '../../worker/src/headers';
import { useTheme } from './theme-state';

/*
 * The form against a stand-in Turnstile and API: no third party or real mail in tests. What the
 * Worker and Lambda do with a submission is tested in worker/test and lambda/contact/test.
 */

const CSP = SECURITY_HEADERS['Content-Security-Policy-Report-Only']!.split('; ')
  .filter((d) => d !== 'upgrade-insecure-requests')
  .join('; ');

const form = (page: Page) => page.locator('[data-contact]');

/** Answers api.js with a widget that passes at once, counting how often it is asked for. */
async function fakeTurnstile(page: Page) {
  const state = { loads: 0 };
  await page.route('https://challenges.cloudflare.com/**', async (route) => {
    state.loads += 1;
    await route.fulfill({
      contentType: 'text/javascript',
      body: `window.turnstile = {
        render(el, options) {
          window.__widget = options;
          options.callback('token-' + (window.__tokens = (window.__tokens || 0) + 1));
          return 'w1';
        },
        reset() { window.__widget.callback('token-' + (window.__tokens += 1)); },
      };`,
    });
  });
  return state;
}

async function fakeApi(page: Page, status = 200) {
  const posted: Record<string, unknown>[] = [];
  await page.route('**/api/contact', async (route) => {
    posted.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({ status, contentType: 'application/json', body: '{}' });
  });
  return posted;
}

async function fill(page: Page) {
  await form(page).locator('[name="name"]').fill('Ada Lovelace');
  await form(page).locator('[name="email"]').fill('ada@example.com');
  await form(page).locator('[name="message"]').fill('I would like to talk about a role.');
}

for (const [path, language, name, email, send, success] of [
  ['/', 'en', 'Name', 'Email', 'Send message', 'Thanks'],
  ['/de/', 'de', 'Name', 'E-Mail', 'Nachricht senden', 'Danke'],
] as const) {
  test(`${path}: a filled form posts its fields and a token, then confirms`, async ({ page }) => {
    await fakeTurnstile(page);
    const posted = await fakeApi(page);
    await page.goto(path);
    await expect(form(page).getByLabel(name, { exact: true })).toBeVisible();
    await expect(form(page).getByLabel(email, { exact: true })).toBeVisible();
    await form(page).locator('[value="freelance"]').check();
    await fill(page);
    await form(page).getByRole('button', { name: send }).click();

    const status = form(page).getByRole('status');
    await expect(status).toContainText(success);
    await expect(status).toBeFocused();
    expect(posted).toEqual([
      {
        type: 'freelance',
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        message: 'I would like to talk about a role.',
        language,
        website: '',
        token: 'token-1',
      },
    ]);
    // Cleared for the next message, the first option selected again.
    await expect(form(page).locator('[name="name"]')).toHaveValue('');
    await expect(form(page).locator('[value="job"]')).toBeChecked();
  });
}

test('Turnstile loads only once someone starts on the form', async ({ page }) => {
  const turnstile = await fakeTurnstile(page);
  await page.goto('/');
  await form(page).scrollIntoViewIfNeeded();
  await page.waitForLoadState('networkidle');
  expect(turnstile.loads).toBe(0);

  await form(page).locator('[name="name"]').focus();
  await expect.poll(() => turnstile.loads).toBe(1);
  await form(page).locator('[name="email"]').focus();
  expect(turnstile.loads).toBe(1);
});

test('the widget follows the site theme and language', async ({ page }) => {
  await fakeTurnstile(page);
  await useTheme(page, 'light');
  await page.goto('/de/');
  await form(page).locator('[name="name"]').focus();
  await expect
    .poll(() => page.evaluate(() => (window as never as { __widget?: object }).__widget))
    .toMatchObject({ theme: 'light', language: 'de', action: 'contact' });
});

test('empty and wrong fields are marked, nothing is sent, and they clear as they are fixed', async ({
  page,
}) => {
  await fakeTurnstile(page);
  const posted = await fakeApi(page);
  await page.goto('/');
  await form(page).getByRole('button', { name: 'Send message' }).click();

  const name = form(page).locator('[name="name"]');
  const email = form(page).locator('[name="email"]');
  const message = form(page).locator('[name="message"]');
  for (const input of [name, email, message]) {
    await expect(input).toHaveAttribute('aria-invalid', 'true');
  }
  await expect(name).toBeFocused();
  await expect(form(page).locator('#contact-email-error')).toBeVisible();

  await email.fill('not-an-address');
  await expect(email).toHaveAttribute('aria-invalid', 'true');
  await email.fill('ada@example.com');
  await expect(email).toHaveAttribute('aria-invalid', 'false');
  await expect(form(page).locator('#contact-email-error')).toBeHidden();

  await message.fill('too short');
  await form(page).getByRole('button', { name: 'Send message' }).click();
  await expect(message).toHaveAttribute('aria-invalid', 'true');
  expect(posted).toEqual([]);
});

for (const [status, expected] of [
  [403, 'spam check'],
  [400, 'check'],
  [502, 'hello@vedad-dizdarevic.dev'],
  [429, 'hello@vedad-dizdarevic.dev'],
] as const) {
  test(`a ${status} shows its error, keeps the text, and a retry gets a new token`, async ({
    page,
  }) => {
    await fakeTurnstile(page);
    const posted = await fakeApi(page, status);
    await page.goto('/');
    await fill(page);
    await form(page).getByRole('button', { name: 'Send message' }).click();

    const shown = form(page).getByRole('status');
    await expect(shown).toContainText(expected);
    await expect(shown).toHaveClass(/is-error/);
    await expect(form(page).locator('[name="message"]')).toHaveValue(/talk about a role/);

    await form(page).getByRole('button', { name: 'Send message' }).click();
    await expect.poll(() => posted.length).toBe(2);
    expect(posted[0]!.token).not.toBe(posted[1]!.token);
  });
}

test('when Turnstile cannot load, the form says so and offers the address', async ({ page }) => {
  await page.route('https://challenges.cloudflare.com/**', (route) => route.abort());
  const posted = await fakeApi(page);
  await page.goto('/');
  await fill(page);
  await form(page).getByRole('button', { name: 'Send message' }).click();
  await expect(form(page).getByRole('status')).toContainText('hello@vedad-dizdarevic.dev');
  await expect(form(page).getByRole('button', { name: 'Send message' })).toBeEnabled();
  expect(posted).toEqual([]);
});

test('the honeypot is out of sight and out of the tab order', async ({ page }) => {
  await page.goto('/');
  const trap = form(page).locator('[name="website"]');
  await expect(trap).toHaveAttribute('tabindex', '-1');
  const box = (await form(page).locator('.trap').boundingBox())!;
  expect(box.width).toBeLessThanOrEqual(1);
  expect(box.height).toBeLessThanOrEqual(1);
});

test('without JavaScript the form stays hidden and the address remains', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(form(page)).toBeHidden();
  const contact = page.locator('#contact');
  await expect(contact.locator('a[href="mailto:hello@vedad-dizdarevic.dev"]')).toBeVisible();
  await context.close();
});

test('it works under the production CSP', async ({ page }) => {
  await fakeTurnstile(page);
  await fakeApi(page);
  await page.route('**/*', async (route) => {
    if (route.request().resourceType() !== 'document') return route.fallback();
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
  await page.goto('/');
  await fill(page);
  await form(page).getByRole('button', { name: 'Send message' }).click();
  await expect(form(page).getByRole('status')).toContainText('Thanks');
  expect(violations).toEqual([]);
});

test('on a phone it fits, with 44px targets', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/de/');
  const fits = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  );
  expect(fits).toBe(true);
  for (const target of await form(page).locator('.input, .type, button').all()) {
    expect((await target.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
});

for (const theme of ['dark', 'light'] as const) {
  test(`the form has no axe violations, with errors showing (${theme})`, async ({ page }) => {
    await useTheme(page, theme);
    await fakeTurnstile(page);
    await page.goto('/');
    await form(page).getByRole('button', { name: 'Send message' }).click();
    await expect(form(page).locator('#contact-name-error')).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).include('#contact').analyze();
    expect(violations).toEqual([]);
  });
}
