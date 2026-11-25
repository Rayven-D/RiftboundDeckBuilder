---
tags: [validation]
item: H-310
---
# Validation H-310

2026-11-25 · H-310 · PASS · lint, build, full test run (1,115), zone-kind and DECK-092 checks, scope check · live Load on dev SKIPPED (needs a live deploy, H-311 and H-254)

## Checks
- **`npx ng lint`, `npm run build` (PASS):** lint clean; build completes.
- **`npm test` (PASS):** 77 files, 1,115 tests passed (new `sample-data.spec.ts`, new TEST-025 test in `test-data-ops.spec.ts`).
- **Zone kinds (PASS):** the plan puts legends at generated indices 34 to 36, champions 37 to 39, battlefields 40 to 45, runes 46 to 49 (zero-based; names are `index + 1`, so "... 35" is the first legend: the builder's position-vs-name offset is only 0- vs 1-based). The spec asserts per deck: legend category `legend`, champion passes `isChampionUnit` from `deck-import.ts` (unit with `isChampionUnit: true`, CARD-024), battlefields `battlefield` with landscape art, runes `rune`, Main and Sideboard `unit`. Deck names in decks match catalog names.
- **Shape (PASS, 150 and 5,000 entries):** each deck Legend 1, Champion 1, Main 39 copies / 19 entries, Battlefields 3, Runes 12 / 2 entries (6 each, so a rune with 3 or more), Sideboard 10 / 6 entries: 66 copies, 32 entries; exactly one card in both Main and Sideboard per deck. DECK-092 (150 entries, 300 copies) holds with a wide margin.
- **Locked complete / open partial (PASS):** pool engine reports Locked A and B `locked, complete, not short`; Open not complete, with full, partial and none-available cards.
- **TEST-011 / TEST-020 (PASS):** ids, names and `test-data-<n>` catalogVersion unchanged (asserted). Card names, keys and collection quantities are unchanged: the diff changes only role-based `type` / `category` / `isChampionUnit` and placeholder art for the 16 non-unit cards among the first 50 (the other cards keep their art). A small catalog (30 or 3 entries) gives decks with only the cards it has.
- **Size (PASS, partly by assertion):** the sync test checks all six zones reach the account store, each document is at most 1 MiB and the three together are under 20,000 B (spec estimate about 11,200 B). The logged figure (builder: 9,868 B) was not visible in my run's output; the assertion passed.
- **Scope (PASS):** only `sample-data.ts`, `sample-data.spec.ts`, `test-data-ops.spec.ts` and the H-310 board status (`todo` to `doing`) changed. `web/src/app/core/decks/` and `brain/05-Services/API Contracts.md` are untouched.

## Not checked
- "A Load on dev shows Legend art and a percentage on each tile": SKIPPED. It needs a live deploy plus H-311 (`completionPercent`) and H-254/H-060 (tiles). The data side is covered (every deck has a Legend with art and a computed fill); re-check this once those items land. Not a reason to fail.

## Failures
None. No new board items.
