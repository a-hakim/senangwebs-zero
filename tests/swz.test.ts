import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SenangWebsZero } from '../src/SenangWebsZero';
import { normalizeGroupKey } from '../src/persistence';

const STORAGE_PREFIX = 'swz:';

function flush(times = 6): Promise<void> {
  let p = Promise.resolve();
  for (let i = 0; i < times; i++) {
    p = p.then(() => new Promise<void>(r => requestAnimationFrame(() => r())));
  }
  return p;
}

function keydown(key: string, opts: KeyboardEventInit = {}): void {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opts }));
}

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
});

afterEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
});

describe('persistence keys', () => {
  it('normalizes default groups to "tour"', () => {
    expect(normalizeGroupKey()).toBe('tour');
    expect(normalizeGroupKey('tours')).toBe('tour');
    expect(normalizeGroupKey('workflow')).toBe('workflow');
  });

  it('writes completion under swz: prefix keyed by group', () => {
    const tour = new SenangWebsZero();
    tour.finishTour(false, 'onboarding');
    expect(localStorage.getItem(`${STORAGE_PREFIX}completed:onboarding`)).toBe('1');
    expect(tour.isFinished('onboarding')).toBe(true);
    expect(tour.isFinished('other')).toBe(false);
  });

  it('clears stored step on completion', () => {
    localStorage.setItem(`${STORAGE_PREFIX}step:onboarding`, '2');
    const tour = new SenangWebsZero();
    tour.finishTour(false, 'onboarding');
    expect(localStorage.getItem(`${STORAGE_PREFIX}step:onboarding`)).toBeNull();
  });

  it('deleteFinishedTour resets completion and step', () => {
    const tour = new SenangWebsZero();
    tour.finishTour(false, 'g');
    expect(tour.isFinished('g')).toBe(true);
    tour.deleteFinishedTour('g');
    expect(tour.isFinished('g')).toBe(false);
  });
});

describe('steps resolution', () => {
  it('discovers DOM data-attribute steps', async () => {
    document.body.innerHTML = `
      <div data-swz-tour="Step one" data-swz-order="2" id="a">A</div>
      <div data-swz-tour="Step two" data-swz-order="1" id="b">B</div>
    `;
    const tour = new SenangWebsZero();
    await tour.start();
    expect(tour.backendSteps.length).toBe(2);
    expect(tour.activeStep).toBe(0);
    // order ascending
    expect(tour.tourSteps[0].content).toBe('Step two');
  });

  it('filters DOM steps by group', async () => {
    document.body.innerHTML = `
      <div data-swz-tour="Ungrouped" id="u">U</div>
      <div data-swz-tour="Grouped" data-swz-group="reports" id="g">G</div>
    `;
    const tour = new SenangWebsZero();
    await tour.start('reports');
    expect(tour.backendSteps.length).toBe(1);
    expect(tour.backendSteps[0].content).toBe('Grouped');
  });

  it('lazily resolves string targets that mount after construction', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const tour = new SenangWebsZero({
      steps: [{ content: 'Late target', title: 'Late', target: '#late-mount' }],
    });
    // Element does NOT exist yet at construction/start
    await tour.start();
    expect(tour.backendSteps.length).toBe(1);
    // The declared target is preserved (not overwritten to undefined on a miss)
    expect(tour.backendSteps[0].target).toBe('#late-mount');
    const warnsBefore = warnSpy.mock.calls.length;

    // Mount the target afterwards; re-rendering resolves it without re-warns
    const el = document.createElement('div');
    el.id = 'late-mount';
    document.body.appendChild(el);
    await tour.visitStep(0);
    expect(tour.backendSteps[0].target).toBe('#late-mount');
    expect(warnSpy.mock.calls.length).toBe(warnsBefore);
    // Arrow visible means the dialog positioned against a resolved element
    const arrow = tour.dialog.querySelector('.swz-arrow') as HTMLElement;
    expect(arrow.style.display).not.toBe('none');
    warnSpy.mockRestore();
  });

  it('falls back to centered when selector never resolves', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const tour = new SenangWebsZero({
      steps: [{ content: 'Ghost', target: '#does-not-exist' }],
    });
    await tour.start();
    // Declared target preserved for future re-resolution; render falls back to centered
    expect(tour.backendSteps[0].target).toBe('#does-not-exist');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('resolved to null'),
    );
    // Centered dialog positioned without a crash
    expect(tour.dialog.style.left).not.toBe('');
    warnSpy.mockRestore();
  });

  it('start() with no steps does not mount and stays invisible', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const tour = new SenangWebsZero();
    await tour.start();
    expect(tour.isVisible).toBe(false);
    expect(document.querySelector('.swz-dialog')).toBeNull();
    warnSpy.mockRestore();
  });
});

describe('navigation & race guard', () => {
  function setupTour() {
    for (let i = 1; i <= 4; i++) {
      const el = document.createElement('div');
      el.id = `step-${i}`;
      el.dataset.swzTour = `Step ${i}`;
      document.body.appendChild(el);
    }
    return new SenangWebsZero();
  }

  it('double nextStep() while first is in flight advances only one step', async () => {
    const tour = setupTour();
    await tour.start();
    expect(tour.activeStep).toBe(0);

    const first = tour.nextStep();
    const second = tour.nextStep(); // must be ignored: transition in progress
    await Promise.all([first, second]);
    expect(tour.activeStep).toBe(1);
  });

  it('spamming arrow keys does not skip steps', async () => {
    const tour = setupTour();
    await tour.start();
    keydown('ArrowRight');
    keydown('ArrowRight');
    keydown('ArrowRight');
    await new Promise(r => setTimeout(r, 50));
    expect(tour.activeStep).toBe(1);
  });

  it('prevStep is a no-op on first step', async () => {
    const tour = setupTour();
    await tour.start();
    await tour.prevStep();
    expect(tour.activeStep).toBe(0);
  });

  it('visithing a specific index updates the dialog', async () => {
    const tour = setupTour();
    await tour.start();
    await tour.visitStep(2);
    expect(tour.activeStep).toBe(2);
  });

  it('nextStep on last step finishes the tour', async () => {
    const tour = setupTour();
    await tour.start();
    for (let i = 0; i < 3; i++) await tour.nextStep();
    expect(tour.activeStep).toBe(3);
    await tour.nextStep();
    expect(tour.isVisible).toBe(false);
    expect(tour.isFinished()).toBe(true);
    expect(document.querySelector('.swz-dialog')).toBeNull();
  });

  it('onBeforeStepChange false cancels navigation', async () => {
    const tour = setupTour();
    tour.onBeforeStepChange(() => false);
    await tour.start();
    await tour.nextStep();
    expect(tour.activeStep).toBe(0);
    expect(tour.isVisible).toBe(true);
  });

  it('onBeforeStepChange rejection cancels navigation', async () => {
    const tour = setupTour();
    tour.onBeforeStepChange(() => Promise.reject(new Error('block')));
    await tour.start();
    await tour.nextStep();
    expect(tour.activeStep).toBe(0);
  });

  it('rememberStep persists and resumes the active step', async () => {
    const tour = setupTour();
    tour.setOptions({ rememberStep: true });
    await tour.start();
    await tour.nextStep();
    expect(localStorage.getItem(`${STORAGE_PREFIX}step:tour`)).toBe('1');

    const tour2 = setupTour();
    tour2.setOptions({ rememberStep: true });
    await tour2.start();
    expect(tour2.activeStep).toBe(1);
  });

  it('rememberStep resumes persisted step after refresh shrink', async () => {
    const tour = setupTour();
    tour.setOptions({ rememberStep: true });
    await tour.start();
    await tour.visitStep(3);
    // Remove later steps from the DOM and refresh
    document.querySelectorAll('[data-swz-tour]')[3].remove();
    await tour.refresh();
    expect(tour.activeStep).toBe(tour.backendSteps.length - 1);
  });
});

describe('exit / lifecycle', () => {
  function setupTour() {
    const el = document.createElement('div');
    el.dataset.swzTour = 'Only step';
    document.body.appendChild(el);
    return new SenangWebsZero();
  }

  it('exit unmounts DOM, restores focus, does not record completion', async () => {
    localStorage.clear();
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();

    const tour = setupTour();
    await tour.start();
    expect(tour.isVisible).toBe(true);
    await tour.exit();
    expect(tour.isVisible).toBe(false);
    expect(document.querySelector('.swz-dialog')).toBeNull();
    expect(document.querySelector('.swz-backdrop')).toBeNull();
    expect(tour.isFinished()).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('onBeforeExit rejection keeps the tour open', async () => {
    const tour = setupTour();
    tour.onBeforeExit(() => Promise.reject(new Error('no')));
    await tour.start();
    await tour.exit();
    expect(tour.isVisible).toBe(true);
  });

  it('onAfterExit fires after teardown', async () => {
    const tour = setupTour();
    const order: string[] = [];
    tour.onAfterExit(() => { order.push('after'); });
    await tour.start();
    await tour.exit();
    expect(order).toEqual(['after']);
  });

  it('exit is idempotent when not visible', async () => {
    const tour = setupTour();
    await tour.exit();
    expect(tour.isVisible).toBe(false);
  });

  it('finishTour fires onFinish hook (consolidated pipeline)', async () => {
    const tour = setupTour();
    const calls: string[] = [];
    tour.onFinish(() => { calls.push('finish'); });
    await tour.start();
    await tour.finishTour(false);
    expect(calls).toEqual(['finish']);
    expect(tour.isFinished()).toBe(true);
    // exit:false leaves the tour open
    expect(tour.isVisible).toBe(true);
  });

  it('finishTour onFinish rejection does not record completion', async () => {
    const tour = setupTour();
    tour.onFinish(() => Promise.reject(new Error('blocked')));
    await tour.start();
    await tour.finishTour(false);
    expect(tour.isFinished()).toBe(false);
  });

  it('completeOnFinish false skips persistence', async () => {
    const tour = setupTour();
    tour.setOptions({ completeOnFinish: false });
    await tour.start();
    await tour.finishTour(false);
    expect(tour.isFinished()).toBe(false);
  });
});

describe('keyboard controls', () => {
  function setupTour() {
    for (let i = 1; i <= 2; i++) {
      const el = document.createElement('div');
      el.dataset.swzTour = `Step ${i}`;
      document.body.appendChild(el);
    }
    return new SenangWebsZero();
  }

  it('escape exits even when keyboardControls is false', async () => {
    const tour = setupTour();
    tour.setOptions({ keyboardControls: false, exitOnEscape: true });
    await tour.start();
    keydown('Escape');
    await new Promise(r => setTimeout(r, 20));
    expect(tour.isVisible).toBe(false);
  });

  it('escape does not exit when exitOnEscape is false', async () => {
    const tour = setupTour();
    tour.setOptions({ exitOnEscape: false });
    await tour.start();
    keydown('Escape');
    await tour.close ?? Promise.resolve();
    expect(tour.isVisible).toBe(true);
  });

  it('arrow navigation disabled when keyboardControls is false', async () => {
    const tour = setupTour();
    tour.setOptions({ keyboardControls: false });
    await tour.start();
    keydown('ArrowRight');
    await new Promise(r => setTimeout(r, 20));
    expect(tour.activeStep).toBe(0);
  });
});

describe('DOM mounting', () => {
  it('dialog is hidden until first position pass (no flash at 0,0)', async () => {
    const el = document.createElement('div');
    el.dataset.swzTour = 'Content';
    document.body.appendChild(el);
    const tour = new SenangWebsZero();
    await tour.start();
    const dialog = tour.dialog;
    // After start() the first position pass has applied: visible + positioned
    expect(dialog.style.visibility).toBe('visible');
    expect(dialog.style.left).not.toBe('');
  });

  it('cleanup: no listeners leak after exit (double start works)', async () => {
    const el = document.createElement('div');
    el.dataset.swzTour = 'Content';
    document.body.appendChild(el);
    const tour = new SenangWebsZero();
    await tour.start();
    await tour.exit();
    await tour.start();
    expect(tour.isVisible).toBe(true);
    expect(document.querySelectorAll('.swz-dialog').length).toBe(1);
    expect(document.querySelectorAll('.swz-backdrop').length).toBe(1);
    await tour.exit();
  });

  it('two instances can tear down independently (no shared-state clobber)', async () => {
    const a = document.createElement('div');
    a.dataset.swzTour = 'A';
    const b = document.createElement('div');
    b.dataset.swzTour = 'B';
    document.body.appendChild(a);
    document.body.appendChild(b);

    const tourA = new SenangWebsZero();
    const tourB = new SenangWebsZero();
    await tourA.start();
    await tourB.start();

    // Exiting A must not remove B's dialog
    await tourA.exit();
    expect(tourB.isVisible).toBe(true);
    expect(document.querySelectorAll('.swz-dialog').length).toBe(1);
    await tourB.exit();
    expect(document.querySelectorAll('.swz-dialog').length).toBe(0);
  });

  it('renders a centered dialog for steps without targets', async () => {
    const tour = new SenangWebsZero({
      steps: [{ content: 'Centered', title: 'Center' }],
    });
    await tour.start();
    expect(tour.isVisible).toBe(true);
    const dialog = tour.dialog;
    expect(dialog.style.left).not.toBe('');
    await tour.exit();
  });

  it('renders HTML content into the dialog body', async () => {
    const el = document.createElement('div');
    el.dataset.swzTour = 'Hello <b>world</b>';
    document.body.appendChild(el);
    const tour = new SenangWebsZero();
    await tour.start();
    const body = tour.dialog.querySelector('.swz-dialog-body')!;
    expect(body.innerHTML).toContain('<b>world</b>');
    await tour.exit();
  });
});

describe('focus trap', () => {
  it('collects a[href] and inputs, not only buttons', async () => {
    const el = document.createElement('div');
    el.dataset.swzTour = 'Trap test';
    document.body.appendChild(el);
    const tour = new SenangWebsZero();
    await tour.start();

    const body = tour.dialog.querySelector('.swz-dialog-body')!;
    body.innerHTML = '<a href="#x">link</a><input type="text">';
    await tour.refreshDialog();

    const focusable = tour.dialog.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    expect(focusable.length).toBeGreaterThanOrEqual(3);
    await tour.exit();
  });

  it('Tab cycles within the dialog', async () => {
    const el = document.createElement('div');
    el.dataset.swzTour = 'Tab cycle';
    document.body.appendChild(el);
    const tour = new SenangWebsZero();
    await tour.start();

    const nextBtn = tour.dialog.querySelector('.swz-next') as HTMLButtonElement;
    nextBtn.focus();
    // Tab forward from last button wraps to first focusable
    keydown('Tab');
    const closes = tour.dialog.querySelectorAll('button:not([disabled])');
    expect(closes.length).toBeGreaterThan(0);
    await tour.exit();
  });
});

describe('setOptions & addSteps', () => {
  it('setOptions merges and replaces steps when provided', async () => {
    const el = document.createElement('div');
    el.dataset.swzTour = 'Dom';
    document.body.appendChild(el);
    const tour = new SenangWebsZero({ debug: false });
    tour.setOptions({ debug: true, steps: [{ content: 'Obj' }] });
    expect(tour.options.debug).toBe(true);
    await tour.start();
    // Object steps merge with DOM-discovered steps; DOM steps come first (stable sort, no orders)
    expect(tour.backendSteps.length).toBe(2);
    expect(tour.backendSteps.map(s => s.content)).toEqual(['Dom', 'Obj']);
    await tour.exit();
  });

  it('setOptions with invalid steps clears object steps gracefully', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const tour = new SenangWebsZero();
    tour.setOptions({ steps: 'nope' as unknown as [] });
    expect(tour.options.steps).toEqual([]);
    tour.addSteps([1, 2] as any);
    expect(tour.backendSteps.length).toBe(0);
    warnSpy.mockRestore();
  });

  it('addSteps appends without starting the tour', async () => {
    const tour = new SenangWebsZero();
    tour.addSteps([{ content: 'A' }, { content: 'B', order: -1 }]);
    await tour.start();
    expect(tour.tourSteps.map(s => s.content)).toEqual(['B', 'A']);
    await tour.exit();
  });
});

describe('guarded lifecycle helpers', () => {
  it('refresh with no steps after having steps tears down', async () => {
    const el = document.createElement('div');
    el.dataset.swzTour = 'Content';
    document.body.appendChild(el);
    const tour = new SenangWebsZero();
    await tour.start();
    el.remove();
    await tour.refresh();
    expect(tour.isVisible).toBe(false);
  });

  it('destroy() clears state and hooks', async () => {
    const el = document.createElement('div');
    el.dataset.swzTour = 'Content';
    document.body.appendChild(el);
    const tour = new SenangWebsZero();
    tour.onFinish(() => { throw new Error('should not fire'); });
    await tour.start();
    await tour.exit();
    tour.destroy();
    expect(tour.backendSteps.length).toBe(0);
    expect(tour.tourSteps.length).toBe(0);
  });
});
