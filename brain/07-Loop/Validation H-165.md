---
tags: [loop, validation]
item: H-165
---
# Validation H-165

2026-11-25 · H-165 (SPEC-001 0.4 from H-022 research) · **FAIL** · checks: git diff review, fact check against [[Ban List]] #10, [[Sets]] #6 / note under the table, [[Deck Construction Rules]] #17, ADR-0005 #4, SPEC-001 pin grep, cross-spec conflict check (SPEC-002, SPEC-003), V-009 wikilinks and Given/When/Then.

## Passed
- **Facts:** Dreaming Tree canonical / Rules Hub short form (Ban List #10, note `verified`, name unchecked against Riot payload, H-020: stated as such). ARC "Arcane Box Set", deck-code index 2, not on Standard list, not in Riftcodex `/sets` (Sets #6, note `unverified`: stated). OPP 133 / JDG 3 / PR 13 match the Sets note line under the table, marked `unverified`, as of 2026-11-24. Promos legal by name = TR 601.2 community transcription (Deck Construction Rules #17), marked `partial`, legality deferred to SPEC-002 LEGAL-C07. SAMPLE (#17) no field invented (CARD-044 reserved, BLOCKED H-020). Nothing inferred is stated as data.
- **ADR-0005 #4:** a generic leading-article fallback creates no alias table, so it is compatible. It is marked `partial` and put to RJ as Open question 15 (default generic rule, alternative a single sourced entry needing an ADR exception). Spec status is `review`, and the Spec Index says RJ is asked.
- **AC 6 change** is rewritten visibly (was `not-found`), noted in the Summary, changelog, Spec Index. `review` is warranted.
- **SPEC-002:** CARD-034 is explicitly not used by LEGAL-B05 (stays exact); LEGAL-C07, LEGAL-C10 and AC 24 are consistent with CARD-023 / CARD-044.
- **Pins:** every SPEC-001 pin in `brain/02-Specs` is 0.4 (Collection Import, Deck Import, My Collection, Shared Cards, Your Decks x2, Spec Index rows SPEC-005/006/007/008/011). Only stale text: Collection Import line 710 "MUST in SPEC-001 v0.2" (historical, fine).
- **V-009 wikilinks:** all new links resolve. New requirements are numbered; ACs 21-23 are Given/When/Then.

## Failures
1. **AC 6 contradicts CARD-034 and AC 21.** AC 6 says hypothetical cards `The Echo` and `Echo, Twice`, asked for `Echo`, give `not-found` ("a partial name is not an article alias"). Under CARD-034, `looseKey("Echo")` = `echo` and `The Echo` has looseKey `echo`, so the result is `found` for `The Echo` (AC 21's `The Pit` / `Pit` case says exactly that). Expected: AC 6 and CARD-034 agree. Actual: opposite results. Fix the example (e.g. `Echo, Twice` only, or drop `The Echo`).
2. **AC 21 second Given is unreachable.** "Two cards whose `looseKey` both equal the input's and neither matches exactly -> `ambiguous`": the only way two cards share a looseKey is `The X` and `X`, and the input then matches one of them exactly (or is `the x`, an exact match). So `ambiguous` can never occur, and the "more than one -> ambiguous" branch in CARD-034 is dead. Either remove it or define a reachable case.
3. **SPEC-003 conflict, not reconciled.** Collection Import IMP-025 (exact `nameKey` only), IMP-059 ("Known spelling differences (e.g. `Dreaming Tree` vs `The Dreaming Tree`) are handled the same way", no alias, nothing resolves it automatically) and AC 24 (`1 Dreaming Tree` -> `needs-review`, similarity about 0.76) say the opposite of CARD-034 (`Dreaming Tree` -> `found`). CARD-034 says "lookups by name only" and lists only CARD-032 and LEGAL-B05 as exceptions, so it is unclear whether import uses it. The pin in Collection Import was bumped to 0.4 without touching IMP-059 / AC 24. The report said no conflict with "SPEC-003 matching": that is wrong. Needs a decision: import uses CARD-034 (then IMP-025/059 and AC 24 change) or import is excluded (state it in CARD-034).

## Follow-ups (not blocking beyond the above)
- `brain/05-Services/API Contracts.md` lines 10, 131, 403 still pin SPEC-001 **v0.2** (stale since 0.3 too). Reported, not fixed. Owner `builder` (owns 05-Services), after SPEC-001 0.4 settles.
- Open question 17 (ARC legality) and 15 (alias scope) remain for RJ / researcher.

## Attempt 2 (2026-11-25)

2026-11-25 · H-165 attempt 2 (SPEC-001 0.4 `review` + SPEC-003 0.13, SPEC-006 0.9.1, SPEC-007 0.13.1) · **PASS** · checks: `git diff dev -- brain/`, attempt-1 failures, RJ decision fidelity, research over-claim check, pin grep across `brain/` (excl. Archive), cross-spec read of SPEC-001/002/003/006/007, V-009 wikilinks and Given/When/Then · no failures.

- **(a) AC 6 fixed.** `Echo, Twice` + `The Echo` asked `Echo` now gives `found` for `The Echo` (loose key `echo`); with `Echo, Twice` alone, `not-found`. Agrees with CARD-034 and AC 21.
- **(b) Ambiguous reachable.** `A Pit` / `The Pit` asked `Pit` (neither equals `pit`, both loose key `pit`) gives `ambiguous`; `The Pit` / `A Pit` asked exactly still `found` (exact first). Also `A Pit` + `Pit` asked `The Pit` is ambiguous. I traced CARD-034 by hand: all AC 6 and 21 cases hold.
- **(c) SPEC-003 conflict reconciled.** IMP-025 now uses the CARD-033/034 lookup (`method: "article"`, ambiguous gives `needs-review` / `AMBIGUOUS_NAME`), IMP-059 reworded (no alias table, generic rule), AC 24 rewritten, `ImportResult` method union includes `article`. SPEC-006 DECK-040 and SPEC-007 COLL-040 follow it; both point at CARD-038 for search.
- **RJ decision applied faithfully.** `the` and `dreaming` both find The Dreaming Tree (CARD-038 tokens, AC 24); full name with article matches (exact step 1); article optional both ways; no alias table; Open question 15 closed. Edge: a lone `the` does not match a card named `Dreaming Tree` (stated in AC 24). Fine.
- **No research over-claim.** CARD-034 states the article rule is RJ's product choice, not research; Dreaming Tree name still "not checked against the Riot payload (H-020)". ARC stays `unverified` (Sets #6), promo codes OPP/JDG/PR are community data as of 2026-11-24, legality deferred to SPEC-002 LEGAL-C07 (`partial`, TR 601.2 transcription); CARD-044 SAMPLE defines no field, notes RJ's "left out entirely" (H-193). Spec status `review` is right (matching behaviour changes).
- **Pins consistent.** Every live pin is SPEC-001 0.4, SPEC-003 0.13, SPEC-006 0.9.1, SPEC-007 0.13.1 (Spec Index, Accounts and Sync, Shared Cards, Your Decks x2, Collection Import, Deck Import, My Collection). Remaining older versions are changelog history or old inline import comments (see follow-up).
- **V-009.** All new wikilinks resolve (the only grep misses are pre-existing links broken across lines); new requirements numbered, new ACs are Given/When/Then.

Follow-ups (non-blocking, no new row): inline `import type` comments in Accounts and Sync (`SPEC-003 v0.11`, `SPEC-006 v0.8`), Shared Cards (`SPEC-006 v0.8`, `SPEC-007 v0.11`) and My Collection (`SPEC-003 v0.11`) were already stale before H-165 and are only code-sample comments. `brain/05-Services/API Contracts.md` still pins SPEC-001 v0.2 (lines 10, 131, 403): already board row H-195 (depends on H-165, now unblocked).

## Attempt 2 re-check after merge onto dev (2026-11-25)

2026-11-25 · H-165 re-check (merge f0a6813 onto dev: SPEC-001 0.4, SPEC-003 0.13, SPEC-006 0.9.1, SPEC-007 0.14.1) · **FAIL** (one stale pin) · checks: `git diff dev -- brain/` (12 files), live pin grep across `brain/` (excl. Archive, 06-Sessions, 07-Loop, Spec-Changelogs), H-244 / H-249 content retention, attempt-1 findings, RJ decision fidelity, research status / as_of, V-009.

- **Failure 1 (pin, minor).** `brain/02-Specs/Test Data.md` line 38 (SPEC-013 Depends on): expected `[[My Collection]] 0.14.1`, `[[Collection Import]] 0.13` (the Spec Index SPEC-013 row, edited in this merge, already says SPEC-007 0.14.1 and SPEC-003 0.13); actual `[[My Collection]] 0.14`, `[[Collection Import]] 0.12`. The file is not in the 12-file diff. Owner `spec-writer` (pin-only, no SPEC-013 version bump, as the index row says). Within H-165 scope, so no board row filed.
- **Merge resolution OK.** Spec Index, Accounts and Sync, Shared Cards, Your Decks, My Collection, Deck Import, Collection Import: all depends lines and index rows pin SPEC-001 0.4, SPEC-003 0.13, SPEC-006 0.9.1, SPEC-007 0.14.1 (SPEC-005 stays 0.8, SPEC-010 0.17.2, SPEC-013 0.1.3). My Collection: `version: 0.14.1`, `status: review`, changelog "Current: 0.14.1 ... Previous: 0.14 (H-244 ...)" intact, COLL-094 (d) and AC 31 (H-244) kept. Accounts and Sync keeps 0.17.2 (H-249) changelog and the 0.17.0 impact note. Remaining older versions are changelog history, "Impacts" notes, or old inline `import type` comments (already stale before H-165).
- **Attempt-1 findings still fixed.** AC 6 (`Echo, Twice` + `The Echo` asked `Echo` is `found` for `The Echo`; alone, `not-found`), AC 21 reachable `ambiguous` (`A Pit` / `The Pit` asked `Pit`; `A Pit` / `Pit` asked `The Pit`), IMP-025 / IMP-059 / AC 24 use CARD-034 (`method: "article"`), `ImportResult` union updated.
- **RJ decision applied.** CARD-034 (lookup, exact first), CARD-038 (search; `the` and `dreaming` both find The Dreaming Tree, AC 24), IMP-025/059, DECK-040, COLL-040 (+ AC 10). No alias table; Open question 15 closed and marked as RJ's product choice.
- **No research over-claim.** Dreaming Tree name still "not checked against the Riot payload (H-020)", ARC `unverified` (CARD-023a, Open question 17), OPP/JDG/PR counts "as of 2026-11-24", CARD-044 SAMPLE reserved with no field, RJ H-193 noted. `as_of` 2026-11-24, status `review`.
- **V-009.** New requirements numbered, new ACs Given/When/Then, new wikilinks resolve.
- Follow-up (existing row H-195): `brain/05-Services/API Contracts.md` lines 10, 131, 573 still pin SPEC-001 v0.2. Not a failure here.

## Attempt 3 (2026-11-25)

2026-11-25 · H-165 attempt 3 · **FAIL** (one stale index pin) · checks: Test Data fix, full live pin grep across `brain/` (excl. Archive, 06-Sessions, 07-Loop, Spec-Changelogs, board rows).

- **Fixed:** `Test Data.md` line 38 now pins My Collection 0.14.1 / Collection Import 0.13; Spec Index SPEC-013 row lists H-165 in its pin-only note.
- **Failure 1:** `brain/02-Specs/Spec Index.md` line 21 (SPEC-010 Accounts and Sync row, dependency list): expected `SPEC-003 0.13, SPEC-006 0.9.1, SPEC-007 0.14.1` (Accounts and Sync's own Depends on line says Collection Import v0.13, Deck Import v0.9.1, My Collection v0.14.1; the SPEC-005/008/011/013 rows already match); actual `SPEC-003 0.12, SPEC-006 0.9, SPEC-007 0.14`. Owner spec-writer, pin-only, in H-165 scope, no board row.
- All other remaining older numbers are changelog history, "Impacts" notes, or old inline `import type` comments (pre-existing). API Contracts SPEC-001 v0.2 is H-195.

## Attempt 4 (2026-11-25, RJ exception past the cap, commit 750f3ee)

2026-11-25 · H-165 attempt 4 · **PASS** · checks: `git diff dev -- brain/` (13 files), every Spec Index row and every spec's Depends on line against SPEC-001 0.4 / SPEC-003 0.13 / SPEC-006 0.9.1 / SPEC-007 0.14.1, residual-pin grep, earlier content checks (attempt-1 fixes, RJ decision, research status, V-009) re-read · no failures.

- Spec Index SPEC-010 row now pins SPEC-003 0.13, SPEC-006 0.9.1, SPEC-007 0.14.1; rows SPEC-005, 006, 007, 008, 011, 013 and Test Data.md line 38 all match; Depends on lines in Accounts and Sync, Collection Import, Deck Import, My Collection, Shared Cards, Your Decks Ownership View, Test Data are current. Deck Legality and Tournament Deck Catalog carry unversioned links only.
- Remaining older numbers are changelog history, "Impacts" notes and old inline comments. API Contracts SPEC-001 v0.2 is board row H-195.
- Content checks unchanged since attempt 2 (750f3ee touched only the index row, the board row and loop notes). Board row H-165 is currently `todo`; the coordinator sets it to done.
