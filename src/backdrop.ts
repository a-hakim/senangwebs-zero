import type { InternalStep, SWZOptions } from './types';
import { getElementRect } from './utils';

let backdropEl: HTMLElement | null = null;
let cutoutEl: HTMLElement | null = null;
let backdropPieces: HTMLElement[] = [];
let resizeHandler: (() => void) | null = null;
let scrollHandler: (() => void) | null = null;

export function getBackdropElement(): HTMLElement {
  if (!backdropEl) {
    backdropEl = document.querySelector('.swz-backdrop') as HTMLElement;
  }
  return backdropEl!;
}

export function getCutoutElement(): HTMLElement {
  if (!cutoutEl) {
    cutoutEl = document.querySelector('.swz-cutout') as HTMLElement;
  }
  return cutoutEl!;
}

export function createBackdrop(options: SWZOptions): HTMLElement {
  const el = document.createElement('div');
  el.className = ['swz-backdrop', options.backdropClass || '']
    .filter(Boolean)
    .join(' ');
  el.style.cssText = `
    position: fixed;
    top: 0; left: 0; width: 100vw; height: 100vh;
    z-index: ${(options.dialogZ ?? 999) - 1};
    background: ${options.backdropColor};
    pointer-events: ${options.exitOnClickOutside ? 'auto' : 'none'};
  `;

  backdropPieces = ['top', 'right', 'bottom', 'left'].map((name) => {
    const piece = document.createElement('div');
    piece.className = `swz-backdrop-piece swz-backdrop-piece-${name}`;
    piece.style.cssText = `
      position: absolute;
      background: ${options.backdropColor};
      pointer-events: auto;
    `;
    el.appendChild(piece);
    return piece;
  });

  const cutout = document.createElement('div');
  cutout.className = 'swz-cutout';
  cutout.style.cssText = `
    position: absolute;
    background: transparent;
    pointer-events: ${options.propagateEvents ? 'none' : 'auto'};
  `;
  el.appendChild(cutout);

  backdropEl = el;
  cutoutEl = cutout;
  return el;
}

export function updateBackdrop(
  step: InternalStep,
  options: SWZOptions,
  repositionFn?: () => void,
): void {
  const bd = backdropEl;
  const co = cutoutEl;
  if (!bd || !co) return;

  const target = step.target;
  if (!target) {
    // Centered: no cut-out, full dim
    co.style.display = 'none';
    bd.style.background = options.backdropColor || 'rgba(20,20,21,0.84)';
    bd.style.pointerEvents = options.exitOnClickOutside ? 'auto' : 'none';
    backdropPieces.forEach(piece => {
      piece.style.display = 'none';
    });
    return;
  }

  co.style.display = '';
  bd.style.background = 'transparent';
  bd.style.pointerEvents = 'none';
  backdropPieces.forEach(piece => {
    piece.style.display = '';
    piece.style.background = options.backdropColor || 'rgba(20,20,21,0.84)';
    piece.style.pointerEvents = 'auto';
  });

  const rect = getElementRect(target);
  const pad = options.targetPadding ?? 30;
  const top = rect.top - pad;
  const left = rect.left - pad;
  const width = rect.width + pad * 2;
  const height = rect.height + pad * 2;

  co.style.top = `${top}px`;
  co.style.left = `${left}px`;
  co.style.width = `${width}px`;
  co.style.height = `${height}px`;

  // Toggle pointer-events for propagateEvents
  co.style.pointerEvents = options.propagateEvents ? 'none' : 'auto';

  updateBackdropPieces(left, top, left + width, top + height);
}

export function removeBackdrop(): void {
  if (backdropEl?.parentNode) {
    backdropEl.parentNode.removeChild(backdropEl);
  }
  backdropEl = null;
  cutoutEl = null;
  backdropPieces = [];
}

export function setupBackdropResizeHandler(callback: () => void): void {
  if (resizeHandler) return;
  resizeHandler = () => callback();
  scrollHandler = () => callback();
  window.addEventListener('resize', resizeHandler, { passive: true });
  window.addEventListener('scroll', scrollHandler!, { passive: true });
}

export function teardownBackdropResizeHandler(): void {
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    resizeHandler = null;
  }
  if (scrollHandler) {
    window.removeEventListener('scroll', scrollHandler);
    scrollHandler = null;
  }
}

function updateBackdropPieces(left: number, top: number, right: number, bottom: number): void {
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const cutLeft = clamp(left, 0, viewportW);
  const cutTop = clamp(top, 0, viewportH);
  const cutRight = clamp(right, 0, viewportW);
  const cutBottom = clamp(bottom, 0, viewportH);

  const [topPiece, rightPiece, bottomPiece, leftPiece] = backdropPieces;
  setPiece(topPiece, 0, 0, viewportW, cutTop);
  setPiece(rightPiece, cutRight, cutTop, viewportW - cutRight, Math.max(0, cutBottom - cutTop));
  setPiece(bottomPiece, 0, cutBottom, viewportW, viewportH - cutBottom);
  setPiece(leftPiece, 0, cutTop, cutLeft, Math.max(0, cutBottom - cutTop));
}

function setPiece(piece: HTMLElement | undefined, left: number, top: number, width: number, height: number): void {
  if (!piece) return;
  piece.style.left = `${left}px`;
  piece.style.top = `${top}px`;
  piece.style.width = `${Math.max(0, width)}px`;
  piece.style.height = `${Math.max(0, height)}px`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}
