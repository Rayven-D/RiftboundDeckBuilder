/**
 * SPEC-010 SYNC-153 username rules (v0.14.1, H-176), AC 74. Pure functions: no Angular, no Firebase.
 */
import {
  USERNAME_MAX_GRAPHEMES,
  USERNAME_MAX_UNITS,
  USERNAME_TEXT,
  checkUsername,
  graphemes,
  normalizeUsername,
  usernameErrorText,
  usernameInitial,
  usernameLength,
} from './username';

/** 👨🏽‍👩🏽‍👧🏽‍👦🏽: one grapheme of 11 code points, 19 UTF-16 units. */
const FAMILY_TONES = '\u{1F468}\u{1F3FD}\u{200D}\u{1F469}\u{1F3FD}\u{200D}\u{1F467}\u{1F3FD}\u{200D}\u{1F466}\u{1F3FD}';
/** 👨‍👩‍👧 */
const FAMILY = '\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}';
const COMBINING_ACUTE = '\u{0301}';

describe('SYNC-153 username rules (AC 74)', () => {
  it("AC 74 / SYNC-153 (1), (2) '  RJ   Smith  ' is stored as 'RJ Smith' (trimmed, inner spaces collapsed)", () => {
    expect(normalizeUsername('  RJ   Smith  ')).toBe('RJ Smith');
    expect(checkUsername('  RJ   Smith  ')).toEqual({ ok: true, value: 'RJ Smith' });
    // a no-break space run collapses too
    expect(normalizeUsername('RJ\u{00A0}\u{00A0}Smith')).toBe('RJ Smith');
  });

  it('AC 74 / SYNC-153 (6) empty, or only spaces: "Enter a username."', () => {
    expect(checkUsername('')).toEqual({ ok: false, error: 'empty' });
    expect(checkUsername('   ')).toEqual({ ok: false, error: 'empty' });
    expect(usernameErrorText('empty')).toBe('Enter a username.');
  });

  it('AC 74 / SYNC-153 (3) 24 letters are accepted; 25 show "Use 24 characters or fewer." and are not cut', () => {
    expect(USERNAME_MAX_GRAPHEMES).toBe(24);
    expect(checkUsername('a'.repeat(24))).toEqual({ ok: true, value: 'a'.repeat(24) });
    expect(checkUsername('a'.repeat(25))).toEqual({ ok: false, error: 'too-long' });
    expect(usernameErrorText('too-long')).toBe('Use 24 characters or fewer.');
    expect(usernameLength('a'.repeat(25))).toBe(25); // the counter shows 25 / 24: nothing is cut
  });

  it(`AC 74 / SYNC-153 (3) '${FAMILY} Squad' and 24 emoji are accepted; the family emoji counts as 1 (counter 7 / 24)`, () => {
    expect(checkUsername(`${FAMILY} Squad`)).toEqual({ ok: true, value: `${FAMILY} Squad` });
    expect(usernameLength(`${FAMILY} Squad`)).toBe(7);
    expect(checkUsername('\u{1F600}'.repeat(24)).ok).toBe(true);
  });

  it('AC 74 / H-183 24 × the skin-tone family emoji (264 code points, 456 UTF-16 units) is accepted', () => {
    const name = FAMILY_TONES.repeat(24);
    expect([...name]).toHaveLength(264);
    expect(name.length).toBe(456);
    expect(graphemes(name)).toHaveLength(24);
    expect(checkUsername(name)).toEqual({ ok: true, value: name });
  });

  it('AC 74 / H-183 25 of them, or 24 letters each with 30 combining accents (over 500 UTF-16 units), show "Use 24 characters or fewer."', () => {
    expect(checkUsername(FAMILY_TONES.repeat(25))).toEqual({ ok: false, error: 'too-long' });
    const stacked = ('a' + COMBINING_ACUTE.repeat(30)).repeat(24);
    expect(graphemes(stacked)).toHaveLength(24); // 24 graphemes: only the unit cap catches it
    expect(stacked.length).toBeGreaterThan(USERNAME_MAX_UNITS);
    expect(checkUsername(stacked)).toEqual({ ok: false, error: 'too-long' });
  });

  it('AC 74 / SYNC-153 (5) a line feed, a tab, U+2028, U+202E, U+2066, U+200B or U+FEFF inside: "Use letters, numbers, spaces and punctuation."', () => {
    for (const bad of ['\n', '\t', '\r', '\u{2028}', '\u{2029}', '\u{202E}', '\u{202A}', '\u{2066}', '\u{2069}', '\u{200B}', '\u{FEFF}', '\u{0007}']) {
      expect(checkUsername(`Line one${bad}Line two`)).toEqual({ ok: false, error: 'not-allowed' });
    }
    expect(usernameErrorText('not-allowed')).toBe('Use letters, numbers, spaces and punctuation.');
  });

  it('SYNC-153 (4) any script, punctuation, symbols, accents, the zero-width joiner and variation selectors are allowed', () => {
    for (const ok of ['Zoë', 'José García', '李小龙', 'Влад', 'محمد', "O'Brien-Smith!", '★ Rift ★', '\u{2764}\u{FE0F} cards', FAMILY]) {
      expect(checkUsername(ok).ok).toBe(true);
    }
  });

  it('SYNC-153 not unique: the same name is valid for two accounts (no lookup exists)', () => {
    expect(checkUsername('RJ Smith')).toEqual(checkUsername('RJ Smith'));
  });

  it('SYNC-153 (3) without Intl.Segmenter the count falls back to code points', () => {
    const original = (Intl as unknown as { Segmenter?: unknown }).Segmenter;
    (Intl as unknown as { Segmenter?: unknown }).Segmenter = undefined;
    try {
      expect(graphemes(FAMILY)).toHaveLength(5);
      expect(usernameLength('abc')).toBe(3);
    } finally {
      (Intl as unknown as { Segmenter?: unknown }).Segmenter = original;
    }
  });

  it('SYNC-150 (b) the initial is the first grapheme, upper-cased where the script has case; emoji stay whole', () => {
    expect(usernameInitial('rj Smith')).toBe('R');
    expect(usernameInitial('élan')).toBe('É');
    expect(usernameInitial(`${FAMILY_TONES} Squad`)).toBe(FAMILY_TONES);
    expect(usernameInitial('李小龙')).toBe('李');
    expect(usernameInitial(null)).toBe('');
  });

  it('SYNC-154 / SYNC-155 strings', () => {
    expect(USERNAME_TEXT.saved).toBe('Username saved.');
    expect(USERNAME_TEXT.saveFailed).toBe("Couldn't save your username. Check your connection and try again.");
    expect(USERNAME_TEXT.preparing).toBe('Getting your account ready…');
  });
});
