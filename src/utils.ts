export function getElementRect(el: Element): DOMRect {
  return el.getBoundingClientRect();
}

export function logDebug(message: string, debug: boolean): void {
  if (debug) {
    console.log(`[swz] ${message}`);
  }
}

export function warnDebug(message: string, debug: boolean): void {
  if (debug) {
    console.warn(`[swz] ${message}`);
  }
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
