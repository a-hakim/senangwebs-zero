/*! SenangWebs Zero v0.9.3 | MIT License | https://github.com/a-hakim/senangwebs-zero */
const DEFAULTS = {
    steps: [],
    autoScroll: true,
    autoScrollSmooth: true,
    autoScrollOffset: 20,
    backdropColor: 'rgba(20,20,21,0.84)',
    backdropClass: '',
    backdropAnimate: true,
    targetPadding: 30,
    dialogClass: '',
    dialogZ: 999,
    dialogWidth: 0,
    dialogMaxWidth: 340,
    dialogPlacement: undefined,
    dialogAnimate: true,
    closeButton: true,
    nextLabel: 'Next',
    prevLabel: 'Back',
    finishLabel: 'Finish',
    hideNext: false,
    hidePrev: false,
    showButtons: true,
    showStepDots: true,
    stepDotsPlacement: 'footer',
    showStepProgress: true,
    progressBar: '',
    completeOnFinish: true,
    rememberStep: false,
    exitOnEscape: true,
    exitOnClickOutside: true,
    keyboardControls: true,
    propagateEvents: false,
    debug: true,
};

function mergeOptions(userOptions, baseOptions) {
    const opts = { ...DEFAULTS, ...(baseOptions || {}) };
    if (userOptions) {
        for (const key of Object.keys(userOptions)) {
            const val = userOptions[key];
            if (val !== undefined && val !== null) {
                opts[key] = val;
            }
        }
    }
    return opts;
}
function resolveStepTarget(step, index, debug) {
    const target = step.target;
    if (!target)
        return undefined;
    if (typeof target === 'string') {
        try {
            const el = document.querySelector(target);
            if (!el && debug) {
                console.warn(`[swz] Step ${index}: target selector "${target}" resolved to null, falling back to centered.`);
            }
            return el || undefined;
        }
        catch {
            if (debug) {
                console.warn(`[swz] Step ${index}: target selector "${target}" is invalid, falling back to centered.`);
            }
            return undefined;
        }
    }
    const el = target;
    if ('isConnected' in el && !el.isConnected) {
        if (debug) {
            console.warn(`[swz] Step ${index}: target is no longer connected to the DOM, falling back to centered.`);
        }
        return undefined;
    }
    return el;
}
function scanDOM(group) {
    const elements = document.querySelectorAll('[data-swz-tour]');
    const steps = [];
    elements.forEach((el, i) => {
        const content = el.getAttribute('data-swz-tour') || '';
        const title = el.getAttribute('data-swz-title') || undefined;
        const stepGroup = el.getAttribute('data-swz-group') || undefined;
        const orderStr = el.getAttribute('data-swz-order');
        const order = parseOptionalNumber(orderStr);
        const marginStr = el.getAttribute('data-swz-margin');
        const margin = parseOptionalNumber(marginStr);
        const fixed = el.hasAttribute('data-swz-fixed');
        const placement = parsePlacement(el.getAttribute('data-swz-placement'));
        if (group ? stepGroup !== group : stepGroup)
            return;
        steps.push({
            content,
            title,
            target: el,
            order,
            group: stepGroup,
            margin,
            fixed,
            placement,
            _index: i,
        });
    });
    return steps;
}
function objectStepsToInternal(steps, debug) {
    if (!Array.isArray(steps)) {
        if (debug)
            console.warn('[swz] addSteps() expects an array of SWZStep objects.');
        return [];
    }
    // Target is kept as declared (string or element) and resolved lazily at
    // render time, so steps declared before their elements exist still work.
    return steps.map((s, i) => ({
        content: s.content,
        title: s.title,
        target: s.target,
        order: s.order,
        group: s.group,
        margin: s.margin,
        fixed: s.fixed,
        placement: s.placement,
        _index: i,
    }));
}
function mergeSteps(domSteps, objectSteps) {
    return [...domSteps, ...objectSteps];
}
function orderSteps(steps) {
    return steps
        .map((s, i) => ({ ...s, _sortIndex: i }))
        .sort((a, b) => {
        const aOrder = a.order ?? Infinity;
        const bOrder = b.order ?? Infinity;
        if (aOrder !== bOrder)
            return aOrder - bOrder;
        return a._sortIndex - b._sortIndex;
    })
        .map(({ _sortIndex: _, ...s }) => s);
}
function parseOptionalNumber(value) {
    if (value === null || value.trim() === '')
        return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}
function parsePlacement(value) {
    if (!value)
        return undefined;
    const normalized = value.trim().toLowerCase();
    if (normalized === 'auto' ||
        normalized === 'top' ||
        normalized === 'right' ||
        normalized === 'bottom' ||
        normalized === 'left') {
        return normalized;
    }
    return undefined;
}

const STORAGE_PREFIX = 'swz:';
function normalizeGroupKey(group) {
    return !group || group === 'tours' ? 'tour' : group;
}
function getStorageKey(group) {
    return `${STORAGE_PREFIX}completed:${normalizeGroupKey(group)}`;
}
function getStepStorageKey(group) {
    return `${STORAGE_PREFIX}step:${normalizeGroupKey(group)}`;
}
function isFinished(group = 'tour') {
    try {
        return localStorage.getItem(getStorageKey(group)) === '1';
    }
    catch {
        return false;
    }
}
function setFinished(group = 'tour') {
    try {
        localStorage.setItem(getStorageKey(group), '1');
    }
    catch { /* degrade gracefully */ }
}
function deleteFinished(group = 'tour') {
    try {
        localStorage.removeItem(getStorageKey(group));
    }
    catch { /* degrade gracefully */ }
}
function getStoredStep(group = 'tour') {
    try {
        const val = localStorage.getItem(getStepStorageKey(group));
        return val !== null ? parseInt(val, 10) : null;
    }
    catch {
        return null;
    }
}
function setStoredStep(group = 'tour', step) {
    try {
        localStorage.setItem(getStepStorageKey(group), String(step));
    }
    catch { /* degrade gracefully */ }
}
function deleteStoredStep(group = 'tour') {
    try {
        localStorage.removeItem(getStepStorageKey(group));
    }
    catch { /* degrade gracefully */ }
}

function getElementRect(el) {
    return el.getBoundingClientRect();
}
function logDebug(message, debug) {
    if (debug) {
        console.log(`[swz] ${message}`);
    }
}
function warnDebug(message, debug) {
    if (debug) {
        console.warn(`[swz] ${message}`);
    }
}

let handlers = null;
let handlerOwner = null;
function queryStepTarget$1(target) {
    if (!target)
        return undefined;
    if (typeof target === 'string') {
        const el = document.querySelector(target);
        return el ?? undefined;
    }
    return target;
}
function createBackdrop(options) {
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
function updateBackdrop(session, step, options) {
    const { el: bd, cutout: co, pieces: backdropPieces } = session;
    step.target;
    const el = queryStepTarget$1(step.target);
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
function removeBackdrop(session) {
    if (session.el.parentNode) {
        session.el.parentNode.removeChild(session.el);
    }
}
function setupViewportHandlers(owner, callback) {
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
function teardownViewportHandlers(owner) {
    if (!handlers)
        return;
    // Only the owning instance may release the shared listeners.
    if (owner !== undefined && handlerOwner !== null && handlerOwner !== owner)
        return;
    window.removeEventListener('resize', handlers.resize);
    window.removeEventListener('scroll', handlers.scroll);
    handlers = null;
    handlerOwner = null;
}
function updateBackdropPieces(backdropPieces, left, top, right, bottom) {
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const cutLeft = clamp$1(left, 0, viewportW);
    const cutTop = clamp$1(top, 0, viewportH);
    const cutRight = clamp$1(right, 0, viewportW);
    const cutBottom = clamp$1(bottom, 0, viewportH);
    const [topPiece, rightPiece, bottomPiece, leftPiece] = backdropPieces;
    setPiece(topPiece, 0, 0, viewportW, cutTop);
    setPiece(rightPiece, cutRight, cutTop, viewportW - cutRight, Math.max(0, cutBottom - cutTop));
    setPiece(bottomPiece, 0, cutBottom, viewportW, viewportH - cutBottom);
    setPiece(leftPiece, 0, cutTop, cutLeft, Math.max(0, cutBottom - cutTop));
}
function setPiece(piece, left, top, width, height) {
    if (!piece)
        return;
    piece.style.left = `${left}px`;
    piece.style.top = `${top}px`;
    piece.style.width = `${Math.max(0, width)}px`;
    piece.style.height = `${Math.max(0, height)}px`;
}
function clamp$1(value, min, max) {
    return Math.max(min, Math.min(value, max));
}

function createDialog(options) {
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
    let closeBtn = null;
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
    let progressBar = null;
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
function updateDialogContent(session, step, steps, activeStep, options) {
    const { el, title, body, footer, prevBtn, nextBtn, dots, progress, progressBar } = session;
    const total = steps.length;
    const isFirst = activeStep === 0;
    const isLast = activeStep === total - 1;
    // Title
    if (step.title) {
        title.textContent = step.title;
        title.style.display = '';
        el.setAttribute('aria-label', step.title);
    }
    else {
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
}
function updateDots(session, steps, activeStep, options) {
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
        }
        else {
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
    }
    else {
        if (dots.parentNode !== footer) {
            const spacer = footer.querySelector('[style*="flex: 1"]');
            if (spacer) {
                footer.insertBefore(dots, spacer);
            }
            else {
                footer.appendChild(dots);
            }
        }
        dots.style.paddingTop = '0';
    }
}
function showDialogArrow(session, visible) {
    session.arrow.style.display = visible ? '' : 'none';
}
function removeDialog(session) {
    if (session.el.parentNode) {
        session.el.parentNode.removeChild(session.el);
    }
}

// Placement priority order for auto mode
const PLACEMENT_ORDER = ['bottom', 'top', 'right', 'left'];
function queryStepTarget(target) {
    if (!target)
        return undefined;
    if (typeof target === 'string') {
        const el = document.querySelector(target);
        return el ?? undefined;
    }
    return target;
}
function positionDialog(session, step, options) {
    const dialog = session.el;
    const el = queryStepTarget(step.target);
    if (!el) {
        // Centered
        showDialogArrow(session, false);
        const dw = dialog.offsetWidth || 300;
        const dh = dialog.offsetHeight || 200;
        return {
            x: (window.innerWidth - dw) / 2,
            y: (window.innerHeight - dh) / 2,
            placement: 'center',
        };
    }
    showDialogArrow(session, true);
    const targetRect = getElementRect(el);
    const pad = options.targetPadding ?? 30;
    const anchorRect = {
        x: targetRect.left - pad,
        y: targetRect.top - pad,
        width: targetRect.width + pad * 2,
        height: targetRect.height + pad * 2,
    };
    const gap = 12;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const dw = dialog.offsetWidth || 300;
    const dh = dialog.offsetHeight || 150;
    const preferred = step.placement ?? options.dialogPlacement;
    let bestResult = null;
    const placements = preferred && preferred !== 'auto'
        ? [preferred, ...PLACEMENT_ORDER.filter(p => p !== preferred)]
        : PLACEMENT_ORDER;
    for (const placement of placements) {
        const result = shiftPlacement(computePlacement(anchorRect, dw, dh, gap, placement), placement, dw, dh, viewportW, viewportH);
        if (hasMainAxisRoom(result, placement, dw, dh, viewportW, viewportH)) {
            bestResult = withArrow(result, placement, anchorRect, dw, dh);
            break;
        }
    }
    if (!bestResult) {
        const placement = chooseBestPlacement(anchorRect, dw, dh, gap, viewportW, viewportH);
        bestResult = withArrow(clampPlacement(computePlacement(anchorRect, dw, dh, gap, placement), dw, dh, viewportW, viewportH), placement, anchorRect, dw, dh);
    }
    return bestResult;
}
function computePlacement(anchor, dw, dh, gap, placement) {
    const anchorCX = anchor.x + anchor.width / 2;
    const anchorCY = anchor.y + anchor.height / 2;
    let x;
    let y;
    switch (placement) {
        case 'top': {
            x = anchorCX - dw / 2;
            y = anchor.y - dh - gap;
            break;
        }
        case 'bottom': {
            x = anchorCX - dw / 2;
            y = anchor.y + anchor.height + gap;
            break;
        }
        case 'left': {
            x = anchor.x - dw - gap;
            y = anchorCY - dh / 2;
            break;
        }
        case 'right': {
            x = anchor.x + anchor.width + gap;
            y = anchorCY - dh / 2;
            break;
        }
    }
    return { x, y, placement };
}
function shiftPlacement(result, placement, dw, dh, vw, vh) {
    const margin = 8;
    const shifted = { ...result };
    if (placement === 'top' || placement === 'bottom') {
        shifted.x = clamp(shifted.x, margin, Math.max(margin, vw - dw - margin));
    }
    else {
        shifted.y = clamp(shifted.y, margin, Math.max(margin, vh - dh - margin));
    }
    return shifted;
}
function clampPlacement(result, dw, dh, vw, vh) {
    const margin = 8;
    return {
        ...result,
        x: clamp(result.x, margin, Math.max(margin, vw - dw - margin)),
        y: clamp(result.y, margin, Math.max(margin, vh - dh - margin)),
    };
}
function hasMainAxisRoom(result, placement, dw, dh, vw, vh) {
    const margin = 8;
    switch (placement) {
        case 'top':
            return result.y >= margin;
        case 'bottom':
            return result.y + dh <= vh - margin;
        case 'left':
            return result.x >= margin;
        case 'right':
            return result.x + dw <= vw - margin;
    }
}
function chooseBestPlacement(anchor, dw, dh, gap, vw, vh) {
    const spaces = {
        top: anchor.y - gap,
        bottom: vh - (anchor.y + anchor.height + gap),
        left: anchor.x - gap,
        right: vw - (anchor.x + anchor.width + gap),
    };
    const entries = Object.entries(spaces);
    const needed = { top: dh, bottom: dh, left: dw, right: dw };
    entries.sort((a, b) => {
        const aFits = a[1] >= needed[a[0]] ? 1 : 0;
        const bFits = b[1] >= needed[b[0]] ? 1 : 0;
        if (aFits !== bFits)
            return bFits - aFits;
        return b[1] - a[1];
    });
    return entries[0][0];
}
function withArrow(result, placement, anchor, dw, dh) {
    const anchorCX = anchor.x + anchor.width / 2;
    const anchorCY = anchor.y + anchor.height / 2;
    const arrowSize = 12;
    const arrowHalf = arrowSize / 2;
    const arrowMargin = 10;
    const withArrowResult = { ...result };
    switch (placement) {
        case 'top': {
            const arrowCenterX = clamp(anchorCX - result.x, arrowMargin, Math.max(arrowMargin, dw - arrowMargin));
            withArrowResult.arrowX = arrowCenterX - arrowHalf;
            withArrowResult.arrowY = dh - arrowHalf;
            withArrowResult.arrowRotation = 135;
            break;
        }
        case 'bottom': {
            const arrowCenterX = clamp(anchorCX - result.x, arrowMargin, Math.max(arrowMargin, dw - arrowMargin));
            withArrowResult.arrowX = arrowCenterX - arrowHalf;
            withArrowResult.arrowY = -arrowHalf;
            withArrowResult.arrowRotation = -45;
            break;
        }
        case 'left': {
            const arrowCenterY = clamp(anchorCY - result.y, arrowMargin, Math.max(arrowMargin, dh - arrowMargin));
            withArrowResult.arrowX = dw - arrowHalf;
            withArrowResult.arrowY = arrowCenterY - arrowHalf;
            withArrowResult.arrowRotation = 45;
            break;
        }
        case 'right': {
            const arrowCenterY = clamp(anchorCY - result.y, arrowMargin, Math.max(arrowMargin, dh - arrowMargin));
            withArrowResult.arrowX = -arrowHalf;
            withArrowResult.arrowY = arrowCenterY - arrowHalf;
            withArrowResult.arrowRotation = 225;
            break;
        }
    }
    return withArrowResult;
}
function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
}
function applyPosition(dialogSession, result) {
    const dialog = dialogSession.el;
    dialog.style.left = `${result.x}px`;
    dialog.style.top = `${result.y}px`;
    dialog.style.visibility = 'visible';
    const arrow = dialogSession.arrow;
    if (result.arrowX !== undefined && result.arrowY !== undefined && result.arrowRotation !== undefined) {
        arrow.style.display = '';
        arrow.style.left = `${result.arrowX}px`;
        arrow.style.top = `${result.arrowY}px`;
        arrow.style.transform = `rotate(${result.arrowRotation}deg)`;
    }
    else {
        arrow.style.display = 'none';
    }
}

function scrollTargetIntoView(step, options) {
    return new Promise((resolve) => {
        if (!options.autoScroll || !step.target) {
            resolve();
            return;
        }
        const target = step.target;
        const rect = target.getBoundingClientRect();
        const margin = step.margin ?? options.autoScrollOffset ?? 20;
        const windowH = window.innerHeight;
        const windowW = window.innerWidth;
        const isVisible = rect.top >= margin &&
            rect.left >= margin &&
            rect.bottom <= windowH - margin &&
            rect.right <= windowW - margin;
        if (isVisible) {
            resolve();
            return;
        }
        // Check prefers-reduced-motion
        const prefersReduced = typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const behavior = (options.autoScrollSmooth !== false && !prefersReduced) ? 'smooth' : 'auto';
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

const FOCUSABLE_SELECTOR = [
    'button:not([disabled])',
    'a[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(', ');
class SenangWebsZero {
    constructor(userOptions) {
        // Public properties
        this.isVisible = false;
        this.activeStep = 0;
        this.tourSteps = [];
        this.backendSteps = [];
        // Object steps retained across refreshes
        this._objectSteps = [];
        // Lifecycle handlers (single-handler, last-wins)
        this._onBeforeStepChange = null;
        this._onAfterStepChange = null;
        this._onBeforeExit = null;
        this._onAfterExit = null;
        this._onFinish = null;
        // Internal state
        this._currentGroup = 'tour';
        this._resizeDebounceTimer = null;
        this._scrollRafId = null;
        this._keyHandler = null;
        this._backdropClickHandler = null;
        this._dotClickHandler = null;
        this._previousFocus = null;
        // Async transition guard: serializes step changes / finish / exit
        this._transitioning = false;
        this.options = mergeOptions(userOptions);
        if (userOptions && 'steps' in userOptions) {
            this._replaceObjectSteps(userOptions.steps);
        }
    }
    // -- Public API --
    async start(group) {
        if (this.isVisible) {
            warnDebug('start() called while tour is already visible. Call exit() first.', this.options.debug ?? true);
            return;
        }
        if (this._transitioning) {
            warnDebug('start() skipped: another lifecycle action is in progress.', this.options.debug ?? true);
            return;
        }
        this._currentGroup = normalizeGroupKey(group);
        this.group = group || undefined;
        // Resolve steps
        this._resolveSteps(group);
        if (this.backendSteps.length === 0) {
            warnDebug('No steps found for this tour.', this.options.debug ?? true);
            return;
        }
        // Determine starting step
        if (this.options.rememberStep) {
            const stored = getStoredStep(this._currentGroup);
            if (stored !== null && stored >= 0 && stored < this.backendSteps.length) {
                this.activeStep = stored;
            }
            else {
                this.activeStep = 0;
            }
        }
        else {
            this.activeStep = 0;
        }
        // Mount DOM
        this._previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        this._mount();
        this.isVisible = true;
        try {
            // Render first step
            await this._renderActiveStep(false);
            logDebug(`Tour started. Group: "${this._currentGroup}", Steps: ${this.backendSteps.length}`, this.options.debug ?? true);
        }
        finally {
            this._transitioning = false;
        }
    }
    visitStep(step) {
        if (step === 'next')
            return this.nextStep();
        if (step === 'prev')
            return this.prevStep();
        if (typeof step === 'number')
            return this._goToStep(step);
        return Promise.resolve();
    }
    async nextStep() {
        if (!this.isVisible || this._transitioning)
            return;
        const lastIndex = this.backendSteps.length - 1;
        if (this.activeStep >= lastIndex) {
            await this._finish();
            return;
        }
        await this._goToStep(this.activeStep + 1);
    }
    async prevStep() {
        if (!this.isVisible || this._transitioning || this.activeStep <= 0)
            return;
        await this._goToStep(this.activeStep - 1);
    }
    async exit() {
        if (!this.isVisible)
            return;
        // Snap in-flight navigation and wait for it to settle so we tear down cleanly.
        if (this._transitioning) {
            this._cancelInFlightRender();
            return;
        }
        // Fire onBeforeExit (gating)
        if (this._onBeforeExit) {
            try {
                const result = await this._onBeforeExit();
                if (result === false) {
                    logDebug('Exit cancelled by onBeforeExit handler.', this.options.debug ?? true);
                    return;
                }
            }
            catch {
                logDebug('Exit cancelled by onBeforeExit rejection.', this.options.debug ?? true);
                return;
            }
        }
        this._transitioning = true;
        try {
            this._teardown();
            this.isVisible = false;
            if (this._onAfterExit) {
                try {
                    await this._onAfterExit();
                }
                catch { /* not gating */ }
            }
            logDebug('Tour exited.', this.options.debug ?? true);
        }
        finally {
            this._transitioning = false;
        }
    }
    async finishTour(exit = true, group) {
        // Fire onFinish (gating) — same pipeline as the Finish button.
        if (this._onFinish) {
            try {
                const result = await this._onFinish();
                if (result === false) {
                    logDebug('Finish cancelled by onFinish handler.', this.options.debug ?? true);
                    return;
                }
            }
            catch {
                logDebug('Finish cancelled by onFinish rejection.', this.options.debug ?? true);
                return;
            }
        }
        this._recordCompletion(normalizeGroupKey(group === undefined ? this._currentGroup : group));
        if (exit && this.isVisible) {
            await this.exit();
        }
    }
    isFinishedMethod(group) {
        return isFinished(normalizeGroupKey(group));
    }
    deleteFinishedTour(group) {
        const key = normalizeGroupKey(group);
        deleteFinished(key);
        deleteStoredStep(key);
    }
    addSteps(steps) {
        if (!Array.isArray(steps)) {
            warnDebug('addSteps() expects an array of SWZStep objects.', this.options.debug ?? true);
            return;
        }
        this._objectSteps.push(...steps);
    }
    setOptions(userOptions) {
        this.options = mergeOptions(userOptions, this.options);
        if (userOptions && 'steps' in userOptions) {
            this._replaceObjectSteps(userOptions.steps);
        }
    }
    async refresh() {
        while (this._resizeDebounceTimer) {
            clearTimeout(this._resizeDebounceTimer);
            this._resizeDebounceTimer = null;
        }
        this._resolveSteps(this.group);
        if (this.activeStep >= this.backendSteps.length) {
            // Prefer the persisted step when available so refresh() stays consistent
            // with start()'s rememberStep behavior.
            if (this.options.rememberStep) {
                const stored = getStoredStep(this._currentGroup);
                this.activeStep = stored !== null && stored >= 0 && stored < this.backendSteps.length
                    ? stored
                    : Math.max(0, this.backendSteps.length - 1);
            }
            else {
                this.activeStep = Math.max(0, this.backendSteps.length - 1);
            }
        }
        if (this.backendSteps.length === 0) {
            warnDebug('No steps found after refresh.', this.options.debug ?? true);
            if (this.isVisible) {
                this._teardown();
                this.isVisible = false;
            }
            return;
        }
        if (this.isVisible && this.backendSteps.length > 0) {
            await this._renderActiveStep(true);
        }
    }
    async refreshDialog() {
        if (!this.isVisible || this.backendSteps.length === 0)
            return;
        if (this._transitioning) {
            warnDebug('refreshDialog() skipped: a step transition is in progress.', this.options.debug ?? true);
            return;
        }
        this._syncPublicStepsToBackend();
        const step = this.backendSteps[this.activeStep];
        if (!step)
            return;
        updateDialogContent(this._dialogSession, step, this.backendSteps, this.activeStep, this.options);
        await this._positionDialog(step);
    }
    async updatePositions() {
        if (!this.isVisible || this.backendSteps.length === 0)
            return;
        if (this._transitioning) {
            warnDebug('updatePositions() skipped: a step transition is in progress.', this.options.debug ?? true);
            return;
        }
        this._syncPublicStepsToBackend();
        const step = this.backendSteps[this.activeStep];
        if (!step)
            return;
        updateBackdrop(this._backdropSession, step, this.options);
        await this._positionDialog(step);
    }
    // Lifecycle hook registration
    onBeforeStepChange(fn) {
        this._onBeforeStepChange = fn;
    }
    onAfterStepChange(fn) {
        this._onAfterStepChange = fn;
    }
    onBeforeExit(fn) {
        this._onBeforeExit = fn;
    }
    onAfterExit(fn) {
        this._onAfterExit = fn;
    }
    onFinish(fn) {
        this._onFinish = fn;
    }
    // Alias
    finish(exit, group) {
        return this.finishTour(exit, group);
    }
    // Shorthand for isFinishedMethod
    isFinished(group) {
        return this.isFinishedMethod(group);
    }
    /** Permanently tear down an instance so it can be garbage-collected. */
    destroy() {
        this._cancelInFlightRender();
        this._objectSteps = [];
        this.backendSteps = [];
        this.tourSteps = [];
        this._onBeforeStepChange = null;
        this._onAfterStepChange = null;
        this._onBeforeExit = null;
        this._onAfterExit = null;
        this._onFinish = null;
        this._previousFocus = null;
    }
    // -- Private methods --
    _resolveSteps(group) {
        const domSteps = scanDOM(group);
        const objSteps = objectStepsToInternal(this._objectSteps, this.options.debug ?? true);
        // Filter object steps by group if needed
        const filteredObjectSteps = objSteps.filter(s => group ? s.group === group : !s.group);
        const merged = mergeSteps(domSteps, filteredObjectSteps);
        this.backendSteps = orderSteps(merged);
        // Sync tourSteps for public access
        this.tourSteps = this.backendSteps.map(s => ({
            content: s.content,
            title: s.title,
            // Keep the raw declared target (string or element); resolved at render.
            target: s.target,
            order: s.order,
            group: s.group,
            margin: s.margin,
            fixed: s.fixed,
            placement: s.placement,
        }));
    }
    _mount() {
        this._transitioning = true;
        // Create backdrop
        this._backdropSession = createBackdrop(this.options);
        this.backdrop = this._backdropSession.el;
        document.body.appendChild(this.backdrop);
        // Create dialog
        this._dialogSession = createDialog(this.options);
        this.dialog = this._dialogSession.el;
        document.body.appendChild(this.dialog);
        // Wire up dialog button handlers
        const { prevBtn, nextBtn, closeBtn } = this._dialogSession;
        prevBtn.onclick = () => this.prevStep();
        nextBtn.onclick = () => this.nextStep();
        if (closeBtn) {
            closeBtn.onclick = () => this.exit();
        }
        // Wire up dot clicks
        this._dotClickHandler = (e) => {
            const dot = e.target.closest('.swz-dot');
            if (dot && dot.dataset.index !== undefined) {
                const index = parseInt(dot.dataset.index, 10);
                this.visitStep(index);
            }
        };
        this.dialog.addEventListener('click', this._dotClickHandler);
        // Keyboard handler
        this._keyHandler = (e) => {
            if (this.options.keyboardControls) {
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.nextStep();
                }
                else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.prevStep();
                }
            }
            // Escape is respected independently of keyboardControls so users can
            // always bail out when exitOnEscape is enabled.
            if (e.key === 'Escape' && this.options.exitOnEscape) {
                e.preventDefault();
                this.exit();
                return;
            }
            // Tab trapping stays active for the dialog even when arrow shortcuts are disabled.
            if (e.key === 'Tab') {
                this._trapTab(e);
            }
        };
        document.addEventListener('keydown', this._keyHandler);
        // Backdrop click handler
        if (this.options.exitOnClickOutside) {
            this._backdropClickHandler = (e) => {
                const target = e.target;
                if (target === this.backdrop ||
                    target.classList.contains('swz-backdrop') ||
                    target.classList.contains('swz-backdrop-piece') ||
                    target.classList.contains('swz-cutout')) {
                    this.exit();
                }
            };
            this.backdrop.addEventListener('click', this._backdropClickHandler);
        }
        // Window resize + scroll listeners (ownership held by this instance)
        setupViewportHandlers(this, () => this._onViewportChange());
    }
    _teardown() {
        // Remove listeners
        if (this._keyHandler) {
            document.removeEventListener('keydown', this._keyHandler);
            this._keyHandler = null;
        }
        if (this._dotClickHandler) {
            this.dialog?.removeEventListener('click', this._dotClickHandler);
            this._dotClickHandler = null;
        }
        if (this._backdropClickHandler) {
            this.backdrop?.removeEventListener('click', this._backdropClickHandler);
            this._backdropClickHandler = null;
        }
        teardownViewportHandlers(this);
        if (this._resizeDebounceTimer) {
            clearTimeout(this._resizeDebounceTimer);
            this._resizeDebounceTimer = null;
        }
        this._cancelScheduledScrollRaf();
        // Remove DOM
        removeDialog(this._dialogSession);
        removeBackdrop(this._backdropSession);
        this._restoreFocus();
    }
    _cancelInFlightRender() {
        // Drop pending debounce/raf work; the running transition's effects against
        // a torn-down dialog are no-ops, so a quick re-exit call is safe.
        this._transitioning = false;
        this.exit();
    }
    async _goToStep(index) {
        if (!this.isVisible || this._transitioning)
            return;
        if (index < 0 || index >= this.backendSteps.length)
            return;
        this._transitioning = true;
        try {
            // Fire onBeforeStepChange (gating)
            if (this._onBeforeStepChange) {
                try {
                    const result = await this._onBeforeStepChange();
                    if (result === false) {
                        logDebug('Step change cancelled by onBeforeStepChange handler.', this.options.debug ?? true);
                        return;
                    }
                }
                catch {
                    logDebug('Step change cancelled by onBeforeStepChange rejection.', this.options.debug ?? true);
                    return;
                }
            }
            this.activeStep = index;
            // Persist step if rememberStep
            if (this.options.rememberStep) {
                setStoredStep(this._currentGroup, index);
            }
            await this._renderActiveStep(true);
            // Fire onAfterStepChange
            if (this._onAfterStepChange) {
                try {
                    await this._onAfterStepChange();
                }
                catch { /* not gating */ }
            }
        }
        finally {
            this._transitioning = false;
        }
    }
    async _renderActiveStep(animate) {
        const step = this.backendSteps[this.activeStep];
        if (!step || !this.isVisible)
            return;
        this._setAnimationClasses(animate);
        // Lazy resolution for scroll; the declared target is never mutated so
        // string selectors re-resolve on every render (late-mounted targets work).
        const resolvedTarget = resolveStepTarget(step, this.activeStep, this.options.debug ?? true);
        // Scroll into view
        await scrollTargetIntoView({ ...step, target: resolvedTarget }, this.options);
        // Update backdrop
        updateBackdrop(this._backdropSession, step, this.options);
        // Update dialog content
        updateDialogContent(this._dialogSession, step, this.backendSteps, this.activeStep, this.options);
        // On first render, remove animate classes so appearance is instant
        if (!animate) {
            this.dialog?.classList.remove('swz-animate');
            this.backdrop?.classList.remove('swz-animate');
        }
        // Position
        await this._positionDialog(step);
        // After first layout, re-add animate classes for future step transitions
        if (!animate && (this.options.dialogAnimate || this.options.backdropAnimate)) {
            requestAnimationFrame(() => {
                if (this.options.dialogAnimate) {
                    this.dialog?.classList.add('swz-animate');
                }
                if (this.options.backdropAnimate) {
                    this.backdrop?.classList.add('swz-animate');
                }
            });
        }
        // Move focus to dialog
        this.dialog?.focus();
    }
    async _positionDialog(step) {
        // Wait a tick for layout to settle
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        const result = positionDialog(this._dialogSession, step, this.options);
        applyPosition(this._dialogSession, result);
    }
    async _finish() {
        if (!this.isVisible || this._transitioning)
            return;
        // Fire onFinish (gating)
        if (this._onFinish) {
            try {
                const result = await this._onFinish();
                if (result === false) {
                    logDebug('Finish cancelled by onFinish handler.', this.options.debug ?? true);
                    return;
                }
            }
            catch {
                logDebug('Finish cancelled by onFinish rejection.', this.options.debug ?? true);
                return;
            }
        }
        this._transitioning = true;
        try {
            // Record completion
            if (this.options.completeOnFinish) {
                this._recordCompletion(this._currentGroup);
            }
            // Teardown
            this._teardown();
            this.isVisible = false;
            logDebug('Tour finished.', this.options.debug ?? true);
        }
        finally {
            this._transitioning = false;
        }
    }
    _recordCompletion(group) {
        if (this.options.completeOnFinish) {
            setFinished(group);
            // Clear stored step on completion
            deleteStoredStep(group);
            logDebug(`Completion recorded for group "${group}".`, this.options.debug ?? true);
        }
        else {
            logDebug('completeOnFinish is false; no persistence recorded.', this.options.debug ?? true);
        }
    }
    _trapTab(e) {
        const dialog = this.dialog;
        if (!dialog)
            return;
        const focusable = Array.from(dialog.querySelectorAll(FOCUSABLE_SELECTOR)).filter(el => el.offsetParent !== null || el === document.activeElement);
        if (focusable.length === 0) {
            // Keep focus on the dialog shell when nothing inside is focusable.
            e.preventDefault();
            dialog.focus();
            return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
            if (document.activeElement === first || document.activeElement === dialog) {
                e.preventDefault();
                last.focus();
            }
        }
        else {
            if (document.activeElement === last || document.activeElement === dialog) {
                e.preventDefault();
                first.focus();
            }
        }
    }
    _onViewportChange() {
        if (!this.isVisible)
            return;
        // Scroll: reposition on the next frame so the cutout tracks its target.
        if (this._scrollRafId !== null) {
            cancelAnimationFrame(this._scrollRafId);
        }
        this._scrollRafId = requestAnimationFrame(() => {
            this._scrollRafId = null;
            if (!this.isVisible)
                return;
            const step = this.backendSteps[this.activeStep];
            if (step) {
                updateBackdrop(this._backdropSession, step, this.options);
                this._positionDialog(step);
            }
        });
        // Resize: debounce heavier relayout work.
        if (this._resizeDebounceTimer) {
            clearTimeout(this._resizeDebounceTimer);
        }
        this._resizeDebounceTimer = setTimeout(() => {
            this._resizeDebounceTimer = null;
        }, 100);
    }
    _cancelScheduledScrollRaf() {
        if (this._scrollRafId !== null) {
            cancelAnimationFrame(this._scrollRafId);
            this._scrollRafId = null;
        }
    }
    _replaceObjectSteps(steps) {
        if (steps === undefined || steps === null) {
            return;
        }
        if (!Array.isArray(steps)) {
            warnDebug('steps must be an array of SWZStep objects.', this.options.debug ?? true);
            this._objectSteps = [];
            this.options.steps = [];
            return;
        }
        this._objectSteps = [...steps];
        this.options.steps = [...steps];
    }
    _syncPublicStepsToBackend() {
        this.backendSteps = this.backendSteps.map((step, index) => {
            const publicStep = this.tourSteps[index];
            if (!publicStep)
                return step;
            return {
                ...step,
                content: publicStep.content,
                title: publicStep.title,
                target: publicStep.target,
                order: publicStep.order,
                group: publicStep.group,
                margin: publicStep.margin,
                fixed: publicStep.fixed,
                placement: publicStep.placement,
            };
        });
    }
    _setAnimationClasses(animate) {
        this.dialog?.classList.toggle('swz-animate', animate && this.options.dialogAnimate !== false);
        this.backdrop?.classList.toggle('swz-animate', animate && this.options.backdropAnimate !== false);
    }
    _restoreFocus() {
        const previousFocus = this._previousFocus;
        this._previousFocus = null;
        if (previousFocus?.isConnected) {
            try {
                previousFocus.focus();
            }
            catch { /* ignore focus restoration failures */ }
        }
    }
}

export { SenangWebsZero };
//# sourceMappingURL=swz.esm.mjs.map
