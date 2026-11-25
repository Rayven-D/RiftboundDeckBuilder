/**
 * SPEC-010 v0.16 AC 22 / AC 74 / SYNC-160 (f) (H-212 / H-213): the shared username test data. Test data only (not used
 * by the app). The same list runs through the client check (`username.ts`, `username.spec.ts`) and through the
 * Firestore rules (`web/rules-tests/firestore.rules.test.ts`); for every name the client's normalization leaves
 * unchanged, both must give the same verdict. Names the client changes first (e.g. ` Smith`) are rules-only cases:
 * the rules see only the normalized result.
 */

/** U+1D400 MATHEMATICAL BOLD CAPITAL A: a letter outside the BMP (2 UTF-16 units, 4 UTF-8 bytes). */
export const BOLD_A = '\u{1D400}';

export interface UsernameCase {
  /** Readable label for the test name (the raw value may hold invisible characters). */
  label: string;
  value: string;
}

/** AC 22 allowed: each is one update of `users/uA` that changes `username`. */
export const ALLOWED_USERNAMES: readonly UsernameCase[] = [
  { label: '20 × U+1D400 (20 code points, 40 UTF-16 units, 80 UTF-8 bytes)', value: BOLD_A.repeat(20) },
  { label: '20 × a', value: 'a'.repeat(20) },
  { label: "Zoë O'Neil-Smith_2.0", value: "Zoë O'Neil-Smith_2.0" },
  { label: 'Zoe + U+0301 (Zoé in NFD)', value: 'Zoé' },
  { label: 'नमस्ते (Mn and Mc marks)', value: 'नमस्ते' },
  { label: 'O’Neil (U+2019)', value: 'O’Neil' },
  { label: 'Ａ１ (full-width letter and digit)', value: 'Ａ１' },
  { label: '7 Up', value: '7 Up' },
  { label: 'RJ Smith', value: 'RJ Smith' },
  { label: 'Zoé (NFC)', value: 'Zoé' },
];

/** AC 22 denied. */
export const DENIED_USERNAMES: readonly UsernameCase[] = [
  { label: '21 × U+1D400', value: BOLD_A.repeat(21) },
  { label: '21 × a', value: 'a'.repeat(21) },
  { label: '81 × a', value: 'a'.repeat(81) },
  { label: 'Squad 😀', value: 'Squad \u{1F600}' },
  { label: '😀', value: '\u{1F600}' },
  { label: '❤️ (U+2764 U+FE0F)', value: '❤️' },
  { label: '❤ (U+2764)', value: '❤' },
  { label: '1️⃣ (digit + U+FE0F + U+20E3)', value: '1️⃣' },
  { label: 'a + U+FE0F (a lone variation selector)', value: 'a️' },
  { label: 'a + U+E0100 (a supplementary variation selector)', value: 'a\u{E0100}' },
  { label: '-Smith', value: '-Smith' },
  { label: '.Smith', value: '.Smith' },
  { label: "' Smith' (leading space)", value: ' Smith' },
  { label: "'Smith ' (trailing space)", value: 'Smith ' },
  { label: 'RJ  Smith (two spaces)', value: 'RJ  Smith' },
  { label: 'RJ@Smith', value: 'RJ@Smith' },
  { label: 'a + U+200B', value: 'a​' },
  { label: 'a + U+202E', value: 'a‮' },
  { label: 'a + a line feed', value: 'a\n' },
  { label: 'RJ + a line feed + Smith', value: 'RJ\nSmith' },
  { label: 'a + a tab', value: 'a\t' },
  { label: 'a + U+00A0 (no-break space)', value: 'a ' },
];
