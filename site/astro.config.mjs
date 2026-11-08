import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://vedad-dizdarevic.dev',
  output: 'static',
  integrations: [
    mdx(),
    // Lists each page with its translation; the 404 page is left out by the integration.
    sitemap({ i18n: { defaultLocale: 'en', locales: { en: 'en', de: 'de' } } }),
  ],
  trailingSlash: 'always',
  // `/` is English, `/de/` is German. Pages for German live in src/pages/de/.
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'de'],
    routing: { prefixDefaultLocale: false },
  },
  build: {
    format: 'directory',
    // CSP keeps `style-src 'self'`, so no inline <style> tags.
    inlineStylesheets: 'never',
  },
  vite: {
    plugins: [tailwindcss()],
    // CSP keeps script-src 'self', so never inline bundled scripts (Vite does for small ones).
    build: { assetsInlineLimit: 0 },
  },
});
