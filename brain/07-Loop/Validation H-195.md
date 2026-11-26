---
tags: [loop, validation]
item: H-195
---
# Validation H-195

2026-11-26 · H-195 (API Contracts pins SPEC-001) · **PASS** (attempt 1) · checks: `git diff origin/dev...HEAD` (2 brain files, no code), pin grep, field-by-field type comparison, built-behaviour check, H-648 row check, V-007 (SKIPPED), V-009 wikilinks.

## Passed
- **Pins:** [[Card Data Model]] front matter is `version: 0.4.1`, status `review`; [[Spec Index]] pins 0.4.1. [[API Contracts]] now says 0.4.1 in the header, Shared types and the browser-side "Read from other specs" row. The only remaining "SPEC-001 v0.2" is the v1 changelog line, which is history and fine. Snapshot `schemaVersion '0.2'` and the `0.2+` `catalogVersion` prefix match the spec data contract and CARD-062 / CARD-068, and `services/src/domain/types.ts` (`SCHEMA_VERSION = '0.2'`).
- **Types:** the SPEC-001 "Data contract" block matches `services/src/domain/types.ts` field by field (`CardSnapshot`, `CardSet`, `PlayableCard`, `Printing`, `CardLookup`, `VariantRule(sFile)`, `IngestionReport`). The named helper types the doc lists (`CardStats`, `CollectorInfo`, `CollectorForm`, `RiotRegion`, `NullCountedAttribute`) exist and have the same fields. `web/src/app/core/decks/types.ts` `CardSet`, `PlayableCard`, `Printing` match, and `Printing` lacks `collector` / `extra`, as the doc says. 0.4 adds no stored field (looseKey is a function, SAMPLE has no field), as the doc says.
- **Built behaviour not misstated:** `CardIndex.findCard` (`services/src/domain/lookup.ts` 49) is `cardsByKey.get(nameKey(...))`, exact only, and `GET /api/cards/:cardKey` (`http/server.ts` ~100) uses it, so the new "exact only as built, no article retry" note is true. `parsePublicCode` (line 15) does still say "copy index dropped", as H-648 (2) says.
- **H-648:** one row, 10 columns, P3 / builder / todo / from `builder (H-195)`, Tries 0, concrete Accept (CARD-034 AC 6 / AC 21 tests, API Contracts states the behaviour, comments cite 0.4.1, services lint/build/tests). Line references check out.
- **V-009:** the new wikilinks resolve. H-195 row edit stays in scope.
- **V-007: SKIPPED** (planned, not active in `Validation Checks.md`).
- V-008: not run, no code changed.

## Notes (no item filed)
- `web/src/app/core/decks/types.ts` header comments still cite SPEC-001 v0.3 / SPEC-002 v0.3 (shapes are right; comment only). Out of H-195's scope (the row names the API Contracts note); fold into H-648 or a later web tidy if wanted.
- The branch is 8 commits behind `origin/dev`; the diff is limited to two brain files, so a merge is expected to be clean apart from the board table.
