---
tags: [validation, loop]
board: H-206
as_of: 2026-11-25
---
# Validation H-206 (SPEC-010 v0.15.0, username 20 characters, no emoji)

2026-11-25 · H-206 · **PASS** · docs only; run on uncommitted work on `loop/H-206-username-20-no-emoji`.

**Accept:** spec with the new limit, character set, rules cap and ACs; V-009 clean.

## Checks run
| Check | Result |
|---|---|
| Regex `^[\p{L}\p{Nd}][\p{L}\p{Mn}\p{Mc}\p{Nd} ._'’-]*$` + no U+FE00-FE0F / U+E0100-E01EF, after NFC, trim, collapse `\p{Zs}`, length 1..20 code points (node 24). Accepted: `Zoë O'Neil-Smith_2.0` (20), `e`+U+0301, `李雷`, 20 × `𝐀`, `नमस्ते`, `O’Neil`. Refused: `Squad 😀`, family ZWJ emoji, `❤`, `❤️`, `™`, `1️⃣`, `1`+U+FE0F, flag, skin-tone modifier, `@`, leading `-` / `.` / `’`, LF, U+200B, U+202E, NUL, 21 × `a`, 7 × (letter + 2 marks) = 21 code points. All 25 cases matched the spec's ACs. | PASS |
| Worst case arithmetic: 20 × `𝐀` = 20 code points, 40 UTF-16 units, 80 UTF-8 bytes (node). Allowed set has no character wider than 4 bytes / 2 units, so 80 covers all three `size()` units. | PASS |
| Rules cap restated: SYNC-112, SYNC-156 (a), data contract comment, AC 22 (81 × `a` denied, 20 × `𝐀` and 80 × `a` allowed, `😀` allowed by rules, legacy unchanged name passes, new 81 denied), AC 76, Impacts item 4, decision 20, Open question 13 (b) all say `size()` 1 to 80. | PASS |
| Stale 24 / 500 / 2000 rules in live text: remaining hits are labelled history (changelog, "was ..." notes, decision 19 struck through, Impacts item 4's v0.14 text followed by an explicit "v0.15 supersedes" block). No live requirement still says 24 / 500 / 2000. | PASS (see follow-up 1) |
| Research facts: `size()` unit stays "emulator counts UTF-16 units (verified 2026-11-25, H-183), production `unverified`"; not over-claimed. Allowed set, counting unit, NFC, `’` and cap 80 are flagged as orchestrator/spec-writer defaults (Open question 14, decision 20), not RJ's words. RJ's two decisions (20, no emoji) are quoted with date. | PASS |
| Storage: `users/{uid}.username`, Auth `displayName` unset (SYNC-156 (c), AC 76 asserts it); trim/collapse/invisible/bidi refusal and no-clear kept. | PASS |
| Versions: spec header, Spec Index row, Current State pin all 0.15.0; `board:` lists H-206; changelog entry present. Other specs pin "SPEC-010 0.14" (minimum), unaffected. | PASS |
| H-207 row vs spec: ACs 22/71/74/76, SYNC-153 (4), two error strings, counter `n / 20`, rules 1..80 checked only on change, no charset check in rules, create denied, test cases listed. Matches. | PASS |
| [[Privacy Notice Draft]]: no mention of the limit, no change needed. | PASS |
| ACs have Given/When/Then and are testable (22: rules run; 74: unit cases; 76 write allowed; 71 long-name header). | PASS |
| V-009: wikilinks in the 4 changed notes: 0 new unresolved (3 pre-existing line-wrapped names on the board, in H-065-era rows, are not from this change). | PASS |

## Follow-ups (non-blocking, no board items filed)
1. **Impacts item 4** still carries the v0.14 sentences (`Intl.Segmenter` count, 2000, 500 units) before the v0.15 "supersedes" block. Correct but easy to misread; the spec-writer may tidy it in a later pass.
2. **Stale non-spec notes** for the orchestrator or ui-engineer to refresh: [[Brief H-175]] (U3/U5: 24 characters, emoji), [[Review H-189]] (error string "Use 24 characters or fewer." is a historical review), [[ADR-0006 Two Imports - Collection and Decks]], [[API Contracts]] (H-183 2000 cap wording; its emulator unit fact is still right). H-207's Accept points at the spec, so none blocks the build.
3. **RJ question (already in Open question 14):** confirm the allowed set, code-point counting (Devanagari/Thai names use 2-3 of the 20 per letter) and cap 80.
