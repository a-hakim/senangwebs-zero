import type { InternalStep, SWZOptions } from './types';

export function scrollTargetIntoView(step: InternalStep, options: SWZOptions): Promise<void> {
  return new Promise((resolve) => {
    if (!options.autoScroll || !step.target) {
      resolve();
      return;
    }

    const target = step.target as HTMLElement;
    const rect = target.getBoundingClientRect();
    const margin = step.margin ?? options.autoScrollOffset ?? 20;
    const windowH = window.innerHeight;
    const windowW = window.innerWidth;

    const isVisible =
      rect.top >= margin &&
      rect.left >= margin &&
      rect.bottom <= windowH - margin &&
      rect.right <= windowW - margin;

    if (isVisible) {
      resolve();
      return;
    }

    // Check prefers-reduced-motion
    const prefersReduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const behavior: ScrollBehavior = (options.autoScrollSmooth !== false && !prefersReduced) ? 'smooth' : 'auto';

    // Calculate scroll position to center target vertically
    const scrollTop = window.scrollY + rect.top - (windowH - rect.height) / 2;
    const scrollLeft = window.scrollX + rect.left - (windowW - rect.width) / 2;

    window.scrollTo({
      top: Math.max(0, scrollTop),
      left: Math.max(0, scrollLeft),
      behavior,
    });

    // Wait for scroll to settle
    const delay = behavior === 'smooth' ? 400 : 50;
    setTimeout(resolve, delay);
  });
}

export function getElementRect(el: Element): DOMRect {
  return el.getBoundingClientRect();
}
