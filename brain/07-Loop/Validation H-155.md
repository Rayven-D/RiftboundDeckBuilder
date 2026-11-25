---
tags: [loop, validation]
board: H-155
---
# Validation H-155 (lock engine: SHARE-053, SHARE-034 per card, SHARE-030, LEGAL-B02)

Scope: uncommitted working tree on `loop/H-155-lock-engine` (`web/src/app/core/decks/`, [[API Contracts]] v1.23). Specs: [[Shared Cards and Lock-in]] 0.4.6 ACs 19-21, [[Your Decks Ownership View]] 0.10.2 AC 13, [[Deck Legality]] LEGAL-B02 (SPEC-002 AC 21). Checks: [[Validation Checks]].

2026-11-25 · H-155 · PASS · checks run: V-008 web (`npx ng lint` all files pass; `npm run build` ok; `npx ng test --watch=false` 73 files / 1038 tests pass), Accept tests read and traced (below), V-009 (each AC has a test named after its rule; wikilinks resolve) · failures: none

## Accept trace
- SPEC-008 AC 19: `shared-pool.spec.ts` "SPEC-008 AC 19 ..." (5 tests): stored lock state, badge "Locked", line "Ownership unavailable", group `unavailable`, `canLock(null, deck1, false, true)` is `already-locked`, unlocked deck gives `ownership-unavailable`, unreadable lock store gives `lock: null`.
- SPEC-005 AC 13 second Given: `deck-ownership-view.spec.ts` "AC 13 second Given (OWN-065 ...)" (4 tests, including catalog-not-loaded).
- SPEC-008 AC 20: `shared-pool.spec.ts` "SHARE-030 / SPEC-008 AC 20" asserts order `c, a, d, b` and the "Locked" badge for `b`.
- SPEC-008 AC 21: `shared-pool.spec.ts` "SHARE-034 / SPEC-008 AC 21" (Σ stays 4, Hextech Ray 3 to 2 warns "1 card short", `after.cardsShort` is `['hextech ray']`; the no-drop Given gives no warning).
- SPEC-002 AC 21: `deck-ownership.spec.ts` "LEGAL-B02 / SPEC-002 AC 21: inside one wave remove runs before add".
- Code read against the specs: `canLock` checks `isLocked` first; `storedLockState` uses lock order (earliest lock); `lockedShortfalls` per cardKey, Σ helper gone; `summarizeDeck` rule 0 is `unavailable`, badge "Locked" never "cards short"; `OwnershipFilter` and `CollectionOwnership` types match API Contracts v1.23. No non-test callers of `canLock` exist, so no call site broke.

## Notes (no failure)
- The `locks?` field on the `'unavailable'` variant is a builder addition (the spec gave no channel); documented in API Contracts v1.23. Whoever wires the Decks page (H-311/H-060) must pass the stored locks, or locked decks lose their badge.
- AC 19's `lock=locked` / `own=*` URL filtering and Unlock enabling are page-layer behaviour, not covered by these engine tests; they belong to the page items.
- `shortfallWarning` omits " It stays locked." (the caller appends it in `collection-import.ts`); AC 21's full confirmation text is therefore assembled outside the tested function.
