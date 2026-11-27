# Validation H-672 H-673

2026-11-26 · H-672 + H-673 · PASS · lint, unit tests, spec text checks · no failures

- **H-672 PASS.** SPEC-013 0.1.7 ([[Test Data]]): quota table Remove row and the Reads line say about 7 (window-end pull, SYNC-126 (a) 4), matching AC 10. Load is "0 as specified, not re-measured"; [[Accounts and Sync]] SYNC-126 (a) lists six major actions and Load of test data is not among them, so that is right. [[Spec Index]] row says 0.1.7. No other "0 reads" text remains in Test Data.md.
- **H-673 PASS.** New test "AC 36 / SHARE-096 (a) second example" in `web/src/app/pages/deck-detail/deck-detail.spec.ts`: deck of 3-copy card (0 owned) + 2-copy card (1 owned), presses the lock toggle, expects no dialog, notice "Can't lock. Missing 4 cards." and nothing stored (3 + 1 = 4 copies). Stand-in cards are used because the fixture catalog lacks Hextech Ray and Gust; the numbers match the spec example.
- `npm run lint` (Node 22.23.5): all files pass. `ng test --watch=false`: 96 files, 1529 tests passed.
