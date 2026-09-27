import type { SWZOptions, InternalStep } from './types';
import { getElementRect } from './utils';

export interface BackdropSession {
  el: HTMLElement;
  cutout: HTMLElement;
  pieces: HTMLElement[];
}

export interface ViewportHandlers {
  resize: () => void;
  scroll: () => void;
}

let handlers: ViewportHandlers | null = null;
let handlerOwner: object | null = null;

function queryStepTarget(
  target: InternalStep['target'],
): Element | undefined {
  if (!target) return undefined;
  if (typeof target === 'string') {
    const el = document.querySelector(target);
    return el ?? undefined;
  }
  return target;
}

export function createBackdrop(options: SWZOptions): BackdropSession {
  const el = document.createElement('div');
  el.className = ['swz-backdrop', options.backdropClass || '']
    .filter(Boolean)
    .join(' ');
  el.style.cssText = `
    position: fixed;
    top: 0; left: 0; width: 100vw; height: 100vh;
    z-index: ${Math.max(0, (options.dialogZ ?? 999) - 1)};
    background: ${options.backdropColor};
    pointer-events: ${options.exitOnClickOutside ? 'auto' : 'none'};
  `;

  const pieces = ['top', 'right', 'bottom', 'left'].map((name) => {
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

  return { el, cutout, pieces };
}

export function updateBackdrop(
  session: BackdropSession,
  step: InternalStep,
  options: SWZOptions,
): void {
  const { el: bd, cutout: co, pieces: backdropPieces } = session;

  const rawTarget = step.target;
  const el = queryStepTarget(step.target);
  if (!el) {
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

  const rect = getElementRect(el);
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

  updateBackdropPieces(backdropPieces, left, top, left + width, top + height);
}

export function removeBackdrop(session: BackdropSession): void {
  if (session.el.parentNode) {
    session.el.parentNode.removeChild(session.el);
  }
}

export function setupViewportHandlers(
  owner: object,
  callback: () => void,
): void {
  // One shared set of window listeners; ownership transfers to the latest tour.
  teardownViewportHandlers();
  handlers = {
    resize: () => callback(),
    scroll: () => callback(),
  };
  handlerOwner = owner;
  window.addEventListener('resize', handlers.resize, { passive: true });
  window.addEventListener('scroll', handlers.scroll, { passive: true });
}

export function teardownViewportHandlers(owner?: object): void {
  if (!handlers) return;
  // Only the owning instance may release the shared listeners.
  if (owner !== undefined && handlerOwner !== null && handlerOwner !== owner) return;
  window.removeEventListener('resize', handlers.resize);
  window.removeEventListener('scroll', handlers.scroll);
  handlers = null;
  handlerOwner = null;
}

function updateBackdropPieces(
  backdropPieces: HTMLElement[],
  left: number,
  top: number,
  right: number,
  bottom: number,
): void {
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
