import type { Page } from '@playwright/test';

// The site is dark by default, whatever the device setting; light is a visitor's saved choice.
// Tests pick a theme the way a visitor does: through the stored choice that theme.js applies
// before paint, not by emulating the device setting (which the site ignores).
const origin = 'http://127.0.0.1:4173';

/** For test.use({ storageState }) or browser.newContext({ storageState }). */
export const themeState = (theme: 'light' | 'dark') => ({
  cookies: [],
  origins: [{ origin, localStorage: [{ name: 'theme', value: theme }] }],
});

/** For a page that is already open: applies from the next navigation on. */
export const useTheme = (page: Page, theme: 'light' | 'dark') =>
  page.addInitScript((t) => localStorage.setItem('theme', t), theme);
