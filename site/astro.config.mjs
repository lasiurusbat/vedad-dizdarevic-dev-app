import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://vedad-dizdarevic.dev',
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
    // CSP keeps `style-src 'self'`, so no inline <style> tags.
    inlineStylesheets: 'never',
  },
  vite: { plugins: [tailwindcss()] },
});
