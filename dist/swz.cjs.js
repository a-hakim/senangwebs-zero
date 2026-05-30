/*! SenangWebs Zero v0.9.0 | MIT License | https://github.com/a-hakim/senangwebs-zero */
'use strict';

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
    return steps.map((s, i) => ({
        content: s.content,
        title: s.title,
        target: resolveStepTarget(s, i, debug),
        order: s.order,
        group: s.group,
        margin: s.margin,
        fixed: s.fixed,
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

let backdropEl = null;
let cutoutEl = null;
let backdropPieces = [];
let resizeHandler = null;
let scrollHandler = null;
function createBackdrop(options) {
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
function updateBackdrop(step, options, repositionFn) {
    const bd = backdropEl;
    const co = cutoutEl;
    if (!bd || !co)
        return;
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
function removeBackdrop() {
    if (backdropEl?.parentNode) {
        backdropEl.parentNode.removeChild(backdropEl);
    }
    backdropEl = null;
    cutoutEl = null;
    backdropPieces = [];
}
function setupBackdropResizeHandler(callback) {
    if (resizeHandler)
        return;
    resizeHandler = () => callback();
    scrollHandler = () => callback();
    window.addEventListener('resize', resizeHandler, { passive: true });
    window.addEventListener('scroll', scrollHandler, { passive: true });
}
function teardownBackdropResizeHandler() {
    if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
        resizeHandler = null;
    }
    if (scrollHandler) {
        window.removeEventListener('scroll', scrollHandler);
        scrollHandler = null;
    }
}
function updateBackdropPieces(left, top, right, bottom) {
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

let dialogEl = null;
let titleEl = null;
let bodyEl = null;
let footerEl = null;
let prevBtn = null;
let nextBtn = null;
let closeBtn = null;
let dotsEl = null;
let progressEl = null;
let progressBarEl = null;
let arrowEl = null;
function getDialogElement() {
    return dialogEl;
}
function createDialog(options) {
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
function updateDialogContent(step, steps, activeStep, options) {
    if (!dialogEl || !titleEl || !bodyEl || !footerEl)
        return;
    const total = steps.length;
    const isFirst = activeStep === 0;
    const isLast = activeStep === total - 1;
    // Title
    if (step.title) {
        titleEl.textContent = step.title;
        titleEl.style.display = '';
        dialogEl.setAttribute('aria-label', step.title);
    }
    else {
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
function updateDots(steps, activeStep, options) {
    const dots = dotsEl;
    if (!dots)
        return;
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
    if (placement === 'body' && bodyEl) {
        if (dots.parentNode !== bodyEl) {
            bodyEl.appendChild(dots);
        }
        dots.style.paddingTop = '12px';
    }
    else if (footerEl) {
        if (dots.parentNode !== footerEl) {
            const spacer = footerEl.querySelector('[style*="flex: 1"]');
            if (spacer) {
                footerEl.insertBefore(dots, spacer);
            }
            else {
                footerEl.appendChild(dots);
            }
        }
        dots.style.paddingTop = '0';
    }
}
function showDialogArrow(visible) {
    if (arrowEl) {
        arrowEl.style.display = visible ? '' : 'none';
    }
}
function getDialogArrow() {
    return arrowEl;
}
function removeDialog() {
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
}
function getDialogButtons() {
    return { prevBtn, nextBtn, closeBtn };
}

// Placement priority order for auto mode
const PLACEMENT_ORDER = ['bottom', 'top', 'right', 'left'];
function positionDialog(step, options) {
    const dialog = getDialogElement();
    if (!dialog)
        return { x: 0, y: 0, placement: 'center' };
    const target = step.target;
    if (!target) {
        // Centered
        showDialogArrow(false);
        const dw = dialog.offsetWidth || 300;
        const dh = dialog.offsetHeight || 200;
        return {
            x: (window.innerWidth - dw) / 2,
            y: (window.innerHeight - dh) / 2,
            placement: 'center',
        };
    }
    showDialogArrow(true);
    const targetRect = getElementRect(target);
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
    const preferred = options.dialogPlacement || undefined;
    let bestResult = null;
    const placements = preferred ? [preferred, ...PLACEMENT_ORDER.filter(p => p !== preferred)] : PLACEMENT_ORDER;
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
    const arrowMargin = 10;
    const withArrowResult = { ...result };
    switch (placement) {
        case 'top':
            withArrowResult.arrowX = clamp(anchorCX - result.x, arrowMargin, Math.max(arrowMargin, dw - arrowMargin));
            withArrowResult.arrowY = dh;
            withArrowResult.arrowRotation = 135;
            break;
        case 'bottom':
            withArrowResult.arrowX = clamp(anchorCX - result.x, arrowMargin, Math.max(arrowMargin, dw - arrowMargin));
            withArrowResult.arrowY = -6;
            withArrowResult.arrowRotation = -45;
            break;
        case 'left':
            withArrowResult.arrowX = dw;
            withArrowResult.arrowY = clamp(anchorCY - result.y, arrowMargin, Math.max(arrowMargin, dh - arrowMargin));
            withArrowResult.arrowRotation = 45;
            break;
        case 'right':
            withArrowResult.arrowX = -6;
            withArrowResult.arrowY = clamp(anchorCY - result.y, arrowMargin, Math.max(arrowMargin, dh - arrowMargin));
            withArrowResult.arrowRotation = 225;
            break;
    }
    return withArrowResult;
}
function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
}
function applyPosition(result) {
    const dialog = getDialogElement();
    if (!dialog)
        return;
    dialog.style.left = `${result.x}px`;
    dialog.style.top = `${result.y}px`;
    const arrow = getDialogArrow();
    if (arrow) {
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
        this._keyHandler = null;
        this._backdropClickHandler = null;
        this._dotClickHandler = null;
        this._previousFocus = null;
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
        // Render first step
        await this._renderActiveStep(false);
        logDebug(`Tour started. Group: "${this._currentGroup}", Steps: ${this.backendSteps.length}`, this.options.debug ?? true);
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
        if (!this.isVisible)
            return;
        const lastIndex = this.backendSteps.length - 1;
        if (this.activeStep >= lastIndex) {
            // Finish
            await this._finish();
            return;
        }
        await this._goToStep(this.activeStep + 1);
    }
    async prevStep() {
        if (!this.isVisible || this.activeStep <= 0)
            return;
        await this._goToStep(this.activeStep - 1);
    }
    async exit() {
        if (!this.isVisible)
            return;
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
    async finishTour(exit = true, group) {
        if (!this.options.completeOnFinish) {
            logDebug('completeOnFinish is false; no persistence recorded.', this.options.debug ?? true);
            return;
        }
        const g = normalizeGroupKey(group === undefined ? this._currentGroup : group);
        setFinished(g);
        deleteStoredStep(g);
        logDebug(`Completion recorded for group "${g}".`, this.options.debug ?? true);
        if (exit && this.isVisible) {
            this._teardown();
            this.isVisible = false;
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
            this.activeStep = Math.max(0, this.backendSteps.length - 1);
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
        this._syncPublicStepsToBackend();
        const step = this.backendSteps[this.activeStep];
        if (!step)
            return;
        updateDialogContent(step, this.backendSteps, this.activeStep, this.options);
        await this._positionDialog(step);
    }
    async updatePositions() {
        if (!this.isVisible || this.backendSteps.length === 0)
            return;
        this._syncPublicStepsToBackend();
        const step = this.backendSteps[this.activeStep];
        if (!step)
            return;
        step.target = resolveStepTarget(step, this.activeStep, this.options.debug ?? true);
        updateBackdrop(step, this.options);
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
            target: s.target,
            order: s.order,
            group: s.group,
            margin: s.margin,
            fixed: s.fixed,
        }));
    }
    _mount() {
        // Create backdrop
        this.backdrop = createBackdrop(this.options);
        document.body.appendChild(this.backdrop);
        // Create dialog
        this.dialog = createDialog(this.options);
        document.body.appendChild(this.dialog);
        // Wire up dialog button handlers
        const { prevBtn, nextBtn, closeBtn } = getDialogButtons();
        if (prevBtn) {
            prevBtn.onclick = () => this.prevStep();
        }
        if (nextBtn) {
            nextBtn.onclick = () => this.nextStep();
        }
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
                else if (e.key === 'Escape' && this.options.exitOnEscape) {
                    e.preventDefault();
                    this.exit();
                }
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
        // Resize/resposition handler
        setupBackdropResizeHandler(() => this._onResize());
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
        teardownBackdropResizeHandler();
        if (this._resizeDebounceTimer) {
            clearTimeout(this._resizeDebounceTimer);
            this._resizeDebounceTimer = null;
        }
        // Remove DOM
        removeDialog();
        removeBackdrop();
        this._restoreFocus();
    }
    async _goToStep(index) {
        if (!this.isVisible)
            return;
        if (index < 0 || index >= this.backendSteps.length)
            return;
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
    async _renderActiveStep(animate) {
        const step = this.backendSteps[this.activeStep];
        if (!step)
            return;
        this._setAnimationClasses(animate);
        // Resolve target inline for safety
        step.target = resolveStepTarget(step, this.activeStep, this.options.debug ?? true);
        // Scroll into view
        await scrollTargetIntoView(step, this.options);
        // Update backdrop
        updateBackdrop(step, this.options);
        // Update dialog content
        updateDialogContent(step, this.backendSteps, this.activeStep, this.options);
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
        const result = positionDialog(step, this.options);
        applyPosition(result);
    }
    async _finish() {
        if (!this.isVisible)
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
        // Record completion
        if (this.options.completeOnFinish) {
            setFinished(this._currentGroup);
            // Clear stored step on completion
            deleteStoredStep(this._currentGroup);
        }
        // Teardown
        this._teardown();
        this.isVisible = false;
        logDebug('Tour finished.', this.options.debug ?? true);
    }
    _trapTab(e) {
        if (!this.dialog)
            return;
        const focusable = this.dialog.querySelectorAll('button:not([disabled]), [tabindex]:not([tabindex="-1"])');
        if (focusable.length === 0)
            return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
            if (document.activeElement === first) {
                e.preventDefault();
                last.focus();
            }
        }
        else {
            if (document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    }
    _onResize() {
        if (this._resizeDebounceTimer) {
            clearTimeout(this._resizeDebounceTimer);
        }
        this._resizeDebounceTimer = setTimeout(() => {
            if (!this.isVisible)
                return;
            const step = this.backendSteps[this.activeStep];
            if (step) {
                step.target = resolveStepTarget(step, this.activeStep, this.options.debug ?? true);
                updateBackdrop(step, this.options);
                this._positionDialog(step);
            }
        }, 100);
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
                target: resolveStepTarget(publicStep, index, this.options.debug ?? true),
                order: publicStep.order,
                group: publicStep.group,
                margin: publicStep.margin,
                fixed: publicStep.fixed,
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

exports.SenangWebsZero = SenangWebsZero;
//# sourceMappingURL=swz.cjs.js.map
