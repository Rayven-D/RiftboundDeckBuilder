---
tags: [loop, validation]
item: H-141, H-142, H-110
date: 2026-11-24
round: 1
result: PASS
---
# Validation H-141 / H-142 / H-110: account menu identity line, deletion state, groups

Items: [[Handoff Board]] H-141 (identity line, carries H-109), H-142 (menu during an unfinished deletion, carries H-111),
H-110 (UI review #8, menu grouping).
Spec: [[Accounts and Sync]] v0.10 SYNC-003, SYNC-084, SYNC-096, SYNC-100; ACs 43, 53, 54.
Design: [[Brief H-141 H-142 H-110]] with the ui-engineer's "Check after build".
Scope: uncommitted tree on `loop/H-141-account-menu` (base a524e1f): `account-menu.ts` (+ spec), `status-text.ts` (+ spec),
`sync-engine.ts`, `sync-types.ts` (`AuthService.currentEmail()`), `testing/fakes.ts`, `sync.service.ts`,
`adapters/firebase-adapters.ts`, `styles.scss` (menu divider colour); [[UI Index]], [[API Contracts]], [[Session Log]] entries.

**Real signed-in check:** done by the ui-engineer on the Firebase Auth + Firestore emulators (demo project), signed in
as `rj@example.com` and a 67-character address, 1440 and 375, dark and light; screenshots `h141-screens/01…08` in the
side-session notes (outside the repo). The validator read the results and did not re-drive the browser.

## Result
2026-11-24 · H-141 · PASS · Accept (AC 53 ×3 named tests; SYNC-100 store/cloud/console search), V-008, V-011, V-012, mutation · failures: none
2026-11-24 · H-110 · PASS · Accept (5 `H-110` grouping tests; emulator screenshots normal + deletion, 3 dividers, none doubled), V-008, mutation · failures: none
2026-11-24 · H-142 · PASS · Accept (AC 54 + updated AC 43 named tests; 2 new engine tests: deletion outranks Offline and Paused), V-008, mutation · failures: none (round 2, after the `SyncEngine.status()` fix)

No new board items.

## Checks run
### V-008 (web), run by the validator from `web/`
| Command | Result |
|---|---|
| `npm run lint` | All files pass linting (exit 0) |
| `npm run build` | bundle generated (exit 0) |
| `npm test -- --watch=false` | 42 files, **603 passed** (exit 0); round 2 after the engine fix: **605 passed**, lint clean again |
| `npm run test:rules` (JDK 21 bin prepended to PATH) | 4 files, **34 passed** (exit 0); not rerun in round 2 (the fix doesn't touch rules) |

### H-141 Accept: AC 53
- `AC 53 SYNC-003 the first line reads "Signed in as {email}" above the status, as text; SYNC-100 the address is written nowhere`:
  real `SyncService` + engine on fakes; first child of the panel is a `<p>` "Signed in as rj@example.com" (no role, no
  tabindex, not a menu item), next is the `role="status"` line; `aria-describedby` = identity + status ids. After a sign-in,
  first sync and Sync now: the address is in no localStorage key (the sync log exists and is checked), no Firestore
  doc, no push or write log, no console output.
- `AC 53 SYNC-003 the address is read from Auth each time, not kept`: changing the fake's address changes the result; null gives null.
- `AC 53 when Auth reports no address …`: no "Signed in as"; the menu starts with the status.
- Source: `currentEmail()` appears only in the adapter (reads `auth.currentUser.email`), engine, service and menu
  template; no assignment to a field, store or log (`grep -rn currentEmail web/src`). The app's local stores are
  localStorage only; the IndexedDB use is Firebase Auth's own persistence (excepted by AC 53).

### H-142 Accept: AC 54 and the updated AC 43
- `AC 54 3 pending and an unfinished deletion: …`: stored log with `deletingUid: 'uA'`, `deletingRemovedAny: false`
  (the reload state), 3 pending card edits, nothing pushed past the debounce; status exactly "Some data couldn't be
  deleted. Try again." with no "not synced yet", error icon `aria-hidden`; items exactly `Try deleting again`,
  `Cancel deletion`, `Sign out`, `Delete account and data`; no Sync now. Try deleting again fails again → the notice's
  action reads "Try again". Cancel deletion → "Your account wasn't deleted.", Sync now back, the 3 changes pushed.
- `statusText` unit test `SYNC-084 / AC 54 …`: no count for the deletion error, other errors keep it.
- AC 43 tests renamed to "Try deleting again" and still pass (Cancel offered / not offered by `removedAny`, retry
  without the dialog, offline disables it).

### H-110 Accept: groups
- Tests `H-110 normal`, `H-110 / AC 54 deletion`, `H-110 deletion with nothing to cancel`, `H-110 / SYNC-081 offline`,
  `H-110 offline during a deletion`: 3 dividers in every state, none first, last or doubled; "You're offline." under
  the status above divider 1. H-102 test still finds a divider directly before the danger item.
- Emulator check (brief): 3 dividers in every state, `--color-border` (`styles.scss` `mat.menu-overrides`), 8px each side.

### Test quality (mutation check)
Scratch copy of `web/` (node_modules by junction, font `@use` dropped in the copy only; worktree untouched).
Specs `account-menu.spec.ts` + `status-text.spec.ts` (40 tests; unmutated 40/40).

| Mutation | Caught |
|---|---|
| pending count kept during the deletion error | 2 |
| Sync now rendered during the deletion | 5 |
| label back to "Try again" | 8 |
| identity line moved below the status | 4 |
| identity line shown when the address is null | 3 |
| engine caches the first address | 1 |
| engine logs the address to the console | 1 |
| engine writes the address to localStorage | 1 |
| divider before Sign out removed | 5 |
| `aria-describedby` without the identity id | 1 |
| offline line moved after Delete | 4 |
| no `error` class on the status | 1 |

12 of 12 caught.

### Other checks
- **V-011:** no `firebase` import in the changed `shared/sync` files, `account-menu.ts` or `sync.service.ts`.
- **V-012:** `git grep RGAPI-` in `web/`, `services/`: no matches.
- **V-009:** [[Brief H-141 H-142 H-110]] links resolve ([[Brief H-102]], [[Brief H-139]], [[UI Review 2026-11-24]],
  [[Accounts and Sync]], [[Design Direction]], [[UI Index]]).
- Test names carry the AC / requirement IDs (AC 53, AC 54, AC 43, SYNC-084, SYNC-096, SYNC-081, H-110).

## Round 2 (H-142): unfinished deletion outranks Offline and Paused
Round 1 found that, offline during an unfinished deletion, `SyncEngine.status()` returned Offline with the pending count
instead of SYNC-096's Error text. SYNC-084 and SYNC-096 have no offline carve-out, so this was a code gap, not a spec
question (no spec row filed). The ui-engineer's synthetic `offline` event didn't flip `navigator.onLine`, so the emulator
pass couldn't reach this case.
- **Fix:** `status()` returns `{ kind: 'error', message: deleteIncomplete, pendingCount }` when `deletionPending` and the
  problem is `deleteIncomplete`, before the Offline and Paused checks. `statusText` drops the count for it. Pull, push and
  listen are blocked while `deletionPending`, so the problem can't be overwritten. Start-up with a stored `deletingUid` sets
  it whether online or not.
- **New tests** (`sync-engine-cancel-deletion.spec.ts`): `SYNC-084 / SYNC-096 / AC 54 offline with 3 pending changes …`
  (both `engine.status()` and the published status: the exact text, no count) and `… paused (quota) … outranks Paused`
  (after Cancel deletion the status is no longer Error). Mutation `if (false)` on the new branch: both fail.
- **AC 53 test extended:** `AC 53 SYNC-003 the menu shows the address Auth reports when it is opened …` reopens the menu
  after the address changes and after it becomes null. A mutation that caches the address in the engine fails it.
- No test covers a reload while offline during the deletion. The code path above covers it, and AC 54 asks only for the
  online reload.

## Notes (not failures)
1. The brief's one fix (text lines inherit Material's weight 500; decision 1 says 400) is in the diff
   (`.menu-text { font-weight: 400 }`). Screenshot 01 was taken before it. **Rechecked by the orchestrating session** in a real
   signed-in session on the emulators: identity and status lines compute 400, Sync now / Sign out / Delete 500.
2. Null address (no identity line) was not reached in the browser; it is covered by the AC 53 test.
3. Item labels use Material's on-surface colour, not `--color-text`: older than this build, out of scope (brief note 3).
