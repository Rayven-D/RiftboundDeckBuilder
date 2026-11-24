// SPEC-010 SYNC-012 (H-078): the per-build appVersion computed by scripts/build.mjs.
import {
  APP_VERSION_MAX_LENGTH,
  appVersion,
  formatBuildTime,
  ngBuildArgs,
  resolveCommitId,
} from '../../scripts/app-version.mjs';

const SHA_A = '5c2292c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6';
const SHA_B = '27b796d0a1b2c3d4e5f60718293a4b5c6d7e8f90';
const AT = new Date('2026-11-24T15:30:00.000Z');
const SPEC_CHARS = /^[0-9A-Za-z._+-]+$/;

describe('SYNC-012 appVersion', () => {
  it('AC 42: production builds of commits 5c2292c and 27b796d are web-prod-5c2292c and web-prod-27b796d', () => {
    const a = appVersion({ configuration: 'prod', commitId: SHA_A, buildTime: AT });
    const b = appVersion({ configuration: 'prod', commitId: SHA_B, buildTime: AT });
    expect(a).toBe('web-prod-5c2292c');
    expect(b).toBe('web-prod-27b796d');
    expect(a).not.toBe(b);
    for (const v of [a, b]) {
      expect(v.length).toBeLessThanOrEqual(40);
      expect(v).not.toBe('web-0.0.0');
    }
  });

  it('AC 35: the preview build of commit 5c2292c is web-preview-5c2292c', () => {
    expect(appVersion({ configuration: 'preview', commitId: SHA_A, buildTime: AT })).toBe('web-preview-5c2292c');
  });

  it('AC 42: without a commit id the id is the UTC build time (web-prod-20261124T153000Z)', () => {
    expect(appVersion({ configuration: 'prod', commitId: null, buildTime: AT })).toBe('web-prod-20261124T153000Z');
    expect(appVersion({ configuration: 'prod', buildTime: AT })).toBe('web-prod-20261124T153000Z');
    expect(appVersion({ configuration: 'preview', commitId: '', buildTime: AT })).toBe('web-preview-20261124T153000Z');
  });

  it('SYNC-012 the build time is UTC whatever the milliseconds', () => {
    expect(formatBuildTime(new Date('2026-01-02T03:04:05.999Z'))).toBe('20260102T030405Z');
    expect(formatBuildTime(new Date(Date.UTC(2026, 10, 24, 23, 59, 59)))).toBe('20261124T235959Z');
  });

  it('SYNC-012 a full 40-character commit id is cut to exactly 7 characters (not git rev-parse --short)', () => {
    const v = appVersion({ configuration: 'prod', commitId: SHA_A, buildTime: AT });
    expect(v.slice('web-prod-'.length)).toHaveLength(7);
    // A 64-character (SHA-256) id and a longer short id are cut to 7 too.
    expect(appVersion({ configuration: 'prod', commitId: SHA_A + SHA_B.slice(0, 24), buildTime: AT })).toBe('web-prod-5c2292c');
    expect(appVersion({ configuration: 'prod', commitId: '5c2292c0d1', buildTime: AT })).toBe('web-prod-5c2292c');
  });

  it('SYNC-012 an uppercase commit id is lowered (hex case carries no meaning)', () => {
    expect(appVersion({ configuration: 'prod', commitId: SHA_A.toUpperCase(), buildTime: AT })).toBe('web-prod-5c2292c');
  });

  it('SYNC-012 rejects a configuration other than prod or preview', () => {
    for (const configuration of ['production', 'dev', 'PROD', '', 'web-0.0.0', 'toString', '__proto__']) {
      expect(() => appVersion({ configuration, commitId: SHA_A, buildTime: AT })).toThrow(/unknown configuration/);
    }
  });

  it('SYNC-012 rejects a commit id that is not at least 7 hex characters', () => {
    for (const commitId of ['5c2292', 'zzzzzzz', '5c2292c 0', '../etc', 'web-0.0.0']) {
      expect(() => appVersion({ configuration: 'prod', commitId, buildTime: AT })).toThrow(/not a commit id/);
    }
  });

  it('SYNC-012 needs a valid build time when there is no commit id (never empty)', () => {
    expect(() => appVersion({ configuration: 'prod', commitId: null })).toThrow();
    expect(() => appVersion({ configuration: 'prod', commitId: null, buildTime: new Date('nope') })).toThrow();
  });

  it('SYNC-012 every value is at most 40 characters of [0-9A-Za-z._+-]', () => {
    const values = [
      appVersion({ configuration: 'prod', commitId: SHA_A, buildTime: AT }),
      appVersion({ configuration: 'preview', commitId: SHA_B, buildTime: AT }),
      appVersion({ configuration: 'prod', commitId: null, buildTime: AT }),
      appVersion({ configuration: 'preview', commitId: null, buildTime: new Date('9999-12-31T23:59:59Z') }),
    ];
    for (const v of values) {
      expect(v.length).toBeGreaterThan(0);
      expect(v.length).toBeLessThanOrEqual(APP_VERSION_MAX_LENGTH);
      expect(v).toMatch(SPEC_CHARS);
    }
    expect(APP_VERSION_MAX_LENGTH).toBe(40);
  });
});

describe('SYNC-012 commit id lookup (git rev-parse HEAD, then GITHUB_SHA)', () => {
  it('uses git HEAD first, trimmed and lowercased', () => {
    expect(resolveCommitId({ gitHead: `${SHA_A.toUpperCase()}\n`, githubSha: SHA_B })).toBe(SHA_A);
  });

  it('falls back to GITHUB_SHA when git gives nothing usable', () => {
    expect(resolveCommitId({ gitHead: null, githubSha: SHA_B })).toBe(SHA_B);
    expect(resolveCommitId({ gitHead: 'fatal: not a git repository', githubSha: SHA_B })).toBe(SHA_B);
  });

  it('ignores short or garbled ids, so the build falls back to the UTC build time', () => {
    expect(resolveCommitId({ gitHead: '5c2292c', githubSha: 'abc' })).toBeNull();
    expect(resolveCommitId({})).toBeNull();
    expect(resolveCommitId()).toBeNull();
  });
});

describe('SYNC-012 ng build arguments', () => {
  it('builds production or preview with APP_VERSION defined as a string literal', () => {
    expect(ngBuildArgs('prod', 'web-prod-5c2292c')).toEqual([
      'build',
      '--configuration',
      'production',
      '--define',
      'APP_VERSION="web-prod-5c2292c"',
    ]);
    expect(ngBuildArgs('preview', 'web-preview-5c2292c')).toEqual([
      'build',
      '--configuration',
      'preview',
      '--define',
      'APP_VERSION="web-preview-5c2292c"',
    ]);
  });

  it('refuses a bad configuration or a value outside the SYNC-012 limits', () => {
    expect(() => ngBuildArgs('development', 'web-prod-5c2292c')).toThrow();
    expect(() => ngBuildArgs('prod', 'web-prod-"x"')).toThrow();
    expect(() => ngBuildArgs('prod', 'x'.repeat(41))).toThrow();
  });
});
