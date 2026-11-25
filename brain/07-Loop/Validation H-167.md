---
tags: [loop, validation]
---
# Validation H-167

2026-11-25 · H-167 · **PASS** (one follow-up row filed, H-291) · Accept + V-009 + V-010 + cross-spec grep (docs-only change; V-008 not in scope, no code touched).

## Checks run
- **Accept:** SPEC-004 front matter 0.7, as_of 2026-11-24. CAT-001 stores `Riftbound Regional Championship: Europe`; CAT-002 `playerCount: null` and derived 307/308/96 are not data; new CAT-006 (MUST NOT) no bracket, round, match, seed; Spec Index SPEC-004 row 0.7. PASS.
- **Facts 7 to 9 vs [[Tournament Results]]** (status `unverified`, as_of 2026-11-24, same as the spec cites): official name and short form `RC Europe`, info-page wording `European Regional Championship` (fact 7); about 308 Day 1 / 96 Day 2 / 307 summed, plus or minus 1, prize table to 64th not a field size (fact 8); no bracket, Top 8 order plus winner ASC Evansrhim (Kennen), single elimination official but not stored (fact 9). Nothing over-claimed; the spec carries the `unverified` status in its Summary, CAT rows and open questions. PASS.
- **Requirement IDs:** 56 to 57 CAT rows, only CAT-006 added, no duplicates, none renumbered. ACs 25 and 26 added with Given/When/Then. PASS.
- **Pins:** Spec Index (SPEC-004 0.7; SPEC-005, SPEC-006 pins 0.7), Your Decks Ownership View Depends-on, Deck Import Depends-on, Accounts and Sync Depends-on all say 0.7. Remaining older pins are changelog or history lines only. PASS.
- **Placing labels, SPEC-004 vs SPEC-006:** CAT-011 (`1st` to `8th`, never `Top 4`) agrees with DECK-061 `placingLabel: '1st'` and the updated examples. The research note's Conflicts line ("#3/#4 = Top 4") is the note's own caveat, and the spec deliberately does not follow it. PASS.
- **Deck Import examples** (DECK-061/062, AC 11/11a) use the official name, pin-only, no version bump. CAT-073 example length 68 characters is under the 80 limit. PASS.
- **H-290:** well-formed (same column count as neighbours, ID in range, depends H-167, Accept check present); [[API Contracts]] untouched (empty diff). PASS.
- **V-009:** all `[[wikilinks]]` in SPEC-004 resolve; ACs have Given/When/Then. PASS. **V-010:** CAT-006 and AC 26 forbid, not add, stats; no 307/308/96 stored. PASS.

## Failure routed
- Stale short event name `Regional Championship: Europe` still in [[Your Decks Ownership View]] OWN-003 example and AC examples (lines ~129, 434, 437), plus [[ADR-0006 Two Imports - Collection and Decks]] line 58 and [[Design Direction]] line 18. Not part of H-167's Accept, so PASS stands, but it contradicts CAT-001. Filed as **H-291** (spec-writer, P1).
