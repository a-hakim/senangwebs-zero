export type SWZPlacement = 'auto' | 'top' | 'right' | 'bottom' | 'left';

export interface SWZStep {
  content: string;
  title?: string;
  target?: HTMLElement | Element | HTMLInputElement | string;
  order?: number;
  group?: string;
  margin?: number;
  fixed?: boolean;
  placement?: SWZPlacement;
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
  dialogPlacement?: SWZPlacement;
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

export const DEFAULTS: SWZOptions = {
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

export interface InternalStep {
  content: string;
  title?: string;
  target?: Element | HTMLElement | HTMLInputElement;
  order?: number;
  group?: string;
  margin?: number;
  fixed?: boolean;
  placement?: SWZPlacement;
  _index: number;
}
