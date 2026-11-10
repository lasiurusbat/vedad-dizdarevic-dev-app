// A screenshot gallery's behaviour: the previous/next buttons with their edge fades, and the
// lightbox dialog with its "Actual size" toggle. Bundled by Astro from ScreenshotGallery.astro.
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

export function initGallery(root: HTMLElement): void {
  const track = root.querySelector<HTMLElement>('[data-track]')!;
  const prev = root.querySelector<HTMLButtonElement>('[data-prev]')!;
  const next = root.querySelector<HTMLButtonElement>('[data-next]')!;
  const item = track.querySelector<HTMLElement>('li')!;
  root.querySelector<HTMLElement>('[data-controls]')!.hidden = false;

  const update = () => {
    const max = track.scrollWidth - track.clientWidth;
    const atStart = track.scrollLeft <= 2;
    const atEnd = track.scrollLeft >= max - 2;
    track.classList.toggle('fade-start', !atStart);
    track.classList.toggle('fade-end', !atEnd);
    prev.disabled = atStart;
    next.disabled = atEnd;
  };

  const step = (dir: number) => {
    const gap = parseFloat(getComputedStyle(track.firstElementChild!).columnGap) || 0;
    track.scrollBy({
      left: dir * (item.offsetWidth + gap),
      behavior: reduced.matches ? 'auto' : 'smooth',
    });
  };

  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  track.addEventListener('scroll', update, { passive: true });
  new ResizeObserver(update).observe(track);
  update();

  const dialog = root.querySelector<HTMLDialogElement>('[data-lightbox]')!;
  const stage = root.querySelector<HTMLElement>('[data-stage]')!;
  const caption = root.querySelector<HTMLElement>('[data-caption]')!;
  const actual = root.querySelector<HTMLButtonElement>('[data-actual]')!;

  const setActual = (on: boolean) => {
    stage.classList.toggle('actual', on);
    actual.setAttribute('aria-pressed', String(on));
    if (!on) stage.scrollTo(0, 0);
  };

  const open = (link: HTMLAnchorElement) => {
    const thumb = link.querySelector('img')!;
    const title = link.closest('li')!.querySelector('[data-title]')!.textContent ?? '';
    const img = new Image();
    // The intrinsic size, not the thumbnail's rendered one, so the layout is right before it loads.
    img.width = Number(thumb.getAttribute('width'));
    img.height = Number(thumb.getAttribute('height'));
    img.alt = thumb.alt;
    img.addEventListener('load', () => {
      // The toggle only means something if the fitted image is smaller than the real one.
      const zoomable = img.clientWidth < img.naturalWidth;
      actual.hidden = !zoomable;
      stage.classList.toggle('zoomable', zoomable);
    });
    img.addEventListener('click', () => {
      if (stage.classList.contains('zoomable')) setActual(!stage.classList.contains('actual'));
    });
    img.src = link.getAttribute('href')!;
    caption.textContent = title;
    dialog.setAttribute('aria-label', title);
    stage.replaceChildren(img);
    dialog.showModal();
  };

  for (const link of root.querySelectorAll<HTMLAnchorElement>('[data-zoom]')) {
    link.addEventListener('click', (e) => {
      // Leave new-tab and new-window clicks to the browser.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      open(link);
    });
  }

  actual.addEventListener('click', () => setActual(!stage.classList.contains('actual')));
  root.querySelector('[data-close]')!.addEventListener('click', () => dialog.close());
  // A click beside the image closes it, like the Escape key (which the dialog handles itself).
  stage.addEventListener('click', (e) => {
    if (e.target === stage) dialog.close();
  });
  dialog.addEventListener('close', () => {
    stage.replaceChildren();
    stage.classList.remove('zoomable');
    setActual(false);
    actual.hidden = true;
  });
}
