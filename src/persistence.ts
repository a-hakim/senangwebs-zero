const STORAGE_PREFIX = 'swz:';

export function normalizeGroupKey(group?: string): string {
  return !group || group === 'tours' ? 'tour' : group;
}

export function getStorageKey(group: string): string {
  return `${STORAGE_PREFIX}completed:${normalizeGroupKey(group)}`;
}

export function getStepStorageKey(group: string): string {
  return `${STORAGE_PREFIX}step:${normalizeGroupKey(group)}`;
}

export function isFinished(group: string = 'tour'): boolean {
  try {
    return localStorage.getItem(getStorageKey(group)) === '1';
  } catch {
    return false;
  }
}

export function setFinished(group: string = 'tour'): void {
  try {
    localStorage.setItem(getStorageKey(group), '1');
  } catch { /* degrade gracefully */ }
}

export function deleteFinished(group: string = 'tour'): void {
  try {
    localStorage.removeItem(getStorageKey(group));
  } catch { /* degrade gracefully */ }
}

export function getStoredStep(group: string = 'tour'): number | null {
  try {
    const val = localStorage.getItem(getStepStorageKey(group));
    return val !== null ? parseInt(val, 10) : null;
  } catch {
    return null;
  }
}

export function setStoredStep(group: string = 'tour', step: number): void {
  try {
    localStorage.setItem(getStepStorageKey(group), String(step));
  } catch { /* degrade gracefully */ }
}

export function deleteStoredStep(group: string = 'tour'): void {
  try {
    localStorage.removeItem(getStepStorageKey(group));
  } catch { /* degrade gracefully */ }
}
