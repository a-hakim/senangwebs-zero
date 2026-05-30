import type { SWZOptions, InternalStep, SWZStep } from './types';
export declare function mergeOptions(userOptions?: SWZOptions, baseOptions?: SWZOptions): SWZOptions;
export declare function resolveStepTarget(step: SWZStep | InternalStep, index: number, debug: boolean): Element | HTMLElement | HTMLInputElement | undefined;
export declare function scanDOM(group?: string): InternalStep[];
export declare function objectStepsToInternal(steps: SWZStep[], debug: boolean): InternalStep[];
export declare function mergeSteps(domSteps: InternalStep[], objectSteps: InternalStep[]): InternalStep[];
export declare function orderSteps(steps: InternalStep[]): InternalStep[];
