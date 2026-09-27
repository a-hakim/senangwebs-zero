import type { SWZOptions, InternalStep } from './types';
export interface BackdropSession {
    el: HTMLElement;
    cutout: HTMLElement;
    pieces: HTMLElement[];
}
export interface ViewportHandlers {
    resize: () => void;
    scroll: () => void;
}
export declare function createBackdrop(options: SWZOptions): BackdropSession;
export declare function updateBackdrop(session: BackdropSession, step: InternalStep, options: SWZOptions): void;
export declare function removeBackdrop(session: BackdropSession): void;
export declare function setupViewportHandlers(owner: object, callback: () => void): void;
export declare function teardownViewportHandlers(owner?: object): void;
