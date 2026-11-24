// SPEC-010 SYNC-012 (H-078): the `appVersion` of a production or preview build.
// Pure functions only (no Node APIs), so the web unit tests can import them; build.mjs does the I/O.
// No dependencies.

/** Script name → Angular build configuration (web/angular.json). */
export const BUILD_CONFIGURATIONS = Object.freeze({ prod: 'production', preview: 'preview' });

/** SYNC-012: design cap for `lastClientVersion`. */
export const APP_VERSION_MAX_LENGTH = 40;

const ALLOWED = /^[0-9A-Za-z._+-]+$/;
const FULL_COMMIT_ID = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i; // SHA-1 or SHA-256 repositories
const COMMIT_ID_PREFIX = /^[0-9a-f]{7,64}$/i;

/** The UTC build time as `YYYYMMDDTHHMMSSZ` (SYNC-012 fallback id). */
export function formatBuildTime(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new Error('formatBuildTime: a valid Date is required');
  }
  // 2026-11-24T15:30:00.123Z → 20261124T153000Z
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/[-:]/g, '');
}

/**
 * The commit being built, from `git rev-parse HEAD` first and the CI variable `GITHUB_SHA` second.
 * Only a full commit id counts (a short or garbled value is ignored). Returned lowercase, or null.
 */
export function resolveCommitId({ gitHead, githubSha } = {}) {
  for (const candidate of [gitHead, githubSha]) {
    const id = typeof candidate === 'string' ? candidate.trim() : '';
    if (FULL_COMMIT_ID.test(id)) return id.toLowerCase();
  }
  return null;
}

/**
 * `web-<prod|preview>-<id>`: `<id>` is exactly the first 7 hex characters of the commit id, lowercased
 * (hex case carries no meaning, and git and GitHub print lowercase), or, without a commit id, the UTC
 * build time. Throws on an unknown configuration, a commit id that is not hex, or a result that breaks
 * the SYNC-012 limits, so a bad build fails instead of shipping a bad value.
 */
export function appVersion({ configuration, commitId, buildTime }) {
  if (!Object.hasOwn(BUILD_CONFIGURATIONS, configuration)) {
    throw new Error(`appVersion: unknown configuration "${configuration}" (expected prod or preview)`);
  }
  let id;
  if (commitId === null || commitId === undefined || commitId === '') {
    id = formatBuildTime(buildTime);
  } else if (typeof commitId === 'string' && COMMIT_ID_PREFIX.test(commitId)) {
    id = commitId.slice(0, 7).toLowerCase();
  } else {
    throw new Error(`appVersion: "${commitId}" is not a commit id`);
  }
  const value = `web-${configuration}-${id}`;
  if (value.length > APP_VERSION_MAX_LENGTH || !ALLOWED.test(value) || value === 'web-0.0.0') {
    throw new Error(`appVersion: "${value}" breaks the SYNC-012 limits`);
  }
  return value;
}

/** Arguments for the Angular CLI (`ng ...`) that build `configuration` with `version` baked in. */
export function ngBuildArgs(configuration, version) {
  if (!Object.hasOwn(BUILD_CONFIGURATIONS, configuration)) {
    throw new Error(`ngBuildArgs: unknown configuration "${configuration}"`);
  }
  if (typeof version !== 'string' || !ALLOWED.test(version) || version.length > APP_VERSION_MAX_LENGTH) {
    throw new Error(`ngBuildArgs: bad appVersion "${version}"`);
  }
  // `define` values are JavaScript source: the quotes make it a string literal.
  return ['build', '--configuration', BUILD_CONFIGURATIONS[configuration], '--define', `APP_VERSION="${version}"`];
}
