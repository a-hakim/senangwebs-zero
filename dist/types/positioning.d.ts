import type { InternalStep, SWZOptions } from './types';
import type { DialogSession } from './dialog';
export interface PositionResult {
    x: number;
    y: number;
    arrowX?: number;
    arrowY?: number;
    arrowRotation?: number;
    placement: string;
}
export declare function positionDialog(session: DialogSession, step: InternalStep, options: SWZOptions): PositionResult;
export declare function applyPosition(dialogSession: DialogSession, result: PositionResult): void;
