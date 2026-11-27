---
tags: [services, build]
board: H-679
specs: ["[[Test Data]] 0.2 (TEST-001, TEST-060…068, TEST-070; ACs 19…27)", "[[Accounts and Sync]] 0.20.1 (SYNC-009 guest exception, AC 88)"]
branch: loop/H-679-guest-test-data
as_of: 2026-11-26
---
# Build H-679

**Guest test data (TEST-060…068).** Signed out (gate state `signed-out`, not a lost session or a first sync) and with
`testDataEnabled`, the sign-in panel on Collection, Decks and `/decks/:id` shows **Load test data** under Sign in
(`app-guest-load`, projected into `app-sign-in-panel`). It opens the TEST-003 dialog in guest mode (TEST-060 text, no
offline block). `GuestTestData.load(set)` runs the same `loadTestData` into **fresh memory-only stores**
(`AppStores.createGuestStores()`: a `MemoryBackend`, no sync hooks) and only then switches the app to them
(`enterGuest`). Collection, Decks and Deck detail render on `SignInGate.content()` (`open() || guest()`), so they show
the data while the gate itself stays closed: deck saves, imports and Tournaments' controls keep `open()`.

**Isolation.** `AppStores.account` is the `localStorage` cache and the only store set handed to the sync engine
(`SyncService` uses `app.account`, and the gate reads `account.log`). Features use `AppStores.stores`, a facade whose
members resolve on each access (`DeckLocks` now reads `stores.locks` per call). In guest mode `majorAction()` is a
no-op and the guest stores' `changed` hook only notifies `CardData`; nothing reaches `localStorage`, IndexedDB or the
network, and the sync log the tracked stores stamp lives in the same memory backend. A reload drops it.

**Banner, Change set, Remove (TEST-063, TEST-064).** `app-guest-banner` on all three pages: the RJ-approved text, Change
set (TEST-022 question without its second sentence; replaces the set in the same memory stores, so a duplicated deck
stays) and Remove (TEST-064 (a) text; drops the memory stores; the panel with Load test data returns, "Test data
removed."). Imports: no floating Add / Import deck, no empty-state import button, no file drop, `?add=1` / `?import=1`
ignored, `CollectionImport.commit` refuses in guest mode.

**Sign-in (TEST-064 (c)).** `SyncService.onStatus`: the first status that isn't `signed-out` calls `leaveGuest()` before
the gate updates, so guest data is discarded when the session for a uid becomes expected and never reaches the engine.

**Catalog bug (TEST-070).** `CardData` remembers the source it last served and re-resolves on `AppStores.written`
(tracked saves, guest on/off, and `externalWrite()` after every engine status: first sync, pull, sign-out). On a change
it drops a failed `/api` result and emits `sourceChanged`; Collection, Decks and Deck detail re-read on it (plus
`GuestTestData.changed`). So a page that showed the empty state or "Card data not loaded" before the first sync's pull
wrote the test collection shows the cards without a reload.

Behaviour chosen (not in the spec): no Sign in link in the guest banner (TEST-063 "may"; the header keeps Sign in);
a cancelled Google sign-in popup still keeps guest data, the discard happens on the first non-signed-out status; the
banner sits above the page header on Deck detail (its first element in the ready state).

Contract: [[API Contracts]] v1.39 (AppStores guest mode, `provideTestStores`, `CardData.sourceChanged`).

Tests: `pages/collection/guest-test-data.spec.ts` (H-679: load, storage and sync hooks untouched after load and after a
lock / unlock, Decks and Deck detail, Remove, sign-in discard, refused when not signed out, Change set, `?add=1` /
`?import=1`, deck URL panel; TEST-070 cold start Collection, Decks mid-pull, failed `/api` not kept);
`collection-test-data.spec.ts` TEST-001 updated (the guest button inside the panel; flag off: none);
`e2e/guest-test-data.e2e.ts` (real browser: load signed out, cards and decks, no `rift.*` key or IndexedDB database,
gone after a reload).

Checks (2026-11-26, Node 22.23.5): `npm run lint` pass; `npm run build` pass (initial total 461.58 kB, no budget
warning); `ng test` 1585 of 1586 pass, the one failure being in the then-unwired H-680 spec (not part of this commit);
`npm run e2e` 6 / 6 pass (with the new H-679 test). `test:rules` not run: no rules change.
