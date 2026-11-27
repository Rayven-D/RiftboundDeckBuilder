---
tags: [services, build]
board: H-665, H-667, H-668, H-669, H-670, H-671
specs: ["[[Shared Cards and Lock-in]] 0.6.1", "[[Accounts and Sync]] 0.18.1", "[[Your Decks Ownership View]] 0.16.1", "[[Collection Import]] 0.16", "[[My Collection]] 0.16", "[[Test Data]] 0.1.5"]
branch: loop/H-665-H-667-name-locks-sync
as_of: 2026-11-26
---
# Build H-665 H-667 (plus H-668 to H-671)

Builder note for the validator and RJ. Contracts: [[API Contracts]] v1.37 (H-665, H-667) and v1.38 (H-668 to H-671).
Sizes: [[Firestore Data Shape]] "`state/locks`". Branch `loop/H-665-H-667-name-locks-sync` (PR #115's branch with
`origin/dev` 43a240d merged in), not pushed. One commit group per item.

## H-665: card-name locks (SPEC-008 0.6.1)
**Engine** (`web/src/app/core/decks/`): `NameLock { deckId, cardKey, lockedAt }`. `computeSharedPool` keeps the valid
name locks (deck in the store, name counted in it, one per (deck, name), SHARE-022 / SHARE-062) and settles them first
(SHARE-090): per name, in lock order, a lock whose need no longer fits is dropped whole, with every later lock on that
name. A kept lock holds its deck's whole need (SHARE-031), so **a locked name is never short**. The deck lock is
derived: locked = every counted name locked (SHARE-083). New `canLockName`, `lockLosses`, `settleLocks`,
`migrateLocksV1`, `ownedForDecksOf`, `storedLockState(locks, deck)`, `storedLockedNames`, `nameLockCheckMessage`.
Removed: `DeckLockState.short` / `cardsShort`, `lockedShortfalls`, `shortfallWarning`, `shortfallNotice`,
`LockedShortfall`, `app-shortfall-warning`, "Locked · n cards short" everywhere.

**Stores:** `StoredDeckLocks` schema 2. `LocalDeckLockStore` reads 1 and 2, drops orphan name locks on save, and
migrates a v1 record on load. Sync log entries and cloud map keys are `<deckId>|<cardKey>`.

**UI:** the per-name control `app-name-lock-action` lives in the card dialog and the desktop panel's Card tab only
(SHARE-094 (a)). A locked name's tile and row show a small lock icon, read "q of q locked in", and add "Locked in this
deck" to the accessible name (SHARE-094 (b), OWN-121). The deck toggle locks every open name with one `lockedAt` (one
`update()`), and unlocking clears only that deck's names (SHARE-084). Only a fully locked deck shows the "Locked" badge
and matches `lock=locked`; a partly locked deck counts as not locked (SHARE-051). The Collection "Locked in" rows have
no "· short". **Delete (gap 8 fix, coordinator 2026-11-26):** the deck's name locks stay stored, ignored while the deck
is gone (SHARE-062), and are neither dropped nor stamped while its 10 s Undo window is open (the lock store and the merge's
SYNC-071 step hold them). Undo restores the deck with its locks, identical timestamps, and nothing is pushed. Without
Undo, the window-end major sync's merge drops them and the one push carries the deck tombstone and the lock removals.
**Conflicts with SPEC-008 SHARE-024 / AC 5 ("Undo restores the deck unlocked") and design decision 6** (restoring an old
`lockedAt` can outrank a lock made during the window; the pool settles it, earliest wins). Built as the coordinator
asked; spec-writer / RJ to align SHARE-024.

**Removal paths (SHARE-089):** the Replace import and the import Undo compute `lockLosses` before writing. Free
copies go first. When a lock is hit, `app-lock-removal-notice` goes inside the Replace confirmation or the COLL-058
Undo confirmation. An Undo with no confirmation of its own asks with "Unlock cards in your decks?" / "Unlock and
continue". Confirm writes the collection, then drops exactly those locks. Cancel changes nothing. The Replace leaves the test
decks out (TEST-033). The deferred Collection edits (−, typed lower quantity, Remove card, exclude flag / tag) are not
built, so they have no path yet.

**Sync drop (SYNC-068, SYNC-074, SHARE-091):** the merge drops the locks a pull left short. It uses `settleLocks` over
the merged collection and tags, with `ownedForDecksOf` and no catalog. It stamps the drops as pending unlock tombstones
(pushed) and adds **one** info notice (`lockDropNotice`). This is H-148's single-notice mechanism with new content;
`EngineDeps.shortfalls` / `lockedShortfallNotice` are gone. Only drops the pull caused: a lock that fitted before the
merge, or one that arrived with it. A lock this device's own change left short is not reported as "another device".
SYNC-072 / SHARE-093: a locked name whose need changed elsewhere, or that left the deck, is unlocked; the "changed on
another device while it was locked." notice stays.

**Rules:** `firestore.rules` `locks` map cap 400 → 6000, plus an emulator test with 6000 / 6001 entries and a
FieldPath update of `<deckId>|<cardKey>` keys with the `deleteField()` of an old key.

**Test Data (TEST-021):** the generator writes one name lock per counted name of the two locked test decks
(`lockEveryName`), schema 2. Large state/locks = 62 entries, 7,658 B measured.

### Migration
- **Local (SHARE-092):** a v1 record (`{ schemaVersion: 1, locks: [{ deckId, lockedAt }] }`) is converted once, on
  load, by `migrateLocksV1(v1.locks, decks, { collection, tags }, now)`. It replays the v0.5 holds in v1 lock order
  (min(need, copies left)). Every counted name the old rule held in full gets a `NameLock` with the deck's `lockedAt`.
  A name held short gets none, so the deck becomes partly locked, with no notice (Open question 12). Orphans are
  dropped. If the collection or tags can't be read, every name of a locked deck keeps a lock, and the pool's settle
  ignores any that don't fit. The v2 record is written back raw. The next reconcile stamps the new entries as user
  changes and turns the old per-deck log entries into tombstones.
- **Cloud (SYNC-017):** a pulled live entry of the old shape (key without `|`) is converted the same way, against the
  merged decks, collection and tags. Its name locks are stamped now and pending. Every old key becomes a pending
  tombstone, and `planPush` purges it with `deleteField` in the same `update()` that writes the new entries. A name
  already in the log is left alone, so two devices converting give the same keys and `lockedAt`.
- A build older than v0.18 is not supported after the conversion (SPEC-010's stated assumption; not in production).

## H-667: immediate sync on a major action (SYNC-126)
`SyncEngine.majorAction()`: when signed in, online and with the gate open, it runs one pass at once: pull (always,
no 60 s skip), then push (no 2 s debounce). It cancels the pending debounce timer. If a pass is already running, it
sets one follow-up flag, and exactly one more pass runs when the last one ends (N actions cost at most two passes).
Offline, signed out or with the gate closed it does nothing, and the change stays pending. Features call
`AppStores.majorAction()` after the local save:
`DeckImport.commit`, `CollectionImport.commit` (Add and Replace) and its Undo, Deck detail Duplicate, and every
`DeckLocks` change (deck toggle, one name, auto deck lock, confirmed removal drops). **Deck delete:** `scheduleChange`
arms no debounce when the only pending items are deletions inside their 10 s window. A separate Undo-window timer
calls `majorAction()` when a deletion's window has ended and it is still pending. An Undo inside the window cancels
it, so nothing is pulled or pushed. Rename and notes keep the 2 s debounce. **Not built:** "Add to your decks" / "Add another
copy" (DECK-060 / DECK-064), so there is no call site for them yet.

## H-668: More actions on the title row, two-line name
- The ⋮ is on the title row at every width (name, lock toggle, ⋮ pinned right). The row never wraps. The toggle and
  ⋮ are 44 px and keep their place; the name takes the remaining width. The phone actions row is gone (nothing was
  left in it: Copy missing list was already under the Missing list on phones). ⋮ is now 44 px on desktop too
  (it was 40).
- Name: `-webkit-line-clamp: 2` / `line-clamp: 2`, `overflow-wrap: anywhere`. The full name is in the h1 text and
  `title`. When the clamp actually cuts it (ResizeObserver measure), an inner span becomes `role="button"`
  `tabindex="0"` `aria-expanded`. Tap, Enter or Space expands it; blur or Escape collapses it. A name that fits is
  not interactive. The same clamp applies on desktop (the row can grow there too).
- Checked in Chromium at 320, 375 and 1280 with a short name, a two-line name, a very long name and a 60-character
  word. At 320 and 375, every long case is clamped to 2.00 lines and expands to 3 to 9 lines without moving the lock
  or ⋮ (44 × 44, inside the viewport). At 1280 the long names fit in 2 lines, so they are not interactive.

## H-669: Copy missing list in the Missing area
- Desktop: the split button (with "Copy as one list") is on the Missing panel's heading row, right-aligned
  (`app-deck-missing copyPlacement="heading"`, the same component as on phones). Below 64rem it sits under the list,
  as on phones; tablet used to have it in the header. The header has no actions row any more. Hidden when nothing is
  missing or ownership is unavailable, as before.
- **Seen at 1280:** the panel is about 290 px wide, so "Missing · 11 copies" and the split button don't fit on one
  line. The flex row wraps, and the button drops under the heading, right-aligned. RJ may want a smaller button there.
- The H-668 clamp still works on desktop with the freed space (measured above).

## H-670: "Can't lock" notices; reason line removed
- Deck toggle on a deck missing cards: info notice **"Can't lock. Missing {x} cards."** / **"Can't lock. Missing 1
  card."**. The toggle is operable (no `aria-disabled`) and `aria-pressed` stays false; nothing is locked.
- "Lock these copies" on a name that is not fully available: **"Can't lock. Missing {x} copies."** / **"… Missing 1
  copy."**. The dialog keeps its visible reason "Lock needs every copy available: a of q".
- **x for the deck = the deck's missing copies** (the total of its missing list, e.g. 11). The item text also said
  "the same number as today's n cards short", but that counts card *names* short (e.g. 6), not copies. I used
  copies, to match "Missing x cards" and "the deck's total missing copies". RJ to confirm.
- RJ "Remove it to save space": the "Lock in needs every card available: n cards short" line under the title is gone
  at all widths. The same text stays the toggle's `aria-describedby` as visually hidden text. Other reasons
  (read-only, locks unreadable, ownership unavailable, no cards, saving) keep `aria-disabled`.

## H-671: notices at the top
- `NOTICE_POSITION = { verticalPosition: 'top', horizontalPosition: 'center' }` in `shared/sync/notice.ts`, carried by
  `noticeOptions()`. `MAT_SNACK_BAR_DEFAULT_OPTIONS` in app.config was tried and dropped: it pulled the snack-bar
  module into the initial bundle (462 → 528 kB, over the 500 kB warning).
- `styles.scss`: top margin = `--header-height` + `env(safe-area-inset-top)` + space-2, and the pane is click-through.
  The H-101 bottom lift over the phone tab bar and the floating-button clearance were removed.
- **Call sites checked (every one takes the top position):** `CollectionImport` (commit notice with Undo, own options
  + `NOTICE_POSITION`; Undo notices via `noticeOptions`); `DeckImport` ("Deck saved." / View deck); `SyncService.notify`
  (every sync, account, sign-in and username notice); `AccountMenu` (only `dismiss()`); Collection page (card left,
  export: own options + `NOTICE_POSITION`; test data loaded / removed / failed via `noticeOptions`); Deck detail (card
  left, copy, copy failed, duplicate / Open, renamed, save errors, Deck deleted / Undo with own options +
  `NOTICE_POSITION`); `LockActions` (locked in, unlocked, Can't lock, save failed); `NameLockAction` (Can't lock,
  locked in, no longer fully locked, save failed). Tournaments, the import dialogs and the test-data dialogs open no
  snack bar of their own. A unit test scans every `snackBar.open(` in `web/src/app` for it.
- Checked in Chromium: the notice sits 7 px under the header at 375, 768 and 1280, centred. Raised from the card
  dialog at 375, it shows above the full-screen dialog and is readable (the NoticeLayer keeps notices above dialogs).

## Wording built from proposals (not RJ's words; SPEC-008 Open questions 8, 9, 10, 14)
- Control: "Lock these copies" / "Unlock these copies"; reason "Lock needs every copy available: a of q".
- Tile / row icon accessible name: "Locked in this deck". Count label of a locked name: "q of q locked in" (OQ 10).
- Snack bars: auto deck lock "<deck> is locked in."; one name unlocked in a locked deck "<deck> is no longer fully
  locked."; no snack bar for locking or unlocking a single name otherwise; no confirmation for one name.
- Removal: title "Unlock cards in your decks?", intro "Some of the cards you are removing are locked in your decks. Going
  on unlocks them:", line "'<deck>': 3 Hextech Ray, 2 Gust" (one line per deck, names joined with ", "), "'<deck>' will
  no longer be locked.", button "Unlock and continue" (lock-only Undo; the import's own button keeps its label).
- Sync notice: "Locks removed after a change on another device." then "'<deck>' is no longer locked: <names> unlocked."
  or "'<deck>': <names> unlocked.", one text, sentences joined by a space.

## Readings and gaps (spec)
1. SHARE-088's line pattern "'<deck>': <n> <card> (<n2> <card2>, …)": the parentheses read as notation, so I built
   "'Kennen Tempo': 3 Hextech Ray, 2 Gust". AC 31 only has the one-name case.
2. Board row acceptance "`rg \"cards short|shortfall\" web/src` finds only history comments": the SHARE-020 reason
   "Lock in needs every card available: n cards short" is still a spec string. It is still in the code, as the
   toggle's hidden `aria-describedby` since H-670, and `cardsShortText` builds it.
3. `computeSharedPool` settles the stored locks itself (AC 14 asks it to show the later lock as hold 0). So a lock
   that no longer fits is shown as not locked even before a removal path or a sync drops it from storage.
4. SYNC-072 notice: shown when the deck had any name lock before the merge (fully or partly locked).
5. SYNC-126 (a) 4 in practice adds the window-end pull to Remove test data (SPEC-013 AC 10 said 0 reads; now 7, all
   from that one pull). The test was updated.
6. Ownership unavailable: the per-name control is not shown (the card content has no breakdown then). A partly locked
   deck's names can't be unlocked one by one until ownership is back, but the deck toggle still unlocks a fully
   locked deck. Tiles still show the lock icon from the stored locks.
7. The 6,000-entry `state/locks` is 715,290 B, a little above SYNC-123's 700 KB level, which is worded for the
   collection document. No warning is logged for locks.

## Requirement → test map (web unless noted)
| Requirement / AC | Test (file) |
|---|---|
| SPEC-008 AC 14 (SHARE-030/035/070) | "AC 14 … settleLocks and computeSharedPool keep a1, drop b2" (`core/decks/shared-pool.spec.ts`) |
| AC 25, 26, 27, 28, 29, 30, 31 / 21, SHARE-090, SHARE-062, AC 34 (engine) | "ACs 25 to 35 (v0.6, H-665)" block (`shared-pool.spec.ts`) |
| AC 9 superseded / AC 33 | "AC 9 superseded / AC 33 …" (`shared-pool.spec.ts`); "SYNC-073 / SPEC-008 AC 33 …" (`shared/sync/merge.spec.ts`) |
| AC 13, 15, 18, 19, 20 rewritten | `shared-pool.spec.ts`, `runes-are-cards.spec.ts` ("SPEC-008 AC 18 … migrates"), `deck-ownership-view.spec.ts`, `shared/deck/deck-list.spec.ts` |
| AC 25, 26, 27, 28, 29, 35, SPEC-005 AC 41 / OWN-121 (UI) | "H-665 card-name locks on Deck detail" block (`pages/deck-detail/deck-detail.spec.ts`) |
| AC 31 / 21, AC 30, SPEC-003 AC 45, IMP-050a, SPEC-007 AC 39 | "IMP-050a (a) / SPEC-008 AC 31 …", "SPEC-008 AC 30 …", "AC 45 / IMP-050a (b) …" (`core/import/collection-import.spec.ts`) |
| SPEC-007 AC 25 (COLL-088) | "SPEC-007 AC 25 … an excluding tag would unlock" (`runes-are-cards.spec.ts`); "COLL-089 …" (`collection-view.spec.ts`) |
| AC 34 migration (store) | "SHARE-092 / SPEC-008 AC 34 a v1 record is migrated once …" (`core/storage/local-stores.spec.ts`) |
| SHARE-088 lines and proposal texts | "SHARE-088 / SPEC-008 AC 31 removal lines", "SHARE-094 / SHARE-029 v0.6 / SHARE-088 proposal wording" (`shared/deck/deck-locks.spec.ts`) |
| SPEC-010 AC 12, 13, SYNC-068/071/072/073/074, SYNC-017 migration | `merge.spec.ts` "decks and locks (SYNC-017 v0.18 …)"; `sync-engine-shortfalls.spec.ts`; `sync-engine.spec.ts` "SYNC-071/072/073" |
| SYNC-017 keys, legacy purge, SYNC-112 cap | `stamp.spec.ts`, `push-plan.spec.ts`; rules: "SYNC-112 v0.18 (H-665) locks map cap", "SYNC-017 v0.18 (H-665) a FieldPath update …" (`web/rules-tests/firestore.rules.test.ts`) |
| state/locks size | `shared/sync/locks-size.spec.ts`; Large test data in `core/test-data/test-data-ops.spec.ts` |
| SPEC-010 AC 37 (SYNC-077) | "SYNC-077 nothing status-like is stored …" (`sync-engine.spec.ts`) |
| TEST-021 | "TEST-020 / TEST-021 the Load plan …" (`shared/collection/test-data.spec.ts`), "TEST-025 …" (`sample-data.spec.ts`) |
| SYNC-126 ACs 83 to 87 | `shared/sync/sync-engine-major.spec.ts` (tests named SYNC-126 / SYNC-043 / SYNC-121); commit and Undo call it: "SYNC-126 (a) 2 and 3 …" (`collection-import.spec.ts`); lock changes: "SPEC-008 AC 25 …" (`deck-detail.spec.ts`) |
| H-668 | "H-475 / H-662 / H-668 / H-669 …", "H-668 phone: …", "H-668 long names: …" (4 names, clamp CSS, expand / blur / Escape, not interactive) (`deck-detail.spec.ts`) |
| H-669 | "H-669 desktop: Copy missing list is on the Missing heading row …", "OWN-052 / OWN-053 / AC 7 / H-669 …" (`deck-detail.spec.ts`) |
| H-670 | "H-670 / SHARE-020 / OWN-116 …", "H-670 singular …", "SPEC-008 AC 26 / SHARE-081 / H-670 …", "H-670 plural …" (`deck-detail.spec.ts`); styleguide toggles (`styleguide-page.spec.ts`) |
| H-671 | `web/src/tooling/notice-position.spec.ts` (replaces `snackbar-offset.spec.ts`); `sync-engine-notice-kinds.spec.ts` |

## Results (2026-11-26, Node 22.23.5)
`npm run lint`: all files pass. `npm run build`: OK, initial total 461.6 kB. Unit tests: 1528 passed (96 files, after the gap 8 fix).
`npm run test:rules` (JDK 21): 90 passed (7 files; run after the H-665 rules change, before H-668 to H-671, which
touch no rules). `npm run e2e`: 5 / 5 passed. Every dev server and emulator was stopped.
