import type { InternalStep, SWZOptions } from './types';
export declare function getBackdropElement(): HTMLElement;
export declare function getCutoutElement(): HTMLElement;
export declare function createBackdrop(options: SWZOptions): HTMLElement;
export declare function updateBackdrop(step: InternalStep, options: SWZOptions, repositionFn?: () => void): void;
export declare function removeBackdrop(): void;
export declare function setupBackdropResizeHandler(callback: () => void): void;
export declare function teardownBackdropResizeHandler(): void;
