---
tags: [loop, validation]
---
# Validation H-560 H-521

2026-11-26 · branch `loop/ui-tournaments-2026-11-26` (96a3717 H-521, 0e905c0 H-560 on 98fd670) · validator

## H-560 · PASS
- Test files only changed: `styleguide-page.spec.ts` (the other spec edits are H-521's). PASS.
- Spec comment names the cause (5 s default timeout on the cold full-page render under load; shared `stores`, `confirm` spy and sample keys then leak across the timed-out test). PASS.
- Fix is sound: 30 s suite timeout, per-test stores from `render()`, `beforeEach`/`afterEach` restore mocks and remove sample keys.
- Full `ng test` beside CPU load (busy node loops I started and stopped): 91 files / 1,427 tests passed in 7 of 8 runs at or below 1 busy loop per core, including 3 in a row beside 8 loops and 2 beside 22 loops (the 8-loop runs took about 40 s each). The styleguide file passed in every run, including 3 runs at 16 loops (2x oversubscribed).
- Note (not a failure of this row): at 16 loops on 8 cores, 2 of 3 runs failed 2 tests in other, unchanged files at the 5 s default: `collection-page.spec.ts` (COLL-001 S1 empty state) and `decks-list.spec.ts` (AC 26 tournament tile, "Timed out in waitFor"). Same class of cause; at 2x oversubscription only. No item filed.

## H-521 · PASS
- `copiesLine` (Deck detail header and Missing tab) and `summarizeDeck` ownershipLine (deck tile) use "copy" when the total is 1, "copies" otherwise; `tile-ownership.ts` has no noun. Tests added in four specs.
- Screenshots (`h521-deck-detail-header-locked-light-1440.png`: "1 of 1 copy locked in · 100%"; `h521-decks-tile-light-390.png`: "1 of 1 copy available"): read correctly.
- Spec check: SPEC-005 OWN-002, OWN-010 (f) and OWN-050 write "copies available" / "copies locked in" and never address R = 1. Not a hard conflict, but the spec should state the singular: filed H-660 (spec-writer, P3).

## Checks run (in `web/`)
| Check | Result |
|---|---|
| V-008 `npm run lint` | PASS |
| V-008 `npm run build` | PASS |
| V-008 full `ng test` (unloaded, 3 runs) | PASS 91 files / 1,427 tests |
| Loaded `ng test` runs (see H-560) | PASS in 7 of 8; 2 other-file timeouts at 16 loops |
| `npm run e2e` | PASS, 5 passed |
