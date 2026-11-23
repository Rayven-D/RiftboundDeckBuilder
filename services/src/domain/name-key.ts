// CARD-030: name key used for lookups only (CARD-031: display always uses the canonical name).

const APOSTROPHES = /[’‘ʼ´`]/gu; // ’ ‘ ʼ ´ `
const DOUBLE_QUOTES = /[“”]/gu; // “ ”
const DASHES = /[‐‑–—]/gu; // ‐ ‑ – —
const COMBINING_MARKS = /\p{M}/gu;
// Step 6 keeps letters, digits and whitespace (whitespace is collapsed to one space in step 7).
const NOT_LETTER_DIGIT_SPACE = /[^\p{L}\p{N}\s]/gu;
const WHITESPACE_RUN = /\s+/gu;

export function nameKey(name: string): string {
  return name
    .normalize('NFKC') // 1
    .replace(APOSTROPHES, "'") // 2
    .replace(DOUBLE_QUOTES, '"')
    .replace(DASHES, '-') // 3
    .normalize('NFD') // 4
    .replace(COMBINING_MARKS, '')
    .toLowerCase() // 5
    .replace(NOT_LETTER_DIGIT_SPACE, '') // 6
    .replace(WHITESPACE_RUN, ' ') // 7
    .trim();
}
