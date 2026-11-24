// Types for app-version.mjs (imported by the web unit tests).
export declare const BUILD_CONFIGURATIONS: Readonly<{ prod: 'production'; preview: 'preview' }>;
export declare const APP_VERSION_MAX_LENGTH: 40;
export declare function formatBuildTime(date: Date): string;
export declare function resolveCommitId(sources?: { gitHead?: string | null; githubSha?: string | null }): string | null;
export declare function appVersion(input: {
  configuration: string;
  commitId?: string | null;
  buildTime?: Date;
}): string;
export declare function ngBuildArgs(configuration: string, version: string): string[];
