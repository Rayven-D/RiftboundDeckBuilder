---
tags: [services, contract]
version: 1.39
---
# API Contracts

Owner: **builder**. The UI builds only against this note. Update it *before* behavior
changes, and post breaking changes to the [[Handoff Board]].

Implementation: `services/` (Node `http`, TypeScript). Card shapes are the SPEC-001 0.4.1 data
contract ([[Card Data Model]]); the TypeScript source of truth is `services/src/domain/types.ts`.
The snapshot's own `schemaVersion` is still `'0.2'` (SPEC-001 has not changed the data contract since 0.2),
so `catalogVersion` starts with `0.2+`: that prefix is the snapshot schema version, not the spec version (CARD-068).

## Conventions
- **Base URL: `/api` in every environment** (H-055). The web app's `API_BASE_URL` token is `/api`
  in both `environment.ts` and `environment.development.ts`; callers build `${base}/health` and
  never hard-code a host.
  - **Dev:** `ng serve` proxies `/api` to the services server at `http://localhost:3000`
    (`web/proxy.conf.json`, wired as `proxyConfig` in `web/angular.json` serve options). Run
    `npm run dev` in `services/` and `npm start` in `web/`, then `http://localhost:4200/api/health`
    reaches the API. If you change `PORT` in `.env`, change the proxy `target` to match. The API
    itself is also directly reachable at `http://localhost:3000/api` (CORS below).
  - **Production: API hosting is pending [[ADR-0004 Hosting (Deferred)]].** Until then
    `firebase.json` has no API target: its only rewrite is the SPA fallback
    `"source": "!/api{,/**}"` → `/index.html`, so `/api` and `/api/**` return Hosting's `404`
    instead of the SPA HTML. When ADR-0004 picks a host, add an `/api/**` rewrite to it **before**
    the SPA fallback (Hosting applies the first matching rewrite), e.g.
    `{ "source": "/api/**", "run": { "serviceId": "<service>", "region": "<region>" } }` or
    `{ "source": "/api/**", "function": { "functionId": "<fn>" } }`, and set the server's
    production CORS origins if the API is not same-origin.
- **Read-only.** `GET` and `HEAD` only; other methods → `405`. `OPTIONS` → `204`.
- JSON (`application/json; charset=utf-8`), `Cache-Control: no-store`.
- **CORS:** only `http://localhost:4200`, and only when `NODE_ENV=development` (the default).
- Every data response carries `catalogVersion` (CARD-068) so the UI can tell which snapshot it got.
- **Null means unknown** (CARD-029): `domains`, `isChampionUnit`, `championTag`, `isSignature`,
  `isPreview`, `CardSet.releaseStatus` are `null` until their API source is verified. Show them as
  "unknown" / not evaluated, never as false or empty. `category: "unknown"` is treated the same way.
- Image URLs are exactly what the Riot API provides (`art.fullUrl`, `art.thumbnailUrl`). The API
  never re-hosts images (CARD-005); the UI hotlinks them.
- `cardKey` contains spaces (e.g. `kaisa survivor`): URL-encode it in paths (`kaisa%20survivor`).
- The Riot API key never appears in any response (CARD-002).

## Endpoints

### `GET /api/health`
Always `200`.
```json
{ "status": "ok", "snapshot": "available", "catalogVersion": "0.2+2026-11-20T18:04:00Z" }
```
With no snapshot: `{ "status": "ok", "snapshot": "missing", "catalogVersion": null }`.

### `GET /api/sets`
All sets, in `setOrder` (API order, CARD-071). → `200 SetsResponse` · `503`
```json
{ "catalogVersion": "0.2+2026-11-20T18:04:00Z",
  "items": [ { "code": "OGN", "name": "Origins", "setOrder": 0, "releaseStatus": null, "printingCount": 5 } ] }
```

### `GET /api/cards?page=1&pageSize=50`
Playable cards sorted by `cardKey`, each with its printings in `printingSortKey` order (CARD-070).
| Query | Type | Default | Rule |
|---|---|---|---|
| `page` | integer | `1` | ≥ 1; past the end → empty `items` |
| `pageSize` | integer | `50` | 1–200 |

→ `200 CardPage` · `400 bad-request` · `503 snapshot-unavailable`
```json
{
  "catalogVersion": "0.2+2026-11-20T18:04:00Z",
  "page": 1, "pageSize": 50, "total": 7,
  "items": [ { "cardKey": "kaisa survivor", "name": "Kai'Sa, Survivor", "...": "CardWithPrintings" } ]
}
```

### `GET /api/cards/:cardKey`
One card by `cardKey`. The path value is passed through `nameKey` (CARD-030), so the canonical name
also works (`/api/cards/Kai'Sa%2C%20Survivor`). No fuzzy matching or aliases (CARD-033).
**As built: exact `nameKey` match only.** SPEC-001 0.4 CARD-033 / CARD-034 add a second step (retry with the
leading "a" / "the" dropped on both sides; several matches give `ambiguous`) that `services/` does not do yet
(H-648). Until then `/api/cards/Dreaming%20Tree` is `404` even if the card is "The Dreaming Tree". When H-648
lands, this endpoint's article and `ambiguous` behaviour is written here first.
→ `200 CardResponse` · `404 not-found` · `503 snapshot-unavailable`
```json
{
  "catalogVersion": "0.2+2026-11-20T18:04:00Z",
  "card": {
    "cardKey": "kaisa survivor",
    "name": "Kai'Sa, Survivor",
    "type": "Unit",
    "category": "unit",
    "domains": null,
    "isChampionUnit": null,
    "championTag": null,
    "isSignature": null,
    "isPreview": null,
    "stats": { "energy": 3, "might": null, "cost": 3, "power": null },
    "keywords": ["Accelerate"],
    "tags": ["Kai'Sa"],
    "text": "…official card text…",
    "flavorText": null,
    "printingIds": ["p-ogn-300", "p-rad-sp1-005"],
    "defaultPrintingId": "p-ogn-300",
    "printings": [
      {
        "printingId": "p-rad-sp1-005",
        "cardKey": "kaisa survivor",
        "setCode": "RAD",
        "collectorNumber": "SP1/005",
        "collector": { "key": "SP1/5", "block": "SP1", "number": 5, "suffix": null, "form": "block" },
        "publicCode": "RAD-SP1/005",
        "rarity": "Showcase",
        "variant": { "kind": "unknown", "label": null, "evidence": null },
        "art": { "thumbnailUrl": "https://…", "fullUrl": "https://…", "artist": "…" },
        "extra": { "faction": "Fury" }
      }
    ]
  }
}
```
(Example values are illustrative; the printing list is shortened.)

### Errors
All errors use one shape:
```json
{ "error": { "code": "snapshot-unavailable", "message": "No card snapshot yet. Run `npm run ingest:cards` in services/ to create data/cards.json." } }
```
| HTTP | `code` | When |
|---|---|---|
| 400 | `bad-request` | invalid `page` / `pageSize`, bad URL encoding |
| 404 | `not-found` | unknown route or `cardKey` |
| 405 | `method-not-allowed` | anything but GET / HEAD / OPTIONS |
| 503 | `snapshot-unavailable` | `data/cards.json` doesn't exist yet |
| 500 | `internal` | unexpected error (details only in the server log) |

## Shared types
SPEC-001 0.4.1 shapes (data contract unchanged since 0.2): `CardSnapshot`, `CardSet`, `PlayableCard`,
`Printing`, `CardCategory`, `VariantKind`, `CardLookup`, `VariantRule` / `VariantRulesFile`, `IngestionReport`
(see [[Card Data Model]] → Data contract). Checked field by field against `services/src/domain/types.ts` on
2026-11-26 (H-195): they match. `services/` adds named helper types for inline spec shapes (`CardStats`,
`CollectorInfo`, `CollectorForm`, `RiotRegion`, `NullCountedAttribute`), same fields. SPEC-001 0.4 adds no
field: `looseKey` (CARD-034) is a function, not a stored value, and the SAMPLE marker (CARD-044) has no field
yet (BLOCKED, H-020). API wrappers:
```ts
interface CardWithPrintings extends PlayableCard {
  printings: Printing[];            // printingSortKey order (CARD-070)
}
interface HealthResponse { status: 'ok'; snapshot: 'available' | 'missing'; catalogVersion: string | null }
interface SetsResponse   { catalogVersion: string; items: CardSet[] }          // setOrder order
interface CardPage       { catalogVersion: string; page: number; pageSize: number; total: number; items: CardWithPrintings[] }
interface CardResponse   { catalogVersion: string; card: CardWithPrintings }
type ErrorCode = 'bad-request' | 'not-found' | 'method-not-allowed' | 'snapshot-unavailable' | 'internal';
interface ErrorResponse  { error: { code: ErrorCode; message: string } }
```
Notes for the UI:
- `Printing.extra` holds API fields we don't map yet (e.g. `faction`); don't build on them, they
  may move into real fields once the live payload is verified.
- `variant.kind` is `"unknown"` for every printing until variant rules exist (CARD-040/041).
- Data files behind the API: `data/cards.json` (`CardSnapshot`) and `data/cards.report.json`
  (`IngestionReport`), written by `npm run ingest:cards`.

## Browser-side shared types (deck ownership engine, H-059)
**Not an endpoint.** These run in the browser only (OWN-093): nothing here is sent to or served by
`services/`. The engine lives in `web/src/app/core/decks/` (barrel `index.ts`, shapes in `types.ts`)
because its only consumer is the browser, `services/` isn't hosted (ADR-0004) and `web/` can't import
from `services/`. It is pure: no Angular, no storage, no network, no clock. Shapes follow the specs'
data contracts: [[Shared Cards and Lock-in]] v0.4 and [[Your Decks Ownership View]] v0.5 (runes are
cards: counted, shared and locked like any card, SHARE-006 / OWN-028), plus the parts of SPEC-001/002/003/006/007 they read.

| Group | Types |
|---|---|
| SPEC-008 (0.6, H-665) | `NameLock`, `StoredDeckLocks` (schema 2), `DeckLockV1` / `StoredDeckLocksV1` (read only to migrate), `DeckLockStore`, `SharedPoolInput`, `SharedPool`, `CardPool`, `CardUse`, `DeckLockState`, `CardAvailability`, `LockCheck` (`LockFailure`), `NameLockCheck` (`NameLockFailure`), `LockLoss` |
| SPEC-005 | `CollectionOwnership`, `DeckOwnershipView`, `ZoneSection`, `OwnershipCard`, `OwnedPrintingRow`, `MissingLine`, `CardBan`, `DeckTileSummary` (`OwnershipFilter`) |
| Read from other specs | SPEC-006 `UserDeck`, `DeckCard`, `DeckZone`, `DeckSource`; SPEC-007 `DeckOwnershipInput`, `DeckOwnership`, `CollectionCatalogView`, `StoredTags`, `Tag`, `StoredPrintingCodes`; SPEC-003 `StoredCollection`; SPEC-002 `BanListFile`, `BanStatus`; SPEC-001 0.4.1 `PlayableCard`, `Printing`, `CardSet` (`Printing` is a subset: no `collector` / `extra`; `PlayableCard` and `CardSet` are the full shapes) |

```ts
computeSharedPool(input: SharedPoolInput): SharedPool                              // SHARE-070
availability(pool: SharedPool, deckId: string, cardKey: CardKey): CardAvailability // SHARE-010/011/015
canLock(pool: SharedPool | null, deck: UserDeck, readOnly: boolean, isLocked: boolean): LockCheck // SHARE-020; null = ownership unavailable; isLocked from the lock store; no-cards = no entry at all
canLockName(pool, deck, cardKey, readOnly, isNameLocked): NameLockCheck              // SHARE-081 (H-665)
storedLockState(locks: readonly NameLock[] | null, deck: UserDeck): DeckLockState | null // SHARE-053 (a): locked when every name has a stored lock
storedLockedNames(locks, deck): CardKey[]                                          // OWN-121 (a) icons while ownership is unavailable
countedEntries(deck: UserDeck): { zone; entry }[]                                  // every entry of COUNTED_ZONES (= ZONE_ORDER, runes included)
lockLosses(before: SharedPool, after: SharedPool): LockLoss[]                      // SHARE-087…091: name locks a change drops, latest first
settleLocks(locks: NameLock[], ownedForDecks: (k) => number, decks): NameLock[]   // SHARE-090: the locks to keep (lock order)
migrateLocksV1(v1: DeckLockV1[], decks, ownership: { collection; tags } | null, now): StoredDeckLocks // SHARE-092
ownedForDecksOf({ collection, tags }): (cardKey) => number                         // COLL-081 without a catalog (merge, migration)
deckNeeds(deck): Map<CardKey, number>; compareLockOrder(a, b)                      // need(D, k); SHARE-030 (+ cardKey)
computeDeckOwnership(deck, ownership: CollectionOwnership, catalog | null, banData | null, today): DeckOwnershipView // OWN-025
summarizeDeck(deck, view, legality: { verdict; asOf } | null, format: { id; name } | null): DeckTileSummary
completionPercent(a: number, r: number): number | null                          // OWN-101 (b); null when r = 0
// text helpers: lockCheckMessage(), nameLockCheckMessage() ("Lock needs every copy available: a of q"), cardsShortText(), sharedIndicator()
// v1.37 removed: lockedShortfalls(), shortfallWarning(), shortfallNotice(), LockedShortfall, DeckLock (now NameLock)
// minimal stand-ins until SPEC-007 / SPEC-002 are built in web/: deckOwnership(input, cardKey) (COLL-081),
//   cachedDeckOwnership() (OWN-083, per input object), banStatus(data, cardKey, format, region, asOf) (LEGAL-B10)
```
Notes for the UI:
- Stored-record shapes (`UserDeck`, `StoredCollection`, `StoredTags` schema 3, `NameLock`, …) are defined once,
  in `web/src/app/shared/storage/records.ts`; `core/decks/types.ts` re-exports them. In code `TagTarget` is
  `string` (the spec's `p:` / `u:` pattern is not enforced by type) and `FormatId` is `'standard'`.
- Treat every input as an immutable snapshot. **H-060 must create a new `DeckOwnershipInput` object
  on every change** to the collection, tags, printing codes or catalog. `cachedDeckOwnership`
  reuses results per input object (WeakMap identity), so mutating an input in place would show
  stale counts.
- Treat `BanListFile` as an immutable snapshot too: `banStatus` builds its banned/upcoming lookup
  once per (file object, format, region, asOf) (OWN-080), so load a new object when the ban data
  changes.
- No rune exception anywhere in the engine (SHARE-006, OWN-028): `COUNTED_ZONES` = `ZONE_ORDER`, rune
  entries are allocated, summed, listed as missing (`Rune Pool:` in `missingText`) and held by locks
  like any entry. `OwnershipCard` has no rune flag. Deck entries must be DECK-096-valid (`qty` 1..999).
- Compute one `SharedPool` per input change and pass it to every deck view and tile (SHARE-071).
- Lock order (SHARE-030) is a total order: parsed `lockedAt` ascending with unparseable values
  after every parseable one, then the raw `lockedAt` string, then `deckId`, then (v0.6) `cardKey`.
- **Card-name locks (v1.37, SPEC-008 0.6):** `computeSharedPool` first keeps only valid name locks (deck in the store,
  name counted in it, one per (deck, name)) and settles them (SHARE-090: per name, in lock order, a lock that no
  longer fits is dropped whole, and every later one on that name too); the dropped ones count as not locked. A kept
  lock holds its deck's whole need (SHARE-031), so a locked name is never short. `DeckLockState` = `{ deckId, locked
  (every counted name locked, SHARE-083), lockedAt (latest name lock of a locked deck, else null), lockedNames,
  complete }`; `short` and `cardsShort` are gone. `CardPool` adds `cardName` and `free`; `CardUse` adds `lockedAt`;
  `CardAvailability` and `OwnershipCard` add `nameLocked`; `heldByThisDeck` is set when the name is locked. A tile
  of a locked name reads "q of q locked in" in any deck.
- `canLock(pool, deck, readOnly, isLocked)` (SHARE-020 v0.4.2; v0.6 the deck-level toggle): `isLocked` = every counted name has a name lock in a
  **readable** lock store (pass `false` when the store is unreadable, SHARE-061). `already-locked` is checked first,
  so it is returned also with a `null` pool (ownership unavailable) and on a read-only deck; the engine no longer
  reads the lock from the pool for this check. Show Unlock (no reason line) for `already-locked`.
- `lockLosses(before, after)` (SHARE-087…091, v1.37): every name lock that is locked in `before` and not in `after`
  for a deck still in `after`, latest lock first, as `{ deckId, deckName, cardKey, cardName, copies (= need),
  deckUnlocks }`; empty when free copies cover the change. Render with `app-lock-removal-notice`.
- Ownership unavailable (OWN-062/063, SHARE-053, OWN-065): `CollectionOwnership` `{ status: 'unavailable', locks? }`
  carries the stored locks (`readonly NameLock[]`; `null` = lock store unreadable; omitted = no lock known, treated
  like `null`). **The page must pass the stored locks** so locked decks keep their badge. Then:
  `OwnershipCard.label` is `''` (no count labels); `DeckOwnershipView.lock` is
  `{ deckId, locked: true, lockedAt, lockedNames, complete: false }` when every counted name has a stored name lock
  (lockedAt = the latest), else `null` (`storedLockState`); tiles still carry `nameLocked` from the stored locks. With `status: 'ok'` and `catalog === null`
  (OWN-063) the same state is built from the pool's lock facts (none when `locksIgnored`), holds discarded.
  `DeckTileSummary`: `ownershipLine` "Ownership unavailable", `ownershipFilter` `'unavailable'` (SHARE-051 rule 0,
  for every deck), `lockBadge` "Locked" for a locked deck, never "… cards short"; `null` otherwise.
- `OwnershipFilter` = `'ready' | 'partial' | 'none' | 'locked' | 'unavailable'`; `unavailable` and `locked` match none
  of the three ownership filter options (OWN-006).
- Completion (SPEC-005 v0.10.2 OWN-100, OWN-101; H-311): `DeckOwnershipView.summary` gains
  `completionFill: number | null` (A / R, exact, 0..1) and `completionPercent: number | null` (0 when A = 0, 100 when
  A = R, else `min(99, max(1, floor(100·A/R)))`; e.g. 34/66 → 51, 65/66 → 98, 1/300 → 1, 299/300 → 99). Both are
  `null` when R = 0 or ownership is unavailable (OWN-101 (c), also `catalog === null`). A and R are `copiesAvailable`
  / `copiesRequired` (every zone, runes and sideboard included); in a locked deck A is the copies locked in (50 of 54
  → 92). **The Deck detail header (OWN-010 (f)) and the list tile both read this value; never recompute it.**
- `DeckTileSummary` v0.9 fields (OWN-100…104), all from the same `DeckOwnershipView` (OWN-073), never stored (OWN-026):
  `legend: { name; imageUrl } | null` (the Legend tile's catalog name and `defaultPrintingId` thumbnail; `null` = no
  Legend, unknown card or catalog not loaded → the deck mark; still set while ownership is unavailable, OWN-100 (e));
  `completionFill`, `completionPercent` (= `view.summary`); `bans: DeckTileBans | null` = `{ banned, upcoming,
  upcomingFrom }` counting distinct `cardKey`s, `upcomingFrom` = earliest upcoming `effective` (`null` when
  `upcoming` is 0); `bans` is `null` when ban data is not loaded (any card `'unknown'`; an empty deck then reads
  `{ 0, 0, null }`, which shows nothing either way); `pilot: string | null` (`source.pilot` for a tournament deck,
  OWN-104); `readOnly: boolean` (`schemaVersion` above 1, DECK-091). `UserDeck`, Firestore rules and every
  `schemaVersion` are unchanged; the description is the deck's existing `notes`.

## Card-name locks and major-action sync (SPEC-008 0.6.1, SPEC-010 0.18.1; H-665, H-667)
- **Stored record** `StoredDeckLocks` `{ schemaVersion: 2, updatedAt, locks: NameLock[] }`, `NameLock { deckId, cardKey,
  lockedAt }`, at most one per (deck, name). `LocalDeckLockStore(backend, deckCards, migrate)` reads schema 1 and 2,
  never overwrites a newer or corrupt record, and on save drops name locks whose deck or name is missing (SHARE-062).
  A **v1 record is migrated on load** (SHARE-092) by `migrateLocksV1` (decks, collection and tags read raw) and written
  back as v2 (raw, so the next reconcile stamps the new entries and syncs them); v1 is never written again.
- **Cloud** `users/{uid}/state/locks`: `locks` map keyed `<deckId>|<cardKey>` → `{ lockedAt: timestamp | null,
  updatedAt: timestamp }` (SYNC-017), written with one `FieldPath` per entry. `parseNameLockKey(key)` splits at the
  first `|`; a key without `|` is the old per-deck shape. Migration: a pulled old **live** entry becomes one lock per
  counted name the old rule held in full (same `lockedAt`, stamped now, pending); every old key becomes a pending
  tombstone that the next push removes with `deleteField` (`planPush` purges legacy keys instead of writing a
  tombstone), in the same `update()` as the new entries. `MAP_CAPS.locks` = 6000 (SYNC-112); the rules cap matches.
- **Merge** (`mergePulled`): per-key LWW (SYNC-073); SYNC-071 deleted decks drop their name locks; SYNC-072 /
  SHARE-093 a locked name whose need changed elsewhere (or that left the deck) drops (pending), the notice "'<deck>'
  changed on another device while it was locked." shows when the deck had a lock before the merge; then SHARE-090 /
  SHARE-091: the locks the pull left short drop with one `lockDropNotice` (see "Browser stores and sync").
- **SyncEngine.majorAction()** (SYNC-126): signed in, not stopped / deleting, `isOnline()` and gate `open` → cancels
  the pending debounce and runs one full pass (`pullAndMerge` always, then `pushPending`); if any pass is running
  (`guard` counts them) it sets one follow-up flag and exactly one more pass runs when the last one ends. Offline,
  signed out or gate closed: nothing (stays pending). Deck deletions: `scheduleChange` arms no debounce when the only
  pending items are deletions inside their 10 s window; a separate Undo-window timer calls `majorAction()` when a
  deletion's window has ended and it is still pending (an Undo cancels it, so nothing runs).
- **AppStores.majorAction()** (`core/storage/app-stores.ts`): the app-level hook features call after a local save;
  `SyncService` connects it to the engine (`connect(changed, readOnly, major)`). Callers: `DeckImport.commit`,
  `CollectionImport.commit` / Undo, Deck detail Duplicate, every `DeckLocks` change (not the Delete lock release).
  "Add to your decks" / "Add another copy" (DECK-060 / DECK-064) are not built yet; they must call it when they are.
  Test stubs: since v1.39 (H-679) use the real `AppStores` over test stores, `provideTestStores(stores)`
  (`core/storage/testing/test-stores.ts`, the `ACCOUNT_STORES` token), not a `{ stores, majorAction }` object.
- **Guest test data (v1.39, H-679, SPEC-013 TEST-060…068):** `AppStores.account` is the account cache over
  `localStorage` and is the only store set `SyncService` gives the engine. `AppStores.stores` is a stable facade whose
  members resolve on each access: the guest stores while `AppStores.guest()` is true, else `account`. Guest stores come
  from `createGuestStores()` (a fresh `MemoryBackend`, no sync hooks) and are switched in by `enterGuest()` /
  dropped by `leaveGuest()`; `majorAction()` does nothing in guest mode. `SignInGate.content()` = `open() || guest()`
  decides what Collection, Decks and deck detail render; `open()` alone still gates imports, deck saves and
  Tournaments' deck controls. `GuestTestData.load(set)` (signed-out only) / `discard()`; `changed` emits after a guest
  Load or Change set. `SyncService` calls `leaveGuest()` on the first status that isn't `signed-out` (a sign-in) and
  `externalWrite()` after every status.

## Deck legality engine (SPEC-002 0.5, H-194)
**Not an endpoint.** Browser only, pure (LEGAL-R01): `web/src/app/core/legality/` (barrel `index.ts`, shapes in
`types.ts` = the SPEC-002 data contract; `LegalityFormatId` is `'standard'`). There is no API copy yet (LEGAL-R06 wants
the same evaluator in the API; `services/` has no legality endpoint and is not hosted, ADR-0004).

Data files (versioned JSON in `data/`, LEGAL-B01, LEGAL-C01), bundled into one lazy chunk by
`CardData.loadLegalityData(): Promise<LegalityData | null>` (`{ bans: BanListFile; formats: FormatsFile }`, once per
session, a failed load retries next call); `loadBans()` reads the same promise.
- `data/banlist.json` (`schemaVersion: 1`, `dataVersion: "2026-11-24.1"`): `standard`/`global` `verified`, the four
  SPEC-002 waves (B09: 15 cards + 7 battlefields as of 2026-11-23); `2v2`/`global` `status: 'unverified'` (LEGAL-B11,
  data only, never offered or evaluated): one snapshot wave `2v2-before-2026-11-23` (Master Yi + 6 cards + 5
  battlefields, not a Riot wave, see its `notes`) and the Radiance wave `2v2-2026-11-23`.
- `data/formats.json` (`schemaVersion: 2`, `dataVersion: "2026-11-24.1"`): `standard` only, deck rules 40 exact / 3 / 3
  / 12 / 3 / 10, the nine SPEC-002 set rows, `excludedSets: ['OPP','JDG','PR']`, `notes` (why). No `2v2` `FormatDef`
  (no 2v2 deck rules are specified).

```ts
evaluateLegality(req: LegalityRequest, catalog: LegalityCatalog, bans: BanListFile, formats: FormatsFile): LegalityResult
  // every section A rule (LEGAL-001…019 incl. 006a) in ID order; throws for a format without a supported FormatDef (LEGAL-R05)
legalityCatalog(view: CollectionCatalogView): LegalityCatalog   // cached per view object; isSample = NO_SAMPLE_MARKER
toDeckInput(deck: Pick<UserDeck, zones>): DeckInput             // SPEC-006 mapping, canonical names
verdictOf(rules): 'legal' | 'illegal' | 'incomplete'            // LEGAL-R04
supportedFormat(formats, id): FormatDef | null
setStatus(def, region, catalogSets, code, asOf): SetStatus       // LEGAL-C02: legal | excluded | not-yet | preview | rotated | unknown
bannedSet(bans, format: string, region, asOf): Map<cardKey, { entry, wave }>   // LEGAL-B02 (also used by banStatus)
checkFormats(file, catalog?, today?): DataIssue[]                // C06, C08 (official Riot host for any date), C09 warnings
checkBanList(file, catalog?): DataIssue[]                        // dates, B06 sources, B05 names resolve with matching kind
```
- `LegalityCatalog { catalogVersion, cards: Record<cardKey, LegalityCardView>, sets: LegalitySetView[], isSample? }`.
  **LEGAL-C10 is stubbed:** `isSample(card, printing)` decides SAMPLE; SPEC-001 CARD-044 has no marker yet (H-020), so
  the browser catalog uses `NO_SAMPLE_MARKER` (always false) and nothing guesses from set code or number. When the
  marker exists, set `isSample` in `legalityCatalog`.
- Names resolve through the CARD-033/034 `nameLookup` (exactly one `cardKey`, else LEGAL-019; no aliases). Unknown
  names are skipped by the other rules, which report them as `not_evaluated` ("Unknown cards not checked: …"); count
  rules (003, 008, 010, 013) still count their quantities.
- Dates are calendar dates compared as `YYYY-MM-DD` strings (LEGAL-B12); messages use `formatIsoDate` (LEGAL-R08).
- `upcomingBans` lists only the deck's cards (ban: not banned now; unban: banned now) from waves with
  `announced <= asOf < effective`.
- `notEvaluatedReason` texts: `NOT_EVALUATED_TEXT` in `rules.ts` (not worded by the spec).
- **H-676 (SPEC-002 0.7, LEGAL-R09):** `RuleResult.notEvaluatedItems?: NotEvaluatedItem[]` next to the unchanged
  `notEvaluatedReason`. `NotEvaluatedItem { text, label?, cardNames? }`: one per reason, in the order of
  `notEvaluatedReason` (the reasons joined by a space); `text` is the full reason line; `label` (the text before the
  colon) and `cardNames` (distinct names, engine order) only on a reason that lists cards (Missing domain / card
  type / champion / Signature data, Set status unknown, Printing type unknown, Unknown cards not checked). Present
  only when `status = 'not_evaluated'`. Types: `web/src/app/core/legality/types.ts`. The `NOT_EVALUATED_TEXT`
  list builders register their label and names under the reason text and `result()` reads them back.
  UI: `ReviewLegality.notCheckedItems` (Deck Import review) and `RuleCheckContent.notCheckedItems` (Deck detail
  Rule check) feed `app-not-checked-list`: "<label> {n} cards" ("1 card"), "{n} unknown cards not checked", names
  behind "Show cards" / "Hide cards". `notChecked: string[]` stays as the plain-text form.

## Browser stores and sync (SPEC-010, H-062)
Not an HTTP API: the browser talks to Firestore directly ([[ADR-0007 Firebase Accounts and Firestore]]).
Shapes are the SPEC-010 data contract ([[Accounts and Sync]]); TypeScript source of truth:
`web/src/app/shared/storage/records.ts` (store records) and `web/src/app/shared/sync/sync-types.ts`
(documents, `StoredSyncLog`, `AuthService`, `RemoteStore`, `SyncStatus`).
- **Stores features use** (`AppStores.stores`, `web/src/app/core/storage/`): `collection`, `tags`, `decks`,
  `locks` implement the SPEC-003/006/007/008 interfaces unchanged and stamp every save in the sync log
  (SYNC-031), signed in or not. Storage: `localStorage`, keys `rift.*` (one key per deck,
  `rift.deck.<id>`). Unreadable or newer records throw `UnreadableRecordError` and are never overwritten.
- **Behaviour callers must know:** `DeckStore.create/update` make `updatedAt` monotonic
  (`max(now, previous + 1 ms)`, SYNC-031), so read the deck back with `get()` after saving.
  `DeckStore.create(record)` of a deck deleted less than 10 s ago is the Undo and cancels the pending
  tombstone (SYNC-035). `CollectionStore.save(c, { replace: true, snapshotPrevious: true })` marks an
  Owned Cards Import in Replace mode (one `set()`, SYNC-014) and keeps the Undo snapshot (IMP-052).
  With no record yet, `snapshotPrevious` keeps an **empty** snapshot stamped `EMPTY_SNAPSHOT_AT`
  (`1970-01-01T00:00:00.000Z`, `shared/storage/records.ts`), so the first import can be undone (v1.22).
  `DeckStore.newerDecks()` (v1.26, DECK-091): the deck records with `schemaVersion` above 1 that still have the v1
  shape, for read-only display only (`list()` skips them; never written). The lock store counts them as existing
  decks, so a lock on a read-only deck is not dropped as an orphan (SHARE-062).
  `TrackedCollectionStore.clearPrevious()` / `RawCollectionStore.clearPrevious()` remove the snapshot (an Undo
  spends it, IMP-075 b); not stamped, the snapshot is a cache record only.
  Saves to an area whose cloud document is newer throw `ReadOnlyAreaError` (SYNC-046 message).
  `TagStore.load()` migrates long tag ids to `t_` + 6 base-62 (`schemaVersion: 3`, SYNC-016).
- **Browser cache (SPEC-010 SYNC-140…146, H-172):** the stores are the signed-in account's cache. There is no
  browser-only delete (SPEC-007 COLL-074 and SYNC-052 withdrawn; `BrowserStores.clearCollectionData()` and
  `COLLECTION_DATA_KEYS` removed in H-172). `clearLocalData(backend)` (every `rift.*` key) is the only clear, and
  only the SYNC-142 events call it: sign-out (SYNC-091), account deletion (SYNC-096), the SYNC-097 deleted /
  half-deleted sign-outs and the first-sign-in clear (SYNC-048). Keys outside `rift.*` (the browser's HTTP cache of
  the card catalog and images, Firebase Auth's own session, and the device theme `device-theme`, v1.16) are not
  touched. There is no `SyncService.deleteLocalData()`.
- **Engine form of documents:** every Firestore `Timestamp` is milliseconds inside the engine; the adapter
  (`web/src/app/core/sync/adapters/firebase-adapters.ts`, the only Firebase import, lazy-loaded) converts
  and writes `syncedAt` with `serverTimestamp()`.
- **Additions to the SPEC-010 contract** (needed to build it; listed for the spec): `RemoteStore.getAccount(uid)`
  (the 1-read account check), `pull(..., { withAccount })`, `push()` returns a per-document `PushOutcome`
  instead of `void`; `PushChanges` carries `replace` per state document, `updatedAt`, and the account
  write as `{ create, createdAt, updatedAt, lastClientVersion }` (no `batch` flag since v1.5: `push()` writes
  one document at a time, in order, account first); `AuthService.restore()`,
  `sendEmailLink(email, returnTo?)` (H-145), `isEmailLinkReturn()`, `needsRecentSignIn()`, `canReauthenticate()` (H-143), `signIn(providerId, email?)`;
  `StoredSyncLog.cloudDocs` (documents known to exist, for create vs update), `pending.collectionReplace`,
  `locks[id].h` (lockedAt), `deckTombstones[id].createdAt` and `.wasPending`; after H-062 round 1 also
  `deckCreated` (deck createdAt for tombstones), `lastBuild` (this device's build: SYNC-118 retry and the
  once-per-build account update), `uploadingUid` (v0.7 only: no longer written since H-081, an old value is
  ignored and dropped by the first-sign-in clear), `deletingUid` (this device's unfinished deletion: sync stopped, Delete retryable);
  `AuthService.reauthenticate()` may return `'needs-sign-in'` (email link); `RemoteErrorCode` adds
  `'unconfirmed'` (a write not acknowledged in 20 s: kept pending, confirmed by the next pull).
- **Unfinished deletion and Cancel deletion (SYNC-096, H-127):** `RemoteStore.deleteAll(uid)` returns
  `DeleteAllResult = 'ok' | { remaining: number; removedAny: boolean }`. `removedAny` is true when this
  attempt removed a document, or when the failing delete timed out (`'unconfirmed'`, may still land); a failed
  deck-list read (before the first delete) returns `{ remaining: 4, removedAny: false }`. Sync log
  `deletingRemovedAny?: boolean`: false when `deletingUid` is first recorded (a retry keeps it), true once an
  attempt reports `removedAny` or `deleteAll` returns `'ok'`, never back to false; cleared with `deletingUid`.
  A log that has `deletingUid` without the field (older build) counts as "something removed".
  `SyncEngine.unfinishedDeletion(): { canCancel } | null` and `cancelDeletion(): Promise<boolean>`
  (exposed as `SyncService.deletion` and `cancelDeletion()`): Cancel is allowed only while
  `deletingRemovedAny === false`; it clears both fields, notifies "Your account wasn't deleted." and runs a
  normal sync (account check, pull, push).
- **Account menu identity and deletion state (SYNC-003, SYNC-084, SYNC-096, SYNC-100; H-141, H-142):**
  `AuthService.currentEmail(): string | null` (the signed-in user's address as Auth reports it; Firebase
  adapter: `auth.currentUser?.email ?? null`), exposed as `SyncEngine.currentEmail()` (null while signed out
  or stopped) and `SyncService.currentEmail()`. Read on every call (the menu template calls it as it renders);
  never cached, stored, synced or logged. `SyncEngine.status()` order: signed-out, then this device's
  unfinished deletion (Error "Some data couldn't be deleted. Try again.", above Offline and Paused: SYNC-084
  and SYNC-096 have no offline carve-out), then offline, paused, other errors, syncing, synced.
  `statusText()` drops the pending count for that deletion Error; other statuses keep it.
  `SyncStatus.pendingCount` still carries the real count.
- **Delete dialog state at open (SYNC-095, SYNC-096 step 1; H-143):** `AuthService.canReauthenticate(): boolean`,
  true only when Google is an enabled provider (SYNC-006) and `currentUser.providerData` has `google.com`
  (Firebase adapter; `reauthenticate()` uses the same check before the popup). `SyncEngine` and `SyncService`
  expose `needsRecentSignIn()` and `canReauthenticate()`; both return false while no session is loaded or the
  engine is stopped. The account menu reads `needsRecentSignIn() && !canReauthenticate()` once when it opens the
  delete dialog (`DeleteAccountDialogData.signInFirst`); the dialog closes with `true` (delete), `'sign-out'`
  (open the SYNC-090 dialog) or nothing. The engine's step 1 check on confirm is unchanged.
- **Sign-in gate and device clears (SYNC-009/048/086/090/091/097, H-081; every build since H-172):** there is no
  build flag (`signInEnabled` and the `SIGN_IN_ENABLED` token were removed in H-172, SYNC-007); the header account
  control and `SyncService.start()` run in every build and load `firebase` only on a SYNC-002 trigger.
  `AUTH_PROVIDERS` (SYNC-006) now lives in `core/sync/auth-providers.ts` (was `sign-in-flag.ts`).
  - Sync log `sessionLostUid?: string | null`: set to the linked uid when a lost session is detected (SYNC-086);
    cleared by a successful sign-in with that uid, by a start-up whose restore returns the linked uid and passes
    the account check, and by every log clear (`emptySyncLog()` writes `sessionLostUid: null` and no longer writes
    `uploadingUid`).
  - Gate (pure, `web/src/app/shared/sync/gate.ts`): `gateState(log, { firstSyncFailed?, sessionLost? })`
    → `'open' | 'signed-out' | 'session-lost' | 'first-sync' | 'first-sync-failed'` (H-172: the first
    `signInEnabled` parameter is gone). `LocalSyncLogStore.peek()` reads the log synchronously so the gate is right at the first frame.
    `SyncEngine.gate()` adds the session's runtime state. Angular: `SignInGate` (`core/sync/sign-in-gate.ts`):
    `state`, `open`, `deckControls` (Tournaments Add to your decks / In your decks / Add another copy render only
    while true), `signIn(trigger?: HTMLElement)` (H-172: `offerDeleteLocalData` removed),
    `retry()`; kept current by `SyncService`. **H-125:** `SyncService.openSignIn(trigger?: HTMLElement)`: the header
    and panel Sign in pass their button; the dialog opens with `restoreFocus: trigger ?? true`, and after close
    `refocusAfterDialog(trigger)` (exported from `sync.service.ts`) puts focus on the trigger, or `#main` when the
    trigger is gone, only if focus ended on `<body>`. **H-108:** an email link opened with no stored address
    (`rift.emailForSignIn`) opens `ConfirmEmailDialog` (`sync-dialogs.ts`), which closes with the trimmed address
    or `undefined` (Cancel, Escape, backdrop: no sign-in, no message); no native browser prompt. It opens at
    `width: '28rem'`, and after close `focusDocumentStart()` (exported from `sync.service.ts`) focuses `<body>`
    with a temporary `tabindex="-1"` if focus was left on `<body>`, so one Tab reaches Skip to content. Gated pages render `<app-sign-in-panel page="collection|decks|import">` instead of
    their content.
  - `SyncEngine.signOut(): Promise<'ok' | 'offline'>` (no mode): clears every local store and the sync log;
    refused offline. `SyncService.deleteLocalData()` removed. First sign-in: clear, full read, download or create
    the account (or the SYNC-048 f half-deleted branch), link; no Combine, no upload, no `batch`. Removed:
    `EngineDeps.confirmCombine`, `CombineQuestion`, `CombineDialog`, `MESSAGES.uploaded`/`differentAccount`,
    `LocalAdapters.clearSynced` (SYNC-097 `deleted` now uses `clearAll`), `mergePulled`'s `mode` and the Combine
    union, `liveCounts`, `cloudCounts`.
  - First-sign-in writes (SYNC-050, H-077): the flow sends at most one `push()`, carrying only `account`
    (`planAccountPush` in `push-plan.ts`): case a `create: true`; cases c / e `create: false` only when the
    account's `lastClientVersion` differs from this build; case f nothing. Anything the download leaves to write
    (an expired deck tombstone to purge, a merge repair) waits for the first regular push. `PushChanges.batch`,
    `PlanOptions.batch` and the adapter's `writeBatch` chunking are removed.
  - Sign-out dialog data: `{ pending: () => number; online: Signal<boolean>; syncNow: () => Promise<void> }`; it
    closes with `true` to sign out.
- **Email link return and "You're signed in." (SYNC-006, AC 52, AC 39; H-145):**
  - Pure helpers (`web/src/app/shared/sync/return-path.ts`): `LINK_PARAMS` = `mode`, `oobCode`, `apiKey`, `lang`,
    `continueUrl`; `safeReturnPath(raw, origin): string` returns `raw` as an app path and query, or `/` unless it
    starts with exactly one `/` (not `//` or `/\`), resolves to `origin`, and does not normalize to `//…`; it drops
    the five parameters by name (wherever they are; the user's own query text is kept as written) and any
    `#fragment`. `returnTarget(href)` = `safeReturnPath` of the location's own path and query; the `continueUrl`
    parameter is never read.
  - Sending: `AuthService.sendEmailLink(email, returnTo = '/')`; the Firebase adapter sends
    `{ url: location.origin + safeReturnPath(returnTo, location.origin), handleCodeInApp: true }`.
    `SyncEngine.sendEmailLink(email, returnTo?)` passes it through; `SyncService.sendEmailLink(email)` reads
    `safeReturnPath(router.url, location.origin)` when Send link or Send again is pressed (header and panels alike).
    Nothing is stored beside the address (`rift.emailForSignIn` is unchanged).
  - Completing: the adapter no longer edits the URL (`history.replaceState` removed). New optional
    `EngineDeps.leaveSignInLink(): Promise<void>`, called by `SyncEngine.signIn('email-link', …)` after Firebase
    accepts the code (before the notice and the first-sign-in flow) and when Firebase rejects the code itself
    (`SPENT_LINK_CODES` = `auth/invalid-action-code`, `auth/expired-action-code`; `isSpentLinkError(e)` reads the
    error's `code` duck-typed). Every other failure (the lazy chunk didn't load, `auth/network-request-failed`,
    `auth/invalid-email`, no code), a cancel (no address) and offline keep the URL, so a reload can retry; the
    SYNC-005 error shows for every failure. An error from `leaveSignInLink` is ignored. `SyncService` implements it as
    `router.navigateByUrl(returnTarget(location.href), { replaceUrl: true })`, with `history.replaceState` as a
    fallback only if the Router refuses and the code is still in the URL.
  - `MESSAGES.signedIn` = "You're signed in.", notified as `success` in `SyncEngine.signIn()` (email link and
    Google) right after the uid arrives, before `openSession()`; `start()` (restore) never sends it.
  - **Name locks a pull leaves short (SYNC-068, SYNC-074 v0.18, H-665; supersedes H-148's text):** the merge itself
    drops them (SHARE-090 with `settleLocks` over the merged collection and tags via `ownedForDecksOf`, no catalog),
    stamps the drops as pending unlock tombstones and adds **one** `info` notice: `lockDropNotice(lines)` (exported
    from `merge.ts`) = "Locks removed after a change on another device." + one sentence per deck, "'<deck>' is no
    longer locked: <names> unlocked." (deck was locked) or "'<deck>': <names> unlocked." (partly locked), joined by
    spaces (H-148's single-notice form). Only locks the pull caused are dropped: one that fitted before the merge, or
    one that arrived with it. `EngineDeps.shortfalls` and `lockedShortfallNotice` are removed.
  - **Major action (SYNC-126, H-667):** `SyncEngine.majorAction()`; see "Card-name locks and major-action sync".
  - **Firebase continue URL with a query (verified on the Auth emulator, firebase-tools 15.37.0, 2026-11-24;
    `web/rules-tests/email-link-return.test.ts`):** the emailed link is
    `http://127.0.0.1:9099/emulator/action?mode=signIn&lang=en&oobCode=…&apiKey=…&continueUrl=<encoded continue URL>`.
    Opening it answers `303` to the continue URL with Firebase's parameters **appended** to the continue URL's own
    query: `…/import?type=deck` lands on `…/import?type=deck&mode=signIn&lang=en&oobCode=…&apiKey=…` (`/` lands on
    `/?mode=signIn&…`). The query is not nested, the landing URL has **no `continueUrl`** parameter, and a
    `#fragment` stays at the end (`/decks?x=1#a` → `/decks?x=1&mode=…#a`; the app never sends one). The emulator
    does **not** check the continue URL's domain (`https://example.org/evil` is redirected to as is), which is why
    the app checks the path on both sides. Production (Hosting's `/__/auth/action` handler, authorized domains)
    is still `unverified`; the app strips by name, so it works whether production appends or adds `continueUrl`.
- **SYNC-097 Auth codes (verified on the Auth emulator, 2026-11-23):** deleted user → `reload()`
  `auth/user-token-expired`, forced refresh `auth/invalid-refresh-token`; revoked → `reload()`
  `auth/user-token-expired` (refresh still works in the emulator); disabled → `auth/user-disabled`.
  `checkAccount()` forces a refresh first; `auth/invalid-refresh-token` / `auth/user-not-found` → `deleted`.
- **Rules and indexes:** `firestore.rules` (owner only, known paths, field validation, `existsAfter()` on
  creates) and `firestore.indexes.json` (every field but `syncedAt` exempt). Not deployed: deploy with
  `firebase deploy --only firestore` before sign-in ships (SYNC-117).

- **Header account, username, theme, imports from their pages (SPEC-010 v0.14 SYNC-150…159, H-176; username limits v0.15, H-207; rules check v0.16, H-213):**
  - **Account document:** `AccountDoc.username?: string` (SYNC-156): absent until chosen, never written at creation.
    Rules (`firestore.rules`): `validAccount` (create) allows exactly the five keys, so a `username` on create is
    denied; `validAccountUpdate(d, resource.data)` (update) allows `username` when the request has no `username`
    key, **or** it equals the stored one (unchanged, not re-checked), **or** `validUsername(d.username)` holds
    (SPEC-010 v0.16 SYNC-160, SYNC-112; H-213). `validUsername(u)`, cheapest test first: `u is string`;
    `u.size()` 1 to 80 (a bound that keeps long strings away from the pattern, not the user limit);
    `u.matches("^[\\p{L}\\p{Nd}][\\p{L}\\p{Mn}\\p{Mc}\\p{Nd} ._'’-]{0,19}$")` (the SYNC-153 (4) allowed set and
    **1 to 20 code points**: RE2 repetitions count code points); `!u.matches('.*[\\x{FE00}-\\x{FE0F}\\x{E0100}-\\x{E01EF}].*')`
    (no variation selector; they are `Mn`, so the class admits them); `!u.matches('.* $')` (no trailing space);
    `!u.matches('.*  .*')` (no two spaces in a row). The first pattern is a **double-quoted** rules string: the rules
    compiler refuses `\'` inside a single-quoted one (`Unexpected ']'`, H-213; SYNC-160 (c) allows either). Only
    U+0020 is a space for the rules (U+00A0 is denied); line terminators are refused by the first pattern. The rules
    cannot check NFC: an NFD name (`Zoe` + U+0301) passes them; the client always sends NFC (SYNC-160 (f)). An update
    that leaves the stored name as it is (or absent) passes without any username test, so a name saved under v0.14
    (emoji, up to 456 UTF-16 units) never blocks the per-build `lastClientVersion` update; setting a *different*
    name that breaks the rules (e.g. `😀`) is denied. **Verified on the Firestore emulator 2026-11-25 (H-213,
    `web/rules-tests/firestore.rules.test.ts`): `\p{L}`, `\p{Nd}`, `\p{Mn}`, `\p{Mc}` and `\x{..}` (BMP and
    supplementary) work, `{0,19}` counts code points (20 × U+1D400 allowed, 21 denied; 20 × `a` allowed, 21
    denied), the literal `’` in the rules source works (`O’Neil` allowed), and `a` + U+FE0F is denied by the
    variation-selector clause (with that clause removed it is allowed). Production: `unverified` until the SYNC-160
    (g) production check after the deploy.** **`string.size()` counts UTF-16 code units on the Firestore emulator**
    (verified 2026-11-25 by the H-183 probe; since H-213 the probe runs on `lastClientVersion` (≤ 40), because no name
    the pattern allows can exceed 80 in any unit: 15 × U+1F600 = 30 units allowed, 25 × U+1F600 = 50 units denied;
    production `unverified`).
  - **Shared username test data** (`web/src/app/shared/account/username-cases.ts`, test-only, not imported by the
    app): `ALLOWED_USERNAMES`, `DENIED_USERNAMES` (`{ label, value }[]`, the AC 22 lists plus `a` + U+E0100 and
    `RJ` + line feed + `Smith`), `BOLD_A`. `username.spec.ts` runs them through `checkUsername`; the rules tests run
    them through the rules, and assert the SYNC-160 (f) invariant: every name with `normalizeUsername(n) === n` gets
    the same verdict from both.
  - **`RemoteStore.setUsername(uid, username): Promise<'ok' | RemoteErrorCode>`** (SYNC-155): one `updateDoc` of
    `users/{uid}` with `username`, `updatedAt` (client ms) and `syncedAt: serverTimestamp()`; never a `set()` (a missing
    account is `not-found`, not recreated); 20 s timeout as other writes (`'unconfirmed'`); never throws.
    `getAccount()` returns `username` when the stored field is a string. Not a push: no `PushChanges` field, no pending item.
  - **Sync log:** `StoredSyncLog.username?: string | null` (SYNC-156 b): written from every account-document read (the
    first-sign-in full read, the session's account check, the `getAccount` recheck) and after a successful save;
    `emptySyncLog()` writes `username: null`, so every SYNC-142 clear removes it.
  - **Engine:** `SyncEngine.username(): string | null`; `SyncEngine.setUsername(value)` →
    `'ok' | 'offline' | 'not-ready' | 'failed'` (`value` already normalized; `'not-ready'` while the gate is not open,
    SYNC-154); new optional `EngineDeps.onAccountCreated()` (SYNC-154): called once per uid per page load when the
    first-sign-in full read finds no account and no cloud data (SYNC-048 a), before the account create.
    `SyncService`: `username` (signal, first value read synchronously from the log), `accountReady` (gate open),
    `saveUsername(value)` (notifies "Username saved." as `success`), `promptUsername()`; `signedIn` is also true while
    the log expects a session that is not lost (gate `open` / `first-sync` / `first-sync-failed`), so the header shows
    the account control at the first frame; `statusLine` reads "Syncing…" until the restore finishes.
  - **Username rules (pure, `web/src/app/shared/account/username.ts`, SPEC-010 v0.15 SYNC-153):**
    `normalizeUsername` (NFC, trim, collapse every `\p{Zs}` run to one space), `checkUsername(raw)` →
    `{ ok: true, value } | { ok: false, error: 'empty' | 'too-long' | 'not-allowed' }` (order: empty, then over
    `USERNAME_MAX` = 20 code points, then not matching `^[\p{L}\p{Nd}][\p{L}\p{Mn}\p{Mc}\p{Nd} ._'’-]*$` (`u`) or
    holding a variation selector), `usernameLength` (the `n / 20` counter: code points of the normalized value),
    `graphemes` (`Intl.Segmenter`, code points as the fallback; used only for `usernameInitial`, never for counting),
    `usernameInitial`, `USERNAME_TEXT` (`tooLong` "Use 20 characters or fewer.", `notAllowed` "Use letters, numbers,
    spaces and . _ - ' only. No emoji."). The dialog closes on a Save of the unchanged value before checking it, so a
    stored v0.14 name that breaks the v0.15 rules is never rewritten unless the user changes it.
  - **Theme (SYNC-157, 158; v0.17.0 light/dark toggle, H-246):** `THEME_KEY = 'device-theme'`
    (`web/src/app/shared/theme/theme.ts`). `ThemeChoice = 'light' | 'dark'` (no System). Pure: `parseTheme(raw)` →
    `ThemeChoice | null` (`null` = nothing stored, also for `system` or junk); `effectiveTheme(stored, osPrefersLight)`
    (stored wins, else the OS); `toggledTheme(effective)` (the opposite). `ThemeService` (`core/theme/theme.service.ts`):
    `effective` signal (stored value, else `matchMedia('(prefers-color-scheme: light)')`, followed live by a `change`
    listener) and `toggle()` (stores and applies the opposite of `effective`); an unknown stored value is removed on
    read; writes `html[data-theme]` (absent while nothing is stored) and both `theme-color` metas; follows the
    `storage` event. The control is `ThemeToggle` (`app-theme-toggle`, `core/theme/theme-toggle.ts`): a native button
    named "Dark theme" with `aria-pressed`, icon `dark_mode` / `light_mode` (`shared/icon.ts`), `matTooltip`, rendered
    in the header's `.header-actions` before the deferred account menu (not deferred). Removed: `ThemeSwitch`
    (`app-theme-switch`), `THEME_CHOICES`, `ThemeService.choice` / `set()`, the menu Theme group. The inline script in
    `web/src/index.html` sets `data-theme` before the first paint, only for `light` / `dark`, and removes any other
    value (a future CSP needs its hash). `styles.scss`: the light
    tokens are the `light-tokens` mixin, applied by `@media (prefers-color-scheme: light) :root:not([data-theme='dark'])`
    and by `:root[data-theme='light']`; an explicit choice sets `color-scheme`.
  - **Phone account tab (SYNC-150 g, H-246):** `AccountTab` (`core/sync/account-tab.ts`, root service) holds
    `template: signal<TemplateRef | null>`. `AccountMenu` (still one instance, deferred in the header, one
    `SyncService.start()`) declares the tab button in `<ng-template #accountTab>` and hands it over after its first
    render; the app shell renders it with `ngTemplateOutlet` in the tab bar's fourth `li.tab-account` (empty until
    then). Both triggers (`.account-trigger` in the header, `.account-tab` in the bar) open the same `mat-menu`; it
    opens `above` while `matchMedia('(max-width: 40rem)')` matches. Dialogs opened from the menu return focus to the
    trigger that opened it. The username prompt returns focus to whichever of the two is displayed.
  - **Dialogs** (`core/sync/account-dialogs.ts`): `UsernameDialog` (data `{ mode: 'choose' | 'change' | 'add', current,
    online, ready, save }`, closes with the saved name or nothing; `disableClose`, Escape closes) and `AccountInfoDialog`
    (data `{ username, online, deletionError, editUsername(opener), deleteAccount(opener) }`). The SYNC-095 dialog now
    opens from Account Information with `restoreFocus` on its Delete button; its `'sign-out'` result closes Account
    Information first, then opens SYNC-090; a completed deletion closes every dialog.
  - **Imports (SYNC-159):** no `/import` route (the `**` catch-all sends it to Home, keeping any query as for every
    unknown path). One-shot parameters `IMPORT_PARAMS = { collection: 'add', deck: 'import' }` and the pure
    `launchDecision(value, 'waiting' | 'ready' | 'cannot')` → `'none' | 'wait' | 'open' | 'drop'`
    (`shared/import/import-launch.ts`): only the value `1` acts. Collection drops `add` with `Location.replaceState`
    (its `q` / `sort` mirroring keeps any other parameter now); Decks drops `import` with a `replaceUrl` router
    navigation. A dialog opened by the address waits until no other dialog is open. Shared UI: `app-page-fab`
    (sets `html.has-fab`: page-end clearance and snack bars above the button, `styles.scss`), `app-file-drop`,
    `app-import-pending` (the parsed list, "Not saved yet", moved from the removed Import page). The collection
    dialog title is "Add to your collection".

## Collection page (H-086)
Not an endpoint: the first web consumer of `GET /api/sets` and `GET /api/cards`, plus the pure
Collection view model. TypeScript source of truth: `web/src/app/shared/collection/`.
- **Catalog load** (`web/src/app/core/cards/card-data.ts`, `CardData`): `GET /api/sets`, then
  `GET /api/cards?page=N&pageSize=200` until `total` is reached, folded into the SPEC-007
  `CollectionCatalogView` (`printings` keyed by `printingId`; the `CardWithPrintings.printings`
  array is split off). Once per session; `reload()` retries. Any failure → `{ status: 'error' }`
  (page state S10). In production this fails until ADR-0004 hosts the API or a static snapshot.
- **Source follows the test marker (v1.39, H-679, TEST-070):** `loadCatalog()` resolves the source on every call
  (`test-data-<n>` → generated catalog, else `/api`). `CardData.sourceChanged: Subject<void>` emits when
  `checkSource()` finds a source other than the one last served; it runs on `AppStores.written` (a tracked save,
  guest mode on/off, and `externalWrite()` from `SyncService` after each engine status: first sync, pull, sign-out).
  A failed `/api` result is dropped on a source change, so it is fetched again rather than kept for the session.
  Collection, Decks and deck detail re-read on `sourceChanged`. Test stubs of `CardData` must provide `sourceChanged`.
- **Ban data:** `CardData.loadBans()` returns `data/banlist.json` (bundled, H-194/H-344, see "Deck legality
  engine"); only a failed chunk load gives `null`, and then every card's `EntryBan` is `unknown` ("Ban status
  unknown", COLL-008).
- **Printing order:** `printing-sort.ts` ports CARD-037 `collectorKey` and the CARD-070 comparator
  from `services/src/domain/` (keep them in step); it reads `collectorNumber`, not the API's `collector`.
- **View model** (`collection-view.ts`): `buildCollectionView({ ownership: DeckOwnershipInput, decks,
  locks | null, banData | null, today })` → `CollectionView` (`tiles` in COLL-031/033 order, one per
  `deckOwnership()` entry; `cards` per cardKey with `locked` holds from `computeSharedPool()`, never
  per printing; `unresolved` (COLL-015); `totals`; `pool`). `queryTiles(tiles, q, 'set'|'name'|'copies')`,
  `cardDetail(view, entryId)` (dialog; Could fit in = unlocked uses with `availability()`), URL helpers
  for `q` / `sort` only. The page mirrors them with `Location.replaceState` (no router navigation, so no
  route view transition and no history entry; H-095). Stored view state keeps SPEC-007 `CollectionQuery` fields `text` and `sort`
  (`{ field: 'default'|'name'|'quantity', dir }`) and leaves the rest of a stored query untouched.
- **Export** (`export-csv.ts`): `exportCollectionCsv(input)` → `{ csv, copies, cards, notices }`
  per SPEC-003 IMP-055 rules 1–10. The rule 6 self-check uses the shared parser plus nameKey, the
  exact-name guard and per-code printing order, not a catalog resolver (none in web yet, H-057).
- **Dev only:** `localStorage['rift.dev.sample'] = 'large'` makes `CardData` return a generated
  5,000-entry catalog (`sample-data.ts`), set by the `/styleguide` sample loader.

## Owned Cards Import commit and Undo (SPEC-003 IMP-049…052, IMP-072…075; H-158)
Not an endpoint. Writes go through the **tracked** `stores.collection` only.
- **Pure logic** (`web/src/app/shared/import/collection-commit.ts`): `resolveCollectionImport(parse, catalog)` →
  `ResolvedCollectionImport { cards, copies, cardCount, leftOut, notes, catalogVersion }`: names through the shared
  name lookup (IMP-025, see "Name lookup" below: exact `nameKey`, then the optional leading "a" / "the") and printing
  codes through `printingLookup(catalog)(setCode, collectorNumber)` (CARD-036 over the browser
  catalog: `found` with the first printing / `not-found` / `ambiguous`; IMP-067 exact-name guard, IMP-068 a/c,
  IMP-069, the guard and IMP-068 compare names exactly). Names that would need the fuzzy review (IMP-026…030), a name
  several cards share under CARD-034 (`"<name>" matches more than one card: <names>.`, no pick in this dialog yet),
  IMP-068 (b) and ambiguous codes are **left out** with a line message. `addToCollection(before, imp, at)`,
  `replaceCollection(imp, at)`, `replaceChanges` + `replaceConfirmText` (IMP-050, AC 19 form),
  `commitNotice(mode, imp, written)` (IMP-073), `changedSinceCommit`, `snapshotIsOurs`, `nextUpdatedAt(now, previous)`
  (monotonic), `UNDO_TEXT`.
- **Name lookup** (`web/src/app/core/cards/name-key.ts`, v1.29, H-343): `looseKey(name)` (CARD-034: `nameKey` with
  one leading `a ` / `the ` token removed; a bare article stays) and `nameLookup(cardKeys)` → `(name) =>
  NameLookupResult`: `{ status: 'found', cardKey, method: 'exact' | 'article' }` (an exact `nameKey` match always
  wins), `{ status: 'ambiguous', cardKeys }` (sorted) or `{ status: 'not-found' }`. Built once per catalog; the one
  lookup both imports use (IMP-025, DECK-040). Not used by catalog search (CARD-038) or the exact checks (CARD-032,
  LEGAL-B05).
- **Dialog seam** (`ImportCommitter<P = PreparedOk, C = CommitMode> { prepare(parse, text), commit(prepared, choice) }`,
  passed as `ImportDialogData.committer`): with it, Continue shows the review step and the dialog closes with `'committed'`
  only after `{ status: 'written' }`; `{ status: 'error', message }` stays in the dialog; `'cancelled'` (Replace
  confirmation cancelled) stays too. Without a committer the dialog closes with the `ParseResult` (no caller does
  this any more since H-253). v1.24: generic over the review shape `P` and the action's choice `C`; `prepare` also
  gets the text box as parsed (`text`, used by Deck Import for `importRemovedLines`; the collection ignores it).
- **Service** (`web/src/app/core/import/collection-import.ts`, `CollectionImport`, root): implements
  `ImportCommitter`; `prepare` reads `CardData.loadApiCatalog()` (never the generated test catalog, H-233); `undo()`;
  `written: Subject<void>` (fires after a commit or Undo this tab wrote; Collection
  reloads in place, COLL-091). Notice: `MatSnackBar` `(message, 'Undo', { duration: COMMIT_NOTICE_MS = 10_000,
  politeness: 'polite' })`. Undo: Nothing to undo unless the stored snapshot's `updatedAt` equals the one this commit
  kept; COLL-058 confirmation when the stored record's `updatedAt` differs from the commit's; IMP-050a lock lines from
  `lockLosses` over `computeSharedPool` (v1.37: a lock-only Undo asks with "Unlock cards in your decks?" / "Unlock and
  continue"; Confirm then `DeckLocks.dropLosses(losses, { sync: false })`); a written commit or Undo calls
  `AppStores.majorAction()`; restore = `save({ ...snapshot, updatedAt: next }, { replace: true })`
  then `clearPrevious()`. Error strings: `COMMIT_TEXT`.

## Deck Import save (SPEC-006 DECK-001…098; H-253)
Not an endpoint. "Import deck" on `/decks` reuses the H-158 dialog seam (folds in H-273): `ImportDialogData.deckCommitter`
is an `ImportCommitter<PreparedDeck, DeckSaveRequest>`. Writes go through the **tracked** `stores.decks.create()` only
(one new `decks/{id}` document per Save, stamped for sync, SYNC-031); nothing else is written (DECK-002), and Continue
writes nothing (DECK-003).
- **Pure logic** (`web/src/app/shared/import/deck-import.ts`): `prepareDeckImport(parse, sourceLines(text), catalog)` →
  `PreparedDeck { lines: DeckImportLine[], sourceFormat, catalogVersion, sections, legends, champions, catalog }`
  (names through the shared name lookup, exact then leading "a" / "the" (DECK-040, CARD-034), and printing codes
  through `printingLookup`, as the collection commit; a line that can't resolve carries `attention: { code:
  'UNKNOWN_CARD' | 'AMBIGUOUS_NAME' | 'UNKNOWN_PRINTING' | 'PRINTING_NAME_MISMATCH' | 'AMBIGUOUS_PRINTING', message }`
  and, for a code/name mismatch, two `choices`; for `AMBIGUOUS_NAME` (several cards share the loose key, message
  `"<name>" matches more than one card. Pick one.`) the cards it matches as `choices`, by `cardKey`, none picked).
  `reviewDeck(prepared, state: DeckReviewState, today)` → `DeckReview { attention, lines: ReviewLine[], slots,
  questions: ZoneQuestion[], issues, notes, byZone, defaultName, name, nameError, sourceError, blockers, canSave, draft }`.
  `DeckReviewState` = the user's choices: `removed`, `picks`, `zones` (PICK_ZONE answers, "Move to", changed inferred
  zones), `legend` / `champion` (`cardKey` or `'empty'` = Leave empty), `typedName` (null = follow the Legend,
  DECK-070), `sourceText`, `sourceUrl`. `draft` is the `UserDeck` without `id`, `createdAt`, `updatedAt`:
  `schemaVersion: 1`, `format: 'standard'`, `source: { kind: 'user', text, url }`, `sourceFormat` (`riot-text` /
  `plain-text` / `csv`), `notes: ''`, `catalogVersion`, `importRemovedLines` only when non-empty (removed lines,
  rejected tokens, Legend lines not picked), zones merged by `cardKey` per zone. Helpers: `deckSource()`
  (DECK-071), `displayDate()` (`MMM D, YYYY`), `expectedZone()`, `isChampionUnit()`; strings `DECK_REVIEW_TEXT`.
  Zone rules in code: DECK-020…026 and DECK-030…038 as specified. 2+ Legends (`Legend:` or unsectioned): the
  user picks one (PICK_LEGEND) and the others are left out into `importRemovedLines` (Legends are never Main Deck
  cards). 2+ cards under `Champion:` (e.g. a precon's Champion Unit Options): the user picks one (PICK_CHAMPION);
  one copy of the pick goes to `champion` and every other copy (unpicked cards, extra copies of the pick) goes to
  `main` with `zoneMethod: 'user'` and the line reason `DECK_REVIEW_TEXT.championNotPicked` /
  `.championExtraToMain` (DECK-034 "copies not picked stay in `main`", as for unsectioned lists); "Leave empty"
  puts them all in `main`. Save still waits for every answer (DECK-038). **`draft.champion.qty` is always 1**
  (DECK-027, H-410): when one card's lines in `champion` (from `Champion:`, or placed there by the user) add up to more
  than one copy (`Champion: 2 X`, or X on two lines under `Champion:`), 1 copy is the Chosen Champion and the rest
  are added to `main` (merged by `cardKey`); each such line has `zone: 'main'`, keeps its `zoneMethod` (`section` /
  `user`) and gets the reason `championExtraToMain`; nothing goes to `importRemovedLines`. A champion entry under
  `Champion:` plus another under `Main Deck:` (DECK-025) is kept as written. **DECK-104 (H-500):** while any line
  with `section: 'legend'` is in `attention`, `questions` holds no `PICK_LEGEND`, the Legend lines that resolved wait
  with it (no zone, no `PICK_ZONE`), `draft.legend` is null and the name is the fallback; Save is blocked by
  `blockers.unresolvedLines`. **H-452 additions:** `ReviewLine.movedToMain`
  (copies of the line that were in the Chosen Champion zone and went to `main`, else 0); `DeckReview.notes` items are
  `ReviewNote { id, line, message, removable }` (`removable` = the code's card was used over the typed name: IMP-068 (c),
  or the user picked the code's card on a `PRINTING_NAME_MISMATCH` line); `DeckReview.removedLines` (`{ line, name }[]`
  in `importRemovedLines` order; name = the card's name, or the line's text when unresolved); `DeckImportLine.code`
  (the printing code as written, or null) and `noteKind` (`'codeUsed' | 'nameUsed' | null`);
  `DECK_REVIEW_TEXT.championExtraToMain` is a function of the extra copies (`(n: number) => string`).
  **Back keeps answers (H-480, DECK-100…102):** `lineIdentities(prepared)` → one identity per `DeckImportLine.id`
  (DECK-101: trimmed `raw`, section context = the line's `section` zone or none, occurrence number among lines with
  the same text and context; position is not part of it). `carryReviewAnswers(prev, state, next, today)` →
  `DeckReviewState` for the next review: `removed` and `zones` entries of unchanged lines (a zone answer only when the
  line resolves without a pick), and the `legend` / `champion` answer only when `next` asks that question again with
  the same lines (mapped by identity) and the same candidate `cardKey`s; `picks`, `typedName`, `sourceText`,
  `sourceUrl` start empty. The dialog holds the review left with Back in memory only and passes the result to
  `app-deck-review` as the `initialState` input; `DeckReview.answers()` returns the current state.
- **Parser additions** (`parse-card-list.ts`): `sourceLines(text)` (the parser's line split), `sectionLabelOf(raw)`;
  section labels accept `*` bold marks (`**Legend:**`, `**Legend**:`, SPEC-003 IMP-016 v0.14).
- **Service** (`web/src/app/core/import/deck-import.ts`, `DeckImport`, root): `prepare` loads the catalog
  (`CardData.loadCatalog()`; error → `DECK_SAVE_TEXT.catalogError`, retried on the next Continue); `commit(prepared,
  { draft })` refuses while the SYNC-009 gate is closed (DECK-097), creates `{ ...draft, id: NEW_DECK_ID(),
  createdAt: now, updatedAt: now }` (the store stamps the monotonic `updatedAt`), reads it back, emits
  `saved: Subject<UserDeck>` and opens the snack bar `Deck saved.` / `View deck` (`noticeOptions('success')`: 6 s,
  polite; the action navigates to `/decks/<id>`). Errors (`DeckStoreError` codes) → `{ status: 'error', message }`:
  `DECK_LIMIT` → `DECK_SAVE_TEXT.limit`, `DECK_TOO_LARGE` → `.tooLarge`, `STORAGE_FULL` → `.storageFull`, other →
  `.failed`; `ReadOnlyAreaError` → its message. `NEW_DECK_ID` is an `InjectionToken<() => string>`
  (`crypto.randomUUID()`), replaceable in tests.
- **Decks page:** passes `deckCommitter: inject(DeckImport)`; `DeckImport.saved` re-reads the count in place (the
  list itself is H-060). `ImportPending` is removed (no import closes with a bare `ParseResult` any more).
- **Legality in the review (DECK-050…056, H-344):** `DeckImport.prepare` also loads `CardData.loadLegalityData()`
  (null on failure) into `PreparedDeck.legalityData`; `reviewDeck` sets `DeckReview.legality: ReviewLegality | null`
  from `reviewLegality(data, catalog, draft, unresolvedLines, today)` = SPEC-002 on `toDeckInput(draft)`
  (`standard`, `global`, `asOf = localIsoDate(today)`), re-run on every review change. `ReviewLegality { verdict,
  label, failed: string[], notChecked: string[], banned: { text, zone, waveName, upcoming }[], unresolved: string |
  null, result: LegalityResult | null }`; `null` while the draft has no card. Never in the draft (DECK-055). No data →
  `incomplete`, "Not fully checked", `notChecked = [RULE_CHECK_TEXT.noBans]`. The review shows it as a "Rule check"
  block (OWN-117 words, `RULE_CHECK_WORDS`).
- **Not built:** fuzzy suggestions
  (DECK-043, IMP-026…030, H-272), the optional leading article (CARD-034), deck codes / TTS (DECK-012, DECK-039, H-047).

## Decks list and shared lock pieces (SPEC-005 OWN-002…008, OWN-084, OWN-100…105; SPEC-008 SHARE-020…029, SHARE-050…063; H-060)
Not an endpoint. `/decks` lists every deck (no pagination, OWN-084) in a 3 / 2 / 1 column grid
(`minmax(min(var(--deck-tile-min, 22rem), 100%), 1fr)`). The lock pieces live in `web/src/app/shared/deck/` so the
Deck detail header (H-254) uses the same ones. Writes: only `stores.locks` (through `DeckLocks`).
- **Pure list logic** (`shared/deck/deck-list.ts`): `buildDeckList({ decks, locks, collection, catalog, banData,
  today, format, legality? })` → `DeckListModel { entries: { deck, view, summary }[], pool, collectionUnreadable,
  catalogMissing, locksUnreadable, banUnknown }`: one `computeSharedPool` when collection and catalog are both
  readable, else `CollectionOwnership { status: 'unavailable', locks }` with the **stored** locks (`null` = lock store
  unreadable). `DeckListQuery { text, own, lock, legality, source, sort }`, `DEFAULT_DECK_QUERY`,
  `parseDeckQuery(params)` → `{ query, ignored }` (unknown values ignored and counted, OWN-105 (e)),
  `deckQueryParams(q)` (defaults left out; keys `q`, `own`, `lock`, `legality`, `source`, `sort`),
  `queryDecks(entries, q)` (OWN-005 default order, ties `createdAt` desc then `id`; `name` = `Intl.Collator('en',
  base, numeric)`; `added` = `createdAt` desc; search = accent-folded substring of the name),
  `ownershipCounts` (faceted: every filter but ownership), `hiddenLockedCount`, `deckCountLine(shown, total,
  filtered)` ("3 decks" / "Showing 1 of 3 decks"), `activeFilters`, `clearFilters` (keeps the search),
  `menuFilterCount`, option lists `DECK_SORTS`, `OWN_OPTIONS`, `LOCK_OPTIONS`, `SOURCE_OPTIONS`,
  `legalityOptions(formatName)`.
- **Pure lock logic** (`shared/deck/deck-locks.ts`): `deckLockCheck({ pool, deck, readOnly, lock, locksUnreadable })`
  wraps `canLock` (`isLocked` = `view.lock` unless the store is unreadable; `ownership-unavailable` becomes
  `locks-unreadable` when it is); `nameLockCheck({ pool, deck, cardKey, readOnly, nameLocked, locksUnreadable })` the
  same for one name; `readLocks(store)` → `NameLock[]` (`[]` when none) or `null` (unreadable, never overwritten);
  record edits `withDeckLocked(stored, deck, now)`, `withDeckUnlocked`, `withNameLocked`, `withNameUnlocked`,
  `withoutLosses`, `saveLocks(store, change)`; `lockRemovalLines(losses)`, `LOCK_REMOVAL_TEXT`,
  `noLongerFullyLockedNotice`, `cantLockDeckNotice(n)`, `cantLockNameNotice(n)` (H-670); `otherDecksLine(view)`
  (SHARE-021, at most 3 names then "and r more"); texts `LOCK_TEXT`, `lockInTitle`, `lockedInNotice`,
  `unlockedNotice`.
- **Service** `DeckLocks` (`shared/deck/deck-locks.service.ts`, root): `load(): Promise<NameLock[] | null>`,
  `lockDeck(deck)`, `unlockDeck(deckId, { sync? })`, `lockName(deckId, cardKey)`, `unlockName(deckId, cardKey)`,
  `dropLosses(losses, { sync? })` (reject on a failed or refused save, nothing changed), `changed: Subject<void>`
  after each save this tab wrote; each change then calls `AppStores.majorAction()` unless `sync: false`. Uses
  `AppStores.stores.locks`.
- **Components** (standalone; all text from the helpers above):

| Selector | Inputs | Outputs | Needs |
|---|---|---|---|
| `app-deck-tile` | `summary: DeckTileSummary` (required), `eager: boolean` | none | Router. One link to `/decks/<id>` (whole tile), Legend art with the completion fill or the deck mark, "51%" + hidden "51 percent of copies available / locked in", status chip (ownership group only) and next to it `app-lock-badge` with `label` = `lockBadge`, `showDate` false (v1.27; a locked complete deck has no chip, only "Locked"; a short one has its group chip and "Locked · n cards short"; "Locked" while ownership is unavailable), source, pilot, legality, ban flags, Updated date, "Read-only" tag |
| `app-deck-status-chip` | `filter: OwnershipFilter` (required), `lockBadge: string \| null` | none | `lockBadge` wins (warning style when it says "short"); `unavailable` or `locked` without a badge shows nothing. Unchanged in v1.27; the deck tile no longer passes `lockBadge` |
| `app-lock-badge` | `lock: DeckLockState \| null` (optional since v1.27, default `null`), `label: string \| null` (required, = `summary.lockBadge`), `showDate` (default true) | none | "Locked · Locked in on <MMM D, YYYY>" (date left out when `lockedAt` doesn't parse or `lock` is null). Renders when `label` is set unless `lock.locked` is false (v1.27; before, it also needed `lock`). Size through `--lock-badge-font-size` (default `--font-size-sm`) and `--lock-badge-icon-size` (default 16px) |
| `app-lock-actions` | `deck: UserDeck` (required), `view: DeckOwnershipView` (required), `pool: SharedPool \| null`, `readOnly: boolean`, `locksUnreadable: boolean` | `changed: void` | `DeckLocks`, `MatDialog`, `MatSnackBar`. Lock in (`aria-disabled` + reason line as `aria-describedby`, SHARE-020) → `LockInDialog` confirmation (SHARE-021) → "Locking in…" → snack "<name> is locked in."; Unlock at once (SHARE-023); failure snack "Couldn't save the lock. Try again." (SHARE-063). The host re-reads on `DeckLocks.changed` and passes the new `view` |
| `app-lock-removal-notice` (v1.37, replaces `app-shortfall-warning`) | `losses: readonly LockLoss[]` (required) | none | SHARE-088 block inside a confirmation: intro "Some of the cards you are removing are locked in your decks. Going on unlocks them:" then `lockRemovalLines(losses)`; nothing without losses; no `role="alert"` |
| `app-name-lock-action` (v1.37) | `card: OwnershipCard` (required), `context: NameLockContext { deck, pool, readOnly, locksUnreadable }` (required) | none | `DeckLocks`, `MatSnackBar`. "Lock these copies" / "Unlock these copies" (SHARE-094 (a)), reason line as `aria-describedby`; a not-full name answers with "Can't lock. Missing n copies." (H-670); the last name → "<deck> is locked in."; unlocking a name of a locked deck → "<deck> is no longer fully locked." |

- `CardArt` gains `animateChange` (fill transition `var(--dur-fill, 180ms)`, OWN-035). Global tokens
  `--deck-tile-min: 22rem`, `--dur-fill: 180ms`.
- `ImportConfirmData.losses: readonly LockLoss[]` (v1.37; was `shortfalls`) renders `app-lock-removal-notice`; an
  empty `text` renders no paragraph.
- **Not built:** legality verdicts (the SPEC-002 engine exists since H-194, but the list does not pass `legality`
  yet: every deck reads "Not fully checked" and the Legality filter only matches that); the format name in filter
  labels is the constant "Standard".

## Deck detail (SPEC-005 OWN-010…119, SPEC-006 DECK-081…085, SPEC-008 SHARE-024/025; H-254)
Not an endpoint. `/decks/:id` reads and writes through the **tracked** stores only; no new stored shape.
- **Pure logic** (`web/src/app/shared/deck-detail/detail-view.ts`): `headerSummary(view)` → `{ copies, percent, cards }`
  (`percent` is `view.summary.completionPercent` as it is, `null` → no percentage at all; locked decks read
  "… copies locked in"); `sectionCounts`, `navLabel` (Legend and Champion show no count); `cardId(card)` =
  `` `${zone}:${cardKey}` ``, `deckCards`, `firstCardId` (OWN-111 (b)), `findCard`, `neighbourId`; card text
  `labelParts`, `banText`, `cardAccessibleName`, `allocationLine`, `breakdownLines`, `printingRowText/Label`,
  `otherUseText`, `cardFacts`, `fullArtUrl`; missing list `missingGroups`, `missingCopies`, `mergedMissingText`
  ("Copy as one list": one line per card, sections merged, Riot order); `exportDeckText(deck, catalog)` /
  `exportFileName` (DECK-085); `duplicateDeck(deck, id, now)` (DECK-084: `<name> (copy)` within 80 characters,
  the name is shortened to keep the suffix, `duplicatedFrom`, never locked); `applyRename(deck, form, sourceOf)` →
  `{ status: 'ok', deck, changed: { name, other } } | { status: 'invalid', errors }` (OWN-118: name, description,
  and for user decks source text and URL via `deckSource()`; tournament sources never change; lock untouched);
  `isReadOnlyDeck`, `newerDeckRecord(raw, id)` (OWN-064: a record with a newer `schemaVersion` the store refuses
  is shown read-only); `ruleCheckContent`; `DECK_VIEW_KEY = 'deck-view'` + `parseViewMode` (OWN-114, a device
  setting outside `rift.*`, so not synced and not cleared on sign-out). Copy strings in `DETAIL_TEXT`,
  `RENAME_TEXT`, `RULE_CHECK_TEXT`.
- **Page** (`web/src/app/pages/deck-detail/deck-detail.ts`, `DeckDetail`): reads deck, all decks, locks
  (unreadable → `locksIgnored`), collection + tags (unreadable → ownership unavailable, OWN-062), printing codes,
  catalog (`CardData.loadCatalog`, error → banner + stored names, OWN-063) and bans (`CardData.loadBans`, null or
  error → one page notice, OWN-015); `computeSharedPool` over every deck, then `computeDeckOwnership` and
  `summarizeDeck`. Re-reads on `storage` events for `rift.*` keys (not view state), `DeckImport.saved`,
  `CollectionImport.written`, and on focus/visibility when the date changed (OWN-119 (d)). Injection tokens
  `RAW_DECK_RECORD: (id) => string | null` (raw read for the read-only path) and `DEVICE_STORAGE` (view mode),
  replaceable in tests.
- **Writes:** Rename → `stores.decks.update(deck, basedOnUpdatedAt)` (`'conflict'` → `DETAIL_TEXT.saveConflict`, the
  dialog stays open); Duplicate → `stores.decks.create(copy)`, snack "Deck duplicated." / Open; Delete →
  `stores.decks.delete(id)` (v1.37: the deck's name locks stay stored and leave with the deck tombstone after the Undo
  window; an Undo keeps them, SYNC-035 / AC 87), navigate to `/decks`, snack "Deck
  deleted." / Undo for 10 s; Undo → `stores.decks.create(removed)` (unlocked, SHARE-024) then
  `DeckImport.saved.next(removed)` so an open list re-reads. Read-only decks: Rename, Duplicate and Delete disabled.
- **Lock pieces (H-060):** the header uses `app-lock-badge [lock]="view.lock" [label]="tile.lockBadge"` and
  `app-lock-actions [deck] [view] [pool] [readOnly] [locksUnreadable]` (its own reason line, confirmation and
  SHARE-029 snack bars). `Loaded` carries `pool` (the `SharedPool`, null while ownership is unavailable) and
  `locksUnreadable`. The page re-reads on `DeckLocks.changed` and on the component's `(changed)` (coalesced), so
  a lock written in this tab updates the badge, copies line and tiles without a storage event. Delete removes the
  deck's name locks through `DeckLocks.unlockDeck` (only when one is stored; an unreadable lock store is never
  overwritten). v1.37: no "cards short" state anywhere; the card content gets `[lockContext]` (`NameLockContext`)
  for `app-name-lock-action`, and the card dialog data has `lockContext()`. Duplicate calls `AppStores.majorAction()`.
  v1.38 (H-668…H-670): the title row is name (two-line clamp, expandable) + `app-lock-actions variant="icon"` + More;
  no header actions row; Copy missing list is in `app-deck-missing` (`copyPlacement="heading"` in the desktop panel).
- **Not built here:** the legality verdict (the SPEC-002 engine exists since H-194 but this page does not run it yet:
  always "Not fully checked"). Ban data is real since H-344 (`loadBans()` returns `data/banlist.json`).

## Test data on live (SPEC-013, H-205)
Not an endpoint and no new Firestore field: test data is ordinary account data told apart by reserved values
([[Test Data]] TEST-030). No `firestore.rules` change (rules test `web/rules-tests/test-data.test.ts`).
- **Marker and ids** (`web/src/app/shared/collection/test-data.ts`, pure, no generator import): `TEST_SETS`
  (`small` 150, `large` 5000 entries), `TEST_MARKER_PREFIX = 'test-data-'`, `testMarker(n)`, `testEntries(catalogVersion)`
  (`n` or null), `isTestCollection(c)` (≥ 1 card **and** the prefix; an empty collection never is),
  `TEST_DECK_IDS` (`00000000-0000-4000-8000-00000000000{1,2,3}`, same as `sampleDeckId(1…3)`), `isTestDeck(d)` (reserved
  id **and** the prefix, so the dev tool's `catalogVersion: 'sample'` decks are not test decks), `canLoadTestData(c)`,
  `planTestLoad(sample, n, locks, nowIso)`, `planTestRemove(collection, decks, locks, nowIso, { removeCollection? })`,
  and the spec strings `TEST_TEXT`.
- **Operations** (`web/src/app/core/test-data/test-data-ops.ts`, over the **tracked** stores `collection`, `decks`,
  `locks` only): `loadTestData(stores, 'small'|'large', now) → 'ok' | 'real-cards'` (decks by id: `create` when
  missing, then always `update`, so a Load inside a just-removed deck's Undo window is still stamped; then the
  collection `save(…, { replace: true })`, one `set()`; then the locks with the two test locks added);
  `removeTestData(stores, now)` (locks without the test ids, the test decks deleted (tombstones after the 10 s Undo
  window), the collection saved with `cards: {}` and `catalogVersion: ""`: one `update()` with a tombstone per card);
  `removeTestDecks(stores, now)`: the TEST-033 part for a Replace import (test decks and their locks only).
  `CollectionImport.commit` calls it on **every Replace**, right after the collection write (H-233; a no-op without
  test decks, and it also clears a stray test deck, TEST-034); an Add never calls it (TEST-032 blocks Add first).
- **Catalog** (`CardData.loadCatalog()`): reads the stored collection (`stores.raw.collection`, read only); with the
  marker it returns `generateLargeSample(n).catalog` (dynamic import, its own lazy chunk), with no `/api` call and no
  dev key; the cached catalog follows the marker (a Remove goes back to `/api`). The dev key path is unchanged.
  `CardData.loadApiCatalog()` (H-233) always returns the `/api` catalog (own cache, cleared by `reload()`), even
  with the marker: the Owned Cards Import resolves against it, so a Replace over test data writes the real
  `catalogVersion` (AC 12).
- **Flag:** `environment.testDataEnabled` (true in `environment.ts` and `environment.development.ts`), injected as
  `TEST_DATA_ENABLED` (`core/test-data/test-data-flag.ts`). False hides Load and Change set; the banner and Remove stay.

## Builds and deploys (SPEC-010 SYNC-007, SYNC-012, H-078)
- **`appVersion` per build (SYNC-012).** `web/scripts/build.mjs` computes it and passes it to `ng build` as the
  define `APP_VERSION` (nothing is written into the source tree). Format `web-<prod|preview>-<id>`: `<id>` is
  the first 7 characters of the full commit id, lowercased (`git rev-parse HEAD`, else `GITHUB_SHA`), or the
  UTC build time `YYYYMMDDTHHMMSSZ` when neither gives a full id. ≤ 40 characters of `[0-9A-Za-z._+-]`; the
  script fails the build rather than ship anything else. Pure logic: `web/scripts/app-version.mjs`
  (`appVersion`, `resolveCommitId`, `formatBuildTime`, `ngBuildArgs`). `environment.ts` (used by
  both the production and the preview build since H-172; `environment.preview.ts` was removed) reads `APP_VERSION`; a bare `ng build` without the define falls back to `web-dev`.
  The dev server keeps `web-dev` (`environment.development.ts`); unit tests inject their own value.
  The id is the commit checked out: uncommitted changes do not change it.
- **Builds** (from `web/`): `npm run build` = production (`web-prod-…`, output `web/dist/web`);
  `npm run build:preview` = `ng build --configuration preview` (`web-preview-…`, output `web/dist/web-preview`).
  Since H-172 the two differ only in `appVersion` and output path: both are account-only (SYNC-007), and the
  production build must not be deployed until the SYNC-007 release rule is met (H-063, H-152, rules deployed).
- **Production deploys (unchanged):** `firebase deploy --only hosting` and the GitHub Actions deploy of `main`
  run the `firebase.json` predeploy `npm --prefix web run build` and upload `web/dist/web/browser`.
- **Preview deploy (SYNC-007), the only supported way to put the account-only build on a URL until the release rule is met:**
  `npm run deploy:preview -- <channel> [expires]` from `web/` (e.g. `npm run deploy:preview -- sync-test`).
  It runs `firebase hosting:channel:deploy <channel> --config firebase.preview.json [--expires <expires>]` from
  the repo root. `firebase.preview.json` has the same hosting rules as `firebase.json`, but its predeploy is
  `node web/scripts/build.mjs preview --channel-deploy` and its `public` is `web/dist/web-preview/browser`, so
  the uploaded folder is the preview build and no production build runs in between. `<channel>`: required,
  1–36 lowercase letters, digits or inner hyphens, never `live`. `[expires]`: e.g. `12h`, `3d`, `2w`, at most
  30 days; without it Firebase's default (7 days) applies. The preview predeploy refuses to build unless
  `deploy:preview` started it (env `RIFT_PREVIEW_CHANNEL`), so `firebase deploy --config firebase.preview.json`
  cannot put a preview build on `live`. **Preview URLs are public to anyone who has the link:** share them
  privately and let them expire.

## Release changelog, "What's new" (SPEC-012, H-202)
- **Data:** `web/src/app/core/changelog/changelog.json`, a JSON array of `ChangelogEntry` (`version` `0.0.X`,
  `date` `YYYY-MM-DD` or `null`, `title`, `bullets`), newest first. Imported at build time (no fetch); the page reads
  it through the `CHANGELOG_DATA` token (`core/changelog/changelog-data.ts`) so tests can provide other data.
- **Pure logic:** `web/src/app/shared/changelog/changelog.ts`: `entryErrors` (LOG-031 fields + LOG-022 limits and
  the hash guard), `showableEntries` (LOG-024: the page shows only entries with no `entryErrors`, in file order),
  `validateChangelog` (LOG-041 whole-file rules, used by the data unit test), `formatReleaseDate` (LOG-021).
- **Page:** `/changelog` (`pages/changelog/changelog-page.ts`), public, injects nothing from sync (no Firebase, no
  storage). Linked from the footer row and the account menu (after Privacy notice, before the last divider; no Theme group since H-246).
- **Release check (LOG-053):** `npm --prefix web run check:changelog-release` (`web/scripts/check-changelog-release.mjs`,
  pure logic in `web/scripts/changelog-release.mjs`) exits 1 with `Changelog has an undated entry: set its date before
  releasing.` while any `date` is `null`, and on a file that is not a JSON array; 0 otherwise. Not part of test, lint
  or either build. The GitHub Actions deploy of `main` runs it right after `npm ci`, before the deploy step.
- **Release step (LOG-042), in the `dev` → `main` release PR:** add the new entry on top with version = previous + 1
  (or, for `0.0.1`, set its `date`); fill every `null` date with the release day; read the bullets once for plain
  words (title 1–60 characters, 1–5 bullets of 1–140); then run `npm --prefix web run check:changelog-release` and
  `npm --prefix web test -- --watch=false` before merging. Preview deploys get no entry. The release version is never
  injected into the build or `appVersion` (LOG-043).

## Privacy notice (SPEC-010 SYNC-101, SYNC-103, SYNC-104, H-180)
- **Notice text source (the one file the SYNC-101 checks scan):** `web/src/app/core/privacy/privacy-notice.md`, the
  text of [[Privacy Notice Draft]] "Proposed page text" with the **Confirm** markers and the notes for RJ removed
  (the built page shows none), `[set on release: date dev → main ships sign-in]` kept as written, and "the What's new
  page" linked to `/changelog` (SYNC-103 item 3). A Markdown subset: `#` (the one `<h1>`), `##`, paragraphs, `- `
  lists, `**strong**`, `*em*`, `` `code` ``, `[text](href)` (`/…` = in-app same-tab link, `mailto:` for the support
  address). Bundled at build time (`import … with { loader: 'text' }`, typed by `web/src/markdown.d.ts`); nothing is
  fetched. Exposed through the `PRIVACY_NOTICE_TEXT` token (`core/privacy/privacy-notice-text.ts`) so tests can
  provide other text.
- **Pure parser:** `web/src/app/shared/privacy/notice-markdown.ts` (`parseNoticeMarkdown`, `parseNoticeInline`):
  blocks of text parts; the page binds text, never HTML. Other bracketed text stays text.
- **Page:** `/privacy` (`pages/privacy/privacy-page.ts`), tab title `Privacy notice · Rift Builder`, public, injects
  nothing from sync (no Firebase, no storage, no request). The paragraph under the `<h1>` is the date line.
- **Links:** footer (`.footer-links`, first, before What's new; `routerLinkActive` + `aria-current="page"`); account
  menu (`<a mat-menu-item routerLink="/privacy">` after Account Information (no Theme group since H-246), before What's new and the last divider;
  enabled offline and during an unfinished deletion); sign-in dialog (`.fine-print` line under the form in every
  state: `AGE_LINE` "For ages 16 and over." then `<a href="/privacy" target="_blank" rel="noopener">Privacy notice</a>`,
  described by a visually hidden "Opens in a new tab.").
- **Check 1 (every build and the unit tests):** `web/scripts/privacy-notice-checks.mjs` `findNoticeBlanks` returns the
  case-sensitive substrings `[RJ` / `[builder` found in the notice file. `web/scripts/build.mjs` (so `npm run build`,
  `build:preview` and both hosting predeploys) exits 1 with `Privacy notice has unfilled blanks: "[RJ" in
  src/app/core/privacy/privacy-notice.md.` before `ng build`; `src/tooling/privacy-notice-checks.spec.ts` runs it on the
  real file. Markdown links, template bindings and the release-day date never match.
- **Check 2 (release step and production deploy only):** `npm --prefix web run check:privacy-release`
  (`web/scripts/check-privacy-release.mjs`, pure `checkPrivacyRelease`) exits 1 with `Privacy notice still has "[set on
  release": replace it with the release date (effective and last updated) before releasing.` while the marker remains;
  0 otherwise. Run by: the GitHub Actions deploy of `main` (step after the changelog check, before the deploy) and the
  first `firebase.json` hosting predeploy (so a local `firebase deploy --only hosting` is held too). Not run by
  `npm run build`, test, lint or the preview deploy (`firebase.preview.json`).
- **Release step (SYNC-101), in the `dev` → `main` release PR:** replace both `[set on release: …]` markers in
  `privacy-notice.md` with the release day (`YYYY-MM-DD`), then run `npm --prefix web run check:privacy-release`. Only
  after RJ has approved [[Privacy Notice Draft]]. Manual (AC 70): if DevTools shows any card image loaded from a host
  other than Rift Builder's own hosting, the notice must already name it in "Who receives it" (SYNC-103 item 9).

## Changelog
- v0: created
- v1 (2026-11-23, H-008): first endpoints: `GET /api/health`, `GET /api/sets`, `GET /api/cards`
  (paging), `GET /api/cards/:cardKey`; error shape and codes; `CardWithPrintings` and response
  wrappers over the SPEC-001 v0.2 types; CORS for `http://localhost:4200` in development only.
- v1.1 (2026-11-23, H-055): no endpoint change. Base URL is `/api` in dev and prod (dev via the
  `ng serve` proxy); production `/api/**` returns `404` until ADR-0004 picks an API host.
- v1.2 (2026-11-23, H-059): no endpoint change. Added "Browser-side shared types": the pure deck
  ownership engine in `web/src/app/core/decks/` (SPEC-005 v0.4, SPEC-008 v0.2, and the rune spec withdrawn on 2026-11-24).
- v1.3 (2026-11-23, H-059 review): no endpoint change. Engine notes: SHARE-030 total lock order,
  `canLock(null, …)` caller duty, new `DeckOwnershipInput` per change (H-060), and the
  ownership-unavailable view values pending spec.
- v1.4 (2026-11-23, H-059 review 2): no endpoint change and no shape change. `banStatus` memoizes
  its lookup per `BanListFile` object (OWN-080); rune detection in the view uses the pool's
  catalog; entries rely on DECK-096 validation.
- v1.5 (2026-11-23, H-062; numbered v1.2 on its branch): no endpoint change. New section "Browser stores and sync": the SPEC-010
  store, sync-log and adapter contracts in `web/`, and the additions the build needed.
- v1.6 (2026-11-24, H-058 family merge): no endpoint change. The engine's stored-record types now come
  from `shared/storage/records.ts` (one source; `StoredTags` schema 3); ownership-unavailable values → H-076.
- v1.7 (2026-11-24, H-086): no endpoint change. New section "Collection page": the web catalog load
  over `/api/sets` + `/api/cards`, the ban-data seam (null), the ported CARD-070 order, the Collection
  view model and the IMP-055 exporter.
- v1.8 (2026-11-24, H-098): no endpoint change. Runes are cards: the rune test function and the rune
  flag on `OwnershipCard` and `CardSummary` are removed; `COUNTED_ZONES` includes `runes`;
  `countedEntries(deck)` no longer takes a catalog; `canLock` returns `no-cards` only for a deck with no
  entries ("Lock in needs at least one card").
- v1.9 (2026-11-24, H-127; numbered v1.3 on its branch, then v1.7): no endpoint change. `RemoteStore.deleteAll` reports `removedAny`; sync log
  `deletingRemovedAny`; engine/service `unfinishedDeletion()` and `cancelDeletion()` (SYNC-096).
- v1.10 (2026-11-24, H-081; numbered v1.4 on its branch, then v1.8): no endpoint change. Account-required mode: sync log `sessionLostUid`,
  `uploadingUid` no longer written, the gate (`gateState`, `SignInGate`, `LocalSyncLogStore.peek()`), sign-out
  without a mode, Combine and upload paths removed.
- v1.11 (2026-11-24, H-077; numbered v1.5 on its branch, then v1.9): no endpoint change. `PushChanges.batch` and `PlanOptions.batch` removed (the adapter
  no longer uses `writeBatch`); new pure `planAccountPush(account)`; the first-sign-in flow pushes the account
  write only (SYNC-050).
- v1.12 (2026-11-24, H-078; numbered v1.6 on its branch, then v1.10): no endpoint change. New section "Builds and deploys": per-build `appVersion`
  (SYNC-012) and the preview deploy command `npm run deploy:preview -- <channel> [expires]` (SYNC-007).
- v1.13 (2026-11-24, H-145): no endpoint change. Email link return: `AuthService.sendEmailLink(email, returnTo?)`,
  `safeReturnPath` / `returnTarget`, `EngineDeps.leaveSignInLink` (only on a rejected code), `MESSAGES.signedIn`; the adapter no longer
  edits the URL. Records how the Auth emulator combines a continue URL that already has a query.
- v1.14 (2026-11-24, H-154): no endpoint change. `BrowserStores.clearCollectionData()` for SPEC-007 COLL-074
  (local-only mode): collection, Undo snapshot, tags, printing codes and view state; decks and locks stay.
- v1.36 (2026-11-26, H-148, H-233): no endpoint change and no stored-shape change. SYNC-074: one `info` notice for
  every locked deck a merge left short, `lockedShortfallNotice()` in `sync-engine.ts`. TEST-033: `CardData.loadApiCatalog()`;
  `CollectionImport.prepare` uses it; `CollectionImport.commit` calls `removeTestDecks` on every Replace, and the
  Replace confirmation's IMP-050a warnings leave the test decks out (they go in the same commit).
- v1.37 (2026-11-26, H-665, H-667): SPEC-008 0.6.1 card-name locks: `NameLock`, `StoredDeckLocks` schema 2 with the
  v1 migration, `canLockName`, `lockLosses`, `settleLocks`, `migrateLocksV1`, `ownedForDecksOf`, `storedLockState(locks,
  deck)`, `DeckLockState` without `short` / `cardsShort`, `nameLocked` on `CardAvailability` / `OwnershipCard`;
  removed `lockedShortfalls`, `shortfallWarning`, `shortfallNotice`, `LockedShortfall`, `app-shortfall-warning`,
  `EngineDeps.shortfalls`, `lockedShortfallNotice`; new `app-lock-removal-notice`, `app-name-lock-action`,
  `DeckLocks` per-name methods, `lockDropNotice`. SPEC-010 0.18.1: `state/locks` keyed `<deckId>|<cardKey>` with the
  cloud migration, `MAP_CAPS.locks` / rules cap 6000, `SyncEngine.majorAction()` and `AppStores.majorAction()`
  (SYNC-126). Section "Card-name locks and major-action sync" new.
- v1.38 (2026-11-26, H-668 to H-671): Deck detail title row = name (two-line clamp, expandable) + lock toggle + More;
  no header actions row; `app-deck-missing` gains `copyPlacement: 'heading' | 'end'`; the lock toggle answers a
  missing-cards press with "Can't lock. Missing n cards." and keeps its reason only as visually hidden
  `aria-describedby` text; `app-name-lock-action` answers a not-full press with "Can't lock. Missing n copies.";
  `NOTICE_POSITION` (top, centre) in `shared/sync/notice.ts`, carried by `noticeOptions()` and spread into the four
  calls with their own options.
- v1.35 (2026-11-26, H-194, H-344, SPEC-002 0.5, SPEC-006 0.16 DECK-050…056): no endpoint change and no stored-shape
  change. New section "Deck legality engine": `data/banlist.json` (Standard + `2v2` `unverified` list) and
  `data/formats.json`, `web/src/app/core/legality/` (`evaluateLegality`, rules, data check), `CardData.loadLegalityData()`
  (bundled lazy chunk; `loadBans()` now returns the real list instead of `null`). Shape changes: `BanList.format` is
  `FormatId | string`, `BanList.status` adds `'unverified'`, `FormatDef.notes?`; `ban-status.ts` exports `banListFor`,
  `orderedWaves`, `bannedSet`; `verdictLabel()` in `core/decks`; `PreparedDeck.legalityData`, `DeckReview.legality`
  (`ReviewLegality`), `prepareDeckImport(…, legalityData = null)`, `reviewLegality()`, `localIsoDate()`;
  `RULE_CHECK_WORDS` / `BAN_LINE_TEXT` in `shared/deck-detail/detail-view.ts`.
- v1.34 (2026-11-26, H-195, SPEC-001 0.4.1): no endpoint change and no shape change. Doc pins move from SPEC-001
  v0.2 to 0.4.1 (header, Shared types, browser-side "Read from other specs"); the `0.2+` prefix of `catalogVersion`
  is explained as the snapshot `schemaVersion`. Card types checked against the spec and `services/src/domain/types.ts`:
  no mismatch. `GET /api/cards/:cardKey` now states it is exact-only as built and that the CARD-034 article step is
  missing in `services/` (H-648). The v1 entry below keeps its historical v0.2 pin.
- v1.33 (2026-11-26, H-500, SPEC-006 0.14 DECK-104): no endpoint change and no shape change. `reviewDeck` holds
  `PICK_LEGEND` while a Legend-section line is unresolved; `DECK_REVIEW_WORDS.legendUnresolved` is removed.
- v1.32 (2026-11-26, H-480, SPEC-006 0.13 DECK-100, DECK-101): no endpoint change and no stored-shape change. New
  pure `lineIdentities()` and `carryReviewAnswers()` in `shared/import/deck-import.ts`; `app-deck-review` input
  `initialState` and method `answers()`.
- v1.31 (2026-11-26, H-452, critique H-341 §4): no endpoint change and no stored-shape change. Review-only shape
  additions: `ReviewLine.movedToMain`, `ReviewNote` (`id`, `removable`), `DeckReview.removedLines`,
  `DeckImportLine.code` / `noteKind`; `championExtraToMain(n)` and `championNotPicked` reworded.
- v1.30 (2026-11-26, H-410, SPEC-006 0.12 DECK-027): no endpoint change and no stored-shape change. `reviewDeck`
  keeps one copy in `champion`; extra copies of the same card go to `main` with the `championExtraToMain` reason.
- v1.29 (2026-11-25, H-343, SPEC-001 CARD-034, SPEC-006 DECK-040): no endpoint change and no stored-shape change.
  New `looseKey` and `nameLookup` in `core/cards/name-key.ts`, used by `resolveCollectionImport` and
  `prepareDeckImport`: a name with no exact match retries without a leading "a" / "the" (both ways); a name several
  cards share that way is left out of the collection import and is the new `AMBIGUOUS_NAME` attention code (with the
  cards as `choices`) in Deck Import.
- v1.28 (2026-11-25, H-060 follow-up, RJ H-382): no endpoint change and no stored-shape change. `app-lock-badge`:
  `lock` is optional (default `null`), the badge renders from `label` alone, and two size custom properties; existing
  bindings (`[lock]`, `[label]`, `[showDate]`) work unchanged. `app-deck-tile` shows the lock as `app-lock-badge` (no
  date) next to `app-deck-status-chip`, which it now binds with `filter` only; the chip's inputs are unchanged.
- v1.27 (2026-11-25, H-254, SPEC-005 0.10.2, SPEC-006 0.11.1): no endpoint change and no stored-shape change. New section
  "Deck detail": the pure helpers in `shared/deck-detail/detail-view.ts`, the page's reads, reload triggers and writes
  (rename, duplicate, delete + Undo), and the device setting `deck-view`; the header uses H-060's `app-lock-badge`
  and `app-lock-actions` and re-reads on `DeckLocks.changed`. (v1.26 is H-060's.)
- v1.26 (2026-11-25, H-060, SPEC-005 0.10.2, SPEC-008 0.4.6): no endpoint change and no stored-shape change. New
  section "Decks list and shared lock pieces": `deck-list.ts`, `deck-locks.ts`, `DeckLocks`, `app-deck-tile`,
  `app-deck-status-chip`, `app-lock-badge`, `app-lock-actions` (+ `LockInDialog`), `app-shortfall-warning`;
  `shortfallWarning` ends with " It stays locked."; `ImportConfirmData.shortfalls` replaces `warnings`;
  `DeckStore.newerDecks()`; the lock store's orphan check counts read-only decks; `CardArt.animateChange`.
- v1.25 (2026-11-25, H-311, SPEC-005 0.10.2): no endpoint change and no stored-shape change. `DeckOwnershipView.summary`
  gains `completionFill` and `completionPercent` (OWN-101); `DeckTileSummary` gains `legend`, `completionFill`,
  `completionPercent`, `bans` (`DeckTileBans`), `pilot` and `readOnly` (OWN-100…104); new pure `completionPercent(a, r)`.
- v1.24 (2026-11-25, H-253, SPEC-006 0.11.1): no endpoint change. Unpicked cards under `Champion:` (and extra copies of the
  picked one) go to `main` with a line reason instead of `importRemovedLines` (DECK-034; RJ 2026-11-25); unpicked Legends
  are still left out. New "Deck Import save" section: `deck-import.ts`
  (pure review and draft), `DeckReview` step in the shared dialog, `DeckImport` committer (`stores.decks.create`, "Deck
  saved." / View deck), `NEW_DECK_ID`; `ImportCommitter` is generic and `prepare` gets the text; parser
  `sourceLines()`, `sectionLabelOf()` and bold section labels (IMP-016); `ImportPending` removed.
- v1.23 (2026-11-25, H-155, SPEC-008 0.4.6, SPEC-005 0.10.2): no endpoint change. `canLock` takes `isLocked`
  (`already-locked` first, also with a null pool); `lockedShortfalls` compares per cardKey; `OwnershipFilter` gains
  `'unavailable'`; `CollectionOwnership` `'unavailable'` gains optional `locks`; new `storedLockState`;
  `DeckOwnershipView.lock` keeps a stored lock while ownership is unavailable (SHARE-053, OWN-065).
- v1.22 (2026-11-25, H-158, SPEC-003 0.12): no endpoint change. New "Owned Cards Import commit and Undo" section
  (`collection-commit.ts`, `ImportCommitter`, `CollectionImport`); `snapshotPrevious` keeps an empty snapshot when
  nothing was stored (`EMPTY_SNAPSHOT_AT`); new `clearPrevious()` on the raw and tracked collection stores.
- v1.21 (2026-11-25, H-246, SPEC-010 v0.17.0): no endpoint change. Theme: `ThemeChoice` is `light` | `dark`,
  `parseTheme` returns `null` for anything else, new `effectiveTheme` / `toggledTheme`, `ThemeService.effective` and
  `toggle()` replace `choice` / `set()`, unknown stored values are removed; `ThemeToggle` replaces `ThemeSwitch`. New
  `AccountTab` (phone account tab template). The account menu has no Theme group.
- v1.20 (2026-11-25, H-180, SPEC-010 v0.15.1): no endpoint change. New "Privacy notice" section: the notice text
  file, `PRIVACY_NOTICE_TEXT`, the Markdown subset parser, `/privacy`, its three links, SYNC-101 check 1 (in
  `build.mjs`) and check 2 (`check:privacy-release`, `main` workflow and `firebase.json` predeploy), the release step.
- v1.19 (2026-11-25, H-213, SPEC-010 v0.16.0): no endpoint change. Firestore rules: `validUsername` (SYNC-160)
  checks the allowed set and 1 to 20 code points with RE2 `matches()` when `username` changes (unchanged names
  pass, create still denies it); replaces the v0.15 length-only check. Shared test data `username-cases.ts`; the
  H-183 `size()` probe moved to `lastClientVersion`. Emulator-verified; production `unverified`.
- v1.18 (2026-11-25, H-202, SPEC-012 0.1): no endpoint change. New "Release changelog" section: `ChangelogEntry`,
  `CHANGELOG_DATA`, the pure changelog rules, the `/changelog` page, `check:changelog-release` and the release step.
- v1.17 (2026-11-25, H-207, SPEC-010 v0.15.0): no endpoint change. Username: client 20 NFC code points and the
  SYNC-153 (4) allowed set (no emoji), counter `n / 20`, `USERNAME_MAX` replaces `USERNAME_MAX_GRAPHEMES` /
  `USERNAME_MAX_UNITS`; rules `size()` 1 to 80 (was 2000), checked only when `username` changes.
- v1.16 (2026-11-25, H-176, SPEC-010 v0.14.1): no endpoint change. New "Header account, username, theme, imports
  from their pages" note: `AccountDoc.username?`, `StoredSyncLog.username?`, `RemoteStore.setUsername`,
  `EngineDeps.onAccountCreated`, the rules' create / update split for `username` (`string.size()` counts UTF-16 units
  on the emulator), `device-theme`, the `/import` route and page removed, one-shot `?add=1` / `?import=1`.
- v1.19 (2026-11-25, H-205, SPEC-013 0.1.2): no endpoint change. New "Test data on live" note: the `test-data-<n>`
  marker and reserved deck ids, the pure plans, `loadTestData` / `removeTestData` / `removeTestDecks` over the tracked
  stores, `CardData` serving the generated catalog for a marked collection, `environment.testDataEnabled`.
- v1.15 (2026-11-25, H-172, SPEC-010 v0.12 account-only): no endpoint change. Removed: the `signInEnabled`
  environment flag, `SIGN_IN_ENABLED`, `environment.preview.ts` (preview builds `environment.ts`),
  `SignInGate.offerDeleteLocalData`, `BrowserStores.clearCollectionData()`, `COLLECTION_DATA_KEYS`. Changed:
  `gateState(log, runtime?)` (no mode parameter); `AUTH_PROVIDERS` moved to `core/sync/auth-providers.ts`. New
  "Browser cache" note (SYNC-140…146). Test helper `provideOpenGate()` (`core/sync/testing/open-gate.ts`).
