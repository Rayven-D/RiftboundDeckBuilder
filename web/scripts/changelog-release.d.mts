// Types for changelog-release.mjs (imported by the web unit tests).
export declare const UNDATED_MESSAGE: string;
export declare const INVALID_JSON_MESSAGE: string;
export declare const NOT_ARRAY_MESSAGE: string;
export declare function checkChangelogRelease(text: string): { ok: true } | { ok: false; message: string };
