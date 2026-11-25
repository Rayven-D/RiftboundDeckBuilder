/**
 * SPEC-012 Changelog ("What's new"): the entry shape, the per-entry rules (LOG-031, LOG-022), the whole-file rules of
 * the data test (LOG-041) and the date display (LOG-021). Pure functions: no Angular, no storage, no network.
 */

/** One release (SPEC-012 data contract). `date` null = unreleased placeholder (LOG-052). */
export interface ChangelogEntry {
  version: string;
  date: string | null;
  title: string;
  bullets: string[];
}

export const TITLE_MAX = 60;
export const BULLETS_MAX = 5;
export const BULLET_MAX = 140;

/** LOG-031: `0.0.X`, X an integer >= 1 without leading zeros. */
const VERSION = /^0\.0\.([1-9]\d*)$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** X of a `0.0.X` version, or null when the version breaks LOG-031. */
export function versionNumber(version: unknown): number | null {
  const m = typeof version === 'string' ? VERSION.exec(version) : null;
  return m ? Number(m[1]) : null;
}

/** LOG-031: `YYYY-MM-DD` that is a real calendar date (`2026-02-30` is not). */
export function isIsoDate(value: unknown): value is string {
  const m = typeof value === 'string' ? ISO_DATE.exec(value) : null;
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

/** LOG-021: `2026-11-27` → `November 27, 2026`, read as a calendar date (no time zone shift). */
export function formatReleaseDate(iso: string): string {
  const [y, mo, d] = iso.split('-').map(Number);
  return `${MONTHS[mo - 1]} ${d}, ${y}`;
}

/** LOG-041 (b) hash guard: a token of 7 to 40 hex characters that contains a digit. */
export function hasHashLikeToken(text: string): boolean {
  return (text.match(/[0-9A-Za-z]+/g) ?? []).some(
    (t) => t.length >= 7 && t.length <= 40 && /^[0-9a-f]+$/i.test(t) && /\d/.test(t),
  );
}

function textErrors(label: string, value: unknown, max: number): string[] {
  if (typeof value !== 'string') return [`${label} is not a string`];
  const errors: string[] = [];
  if (value.trim().length === 0 || value.length > max) errors.push(`${label} must be 1 to ${max} characters`);
  if (hasHashLikeToken(value)) errors.push(`${label} contains a hash-like token`);
  return errors;
}

/** The per-entry rules (LOG-031 fields, LOG-022 limits and hash guard). An empty list = a valid entry. */
export function entryErrors(entry: unknown): string[] {
  if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return ['entry is not an object'];
  const e = entry as Record<string, unknown>;
  const errors: string[] = [];
  if (versionNumber(e['version']) === null) errors.push(`version ${JSON.stringify(e['version'])} is not 0.0.X`);
  if (e['date'] !== null && !isIsoDate(e['date'])) errors.push(`date ${JSON.stringify(e['date'])} is not a real YYYY-MM-DD date or null`);
  errors.push(...textErrors('title', e['title'], TITLE_MAX));
  const bullets = e['bullets'];
  if (!Array.isArray(bullets)) {
    errors.push('bullets is not an array');
  } else {
    if (bullets.length < 1 || bullets.length > BULLETS_MAX) errors.push(`bullets must have 1 to ${BULLETS_MAX} items`);
    bullets.forEach((b, i) => errors.push(...textErrors(`bullet ${i + 1}`, b, BULLET_MAX)));
  }
  return errors;
}

/** LOG-024: the entries the page shows, in the file's order; anything that fails `entryErrors` is skipped. */
export function showableEntries(data: unknown): ChangelogEntry[] {
  if (!Array.isArray(data)) return [];
  return data.filter((e): e is ChangelogEntry => entryErrors(e).length === 0);
}

/**
 * LOG-041, the data test over the whole file: (a) at least one entry; (b) every entry passes `entryErrors`;
 * (c) versions strictly decreasing by exactly 1, the last one `0.0.1`; (d) non-null dates never increase going down;
 * (e) at most one null date, and only on the first entry. Returns every problem found (empty = valid).
 */
export function validateChangelog(data: unknown): string[] {
  if (!Array.isArray(data)) return ['the changelog is not an array'];
  if (data.length === 0) return ['the changelog has no entries'];
  const errors: string[] = [];
  data.forEach((e, i) => errors.push(...entryErrors(e).map((m) => `entry ${i + 1}: ${m}`)));

  const entries = data as Partial<ChangelogEntry>[];
  const versions = entries.map((e) => versionNumber(e?.version));
  versions.forEach((v, i) => {
    if (v === null || i === 0) return;
    const above = versions[i - 1];
    if (above !== null && v !== above - 1) {
      errors.push(`entry ${i + 1}: version 0.0.${v} must be exactly one below 0.0.${above}`);
    }
  });
  const last = versions[versions.length - 1];
  if (last !== null && last !== 1) errors.push(`the oldest entry must be 0.0.1, not 0.0.${last}`);

  let newerDate: string | null = null;
  entries.forEach((e, i) => {
    const date = e?.date;
    if (date === null) {
      if (i !== 0) errors.push(`entry ${i + 1}: only the first (newest) entry may have a null date`);
      return;
    }
    if (!isIsoDate(date)) return; // reported by entryErrors
    if (newerDate !== null && date > newerDate) errors.push(`entry ${i + 1}: date ${date} is after the newer entry's ${newerDate}`);
    newerDate = date;
  });
  return errors;
}
