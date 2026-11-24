---
tags: [services, data, firestore, design]
status: proposed
as_of: 2026-11-23
board: H-061
decisions: ["[[ADR-0007 Firebase Accounts and Firestore]]"]
sources:
  - url: https://firebase.google.com/docs/firestore/quotas
    tier: official
  - url: https://firebase.google.com/docs/firestore/storage-size
    tier: official
  - url: https://firebase.google.com/docs/firestore/pricing
    tier: official
  - url: https://firebase.google.com/pricing
    tier: official
---
# Firestore Data Shape and Sizing

## Summary
> Read this first. Input to H-061 (the accounts-and-sync spec). Proposed, not yet specced or built.

- **Layout:** `users/{uid}` (account doc), plus three **single "state" documents**
  (`users/{uid}/state/collection`, `…/state/tags`, `…/state/locks`) and **one document per deck**
  (`users/{uid}/decks/{deckId}`). That makes 4 documents plus one per deck for each user.
- **Why:** reads and writes are what the free plan limits, not bytes. One collection document means an
  import of 300 cards costs **1 write**, and loading the collection costs **1 read**. One document per
  printing would cost 300 writes and 3,000 reads. Decks are a document each because they change one at a time
  and "latest change wins" works per deck.
- **Cheap reopen:** every document carries `syncedAt` (the server's time). On open the app asks only for documents
  newer than its last sync, so opening on the same device costs about **2 reads** and downloads almost nothing.
- **Per-card and per-tag timestamps** (`t`, `updatedAt`) let the first sign-in merge, and the conflict
  rule, pick the latest change per card count, tag and deck. Deleted cards and decks leave
  **tombstones**, cleaned up after 30 days.
- **Indexing must be switched off** (`fieldOverrides`) for the big maps and the deck card lists. Otherwise one heavy
  collection makes about 10,800 index entries (≈ 2 MB) and could reach the 40,000-entries-per-document limit.
- **Size:** a realistic user (500 printings, 10 decks, 20 tags) uses **≈ 95 KB**. A heavy user (3,000 printings, 100 decks)
  uses **≈ 640 KB**. The largest single document (a heavy collection) is ≈ 180 KB, against a 1 MiB limit.
- **Free-tier headroom (Spark):** **≈ 1,300 daily active signed-in users** at a mix of 90 % realistic and 10 % heavy users.
  Writes run out first, then outbound data. Storage holds **≈ 7,000 accounts** at that mix (storage counts
  every account, active or not).
- **Decisions for RJ:** see the end of this note.

## Free-tier facts used (Cloud Firestore Standard, Spark plan)
All from the official pages in `sources`, read 2026-11-23. None showed a "last updated" date.

| # | Fact | Source | As of |
|---|---|---|---|
| 1 | Free quota: 1 GiB stored, 50,000 document reads/day, 20,000 writes/day, 20,000 deletes/day, 10 GiB/month outbound data | quotas, pricing, firebase.google.com/pricing | 2026-11-23 |
| 2 | Quotas reset "around midnight Pacific time" | quotas, pricing | 2026-11-23 |
| 3 | Max document size 1 MiB (1,048,576 bytes); max document name 6 KiB; document ID and field name ≤ 1,500 bytes, must not match `__.*__`; max map/array depth 20 | quotas | 2026-11-23 |
| 4 | Max 40,000 index entries per document; 8 MiB of index entries per document | quotas | 2026-11-23 |
| 5 | Max API request 10 MiB; max 500 field transforms per document per commit | quotas | 2026-11-23 |
| 6 | Size: string = UTF-8 bytes + 1; integer, float, timestamp = 8; boolean, null = 1; array = sum of values; map is sized "as for a document"; document = name + field names + values + 32. Document name = its collection IDs and document IDs + 16 | storage-size | 2026-11-23 |
| 7 | Single-field index entry = document name + parent document name + field name + value + 32 bytes. Index entries count as stored data | storage-size | 2026-11-23 |
| 8 | Each set or update is 1 write, however many fields it changes. Each query costs at least 1 read, even if it returns nothing | pricing | 2026-11-23 |
| 9 | A listener that is disconnected for more than 30 minutes (with offline persistence on) is billed as a new query, which re-reads every matching document | pricing | 2026-11-23 |
| 10 | Security-rule `get()`/`exists()` lookups are billed as reads | pricing | 2026-11-23 |

**Not confirmed** (`status: unverified`, check before the spec relies on them):
- Whether documents served from the local cache (`getDocsFromCache`) are free. The pricing page does not say. This design does not depend on it.
- The 1-write-per-second sustained rate per document (a best-practice guideline, not on the quotas page).
- Blaze paid prices for `us-south1`. The Cloud pricing page could not be read on 2026-11-23. They matter only if RJ
  moves off Spark.

## What gets synced
| Browser store (spec) | Synced? | Firestore document |
|---|---|---|
| `CollectionStore` / `StoredCollection` (SPEC-003 IMP-053/054) | yes | `state/collection` |
| `TagStore` / `StoredTags` (SPEC-007 COLL-070/071) | yes | `state/tags` |
| `DeckStore` / `UserDeck` (SPEC-006 DECK-090/091) | yes | `decks/{deckId}` |
| `DeckLockStore` / `StoredDeckLocks` (SPEC-008 SHARE-060/061, draft) | yes | `state/locks` |
| `PrintingCodeStore` / `StoredPrintingCodes` (SPEC-007 COLL-075) | **no** (recommended) | each device rebuilds it from its catalog. Syncing would add ≈ 90 B per printing (≈ 270 KB for a heavy user) |
| `CollectionViewStateStore` (SPEC-007 COLL-060) | no | per browser by design. Saved views (COLL-064) could join `users/{uid}` later |
| Previous collection for undo (IMP-052) | no | device-local, one step |
| Card data, images, ban lists, tournaments | **never** | snapshot and Riot CDN URLs (ADR-0007) |

## Layout
```
users/{uid}                      account doc          1 per user
users/{uid}/state/collection     whole collection     1
users/{uid}/state/tags           tags + assignments   1
users/{uid}/state/locks          deck locks           1
users/{uid}/decks/{deckId}       one deck             1 per deck (deckId = UserDeck.id, UUID v4)
```
Every document has:
- `schemaVersion` (integer): the shape version, for migrations, in the same way as DECK-091. A client that sees a newer
  version than it knows shows the data read-only and never overwrites it.
- `updatedAt` (timestamp, **client** clock): when the user made the change. "Latest change wins" uses it.
- `syncedAt` (timestamp, **server** time, `serverTimestamp()`; rules require `== request.time`): the
  sync cursor. It is the only field the delta queries filter on.

The state documents live in a `state` subcollection, not in the separate `collection/…` and `tags/…` subcollections that ADR-0007 sketched.
The reason is that one query (`state where syncedAt > cursor`) then checks all three in a single read.

### `users/{uid}`
| Field | Type | Notes |
|---|---|---|
| `schemaVersion` | int | account shape version, starts at 1 |
| `createdAt` | timestamp | first sign-in |
| `updatedAt`, `syncedAt` | timestamp | |
| `lastClientVersion` | string | app build that last wrote (debugging migrations) |

### `users/{uid}/state/collection`
SPEC-003 `StoredCollection`, with short field names in the map because it has a field per card:
| Field | Type | Notes |
|---|---|---|
| `schemaVersion` | int | 1 |
| `updatedAt`, `syncedAt` | timestamp | whole document |
| `catalogVersion` | string | IMP-054 |
| `cards` | map `cardKey` → `{ q: int, t: int, p: map printingId → int }` | `q` = `quantity`, `p` = `byPrinting`, `t` = this card's last change (ms since epoch, client). **`q: 0` with `p: {}` is a tombstone** (card removed), dropped after 30 days |

- Edits use `update()` with a `FieldPath('cards', cardKey)` per changed card. Card names contain spaces, commas and
  apostrophes, so a dotted string path must not be used. The server keeps the latest write for each card,
  and an import of 300 cards is one `update()` = **1 write**. A Replace import is one `set()`.
- `StoredCollection` today has only a document-level `updatedAt`. H-061 adds the per-card `t` (and tombstones) to the
  browser record too, otherwise the first sign-in merge cannot tell "removed here" from "never had".

### `users/{uid}/state/tags`
SPEC-007 `StoredTags`, with `tags` stored as a **map by id** (not an array), so one tag can be updated alone:
| Field | Type | Notes |
|---|---|---|
| `schemaVersion` | int | 1 (the browser record is v2. The Firestore shape is versioned separately) |
| `updatedAt`, `syncedAt` | timestamp | |
| `tags` | map `tagId` → `{ label, key, colour \| null, excludeFromDecks: bool, createdAt, updatedAt, deleted?: bool }` | ≤ 200 (COLL-022). A deleted tag is a tombstone for 30 days |
| `assignments` | map `TagTarget` (`p:<printingId>` / `u:<cardKey>`) → array of `tagId` | ≤ 20 per target. Kept when dormant (COLL-029) |

- **Tag ids should be short** (8 characters, e.g. `t_` + 6 random base-62 characters). With a 26-character ULID, the worst
  case SPEC-007 allows (3,000 targets × 20 tags) is ≈ 1.7 MB and goes over the 1 MiB limit. With 8-character ids it is ≈ 620 KB.
  This needs a one-line change to SPEC-007 `TagId` (H-061).

### `users/{uid}/state/locks`
SPEC-008 `StoredDeckLocks` (draft): `schemaVersion`, `updatedAt`, `syncedAt`, `locks`: map `deckId` →
`lockedAt` (timestamp). One document so that the lock order stays in one consistent place. Orphans are dropped on save (SHARE-062).

### `users/{uid}/decks/{deckId}`
SPEC-006 `UserDeck` as it is (`id` is the document ID and is not repeated), plus:
| Field | Type | Notes |
|---|---|---|
| `syncedAt` | timestamp | server time, delta cursor |
| `deletedAt` | timestamp \| null | soft delete (tombstone). The zone fields are emptied and the document is hard-deleted after 30 days |

Zones stay as the spec has them: `legend`/`champion` as maps or null, and `main`, `sideboard`, `runes`, `battlefields` as arrays of
`{ cardKey, name, qty }`.

### Why not finer or coarser
| Option | Import 300 cards | Load collection | Verdict |
|---|---|---|---|
| One document per printing (`collection/{printingId}`) | 300 writes | 500–3,000 reads per cold load | no: 3,000 reads per heavy cold open is 6 % of the whole day's free reads |
| **One collection document** | **1 write** | **1 read** | **yes**: a heavy collection is ≈ 180 KB, so 1 MiB leaves about 5× headroom |
| Collection split into 8 hash buckets | ≤ 8 writes | 8 reads | keep as the migration path if a collection ever passes ≈ 700 KB (bump `schemaVersion`) |
| All decks in one document | 1 write | 1 read | no: 100 decks ≈ 370 KB that must be rewritten for every edit, and there is no per-deck conflict rule |
| **One document per deck** | — | N reads cold, ≈ 1 warm | **yes** |

### Indexes (`firestore.indexes.json`, written with the rules in H-062)
Only the `syncedAt` filter needs an index. Everything else gets a single-field exemption (`fieldOverrides` with
`indexes: []`): `cards` and `catalogVersion` on `state`, `tags` and `assignments` on `state`, `locks` on `state`, and
`legend`, `champion`, `main`, `sideboard`, `runes`, `battlefields`, `source`, `notes`, `importRemovedLines` and `updatedAt` on `decks`.
Without these exemptions a heavy collection document carries ≈ 10,800 index entries (≈ 2.1 MB, three times the user's
data), and a collection of 3,000 cards / 10,000 printings would come close to the 40,000-entry limit, after which its writes fail.

### Security rules (shape only; written in H-062)
Owner-only: `match /users/{uid}/{doc=**} { allow read, write: if request.auth != null && request.auth.uid == uid; }`,
plus per-document validation: allowed keys, `schemaVersion` is an int, `syncedAt == request.time`, and caps that rules
can check cheaply (`cards.size()`, `tags.size() <= 200`, deck array sizes ≤ 150). The rules use no `get()`/`exists()` lookups,
because each one is billed as a read (fact 10).

## Sync flows (cost per flow)
`N` = number of decks. Reads and writes are Firestore billing units.

| Flow | Reads | Writes | Notes |
|---|---|---|---|
| **First sign-in, new account**, browser has data | 3 (account `get` miss + `state` query + `decks` query, each at least 1) | 4 + N (account, 3 state documents, decks) in batches | realistic 14 writes, heavy 104 |
| **First sign-in, account already has data** (merge) | 1 + 3 + N | ≤ 3 + changed decks | merge per card by `t`, per tag by `updatedAt`, tag assignments as a union, per deck by `updatedAt`, tombstones win when newer. Realistic 14 reads |
| **Reopen, same device** | 2 (`state where syncedAt > cursor`, `decks where syncedAt > cursor`) + changed documents | 0 | no long-lived listener on all of `decks` (fact 9) |
| **Open on a second device** (empty cache) | 1 + 3 + N | 0 | realistic 14, heavy 104 |
| **Import 300 cards** (Add or Replace) | 0 | **1** | one `update()` / `set()` on `state/collection` |
| **Edit a deck** | 0 | 1 per save | saves are batched with a ≥ 2 s debounce (also keeps under the 1 write/s guideline) |
| Lock / unlock a deck | 0 | 1 | `state/locks` |
| +/− on collection entries | 0 | 1 per debounce window | |
| Delete account and data | N + 4 | N + 4 deletes | well inside 20,000 deletes/day |

Offline: the browser stores stay the source of truth. Each keeps a "not yet pushed" set and the last `syncedAt` cursor,
so a closed tab with unsent changes pushes them on the next open. Firestore's persistent cache can queue writes as well,
but correctness does not depend on it.

## Sizing
### Assumptions
`uid` 28 characters, `cardKey` 18 bytes on average (e.g. `lightning rush`), `printingId` 8 bytes (e.g. `OGN-001a`; the real
Riot id format is unknown until H-020), `deckId` UUID 36, tag id 8. Nested maps are counted at +32 like a document
(an upper bound). Each indexed field gets 2 entries (ascending and descending).

| Profile | Distinct printings | Cards | Tags | Tagged targets (avg tags) | Decks | Locks |
|---|---|---|---|---|---|---|
| Realistic | 500 | 350 | 20 | 150 (1.3) | 10 | 3 |
| Heavy | 3,000 | 1,200 | 20 | 1,500 (1.5) | 100 | 20 |
| Worst case the specs allow | 10,000 | 3,000 | 200 | 3,000 (20) | 200 | 200 |

### Bytes per item
- Collection card entry: `cardKey` 19 + map 32 + `q` 10 + `t` 10 + `p` 34 = **105 B**, plus **17 B** per printing (8 + 1 + 8).
- Tag: id 9 + map 32 + label 22 + key 20 + colour 14 + flag 18 + 2 timestamps 36 ≈ **153 B**.
  Assignment: target ≈ 15 B + 9 B per tag id.
- Deck card `{cardKey, name, qty}`: 32 + 27 + 24 + 12 = **95 B**. A legal deck (66 cards ≈ 30 entries: 1 + 1 + ~18 main + 2 runes +
  3 battlefields + ~5 sideboard) with a tournament source (≈ 450 B) ≈ **3.7 KB**. The largest allowed deck (150 entries, 4,000-character
  notes, 2 KB of removed lines) ≈ **21 KB**.
- Lock: 37 + 8 = 45 B. Account doc ≈ 210 B.
- Index (after the exemptions): ≈ 400 B per document for `syncedAt` (2 entries × ≈ 200 B).

### Per user
| Profile | collection | tags | decks | locks | index + account | **Total** |
|---|---|---|---|---|---|---|
| Realistic | 350×105 + 500×17 ≈ 45.5 KB | 7.3 KB | 10 × 3.7 = 37 KB | 0.3 KB | ≈ 5 KB | **≈ 95 KB** |
| Heavy | 1,200×105 + 3,000×17 ≈ 177 KB | 46 KB | 100 × 3.7 = 372 KB | 1.1 KB | ≈ 40 KB | **≈ 640 KB** |
| Worst case | ≈ 485 KB | ≈ 616 KB | 200 × 3.7 = 745 KB | 9 KB | ≈ 80 KB | **≈ 1.9 MB** |

The largest single document is the worst-case tags document at ≈ 616 KB, under the 1 MiB limit (only with short tag ids). A heavy collection document is ≈ 177 KB.

**Accounts per 1 GiB** (2^30 B): realistic 2^30 / 95 KB ≈ **11,000**, heavy ≈ **1,700**, mix of 90 % realistic and 10 % heavy (0.9×95 + 0.1×640 ≈ 150 KB) ≈ **7,000**.

### Per day
Daily active user (DAU) means a signed-in user who opens the app that day. Users who never sign in cost nothing.

| Profile | Reads/day | Writes/day | Outbound/day |
|---|---|---|---|
| Typical (realistic) | 3 reopens × 2 + ≈ 5 changed docs pulled + a cold open about once a week (14/7) ≈ **15** | 5 collection saves + 5 deck saves ≈ **10** | 2 changed collection pulls × 46 KB + small ≈ **115 KB** |
| Busy heavy | 5 reopens × 2 + 1 cold open (104) + ≈ 20 changed docs ≈ **134** | 1 import + 30 collection saves + 30 deck saves + 2 locks ≈ **63** | cold open 640 KB + 3 collection pulls × 177 KB + decks ≈ **1.3 MB** |

Daily limits: 50,000 reads, 20,000 writes, 10 GiB / 30 ≈ 358 MB outbound.

| Mix | by reads | by writes | by outbound | **DAU supported** |
|---|---|---|---|---|
| All typical | 50,000 / 15 ≈ 3,300 | 20,000 / 10 = 2,000 | 358 / 0.115 ≈ 3,100 | **≈ 2,000** |
| All busy heavy | 50,000 / 134 ≈ 370 | 20,000 / 63 ≈ 320 | 358 / 1.3 ≈ 275 | **≈ 275** |
| 90 % typical / 10 % heavy | 50,000 / 26.9 ≈ 1,860 | 20,000 / 15.3 ≈ 1,300 | 358 / 0.234 ≈ 1,530 | **≈ 1,300** |

New sign-ins also count: a heavy first sign-in is 104 writes, so 100 new heavy users in one day use about 10,400 of the 20,000 free writes.
What makes the biggest difference: **debouncing saves** (each un-debounced +/− click is a write) and
**not listening to the whole `decks` collection** (each reconnect after 30 minutes re-reads every deck).

## Decisions for RJ
1. **What happens when the free tier runs out?** On Spark, sync stops until about midnight Pacific (or, when storage
   is full, writes fail). Browser storage keeps working, so nothing is lost locally. Recommended: stay on Spark, show
   "Sync paused, your changes are saved on this device", and set a usage alert. Move to Blaze with a budget cap
   when daily use passes about 60 % (≈ 800 DAU or ≈ 4,000 accounts).
2. **Don't sync printing-code memory or view state** (recommended). The cost: a printing that vanished from the catalog
   shows "(id …)" instead of its old code on a device that never saw it.
3. **Tombstones kept 30 days** (recommended). A device that stays offline longer can bring back a deleted deck or card count.
4. Spec-level choices (H-061 can settle these without RJ): short tag ids; per-card `t` in `StoredCollection`; a single
   collection document with the 8-bucket split as a later migration; the `state/` subcollection instead of ADR-0007's
   sketched `collection/` and `tags/`.

## Impacts
[[Collection Import]] (`StoredCollection` gains per-card `t` and tombstones), [[My Collection]] (`TagId` length,
`StoredTags.tags` as a map in Firestore), [[Deck Import]] (soft delete `deletedAt`), [[Shared Cards and Lock-in]]
(`DeckLockStore` synced), [[ADR-0007 Firebase Accounts and Firestore]].
