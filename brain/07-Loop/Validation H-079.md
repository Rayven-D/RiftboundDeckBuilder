---
tags: [loop, validation]
item: H-079
date: 2026-11-24
round: 1
result: PASS
---
# Validation H-079: small H-062 clean-ups (AC 22 `duplicatedFrom` rules test, stale comments)

Item: [[Handoff Board]] H-079. Accept: "Rules test added; comments match code".
Scope: the uncommitted tree on `loop/H-079-rules-cleanups` on top of `c1ae411` (H-078). 3 modified files:
`web/rules-tests/firestore.rules.test.ts` (1 new test), `web/src/app/core/sync/adapters/firebase-adapters.ts` (2 comments),
`web/src/app/shared/sync/sync-types.ts` (1 comment). `firestore.rules` is unchanged. Spec: [[Accounts and Sync]]
(SPEC-010 v0.9, `status: draft`) AC 22, SYNC-011, SYNC-080, SYNC-112. Earlier report for context: [[Validation H-078]].

## Result
2026-11-24 · H-079 · PASS (round 1) · Accept (new rules test run on the emulator + 2 boundary mutations; each comment checked against code and spec), V-008 (web, incl. rules emulator), V-005 (in-scope IDs), V-010, V-011, V-012 · failures: none · spec-writer follow-up suggested (stale SYNC-113 sentence on `PushChanges.batch`, below)

## Checks run
### V-008 (web), rerun by the validator from `web/`
| Command | Result |
|---|---|
| `npm run lint` | All files pass linting (exit 0) |
| `npm run build` | exit 0, output `web/dist/web` |
| `npm test -- --watch=false` | 25 files, **376 passed** (same as H-078: no unit test changed) |
| `npm run test:rules` | 4 files, **34 passed** (H-078: 33, +1 new test), emulator exited 0. Run with `C:\Program Files\Microsoft\jdk-21.0.13.102-hotspot\bin` prepended to PATH for this command only (`java -version` 21.0.13.1); JAVA_HOME not changed. |

`services/` is unchanged, so its V-008 leg was not rerun.

### Accept, part 1: rules test for a 37-character `duplicatedFrom` (AC 22, SYNC-112)
| Spec says | Evidence | OK |
|---|---|---|
| AC 22: `uA` writing "a deck whose `duplicatedFrom` has 37 characters" is denied | new test `SYNC-112 a deck whose duplicatedFrom has 37 characters is denied; 36 is allowed (AC 22)`: `assertFails` on `liveDeck({ duplicatedFrom: 'x'.repeat(37) })` | yes |
| SYNC-112: `duplicatedFrom` optional, string ≤ 36 (UUID length), length only, not format | same test: `assertSucceeds` with 36 `x` characters (not a UUID, so it also shows the format is not checked); rule `shortString(d.duplicatedFrom, 36)` in `firestore.rules` line 103 | yes |
| test passes on the real rules | passes in the 34/34 run above | yes |

**Mutation runs** (`firestore.rules` backed up to the scratchpad, then restored; `cmp` identical, `git diff firestore.rules` empty afterwards):
- cap 36 → 37: **1 failed** / 33 passed, the failure is exactly the new test (the 37-character write was allowed).
- cap 36 → 35: **2 failed** / 32 passed, the new test (36 now denied) and the existing "each valid document shape" test. So both halves of the new test assert the right boundary.

### Accept, part 2: comments match code
| Comment | Before | After | Checked against | OK |
|---|---|---|---|---|
| `KNOWN_DOC_SCHEMA` (`sync-types.ts`) | "… in SPEC-010 v0.5 (SYNC-011)" | "Every document type is at `schemaVersion: 1` (SPEC-010 SYNC-011)." | SYNC-011 in v0.9: "`schemaVersion` (integer, 1 for every document in this version)"; constant is `1` | yes |
| `WRITE_TIMEOUT_MS` (`firebase-adapters.ts`) | "a write this slow counts as offline (SYNC-080)" | "A write not acknowledged within this time is reported as `'unconfirmed'` (it may still land; items stay pending until a pull confirms them, SYNC-080)." | SYNC-080 "Unconfirmed writes": not acknowledged within 20 s → `RemoteErrorCode` `'unconfirmed'`, items stay pending, next pull confirms; constant is `20_000`; `withTimeout` uses it | yes |
| `withTimeout` docstring | "(SYNC-042)" | "(SYNC-080)" | SYNC-042 is **Convergence** (local winners and untouched pending items re-added after a merge) and does not mention timeouts; SYNC-080 is the requirement that defines unconfirmed writes, and AC 41 "Unconfirmed write" cites SYNC-080 first. The new reference is the right one. | yes |
| `PushChanges.batch` "one batch" | (removed by H-077) | no change needed | independent search: `git grep -i "one batch\|batches of 10\|\.batch\b\|batch(\|writeBatch"` over `web/src`, `services/src`, `firestore.rules` finds nothing stale. `PushChanges` (`sync-types.ts` 259–280) has no `batch` field; its doc says "Firestore writes of one push (SYNC-043)". The only `batch` mentions left are correct: `firebase-adapters.ts:409` "no batches since H-077, SYNC-050", `fakes.ts:212` "no batches, SYNC-050", and two spec comments in `sync-engine-account-required.spec.ts` saying no batch flag is sent. | yes |

### Other checks
- **V-005 (traceability), in-scope IDs:** the new test name contains SYNC-112 and AC 22 (10 lines in `web/rules-tests` name SYNC-112 or AC 22). SPEC-010 is `status: draft`, so the full V-005 does not apply yet.
- **V-010:** no metagame terms in added lines (the only grep hit is the diff header path `shared/sync`). OK.
- **V-011:** no firebase/@firebase/aws imports in `web/src` or `services/src` outside `/adapters/`. OK.
- **V-012:** `git grep RGAPI-` (excluding `brain/`) and `web/dist` find nothing; `.env` is ignored. OK.
- **V-009:** no notes changed by the builder. Not applicable.
- **Design skills:** not loaded. No rendered UI changed.

## H-084 overlap
H-084 (on `dev`) covers: (1) `sync.service.ts` `engine.start().then(...)` with no `.catch`; (2) `sync-engine.ts` `log.load().then(...)` in `scheduleChange()` with no `.catch`; (3) the `return` inside the `clockCheck` loop; (4) the duplicate "Some data couldn't be deleted" snackbar in `account-menu.ts`; (5) the missing `readOnly` guard in `TrackedDeckStore.create`. H-079 touches none of those files (`sync.service.ts`, `sync-engine.ts`, `account-menu.ts`, `tracked-stores.ts` are not in the diff) and none of those behaviours: its 4 parts are a rules test and 3 comments in `firestore.rules.test.ts`, `firebase-adapters.ts` and `sync-types.ts`. **No overlap.** H-084 stays open as filed.

## Spec follow-up (spec-writer), not a failure of this item
- SYNC-113 (last sentence): "The `PushChanges.batch` split stays in the code but the first-sign-in flow no longer uses it." is stale since H-077: `PushChanges` has no `batch` field, and the adapter writes one document at a time. The sentence's source column "batch split as built in H-062" is stale for the same reason. The same requirement still says "(or is created in the same batch)" and "in one batch" in its `existsAfter()` text; those describe the Firestore rule semantics and may stay, but the spec-writer should confirm.
