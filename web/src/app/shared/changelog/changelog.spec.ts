/** SPEC-012 Changelog: the data test over changelog.json (LOG-041, AC 7) and the pure entry rules. */
import changelog from '../../core/changelog/changelog.json';
import {
  type ChangelogEntry,
  entryErrors,
  formatReleaseDate,
  hasHashLikeToken,
  isIsoDate,
  showableEntries,
  validateChangelog,
  versionNumber,
} from './changelog';

const entry = (over: Partial<ChangelogEntry> = {}): ChangelogEntry => ({
  version: '0.0.1',
  date: '2026-11-27',
  title: 'Accounts are here',
  bullets: ['Pages open faster.'],
  ...over,
});

describe('SPEC-012 changelog.json (LOG-041 data test)', () => {
  it('LOG-041 / AC 7 the shipped file passes every rule, with the null date on 0.0.1', () => {
    expect(validateChangelog(changelog)).toEqual([]);
  });

  it('LOG-050 / LOG-052 / AC 6 the file ships with exactly the sign-in release entry, undated', () => {
    expect(changelog).toEqual([
      {
        version: '0.0.1',
        date: null,
        title: 'Accounts are here',
        bullets: [
          'Create a free account with just your email. We send you a sign-in link, no password needed.',
          'Your collection and decks are saved to your account, so they follow you to every device.',
          'Pick a username and choose a light or dark theme.',
          'Read how your data is handled in the new Privacy notice.',
          "New: this What's new page.",
        ],
      },
    ]);
  });
});

describe('SPEC-012 validateChangelog (LOG-041, AC 7)', () => {
  const v = (version: string, date: string | null = '2026-11-27') => entry({ version, date });

  it('LOG-041 (a) an empty file or a non-array is an error', () => {
    expect(validateChangelog([])).not.toEqual([]);
    expect(validateChangelog({})).not.toEqual([]);
  });

  it('LOG-041 (c) accepts strictly decreasing consecutive versions down to 0.0.1, dates never increasing', () => {
    expect(validateChangelog([v('0.0.3', null), v('0.0.2', '2026-11-28'), v('0.0.1', '2026-11-28')])).toEqual([]);
  });

  it.each<[string, ChangelogEntry[]]>([
    ['duplicate versions 0.0.2, 0.0.2', [v('0.0.2'), v('0.0.2')]],
    ['increasing versions 0.0.1, 0.0.2', [v('0.0.1'), v('0.0.2')]],
    ['a gap 0.0.3, 0.0.1', [v('0.0.3'), v('0.0.1')]],
    ['an oldest entry that is not 0.0.1', [v('0.0.3'), v('0.0.2')]],
    ['an impossible date 2026-02-30', [v('0.0.1', '2026-02-30')]],
    ['a 6-bullet entry', [entry({ bullets: ['a', 'b', 'c', 'd', 'e', 'f'] })]],
    ['a 61-character title', [entry({ title: 'x'.repeat(61) })]],
    ['a bullet containing a1b2c3d4e5', [entry({ bullets: ['Fixed in a1b2c3d4e5.'] })]],
    ['a null date on a non-first entry', [v('0.0.2', '2026-11-28'), v('0.0.1', null)]],
    ['two null dates', [v('0.0.2', null), v('0.0.1', null)]],
    ['a date that increases going down', [v('0.0.2', '2026-11-27'), v('0.0.1', '2026-11-28')]],
  ])('LOG-041 / AC 7 reports %s as an error', (_label, data) => {
    expect(validateChangelog(data).length).toBeGreaterThan(0);
  });
});

describe('SPEC-012 entry rules (LOG-031, LOG-022)', () => {
  it('LOG-031 version is exactly 0.0.X with X >= 1 and no leading zeros', () => {
    expect(versionNumber('0.0.1')).toBe(1);
    expect(versionNumber('0.0.12')).toBe(12);
    for (const bad of ['0.0.0', '0.0.01', '1.0.0', '0.1.1', '0.0.', ' 0.0.1', 0.1, null]) expect(versionNumber(bad)).toBeNull();
  });

  it('LOG-031 date is a real YYYY-MM-DD calendar date', () => {
    expect(isIsoDate('2026-11-27')).toBe(true);
    expect(isIsoDate('2028-02-29')).toBe(true);
    for (const bad of ['2026-02-30', '2027-02-29', '2026-13-01', '2026-1-01', '2026-11-27T00:00:00Z', '', null]) {
      expect(isIsoDate(bad)).toBe(false);
    }
  });

  it('LOG-022 limits: title 1 to 60, 1 to 5 bullets, each 1 to 140 characters', () => {
    expect(entryErrors(entry({ title: 'x'.repeat(60), bullets: ['y'.repeat(140), 'b', 'c', 'd', 'e'] }))).toEqual([]);
    expect(entryErrors(entry({ title: '' }))).not.toEqual([]);
    expect(entryErrors(entry({ bullets: [] }))).not.toEqual([]);
    expect(entryErrors(entry({ bullets: [''] }))).not.toEqual([]);
    expect(entryErrors(entry({ bullets: ['y'.repeat(141)] }))).not.toEqual([]);
  });

  it('LOG-041 (b) hash guard: a 7 to 40 hex token with a digit, never a plain word', () => {
    expect(hasHashLikeToken('build 5c2292c')).toBe(true);
    expect(hasHashLikeToken('a1b2c3d4e5')).toBe(true);
    expect(hasHashLikeToken('Your decks are defaced')).toBe(false); // hex letters, no digit
    expect(hasHashLikeToken('Up to 1234567 cards')).toBe(true); // all digits counts as hex
    expect(hasHashLikeToken('abc123')).toBe(false); // 6 characters
  });

  it('LOG-021 formats the calendar date in American long form with no time zone shift', () => {
    expect(formatReleaseDate('2026-11-27')).toBe('November 27, 2026');
    expect(formatReleaseDate('2026-12-04')).toBe('December 4, 2026');
    expect(formatReleaseDate('2027-01-01')).toBe('January 1, 2027');
  });

  it('LOG-024 / AC 5 showableEntries keeps valid entries in file order and skips the rest without throwing', () => {
    const valid = entry({ version: '0.0.2' });
    expect(
      showableEntries([entry({ bullets: [] }), entry({ version: '1.0.0' }), valid, null, 'x', { version: '0.0.1' }]),
    ).toEqual([valid]);
    expect(showableEntries('not an array')).toEqual([]);
    const older = entry({ version: '0.0.1' });
    expect(showableEntries([older, valid])).toEqual([older, valid]); // never re-sorted
  });
});
