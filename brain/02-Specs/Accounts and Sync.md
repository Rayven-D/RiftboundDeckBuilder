---
tags: [spec, accounts, sync, firestore]
id: SPEC-010
version: 0.4
status: draft
depends_on: [SPEC-003, SPEC-005, SPEC-006, SPEC-007, SPEC-008, SPEC-009]
research: ["[[Firestore Data Shape]]", "[[Card Data & Images]]"]
decisions: ["[[ADR-0007 Firebase Accounts and Firestore]]", "[[ADR-0001 Tech Stack]]", "[[ADR-0005 MVP Product Defaults]]", "[[ADR-0006 Two Imports - Collection and Decks]]"]
board: H-061
as_of: 2026-11-23
---
# SPEC-010: Accounts and Sync

## Summary
> Read this first. Full detail below only if needed.

**Purpose:** optional sign-in so a user's collection, tags, decks and deck locks follow them across
devices ([[ADR-0007 Firebase Accounts and Firestore]]). Signed out, the app works exactly as today from
browser storage. Signed in, the browser stores stay the working copy and are synced to Cloud Firestore.

**Key rules**
- SYNC-001…007: sign-in is optional; signed out, nothing loads or calls Firebase; the `firebase` package is
  lazy-loaded on "Sign in" or at start-up only when a session is **expected** (signed in last time, not signed
  out). Sign-in stays hidden behind a build flag until the privacy notice is approved (SYNC-007).
- SYNC-010…019: the layout is the [[Firestore Data Shape]] one: `users/{uid}`, `users/{uid}/state/collection`,
  `…/state/tags`, `…/state/locks`, `users/{uid}/decks/{deckId}`. Every document has `schemaVersion`,
  `updatedAt` (client clock) and `syncedAt` (server time, the delta cursor). Printing codes, view state and the
  import Undo snapshot are **not** synced (SYNC-019).
- SYNC-030…035: a device-local **sync log** stamps a change time on every card, tag, tag target, lock and
  deleted deck on every save, signed in or not, and keeps **tombstones** for 30 days. Deck `updatedAt` and
  `deletedAt` are made monotonic too (SYNC-031). The existing store record shapes (SPEC-003/006/007/008) do not
  change, except tag ids become 8 characters (SYNC-016).
- SYNC-040…053: open = account check + pull changes since the cursor (3 reads at start-up, 2 later), merge,
  push what is newer locally. Writes made by the merge keep the pulled times and are never pending
  (SYNC-041). First sign-in with data on both sides asks to **Combine** (or cancel); the account is linked
  only once the first sync completes (SYNC-048). No write before a successful account check (SYNC-053).
- SYNC-060…068: **latest change wins** per card (`cardKey` record: quantity and printings together), per tag,
  per tag target's assignment list (union on first sign-in), per deck and per lock. Ties go to the cloud copy.
  New stamps are monotonic per item (`max(now, known + 1)`) so clock skew cannot undo an edit made on top of a
  newer one.
- SYNC-070…076: locks sync per deck. A lock never brings back a deleted deck; a deck edited elsewhere while
  locked stays locked and is recomputed; a merge that leaves a locked deck short **keeps it locked and
  flagged** (SPEC-008 SHARE-033) with a notice (default, see Open questions).
- SYNC-080…086: offline is normal; changes queue on the device and push later; status line shows Synced /
  Syncing / Offline / Sync paused / Sync error.
- SYNC-090…098: sign-out offers keep or remove this device's copy; "Delete account and data" deletes the
  account document first (the "deleted" marker other devices check), then every other cloud document, then the
  sign-in account.
- SYNC-110…119: owner-only security rules with per-document field validation; the only rule lookup is
  `existsAfter()` on document creates (so a deleted account is not recreated; counted as ≤ 1 read per create,
  billing details `unverified`); index exemptions on every field
  but `syncedAt`; a rejected write stays pending and is reported (SYNC-118).
- SYNC-120…125: cost limits from [[Firestore Data Shape]] (debounce ≥ 2 s, no listener on all decks).
- SYNC-100…102 privacy; SYNC-130…131 adapters and pure merge functions.

**Shared types:** `AuthService`, `RemoteStore`, `StoredSyncLog`, `SyncStatus`, Firestore document shapes
`AccountDoc`, `CollectionDoc`, `TagsDoc`, `LocksDoc`, `DeckDoc`.
**Depends on:** [[Collection Import]] v0.6, [[Your Decks Ownership View]] v0.4, [[Deck Import]] v0.6,
[[My Collection]] v0.5, [[Shared Cards and Lock-in]] v0.2, [[Runes Assumed Owned]] v0.2. **Consumers:** H-062
(build), [[ADR-0007 Firebase Accounts and Firestore]].
**Open:** 11 product calls for RJ (Open questions); privacy-notice legal content `BLOCKED: needs research`
(sign-in hidden in production until then, SYNC-007).

## Purpose
RJ wants users to be able to sign in so the collection and decks persist across devices (ADR-0007, RJ
2026-11-23). This spec defines who can sign in and how, exactly what is stored where, how two devices'
changes are combined, and how an account and its data are deleted. It is the contract for H-062 (client
sync, `firestore.rules`, `firestore.indexes.json`).

It does not change any feature's behaviour. Collection, Decks, tags and locks behave as their specs say;
this spec only decides where their records also live and which version wins.

## Definitions
- **Signed out / signed in**: whether a Firebase Auth user is present in this browser.
- **Local stores**: the browser stores of SPEC-003 `CollectionStore`, SPEC-007 `TagStore`, SPEC-006
  `DeckStore`, SPEC-008 `DeckLockStore`. They are always the working copy.
- **Cloud**: the user's Firestore documents (SYNC-010).
- **Item**: the unit that "latest change wins" compares (SYNC-060): a collection card (`cardKey`), a tag (`TagId`),
  a tag target's assignment list (`TagTarget`), a deck (`deckId`), a lock (`deckId`).
- **Change time `t`**: an item's last change, milliseconds since the Unix epoch, from the client clock, stamped
  per SYNC-031.
- **Tombstone**: a record that an item was deleted, with its change time, kept for 30 days (SYNC-034).
- **Sync log**: the device-local record of change times, tombstones, pending items and cursors (SYNC-030).
- **Pending item**: an item changed locally and not yet confirmed written to the cloud.
- **Cursor**: the largest `syncedAt` this device has received for the `state` documents, and for `decks`.
- **Linked uid**: the uid this browser's local data last completed a first sync with (`StoredSyncLog.uid`,
  SYNC-048). It survives "Keep a copy" sign-out so a later sign-in with the same account resumes.
- **Session expected**: `StoredSyncLog.sessionExpected`, true from a successful sign-in until any sign-out,
  account deletion or Cancel of the Combine dialog. Only it decides whether `firebase` loads at start-up.
- **Account check**: a `get` of `users/{uid}` (1 read) that succeeds and finds the document (SYNC-053).
- **Now**: the client clock.

## Design decisions (summary)
1. **Local-first.** The browser stores stay the source of truth for what the screen shows; sync runs beside
   them. Every feature works offline and signed out (ADR-0007 "Accounts stay optional").
2. **Layout as in [[Firestore Data Shape]]**, including the `state/` subcollection instead of ADR-0007's first
   `collection/…`, `tags/…` sketch. Where ADR-0007's text says `users/{uid}/collection`, `decks`, `tags`, this
   spec's layout is the authoritative one.
3. **Sync bookkeeping in its own store, not in the records** (spec-level choice). [[Firestore Data Shape]]
   proposed adding per-card `t` and tombstones to `StoredCollection`. Existing consumers load a record, change
   it and save it whole, so tombstones inside the record would leak into every consumer. A separate sync log,
   written in the same save, keeps SPEC-003/006/007/008 record shapes as they are.
4. **Two small shape additions in the cloud** beyond the Data Shape note, both needed to tell "removed" from
   "never had": tag assignments carry a per-target change time (`{ a, t }`), and locks carry an unlock
   tombstone (`{ lockedAt | null, updatedAt }`). Sizes stay within the note's estimates (+≈ 10 B per tag target,
   +≈ 12 B per lock).
5. **Latest change wins** per item, with monotonic stamps (SYNC-062) and ties to the cloud copy (SYNC-061).
6. **Locks follow SPEC-008's accepted rules** across devices: earliest lock wins, short locks stay locked,
   deletion removes the lock (SHARE-024, SHARE-030…033).
7. **Map caps in the rules are raised above [[Firestore Data Shape]]'s 200 for tags** (spec-level choice). The
   rules cap each map at about twice the largest live count the specs allow, because tombstones sit in the same
   map for 30 days: `cards` 6,000 (Data Shape worst case 3,000 cards), `tags` 400 (COLL-022: 200), `assignments`
   6,000 (Data Shape worst case 3,000 targets), `locks` 400 (DECK-092: 200 decks). When tombstones would push a map
   over its cap, the oldest tombstones are dropped early (SYNC-119).
8. **The account document is the "account exists" marker.** It is created only by the first-sign-in flow and
   deleted first when the account is deleted, so every other device can tell a deleted account from a missing
   session (SYNC-053, SYNC-097).

## Requirements
### A. Optional accounts and sign-in
| ID | Level | Requirement | Source |
|---|---|---|---|
| SYNC-001 | MUST | **Accounts are optional.** Signed out, every feature of SPEC-003…009 works fully from browser storage. No feature, page or action requires sign-in. | [[ADR-0007 Firebase Accounts and Firestore]] "Accounts stay optional" |
| SYNC-002 | MUST | Unless a session is expected (SYNC-004), the app **does not load** the `firebase` package and makes **no request** to any Firebase Auth or Firestore endpoint, whether or not a linked uid is stored. The package is loaded on demand when the user chooses Sign in, or at start-up when `sessionExpected` is true. | [[ADR-0007 Firebase Accounts and Firestore]] consequences (lazy-loaded on sign-in) |
| SYNC-003 | MUST | A **Sign in** action is in the app header and in Settings. It opens a dialog: "Sign in to keep your collection and decks in sync across your devices. You don't need an account: without one, everything stays on this device." followed by one button per enabled sign-in provider (H-063) and a link to the privacy notice (SYNC-101). Signed in, the header shows an account menu with the sync status (SYNC-084), **Sync now**, **Sign out** (SYNC-090) and a link to Settings, where **Delete account and data** lives (SYNC-095). | [[ADR-0007 Firebase Accounts and Firestore]]; design rule |
| SYNC-004 | MUST | A successful sign-in sets `sessionExpected = true`. **Every** sign-out (Keep or Remove, SYNC-091), Cancel of the Combine dialog (SYNC-049) and account deletion (SYNC-096) sets it to false. While it is true the app restores the session at start-up (loading `firebase`) and syncs. The **linked uid** is written only when a first sync completes (SYNC-048) and is cleared only by "Remove" and account deletion. If the tab closes after sign-in but before the first sync completed, the next start-up restores the session and runs the first-sign-in flow again (SYNC-048). | design rule |
| SYNC-005 | MUST | A failed or cancelled sign-in changes no local data and shows "Sign-in didn't complete. Your data on this device is unchanged." (cancelled by the user: no message). | design rule |
| SYNC-006 | MUST | The sign-in providers are those RJ enables (H-063). This spec does not depend on which ones; each provider is one button in the SYNC-003 dialog, labelled with the provider's name. | [[ADR-0007 Firebase Accounts and Firestore]] consequences; board H-063 |
| SYNC-007 | MUST | **Sign-in is gated by a build flag** `signInEnabled` (build configuration, default `false`). While false, no Sign in action is shown anywhere and SYNC-002 holds for every user. It may be `true` in local builds and preview channels for RJ's testing; it is set `true` for the production build only after the privacy notice (SYNC-101) is approved by RJ. **This is obscurity, not access control:** preview-channel URLs are public to anyone who has the link, so anyone who finds one can sign in there; RJ shares preview links only privately and lets them expire. | [[ADR-0007 Firebase Accounts and Firestore]] consequences ("a privacy policy"); design rule |

### B. Cloud layout and documents
| ID | Level | Requirement | Source |
|---|---|---|---|
| SYNC-010 | MUST | A user's cloud data is exactly these documents: `users/{uid}` (account), `users/{uid}/state/collection`, `users/{uid}/state/tags`, `users/{uid}/state/locks`, and `users/{uid}/decks/{deckId}` (one per deck, `deckId` = `UserDeck.id`). No other path is written. | [[Firestore Data Shape]] "Layout"; board H-061 |
| SYNC-011 | MUST | Every document has `schemaVersion` (integer, 1 for every document in this version), `updatedAt` (Firestore timestamp from the **client** clock: the latest change in the document) and `syncedAt` (set with the server timestamp on every write; the rules require it to equal the request time, SYNC-112). `syncedAt` is the only field any query filters on. | [[Firestore Data Shape]] "Layout" |
| SYNC-012 | MUST | **Account document** `users/{uid}`: `schemaVersion`, `createdAt` (first sign-in), `updatedAt`, `syncedAt`, `lastClientVersion` (the app build that last wrote it, ≤ 40 characters, a design cap for a version string). Nothing else: no email, name, photo or provider data (SYNC-100). It is **created only by the first-sign-in flow** (SYNC-048), as the first write of that flow, and updated at most once per app build after that (an `update()`, never a `set()`). | [[Firestore Data Shape]] "`users/{uid}`"; design decision 8 |
| SYNC-013 | MUST | **Collection document** `state/collection` (SPEC-003 `StoredCollection`): `catalogVersion` (string) and `cards`: map `cardKey` → `{ q, t, p }` where `q` = `quantity` (integer 0–9999), `p` = `byPrinting` (map `printingId` → integer 1–9999), `t` = the card's change time (integer ms). A card removed from the collection is the **tombstone** `{ q: 0, t, p: {} }`. Live cards have `q ≥ 1` and `Σ p ≤ q` (SPEC-007 COLL-002). | [[Firestore Data Shape]] "`state/collection`"; [[Collection Import]] `StoredCollection`; [[My Collection]] COLL-052 |
| SYNC-014 | MUST | **Collection writes.** A change to some cards is one `update()` with one `FieldPath('cards', cardKey)` per changed card (never a dotted string path: card names contain spaces, commas and apostrophes), plus `updatedAt` and `syncedAt`. Each card value is replaced whole; nested maps are never deep-merged (a printing removed from `p` must disappear). An Owned Cards Import in **Replace** mode is one `set()` of the whole document carrying every card of the new collection and a tombstone for every card it removed. The first write of the document is a `set()`. | [[Firestore Data Shape]] "`state/collection`", sync-flow table; [[Collection Import]] IMP-050 |
| SYNC-015 | MUST | **Tags document** `state/tags` (SPEC-007 `StoredTags`): `tags`: map `TagId` → `{ label, key, colour \| null, excludeFromDecks, createdAt, updatedAt }` (`createdAt`, `updatedAt` timestamps) or, for a deleted tag, the tombstone `{ deleted: true, updatedAt }`; `assignments`: map `TagTarget` (`p:<printingId>` / `u:<cardKey>`) → `{ a: TagId[], t }` (`a` ≤ 20 ids, `t` = change time ms). An unassigned target is the tombstone `{ a: [], t }`. Dormant assignments (COLL-029) are kept like any other. Writes use one `FieldPath` per changed tag or target, as SYNC-014. | [[Firestore Data Shape]] "`state/tags`"; [[My Collection]] COLL-019…029, `StoredTags`; design decision 4 |
| SYNC-016 | MUST | **Short tag ids.** A `TagId` is `t_` followed by 6 characters from `[0-9A-Za-z]` (8 characters), unique among the user's tags and tag tombstones; a new id that collides is drawn again. Tags created before this version with another id format are given a short id once, on load, and every reference is rewritten in the same save: `assignments`, the SPEC-007 view state's tag filter and saved views (COLL-060, COLL-064). This is `StoredTags` `schemaVersion: 3` (shape unchanged from 2; 3 means "ids are short"). | [[Firestore Data Shape]] "`state/tags`" (1.7 MB vs ≈ 620 KB worst case); [[My Collection]] `TagId`, COLL-071 |
| SYNC-017 | MUST | **Locks document** `state/locks` (SPEC-008 `StoredDeckLocks`): `locks`: map `deckId` → `{ lockedAt, updatedAt }`, where `lockedAt` is the lock time (timestamp, the SPEC-008 lock-order key) and `updatedAt` the change time of this entry; an unlock is the tombstone `{ lockedAt: null, updatedAt }`. Writes use one `FieldPath` per changed deck. | [[Firestore Data Shape]] "`state/locks`"; [[Shared Cards and Lock-in]] SHARE-022, SHARE-030; design decision 4 |
| SYNC-018 | MUST | **Deck documents** `decks/{deckId}`: the SPEC-006 `UserDeck` fields as they are, without `id` (it is the document id), with `createdAt`/`updatedAt` as timestamps, plus `syncedAt` and `deletedAt` (`null` on a live deck). The document's `schemaVersion` is `UserDeck.schemaVersion` (1). A **deleted deck** is the tombstone `{ schemaVersion, createdAt, updatedAt, deletedAt, syncedAt }` with `updatedAt = deletedAt` (timestamp). Each deck write is one `set()` of the whole document **without merge**, so writing a tombstone removes every other field. | [[Firestore Data Shape]] "`decks/{deckId}`"; [[Deck Import]] `UserDeck`, DECK-074 |
| SYNC-019 | MUST NOT | Never synced: SPEC-007 printing-code memory (`PrintingCodeStore`, COLL-075; each device rebuilds it), Collection view state and saved views (COLL-060, COLL-064), the previous collection kept for import Undo (IMP-052), the sync log, and any card data, image, ban list or tournament data. | [[Firestore Data Shape]] "What gets synced", decision 2; [[ADR-0007 Firebase Accounts and Firestore]] |

### C. Change tracking on the device
| ID | Level | Requirement | Source |
|---|---|---|---|
| SYNC-030 | MUST | The app keeps a device-local **sync log** (`StoredSyncLog`, `schemaVersion: 1`) with: linked uid, `sessionExpected`, cursors, last full sync time, change times and tombstones per item, the known deck versions (`knownDecks`), each store's last stamped record `updatedAt` (`recordUpdatedAt`), a value hash per card, tag and tag target (`h`, SYNC-032), the items the rules rejected (`rejected`, SYNC-118), and the pending set. It is behind its own store interface, like the other stores. | design decision 3 |
| SYNC-031 | MUST | **Stamping.** Every save of a local store made by a user action (not by the sync engine, SYNC-041), **signed in or not**, compares the new record with the previous one and, for each item that changed, appeared or disappeared, stamps `t = max(now, previous t of that item + 1)` and adds it to the pending set; a disappeared item gets a tombstone. A card is "changed" when its `quantity` or any `byPrinting` entry differs; a tag when any of its fields differ; a tag target when its id list differs; a lock when it is added, removed or its `lockedAt` differs. **Decks** use `UserDeck.updatedAt` as their change time, made monotonic in the same way: a saved deck gets `updatedAt = max(now, previous updatedAt + 1 ms)` (the previous version being the one this device last held, local or pulled), and a deletion gets the tombstone `deletedAt = max(now, updatedAt + 1 ms)`. | design rule; [[Deck Import]] DECK-074 |
| SYNC-032 | MUST | The stamps and the record are saved **together** (one transaction where the adapter allows it). **Reconcile on load:** the sync log keeps, per store, the record `updatedAt` it last wrote or stamped, and per card, tag and tag target a short **value hash** (e.g. 32-bit FNV-1a of the item's canonical JSON; locks compare `lockedAt` directly). If a loaded record's `updatedAt` differs (a save whose stamps were lost), only items whose hash differs, items new to the log, and items the log knows as live but the record lacks are stamped (`t` = the record's `updatedAt`, made monotonic as in SYNC-031; missing items get tombstones) and marked pending; unchanged items keep their stamps. For decks, a deck whose `updatedAt` differs from `knownDecks` is pending, and a known deck missing from the `DeckStore` gets a tombstone. Records saved before this version have no log entries, so every item is stamped with the record's `updatedAt` once. | design rule; [[Collection Import]] IMP-054 |
| SYNC-033 | MUST | A store record that is **missing or unreadable** (SPEC-003/007/008 newer or corrupt record, SHARE-061, COLL-071, DECK-091) never produces tombstones: its area is not pushed and not merged until it is readable again, and the status shows Sync error with "Some data on this device could not be read, so it isn't being synced." Only a user's change (or a pulled remote change) deletes an item. | design rule (prevents an unreadable store from wiping the cloud) |
| SYNC-034 | MUST | **Tombstones are kept 30 days** from their `t` (deck: `deletedAt`), locally and in the cloud. Older tombstones are dropped from the sync log and, in the cloud, removed in the next write of their document (collection, tag, assignment, lock: `deleteField()` on that `FieldPath` in the same `update()`, no extra write); deck tombstone documents older than 30 days are hard-deleted by the next device that syncs. | [[Firestore Data Shape]] decision 3 (recommended) |
| SYNC-035 | MUST | **Deck delete and Undo.** A deck deletion is pushed only after the SPEC-006 Undo window (10 s, DECK-083) ends. Undo within the window cancels the pending tombstone, so the restored record is identical (same id and timestamps) and nothing reaches the cloud. A deletion still pending when the tab closes is pushed on the next open. | [[Deck Import]] DECK-083; [[Shared Cards and Lock-in]] SHARE-024 |

### D. Sync flows
| ID | Level | Requirement | Source |
|---|---|---|---|
| SYNC-040 | MUST | **Pull.** While signed in, the app pulls on start-up, right after sign-in, when the tab becomes visible after being hidden for 5 minutes or more, when the browser comes back online, and on **Sync now**. A pull is two queries: `users/{uid}/state where syncedAt > stateCursor` and `users/{uid}/decks where syncedAt > decksCursor`, each billed at least 1 read even when empty, plus 1 read per returned document. The **first pull after start-up or sign-in** is preceded by the account check (SYNC-053), so it costs 3 reads with no changes; later pulls cost 2. Each cursor then becomes the largest `syncedAt` received (server time, never the client clock). | [[Firestore Data Shape]] "Reopen, same device", fact 8 |
| SYNC-041 | MUST | **Merge after pull.** Every pulled document is validated (SYNC-047) and merged into the local stores item by item with the rules of section E. Local stores are written only for items whose winner is the cloud copy; the screen updates as for a change in another tab (SPEC-005 OWN-071, SPEC-007 COLL-073, SPEC-008 SHARE-064). **Sync-engine writes are not user changes:** a local save made by a merge (including SYNC-044 deletions, SYNC-065 tag merges and SYNC-071 dropped locks) is **exempt from SYNC-031 stamping**. Each item it writes keeps the pulled change time (`t`, tag/lock `updatedAt`, deck `updatedAt` / `deletedAt`), is **not** added to the pending set. **Exceptions, stamped `max(now, pulled t + 1)` (or `+ 1` on the local `t` when that is later) and pending:** items SYNC-042 marks pending because the local version won (these keep their local stamp); the tombstones SYNC-065/071 create; and every tag assignment list the merge **rewrites** to a value neither side had: lists that received ids moved by SYNC-065, lists with ids removed by SYNC-066, and the SYNC-064 Combine unions. So the other devices receive the rewritten lists on their next pull; and the same save updates the sync log's `recordUpdatedAt`, item hashes and `knownDecks` (SYNC-032), so the next load reconciles nothing. | design rule |
| SYNC-042 | MUST | **Convergence.** After a merge, every item whose local version won (newer than the pulled one) is added to the pending set, and so is every pending item the pull did not touch. So a device that pushed an older value after a newer one was written elsewhere is corrected on the next pull of the device holding the newer value. | design rule (the server keeps the last write, not the latest `t`) |
| SYNC-043 | MUST | **Push.** Pending items are pushed after the debounce (SYNC-121), right after a merge that left items pending, when the tab is hidden, and on Sync now. A push is preceded by a pull when the last pull is older than 60 s. One write per changed document: collection, tags and locks by `FieldPath` per item (SYNC-014, 015, 017), decks one `set()` each. An item leaves the pending set only when its write succeeds; a failed write keeps it pending. **Known limitation:** a write made between another device's pull and push can be overwritten by an older value in that window (the server keeps the last write, not the latest `t`); the cloud may then briefly hold the older value until the device holding the newer one pulls and pushes it again (SYNC-042). | [[Firestore Data Shape]] sync-flow table |
| SYNC-044 | MUST | **Absent means deleted, after a first sync.** When a full state document is pulled, a local item that is **not** in its map and **not** pending, on a device that has completed a full read with this uid before (`lastFullSyncAt` set, linked uid = this uid), is deleted locally: its tombstone was purged (SYNC-034) or a Replace import on another device removed it (SYNC-014). For decks the same holds for documents missing from a **full** `decks` read (SYNC-045). | design rule; [[Firestore Data Shape]] decision 3 |
| SYNC-045 | MUST | **Full read.** The app reads every `state` and `decks` document (no cursor) on first sign-in on this device, when the cursors are missing, and when the last successful sync is more than **30 days** ago (tombstones may have expired, SYNC-034). | [[Firestore Data Shape]] "Open on a second device" |
| SYNC-046 | MUST | **Newer cloud schema.** A cloud document whose `schemaVersion` is higher than the app knows is never written by this app. Its area (collection, tags, locks, or that deck) is shown from local data read-only on this device, its local changes are disabled with "Update Rift Builder to change this: your account data was saved by a newer version. Reload the page.", and the rest keeps syncing. | [[Firestore Data Shape]] "Layout" (`schemaVersion`); [[Deck Import]] DECK-091 |
| SYNC-047 | MUST | **Validate pulled data.** Security rules cannot check every map entry (SYNC-112), so the client checks each pulled item against SYNC-013…018 and SPEC-003/006/007 limits. An invalid item is skipped (never written locally, never pushed back over), and the status shows Sync error with "Some account data couldn't be read." A valid item next to it is still merged. | design rule |
| SYNC-048 | MUST | **First sign-in on this device** (no linked uid, or a different one). After the full read (SYNC-045): (a) cloud empty, device empty → create the account document only; (b) cloud empty, device has data → upload everything, then notice "Your collection and decks are now saved to your account."; (c) cloud has data, device empty → download everything, no question; (d) both have data → the **Combine** dialog (SYNC-049). "Has data" = at least one live card, tag, deck or lock; "cloud" means the account document **exists**. Edge cases: (e) account document exists but the account has no data → treat as (a)/(b), but never `set()` over the existing account document (only the SYNC-012 `update()`); (f) **no account document but `state` or `decks` documents exist** (leftovers of a half-finished deletion) → never import them; follow SYNC-097's half-deleted branch: pause, and offer **Upload this device's data**, which deletes the leftover documents first and then runs (a)/(b), or **Sign out**. In cases (a) and (b) the account document is created first (SYNC-012). **Only when the flow's writes and local updates have all succeeded** does the app write the linked uid (this uid) and `lastFullSyncAt`; until then the device counts as never synced with this account, so SYNC-044 deletes nothing. A flow that fails or is interrupted writes neither and runs again on the next attempt. | [[Firestore Data Shape]] first sign-in rows; board H-061 ("first sign-in merges browser data") |
| SYNC-049 | MUST | **Combine dialog** (case d): "This device and your account both have data. Combine them? You'll have the newest version of each card count, tag and deck. This device: `<c>` cards, `<d>` decks, `<g>` tags. Account: `<c'>` cards, `<d'>` decks, `<g'>` tags." Buttons **Combine** (primary) and **Cancel**. When the linked uid is a different account, it adds "This device's data was last synced with a different account." Cancel signs out (`sessionExpected = false`), changes nothing on either side, and writes neither the linked uid nor `lastFullSyncAt`, so the next sign-in shows the Combine dialog again. Combine merges with section E (assignments as a union, SYNC-064) and then shows "Combined. You now have `<c''>` cards, `<d''>` decks and `<g''>` tags." plus any SYNC-074 notice. (`c` counts live `cardKey`s; decks and tags count live ones.) | board H-061; design rule |
| SYNC-050 | MUST | First sign-in writes are batched: at most 4 + N writes for N decks (account, three state documents, the decks), and only documents that changed in case (d). | [[Firestore Data Shape]] sync-flow table |
| SYNC-051 | SHOULD | **One syncing tab.** In one browser, at most one tab pulls or pushes at a time; other tabs see the results through their store-change handling (OWN-071, COLL-073, SHARE-064). | design rule |
| SYNC-052 | MUST | **Delete all local data** (SPEC-007 COLL-074) while signed in removes this device's copy and signs out (SYNC-091 "Remove"); it never deletes cloud data. Its confirmation adds "Your account keeps its copy. To delete that too, use Delete account and data." | [[My Collection]] COLL-074; design rule |
| SYNC-053 | MUST | **Account check before writing.** In each session (after start-up or sign-in), before its first write other than the first-sign-in flow's account creation, the device does the account check (`get users/{uid}`). If the document exists, writes may follow. If it is **missing** on a device with a linked uid equal to this uid, the device writes nothing and follows SYNC-097. In addition, an `update()` that fails with not-found (the document is gone), and a **create** (`set()` of a document that doesn't exist yet) denied by the rules, are treated the same way: stop writing, keep the item pending, and run the account check again. If it finds the account document **missing**, follow SYNC-097. If it finds it **present**, the denial was not about the account: the item falls back to SYNC-118 (rejected, not retried until it changes), and writing resumes for everything else, so there is no retry loop. **A write is a create** when the client has no record of the document existing in the cloud: for a deck, no `knownDecks` entry and never written by this device; for a `state` document, the last full read did not return it and this device never wrote it. Only the first-sign-in flow (SYNC-048) may create documents in an account whose account document is missing. | design decision 8; [[Firestore Data Shape]] fact 8 |

### E. Conflict rules: latest change wins
| ID | Level | Requirement | Source |
|---|---|---|---|
| SYNC-060 | MUST | **Items.** Two versions of the same item are compared by change time, and the later one wins **as a whole**: a collection card (`quantity` and `byPrinting` together, so `Σ byPrinting ≤ quantity` always holds), a tag (all fields), a tag target's id list, a deck (all fields; change time = `updatedAt`, which equals `deletedAt` for a tombstone), a lock (`lockedAt` or the unlock, by its `updatedAt`). Different items never affect each other: edits to two different cards, tags or decks on two devices both survive. | board H-061 ("latest change wins per deck and per card count"); [[Firestore Data Shape]] |
| SYNC-061 | MUST | **Ties** (equal change times, different content) go to the **cloud** copy. A tombstone and a live version compare like any two versions (a newer tombstone deletes; a newer edit restores). | design rule (deterministic) |
| SYNC-062 | MUST | **Monotonic stamps** (SYNC-031): a change always gets a time later than the version it was made on, so an edit on a device whose clock is behind still beats the version it replaced. **Clock skew note:** across devices that have not seen each other's change, "latest" means latest by each device's own clock; a device whose clock runs ahead wins those races. | design rule |
| SYNC-063 | SHOULD | **Clock check.** When a pull returns a document this device wrote, the app compares its `syncedAt` with the client time of that write (no extra read). If they differ by more than 5 minutes, the account menu shows "Your device clock is off by about `<m>` minutes. If you edit on several devices, the wrong change may win." | design rule |
| SYNC-064 | MUST | **Tag assignments.** During regular sync, each tag target's id list is one item (SYNC-060). During the **Combine** merge (SYNC-049) each target gets the **union** of both lists, cloud ids first, then local ids not already present, capped at 20 (COLL-022); ids cut by the cap are reported in the summary as "`<n>` entries had more than 20 tags; some tags were not added." | [[Firestore Data Shape]] first sign-in row ("tag assignments as a union"); [[My Collection]] COLL-022 |
| SYNC-065 | MUST | **Same label, two tags.** When a merge leaves two live tags with the same `key` (created separately on two devices), the one with the earlier `createdAt` (then lower id) is kept; every assignment of the other is moved to it (no duplicates), the other becomes a tombstone, and the kept tag keeps its own label, colour and `excludeFromDecks`. | [[My Collection]] COLL-021, COLL-024 (merge rules) |
| SYNC-066 | MUST | **Deleted tags.** An id whose tag is a tombstone (or unknown) is removed from every assignment list on merge and is never shown (COLL-025). | [[My Collection]] COLL-025 |
| SYNC-067 | MUST | **Limits after a merge.** A merge never drops a live card, tag or deck to meet a limit. If it leaves more than 200 tags (COLL-022) or 200 decks (DECK-092), creating new ones is blocked with the existing limit message until the user is back under the limit; everything else keeps working. | [[My Collection]] COLL-022; [[Deck Import]] DECK-092 |
| SYNC-068 | MUST | **Collection-side warnings.** Remote changes have no confirmation step, so a pulled change that lowers what a locked deck holds shows SPEC-008's after-the-fact notice "'`<deck name>`' (locked) is now `<n>` cards short." computed with `lockedShortfalls(before, after)` (SHARE-034, as for an import Undo). | [[Shared Cards and Lock-in]] SHARE-034 |

### F. Locks across devices
| ID | Level | Requirement | Source |
|---|---|---|---|
| SYNC-070 | MUST | Locks sync per deck (SYNC-017, SYNC-060). The SPEC-008 rules apply to the merged set unchanged: lock order by `lockedAt` then `deckId` across all devices (SHARE-030), earliest lock wins, holds and shortfalls are computed, never stored (SHARE-035). | [[Shared Cards and Lock-in]] SHARE-030…035; [[Firestore Data Shape]] "`state/locks`" |
| SYNC-071 | MUST | **Lock on a deck deleted elsewhere.** A lock never restores a deck. If the merged deck is a tombstone, its lock is dropped (SHARE-062) and written as an unlock tombstone; a deck deleted on one device releases its lock everywhere (SHARE-024). | [[Shared Cards and Lock-in]] SHARE-024, SHARE-062 |
| SYNC-072 | MUST | **Deck edited elsewhere while locked.** When the merged deck's cards changed and the merged lock is live (e.g. device B edited the deck before it learned of device A's lock), the deck **stays locked** with its new contents; need and holds are recomputed (SHARE-028) and it may become short (SHARE-033). The app shows "'`<deck name>`' changed on another device while it was locked." | [[Shared Cards and Lock-in]] SHARE-025, SHARE-028, SHARE-033 |
| SYNC-073 | MUST | **Locked and unlocked on two devices.** The later of lock and unlock wins (SYNC-060). A deck locked on two devices keeps the lock with the later `updatedAt` and that entry's `lockedAt`. | design rule |
| SYNC-074 | MUST | **Merge makes a lock short.** When a Combine merge or a pulled collection or tag change leaves a locked deck short, the deck **stays locked and is flagged** "Locked · `<n>` cards short" (SHARE-033); it is never unlocked automatically. A notice lists each such deck: "'`<deck name>`' (locked) is now `<n>` cards short." (Default; Open question 2.) | [[Shared Cards and Lock-in]] SHARE-033, SHARE-034, design decision 5 |
| SYNC-075 | MUST | A Combine merge or pull never creates a lock: a lock exists only where the user locked a deck on some device (SHARE-020). A lock pulled onto a device is valid even if that device's view would not let the user lock it now; it is shown per SHARE-033. | [[Shared Cards and Lock-in]] SHARE-020, SHARE-033 |
| SYNC-076 | MUST | Decks are never locked on the cloud without a deck document: a push writes the deck before its lock. A `state/locks` entry whose deck is unknown on a device after a full read is ignored there and dropped on the next lock save (SHARE-062). | [[Shared Cards and Lock-in]] SHARE-062 |

### G. Offline and status
| ID | Level | Requirement | Source |
|---|---|---|---|
| SYNC-080 | MUST | Signed in and offline, every feature works on the local stores; changes are stamped and stay pending (SYNC-031) and are pushed when the browser is online again or on the next open. Correctness never depends on Firestore's own offline cache. | [[Firestore Data Shape]] "Offline" |
| SYNC-081 | MUST | Sign-in, Sync now, sign-out and account deletion need a connection; offline they are disabled with "You're offline." | design rule |
| SYNC-082 | MUST | A pending change survives a closed tab or a restart (the sync log is persistent) and is pushed on the next signed-in open. | [[Firestore Data Shape]] "Offline" |
| SYNC-083 | MUST | **Free tier used up.** When Firestore rejects reads or writes because the project's quota is exhausted, sync stops until the next pull attempt after the reset, nothing local is lost, and the status reads "Sync paused. Your changes are saved on this device." | [[Firestore Data Shape]] decision 1 (recommended), fact 2 |
| SYNC-084 | MUST | The account menu shows one **sync status**: `Synced` ("Synced · `<time>`"), `Syncing…`, `Offline` ("Offline · changes are saved on this device"), `Paused` (SYNC-083), `Error` (SYNC-033, SYNC-047, or a failed write: "Couldn't sync. Your changes are saved on this device. Try again."). With pending items the text adds "· `<n>` changes not synced yet". Status is text, not colour alone. | design rule (accessibility) |
| SYNC-085 | MUST | A sync failure never blocks or undoes a local save: the local store keeps the change (SPEC-003/006/007/008 save rules apply only to the local store). | design rule; [[Deck Import]] DECK-093; [[My Collection]] COLL-072 |
| SYNC-086 | MUST | **Session lost.** This applies only while `sessionExpected` is true: if the session cannot be restored at start-up or ends without the user signing out (token expired or revoked, account disabled) and `AuthService.checkAccount()` does **not** return `deleted` (SYNC-097), the app stops syncing, keeps local data and pending items, keeps `sessionExpected` true, and shows "You've been signed out. Sign in again to sync." Signing in again with the same uid resumes as a normal pull and push. A deliberate sign-out (SYNC-090) never shows this message. | design rule |

### H. Sign-out and account deletion
| ID | Level | Requirement | Source |
|---|---|---|---|
| SYNC-090 | MUST | **Sign out** asks: "Sign out? Your collection and decks stay in your account." with **Keep a copy on this device** (primary), **Remove from this device**, and Cancel. With pending items it first says "`<n>` changes haven't synced yet. They'll be lost if you remove this device's copy." ("1 change hasn't synced yet." for one) and offers **Sync now**. (Default; Open question 6.) | board H-061; design rule |
| SYNC-091 | MUST | Both choices set `sessionExpected = false`, so the next start-up loads no Firebase (SYNC-002). **Keep a copy:** local stores stay as they are and become signed-out data (later changes are stamped and pending, SYNC-031); the linked uid stays in the sync log so signing in again with the same account resumes normally (no Combine dialog), and a different account gets the Combine dialog with the "different account" line (SYNC-049). **Remove:** every local store (collection, tags, decks, locks, printing codes, view state, import Undo snapshot, sync log) is cleared and the app returns to the empty signed-out state. | design rule; [[My Collection]] COLL-074 |
| SYNC-092 | MUST | Signing out ends the Firebase session in this browser; no Firestore request is made afterwards until the next sign-in. | design rule |
| SYNC-095 | MUST | **Delete account and data** (Settings) shows: "Delete your Rift Builder account? This deletes your account and the collection, tags, decks and locks saved in it, on every device that syncs it. This can't be undone." The user types `delete` to enable **Delete account** (Cancel always available). The dialog also offers a checkbox "Keep a copy on this device, without an account" (unchecked by default). (Wording: Open question 7.) | [[ADR-0007 Firebase Accounts and Firestore]] consequences ("delete my account and data" option) |
| SYNC-096 | MUST | **Deletion order:** (1) if the sign-in provider needs a recent sign-in to delete the account, ask for it first, before anything is deleted; (2) delete `users/{uid}` **first** (the marker other devices check, SYNC-053), then every document under `users/{uid}/decks` (tombstones included) and the three `state` documents; (3) delete the Firebase Auth user; (4) clear local data unless the keep-a-copy box was checked (then keep it as signed-out data and clear the linked uid); in both cases `sessionExpected = false`; (5) show "Your account and its data were deleted." If any step fails, stop, say what is left ("Some data couldn't be deleted. Try again."), and allow a retry that continues from where it stopped (a missing account document is not an error for the deleting device); the Auth user is deleted only after every document is gone. | [[ADR-0007 Firebase Accounts and Firestore]]; [[Firestore Data Shape]] ("Delete account and data: N + 4 deletes") |
| SYNC-097 | MUST | **Deleted account on another device.** The signals are: the account document is missing on a device whose linked uid is this uid (SYNC-053), an `update()` fails with not-found, a create is denied and the repeated account check finds the account document missing (SYNC-053), or the session cannot be restored. On any of them the device stops writing and calls `AuthService.checkAccount()`, which returns `ok`, `deleted` (the provider reports that the user no longer exists), `signed-out`, or `offline`. **`deleted`:** it removes the synced local data, clears the linked uid, sets `sessionExpected = false`, and shows "This account was deleted. Its data has been removed from this device." (Default; Open question 8.) **`ok` with the account document missing** (a deletion in progress or one that failed half-way): it pauses sync with "Your account's data is missing or being deleted. Sync is paused." and offers **Upload this device's data** (deletes any leftover `state` / `decks` documents, then runs the first-sign-in flow, SYNC-048, which recreates the account; leftovers are never imported) and **Sign out**; nothing is written without that choice. **`signed-out`:** SYNC-086. **`offline`:** retry on the next SYNC-040 trigger. Which provider error means `deleted` is mapped inside the `AuthService` adapter and must be confirmed against the Auth emulator in H-062 (`unverified`); any unclear result counts as `signed-out` (local data kept). | design decision 8; design rule |
| SYNC-098 | MUST | After deletion, no document remains under `users/{uid}`, and a device that still holds a valid session cannot recreate one: it never writes before the account check (SYNC-053), and the rules refuse to create a `state` or `decks` document unless the account document exists after the write (SYNC-113). A later sign-in with the same provider identity is a new, empty account. **Residual risks** (reported, not prevented): a device in the middle of its own first-sign-in flow when the deletion runs could recreate an account; and a device that picks **Upload this device's data** (SYNC-097, half-deleted branch) while the deleting device is retrying its deletion (SYNC-096) races with it, so the retry can delete the freshly uploaded documents or the upload can recreate an account that is about to lose its Auth user. | design rule |

### I. Privacy
| ID | Level | Requirement | Source |
|---|---|---|---|
| SYNC-100 | MUST | The cloud stores only what SYNC-010…018 list: card keys, counts and printing ids; tag labels, colours and flags; deck names, sources, notes and card lists; lock times; timestamps; app build. Email address, display name and photo stay with the sign-in provider in Firebase Auth and are not copied into Firestore, logs or analytics. | [[ADR-0007 Firebase Accounts and Firestore]] (user data is text only) |
| SYNC-101 | MUST | A **privacy notice** page is linked from the sign-in dialog, Settings and the footer before sign-in is offered to anyone but RJ. It states: what is stored (SYNC-100), where (Google Cloud Firestore, `us-south1`, ADR-0007), that only the signed-in user can read it (SYNC-110), that signed-out use stores nothing outside the browser, that tag labels, deck names and notes are free text the user controls, and how to delete everything (SYNC-095). **BLOCKED: needs research** for any legal content beyond these facts (Open question 10). | [[ADR-0007 Firebase Accounts and Firestore]] consequences ("a privacy policy"); [[Card Data & Images]] #7 (data removal) |
| SYNC-102 | MUST NOT | User data is never shared with other users, never readable by anyone but its owner through the app, and never used to compute anything about other users (no cross-user counts; ADR-0003). | [[ADR-0003 Tournament Results Only]]; design rule |

### J. Security rules and indexes (implemented in H-062)
| ID | Level | Requirement | Source |
|---|---|---|---|
| SYNC-110 | MUST | **Owner only.** A request may read, list, create, update or delete a document under `users/{uid}` only when `request.auth != null` and `request.auth.uid == uid`. Every other path, and every request without auth, is denied. | [[Firestore Data Shape]] "Security rules"; [[ADR-0007 Firebase Accounts and Firestore]] |
| SYNC-111 | MUST | **Known paths only.** Allowed: `users/{uid}`; `users/{uid}/state/{doc}` with `doc` one of `collection`, `tags`, `locks`; `users/{uid}/decks/{deckId}` with `deckId` matching a lowercase UUID (`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`). Anything else is denied. | design rule |
| SYNC-112 | MUST | **Field validation on create and update** (delete needs only SYNC-110): only the listed keys may be present; `schemaVersion == 1` (int); `updatedAt` is a timestamp; `syncedAt == request.time`. Per document: account: `createdAt` timestamp, `lastClientVersion` string ≤ 40. collection: `catalogVersion` string ≤ 100, `cards` map with `size() ≤ 6000`. tags: `tags` map `size() ≤ 400`, `assignments` map `size() ≤ 6000`. locks: `locks` map `size() ≤ 400` (caps: design decision 7). deck (live): exactly the keys `schemaVersion`, `updatedAt`, `syncedAt`, `deletedAt` (`== null`), `createdAt` (timestamp), `name` (string 1–80, DECK-070), `format` (one of the SPEC-002 `FormatId` values, today `'standard'`), `source` (map), `sourceFormat` (one of the SPEC-006 `DeckSourceFormat` values), `notes` (string ≤ 4000, DECK-073), `catalogVersion` (string ≤ 100), `legend`, `champion` (map or null), `main`, `sideboard`, `runes`, `battlefields` (lists, `size() ≤ 150`, DECK-092), and optionally `duplicatedFrom` (string, 36 = UUID length, DECK-084) and `importRemovedLines` (list; no size cap, SPEC-006 sets none: the 1 MiB document limit bounds it, SYNC-124). deck tombstone: exactly `schemaVersion`, `createdAt`, `updatedAt`, `deletedAt` (timestamp), `syncedAt`. The 100-character `catalogVersion` and 40-character `lastClientVersion` caps are design caps: SPEC-001 CARD-068 builds `catalogVersion` as `<schemaVersion>+<lastUpdated>`, e.g. `0.2+2026-11-20T18:04:00Z` (24 characters). A new `FormatId` or `DeckSourceFormat` value needs a rules update in the same change. Map entries inside `cards`, `tags`, `assignments`, `locks` are not checked by rules (SYNC-047 covers them). | [[Firestore Data Shape]] "Security rules", fact 3; [[Deck Import]] DECK-070…073, DECK-084, DECK-092, `DeckSourceFormat`; [[Deck Legality]] `FormatId`; [[Card Data Model]] CARD-068 |
| SYNC-113 | MUST NOT | Rules use no `get()` or `exists()` lookups (each is billed as a read), with one exception: **creating** a `state` or `decks` document requires `existsAfter(/databases/$(database)/documents/users/$(uid))`, so documents can only be created in an account whose account document exists (or is created in the same batch). Creates are rare (first sign-in, new decks). This spec counts **1 billed read per created document** as an upper bound (SYNC-120). Updates and deletes use no lookup. `unverified` (researcher item to be filed): whether `existsAfter()` is billed when the looked-up document is written in the same batch, whether repeated identical lookups in one batch are billed once, and the per-request limit on rule lookups (it matters for a first-sign-in batch of 3 + N creates; if the limit is lower than that, the batch is split). | [[Firestore Data Shape]] fact 10; design decision 8 |
| SYNC-114 | MUST | **Rules tests** (Firestore emulator) show at least: user B cannot get, list, create, update or delete any of user A's documents (all five paths); an unauthenticated request is denied on every path; an unknown path (`users/A/other/x`, `users/A/state/views`) is denied for A; a write with an extra key, a wrong `schemaVersion`, a client-set `syncedAt`, or a 151-entry `main` is denied; creating `users/A/decks/<id>` while `users/A` does not exist is denied, and allowed in a batch that also creates `users/A`; each valid document shape of SYNC-012…018 (including both tombstone forms) is allowed for its owner. | board H-062 (rules tested against other-user access) |
| SYNC-115 | MUST | **Indexes.** `firestore.indexes.json` exempts every field except `syncedAt` from single-field indexing (`fieldOverrides` with `indexes: []`): on `state`: `cards`, `catalogVersion`, `tags`, `assignments`, `locks`, `updatedAt`, `schemaVersion`; on `decks`: every `UserDeck` field plus `deletedAt`, `updatedAt`, `createdAt`, `schemaVersion`. `syncedAt` keeps its default index. No composite index is needed. | [[Firestore Data Shape]] "Indexes", fact 4 |
| SYNC-116 | MUST | The only queries are the two cursor queries of SYNC-040 (and the same without a cursor for SYNC-045 and SYNC-096). | [[Firestore Data Shape]] "Indexes" |
| SYNC-117 | MUST | `firestore.rules` and `firestore.indexes.json` are deployed with `firebase deploy --only firestore` before the sign-in UI ships; until then the deny-all rules of ADR-0007 stay. | [[ADR-0007 Firebase Accounts and Firestore]] "Rules today" |
| SYNC-118 | MUST | **Rejected writes.** A write the rules reject (permission denied while the session is valid) keeps its items local and pending, marks them rejected in the sync log, shows Sync error "Some data couldn't be synced: `<area>` (`<deck name>` for a deck)." and is not retried until one of those items changes or the app build changes. Other documents keep syncing. | design rule |
| SYNC-119 | MUST | **Map caps.** Before writing `state/collection`, `state/tags` or `state/locks`, if the map would exceed its SYNC-112 cap, the client drops tombstones from the write (`deleteField()`), oldest `t` first, even before 30 days, until it fits; dropping a tombstone early can let a device that has not synced since bring the item back (SYNC-044 limits this). If live items alone exceed the cap, the write is not sent and SYNC-124's "This data is too large to sync." applies. | design decision 7 |

### K. Cost and free tier
Facts from [[Firestore Data Shape]] (official Firebase pages, read 2026-11-23): Spark free quota 50,000 reads,
20,000 writes and 20,000 deletes per day, 1 GiB stored, 10 GiB/month outbound; max document 1 MiB; a disconnected
listener (over 30 minutes) re-reads every matching document; rule lookups are billed as reads.

| ID | Level | Requirement | Source |
|---|---|---|---|
| SYNC-120 | MUST | Per-flow cost stays at or under the [[Firestore Data Shape]] table, plus the account check: reopen with no changes = 3 reads (account check + 2 empty queries; the note counted 2) and 0 writes; a later pull with no changes = 2 reads; import of 300 cards = 1 write; lock or unlock = 1 write; a new deck = 1 write + at most 1 rule-lookup read (SYNC-113); first sign-in into an empty account = at most 3 reads + 3 + N rule-lookup reads (one per created `state` / `decks` document) and 4 + N writes, e.g. ≤ 16 reads and 14 writes for 10 decks. The rule-lookup read counts are upper bounds pending the SYNC-113 `unverified` points. | [[Firestore Data Shape]] "Sync flows" |
| SYNC-121 | MUST | Pushes are **debounced** by at least 2 s after the last change per document (collection +/− clicks, typing a quantity, tag edits, deck edits), so a burst of edits is one write. | [[Firestore Data Shape]] "Edit a deck", "What makes the biggest difference" |
| SYNC-122 | MUST NOT | No long-lived listener on the whole `decks` collection, and no polling while the tab is visible beyond SYNC-040's triggers. | [[Firestore Data Shape]] fact 9 |
| SYNC-123 | SHOULD | A heavy collection document stays under 700 KB; above that the app logs a warning for RJ (the 8-bucket split in [[Firestore Data Shape]] is the migration path, a future `schemaVersion: 2`). | [[Firestore Data Shape]] "Why not finer or coarser" |
| SYNC-124 | MUST | A write rejected because a document would exceed 1 MiB keeps the change local and pending, shows Sync error "This data is too large to sync.", and does not retry until the document's content changes. | [[Firestore Data Shape]] fact 3 |
| SYNC-125 | MUST NOT | No Firestore read or write happens for signed-out users (SYNC-002), so they cost nothing. | [[Firestore Data Shape]] "Per day" |

### L. Architecture
| ID | Level | Requirement | Source |
|---|---|---|---|
| SYNC-130 | MUST | Storage stays behind interfaces: features keep using `CollectionStore`, `TagStore`, `DeckStore`, `DeckLockStore` unchanged; Firestore is reached only through a `RemoteStore` adapter and sign-in only through an `AuthService` adapter. Firebase imports appear only in those adapter files, which are lazy-loaded (SYNC-002). | [[Spec Index]] cross-cutting constraints; [[ADR-0001 Tech Stack]]; [[Validation Checks]] V-011 |
| SYNC-131 | MUST | Merge, stamping and conflict resolution are **pure functions** of (local records, sync log, pulled documents, now), testable without Firestore. | design rule |

## Field mapping (for H-062)
| Local (spec) | Local field | Cloud document | Cloud field | Conversion |
|---|---|---|---|---|
| SPEC-003 `StoredCollection` | `schemaVersion` | `state/collection` | `schemaVersion` | own version (1), independent |
| | `updatedAt` (ISO) | | `updatedAt` | ISO ↔ timestamp; = latest card `t` written |
| | `catalogVersion` | | `catalogVersion` | as is |
| | `cards[k].quantity` | | `cards[k].q` | as is; tombstone `0` |
| | `cards[k].byPrinting` | | `cards[k].p` | as is; tombstone `{}` |
| sync log | `cards[k].t` | | `cards[k].t` | ms integer |
| SPEC-007 `StoredTags` | `schemaVersion` (3, SYNC-016) | `state/tags` | `schemaVersion` | own version (1), independent |
| | `updatedAt` (ISO) | | `updatedAt` | ISO ↔ timestamp |
| | `tags[]` (array) | | `tags` (map by id) | array ↔ map keyed by `Tag.id` |
| | `Tag.label`, `key`, `colour`, `excludeFromDecks` | | same names | as is |
| | `Tag.createdAt` (ISO) | | `createdAt` | ISO ↔ timestamp |
| sync log | `tags[id].t` | | `tags[id].updatedAt` | ms ↔ timestamp |
| | `assignments[target]` | | `assignments[target].a` | as is |
| sync log | `assignments[target].t` | | `assignments[target].t` | ms integer |
| SPEC-008 `StoredDeckLocks` | `schemaVersion` (1) | `state/locks` | `schemaVersion` | own version (1), independent |
| | `updatedAt` (ISO) | | `updatedAt` | ISO ↔ timestamp |
| | `locks[].deckId` | | `locks` key | array ↔ map |
| | `locks[].lockedAt` (ISO) | | `locks[id].lockedAt` | ISO ↔ timestamp; null = unlock tombstone |
| sync log | `locks[id].t` | | `locks[id].updatedAt` | ms ↔ timestamp |
| SPEC-006 `UserDeck` | `id` | `decks/{deckId}` | document id | not repeated |
| | `schemaVersion` (1) | | `schemaVersion` | same number (DECK-091) |
| | `createdAt`, `updatedAt` (ISO) | | same names | ISO ↔ timestamp; `updatedAt` monotonic (SYNC-031) |
| | every other field | | same names | as is (`DeckCard` = `{ cardKey, name, qty }`) |
| sync log | deck tombstone `deletedAt` | | `deletedAt` | ms ↔ timestamp; null for a live deck; a tombstone document has only `schemaVersion`, `createdAt`, `updatedAt` (= `deletedAt`), `deletedAt`, `syncedAt` (SYNC-018) |
| — | — | every document | `syncedAt` | server timestamp; becomes the cursor |

## Data contract
```ts
// shapes only; no implementation
import type { CardKey, PrintingId, StoredCollection } from './collection-import';   // SPEC-003 v0.6
import type { TagId, TagTarget, TagColour, StoredTags } from './my-collection';     // SPEC-007 v0.5 (TagId per SYNC-016)
import type { UserDeck } from './deck-import';                                       // SPEC-006 v0.6
import type { StoredDeckLocks } from './shared-cards';                              // SPEC-008 v0.2
type Ms = number;                 // ms since Unix epoch, client clock
type Timestamp = unknown;         // Firestore timestamp (adapter type)

// ---- Firestore documents (SYNC-010..018) ----
interface DocMeta { schemaVersion: 1; updatedAt: Timestamp; syncedAt: Timestamp }   // syncedAt = server time
interface AccountDoc extends DocMeta { createdAt: Timestamp; lastClientVersion: string }
interface CollectionDoc extends DocMeta {
  catalogVersion: string;
  cards: Record<CardKey, { q: number; t: Ms; p: Record<PrintingId, number> }>;      // q 0 + p {} = tombstone
}
interface TagsDoc extends DocMeta {
  tags: Record<TagId,
    | { label: string; key: string; colour: TagColour | null; excludeFromDecks: boolean;
        createdAt: Timestamp; updatedAt: Timestamp }
    | { deleted: true; updatedAt: Timestamp }>;                                      // tombstone
  assignments: Record<TagTarget, { a: TagId[]; t: Ms }>;                            // a [] = tombstone
}
interface LocksDoc extends DocMeta {
  locks: Record<string /* deckId */, { lockedAt: Timestamp | null; updatedAt: Timestamp }>; // null = unlocked
}
type DeckDoc =
  | (DocMeta & Omit<UserDeck, 'id' | 'schemaVersion' | 'createdAt' | 'updatedAt'>
      & { createdAt: Timestamp; deletedAt: null })
  | (DocMeta & { createdAt: Timestamp; deletedAt: Timestamp });                      // tombstone, updatedAt = deletedAt

// ---- Device-local sync log (SYNC-030..035) ----
interface StoredSyncLog {
  schemaVersion: 1;
  uid: string | null;                       // linked uid: written only when a first sync completes (SYNC-048)
  sessionExpected: boolean;                 // SYNC-004; false after any sign-out, Cancel, deletion
  recordUpdatedAt: { collection: string | null; tags: string | null; locks: string | null }; // SYNC-032
  knownDecks: Record<string, Ms>;           // deckId → updatedAt last stamped or pulled (SYNC-031/032)
  rejected: string[];                       // item refs rejected by the rules (SYNC-118)
  cursors: { state: Ms | null; decks: Ms | null };   // largest syncedAt received (server time)
  lastFullSyncAt: Ms | null;                // client time of the last successful full read (SYNC-044/045)
  lastSyncAt: Ms | null;                    // client time of the last successful pull
  clockOffsetMs: number | null;             // SYNC-063
  cards: Record<CardKey, { t: Ms; deleted: boolean; h: string }>;      // h = value hash (SYNC-032)
  tags: Record<TagId, { t: Ms; deleted: boolean; h: string }>;
  assignments: Record<TagTarget, { t: Ms; deleted: boolean; h: string }>;
  locks: Record<string, { t: Ms; unlocked: boolean }>;
  deckTombstones: Record<string, { deletedAt: Ms; pushAfter: Ms }>; // pushAfter = delete + 10 s (SYNC-035)
  pending: { account: boolean; cards: CardKey[]; tags: TagId[]; assignments: TagTarget[];
             locks: string[]; decks: string[] };
}
interface SyncLogStore { load(): Promise<StoredSyncLog | null>; save(s: StoredSyncLog): Promise<void> }

// ---- Adapters (SYNC-130) ----
interface AuthService {
  currentUid(): string | null;
  providers(): { id: string; label: string }[];               // enabled per H-063
  signIn(providerId: string): Promise<{ uid: string } | 'cancelled'>;
  signOut(): Promise<void>;
  reauthenticate(): Promise<'ok' | 'cancelled'>;              // SYNC-096 step 1
  checkAccount(): Promise<'ok' | 'deleted' | 'signed-out' | 'offline'>; // SYNC-097; unclear → 'signed-out'
  deleteUser(): Promise<'ok' | 'needs-recent-sign-in'>;
}
interface RemoteStore {
  pull(uid: string, cursors: StoredSyncLog['cursors'] | null): Promise<{
    account: AccountDoc | null; collection?: CollectionDoc; tags?: TagsDoc; locks?: LocksDoc;
    decks: Record<string, DeckDoc>; cursors: StoredSyncLog['cursors'] }>;   // null cursors = full read
  push(uid: string, changes: {
    account?: AccountDoc;
    collection?: { replace: boolean; cards: CollectionDoc['cards']; purge: CardKey[]; catalogVersion: string };
    tags?: { tags: Partial<TagsDoc['tags']>; assignments: Partial<TagsDoc['assignments']>; purge: string[] };
    locks?: { locks: Partial<LocksDoc['locks']>; purge: string[] };
    decks?: Record<string, DeckDoc>; hardDelete?: string[];
  }): Promise<void>;                                          // rejects per document; failed items stay pending
  deleteAll(uid: string): Promise<'ok' | { remaining: number }>;
}

type SyncStatus =
  | { kind: 'signed-out' } | { kind: 'synced'; at: Ms } | { kind: 'syncing' }
  | { kind: 'offline' } | { kind: 'paused' } | { kind: 'error'; message: string };
// + pendingCount: number on every signed-in status (SYNC-084)

// Pure (SYNC-131):
// stamp(prev, next, log, now): StoredSyncLog                       — SYNC-031
// mergePulled(local, log, pulled, mode: 'regular' | 'combine', now):
//   { local: <records to write>; log: StoredSyncLog; notices: string[] }  — sections E, F
```

## Acceptance criteria
Unless stated: user RJ has uid `uA`; a second user has uid `uB`; devices are "laptop" and "phone"; cards
`hextech ray` and `lightning rush`; deck `Kennen Tempo` (id `0b7c…`) needs 3 `Hextech Ray`; times are on
2026-11-23 UTC.

1. **Signed out loads no Firebase** (SYNC-001, SYNC-002, SYNC-125)
   **Given** a fresh browser with no linked uid **When** the user imports 40 cards, imports a deck and locks
   it **Then** everything works, the network log shows no request to Firebase Auth or Firestore, and no
   `firebase` chunk was loaded. **When** the user clicks Sign in **Then** the chunk loads and the dialog shows
   the SYNC-003 text with one button per enabled provider.
2. **Stamping while signed out** (SYNC-031, SYNC-032)
   **Given** signed out, `hextech ray` quantity 2 with stamp `t = 1000` **When** the user presses + at a clock
   of `900` (clock behind) **Then** the stamp is `1001` and `hextech ray` is pending; **When** the user removes
   `lightning rush` **Then** the sync log holds a tombstone for it with `t` = now.
3. **First sign-in, empty account** (SYNC-048 b, SYNC-050, SYNC-120)
   **Given** laptop signed out with 350 cards, 20 tags, 10 decks and 3 locks, and `uA` has no documents **When**
   RJ signs in **Then** no Combine dialog appears, at most 16 billed reads (3 + 13 rule lookups for 3 `state` and
   10 `decks` creates, an upper bound, SYNC-113) and 14 writes are made, the cloud holds
   `users/uA`, three `state` documents and 10 `decks` documents, and the notice "Your collection and decks are
   now saved to your account." shows.
4. **Second device downloads** (SYNC-048 c, SYNC-045)
   **Given** AC 3 done **When** RJ signs in on an empty phone **Then** no dialog appears and the phone shows
   350 cards, 20 tags, 10 decks and the same 3 locked decks.
5. **Combine** (SYNC-049, SYNC-060, SYNC-064)
   **Given** the phone signed out with `hextech ray` q 1 (`t` 10:00), tag `Trade Binder` on `p:OGN-001a`, deck
   `Draft A`; the account has `hextech ray` q 3 (`t` 09:00), the same target with tag `Collector`, deck
   `Kennen Tempo` **When** RJ signs in **Then** the Combine dialog shows both sides' counts; **When** he
   chooses Combine **Then** `hextech ray` is q 1 (10:00 is later), `p:OGN-001a` has both `Collector` and
   `Trade Binder` (union, cloud first), the union list is stamped later than the cloud's `t` and pushed, both
   decks exist, and the summary notice shows the new totals; **When** the laptop (already synced with `uA`,
   holding only `Collector` on `p:OGN-001a`) next pulls **Then** its `p:OGN-001a` is `[Collector, Trade Binder]`.
   **When** he chooses Cancel instead **Then** he is signed out and neither side changed.
6. **Latest change wins per card, both edits kept** (SYNC-060, SYNC-042, SYNC-043)
   **Given** laptop and phone synced **When**, both offline, the laptop sets `hextech ray` to 4 at 12:00 and the
   phone sets it to 2 at 12:05 and `lightning rush` to 3 at 12:06, then the **laptop goes online first** and
   pushes, then the phone pulls and pushes, then the laptop pulls **Then** both devices and the cloud end with
   `hextech ray` 2 and `lightning rush` 3. **Given** instead the laptop pulled at 12:10:00 (before the phone's
   push), the phone pushes `hextech ray` 2 (`t` 12:05) at 12:10:20, and the laptop, still within 60 s of its
   pull, pushes 4 (`t` 12:00) at 12:10:30 over it **When** the phone next pulls **Then** it receives 4 (`t` 12:00),
   keeps its own 2 (12:05 is later), marks it pending and pushes 2 again; **When** the laptop then pulls **Then**
   it receives 2 (`t` 12:05), which beats its 4, and takes it, so the cloud and both devices end at 2 (convergence,
   SYNC-042; the cloud held 4 in between, SYNC-043 limitation).
7. **Tie goes to the cloud** (SYNC-061)
   **Given** local `lightning rush` q 2 `t` 5000 and pulled q 3 `t` 5000 **When** merged **Then** local becomes
   q 3 and nothing is pending.
8. **Tombstones and expiry** (SYNC-034, SYNC-044, SYNC-045)
   **Given** the phone removes `lightning rush` on Nov 1 and syncs **When** the laptop pulls on Nov 5 **Then**
   it removes `lightning rush`. **When** a later write on Dec 2 happens **Then** that write deletes the
   `cards['lightning rush']` field. **Given** a tablet last synced Oct 20 that still has `lightning rush`
   unchanged **When** it opens on Dec 3 **Then** it does a full read and removes `lightning rush` (absent, not
   pending, synced before) instead of uploading it.
9. **Replace import on another device** (SYNC-014, SYNC-044)
   **Given** both devices hold `hextech ray` and `lightning rush` **When** the laptop commits a Replace import
   containing only `3 Hextech Ray` **Then** one `set()` is written with `lightning rush` as a tombstone, and the
   phone's next pull removes `lightning rush`.
10. **Deck delete, Undo and sync** (SYNC-035, SYNC-018, SYNC-060)
    **Given** signed in **When** RJ deletes `Kennen Tempo` and presses Undo after 4 s **Then** no write is made
    and the deck is identical. **When** he deletes it and waits 10 s **Then** one `set()` writes the tombstone
    (only `schemaVersion`, `createdAt`, `updatedAt`, `deletedAt`, `syncedAt`) and the phone removes the deck on
    its next pull. **Given** instead the phone renamed the deck at a later time than the delete **When** both
    sync **Then** the renamed deck is restored on both devices.
11. **Lock on a deck deleted elsewhere** (SYNC-071)
    **Given** the laptop locks `Kennen Tempo` at 10:00 offline and the phone deletes it at 10:30 **When** both
    sync **Then** the deck is gone everywhere, `state/locks` has an unlock tombstone for it, and the other decks'
    counts no longer subtract its copies.
12. **Edited elsewhere while locked** (SYNC-072, SHARE-028)
    **Given** the laptop locks `Kennen Tempo` at 10:00 and the phone, which hasn't pulled, changes its Hextech
    Ray from 3 to 4 at 10:10 with 3 owned **When** both sync **Then** the deck stays locked, shows "Locked · 1
    card short", and the notice "'Kennen Tempo' changed on another device while it was locked." shows.
13. **Combine leaves a lock short** (SYNC-074, SYNC-068)
    **Given** the account has `Kennen Tempo` locked and `hextech ray` q 3 (`t` 09:00), and the phone has
    `hextech ray` q 2 (`t` 11:00) **When** RJ combines **Then** `hextech ray` is 2, the deck stays locked with
    "Locked · 1 card short", and the notice "'Kennen Tempo' (locked) is now 1 card short." shows.
14. **Same tag label on two devices** (SYNC-065)
    **Given** the laptop created `Trade Binder` (`t_a1B2c3`, created 09:00) on `p:OGN-001a` and synced, and the
    phone, offline, created `trade binder` (`t_Z9y8x7`, created 10:00) on `p:OGN-002a` **When** the phone comes
    online, pulls and merges **Then** one live tag remains, `t_a1B2c3` labelled `Trade Binder`; `p:OGN-002a` is
    rewritten to `[t_a1B2c3]` with a stamp later than any pulled `t` and is pending, `t_Z9y8x7` is a pending
    tombstone, and both are pushed. **When** the laptop next pulls **Then** it has one tag `Trade Binder`,
    `p:OGN-001a` and `p:OGN-002a` both carry `t_a1B2c3`, and `t_Z9y8x7` is a tombstone there too.
15. **Short tag ids** (SYNC-016)
    **Given** a `StoredTags` v2 with tag id `t_01HX3K9…` (26 characters) assigned to 3 targets and used in a
    saved view **When** the app loads it **Then** the tag gets an id matching `^t_[0-9A-Za-z]{6}$`, the 3
    assignments and the saved view use the new id, and the record is `schemaVersion: 3`.
16. **Unreadable store never wipes the cloud** (SYNC-033)
    **Given** signed in and the local `StoredTags` has `schemaVersion: 9` **When** the app syncs **Then** no tag
    write is made, the cloud tags are unchanged, the collection and decks still sync, and the status is `Error`
    with the text "Some data on this device could not be read, so it isn't being synced."
17. **Newer cloud schema** (SYNC-046)
    **Given** `state/collection` has `schemaVersion: 2` **When** the laptop (knowing 1) pulls **Then** it writes
    nothing to that document, Collection edits are disabled with the SYNC-046 message, and decks still sync.
18. **Reopen cost and debounce** (SYNC-040, SYNC-120, SYNC-121, SYNC-122)
    **Given** a laptop signed in as `uA` (`sessionExpected` true, linked uid `uA`) with 10 decks, last synced 1 hour
    ago, cursors set, nothing pending, and no device has written to `uA` since **When** RJ reopens the app **Then**
    exactly 3 reads are billed (the account `get` and 2 empty queries), no full read runs, and 0 writes are made;
    **When** he presses Sync now a minute later **Then** 2 reads are billed. **When** he presses + five times
    on one card within 1.5 s **Then** one collection write is made about 2 s after the last press.
19. **Offline and quota** (SYNC-080, SYNC-082, SYNC-083, SYNC-084)
    **Given** signed in and offline **When** RJ edits 2 cards and closes the tab **Then** the status read
    "Offline · changes are saved on this device · 2 changes not synced yet"; **When** he reopens online **Then**
    the 2 cards are pushed. **Given** Firestore rejects writes for exhausted quota **When** he edits a card **Then**
    the edit is saved locally and the status reads "Sync paused. Your changes are saved on this device."
20. **Sign out keep or remove** (SYNC-090, SYNC-091)
    **Given** signed in with 1 pending change **When** RJ chooses Sign out **Then** the dialog warns "1 change hasn't
    synced yet. They'll be lost if you remove this device's copy." and offers Sync now. **When** he chooses Keep a copy
    **Then** data stays, the app is signed out, and signing in again as `uA` shows no Combine dialog. **When**
    instead user `uB` signs in on that browser **Then** the Combine dialog includes "This device's data was last
    synced with a different account." **When** RJ chooses Remove from this device **Then** every local store and
    the sync log are empty.
21. **Delete account** (SYNC-095, SYNC-096, SYNC-097, SYNC-098)
    **Given** `uA` with 10 live decks and 2 deck tombstones **When** RJ types `delete` and confirms **Then**
    `users/uA` is deleted first, then 12 deck documents and 3 state documents, then the Auth user; local data is
    cleared; the notice "Your account and its data were deleted." shows. **When** the phone opens afterwards and
    `checkAccount()` returns `deleted` **Then** it removes the synced data and shows "This account was deleted.
    Its data has been removed from this device."
    **Given** the deck deletion fails after 5 documents **When** RJ retries **Then** it continues with the rest
    and the Auth user is deleted only at the end.
22. **Security rules** (SYNC-110…114)
    **Given** the emulator with documents for `uA` **When** a client signed in as `uB` gets, lists, creates,
    updates or deletes `users/uA`, `users/uA/state/collection`, `…/state/tags`, `…/state/locks` and
    `users/uA/decks/0b7c…` **Then** every request is denied; **When** `uA` writes `state/collection` with
    `syncedAt` set to a client time, or a deck with 151 `main` entries, or a field `email` on `users/uA` **Then**
    it is denied; **When** `uA` writes each valid shape **Then** it is allowed.
23. **Indexes** (SYNC-115)
    **Given** the deployed `firestore.indexes.json` **When** inspected **Then** every field of `state` and
    `decks` except `syncedAt` has `indexes: []`, and the SYNC-040 queries run without a missing-index error.
24. **Deck edit and delete on a lagging clock** (SYNC-031, SYNC-062)
    **Given** the phone saved `Kennen Tempo` with `updatedAt` 12:00:00.000 and the laptop, whose clock is 10 minutes
    behind, has pulled it **When** the laptop renames it at its local 11:52 **Then** its `updatedAt` is
    12:00:00.001 and the rename wins on both devices; **When** the laptop then deletes it at its local 11:53
    **Then** the tombstone's `deletedAt` is 12:00:00.002 and, after both sync, the deck is deleted on both devices
    and does not come back.
25. **Cancel, then sign in again** (SYNC-004, SYNC-048, SYNC-049, SYNC-044)
    **Given** the phone signed out with `hextech ray` q 1 and deck `Draft A`, never linked, and `uA` has data
    **When** RJ signs in and chooses Cancel in the Combine dialog **Then** the sync log has `uid: null`,
    `lastFullSyncAt: null`, `sessionExpected: false`, and no write was made. **When** he signs in again **Then** the
    Combine dialog shows again, and `hextech ray` and `Draft A` are still on the phone (nothing deleted as absent).
26. **Keep a copy, then restart** (SYNC-002, SYNC-004, SYNC-086, SYNC-091)
    **Given** signed in as `uA` **When** RJ signs out with Keep a copy and reloads the page **Then** no `firebase`
    chunk loads, no Firebase request is made, the message "You've been signed out. Sign in again to sync." is
    **not** shown, and his data is still there. **When** he edits a card and signs in again as `uA` **Then** no
    Combine dialog appears and the edit is pushed.
27. **Session lost** (SYNC-086)
    **Given** signed in as `uA` with 2 pending changes **When** the session's token is revoked and
    `checkAccount()` returns `signed-out` **Then** syncing stops, local data and the 2 pending changes are kept,
    and "You've been signed out. Sign in again to sync." shows; **When** RJ signs in as `uA` **Then** the 2
    changes are pushed with no Combine dialog.
28. **A device with a live session after deletion** (SYNC-053, SYNC-097, SYNC-098, SYNC-113)
    **Given** the tablet is linked to `uA` with a still-valid session and 1 pending deck edit, and `uA` was deleted
    from the laptop **When** the tablet opens **Then** its account check finds `users/uA` missing, it writes
    nothing, calls `checkAccount()`, and on `deleted` removes its synced data; no document reappears under
    `users/uA`. **Given** instead the tablet was already running (account check passed earlier) and `uA` is
    deleted meanwhile **When** it pushes a collection `update()` that fails with not-found **Then** it stops
    writing, keeps the change pending, and runs the same check. **Given** instead the laptop's deletion stopped
    half-way (`users/uA` gone, the Auth user still there) **When** the tablet opens and `checkAccount()` returns
    `ok` **Then** the tablet shows "Your account's data is missing or being deleted. Sync is paused." and writes
    nothing until RJ picks Upload this device's data or Sign out. **Given** `users/uA` is absent **When** a
    client signed in as `uA` tries to create `users/uA/decks/<id>` **Then** the rules deny it, and the client
    runs the SYNC-053 account check rather than the SYNC-118 rejected-write path.
29. **Rejected write and large deck** (SYNC-112, SYNC-118, SYNC-124)
    **Given** a deck `Big Paste` whose `importRemovedLines` has 2,000 entries (≈ 60 KB) **When** it syncs **Then**
    the rules accept it (no list cap). **Given** an **existing** deck (in `knownDecks`, so the write is an update)
    whose `format` is a value the deployed rules don't know **When** it is pushed **Then** the write is denied, the
    deck stays local and pending, the status shows "Some data couldn't be synced: decks (`<deck name>`).", other
    documents keep syncing, and it is not retried until the deck changes. **Given** instead a **new** deck (no
    `knownDecks` entry, never written by this device) with that `format` and `users/uA` present **When** it is
    pushed **Then** the create is denied, the client repeats the account check once, finds `users/uA`, and handles
    the deck as SYNC-118 (rejected, not retried; no further account checks for it).
30. **Invalid pulled item** (SYNC-047)
    **Given** a pulled `state/collection` whose `cards['hextech ray']` is `{ q: 2, t: 5000, p: { 'OGN-001a': 3 } }`
    (Σ p > q) and whose `cards['lightning rush']` is valid **When** merged **Then** `lightning rush` is merged,
    `hextech ray` stays as it was locally and is not pushed over the cloud copy, and the status is `Error` with
    "Some account data couldn't be read."
31. **Delete all local data while signed in** (SYNC-052)
    **Given** signed in as `uA` **When** RJ uses Delete all local data (COLL-074) and confirms **Then** the
    confirmation included "Your account keeps its copy. To delete that too, use Delete account and data.", this
    device's stores and sync log are empty, the app is signed out, and the cloud documents are unchanged.
32. **Lock and unlock on two devices** (SYNC-073)
    **Given** `Kennen Tempo` locked and synced on both devices **When** the phone, offline, unlocks it at 10:00 and
    locks it again at 10:02 (`lockedAt` 10:02), and the laptop unlocks it at 10:05 **Then** after both sync it is
    unlocked on both (10:05 is the later change). **Given** instead the deck is unlocked on both **When** the laptop
    locks it at 10:00 and the phone, offline, locks it at 10:05 **Then** after both sync it is locked on both with
    `lockedAt` 10:05.
33. **Map cap** (SYNC-119)
    **Given** `state/tags` holds 199 live tags and 201 tag tombstones (400 entries, all tombstones under 30 days
    old) **When** RJ creates a tag `Trade Binder` **Then** the write adds it and removes the oldest tombstone with
    `deleteField()` in the same `update()`, the map stays at 400 entries (200 live, 200 tombstones), and the write
    is accepted.
34. **Merge writes are not user changes** (SYNC-041, SYNC-031, SYNC-032)
    **Given** a synced laptop with nothing pending **When** a pull brings `hextech ray` q 4 (`t` 12:05), a renamed
    `Kennen Tempo` (`updatedAt` 12:06) and a new tag, and the merge writes them locally **Then** the local items
    keep `t` 12:05, `updatedAt` 12:06 and the pulled tag `updatedAt`, the pending set is empty, and the sync log's
    `recordUpdatedAt`, hashes and `knownDecks` match the new records; **When** RJ reloads the page **Then**
    reconcile stamps nothing and no write is made.
35. **Sign-in hidden by the build flag** (SYNC-007, SYNC-002)
    **Given** a production build with `signInEnabled: false` **When** any page opens **Then** no Sign in action
    appears in the header or Settings and no `firebase` chunk loads. **Given** a preview build with
    `signInEnabled: true` **When** it opens **Then** the Sign in action is shown.
36. **First sign-in edge cases** (SYNC-048 e, f)
    **Given** `users/uA` exists with `createdAt` Nov 1 and no `state` or `decks` documents, and the phone has 40
    cards **When** RJ signs in **Then** the cards are uploaded, `users/uA` keeps `createdAt` Nov 1 (no `set()` over
    it), and no Combine dialog appears. **Given** instead `users/uA` is absent but `users/uA/state/collection`
    exists **When** RJ signs in on an unlinked phone **Then** nothing from it is imported, sync pauses with the
    SYNC-097 message, and **When** he picks Upload this device's data **Then** the leftover documents are deleted
    before the phone's data is uploaded.

## Out of scope
- Sharing decks or collections with other users, public profiles, friends.
- Real-time live updates between two open devices beyond the SYNC-040 triggers.
- Syncing printing-code memory, view state and saved views (SYNC-019; may join `users/{uid}` later).
- Choosing sign-in providers (H-063, RJ) and the database delete-protection setting (H-063).
- Moving off the Spark plan, usage alerts and budget caps ([[Firestore Data Shape]] decision 1).
- The 8-bucket collection split (future `schemaVersion: 2`, SYNC-123).

## Impacts on other specs and checks (for the orchestrator to file)
- [[Collection Import]] IMP-053 and [[My Collection]] COLL-070, [[Deck Import]] DECK-090, [[Shared Cards and Lock-in]]
  SHARE-060 say "browser only"; they should read "browser by default; synced to the account when signed in
  (SPEC-010)". SPEC-008's Out of scope line "syncing locks between browsers" is superseded.
- [[Deck Import]] DECK-074: `updatedAt` on save becomes `max(now, previous updatedAt + 1 ms)` (SYNC-031) so a
  deck edit on a device whose clock is behind still beats the version it replaced. DECK-094's conflict check is
  unaffected. SPEC-006 MAY also cap `importRemovedLines` (none today; SYNC-112 does not cap it).
- [[My Collection]]: `TagId` becomes `t_` + 6 base-62 characters; `StoredTags` `schemaVersion: 3` with the
  SYNC-016 migration (COLL-071); COLL-074 behaviour while signed in (SYNC-052).
- [[Firestore Data Shape]] read estimates are now low: a reopen is 3 reads (account check + 2 queries, SYNC-040),
  not 2; a first sign-in adds up to 3 + N rule-lookup reads and each new deck up to 1 (SYNC-113, SYNC-120). The
  per-day table (typical ≈ 15 reads) and the DAU figures should be recomputed; the effect is small (≈ +3 reads
  per typical user per day) but the note should match. The `existsAfter()` billing points are `unverified`.
- [[Validation Checks]] V-011: the grep excludes only `services/src/adapters/`, so the `web/` Firebase adapter of
  SYNC-130 would fail it. V-011 needs an allowed `web/` adapter path (e.g. `web/src/app/**/adapters/`).
- [[ADR-0007 Firebase Accounts and Firestore]] "Planned layout": already replaced by the Data shape section; it
  can point to this spec.

## Open questions for RJ
Each has a working default in the requirements so H-062 can build now.
1. **Sign-in providers** (H-063): default proposal Google plus email link; the spec works with any set (SYNC-006).
2. **Merge that leaves a locked deck short** (SYNC-074): default **keep locked and flag** with a notice, as
   SPEC-008 design decision 5. Alternative: auto-unlock that deck.
3. **Deck edited on another device while locked** (SYNC-072): default keep locked with the new contents and a
   notice. Alternative: the lock wins and the edit is discarded.
4. **Lock vs. deletion on another device** (SYNC-071): default deletion wins and the lock is dropped, whatever
   the times. Alternative: a lock made after the deletion restores the deck.
5. **First sign-in with data on both sides** (SYNC-049): default Combine or Cancel only. Alternative: also offer
   "Use only my account's data" and "Replace my account's data with this device's".
6. **Sign-out default** (SYNC-090): default primary button **Keep a copy on this device** (local-first).
   Alternative: Remove as primary (safer on shared computers).
7. **Delete-account wording and friction** (SYNC-095): default type `delete` to confirm; keep-a-copy box
   unchecked. Confirm the text.
8. **Other devices after account deletion** (SYNC-097): default they remove the synced data. Alternative: keep it
   as signed-out data.
9. **Free tier, tombstones, what isn't synced** ([[Firestore Data Shape]] decisions 1–3): this spec assumes the
   recommended answers (Spark with "Sync paused", 30-day tombstones, printing codes and view state not synced).
10. **Privacy notice** (SYNC-101): `BLOCKED: needs research` on what a privacy notice must contain for a free
    fan site with accounts; needs a `researcher` board item. Until then the `signInEnabled` build flag stays
    `false` in production (SYNC-007), so only RJ's local and preview builds offer sign-in.
11. **Account found half-deleted on another device** (SYNC-097, new in 0.2): default pause sync and offer
    "Upload this device's data" (recreates the account) or "Sign out". Alternative: treat it as deleted and remove
    the device's data.

## Changelog
Current: 0.4 (2026-11-23, H-061 validator round 3 fixes). Full history: [[Accounts and Sync changelog]] (archived). New entries go in the archive note.
