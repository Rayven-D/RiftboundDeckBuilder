---
tags: [loop, validation]
board: H-380
---
# Validation H-380 (tests for H-060 pieces: `localDateText`, Decks list L2 / L11)

2026-11-25 · H-380 · PASS · Accept ("tests named by those IDs pass; lint, build, tests pass"), V-008 (lint, build, tests, run for real on Node 22.23.5) · checks run:
- `ng lint`: all files pass. `npm run build` (prod): bundle generated.
- Targeted specs `local-date.spec.ts`, `decks-list.spec.ts`, `lock-badge.spec.ts`: 3 files, 33/33 pass.
- Full suite: 1285/1288 pass, 3 fail, all timing or budget tests in files this diff does not touch (`git diff --stat` shows only `decks-list.spec.ts` plus the board row; `local-date.spec.ts` is new): `sync-engine-cache.spec.ts` AC 62 / SYNC-145 (5 s timeout, 5376 ms), `sync-engine-first-sign-in.spec.ts` AC 4 / SYNC-012 (5 s timeout, 5614 ms), `deck-ownership-view.spec.ts` OWN-080 (300 ms budget, 2362 ms). The three files rerun alone: 57/57 pass. Different tests failed in the builder's run, so the set is load-dependent flakes, not caused by this change.
- Spec text vs tests: [[Decks]] §10 L2 (count placeholder, toolbar disabled, 6 skeleton tiles with art box + 3 bars, `aria-busy`, hidden "Loading your decks…", nothing under 200 ms) and L11 (recompute in place, scroll and focus kept, OWN-070/071); SHARE-041 / OWN-090 "Nov 23, 2026" local date; SHARE-030 / SPEC-008 AC 20 unparseable `lockedAt` gives null. Each assertion matches the spec text.
- Non-vacuity (mutate, run, restore; tree clean afterwards): UTC date instead of local in `local-date.ts` under `TZ=America/Los_Angeles` fails the near-midnight test; removing `aria-busy` from `decks-page.html` fails L2; tracking the deck `@for` by object instead of `deck.id` fails both L11 tests.
- Not run: V-011 / design skills (no UI change, tests only).

Notes (non-blocking):
- L11 "scroll kept" is asserted as no `scrollTo` call, unchanged `scrollY` and identical DOM nodes, not a real non-zero scroll position (headless, builder's own caveat). Accepted.
- L2 holds the 200 ms timer by mocking `setTimeout` for `ms === 200` only, so a change of that delay constant would make the test fail on `delayed.length`.
- The three timing flakes (see follow-ups in the report) are pre-existing.
