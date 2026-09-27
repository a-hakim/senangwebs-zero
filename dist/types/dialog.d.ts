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
export declare function createDialog(options: SWZOptions): DialogSession;
export declare function updateDialogContent(session: DialogSession, step: InternalStep, steps: InternalStep[], activeStep: number, options: SWZOptions): void;
export declare function showDialogArrow(session: DialogSession, visible: boolean): void;
export declare function removeDialog(session: DialogSession): void;
