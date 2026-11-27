---
tags: [loop, validation]
item: H-679, H-680
date: 2026-11-26
round: 1
result: H-679 FAIL (one isolation leak, H-681); H-680 PASS
---
# Validation H-679 + H-680: guest test data and notices

Branch `loop/H-679-guest-test-data` (dev 2da96dd + specs b20321e, 762e1b2 + builds 5cba5d0, 2c1354d). Node 22.23.5.
Specs: [[Test Data]] 0.2, [[Accounts and Sync]] 0.20.1, [[My Collection]] 0.18, [[Your Decks Ownership View]] 0.19.
Builds: [[Build H-679]], [[Build H-680]].

## Run
| Check | Result |
|---|---|
| `npm run lint` | PASS |
| `npm run build` | PASS, initial total 461.58 kB, no budget warning |
| unit tests | PASS, 100 files / 1589 tests |
| `npm run e2e` | PASS 6/6 (Playwright from the `loop-accounts-sync-2c2b1e` worktree via `NODE_PATH` and its own `cli.js`; `npx playwright` loads two copies and fails; port 4437). Servers stopped by Playwright |
| `test:rules` | SKIPPED (no rules change) |

## 1. Guest isolation: FAIL (one narrow leak)
Held (code audit plus the passing unit and e2e tests):
- Guest stores are `createBrowserStores(new MemoryBackend(), ...)`: no `localStorage`, IndexedDB, cache or Firestore write. The e2e checks no `rift.*` key and no IndexedDB database after load, and that a reload clears it. The unit tests check storage and sync hooks untouched after load and after a lock and unlock.
- The sync engine is built on `AppStores.account` only; the gate reads `account.log`. `majorAction()` is a no-op in guest mode, and the guest stores' `changed` hook only emits `written` (the connected sync hook is never called). Imports are refused in guest mode (`CollectionImport.commit`, no `?add`/`?import`).
- Sign-in: `SyncService.onStatus` calls `leaveGuest()` on the first non-`signed-out` status, before the gate update and any pull or push.
- Reload: in-memory only.

Leak: `deck-detail.ts` `delete()` keeps `const stores = this.stores`, the per-access facade, and runs `stores.decks.create(removed)` from the Undo action (10 s). Guest deletes a guest deck, signs in inside the window (`leaveGuest()` makes the facade point to `account`), presses Undo: the guest deck is created in the account cache, stamped for sync and pushed. Found by reading the code, not run. Filed H-681 (P1).

## 2. TEST-070 catalog fix: PASS
`CardData` re-resolves on `AppStores.written` (user saves, guest on/off, `externalWrite()` after every engine status), drops a failed `/api` result when the source changes and emits `sourceChanged`; Collection, Decks and Deck detail re-read on it. Unit tests: cold start Collection, Decks mid-pull, failed `/api` not kept; all pass. Not exercised against a real first sync in a browser (needs Firebase).

## 3. H-680: PASS
`NoticeSnackBar`: OK on plain notices (an "OK" action is the same button), only the action otherwise; buttons `min-height/min-width: 44px` in CSS; touch and pen only; slop 8 px, 30 % or flick threshold, snap back; swipe calls `dismiss()`, never the action (tests: Undo not run, deck stays deleted). All call sites use `injectNotices()` (no other `inject(MatSnackBar)` in non-spec code). Initial bundle unchanged at 461.58 kB. The 44 px size is a CSS rule checked by code and class, not measured in a browser (jsdom has no layout); a pointer swipe was not run in a real touch browser.

## 4. Spec versus build
- Banner text exact: "You're trying Rift Builder with test data. Nothing is saved: it's gone when you reload." (`shared/collection/test-data.ts` `guestBanner`, straight apostrophe, as spec and AC 19).
- Change set and Remove test data are built (TEST-064). The builder's differences are acceptable: no Sign in link in the banner (TEST-063 says "may"; the header keeps Sign in); shorter Change set question; banner above the page header on Deck detail; a cancelled sign-in popup keeps guest data.
