---
tags: [loop, validation]
board: H-664, H-665, H-666, H-667, H-668, H-669, H-670, H-671
as_of: 2026-11-26
---
# Validation 2026-11-26 Name Locks Batch

One bulk pass (RJ's rule). **A** = code on `loop/H-665-H-667-name-locks-sync` (0ddecf3, worktree H-665). **B** = specs on `loop/spec-H-668-H-671` commit 5160a05 (SPEC-005 0.17, 008 0.7, 010 0.19, 003 0.17, 007 0.17, 006 0.17, 013 0.1.6), read only. The code is judged against B. Build note: [[Build H-665 H-667]].

## Checks run (Node 22.23.5, A's `web/`)
| Check | Result |
|---|---|
| `npm run lint` | PASS, all files pass |
| `npm run build` | PASS |
| Unit tests, run 1 and run 2 | PASS: 96 files / 1528 tests each |
| `npm run test:rules` (JDK 21 first on PATH) | PASS: 7 files / 90 tests |
| `npm run e2e` | PASS: 5 / 5 |
| Servers and emulators | all stopped (no listener left on 4310, 8080, 9099) |

## Traceability (spot-read)
- Migration: AC 34 `migrateLocksV1` (`shared-pool.spec.ts`: lockedAt kept per name, orphan dropped, short name gets none, null ownership keeps all) and the store test (`local-stores.spec.ts`: v1 read once, written back as v2, v2 not migrated; it uses a fake migrate function, the real one is covered by the pure test). Cloud conversion: `merge.spec.ts` "decks and locks (SYNC-017 v0.18)".
- Removal dialog: AC 31 lines and wording in `deck-locks.spec.ts` and `collection-import.spec.ts` (Replace and Undo paths, cancel changes nothing).
- Sync drop: `sync-engine-shortfalls.spec.ts` asserts the exact one-text notice, the lock keys left, the unlock tombstone in the cloud, and no "cards short". Free-copies-only pull: no notice.
- AC 87: `sync-engine-major.spec.ts` delete test asserts no call and no write inside 10 s, Undo keeps the locks with identical timestamps and the cloud locks unchanged, and without Undo one pull then one push carrying the deck tombstone and both lock removals. `deck-detail.spec.ts` has the UI side.
- H-668 clamp: `deck-detail.spec.ts` "H-668 long names" (4 names, clamp CSS 2 lines, tap, blur, Enter, Escape, Space; a name that fits has no tabindex or role). The clamp is measured through stubbed ResizeObserver and scrollHeight, so the real ellipsis is confirmed only by the screenshots.
- H-670 wording: asserted for 11 cards, 1 card, 1 copy, 3 copies. H-671: `notice-position.spec.ts` scans every `snackBar.open(`.
- Rules: only `locks.size() <= 400` became `<= 6000` in `firestore.rules`; the emulator tests pass 6000 and refuse 6001. No other rule changed.

## Data safety
- v1 to v2 local: converted once on load, every counted name the old rule held in full keeps the deck's `lockedAt`; unreadable collection keeps all names (a later settle drops any that don't fit); the v1 record is never written again; a v3 record is never overwritten.
- Cloud: an old-shape key becomes a pending tombstone and the new keys are stamped now; `planPush` writes both in one `update()`, so there is no window where the cloud map has neither. A key already in the log is skipped, so two devices converting agree. No finding.
- Delete: locks stay stored and ignored in the 10 s window, nothing pushed, Undo restores them.

## Visual (builder's shots)
- 375 px long name: two lines with an ellipsis, lock and ⋮ on the row at the right; expanded: 7 lines, lock and ⋮ did not move.
- 1280 px: lock next to the name, ⋮ at the right edge of the row, no actions row.
- Missing panel at 1280: "Copy missing list" wraps under the "Missing · 11 copies" heading, right-aligned. SPEC-005 AC 43 allows this wrap.
- Notice at 375 and 1280: top-centre under the header, "Can't lock. Missing 11 cards.", readable; no reason line under the title.

## Spec vs build
Wording matches B exactly: "Can't lock. Missing {x} cards." / "1 card", "{x} copies" / "1 copy", the removal title, intro, line pattern and button, and the sync notice. x for a deck = missing copies (11 in the sample), as RJ chose. SHARE-024 (Undo keeps locks, older lock wins) matches the code. The six SYNC-126 actions are built, "Add to your decks" and "Add another copy" have no call site yet (not built).

Mismatches (none blocks):
1. SPEC-013 line 141 still says "Reads: 0 for Load or Remove". AC 10 (0.1.6) says 7 after SYNC-126. Spec-writer to fix the line.
2. Open question 19 (SPEC-008): the pool shows a lock as not locked before the dead lock leaves storage. The code does it; the spec has no rule, RJ's wish is not recorded.
3. A 6,000-entry `state/locks` is 715,290 B, above SYNC-123's 700 KB level, worded for the collection document; no warning logs for locks (SPEC-010 Open question 18, RJ to decide).
4. Unit test for AC 36's second example (0 Hextech Ray, 1 Gust, "Missing 4 cards", copies not names) was not found by name; the 11-card test uses a copies total, so the rule is exercised.

## Result per item
H-664 PASS, H-665 PASS, H-666 PASS, H-667 PASS, H-668 PASS, H-669 PASS, H-670 PASS, H-671 PASS. No new board items.
