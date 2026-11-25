// Types for privacy-notice-checks.mjs (imported by the web unit tests).
export declare const NOTICE_PATH: string;
export declare const BLANK_MARKERS: readonly string[];
export declare const RELEASE_MARKER: string;
export declare const RELEASE_MESSAGE: string;
export declare function findNoticeBlanks(text: string): string[];
export declare function blanksMessage(found: readonly string[]): string;
export declare function checkPrivacyRelease(text: string): { ok: true } | { ok: false; message: string };
