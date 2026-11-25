// SPEC-010 SYNC-101 (H-180): the two privacy-notice checks, kept separate. Pure functions only (no Node APIs), so the
// web unit tests can import them; build.mjs and check-privacy-release.mjs do the I/O. No dependencies.
//
// Both scan only the notice text source file, `src/app/core/privacy/privacy-notice.md` (NOTICE_PATH), never Angular
// templates or the rendered page.

/** The notice text source file, relative to `web/`. */
export const NOTICE_PATH = 'src/app/core/privacy/privacy-notice.md';

/** Check 1 (every build and the unit tests): case-sensitive substrings that mark an unfilled RJ or builder blank. */
export const BLANK_MARKERS = ['[RJ', '[builder'];

/** Check 2 (release step and production deploy only): the release-day date marker. */
export const RELEASE_MARKER = '[set on release';

export const RELEASE_MESSAGE =
  'Privacy notice still has "[set on release": replace it with the release date (effective and last updated) before releasing.';

/** Check 1: the blank markers found in the notice text, in BLANK_MARKERS order (empty when it passes). */
export function findNoticeBlanks(text) {
  return BLANK_MARKERS.filter((marker) => text.includes(marker));
}

export function blanksMessage(found) {
  return `Privacy notice has unfilled blanks: ${found.map((m) => `"${m}"`).join(', ')} in ${NOTICE_PATH}.`;
}

/** Check 2: fails while the release-day date marker remains anywhere in the notice text. */
export function checkPrivacyRelease(text) {
  return text.includes(RELEASE_MARKER) ? { ok: false, message: RELEASE_MESSAGE } : { ok: true };
}
