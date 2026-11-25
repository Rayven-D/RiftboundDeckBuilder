/**
 * SPEC-010 SYNC-153 username rules. Pure: no Angular, no storage, no Firebase.
 *
 * A username is a display name only its owner sees (not unique, SYNC-153). It is normalized (trim, collapse inner
 * runs of spaces), then checked: 1 to 24 graphemes AND at most 500 UTF-16 units (H-183), no control characters,
 * line or paragraph separators, bidi overrides / isolates, U+200B or U+FEFF.
 */

export const USERNAME_MAX_GRAPHEMES = 24;
/** SYNC-153 (3), v0.14.1: bounds the stored size; one grapheme can be many code points. */
export const USERNAME_MAX_UNITS = 500;

/** SYNC-153 / SYNC-155 strings. */
export const USERNAME_TEXT = {
  empty: 'Enter a username.',
  tooLong: 'Use 24 characters or fewer.',
  notAllowed: 'Use letters, numbers, spaces and punctuation.',
  saveFailed: "Couldn't save your username. Check your connection and try again.",
  saved: 'Username saved.',
  preparing: 'Getting your account ready…',
} as const;

export type UsernameError = 'empty' | 'too-long' | 'not-allowed';
export type UsernameCheck = { ok: true; value: string } | { ok: false; error: UsernameError };

/**
 * Horizontal spaces only (space, no-break space and the other Unicode space separators). Line breaks are not
 * collapsed: they are not allowed and must show their own error (SYNC-153 (5)).
 */
const INNER_SPACES = /[ \u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]+/g;

/**
 * SYNC-153 (5): control characters (tab, line feed and carriage return included), U+2028 / U+2029, the bidi
 * overrides U+202A-U+202E and isolates U+2066-U+2069, and the invisible U+200B and U+FEFF. The zero-width joiner
 * (U+200D) and the variation selectors that emoji need stay allowed (4).
 */
const NOT_ALLOWED = /[\p{Cc}\u2028\u2029\u202A-\u202E\u2066-\u2069\u200B\uFEFF]/u;

/** SYNC-153 (1), (2): trim, then collapse every inner run of spaces to one space. */
export function normalizeUsername(raw: string): string {
  return raw.trim().replace(INNER_SPACES, ' ');
}

type SegmenterCtor = new (locale?: string, opts?: { granularity: 'grapheme' }) => {
  segment(s: string): Iterable<{ segment: string }>;
};

function segmenter(): InstanceType<SegmenterCtor> | null {
  const S = (Intl as unknown as { Segmenter?: SegmenterCtor }).Segmenter;
  return S ? new S(undefined, { granularity: 'grapheme' }) : null;
}

/** SYNC-153 (3): the user-perceived characters, by `Intl.Segmenter`; code points where it is missing. */
export function graphemes(s: string): string[] {
  const seg = segmenter();
  return seg ? Array.from(seg.segment(s), (x) => x.segment) : Array.from(s);
}

/** The `n / 24` counter (SYNC-153): graphemes of the normalized value. */
export function usernameLength(raw: string): number {
  return graphemes(normalizeUsername(raw)).length;
}

/** SYNC-153: normalize, then check. Order: empty, not allowed, too long. */
export function checkUsername(raw: string): UsernameCheck {
  const value = normalizeUsername(raw);
  if (!value) return { ok: false, error: 'empty' };
  if (NOT_ALLOWED.test(value)) return { ok: false, error: 'not-allowed' };
  if (graphemes(value).length > USERNAME_MAX_GRAPHEMES || value.length > USERNAME_MAX_UNITS) {
    return { ok: false, error: 'too-long' };
  }
  return { ok: true, value };
}

export function usernameErrorText(e: UsernameError): string {
  return e === 'empty' ? USERNAME_TEXT.empty : e === 'too-long' ? USERNAME_TEXT.tooLong : USERNAME_TEXT.notAllowed;
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
