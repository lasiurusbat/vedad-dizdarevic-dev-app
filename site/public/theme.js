// Applies a saved theme choice before the page paints. Loaded as a classic, render-blocking
// script in <head> on purpose (it is tiny), so the page never flashes the wrong theme. It is an
// external file because the CSP is script-src 'self' (no inline scripts).
// No saved choice: nothing is set, and the site stays dark (the default, whatever the device
// setting). Only a saved "light" changes anything; an old saved "dark" is the default anyway.
// The header switch (ThemeToggle.astro) writes the same key and attribute.
(() => {
  // Scripts run: show controls that need JavaScript (the theme switch), without a layout shift.
  document.documentElement.classList.add('js');
  let theme = null;
  try {
    theme = localStorage.getItem('theme');
  } catch {
    // Storage blocked: stay dark.
  }
  if (theme !== 'light') return;
  document.documentElement.setAttribute('data-theme', 'light');
  // Browser UI colour (mobile address bar) to match the chosen theme.
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    meta.setAttribute('content', '#ffffff');
  }
})();
