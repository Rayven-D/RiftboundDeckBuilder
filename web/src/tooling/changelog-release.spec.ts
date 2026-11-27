// SPEC-012 LOG-053 / LOG-054 (H-202): the release-time changelog check (`npm run check:changelog-release`).
import changelog from '../app/core/changelog/changelog.json';
import packageJson from '../../package.json';
import {
  INVALID_JSON_MESSAGE,
  NOT_ARRAY_MESSAGE,
  UNDATED_MESSAGE,
  checkChangelogRelease,
} from '../../scripts/changelog-release.mjs';

describe('SPEC-012 check:changelog-release (LOG-053)', () => {
  it('LOG-053 / AC 8 is an npm script that runs the check script, and is not part of test, lint or the builds', () => {
    const scripts = packageJson.scripts as Record<string, string>;
    expect(scripts['check:changelog-release']).toBe('node scripts/check-changelog-release.mjs');
    for (const name of ['test', 'lint', 'build', 'build:preview', 'deploy:preview']) {
      expect(scripts[name]).not.toContain('changelog');
    }
  });

  it('LOG-053 / AC 8 fails with the exact message on a null date (the shipped file with its date set back to null)', () => {
    expect(UNDATED_MESSAGE).toBe('Changelog has an undated entry: set its date before releasing.');
    const undated = (changelog as { date: string | null }[]).map((e, i) => (i === 0 ? { ...e, date: null } : e));
    expect(checkChangelogRelease(JSON.stringify(undated))).toEqual({ ok: false, message: UNDATED_MESSAGE });
  });

  it('LOG-053 / AC 8 passes on the shipped file now that the sign-in release dated 0.0.1', () => {
    expect((changelog as { date: string | null }[])[1].date).toBe('2026-11-25');
    expect(checkChangelogRelease(JSON.stringify(changelog))).toEqual({ ok: true });
  });

  it('LOG-053 / AC 8 passes once every date is filled', () => {
    const dated = (changelog as { date: string | null }[]).map((e) => ({ ...e, date: '2026-11-27' }));
    expect(checkChangelogRelease(JSON.stringify(dated))).toEqual({ ok: true });
  });

  it('LOG-053 fails on invalid JSON or a value that is not an array', () => {
    expect(checkChangelogRelease('[{')).toEqual({ ok: false, message: INVALID_JSON_MESSAGE });
    expect(checkChangelogRelease('{"version":"0.0.1"}')).toEqual({ ok: false, message: NOT_ARRAY_MESSAGE });
  });

  it('LOG-054 a present but invalid date is the unit test\'s job, not this check\'s', () => {
    expect(checkChangelogRelease('[{"version":"0.0.1","date":"2026-02-30","title":"x","bullets":["y"]}]')).toEqual({ ok: true });
  });
});
