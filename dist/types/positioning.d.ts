import type { InternalStep, SWZOptions } from './types';
export interface PositionResult {
    x: number;
    y: number;
    arrowX?: number;
    arrowY?: number;
    arrowRotation?: number;
    placement: string;
}
export declare function positionDialog(step: InternalStep, options: SWZOptions): PositionResult;
export declare function applyPosition(result: PositionResult): void;
