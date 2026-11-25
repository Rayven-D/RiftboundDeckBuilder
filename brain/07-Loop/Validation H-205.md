---
tags: [validation]
---
# Validation H-205

2026-11-25 · H-205 · **PASS** · Accept: SPEC-013 0.1.2 ACs 1-17 and 10a pass, V-008 green, quota and document-size checks recorded, `/styleguide` dev tool still works. Worktree `loop/H-205-test-data-build`, uncommitted changes. Needs an RJ review of the new UI (gate, below).

## Checks run (all executed, not read)
- **V-008 web:** `npm run lint` clean; `npm run build` OK (no errors); `npm test -- --watch=false` **62 files / 835 tests pass on the first run** (the flaky OWN-080 / AC 62 in `sync-engine-cache.spec` did not fail this time); the H-205 sync spec alone 11/11.
- **Rules suite** (JDK 21 first on PATH, ports free, emulator shut down afterwards): **7 files / 51 tests pass**, including `web/rules-tests/test-data.test.ts` (AC 14: owner accepted for `test-data-5000` with the reserved deck ids, another user refused, Remove's `catalogVersion ""` update accepted).
- **`firestore.rules` unchanged:** `git diff HEAD -- firestore.rules firestore.indexes.json` is empty (TEST-030 "no rules change").
- **Traceability (V-005 style):** test names carry TEST-001, 002, 003, 004, 010, 011, 012, 020, 021, 022, 023, 024, 030, 031, 032, 033/034, 040/041, 050, 051, 052, 053 and AC 1-15 (incl. 10a). TEST-006 is MAY and out of scope; TEST-042 is a later build item.
- **Bundle:** `dist/web/browser/main-*.js` has no generator strings; "Ashen" / "Generated Locked A" appear only in the lazy chunk `chunk-DbP28wmX.js`. Sources: `sample-data` is only `import()`ed on demand (`card-data.ts`, `test-data-ops.ts`); the other imports are `import type`. The styleguide page still imports it statically, but that page is its own lazy chunk (unchanged).
- **`/styleguide` dev tool (AC 16):** `styleguide-page.ts`, `collection-samples.ts` and the styleguide spec are unmodified; the "StyleguidePage dev sample loader" specs pass in the 835. The dev tool still uses `stores.raw`; the dev key `rift.dev.sample` path in `CardData.fetchCatalog` is kept under `isDevMode()`, and a dev collection (`catalogVersion` `generated`) is not test data, so the two do not interfere.
- **Fixture sample not on live (TEST-005):** `sampleOverCatalog` is referenced only in the styleguide (a dev-mode page); the Collection page and test-data code never offer it.

## Quota and document-size checks (recorded explicitly)
| Check | Measured | Accepted | Result |
|---|---|---|---|
| Large `users/{uid}/state/collection`, serialized by the storage-size rules over the document the fake Firestore received from the real push plan (1,667 keys, 5,000 printings, `catalogVersion test-data-5000`, one `set()`) | **254,167 B** (24.2 % of 1,048,576) | <= 262,144 | PASS (asserted in the spec test `TEST-020 / AC 4 Large`; matches the H-204 independent recompute of 254,167 B) |
| Writes per Load | **5** (`set` collection, `set` locks, `set` x 3 decks) | 5 to 6 | PASS |
| Reads per Load | **0** | 0 | PASS |
| Load right after a build change | 5 (the account `update()` goes out with the start-up sync, so it is the 6th only if it shares the push) | 5 to 6 | PASS |
| Writes per Remove | **5** (`update` collection + `update` locks at once, 3 deck tombstone `set` after the 10 s Undo window) | 5 to 6 | PASS |
| Reads per Remove | **0** | 0 | PASS |
| Collection document after Remove (1,667 tombstones, `catalogVersion ""`) | 172,486 B | spec ~172 KB | PASS |
Method check: the numbers come from the engine test (`test-data-ops.spec.ts`) driving the real tracked stores, sync engine and push plan against `FakeFirestore` and counting `writeLog` and `reads`, not from constants. Console output is suppressed by the runner, so the byte figure is enforced by the `<= 262_144` assertion and the write list by `toEqual`; the exact 254,167 was cross-checked against the builder's note and the H-204 recompute (my own rerun with the generator's in-app key names over-counts because the stored shape is `q/t/p`, so it is not a comparison). Quota arithmetic (4,000 loads/day, ~1,400 cold Large pulls/day) is the spec's and unchanged.

## Judgements
- **AC 12 partial (accepted).** `removeTestDecks(stores, now)` is built and tested (TEST-033 / TEST-034), the "Replace import" plan leaves the collection alone, and TEST-032 (Add import blocked by the Remove-first notice) is built and tested. The Replace import commit itself does not exist because imports cannot save yet (H-158), so there is nothing to call it from; building a stub commit would be dead code. H-233 (depends H-158, H-205) already carries the wiring and its Accept names the test. Not a failure of H-205.
- **Builder choices vs the spec:** read against "Test data controls" in [[Collection]]: empty-state text button, `.banner--warning` banner with `role="status"`, not dismissible, Change set only while the flag is on, native radios with Load `aria-disabled` until chosen and while offline, one small confirmation dialog for Replace / Remove / Add-notice, focus return. None contradicts a TEST requirement; they fill gaps the spec leaves to the UI (styling, one shared confirm dialog, Escape deferred during a write). Taste calls stay with RJ.
- **Gate (needs RJ review):** this is a new UI screen. No separate gate item filed: [[Collection]] already marks "needs RJ review" and the board's convention is the parent row stays `verify` for RJ.

## Non-blocking notes
- `sync-engine-cache.spec` (OWN-080, AC 62) was reported flaky under load by the builder; green here. Worth an item if it recurs; not filed (not caused by H-205).
- Build output `web/dist` is git-ignored, nothing left to clean; the emulator was stopped by its own script.

## Failures
None. No follow-up items filed (next_id unchanged).
