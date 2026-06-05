import type { SWZOptions, SWZStep, InternalStep } from './types';
import { mergeOptions } from './steps';
import {
  isFinished,
  setFinished,
  deleteFinished,
  getStoredStep,
  setStoredStep,
  deleteStoredStep,
  normalizeGroupKey,
} from './persistence';
import {
  scanDOM,
  objectStepsToInternal,
  mergeSteps,
  orderSteps,
  resolveStepTarget,
} from './steps';
import {
  createBackdrop,
  updateBackdrop,
  removeBackdrop,
  setupBackdropResizeHandler,
  teardownBackdropResizeHandler,
} from './backdrop';
import {
  createDialog,
  updateDialogContent,
  removeDialog,
  getDialogButtons,
} from './dialog';
import { positionDialog, applyPosition } from './positioning';
import { scrollTargetIntoView } from './scroller';
import { logDebug, warnDebug } from './utils';

type LifecycleHandler = () => void | Promise<unknown>;

export class SenangWebsZero {
  // Public properties
  isVisible = false;
  activeStep = 0;
  tourSteps: SWZStep[] = [];
  backendSteps: InternalStep[] = [];
  dialog!: HTMLElement;
  backdrop!: HTMLElement;
  options!: SWZOptions;
  group?: string;

  // Object steps retained across refreshes
  private _objectSteps: SWZStep[] = [];

  // Lifecycle handlers (single-handler, last-wins)
  private _onBeforeStepChange: LifecycleHandler | null = null;
  private _onAfterStepChange: LifecycleHandler | null = null;
  private _onBeforeExit: LifecycleHandler | null = null;
  private _onAfterExit: LifecycleHandler | null = null;
  private _onFinish: LifecycleHandler | null = null;

  // Internal state
  private _currentGroup: string = 'tour';
  private _resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private _keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private _backdropClickHandler: ((e: MouseEvent) => void) | null = null;
  private _dotClickHandler: ((e: MouseEvent) => void) | null = null;
  private _previousFocus: HTMLElement | null = null;

  constructor(userOptions?: SWZOptions) {
    this.options = mergeOptions(userOptions);
    if (userOptions && 'steps' in userOptions) {
      this._replaceObjectSteps(userOptions.steps);
    }
  }

  // -- Public API --

  async start(group?: string): Promise<void> {
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
      } else {
        this.activeStep = 0;
      }
    } else {
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

  visitStep(step: 'next' | 'prev' | number): Promise<void> {
    if (step === 'next') return this.nextStep();
    if (step === 'prev') return this.prevStep();
    if (typeof step === 'number') return this._goToStep(step);
    return Promise.resolve();
  }

  async nextStep(): Promise<void> {
    if (!this.isVisible) return;
    const lastIndex = this.backendSteps.length - 1;
    if (this.activeStep >= lastIndex) {
      // Finish
      await this._finish();
      return;
    }
    await this._goToStep(this.activeStep + 1);
  }

  async prevStep(): Promise<void> {
    if (!this.isVisible || this.activeStep <= 0) return;
    await this._goToStep(this.activeStep - 1);
  }

  async exit(): Promise<void> {
    if (!this.isVisible) return;

    // Fire onBeforeExit (gating)
    if (this._onBeforeExit) {
      try {
        const result = await this._onBeforeExit();
        if (result === false) {
          logDebug('Exit cancelled by onBeforeExit handler.', this.options.debug ?? true);
          return;
        }
      } catch {
        logDebug('Exit cancelled by onBeforeExit rejection.', this.options.debug ?? true);
        return;
      }
    }

    this._teardown();
    this.isVisible = false;

    if (this._onAfterExit) {
      try {
        await this._onAfterExit();
      } catch { /* not gating */ }
    }

    logDebug('Tour exited.', this.options.debug ?? true);
  }

  async finishTour(exit: boolean = true, group?: string): Promise<void> {
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

  isFinishedMethod(group?: string): boolean {
    return isFinished(normalizeGroupKey(group));
  }

  deleteFinishedTour(group?: string): void {
    const key = normalizeGroupKey(group);
    deleteFinished(key);
    deleteStoredStep(key);
  }

  addSteps(steps: SWZStep[]): void {
    if (!Array.isArray(steps)) {
      warnDebug('addSteps() expects an array of SWZStep objects.', this.options.debug ?? true);
      return;
    }
    this._objectSteps.push(...steps);
  }

  setOptions(userOptions: SWZOptions): void {
    this.options = mergeOptions(userOptions, this.options);
    if (userOptions && 'steps' in userOptions) {
      this._replaceObjectSteps(userOptions.steps);
    }
  }

  async refresh(): Promise<void> {
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

  async refreshDialog(): Promise<void> {
    if (!this.isVisible || this.backendSteps.length === 0) return;
    this._syncPublicStepsToBackend();
    const step = this.backendSteps[this.activeStep];
    if (!step) return;
    updateDialogContent(step, this.backendSteps, this.activeStep, this.options);
    await this._positionDialog(step);
  }

  async updatePositions(): Promise<void> {
    if (!this.isVisible || this.backendSteps.length === 0) return;
    this._syncPublicStepsToBackend();
    const step = this.backendSteps[this.activeStep];
    if (!step) return;
    step.target = resolveStepTarget(step, this.activeStep, this.options.debug ?? true);
    updateBackdrop(step, this.options);
    await this._positionDialog(step);
  }

  // Lifecycle hook registration

  onBeforeStepChange(fn: LifecycleHandler): void {
    this._onBeforeStepChange = fn;
  }

  onAfterStepChange(fn: LifecycleHandler): void {
    this._onAfterStepChange = fn;
  }

  onBeforeExit(fn: LifecycleHandler): void {
    this._onBeforeExit = fn;
  }

  onAfterExit(fn: LifecycleHandler): void {
    this._onAfterExit = fn;
  }

  onFinish(fn: LifecycleHandler): void {
    this._onFinish = fn;
  }

  // Alias
  finish(exit?: boolean, group?: string): Promise<void> {
    return this.finishTour(exit, group);
  }

  // Shorthand for isFinishedMethod
  isFinished(group?: string): boolean {
    return this.isFinishedMethod(group);
  }

  // -- Private methods --

  private _resolveSteps(group?: string): void {
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
      target: s.target as HTMLElement | undefined,
      order: s.order,
      group: s.group,
      margin: s.margin,
      fixed: s.fixed,
      placement: s.placement,
    }));
  }

  private _mount(): void {
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
    this._dotClickHandler = (e: MouseEvent) => {
      const dot = (e.target as HTMLElement).closest('.swz-dot') as HTMLElement | null;
      if (dot && dot.dataset.index !== undefined) {
        const index = parseInt(dot.dataset.index, 10);
        this.visitStep(index);
      }
    };
    this.dialog.addEventListener('click', this._dotClickHandler);

    // Keyboard handler
    this._keyHandler = (e: KeyboardEvent) => {
      if (this.options.keyboardControls) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          this.nextStep();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          this.prevStep();
        } else if (e.key === 'Escape' && this.options.exitOnEscape) {
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
      this._backdropClickHandler = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (
          target === this.backdrop ||
          target.classList.contains('swz-backdrop') ||
          target.classList.contains('swz-backdrop-piece') ||
          target.classList.contains('swz-cutout')
        ) {
          this.exit();
        }
      };
      this.backdrop.addEventListener('click', this._backdropClickHandler);
    }

    // Resize/resposition handler
    setupBackdropResizeHandler(() => this._onResize());
  }

  private _teardown(): void {
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

  private async _goToStep(index: number): Promise<void> {
    if (!this.isVisible) return;
    if (index < 0 || index >= this.backendSteps.length) return;

    // Fire onBeforeStepChange (gating)
    if (this._onBeforeStepChange) {
      try {
        const result = await this._onBeforeStepChange();
        if (result === false) {
          logDebug('Step change cancelled by onBeforeStepChange handler.', this.options.debug ?? true);
          return;
        }
      } catch {
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
      } catch { /* not gating */ }
    }
  }

  private async _renderActiveStep(animate: boolean): Promise<void> {
    const step = this.backendSteps[this.activeStep];
    if (!step) return;

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

  private async _positionDialog(step: InternalStep): Promise<void> {
    // Wait a tick for layout to settle
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    const result = positionDialog(step, this.options);
    applyPosition(result);
  }

  private async _finish(): Promise<void> {
    if (!this.isVisible) return;

    // Fire onFinish (gating)
    if (this._onFinish) {
      try {
        const result = await this._onFinish();
        if (result === false) {
          logDebug('Finish cancelled by onFinish handler.', this.options.debug ?? true);
          return;
        }
      } catch {
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

  private _trapTab(e: KeyboardEvent): void {
    if (!this.dialog) return;
    const focusable = this.dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  private _onResize(): void {
    if (this._resizeDebounceTimer) {
      clearTimeout(this._resizeDebounceTimer);
    }
    this._resizeDebounceTimer = setTimeout(() => {
      if (!this.isVisible) return;
      const step = this.backendSteps[this.activeStep];
      if (step) {
        step.target = resolveStepTarget(step, this.activeStep, this.options.debug ?? true);
        updateBackdrop(step, this.options);
        this._positionDialog(step);
      }
    }, 100);
  }

  private _replaceObjectSteps(steps: unknown): void {
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

  private _syncPublicStepsToBackend(): void {
    this.backendSteps = this.backendSteps.map((step, index) => {
      const publicStep = this.tourSteps[index];
      if (!publicStep) return step;
      return {
        ...step,
        content: publicStep.content,
        title: publicStep.title,
        target: resolveStepTarget(publicStep, index, this.options.debug ?? true),
        order: publicStep.order,
        group: publicStep.group,
        margin: publicStep.margin,
        fixed: publicStep.fixed,
        placement: publicStep.placement,
      };
    });
  }

  private _setAnimationClasses(animate: boolean): void {
    this.dialog?.classList.toggle('swz-animate', animate && this.options.dialogAnimate !== false);
    this.backdrop?.classList.toggle('swz-animate', animate && this.options.backdropAnimate !== false);
  }

  private _restoreFocus(): void {
    const previousFocus = this._previousFocus;
    this._previousFocus = null;
    if (previousFocus?.isConnected) {
      try {
        previousFocus.focus();
      } catch { /* ignore focus restoration failures */ }
    }
  }
}
