import type { InternalStep, SWZOptions } from './types';

let dialogEl: HTMLElement | null = null;
let titleEl: HTMLElement | null = null;
let bodyEl: HTMLElement | null = null;
let footerEl: HTMLElement | null = null;
let prevBtn: HTMLButtonElement | null = null;
let nextBtn: HTMLButtonElement | null = null;
let closeBtn: HTMLButtonElement | null = null;
let dotsEl: HTMLElement | null = null;
let progressEl: HTMLElement | null = null;
let progressBarEl: HTMLElement | null = null;
let arrowEl: HTMLElement | null = null;
let headerEl: HTMLElement | null = null;

export function getDialogElement(): HTMLElement {
  return dialogEl!;
}

export function getDialogElements() {
  return { dialogEl, titleEl, bodyEl, footerEl, prevBtn, nextBtn, closeBtn, dotsEl, progressEl, progressBarEl, arrowEl, headerEl };
}

export function createDialog(options: SWZOptions): HTMLElement {
  const el = document.createElement('div');
  el.className = ['swz-dialog', options.dialogClass || ''].filter(Boolean).join(' ');
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('tabindex', '-1');
  el.style.cssText = `
    z-index: ${options.dialogZ ?? 999};
    max-width: ${options.dialogMaxWidth ?? 340}px;
    ${options.dialogWidth ? `width: ${options.dialogWidth}px;` : ''}
  `;

  // Header
  const header = document.createElement('div');
  header.className = 'swz-dialog-header';
  headerEl = header;

  const title = document.createElement('h3');
  title.className = 'swz-dialog-title';
  titleEl = title;
  header.appendChild(title);

  if (options.closeButton) {
    const close = document.createElement('button');
    close.className = 'swz-dialog-close';
    close.setAttribute('aria-label', 'Close tour');
    close.innerHTML = '\u2715';
    closeBtn = close;
    header.appendChild(close);
  }
  el.appendChild(header);

  // Progress bar
  if (options.progressBar) {
    const bar = document.createElement('div');
    bar.className = 'swz-progressbar';
    bar.style.cssText = `
      background: ${options.progressBar};
      transform: scaleX(0);
    `;
    progressBarEl = bar;
    el.appendChild(bar);
  }

  // Body
  const body = document.createElement('div');
  body.className = 'swz-dialog-body';
  bodyEl = body;
  el.appendChild(body);

  // Footer
  const footer = document.createElement('div');
  footer.className = 'swz-dialog-footer';
  footerEl = footer;

  // Prev button
  const prev = document.createElement('button');
  prev.className = 'swz-prev';
  prevBtn = prev;
  footer.appendChild(prev);

  // Spacer
  const spacer = document.createElement('div');
  spacer.style.cssText = 'flex: 1;';
  footer.appendChild(spacer);

  // Progress text
  const progress = document.createElement('span');
  progress.className = 'swz-progress';
  progressEl = progress;
  footer.appendChild(progress);

  // Next / Finish button
  const next = document.createElement('button');
  next.className = 'swz-next';
  nextBtn = next;
  footer.appendChild(next);

  // Dots container
  const dots = document.createElement('div');
  dots.className = 'swz-dots';
  dotsEl = dots;

  el.appendChild(footer);

  // Arrow
  const arrow = document.createElement('div');
  arrow.className = 'swz-arrow';
  arrowEl = arrow;
  el.appendChild(arrow);

  dialogEl = el;
  return el;
}

export function updateDialogContent(
  step: InternalStep,
  steps: InternalStep[],
  activeStep: number,
  options: SWZOptions,
): void {
  if (!dialogEl || !titleEl || !bodyEl || !footerEl) return;

  const total = steps.length;
  const isFirst = activeStep === 0;
  const isLast = activeStep === total - 1;

  // Title
  if (step.title) {
    titleEl.textContent = step.title;
    titleEl.style.display = '';
    dialogEl.setAttribute('aria-label', step.title);
  } else {
    titleEl.style.display = 'none';
    dialogEl.setAttribute('aria-label', 'Tour step');
  }

  // Body content
  bodyEl.innerHTML = step.content;

  // Progress bar
  if (progressBarEl) {
    progressBarEl.style.transform = `scaleX(${(activeStep + 1) / total})`;
  }

  // Prev button
  if (prevBtn) {
    prevBtn.textContent = options.prevLabel || 'Back';
    const showPrev = (options.showButtons !== false) && !options.hidePrev;
    prevBtn.style.display = (showPrev && !isFirst) ? '' : 'none';
  }

  // Next button
  if (nextBtn) {
    nextBtn.textContent = isLast ? (options.finishLabel || 'Finish') : (options.nextLabel || 'Next');
    const showNext = (options.showButtons !== false) && !options.hideNext;
    nextBtn.style.display = showNext ? '' : 'none';
  }

  // Progress text
  if (progressEl) {
    progressEl.style.display = options.showStepProgress ? '' : 'none';
    progressEl.textContent = `${activeStep + 1} / ${total}`;
  }

  // Dots
  updateDots(steps, activeStep, options);
}

function updateDots(steps: InternalStep[], activeStep: number, options: SWZOptions): void {
  const dots = dotsEl;
  if (!dots) return;

  const showDots = options.showStepDots !== false;
  dots.innerHTML = '';

  if (!showDots) {
    dots.style.display = 'none';
    return;
  }

  dots.style.display = 'flex';

  steps.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'swz-dot';
    dot.setAttribute('aria-label', `Step ${i + 1}`);
    if (i === activeStep) {
      dot.style.width = '10px';
      dot.style.height = '10px';
      dot.style.background = '#4f46e5';
    } else {
      dot.style.width = '8px';
      dot.style.height = '8px';
      dot.style.background = '#ccc';
    }
    dot.dataset.index = String(i);
    dots.appendChild(dot);
  });

  // Place dots in correct location
  const placement = options.stepDotsPlacement || 'footer';
  if (placement === 'body' && bodyEl) {
    if (dots.parentNode !== bodyEl) {
      bodyEl.appendChild(dots);
    }
    dots.style.paddingTop = '12px';
  } else if (footerEl) {
    if (dots.parentNode !== footerEl) {
      const spacer = footerEl.querySelector('[style*="flex: 1"]');
      if (spacer) {
        footerEl.insertBefore(dots, spacer);
      } else {
        footerEl.appendChild(dots);
      }
    }
    dots.style.paddingTop = '0';
  }
}

export function showDialogArrow(visible: boolean): void {
  if (arrowEl) {
    arrowEl.style.display = visible ? '' : 'none';
  }
}

export function getDialogArrow(): HTMLElement | null {
  return arrowEl;
}

export function removeDialog(): void {
  if (dialogEl?.parentNode) {
    dialogEl.parentNode.removeChild(dialogEl);
  }
  dialogEl = null;
  titleEl = null;
  bodyEl = null;
  footerEl = null;
  prevBtn = null;
  nextBtn = null;
  closeBtn = null;
  dotsEl = null;
  progressEl = null;
  progressBarEl = null;
  arrowEl = null;
  headerEl = null;
}

export function getDialogButtons() {
  return { prevBtn, nextBtn, closeBtn };
}
