/** Site-wide constants that are not translated. */
export const GITHUB_URL = 'https://github.com/lasiurusbat';
export const LINKEDIN_URL = 'https://www.linkedin.com/in/vedad-dizdarevic-b154305/';
/**
 * Each language in its own language, so the switch reads correctly in either UI locale. The link
 * text is "EN" plus a screen-reader-only "English": WCAG 2.5.3 wants the accessible name to start
 * with the visible text.
 */
export const LANGUAGE_NAMES = { en: 'English', de: 'Deutsch' } as const;
export const OWNER = 'Vedad Dizdarevic';

/**
 * URL of the downloadable CV. `null` until the Typst CV exists (Phase 5); the hero's "Download CV"
 * button only renders when this is set, so there is never a dead link.
 */
export const CV_URL: string | null = null;
