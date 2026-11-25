// SPEC-012 LOG-053 (H-202): the release-time changelog check. Pure function only (no Node APIs), so the web unit
// tests can import it; check-changelog-release.mjs does the I/O. No dependencies.

export const UNDATED_MESSAGE = 'Changelog has an undated entry: set its date before releasing.';
export const INVALID_JSON_MESSAGE = 'Changelog is not valid JSON.';
export const NOT_ARRAY_MESSAGE = 'Changelog is not a JSON array.';

/**
 * Checks the text of changelog.json: fails on invalid JSON, a value that is not an array, or any entry whose `date`
 * is `null`. Any other date problem is the unit test's job (LOG-054), not this check's.
 */
export function checkChangelogRelease(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, message: INVALID_JSON_MESSAGE };
  }
  if (!Array.isArray(data)) return { ok: false, message: NOT_ARRAY_MESSAGE };
  if (data.some((entry) => entry !== null && typeof entry === 'object' && entry.date === null)) {
    return { ok: false, message: UNDATED_MESSAGE };
  }
  return { ok: true };
}
