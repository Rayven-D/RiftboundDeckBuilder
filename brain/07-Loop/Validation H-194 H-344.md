---
tags: [validation]
board: H-194, H-344
branch: loop/H-194-H-344-legality
as_of: 2026-11-26
---
# Validation H-194 H-344

Combined pass (RJ's rule: related items in bulk). Build note: [[Legality Build H-194 H-344]]. Specs: [[Deck Legality]] 0.5, [[Deck Import]] 0.16. Research: [[Ban List]].

2026-11-26 · H-194 + H-344 · PASS · V-008 web (`npm run lint` all files pass; `npm run build` ok; `npm test -- --watch=false` 93 files / 1470 tests pass in two clean runs, one run also showed 4 unhandled errors from `app.spec.ts` / Firebase `initializeAuth`, filed H-486), V-011 / V-012 greps (no Firebase import outside `core/sync/adapters/`, no `RGAPI-` in code), traceability, ban data vs research, 2v2 snapshot review, side effect of `loadBans()` · follow-ups H-484 (wording, needs-RJ), H-485 (spec-writer, LEGAL-B11 text), H-486 (flaky test run)

## Checks
- **V-008:** lint and build pass. Tests: 93 files / 1470 passed, matching the builder's count. The first of three runs also printed "4 errors" (unhandled, `src/app/app.spec.ts`, Firebase `Provider.getOrInitializeService` via `createFirebaseAdapters`); the other two runs had none. Those files are untouched by this branch, so it is not a failure of these items. Filed H-486 (P3).
- **V-001 (real tournament decklists vs the engine):** SKIPPED. Status is `planned`, no runner exists, and the decklists in `brain/01-Research/Decklists/` need the card DB (domains, types), which is not in the repo (`data/` holds only the ban list, formats and samples). **V-003** SKIPPED (needs a live snapshot, H-020).
- **Traceability, SPEC-002:** every AC 1-27 has a test whose name starts `AC n` (1-4, 5, 21, 6-10, 13, 11, 14, 15, 19, 12, 16, 17, 18, 23, 24, 20, 22, 27, 25, 26). I read AC 22, 24, 25 and 27 and they assert the AC: counts per date, Master Yi, `unverified`, the evaluator refuses 2v2; the SAMPLE marker stub with the unflagged case; the warning does not change the verdict; no time of day in any message. AC 24 is stubbed as allowed (`NO_SAMPLE_MARKER`, CARD-044 undefined).
- **Traceability, SPEC-006:** DECK-050, 051, 052, 053, 054, 055, 056 each have a named test in `deck-import-legality.spec.ts` (plus two component tests for 051 and 053).
- **Ban data vs [[Ban List]]:** Standard `verified`, 4 waves with the research dates (03-30/03-31, 07-17/07-24, 09-15/09-18, 11-13/11-23), 15 cards + 7 battlefields (script count), every name matches the research table. B09 and AC 5 pass. 2v2 `unverified`: 1 Legend, 14 cards, 7 battlefields, names match the hub list in the research (Draven and Dreaming Tree normalised to the Standard names, as the research says).
- **Side effect:** `loadBans()` now returns data. The Collection, Decks, Deck detail and styleguide specs (`collection-page`, `decks-page`, `decks-list`, `decks-import-save`, `deck-detail`, `deck-ownership*`) are all in the 1470 passing. No regression found.

## The 2v2 snapshot wave
Question: is `2v2-before-2026-11-23` (Master Yi + 6 cards + 5 battlefields, dates 2026-09-15 / 2026-09-18) allowed?

Finding: **allowed, with a spec gap.** The names are sourced (Rules Hub reading in [[Ban List]], 2026-11-26). The list is `status: unverified` and `supported: false`, never offered or evaluated, and the wave's `notes` say plainly that it is not a Riot wave and that the dates are placeholders. LEGAL-B11 and "2v2 content" say entries beyond the totals "stay `unverified`", which this is. Counts as of 2026-11-22 and 2026-11-23 (AC 22) are exactly the spec's, and the spec says earlier dates are not checked.

It is not clean. The dates are not the real ones (research: the old names entered 2v2 on 2026-07-24 and 2026-09-18, so the September dates are wrong for 2026-07-24 to 2026-09-17). The board row said "no per-wave names or dates", and the spec text still says the per-card contents are "not sourced" (stale against the research). AC 22 cannot be tested without a dated base wave. So the spec contradicts itself. I did not fail the build for this: no user can see the data and the wave labels itself. Filed **H-485** (spec-writer) to state the allowance and bring the text up to the research. H-169 (researcher) still owns the true split.

## Wording
Strings the builder wrote that no spec gives are listed in the build note, section "Wording not given by the spec". Not a failure. One needs-RJ item collects them and the builder's question about the long "Missing ... for: <every card>" text: **H-484**. H-340 (RJ's gate on the review step) does not cover wording.

## Result
- H-194: PASS. ACs 22-27 pass (24 stubbed), B09 and ACs 1-21 unchanged and pass, V-008 green.
- H-344: PASS. DECK-050...056 tests pass; lint, build, tests green.
