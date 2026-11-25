/**
 * SPEC-010 SYNC-153 username rules (v0.15, H-206 / H-207), AC 74 and AC 76. Pure functions: no Angular, no Firebase.
 */
import {
  USERNAME_MAX,
  USERNAME_TEXT,
  checkUsername,
  graphemes,
  normalizeUsername,
  usernameErrorText,
  usernameInitial,
  usernameLength,
} from './username';
import { ALLOWED_USERNAMES, DENIED_USERNAMES } from './username-cases';

const NOT_ALLOWED = "Use letters, numbers, spaces and . _ - ' only. No emoji.";
/** 👨🏽‍👩🏽‍👧🏽‍👦🏽: one grapheme of 11 code points (a v0.14 name may still hold one). */
const FAMILY_TONES = '\u{1F468}\u{1F3FD}\u{200D}\u{1F469}\u{1F3FD}\u{200D}\u{1F467}\u{1F3FD}\u{200D}\u{1F466}\u{1F3FD}';
/** 👨‍👩‍👧 */
const FAMILY = '\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}';
/** U+1D400 MATHEMATICAL BOLD CAPITAL A: a letter outside the BMP (2 UTF-16 units, 4 UTF-8 bytes). */
const BOLD_A = '\u{1D400}';

describe('SYNC-153 username rules (v0.15, AC 74)', () => {
  it("AC 74 / SYNC-153 (1), (2) '  RJ   Smith  ' is stored as 'RJ Smith' (trimmed, inner spaces collapsed)", () => {
    expect(normalizeUsername('  RJ   Smith  ')).toBe('RJ Smith');
    expect(checkUsername('  RJ   Smith  ')).toEqual({ ok: true, value: 'RJ Smith' });
    // a run of no-break / ideographic spaces (\p{Zs}) collapses to one U+0020 too
    expect(normalizeUsername('RJ\u{00A0}\u{3000}Smith')).toBe('RJ Smith');
    expect(checkUsername('RJ\u{00A0}Smith')).toEqual({ ok: true, value: 'RJ Smith' });
  });

  it('AC 74 / SYNC-153 (6) empty, or only spaces: "Enter a username."', () => {
    expect(checkUsername('')).toEqual({ ok: false, error: 'empty' });
    expect(checkUsername('   ')).toEqual({ ok: false, error: 'empty' });
    expect(usernameErrorText('empty')).toBe('Enter a username.');
  });

  it('AC 74 / SYNC-153 (3) 20 letters are accepted (counter 20 / 20); 21 show "Use 20 characters or fewer." and are not cut', () => {
    expect(USERNAME_MAX).toBe(20);
    expect(checkUsername('a'.repeat(20))).toEqual({ ok: true, value: 'a'.repeat(20) });
    expect(usernameLength('a'.repeat(20))).toBe(20);
    expect(checkUsername('a'.repeat(21))).toEqual({ ok: false, error: 'too-long' });
    expect(usernameErrorText('too-long')).toBe('Use 20 characters or fewer.');
    expect(usernameLength('a'.repeat(21))).toBe(21); // the counter shows 21 / 20: nothing is cut
  });

  it('AC 74 / SYNC-153 (3) the counter counts the value after normalizing: a trailing space does not count', () => {
    expect(usernameLength('RJ   Smith ')).toBe(8);
    expect(checkUsername('a'.repeat(20) + '   ').ok).toBe(true);
  });

  it("AC 74 / SYNC-153 (4) Zoë O'Neil-Smith_2.0 (20 characters) is accepted, and ’ is accepted for '", () => {
    const name = "Zoë O'Neil-Smith_2.0";
    expect([...name]).toHaveLength(20);
    expect(checkUsername(name)).toEqual({ ok: true, value: name });
    expect(checkUsername('Zoë O\u{2019}Neil-Smith_2.0').ok).toBe(true);
  });

  it('SYNC-153 (4) letters and digits of any script with their marks are accepted', () => {
    for (const ok of ['José García', '李小龙', 'Влад', 'محمد', 'नमस्ते', 'ไทย', '١٢٣ Team', 'R.J. Smith', 'a_b-c']) {
      expect(checkUsername(ok)).toEqual({ ok: true, value: ok });
    }
  });

  it(`AC 74 / SYNC-153 (5) emoji and symbols are refused: "${NOT_ALLOWED}"`, () => {
    for (const bad of [
      'Squad \u{1F600}',
      `${FAMILY} Squad`,
      'Squad \u{2764}',
      'Squad \u{2764}\u{FE0F}',
      'Squad\u{2122}',
      '1\u{FE0F}\u{20E3}',
      'RJ@Smith',
      'Squad \u{1F1FA}\u{1F1F8}', // a flag (regional indicators)
      'RJ\u{1F3FD}', // a skin-tone modifier
      'RJ!',
      'Rift \u{2605}',
      '$RJ',
      'RJ+1',
      'RJ^2',
    ]) {
      expect(checkUsername(bad), bad).toEqual({ ok: false, error: 'not-allowed' });
    }
    expect(usernameErrorText('not-allowed')).toBe(NOT_ALLOWED);
  });

  it('AC 74 / SYNC-153 (4) a variation selector is refused, even after a letter', () => {
    for (const vs of ['\u{FE00}', '\u{FE0E}', '\u{FE0F}', '\u{E0100}', '\u{E01EF}']) {
      expect(checkUsername(`RJ${vs}`), vs.codePointAt(0)!.toString(16)).toEqual({ ok: false, error: 'not-allowed' });
    }
  });

  it('AC 74 / SYNC-153 (0) Zoë typed with a combining mark is stored as the NFC form and counts 3', () => {
    // The AC names U+0301, which is the acute (e + U+0301 = é); ë is e + U+0308. Both compose under NFC.
    const typed = 'Zoe\u{0308}';
    expect([...typed]).toHaveLength(4);
    expect(usernameLength(typed)).toBe(3);
    expect(checkUsername(typed)).toEqual({ ok: true, value: 'Zo\u{00EB}' });
    expect(checkUsername('Zoe\u{0301}')).toEqual({ ok: true, value: 'Zo\u{00E9}' });
    expect(usernameLength('Zoe\u{0301}')).toBe(3);
  });

  it('AC 74 / AC 76 20 × U+1D400 (20 code points, 40 UTF-16 units, 80 UTF-8 bytes) is accepted; 21 are not', () => {
    const name = BOLD_A.repeat(20);
    expect(name.length).toBe(40);
    expect(new TextEncoder().encode(name).length).toBe(80);
    expect(usernameLength(name)).toBe(20);
    expect(checkUsername(name)).toEqual({ ok: true, value: name });
    expect(checkUsername(BOLD_A.repeat(21))).toEqual({ ok: false, error: 'too-long' });
  });

  it('AC 74 / SYNC-153 (3) 7 Devanagari letters each with two combining marks (21 code points): "Use 20 characters or fewer." (marks count)', () => {
    // क + ् (U+094D, Mn) + ि (U+093F, Mc): NFC leaves them as they are
    const cluster = '\u{0915}\u{094D}\u{093F}';
    expect([...cluster.repeat(7).normalize('NFC')]).toHaveLength(21);
    expect(checkUsername(cluster.repeat(7))).toEqual({ ok: false, error: 'too-long' });
    expect(checkUsername(cluster.repeat(6)).ok).toBe(true); // 18 code points: the marks themselves are allowed
  });

  it("AC 74 / SYNC-153 (4) the first character must be a letter or digit: -Smith, .Smith, _Smith, 'Smith and a leading mark are refused", () => {
    for (const bad of ['-Smith', '.Smith', '_Smith', "'Smith", '\u{0301}Smith']) {
      expect(checkUsername(bad), bad).toEqual({ ok: false, error: 'not-allowed' });
    }
    expect(checkUsername('2Smith').ok).toBe(true);
  });

  it('AC 74 / SYNC-153 (5) a line feed, a tab, U+2028, U+202E, U+2066, U+200B, U+200D (ZWJ), U+FEFF or private use inside is refused', () => {
    const bads = ['\n', '\t', '\r', '\u{2028}', '\u{2029}', '\u{202E}', '\u{202A}', '\u{2066}', '\u{2069}', '\u{200B}', '\u{200D}', '\u{200E}', '\u{2060}', '\u{FEFF}', '\u{0007}', '\u{E000}'];
    for (const bad of bads) {
      expect(checkUsername(`Line one${bad}Line two`)).toEqual({ ok: false, error: 'not-allowed' });
    }
  });

  it('AC 74 / SYNC-153 21 characters that include an emoji: the length error shows first', () => {
    expect(checkUsername('a'.repeat(20) + '\u{1F600}')).toEqual({ ok: false, error: 'too-long' });
    expect(checkUsername('\u{1F600}'.repeat(21))).toEqual({ ok: false, error: 'too-long' });
  });

  it('AC 74 / SYNC-153 not unique: the same name is valid for two accounts (no lookup exists)', () => {
    expect(checkUsername('RJ Smith')).toEqual(checkUsername('RJ Smith'));
  });

  it('SYNC-153 (3) the count does not depend on Intl.Segmenter (code points in every browser)', () => {
    const original = (Intl as unknown as { Segmenter?: unknown }).Segmenter;
    const withSegmenter = usernameLength('Zoe\u{0301} \u{1F600}');
    (Intl as unknown as { Segmenter?: unknown }).Segmenter = undefined;
    try {
      expect(usernameLength('Zoe\u{0301} \u{1F600}')).toBe(withSegmenter);
      expect(withSegmenter).toBe(5);
      expect(graphemes(FAMILY)).toHaveLength(5); // the initial's fallback
    } finally {
      (Intl as unknown as { Segmenter?: unknown }).Segmenter = original;
    }
  });

  it('SYNC-150 (b) the initial is the first grapheme, upper-cased where the script has case; a v0.14 emoji name stays whole', () => {
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

describe('SYNC-160 (f) the shared AC 22 names list through the client check (v0.16, H-213; AC 74)', () => {
  // The same list runs through the Firestore rules in web/rules-tests/firestore.rules.test.ts.
  const unchanged = (v: string) => normalizeUsername(v) === v;

  for (const c of ALLOWED_USERNAMES) {
    it(`AC 74 / AC 22 allowed: ${c.label}`, () => {
      expect(checkUsername(c.value).ok).toBe(true);
    });
  }

  for (const c of DENIED_USERNAMES.filter((d) => unchanged(d.value))) {
    it(`AC 74 / AC 22 denied: ${c.label}`, () => {
      expect(checkUsername(c.value).ok).toBe(false);
    });
  }

  it('AC 74 / AC 22 the denied names the client normalizes first become something else (rules-only cases)', () => {
    const changed = DENIED_USERNAMES.filter((d) => !unchanged(d.value)).map((d) => d.label);
    expect(changed).toEqual([
      "' Smith' (leading space)",
      "'Smith ' (trailing space)",
      'RJ  Smith (two spaces)',
      'a + a line feed',
      'a + a tab',
      'a + U+00A0 (no-break space)',
    ]);
    // a line feed inside the name is not trimmed away: refused by the client as well
    expect(checkUsername('RJ\nSmith')).toEqual({ ok: false, error: 'not-allowed' });
  });
});
