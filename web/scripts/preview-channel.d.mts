// Types for preview-channel.mjs (imported by the web unit tests).
export declare const PREVIEW_FIREBASE_CONFIG: 'firebase.preview.json';
export declare const PREVIEW_CHANNEL_ENV: 'RIFT_PREVIEW_CHANNEL';
export declare const USAGE: string;
export declare function checkChannel(channel: unknown): string;
export declare function checkExpires(expires: unknown): string;
export declare function parsePreviewDeployArgs(argv: unknown): { channel: string; expires: string | null };
export declare function firebaseChannelDeployArgs(input: { channel: string; expires?: string | null }): string[];
export declare function previewDeployChannelFromEnv(env: Record<string, string | undefined> | undefined): string;
