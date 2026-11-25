/**
 * SPEC-010 SYNC-153 username rules (v0.15, H-206 / H-207). Pure: no Angular, no storage, no Firebase.
 *
 * A username is a display name only its owner sees (not unique, SYNC-153). It is normalized (NFC, trim, collapse
 * inner runs of spaces), then checked: not empty, at most 20 code points (combining marks count), and only the
 * SYNC-153 (4) allowed set (letters, digits and marks of any script, the space and `. _ - ' ’`), with no variation
 * selector. No emoji, symbols, invisible or format characters, controls or line breaks.
 */

/** SYNC-153 (3): the limit, in Unicode code points of the normalized value. */
export const USERNAME_MAX = 20;

/** SYNC-153 / SYNC-155 strings. */
export const USERNAME_TEXT = {
  empty: 'Enter a username.',
  tooLong: 'Use 20 characters or fewer.',
  notAllowed: "Use letters, numbers, spaces and . _ - ' only. No emoji.",
  saveFailed: "Couldn't save your username. Check your connection and try again.",
  saved: 'Username saved.',
  preparing: 'Getting your account ready…',
} as const;

export type UsernameError = 'empty' | 'too-long' | 'not-allowed';
export type UsernameCheck = { ok: true; value: string } | { ok: false; error: UsernameError };

/**
 * SYNC-153 (2): every inner run of `\p{Zs}` (space, no-break space and the other space separators) becomes one
 * U+0020. Line breaks are not collapsed: they are not allowed and must show the not-allowed error (5).
 */
const INNER_SPACES = /\p{Zs}+/gu;

/** SYNC-153 (4): the only characters accepted; the first must be a letter or a digit. */
const ALLOWED = /^[\p{L}\p{Nd}][\p{L}\p{Mn}\p{Mc}\p{Nd} ._'\u2019-]*$/u;

/**
 * SYNC-153 (4), second test: no variation selector (U+FE00-U+FE0F, U+E0100-U+E01EF). They are `\p{Mn}`, so the
 * class above lets them through; U+FE0F would turn text into emoji presentation.
 */
const VARIATION_SELECTOR = /[\uFE00-\uFE0F\u{E0100}-\u{E01EF}]/u;

/** SYNC-153 (0), (1), (2): NFC, trim, then collapse every inner run of spaces to one space. */
export function normalizeUsername(raw: string): string {
  return raw.normalize('NFC').trim().replace(INNER_SPACES, ' ');
}

/** SYNC-153 (3): code points, the same in every browser (no `Intl.Segmenter`). */
function codePoints(s: string): number {
  return [...s].length;
}

/** The `n / 20` counter (SYNC-153): code points of the normalized value (a trailing space does not count). */
export function usernameLength(raw: string): number {
  return codePoints(normalizeUsername(raw));
}

/** SYNC-153: normalize, then check. Order: empty, too long, not allowed (the length error shows first). */
export function checkUsername(raw: string): UsernameCheck {
  const value = normalizeUsername(raw);
  if (!value) return { ok: false, error: 'empty' };
  if (codePoints(value) > USERNAME_MAX) return { ok: false, error: 'too-long' };
  if (!ALLOWED.test(value) || VARIATION_SELECTOR.test(value)) return { ok: false, error: 'not-allowed' };
  return { ok: true, value };
}

export function usernameErrorText(e: UsernameError): string {
  return e === 'empty' ? USERNAME_TEXT.empty : e === 'too-long' ? USERNAME_TEXT.tooLong : USERNAME_TEXT.notAllowed;
}

type SegmenterCtor = new (locale?: string, opts?: { granularity: 'grapheme' }) => {
  segment(s: string): Iterable<{ segment: string }>;
};

function segmenter(): InstanceType<SegmenterCtor> | null {
  const S = (Intl as unknown as { Segmenter?: SegmenterCtor }).Segmenter;
  return S ? new S(undefined, { granularity: 'grapheme' }) : null;
}

/**
 * User-perceived characters, by `Intl.Segmenter`; code points where it is missing. Used only for the header initial
 * (SYNC-150 (b)): a name saved under v0.14 may still start with an emoji, which must stay whole. Not for counting.
 */
export function graphemes(s: string): string[] {
  const seg = segmenter();
  return seg ? Array.from(seg.segment(s), (x) => x.segment) : Array.from(s);
}

/**
 * SYNC-150 (b): the header initial, the first grapheme upper-cased where the script has case (an emoji or an
 * accented letter stays whole). '' for no name.
 */
export function usernameInitial(name: string | null | undefined): string {
  if (!name) return '';
  const first = graphemes(name)[0] ?? '';
  return first.toLocaleUpperCase();
}
