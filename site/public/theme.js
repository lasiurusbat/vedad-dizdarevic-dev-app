// Applies a saved theme choice before the page paints. Loaded as a classic, render-blocking
// script in <head> on purpose (it is tiny), so the page never flashes the wrong theme. It is an
// external file because the CSP is script-src 'self' (no inline scripts).
// No saved choice: nothing is set, and the device setting (prefers-color-scheme) applies.
// The header switch (ThemeToggle.astro) writes the same key and attribute.
(() => {
  // Scripts run: show controls that need JavaScript (the theme switch), without a layout shift.
  document.documentElement.classList.add('js');
  let theme = null;
  try {
    theme = localStorage.getItem('theme');
  } catch {
    // Storage blocked: follow the device setting.
  }
  if (theme !== 'light' && theme !== 'dark') return;
  document.documentElement.setAttribute('data-theme', theme);
  // Browser UI colour (mobile address bar) to match the chosen theme.
  const color = theme === 'dark' ? '#0f101a' : '#ffffff';
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    meta.setAttribute('content', color);
    meta.removeAttribute('media');
  }
})();
