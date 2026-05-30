export interface SWZStep {
    content: string;
    title?: string;
    target?: HTMLElement | Element | HTMLInputElement | string;
    order?: number;
    group?: string;
    margin?: number;
    fixed?: boolean;
}
export interface SWZOptions {
    steps?: SWZStep[];
    autoScroll?: boolean;
    autoScrollSmooth?: boolean;
    autoScrollOffset?: number;
    backdropColor?: string;
    backdropClass?: string;
    backdropAnimate?: boolean;
    targetPadding?: number;
    dialogClass?: string;
    dialogZ?: number;
    dialogWidth?: number;
    dialogMaxWidth?: number;
    dialogPlacement?: 'top' | 'right' | 'bottom' | 'left';
    dialogAnimate?: boolean;
    closeButton?: boolean;
    nextLabel?: string;
    prevLabel?: string;
    finishLabel?: string;
    hideNext?: boolean;
    hidePrev?: boolean;
    showButtons?: boolean;
    showStepDots?: boolean;
    stepDotsPlacement?: 'footer' | 'body';
    showStepProgress?: boolean;
    progressBar?: string;
    completeOnFinish?: boolean;
    rememberStep?: boolean;
    exitOnEscape?: boolean;
    exitOnClickOutside?: boolean;
    keyboardControls?: boolean;
    propagateEvents?: boolean;
    debug?: boolean;
}
export declare const DEFAULTS: SWZOptions;
export interface InternalStep {
    content: string;
    title?: string;
    target?: Element | HTMLElement | HTMLInputElement;
    order?: number;
    group?: string;
    margin?: number;
    fixed?: boolean;
    _index: number;
}
