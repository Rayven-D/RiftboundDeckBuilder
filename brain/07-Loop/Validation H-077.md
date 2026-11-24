---
tags: [loop, validation]
item: H-077
date: 2026-11-24
round: 1
result: PASS
---
# Validation H-077: SPEC-010 v0.8 SYNC-050 first-sign-in write budget

Item: [[Handoff Board]] H-077. Accept: "ACs 3, 4, 36, 40 pass with write counts".
Scope: the uncommitted tree on `loop/H-077-write-budget` on top of `8a860a7` (H-081). 9 modified files: `sync-types.ts`,
`push-plan.ts` (+ spec), `sync-engine.ts`, `sync-engine-account-required.spec.ts`, `testing/fakes.ts`,
`core/sync/adapters/firebase-adapters.ts`, [[API Contracts]] v1.5, and the [[Session Log]]. Spec: [[Accounts and Sync]] v0.8
(SYNC-012, 034, 048, 050, 113, 120; data contract `PushChanges`; ACs 3, 4, 36, 40, and 48 as a neighbour).
Earlier report for context: [[Validation H-081]].

## Result
2026-11-24 · H-077 · PASS (round 1) · Accept (ACs 3, 4, 36, 40 with exact write counts; AC 48 tightened), V-008 (web, incl. rules emulator), V-005 (in-scope IDs), V-009 (changed notes), V-010, V-011, V-012, 1 mutation run, 1 validator probe · failures: none (1 spec-writer follow-up filed: H-136)

## Checks run
### V-008 (web), rerun by the validator from `web/`
| Command | Result |
|---|---|
| `npm run lint` | All files pass linting (exit 0) |
| `npm run build` | bundle generated (exit 0) |
| `npm test -- --watch=false` | 23 files, **344 passed** |
| `npm run test:rules` | 4 files, **33 passed**, emulator exited 0. `java` on PATH resolves to 17.0.1 first, so Java 21.0.13 (`C:\Program Files\Microsoft\jdk-21.0.13.102-hotspot\bin`) was prepended to PATH for this command only; JAVA_HOME was not changed. |

These match the builder's report. `services/` is unchanged, so its V-008 leg was not rerun.

### Accept: each AC against its test (all in `sync-engine-account-required.spec.ts`, named `AC n / SYNC-…`)
| AC | Spec says | Test asserts | OK |
|---|---|---|---|
| 3 | exactly 1 write (`set()` of `users/uA`), 3 reads, cloud = `users/uA` only | "AC 3 / SYNC-048 a": `writeLog = [[users/uA, set]]`, `writes = 1`, `pushLog` keys `[[account]]` with `create: true`, `reads = 3`, docs = `['users/uA']`, nothing pending | yes |
| 4 (same build) | ≤ 16 reads, **0 writes**, 350/20/10/3 shown, nothing pending, laptop's next pull gets no changed document | "AC 4 / SYNC-048 c same build": `writeLog = []`, `writes = 0`, `pushLog = []`, `reads ≤ 16`, counts 350/20/10 and the same 3 locked ids, `pendingCount 0`, `pending.account false`, every `syncedAt` unchanged, the laptop's next `pull` returns null collection/tags/locks and `{}` decks; then one edit → exactly `[[…/state/collection, update]]` with only `card 0` | yes |
| 4 (older build) | exactly 1 write, the account `update()` | "AC 4 / SYNC-012 older build": `writeLog = [[users/uA, update]]`, `writes = 1`, push `[[account]]` with `create: false`, `lastClientVersion: 'test-1'`, `reads ≤ 16`, every `syncedAt` except `users/uA` unchanged, the laptop pulls nothing | yes |
| 36 e | 0 writes, `createdAt` kept | "AC 36 / SYNC-048 e": `writeLog = []`, `pushLog = []`, `writes = 0`; plus the new "AC 36 / SYNC-048 e older build": exactly `[[users/uA, update]]`, `createdAt` kept | yes |
| 36 f | no write, half-deleted message, stores empty | "AC 36 / SYNC-048 f" (`writeLog = []`, `pushLog = []`, `writes = 0`, leftovers deep-equal) and the new "… f older build" (still 0 writes) | yes |
| 40 | no `state`/`decks` write; 1 account `update()` only on a build change | "AC 40 / SYNC-030": `writeLog = []`, `pushLog = []`, `writes = 0` (same build); "AC 40 / SYNC-012": exactly `[[users/uA, update]]`, push `[[account]]` | yes |
| 48 (not in Accept) | exactly 1 write | `writeLog = [[users/uNew, set]]`, push `[[account]]` | yes |

Every count is an exact equality (`toEqual` on the full write log, or `toBe`), except reads in AC 4, where the spec itself gives an upper bound ("at most 16").

### SYNC-050 / SYNC-113 / data contract against the code
- `PushChanges.batch` is gone from `sync-types.ts`. `PlanOptions.batch` and its "push everything known" branches are gone from `push-plan.ts`. `writeBatch` and `BATCH_CHUNK` are gone from the adapter, and the fake's batch path and `failBatchAfter` are gone too. `grep batch web/src` finds only comments. The rules test that uses `writeBatch` (user B cannot create in a batch) is a rules test, so it stays and still passes.
- The first-sign-in flow calls `pushPending({ accountOnly })`, which uses `planAccountPush(account)`. That plan holds `{ account }` only, so the flow cannot send a `state` or `decks` write or a hard delete. A regular push still uses `planPush` (pending items only).
- The adapter puts the account op first in `ops()` and writes documents one at a time in order. The fake now applies the SYNC-113 create rule per write against the live docs map. With no batch, this is the same behaviour.
- **Mutation run:** I temporarily changed the engine back to `planPush(…, { account })` for the first-sign-in push. The new test "SYNC-050 the account update() goes alone even when the download finds a deck tombstone older than 30 days" **failed** (1 failed, 28 passed), so the test catches the gap the builder fixed. The file was restored from a backup (`cmp` identical), and the tree is back to the builder's 9 files.
- `push-plan.spec.ts`: "SYNC-050 planAccountPush sends the account only…" and "SYNC-050 / SYNC-013 planPush sends pending items only…" pass.

### Validator probe (throwaway spec, run and deleted)
Cloud setup: `users/uA` + a deck tombstone 2 days old + `state/locks` that still locks that deck (inconsistent data, SYNC-071). Then a first sign-in on an empty phone:
- same build: `writeLog = []`, no push, **`pendingCount = 1`** (the SYNC-071 unlock tombstone), gate open, linked `uA`. The next sync writes `[[users/uA/state/locks, update]]` and pending drops to 0.
- older build: `writeLog = [[users/uA, update]]`, push `[[account]]`, **`pendingCount = 1`**. The next sync writes the same locks update.

So the write budget (SYNC-050 "at most 1 write") holds even on inconsistent data. The sentence "After the flow completes nothing is pending" does **not** hold in this case. The same applies to SYNC-065 rewritten tag lists and to SYNC-034 expired deck tombstones (the purge waits for the next push; tested by the builder).

### Builder-flagged spec issues: verdicts
| # | Issue | Verdict |
|---|---|---|
| 1 | SYNC-113 says "The `PushChanges.batch` split stays in the code", but the data contract (~line 465) says "the builder may remove it". The builder removed it. | **Acceptable.** The removal follows the data contract and SYNC-050 ("does not use the `PushChanges.batch` flag"). The SYNC-113 sentence described the H-062 build, and nothing else uses batches now. The spec text is stale: the SYNC-113 sentence and the `batch?` line of the data contract should be updated. Filed as part of **H-136** (spec-writer). |
| 2 | After a download from inconsistent cloud data, a merge repair (SYNC-071 / SYNC-065) or an expired-tombstone purge (SYNC-034) is left for the first regular push, but SYNC-050 says "nothing is pending" | **Acceptable build behaviour; spec gap.** The validator probe confirms the pending item. The other choice, sending the repair in the same push, would break the "at most 1 write" MUST, which is the stronger rule and the point of H-077. AC 4 uses consistent data, so it passes as written. SYNC-050 should say that repairs and purges found by the download wait for the first regular push, and an AC should cover it. Filed as part of **H-136** (spec-writer). |

### Other checks
- **V-005 (traceability), in-scope IDs:** test names contain SYNC-012 (5), SYNC-034 (3), SYNC-048 (15), SYNC-050 (6), SYNC-113 (4), SYNC-120 (3). SPEC-010 is `status: draft`, so the full V-005 does not apply yet. For information: 21 of the 88 MUST rows have no test named by ID (SYNC-004, 010, 011, 015, 017, 019, 064, 067, 068, 070, 074, 085, 092, 100, 101, 102, 114, 117, 122, 130, 131). None of them is in H-077's scope.
- **[[API Contracts]] v1.5 vs code:** `PushChanges` has no `batch`, `PlanOptions` has no `batch`, `planAccountPush(account)` exists in `push-plan.ts`, the adapter writes one document at a time, account first, and the first-sign-in flow pushes the account only. OK.
- **V-010:** the added lines contain no metagame terms. OK.
- **V-011:** `web/src` and `services/src` have no firebase/@firebase/aws imports outside `/adapters/`. OK.
- **V-012:** `git grep RGAPI-` (excluding `brain/`) and `web/dist` find nothing. OK.
- **V-009 (changed notes):** the wikilinks added in [[API Contracts]] and [[Session Log]] resolve. OK.
- **Design skills:** not loaded. There was no UI change.

### Board notes
- H-079 lists a stale "`PushChanges.batch` 'one batch'" comment. That comment was removed with the flag, so that part of H-079 is moot.
- H-070 (researcher) asks about `existsAfter()` billing inside a batch. The code no longer uses any batch, so only the "per created document" upper bound in SYNC-113/120 still matters.

## Filed
- **H-136** (spec-writer, P2): SPEC-010 text after H-077. See the [[Handoff Board]].
