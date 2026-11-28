---
tags: [validation]
---
# Validation H-188

2026-11-27 · H-188 · PASS · lint, collection unit tests (shared/collection + pages/collection, 8 files) · no failures

- `ng lint`: all files pass. `ng test` scoped to collection dirs: 140/140 (builder's 139 plus one added by validator).
- Diff read against the 7 Request points ([[My Collection]] 0.18.1: COLL-010, 101 e, 102, 103 c/e, 105/106, 108): details line, tile name (banned only), count excludes Unresolved, `sort=set` silent, lock band `hold >= 1`, excluded line, tests citing ACs 32-41 all present.
- Gap closed: AC 38 had no test. Added `COLL-103 (e) AC 38` in `collection-view.spec.ts` (excluded entry gives "2 not counted in your decks", plain entry gives null); the spec's `view()` helper now takes an optional `tags`.
- Not blocking: AC 33 `hold = 0` lock case stays untested; the guard is one line (`u.hold < 1`) and the deck store can't yield a zero-hold lock, so no follow-up row.
- Not run: full suite, e2e (Accept doesn't require them). ui-engineer review remains for the Accept's last clause.
