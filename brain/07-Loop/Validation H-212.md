---
tags: [validation, loop]
board: H-212
as_of: 2026-11-25
---
# Validation H-212 (SPEC-010 v0.16.0, the Firestore rules check the username)

2026-11-25 · H-212 · **PASS** · docs only; run on uncommitted work on `loop/H-212-username-rules-validation`.

**Accept:** spec with rules-side character and length checks, ACs, Open question 14 closed; V-009 clean.

## Checks run
| Check | Result |
|---|---|
| Accept: SYNC-160 (rules check allowed set + 1..20 code points), SYNC-112/153/156 restated, AC 22 (allowed/denied lists, legacy case, four proofs), AC 74 (shared verdicts), Open question 14 closed (decision 21) | PASS |
| Invariant client = rules, run in node (`u` flag, a **proxy** for RE2, not the Firestore engine): 47 hand-picked names (all AC 22 allowed/denied cases plus U+3000, NBSP + space, U+2028, U+0085, U+FEFF, U+180E, ZWJ, lone combining mark, U+20E3, Nd of other scripts) and 200,000 random strings from a 23-code-point pool, comparing `username.ts` (normalize + check) with the SYNC-160 rules pipeline applied to the normalized value | PASS, 0 differences |
| Spaces: client trims, then collapses every `\p{Zs}` run to one U+0020, so no trailing, leading or doubled ASCII space can reach the rules; U+3000 / NBSP collapse to U+0020 and are accepted by both | PASS |
| Line terminators and RE2 `.`: `.` does not match `\n`, so `.*[VS].*`, `.* $`, `.*  .*` would not fire on a name with a newline, but the first test (`^[\p{L}\p{Nd}][...]{0,19}$`) already refuses any newline, tab, CR, U+2028/2029, U+0085 (not in the class), and `&&` short-circuits. `$` is end-of-text in RE2 and in JS without `m`. Anchors are consistent with whole-string `matches()` | PASS |
| Unverified facts marked: `\p{..}`, `\x{..}` and code-point repetition in the rules engine are `unverified` in SYNC-160 (g), Source column and the 0.16.0 changelog; the four proofs plus one production check are required; (h) forbids loosening (no fallback to v0.15, no wider bound), with 3 options for RJ | PASS |
| RJ words: "stick with my allowed characters. set up our own validation" and "Rules check 20 too" quoted with date; decision 21 and SYNC-153 say RJ did not speak about code-point counting, NFC or `’` by name; additions (trailing/double space, variation-selector exclusion, check only on change) flagged as spec-writer additions | PASS |
| Version pins: spec 0.16.0 + `board` line, Spec Index SPEC-010 0.16.0 and SPEC-013 0.1.3, Test Data pin 0.16.0 and changelog line, Current State 0.16.0; remaining 0.15.0 mentions are history lines; other specs' older pins (0.14) pre-date this change and are unaffected; no cross-spec conflict (Test Data writes no `username`) | PASS |
| H-213 row vs spec: `validUsername` as SYNC-160 (c), `{0,19}`, VS ranges, only-on-change, create denies, ACs, four proofs, SYNC-160 (h) stop, production check, API Contracts update, Accept | PASS |
| V-009: wikilinks in the 5 changed notes resolve; SYNC/AC numbering and Given/When/Then intact | PASS |
| Runtime tests (rules suite, web) | SKIPPED (docs only, nothing built) |

## Non-blocking notes (no board items filed)
1. The summary paragraph at the top of the spec lists `’` among the "RJ-confirmed" characters; SYNC-153 and decision 21 state precisely that RJ did not name `’`. Wording nit only.
2. AC 22 lists `a` + line feed, `a` + tab, `a` + U+00A0 as denied; the client trims them to `a` and accepts. The spec already limits the shared-verdict test to names the client leaves unchanged (AC 22 and AC 74), so the builder must filter with `normalizeUsername(n) === n`. Verified in node: with that filter, 0 differences.
3. The spec does not say why `.*` is safe given `.` skips newlines (the first pattern already refuses them); a one-line note for the builder would help.
4. Regex support in the Firestore engine is still `unverified` by design; H-213 must record the four proofs and the production check.
5. Board front matter `next_id: 208` is behind the IDs in use (up to H-232); not changed here.
