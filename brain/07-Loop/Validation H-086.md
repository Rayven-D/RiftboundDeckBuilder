---
tags: [loop, validation]
item: H-086
date: 2026-11-24
round: 2
result: PASS
---
# Validation H-086: Cancel deletion and the account-menu Try again (SPEC-010 v0.8 SYNC-096, AC 43)

Item: [[Handoff Board]] H-086. Accept: "SYNC-096 / AC 43 pass; tests".
Scope: uncommitted tree on `loop/H-086-cancel-deletion` (HEAD 85c1198). The base branch
`loop/H-074-spec010-followups` was deleted while this run was going on. It pointed at 85c1198, the same commit as HEAD,
so the diff was taken against HEAD. Spec: [[Accounts and Sync]] v0.8 (SYNC-096, SYNC-030 `deletingRemovedAny`,
Data contract `deleteAll` → `{ remaining, removedAny }`, AC 43).

## Result
2026-11-24 · H-086 · PASS (round 1) · Accept (AC 43, every clause), SYNC-030/SYNC-096 behaviour vs code, V-008 (web), V-010, V-011, V-012, V-009 (changed notes), ID-rename check · failures: none

## Checks run
### V-008 (web), rerun by the validator from `web/`
| Command | Result |
|---|---|
| `npm run lint` | All files pass linting (exit 0) |
| `npm run build` | bundle generated (exit 0) |
| `npm test -- --watch=false` | 20 files, **294 passed** |
| `npm run test:rules` (Java 21 from Android Studio jbr) | 4 files, **33 passed**, emulator exited 0 |

These match the builder's report.

### Accept: AC 43, clause by clause
| AC 43 clause | Test (named by ID) | OK |
|---|---|---|
| First delete fails: nothing deleted, `deletingUid` = uA, notice with Try again, status Error, no pull or push, also after reload | `sync-engine-cancel-deletion.spec.ts` "SYNC-096 / AC 43 the first delete fails…" (0 reads/writes after reload); the notice's Try again action is in the existing `account-menu.spec.ts` "AccountMenu delete outcomes" | yes |
| After reload the menu shows the Error status, Try again and Cancel deletion, and `deletingRemovedAny` is false | same engine test; `account-menu.spec.ts` "AC 43 with nothing removed the menu shows…" and "AC 43 after a reload the real SyncService restores the unfinished deletion…" (real `SyncService`, the log seeded in localStorage) | yes |
| Try again fails at the first delete again: both still offered | "AC 43 after a reload, Try again failing the first delete again keeps both…" | yes |
| Cancel clears `deletingUid` and `deletingRemovedAny`, shows "Your account wasn't deleted.", the account check finds `users/uA`, a pending card edit is pushed | "AC 43 Cancel deletion clears deletingUid and deletingRemovedAny…" (no `checkAccount`, no half-deleted notice, reads > 0, q 1→2 pushed, the next edit also pushed); menu test via the real service (log saved with `deletingUid: null` and no flag, status `synced`) | yes |
| `users/uA` deleted, then the deck deletes fail: `deletingRemovedAny` true, only Try again (also after a reload), Sign out available | "AC 43 users/uA deleted, then the deck deletes fail…"; menu "AC 43 once something was removed only Try again…" (Sign out enabled) | yes |
| Try again then completes as in AC 21 | same engine test: `deleteAccount()` → `'ok'`, Auth user deleted, no `users/uA*` docs, no `rift.` keys, "deleted" notice | yes |
| First delete timed out (`'unconfirmed'`): no Cancel | "AC 43 the first delete of users/uA timed out…" (engine, also after reload) + `rules-tests/delete-all.test.ts` `deleteInOrder` "'unconfirmed' … removedAny true" | yes |

### Spec behaviour vs code (read, and confirmed by the tests above)
- **Data contract `deleteAll`:** `DeleteAllResult = 'ok' | { remaining; removedAny }` (`sync-types.ts`); `FirestoreRemoteStore.deleteAll` returns `{ remaining: 4, removedAny: false }` on a failed deck-list read (emulator test: uB cannot list uA's decks, all 5 docs remain) and otherwise uses `deleteInOrder`, where `removedAny` = `i > 0 || code === 'unconfirmed'`. `withTimeout` rejects with `RemoteError('unconfirmed')`, so a 20 s timeout counts as removed. OK.
- **SYNC-030 `deletingRemovedAny`:** set to false only when `deletingUid` is first recorded (a retry keeps it); set to true on `removedAny` or `'ok'`, never reset to false (test: a retry that fails at the first delete keeps it true); cleared with `deletingUid` by a completed deletion and by `signOut('remove')` (emptySyncLog), and by Cancel (field deleted). OK.
- **Cancel:** `cancelDeletion()` is a no-op unless `canCancel` (re-checked inside the log update); it clears both fields, `deletionPending`, `accountChecked = false` (so the next pull includes the account get), clears the deleteIncomplete problem, notifies `deleteNotDone`, emits, then calls `syncNow()` (pull + push). OK.
- **Try again in the menu survives a reload:** `openSession` restores `deletionPending` from `log.deletingUid === uid`; `SyncService.deletion` is refreshed on every status emit; the menu shows Try again whenever `deletion()` is non-null, and it calls the same `runDelete()` as the snackbar, without the dialog (test). OK.
- **Once true never false:** see SYNC-030 above. OK.

### Builder choices not stated by the spec (none conflicts with it; listed as spec gaps)
1. **Cancel deletion is enabled offline** (only Try again is disabled). SYNC-081 disables only Sync now, Sign out and Delete offline, so this does not conflict. Offline, Cancel clears the flags at once and the resumed sync waits for the connection.
2. **A log with `deletingUid` but no `deletingRemovedAny`** (written by an older build) offers no Cancel. This is the safe reading of RJ decision 12. The spec does not say what to do here (only [[API Contracts]] does).
3. **`deleteAll` → `'ok'` sets `deletingRemovedAny` true** (e.g. step 3, the Auth delete, then needs a sign-in). This fits "true once anything was removed". The spec only names the `removedAny: true` trigger.
4. **Menu order:** status, Try again, Cancel deletion, Sync now, Sign out, Delete account and data. The spec does not set an order. No conflict.

Also noted, not a failure:
- Offline, the status shows `Offline` rather than the Error text during an unfinished deletion. This is the existing status precedence; AC 43 does not cover offline.
- This branch still has the v0.7 sign-out dialog with Keep a copy (H-081 scope). AC 43's "Sign out stays available and clears this device" holds today only through the "Remove from this device" choice. The account-required sign-out is built in H-081.

### Other checks
- **V-010:** no metagame terms in the added `web/` lines. OK.
- **V-011:** `grep` for firebase/@firebase/aws imports in `web/src` outside `/adapters/`: no output. (`rules-tests/` is test code outside `web/src`.) OK.
- **V-012:** `git grep RGAPI-` (excluding brain): no matches. OK.
- **V-009 (changed notes):** [[API Contracts]] gained the `deleteAll`/`deletingRemovedAny`/`cancelDeletion` contract, and the [[Session Log]] gained the H-086 builder entry; their wikilinks resolve. No spec text changed except the rename below.
- **ID rename H-085 → H-086:** a word-level diff of `brain/` (ignoring CR) shows only `H-085` → `H-086` tokens and `next_id` 86 → 87 in [[Handoff Board]], [[Accounts and Sync]], [[Accounts and Sync changelog]], [[Current State]], [[Validation H-074]] and [[Validation H-080]]. The only other changes are the builder's own additions to [[API Contracts]] and [[Session Log]]. `grep H-085` across `brain/` outside Archive: no hits. OK.

## Proposed follow-ups (not filed; next free ID 87)
- **H-087** · P2 · spec-writer · from validator · depends H-086 merged · SPEC-010: mark the H-086 parts as built (SYNC-096 "pending build, H-086" and its "Gap in the current build" sentence, the Data contract PENDING BUILD notes on `deletingRemovedAny` and `deleteAll`, the AC 43 *(H-086)* tags, decision 12 "Not built yet", the Summary line), and state the builder's choices 1–4 above (Cancel allowed offline; old log without the field → no Cancel; `'ok'` also sets the flag; menu order), plus whether the status during an unfinished deletion shows Offline or Error while offline · Accept: SPEC-010 matches the H-086 build; V-009.

## Round 2 (after code review)
2026-11-24 · H-086 · PASS (round 2) · V-008 (web) rerun, AC 43 Cancel clause re-checked, SYNC-096 vs the two review changes · failures: none

### What changed since round 1
1. `account-menu.ts` `cancelDeletion()` calls `this.snackBar.dismiss()` before `sync.cancelDeletion()`, so the still-visible
   failure notice's **Try again** cannot restart a cancelled deletion without the confirmation dialog. The engine's
   "Your account wasn't deleted." notice is opened after the dismiss, so it is not hidden (the real-`SyncService` menu test
   still finds it in the notices). Consistent with SYNC-096 (Cancel "clears `deletingUid` and `deletingRemovedAny`, shows
   'Your account wasn't deleted.'") and AC 43. Test renamed to "SYNC-096 the menu Cancel deletion calls Cancel deletion
   and dismisses the failure notice" and asserts `dismiss`; the SyncService-backed test's `MatSnackBar` stub gained `dismiss`.
2. `firebase-adapters.ts`: the diff against 85c1198, with comment lines removed, shows only the round 1 logic
   (`deleteInOrder`, `removedAny: false` on a failed list read). Doc-comment reorder only. OK.

### V-008 (web), rerun by the validator from `web/`
| Command | Result |
|---|---|
| `npm run lint` | All files pass linting (exit 0) |
| `npm run build` | bundle generated (exit 0) |
| `npm test -- --watch=false` | 20 files, **294 passed** (exit 0) |
| `npm run test:rules` (Java from Android Studio jbr) | 4 files, **33 passed**, script exited 0 |

### The two unfixed review findings
- **(a) `deletingRemovedAny = true` log write throws after a removal → Cancel may stay offered.** Only a failing
  localStorage write (`updateLog`) triggers it. If the user then cancels, the account check finds `users/uA` missing and
  SYNC-097 handles it as a deleted account, so no data is resurrected, but the Auth user would stay. Rare and bounded:
  **no follow-up.** Note only. Could be hardened later by setting an in-memory flag before the write.
- **(b) A cancelled re-auth at step 3 says "Your account wasn't deleted." although the documents are gone** (pre-existing,
  H-062). The same applies to `'needs-sign-in'` at step 3 (email link): the message tells the user to sign out and sign in
  again, and that sign-out clears `deletingUid` while the documents are already gone. SYNC-096 step 3 says only "step 1
  runs again" and gives no step-3 wording, so this is a gap in the spec, not a code bug. **Proposed follow-up below.**

### Proposed follow-ups (not filed; next free ID 87)
- **H-087** · P2 · spec-writer · as in round 1 (mark the H-086 parts of SPEC-010 as built, and record builder choices 1–4).
- **H-088** · P2 · spec-writer · from validator · depends none · SPEC-010 SYNC-096 step 3: say what the user sees when
  the re-auth at step 3 is cancelled or returns `'needs-sign-in'` after every document was deleted (today: "Your account
  wasn't deleted.", or the sign-out/sign-in-again advice, which clears `deletingUid` with only the Auth user left). Choose
  the wording (e.g. "Your data was deleted. Try again to finish deleting your account.") and whether sign-out is still
  advised. Add a Given/When/Then · Accept: SYNC-096 states the step-3 messages; V-009. Then builder item to match.
