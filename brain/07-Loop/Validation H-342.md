---
tags: [validation, loop]
item: H-342
date: 2026-11-25
result: PASS
---
# Validation H-342 (Deck Import 0.12: ACs 7 and 23, strings, RJ's slot rule, `Champion: 2 <champion>`)

2026-11-25 · H-342 · **PASS** · ACs 7 and 23 vs DECK-034 / 036 / 038, DECK-099 strings vs three code constants, DECK-033 / 034 (b) / data contract vs `reviewDeck`, DECK-027 vs research and SPEC-002, H-410 Accept, V-009, pin sweep, SPEC-001 / SPEC-002 conflict check · 0 failures · 3 notes (below)

Judged against [[Deck Import]] 0.12 (`review`), uncommitted on `loop/H-342-deck-import-spec`. Doc-only change: V-008 (lint, build, tests) is not in scope and was not run; the code was only read to compare strings and behaviour.

## Checks
| Check | Result |
|---|---|
| (1) AC 7 and AC 23 match DECK-034 / DECK-036 / DECK-038 | PASS. AC 7 now has a `Legend:` and a `Champion:` section, so no question is open and Save is enabled. AC 23 keeps Save disabled by the open `PICK_CHAMPION` ("1 question to answer") until it is answered with "Leave empty", then enabled. Matches the Validation H-253 follow-up 1 and the built tests |
| (2) DECK-099 strings vs `DECK_REVIEW_TEXT` (`shared/import/deck-import.ts`), `DECK_REVIEW_WORDS` (`shared/import/deck-review.ts`), `DECK_SAVE_TEXT` (`core/import/deck-import.ts`) | PASS. 15 of 15 review messages, 26 of 26 labels (all keys of `DECK_REVIEW_WORDS` except `championMany`) and 8 of 8 save strings match the code character by character (straight apostrophes, punctuation, plural forms). `200` / `150` / `300` match `LIMITS` in `shared/storage/records.ts`; the source limit `200` matches `MAX_SOURCE_TEXT` |
| (2) Champion reason lines not adopted | PASS. `championNotPicked`, `championExtraToMain` (`DECK_REVIEW_TEXT`) and `championMany` (`DECK_REVIEW_WORDS`) are absent from DECK-099's tables and named as pending H-341 in DECK-099, DECK-034 (c) and the Open questions. H-341 is still on the board |
| (3) RJ's 2026-11-25 rule vs the build | PASS. DECK-033: 2+ Legends, the pick stays, the others get `dropped` and their `raw` goes to `importRemovedLines`; "Leave empty" drops all (code lines 430..480, 574..577). DECK-034 (b): 2+ distinct cards under `Champion:`, `PICK_CHAMPION` lists exactly them, one copy of the pick in `champion`, extra copies and unpicked cards in `main` with `zoneMethod: 'user'`, nothing in `importRemovedLines`, "Leave empty" puts all in `main` (code lines 498..523). Data contract comments and DECK-042 say the same. Attributed to RJ, 2026-11-25, in chat, H-253 row, checked against facts 1, 4, 15 |
| (4) DECK-027 and research citations | PASS. [[Deck Construction Rules]] (`verified`, `as_of: 2026-11-24`): fact 4 (one Chosen Champion, Core 103.3.a) and fact 15 (same-name copies count, 103.3.a.3) say what DECK-027 cites; [[Physical Copies Across Decks]] fact 5 (`verified`, as of 2026-11-23, official: 4 champion options + 36 main = 40) matches. The claim that SPEC-002 carries no quantity is true (`chosenChampion: string \| null`, [[Deck Legality]] LEGAL-003 `1 + sum(main qty)`). DECK-025 is reworded to leave the two-zone case alone |
| (4) H-410 | PASS. Filed below H-342, owner `builder`, `from` spec-writer, depends H-342. The build does keep `champion` qty 2 for one distinct card (`championCards.length === 1`, line 498). Accept is testable: AC 32 (`champion` ×1, `main` has the card ×1, 39 in all, no question, Save enabled; DECK-025 two-entry case unchanged), plus lint, build, tests |
| New ACs 30…33 | PASS. Arithmetic checked: AC 31 gives `champion` 1 + `main` 39 = 40 (LEGAL-003); AC 32 gives 1 + 39 = 40 and 2 copies for LEGAL-005; AC 33 strings match DECK-099 |
| (5) V-009 | PASS. All new rules are numbered (DECK-027, DECK-099), ACs are Given / When / Then, every `[[wikilink]]` in the changed notes resolves (the two "missing" names in the Handoff Board scan are existing line-wrapped links, not from this diff), no fact without status and as_of, `status: review` kept, version 0.12 with a Summary line, changelog entry and Open questions updated |
| Pin sweep | PASS. Live pins moved to 0.12: [[Spec Index]] (SPEC-005, 006, 008 rows), [[Your Decks Ownership View]] (Depends on and import comment), [[Shared Cards and Lock-in]] (Depends on and import comment), [[Accounts and Sync]] (Depends on). Remaining `0.11.1` mentions are changelog or history text (SPEC-005 / 008 / 010 Previous-version lines, [[API Contracts]] v1.24 / v1.27 entries, Session Log) and are correct as history |
| Cross-spec conflict (SPEC-001, SPEC-002) | PASS. DECK-027 and DECK-034 (b) keep totals unchanged (no dropped copies), so LEGAL-003 / 004 / 005 count correctly; DECK-033 removes Legends so LEGAL-001 sees one or none. SPEC-001 card fields are not changed. No conflict |

## Notes (not failures)
1. AC 23 and DECK-034 (b) cite DECK-036 for "Leave empty" on the Champion question; DECK-036 itself only covers the Legend. DECK-034 (b) and RJ's rule carry the Champion case, so the meaning is clear. Tidy on the next spec pass.
2. [[Current State]] still shows SPEC-006 at 0.9 (stale; the orchestrator owns that file, not touched here).
3. The code does not satisfy DECK-027 yet. That is H-410 (builder), not a spec failure. Nothing in this item needs a new board row.

## Follow-ups
None new. H-410 (builder) and H-341 (ui-engineer, champion reason lines and `championMany`) were already on the board.
