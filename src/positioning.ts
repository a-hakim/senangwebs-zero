import type { InternalStep, SWZOptions } from './types';
import { getDialogElement, showDialogArrow, getDialogArrow } from './dialog';
import { getElementRect } from './utils';

// Minimal floating-positioning engine that implements placement/flip/shift/offset
// without requiring @floating-ui/dom (keeps bundle zero-dependency if desired).
// For production, swap this with @floating-ui/dom for more robust collision detection.

export interface PositionResult {
  x: number;
  y: number;
  arrowX?: number;
  arrowY?: number;
  arrowRotation?: number;
  placement: string;
}

// Placement priority order for auto mode
const PLACEMENT_ORDER: Array<'top' | 'bottom' | 'left' | 'right'> = ['bottom', 'top', 'right', 'left'];

export function positionDialog(
  step: InternalStep,
  options: SWZOptions,
): PositionResult {
  const dialog = getDialogElement();
  if (!dialog) return { x: 0, y: 0, placement: 'center' };

  const target = step.target;
  if (!target) {
    // Centered
    showDialogArrow(false);
    const dw = dialog.offsetWidth || 300;
    const dh = dialog.offsetHeight || 200;
    return {
      x: (window.innerWidth - dw) / 2,
      y: (window.innerHeight - dh) / 2,
      placement: 'center',
    };
  }

  showDialogArrow(true);

  const targetRect = getElementRect(target);
  const pad = options.targetPadding ?? 30;

  const anchorRect = {
    x: targetRect.left - pad,
    y: targetRect.top - pad,
    width: targetRect.width + pad * 2,
    height: targetRect.height + pad * 2,
  };

  const gap = 12;
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const dw = dialog.offsetWidth || 300;
  const dh = dialog.offsetHeight || 150;

  const preferred = options.dialogPlacement || undefined;
  let bestResult: PositionResult | null = null;

  const placements = preferred ? [preferred, ...PLACEMENT_ORDER.filter(p => p !== preferred)] : PLACEMENT_ORDER;

  for (const placement of placements) {
    const result = shiftPlacement(computePlacement(anchorRect, dw, dh, gap, placement), placement, dw, dh, viewportW, viewportH);
    if (hasMainAxisRoom(result, placement, dw, dh, viewportW, viewportH)) {
      bestResult = withArrow(result, placement, anchorRect, dw, dh);
      break;
    }
  }

  if (!bestResult) {
    const placement = chooseBestPlacement(anchorRect, dw, dh, gap, viewportW, viewportH);
    bestResult = withArrow(
      clampPlacement(computePlacement(anchorRect, dw, dh, gap, placement), dw, dh, viewportW, viewportH),
      placement,
      anchorRect,
      dw,
      dh,
    );
  }

  return bestResult;
}

function computePlacement(
  anchor: { x: number; y: number; width: number; height: number },
  dw: number,
  dh: number,
  gap: number,
  placement: 'top' | 'bottom' | 'left' | 'right',
): PositionResult {
  const anchorCX = anchor.x + anchor.width / 2;
  const anchorCY = anchor.y + anchor.height / 2;

  let x: number;
  let y: number;

  switch (placement) {
    case 'top': {
      x = anchorCX - dw / 2;
      y = anchor.y - dh - gap;
      break;
    }
    case 'bottom': {
      x = anchorCX - dw / 2;
      y = anchor.y + anchor.height + gap;
      break;
    }
    case 'left': {
      x = anchor.x - dw - gap;
      y = anchorCY - dh / 2;
      break;
    }
    case 'right': {
      x = anchor.x + anchor.width + gap;
      y = anchorCY - dh / 2;
      break;
    }
  }

  return { x, y, placement };
}

function shiftPlacement(
  result: PositionResult,
  placement: 'top' | 'bottom' | 'left' | 'right',
  dw: number,
  dh: number,
  vw: number,
  vh: number,
): PositionResult {
  const margin = 8;
  const shifted = { ...result };
  if (placement === 'top' || placement === 'bottom') {
    shifted.x = clamp(shifted.x, margin, Math.max(margin, vw - dw - margin));
  } else {
    shifted.y = clamp(shifted.y, margin, Math.max(margin, vh - dh - margin));
  }
  return shifted;
}

function clampPlacement(
  result: PositionResult,
  dw: number,
  dh: number,
  vw: number,
  vh: number,
): PositionResult {
  const margin = 8;
  return {
    ...result,
    x: clamp(result.x, margin, Math.max(margin, vw - dw - margin)),
    y: clamp(result.y, margin, Math.max(margin, vh - dh - margin)),
  };
}

function hasMainAxisRoom(
  result: PositionResult,
  placement: 'top' | 'bottom' | 'left' | 'right',
  dw: number,
  dh: number,
  vw: number,
  vh: number,
): boolean {
  const margin = 8;
  switch (placement) {
    case 'top':
      return result.y >= margin;
    case 'bottom':
      return result.y + dh <= vh - margin;
    case 'left':
      return result.x >= margin;
    case 'right':
      return result.x + dw <= vw - margin;
  }
}

function chooseBestPlacement(
  anchor: { x: number; y: number; width: number; height: number },
  dw: number,
  dh: number,
  gap: number,
  vw: number,
  vh: number,
): 'top' | 'bottom' | 'left' | 'right' {
  const spaces = {
    top: anchor.y - gap,
    bottom: vh - (anchor.y + anchor.height + gap),
    left: anchor.x - gap,
    right: vw - (anchor.x + anchor.width + gap),
  };
  const entries = Object.entries(spaces) as Array<['top' | 'bottom' | 'left' | 'right', number]>;
  const needed = { top: dh, bottom: dh, left: dw, right: dw };
  entries.sort((a, b) => {
    const aFits = a[1] >= needed[a[0]] ? 1 : 0;
    const bFits = b[1] >= needed[b[0]] ? 1 : 0;
    if (aFits !== bFits) return bFits - aFits;
    return b[1] - a[1];
  });
  return entries[0][0];
}

function withArrow(
  result: PositionResult,
  placement: 'top' | 'bottom' | 'left' | 'right',
  anchor: { x: number; y: number; width: number; height: number },
  dw: number,
  dh: number,
): PositionResult {
  const anchorCX = anchor.x + anchor.width / 2;
  const anchorCY = anchor.y + anchor.height / 2;
  const arrowSize = 12;
  const arrowHalf = arrowSize / 2;
  const arrowMargin = 10;
  const withArrowResult = { ...result };

  switch (placement) {
    case 'top': {
      const arrowCenterX = clamp(anchorCX - result.x, arrowMargin, Math.max(arrowMargin, dw - arrowMargin));
      withArrowResult.arrowX = arrowCenterX - arrowHalf;
      withArrowResult.arrowY = dh - arrowHalf;
      withArrowResult.arrowRotation = 135;
      break;
    }
    case 'bottom': {
      const arrowCenterX = clamp(anchorCX - result.x, arrowMargin, Math.max(arrowMargin, dw - arrowMargin));
      withArrowResult.arrowX = arrowCenterX - arrowHalf;
      withArrowResult.arrowY = -arrowHalf;
      withArrowResult.arrowRotation = -45;
      break;
    }
    case 'left': {
      const arrowCenterY = clamp(anchorCY - result.y, arrowMargin, Math.max(arrowMargin, dh - arrowMargin));
      withArrowResult.arrowX = dw - arrowHalf;
      withArrowResult.arrowY = arrowCenterY - arrowHalf;
      withArrowResult.arrowRotation = 45;
      break;
    }
    case 'right': {
      const arrowCenterY = clamp(anchorCY - result.y, arrowMargin, Math.max(arrowMargin, dh - arrowMargin));
      withArrowResult.arrowX = -arrowHalf;
      withArrowResult.arrowY = arrowCenterY - arrowHalf;
      withArrowResult.arrowRotation = 225;
      break;
    }
  }

  return withArrowResult;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

export function applyPosition(result: PositionResult): void {
  const dialog = getDialogElement();
  if (!dialog) return;

  dialog.style.left = `${result.x}px`;
  dialog.style.top = `${result.y}px`;

  const arrow = getDialogArrow();
  if (arrow) {
    if (result.arrowX !== undefined && result.arrowY !== undefined && result.arrowRotation !== undefined) {
      arrow.style.display = '';
      arrow.style.left = `${result.arrowX}px`;
      arrow.style.top = `${result.arrowY}px`;
      arrow.style.transform = `rotate(${result.arrowRotation}deg)`;
    } else {
      arrow.style.display = 'none';
    }
  }
}
