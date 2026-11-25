---
tags: [loop, validation]
item: H-143, H-122
date: 2026-11-24
round: 2
result: PASS (H-143 round 2, H-147, H-122)
---
# Validation H-143 / H-122: delete dialog sign-in-first state, sign-out dialog "Syncing…"

Items: [[Handoff Board]] H-143 (delete dialog sign-in-first state, from H-112) and H-122 (UI review #19, sign-out
dialog), built together in one session on one branch.
Spec: [[Accounts and Sync]] v0.10 SYNC-090, SYNC-084, SYNC-095, SYNC-096 step 1, the `AuthService.canReauthenticate()`
contract; ACs 38, 55, 56.
Design: [[Brief H-143 H-122]] with the ui-engineer's "Build check" (PASS on re-check, after the 8px gap fix).
Scope: uncommitted tree on `loop/H-143-delete-signout-dialogs` (base f3aab9e): `sync-dialogs.ts`, `account-menu.ts`
(+ spec), `adapters/firebase-adapters.ts` (+ `firebase-auth-service.spec.ts`), `sync.service.ts`, `sync-engine.ts`,
`sync-types.ts`, `testing/fakes.ts`, new `delete-sign-out-dialogs.spec.ts`; [[UI Index]], [[API Contracts]],
[[Session Log]] entries. No file under `brain/02-Specs/` changed (`git diff f3aab9e -- brain/02-Specs` and
`git status` are empty for it).

**Real signed-in check:** done by the ui-engineer on the Auth + Firestore emulators (real email-link sign-in, real
pending changes, slow and failed pushes), 1440 and 375, dark and light, keyboard; screenshots `h143-screens/01…20` in
the side-session notes (outside the repo). The validator read the results and did not re-drive the browser. Not
checked in the browser (no real sign-out was done): the `#main` fallback after a real sign-out and "focus the user
moved to Cancel is kept". Both are covered by unit tests below, and the mutation check shows those tests bite.

## Result
2026-11-24 · H-122 · PASS · Accept (AC 56 ×7 named tests, Syncing… while the promise is pending), V-008, V-009, V-011, V-012, mutation · failures: none
2026-11-24 · H-143 · FAIL · Accept (AC 55 ×4, AC 38 ×2 named tests, 2 adapter tests), V-008, V-009, V-011, V-012, mutation · failures: AC 38's third clause (new in v0.10: open fresh, sign-in goes stale, confirm → step 1 text, nothing deleted) has no test → H-147 (builder, P1)

2026-11-24 · H-143 · PASS (round 2) · Accept (AC 38 third clause now tested by name), V-008, mutation · failures: none
2026-11-24 · H-147 · PASS · Accept (named AC 38 test passes in `npm test`), mutation · failures: none

New board item in round 1: **H-147** (done in round 2). `next_id` 148.

## Checks run
### V-008 (web), run by the validator from `web/`
| Command | Result |
|---|---|
| `npm run lint` (`ng lint`) | All files pass linting |
| `npm test` | 43 files, **624 passed** (exit 0) |
| `npm run build` | not rerun (orchestrator reports ok; no change since) |
| `npm run test:rules` | not rerun (orchestrator reports 34/34 with JDK 21; no rules or adapter write path changed) |

### H-143 Accept: AC 55 and the updated AC 38
- `AC 55 H-143 sign-in-first state: …` (dialog alone): title, then exactly [SYNC-095 paragraph, step 1 sentence];
  `MESSAGES.reauthNeeded` is the same string (one string); the sentence has no role, no `aria-live`, no `.note`; no
  input; buttons exactly `Cancel`, `Sign out`; Sign out `matButton="filled"`, no `danger`, `aria-describedby` = the
  sentence's id; it closes with `'sign-out'`.
- `AC 55 H-143 signed in 20 minutes ago by email link with 1 pending: …` (real `SyncService` + engine on the fakes,
  through the account menu): sign-in-first state, focus on Cancel; Sign out → one dialog open, "Sign out?" with
  "1 change hasn't synced yet. It'll be lost if you sign out now." and the explanation; Cancel there → no
  `deleteAll`, no `reauthenticate` / `deleteUser` call, no sign-out, `users/uA` kept, sync log byte-identical,
  focus on the Account trigger.
- `AC 55 H-143 Cancel in the sign-in-first state …`: nothing deleted, focus on the trigger.
- `AC 55 H-143 Google enabled and a Google identity, signed in 20 minutes ago: …`: type-to-confirm; confirming calls
  `reauthenticate` (cancelled popup → "Your account wasn't deleted.", no `deleteAll`).
- `H-143 email-link only with Google off, even a Google identity gets the sign-in-first state`.
- `AC 38 H-143 type-to-confirm state …` (dialog alone) and `AC 38 H-143 signed in 1 minute ago: …` (through the menu):
  field, danger Delete account disabled until `delete`, focus in the field, Cancel → focus on the trigger. The older
  `SYNC-095 … (AC 38)` test in `account-menu.spec.ts` (no data → type-to-confirm) still passes. AC 38's "after the cloud
  deletion every local store and the sync log are empty and the app is signed out" stays covered by the engine's
  `AC 21 / AC 38` describe in `sync-engine.spec.ts`.
- `canReauthenticate()` contract: `H-143 canReauthenticate is true only with Google enabled and a Google identity`
  (true only for `google.com` + Google enabled; false with Google off, a non-Google identity, no identities, no
  user) and `H-143 reauthenticate uses the same check …`. `SyncEngine` / `SyncService` return false with no session
  or a stopped engine. [[API Contracts]] records it.
- **Failure (H-147).** AC 38, third clause, new in v0.10: "**Given** instead he signed in 4 minutes ago **When** he
  opens the dialog, waits 2 minutes, types `delete` and confirms **Then** nothing is deleted and the same text shows
  (SYNC-096 step 1)." No test named AC 38 (or any UI test) covers it. Expected: a test that opens the dialog in the
  type-to-confirm state, makes the sign-in stale, confirms, and asserts the step 1 notice and no delete. Actual: only
  the engine test `SYNC-096 an email-link user whose sign-in is old is told to sign in again; nothing is deleted`
  (`sync-engine-round2.spec.ts`), which calls `engine.deleteAccount()` directly and is not named by AC. This is the
  regression the H-143 row calls out ("the SYNC-096 step 1 check on confirm stays"), since the state is now decided
  once at open. **The behaviour is correct:** a temporary test of exactly this path (through the menu, fresh at open,
  `recentSignIn = false` + `reauthResult = 'needs-sign-in'` before confirm) passed (18/18 in the file) and was
  deleted again; the tree is unchanged.

### H-122 Accept: AC 56
- `AC 56 H-122 with 2 pending: …`: title "Sign out?"; exactly two paragraphs: the warning (`role="alert"`) and,
  as its next sibling, the explanation (`SIGN_OUT_TEXT`), `.note`, no role / `aria-live`; the 8px-gap rules exist in
  the component CSS (`.warning { margin-bottom: var(--space-2) }`, `.warning + .explanation { margin-top: 0 }`;
  computed 8px checked by the ui-engineer at 1440 and 375); buttons `Cancel`, `Sign out anyway`, `Sync now`;
  actions get `.stack`.
- `AC 56 H-122 the plain question …`: one paragraph, body colour, no alert, no `.stack`.
- `AC 56 H-122 "Syncing…" while the sync promise is pending: …`: the same button element reads "Syncing…",
  `aria-disabled` (not native disabled, keeps focus), Sign out anyway disabled, Cancel enabled, explanation still under
  the warning; a second press starts no second sync.
- `AC 56 H-122 a rejected push: …`: warning keeps "2 changes…", explanation under it, label "Sync now", enabled,
  focus kept.
- `AC 56 H-122 the push succeeds: …`: plain question in body colour, focus on Sign out; `… while offline: …` focus on
  Cancel; `… focus the user moved to Cancel … stays there`.
- Focus tests: `H-122 Sign out dialog opened while focus is on body …` (Cancel → Account trigger) and
  `H-122 a real sign-out: … focus goes to #main`.
- Four existing sign-out tests in `account-menu.spec.ts` now read `aria-disabled` for Sync now (because of
  `disabledInteractive`); their assertions are otherwise unchanged and one adds the "Sync now" label check.

### Test quality (mutation check)
Mutations applied one at a time to the worktree files (backed up first, restored byte for byte afterwards; the
`git diff --stat` is the same 236+/41− as before). Specs run: `delete-sign-out-dialogs.spec.ts`,
`account-menu.spec.ts`, `firebase-auth-service.spec.ts` (61 tests; unmutated all pass).

| Mutation | Tests failing |
|---|---|
| `signInFirst` always false | 2 |
| `canReauthenticate()` ignored at open | 1 |
| adapter `canReauthenticate()` ignores the enabled providers | 2 |
| explanation not muted under the warning | 2 |
| no "Syncing…" label | 2 |
| Cancel disabled during the sync | 2 |
| sign-in-first Sign out styled `danger` | 1 |
| `'sign-out'` result doesn't open the Sign out dialog | 1 |
| no refocus after a real sign-out | 1 |
| `.warning + .explanation { margin-top: 0 }` removed | 1 |
| no focus move after a clean Sync now | 2 |
| double-press guard removed | 1 |
| step 1 sentence given `.note` | 1 |

13 of 13 caught. (Not mutated: the AC 38 third clause, which no UI test covers; see H-147.)

### Earlier work intact
- **H-102:** `H-102: the Delete account dialog button is a filled danger button; Cancel is not` and the menu divider
  test pass; the type-to-confirm Delete account keeps `class="danger"` (also asserted in the new AC 38 tests).
- **H-139:** `styles.scss` is not in the diff; the ui-engineer saw the focus ring unclipped at 375 and on the trigger
  after Cancel.
- **H-141 / H-142 / H-110:** `account-menu.spec.ts` AC 53, AC 54, AC 43 and H-110 tests pass; the ui-engineer
  rechecked the menu (identity, status, dividers, offline line).

### Other checks
- **V-011:** no `firebase` import in the changed `shared/sync` files, `account-menu.ts`, `sync-dialogs.ts` or
  `sync.service.ts`.
- **V-012:** `git grep RGAPI-` in `web/`, `services/`: no matches.
- **V-009:** [[Brief H-143 H-122]] links resolve ([[Brief H-102]], [[Brief H-139]], [[Brief H-104 H-106 H-124]],
  [[Brief H-140 H-125 H-108]], [[Brief H-141 H-142 H-110]], [[UI Review 2026-11-24]], [[Accounts and Sync]],
  [[Design Direction]], [[UI Index]], [[Validation H-102]]).
- No spec file changed by the builder.

## Round 2 (H-143 + H-147): the AC 38 third clause
The builder added one test to the H-143 account-menu block of `delete-sign-out-dialogs.spec.ts`; no production file
changed (`sync-dialogs.ts`, `account-menu.ts`, `firebase-adapters.ts` byte-identical to the round 1 backups).
- **Test:** `AC 38 H-143 signed in 4 minutes ago: type-to-confirm; 2 minutes later typing delete and confirming deletes
  nothing and shows the step 1 text`. Email link only, `recentSignIn = true` at open → type-to-confirm (field present,
  no step 1 text); then `recentSignIn = false`, type `delete`, confirm → notice `MESSAGES.reauthNeeded`,
  `reauthenticate` called, no `deleteAll`, no `deleteUser`, `deletedUser` false, `users/uA` kept. This is the AC's
  Given/When/Then.
- **Mutation:** the engine's step 1 check on confirm (`sync-engine.ts` `if (this.auth.needsRecentSignIn())` →
  `if (false)`): the new test fails (with the AC 55 Google popup test); restored byte for byte.
- **V-008:** `npm test` 43 files, **625 passed**; `ng lint` clean. Rules 34/34 with JDK 21, run by the orchestrating
  session after the review fixes (not rerun here; no rules change).
- Session Log count fixed (625). No spec file changed.

## Notes (not failures)
1. ~~The [[Session Log]] builder entry says "620 web"~~ fixed in round 2 (625).
2. The brief's "not blocking" note (light-mode dialog body text is Material's `#3c4947`, not `--color-text`) applies
   to every dialog and predates this build; no item filed (the ui-engineer left it to RJ).
3. `FakeAuth.reauthenticate()` doesn't consult `canReauthenticate()` (it returns `reauthResult`); the real adapter
   does, and the adapter tests cover that. Fine for a fake.
