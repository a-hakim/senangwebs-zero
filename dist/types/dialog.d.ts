import type { InternalStep, SWZOptions } from './types';
export declare function getDialogElement(): HTMLElement;
export declare function getDialogElements(): {
    dialogEl: HTMLElement | null;
    titleEl: HTMLElement | null;
    bodyEl: HTMLElement | null;
    footerEl: HTMLElement | null;
    prevBtn: HTMLButtonElement | null;
    nextBtn: HTMLButtonElement | null;
    closeBtn: HTMLButtonElement | null;
    dotsEl: HTMLElement | null;
    progressEl: HTMLElement | null;
    progressBarEl: HTMLElement | null;
    arrowEl: HTMLElement | null;
    headerEl: HTMLElement | null;
};
export declare function createDialog(options: SWZOptions): HTMLElement;
export declare function updateDialogContent(step: InternalStep, steps: InternalStep[], activeStep: number, options: SWZOptions): void;
export declare function showDialogArrow(visible: boolean): void;
export declare function getDialogArrow(): HTMLElement | null;
export declare function removeDialog(): void;
export declare function getDialogButtons(): {
    prevBtn: HTMLButtonElement | null;
    nextBtn: HTMLButtonElement | null;
    closeBtn: HTMLButtonElement | null;
};
