---
tags: [validation]
updated: 2026-11-26
---
# Validation H-431 H-440

2026-11-26 · H-440 + H-431 · **PASS** (attempt 1) · branch `loop/H-431-H-440-playwright`, builder commit 284ed74 · checks: `npm run e2e` x2, mutation proofs x2, lint, build, `ng test`, scope/doc review · failures: none

| Check | Result |
|---|---|
| `npm run e2e` (E2E_PORT=4311, 4310 was held by another session), run 1 and run 2 | PASS 5/5 both (1.7 and 2.0 min) |
| OWN-110 asserts the acceptance: six links (+ Legend again) at 1440 and 375, heading `top >= bar bottom - 1`, heading at bar bottom + 12 (LAND_GAP) unless scroll-clamped, exactly that link `aria-current="location"`, heading focused; second test: plain scroll moves `aria-current` | PASS |
| Mutation: `LAND_GAP` 12 to 40 in `deck-detail.ts` | link test FAILED at both widths (landing offset 20 and 12 px off, expected <= 2). Reverted with `git checkout`. |
| Mutation: `[attr.aria-current]` forced to null in `deck-detail.html` | all 4 OWN-110 tests FAILED. Reverted with `git checkout`. |
| L11 test (H-431): list of 27 decks scrolled to half, real `storage` event from a second page of the same context, tile text changes (recompute ran), same DOM node, `scrollY` equal and non-zero | PASS (read and run; not mutated) |
| Scope: `git diff origin/dev...HEAD -- web/src` is empty (no app code changed); e2e files only under `web/e2e/` (`*.e2e.ts`), outside `tsconfig.app.json`, `ng test` (`src/**/*.spec.ts`) and lint (`src/**`) | PASS |
| Firebase blocked: `blockFirebase` aborts ports 9099/8080, any local path containing `firebase`, `/api`, Google/Firebase hosts for the whole context; sync log seeds the gate; only the expected "Failed to fetch dynamically imported module" noise was seen | PASS (by design plus observed noise; no emulator writes seen) |
| `npm run lint` | PASS |
| `npm run build` | PASS |
| `ng test --watch=false` | PASS 88 files, 1326 tests, no flakes this run (SYNC-145 / SHARE-072 did not fail; their fix is in PR #90) |
| Doc `brain/05-Services/Browser Tests.md` matches config and fixtures (port 4310, E2E_PORT, reuseExistingServer false, exact dev dependency 1.65.1, script `e2e`) | PASS |

Notes (no action): the L11 test was not mutation-tested; the dependency is exact-pinned `@playwright/test` 1.65.1 as approved by RJ 2026-11-26.
