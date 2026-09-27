import type { InternalStep, SWZOptions } from './types';

export interface DialogSession {
  el: HTMLElement;
  header: HTMLElement;
  title: HTMLElement;
  body: HTMLElement;
  footer: HTMLElement;
  prevBtn: HTMLButtonElement;
  nextBtn: HTMLButtonElement;
  closeBtn: HTMLButtonElement | null;
  dots: HTMLElement;
  progress: HTMLElement;
  progressBar: HTMLElement | null;
  arrow: HTMLElement;
}

export function createDialog(options: SWZOptions): DialogSession {
  const el = document.createElement('div');
  el.className = ['swz-dialog', options.dialogClass || ''].filter(Boolean).join(' ');
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('tabindex', '-1');
  // Hidden until the first position pass so the dialog never flashes at (0,0)
  el.style.cssText = `
    visibility: hidden;
    z-index: ${Math.max(0, options.dialogZ ?? 999)};
    max-width: ${options.dialogMaxWidth ?? 340}px;
    ${options.dialogWidth ? `width: ${options.dialogWidth}px;` : ''}
  `;

  // Header
  const header = document.createElement('div');
  header.className = 'swz-dialog-header';

  const title = document.createElement('h3');
  title.className = 'swz-dialog-title';
  header.appendChild(title);

  let closeBtn: HTMLButtonElement | null = null;
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
  let progressBar: HTMLElement | null = null;
  if (options.progressBar) {
    const bar = document.createElement('div');
    bar.className = 'swz-progressbar';
    bar.style.cssText = `
      background: ${options.progressBar};
      transform: scaleX(0);
    `;
    progressBar = bar;
    el.appendChild(bar);
  }

  // Body
  const body = document.createElement('div');
  body.className = 'swz-dialog-body';
  el.appendChild(body);

  // Footer
  const footer = document.createElement('div');
  footer.className = 'swz-dialog-footer';

  // Prev button
  const prev = document.createElement('button');
  prev.className = 'swz-prev';
  footer.appendChild(prev);

  // Spacer
  const spacer = document.createElement('div');
  spacer.style.cssText = 'flex: 1;';
  footer.appendChild(spacer);

  // Progress text
  const progress = document.createElement('span');
  progress.className = 'swz-progress';
  footer.appendChild(progress);

  // Next / Finish button
  const next = document.createElement('button');
  next.className = 'swz-next';
  footer.appendChild(next);

  // Dots container
  const dots = document.createElement('div');
  dots.className = 'swz-dots';

  el.appendChild(footer);

  // Arrow
  const arrow = document.createElement('div');
  arrow.className = 'swz-arrow';
  el.appendChild(arrow);

  return { el, header, title, body, footer, prevBtn: prev, nextBtn: next, closeBtn, dots, progress, progressBar, arrow };
}

export function updateDialogContent(
  session: DialogSession,
  step: InternalStep,
  steps: InternalStep[],
  activeStep: number,
  options: SWZOptions,
): void {
  const { el, title, body, footer, prevBtn, nextBtn, dots, progress, progressBar } = session;

  const total = steps.length;
  const isFirst = activeStep === 0;
  const isLast = activeStep === total - 1;

  // Title
  if (step.title) {
    title.textContent = step.title;
    title.style.display = '';
    el.setAttribute('aria-label', step.title);
  } else {
    title.style.display = 'none';
    el.setAttribute('aria-label', 'Tour step');
  }

  // Body content
  session.body.innerHTML = step.content;

  // Progress bar
  if (progressBar) {
    progressBar.style.transform = `scaleX(${(activeStep + 1) / total})`;
  }

  // Prev button
  prevBtn.textContent = options.prevLabel || 'Back';
  const showPrev = (options.showButtons !== false) && !options.hidePrev;
  prevBtn.style.display = (showPrev && !isFirst) ? '' : 'none';

  // Next button
  nextBtn.textContent = isLast ? (options.finishLabel || 'Finish') : (options.nextLabel || 'Next');
  const showNext = (options.showButtons !== false) && !options.hideNext;
  nextBtn.style.display = showNext ? '' : 'none';

  // Progress text
  progress.style.display = options.showStepProgress ? '' : 'none';
  progress.textContent = `${activeStep + 1} / ${total}`;

  // Dots
  updateDots(session, steps, activeStep, options);

  // Touch unused destructures to keep intent explicit
  void dots;
}

function updateDots(session: DialogSession, steps: InternalStep[], activeStep: number, options: SWZOptions): void {
  const dots = session.dots;
  const body = session.body;
  const footer = session.footer;

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
      dot.style.background = '#007370';
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
  if (placement === 'body') {
    if (dots.parentNode !== body) {
      body.appendChild(dots);
    }
    dots.style.paddingTop = '12px';
  } else {
    if (dots.parentNode !== footer) {
      const spacer = footer.querySelector('[style*="flex: 1"]');
      if (spacer) {
        footer.insertBefore(dots, spacer);
      } else {
        footer.appendChild(dots);
      }
    }
    dots.style.paddingTop = '0';
  }
}

export function showDialogArrow(session: DialogSession, visible: boolean): void {
  session.arrow.style.display = visible ? '' : 'none';
}

export function removeDialog(session: DialogSession): void {
  if (session.el.parentNode) {
    session.el.parentNode.removeChild(session.el);
  }
}
