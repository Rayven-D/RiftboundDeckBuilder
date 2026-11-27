import { localDateText } from './local-date';

/**
 * SPEC-008 SHARE-041 / SHARE-030 (AC 20) and SPEC-005 OWN-090: `lockedAt` / `updatedAt` as the local calendar date.
 * Instants are built from local time so the tests hold in any time zone.
 */
const localInstant = (y: number, m: number, d: number, h: number, min = 0) => new Date(y, m - 1, d, h, min).toISOString();

describe('localDateText', () => {
  it('SHARE-041 / OWN-090 an ISO date-time reads "MMM D, YYYY" (e.g. "Nov 23, 2026")', () => {
    expect(localDateText(localInstant(2026, 11, 23, 10))).toBe('Nov 23, 2026');
    expect(localDateText(localInstant(2026, 1, 5, 12))).toBe('Jan 5, 2026');
  });

  it('SHARE-041 / OWN-090 the date is the local one, not the UTC one, near midnight', () => {
    expect(localDateText(localInstant(2026, 11, 23, 0, 5))).toBe('Nov 23, 2026');
    expect(localDateText(localInstant(2026, 11, 23, 23, 55))).toBe('Nov 23, 2026');
  });

  it('SHARE-041 an explicit offset is converted to the local date', () => {
    const iso = '2026-11-23T10:00:00.000+02:00';
    const d = new Date(Date.parse(iso));
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    expect(localDateText(iso)).toBe(`${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`);
  });

  it('SHARE-030 / SPEC-008 AC 20 an unparseable lockedAt gives no date (null)', () => {
    for (const bad of ['not a date', '', 'Nov 23, 2026', '2026-13-45T99:99:99Z', '23/11/2026']) {
      expect(localDateText(bad)).toBeNull();
    }
  });

  it('SHARE-030 / SPEC-008 AC 20 a missing value gives no date (null)', () => {
    expect(localDateText(null)).toBeNull();
    expect(localDateText(undefined)).toBeNull();
  });
});
