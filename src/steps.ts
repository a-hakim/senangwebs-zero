import type { SWZOptions, InternalStep, SWZStep } from './types';
import { DEFAULTS } from './types';

export function mergeOptions(userOptions?: SWZOptions, baseOptions?: SWZOptions): SWZOptions {
  const opts: SWZOptions = { ...DEFAULTS, ...(baseOptions || {}) };
  if (userOptions) {
    for (const key of Object.keys(userOptions) as (keyof SWZOptions)[]) {
      const val = userOptions[key];
      if (val !== undefined && val !== null) {
        (opts as Record<string, unknown>)[key] = val;
      }
    }
  }
  return opts;
}

export function resolveStepTarget(
  step: SWZStep | InternalStep,
  index: number,
  debug: boolean
): Element | HTMLElement | HTMLInputElement | undefined {
  const target = step.target;
  if (!target) return undefined;

  if (typeof target === 'string') {
    try {
      const el = document.querySelector(target);
      if (!el && debug) {
        console.warn(`[swz] Step ${index}: target selector "${target}" resolved to null, falling back to centered.`);
      }
      return el || undefined;
    } catch {
      if (debug) {
        console.warn(`[swz] Step ${index}: target selector "${target}" is invalid, falling back to centered.`);
      }
      return undefined;
    }
  }

  const el = target as Element | HTMLElement | HTMLInputElement;
  if ('isConnected' in el && !el.isConnected) {
    if (debug) {
      console.warn(`[swz] Step ${index}: target is no longer connected to the DOM, falling back to centered.`);
    }
    return undefined;
  }

  return el;
}

export function scanDOM(group?: string): InternalStep[] {
  const elements = document.querySelectorAll('[data-swz-tour]');
  const steps: InternalStep[] = [];
  elements.forEach((el, i) => {
    const content = el.getAttribute('data-swz-tour') || '';
    const title = el.getAttribute('data-swz-title') || undefined;
    const stepGroup = el.getAttribute('data-swz-group') || undefined;
    const orderStr = el.getAttribute('data-swz-order');
    const order = parseOptionalNumber(orderStr);
    const marginStr = el.getAttribute('data-swz-margin');
    const margin = parseOptionalNumber(marginStr);
    const fixed = el.hasAttribute('data-swz-fixed');

    if (group ? stepGroup !== group : stepGroup) return;

    steps.push({
      content,
      title,
      target: el as HTMLElement,
      order,
      group: stepGroup,
      margin,
      fixed,
      _index: i,
    });
  });
  return steps;
}

export function objectStepsToInternal(steps: SWZStep[], debug: boolean): InternalStep[] {
  if (!Array.isArray(steps)) {
    if (debug) console.warn('[swz] addSteps() expects an array of SWZStep objects.');
    return [];
  }
  return steps.map((s, i) => ({
    content: s.content,
    title: s.title,
    target: resolveStepTarget(s, i, debug),
    order: s.order,
    group: s.group,
    margin: (s as { margin?: number }).margin,
    fixed: (s as { fixed?: boolean }).fixed,
    _index: i,
  }));
}

export function mergeSteps(domSteps: InternalStep[], objectSteps: InternalStep[]): InternalStep[] {
  return [...domSteps, ...objectSteps];
}

export function orderSteps(steps: InternalStep[]): InternalStep[] {
  return steps
    .map((s, i) => ({ ...s, _sortIndex: i }))
    .sort((a, b) => {
      const aOrder = a.order ?? Infinity;
      const bOrder = b.order ?? Infinity;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a._sortIndex - b._sortIndex;
    })
    .map(({ _sortIndex: _, ...s }) => s);
}

function parseOptionalNumber(value: string | null): number | undefined {
  if (value === null || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
