export declare function normalizeGroupKey(group?: string): string;
export declare function getStorageKey(group: string): string;
export declare function getStepStorageKey(group: string): string;
export declare function isFinished(group?: string): boolean;
export declare function setFinished(group?: string): void;
export declare function deleteFinished(group?: string): void;
export declare function getStoredStep(group?: string): number | null;
export declare function setStoredStep(group: string | undefined, step: number): void;
export declare function deleteStoredStep(group?: string): void;
