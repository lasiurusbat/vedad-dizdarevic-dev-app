// Mounts every `[data-diagram]` element on the page. A plain module script instead of an Astro
// island: islands emit an inline <script>, an inline <style> and a style="" attribute, which the
// CSP (`script-src 'self'`, `style-src 'self'`) rejects. React Flow itself only sets styles through
// the CSSOM, which the CSP allows.
import type { DiagramId } from './index';

const targets = document.querySelectorAll<HTMLElement>('[data-diagram]');

async function mount(el: HTMLElement) {
  // Loaded on demand: pages without a diagram never download React or React Flow.
  const [{ createRoot }, { createElement }, { default: FlowDiagram }] = await Promise.all([
    import('react-dom/client'),
    import('react'),
    import('./FlowDiagram'),
  ]);
  createRoot(el).render(
    createElement(FlowDiagram, {
      // Written by ArchitectureDiagram from a typed DiagramId.
      id: el.dataset.diagram as DiagramId,
      label: el.dataset.label ?? '',
    }),
  );
}

const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      void mount(entry.target as HTMLElement);
    }
  },
  { rootMargin: '200px' },
);
targets.forEach((el) => observer.observe(el));
