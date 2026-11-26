---
tags: [loop, validation]
item: H-420, H-430
date: 2026-11-26
round: 1
result: PASS (H-420, H-430)
---
# Validation H-420 H-430: timing-sensitive web tests load-proof

Items: [[Handoff Board]] H-420 (from H-343) and H-430 (from H-380).
Scope: `loop/H-420-H-430-flaky-tests`, builder commit 8d5a9e7 against `origin/dev`. Eight files, all `*.spec.ts`:
`core/decks/{deck-ownership-view,shared-pool}.spec.ts`, `pages/decks/{decks-import-save,decks-list}.spec.ts`,
`shared/collection/collection-view.spec.ts`, `shared/deck/deck-list.spec.ts`,
`shared/sync/{sync-engine-cache,sync-engine-first-sign-in}.spec.ts`. No production file changed.

## Result
2026-11-26 · H-420, H-430 · PASS · diff scope, lint, build, 3 full `ng test` runs under load, count-assertion mutation check · failures: none

New board item: **H-560** (builder, P2, from validator: `styleguide-page.spec.ts` "Load records the deck ids it wrote" flake).

## Checks run
| Check | Result |
|---|---|
| Diff touches only spec files, only timing or counting | PASS. 8 spec files; every hunk is a timeout, a read counter, or a wall-clock limit. |
| Test names keep requirement IDs | PASS. OWN-080 / OWN-084, SHARE-072, COLL-065, AC 62 / SYNC-145, AC 4 / SYNC-012 unchanged. (The SHARE-072 and OWN-080 titles still say "under 100 ms" / "300 ms" while the guard is now 300 / 900 ms: see Notes 2.) |
| `npm run lint` (web) | PASS, "All files pass linting." |
| `npm run build` (web, prod) | PASS, exit 0 (20 s). |
| `ng test --watch=false`, run 1 | PASS 88 files, 1326/1326, 93 s |
| run 2 | PASS 88 files, 1326/1326 |
| run 3 | PASS 88 files, 1326/1326 |

Load: each run was started with a `while true; npm run build` loop in the background (Angular production builds back to
back), on a PC where other sessions were also running builds and tests. The builder's runs had lighter load, so this is
a harder test than theirs. Node v22.23.5.

## Do the count assertions test the intent?
- SHARE-072 (spec: 200 decks x 150 entries, 100 locks, `computeSharedPool` under 100 ms, [[Shared Cards and Lock-in]]):
  `collection.cards` reads <= distinct cardKeys, `catalog.cards` reads <= 3 x keys (2 per card today). This is the O(keys)
  shape the 100 ms budget exists to protect.
- OWN-080 / OWN-083 (200 tiles from one cached pool, [[Your Decks Ownership View]]): collection reads <= distinct
  cardKeys (the OWN-083 cache is shared by the pool and every tile); catalog reads <= 4 x 200 x 150 = 120,000 (62,400
  today; a 200 x 1,200 decks-times-cards scan would be 240,000).
- deck-list OWN-080 / OWN-084: `collection.cards` read <= 2 times for 200 decks, one pool.
- **Mutation check (validator):** in `shared-pool.ts`, removed the `if (byCard[k]) continue;` guard and called the
  uncached `deckOwnership`. SHARE-072 failed: "expected 30000 to be less than or equal to 1200". A first mutation that only
  swapped the cached call for the uncached one passed (the loop already visits each key once), so that swap alone is not
  a regression the test can see. File restored with `git checkout`.
- Wall-clock guards remain only as 3x best-of-3 gross checks (COLL-065 / COLL-066 limits 3 s / 600 ms), which keeps real
  slowdowns visible and can't be tripped by a single load spike.

## Notes
1. **Looser than before, by design.** The OWN-080 catalog bound (120,000) is about 2x today's count, so a regression under
   2x would pass; the guard against that is the 900 ms best-of-3 limit. Acceptable for a flake fix; not filed.
2. Test titles for SHARE-072 and OWN-080 / OWN-084 still carry the old millisecond numbers although the assertions are now
   counts plus a looser guard. Cosmetic; left as is.
3. The builder's unfixed flake (`styleguide-page.spec.ts` "Load records the deck ids it wrote", once in their baseline)
   did not fail in any of 3 validator runs under heavier load. Filed as H-560 to find the shared state rather than
   closing it.
4. Processes started by the validator were stopped (build loops, `ng test` runs). The two `scripts/build.mjs` processes
   seen afterwards were started at 10:07 and had ended by 10:08.
