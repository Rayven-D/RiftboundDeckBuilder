---
tags: [services, contract]
version: 1.8
---
# API Contracts

Owner: **builder**. The UI builds only against this note. Update it *before* behavior
changes, and post breaking changes to the [[Handoff Board]].

Implementation: `services/` (Node `http`, TypeScript). Card shapes are the SPEC-001 v0.2 data
contract ([[Card Data Model]]); the TypeScript source of truth is `services/src/domain/types.ts`.

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
SPEC-001 v0.2 shapes, unchanged: `CardSet`, `PlayableCard`, `Printing`, `CardCategory`,
`VariantKind`, `CardLookup` (see [[Card Data Model]] → Data contract). API wrappers:
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
| SPEC-008 | `DeckLock`, `StoredDeckLocks`, `DeckLockStore`, `SharedPoolInput`, `SharedPool`, `CardPool`, `CardUse`, `DeckLockState`, `CardAvailability`, `LockCheck` (`LockFailure`), `LockedShortfall` |
| SPEC-005 | `CollectionOwnership`, `DeckOwnershipView`, `ZoneSection`, `OwnershipCard`, `OwnedPrintingRow`, `MissingLine`, `CardBan`, `DeckTileSummary` (`OwnershipFilter`) |
| Read from other specs | SPEC-006 `UserDeck`, `DeckCard`, `DeckZone`, `DeckSource`; SPEC-007 `DeckOwnershipInput`, `DeckOwnership`, `CollectionCatalogView`, `StoredTags`, `Tag`, `StoredPrintingCodes`; SPEC-003 `StoredCollection`; SPEC-002 `BanListFile`, `BanStatus`; SPEC-001 `PlayableCard`, `Printing`, `CardSet` (subset: no `collector` / `extra`) |

```ts
computeSharedPool(input: SharedPoolInput): SharedPool                              // SHARE-070
availability(pool: SharedPool, deckId: string, cardKey: CardKey): CardAvailability // SHARE-010/011/015
canLock(pool: SharedPool | null, deck: UserDeck, readOnly: boolean): LockCheck     // SHARE-020; null = ownership unavailable; no-cards = no entry at all
countedEntries(deck: UserDeck): { zone; entry }[]                                  // every entry of COUNTED_ZONES (= ZONE_ORDER, runes included)
lockedShortfalls(before: SharedPool, after: SharedPool): LockedShortfall[]         // SHARE-034
computeDeckOwnership(deck, ownership: CollectionOwnership, catalog | null, banData | null, today): DeckOwnershipView // OWN-025
summarizeDeck(deck, view, legality: { verdict; asOf } | null, format: { id; name } | null): DeckTileSummary
// text helpers: lockCheckMessage(), cardsShortText(), sharedIndicator(), shortfallWarning(), shortfallNotice()
// minimal stand-ins until SPEC-007 / SPEC-002 are built in web/: deckOwnership(input, cardKey) (COLL-081),
//   cachedDeckOwnership() (OWN-083, per input object), banStatus(data, cardKey, format, region, asOf) (LEGAL-B10)
```
Notes for the UI:
- Stored-record shapes (`UserDeck`, `StoredCollection`, `StoredTags` schema 3, `DeckLock`, …) are defined once,
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
  after every parseable one, then the raw `lockedAt` string, then `deckId`.
- `canLock(null, …)`: with ownership unavailable the pool is `null`, and the pool is the engine's
  only lock source, so `already-locked` can't be detected (a locked deck gets `read-only` or
  `ownership-unavailable`). **The caller must check the lock store itself** and show Unlock, not a
  disabled Lock in, for a locked deck.
- With ownership unavailable (OWN-062/063), all **pending a spec-writer decision** (H-076): `OwnershipCard.label` is `''` (no count labels); `DeckOwnershipView.lock` is `null`, so
  `DeckTileSummary.lockBadge` is `null` (no lock badge, even for a locked deck);
  `DeckTileSummary.ownershipLine` is "Ownership unavailable" (wording pending spec); and
  `DeckTileSummary.ownershipFilter` is `'none'`.

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
  Saves to an area whose cloud document is newer throw `ReadOnlyAreaError` (SYNC-046 message).
  `TagStore.load()` migrates long tag ids to `t_` + 6 base-62 (`schemaVersion: 3`, SYNC-016).
- **Engine form of documents:** every Firestore `Timestamp` is milliseconds inside the engine; the adapter
  (`web/src/app/core/sync/adapters/firebase-adapters.ts`, the only Firebase import, lazy-loaded) converts
  and writes `syncedAt` with `serverTimestamp()`.
- **Additions to the SPEC-010 contract** (needed to build it; listed for the spec): `RemoteStore.getAccount(uid)`
  (the 1-read account check), `pull(..., { withAccount })`, `push()` returns a per-document `PushOutcome`
  instead of `void`; `PushChanges` carries `replace` per state document, `updatedAt`, `batch`, and the account
  write as `{ create, createdAt, updatedAt, lastClientVersion }`; `AuthService.restore()`,
  `sendEmailLink(email)`, `isEmailLinkReturn()`, `needsRecentSignIn()`, `signIn(providerId, email?)`;
  `StoredSyncLog.cloudDocs` (documents known to exist, for create vs update), `pending.collectionReplace`,
  `locks[id].h` (lockedAt), `deckTombstones[id].createdAt` and `.wasPending`; after H-062 round 1 also
  `deckCreated` (deck createdAt for tombstones), `lastBuild` (this device's build: SYNC-118 retry and the
  once-per-build account update), `uploadingUid` (an interrupted first-sign-in upload resumes without
  Combine), `deletingUid` (this device's unfinished deletion: sync stopped, Delete retryable);
  `AuthService.reauthenticate()` may return `'needs-sign-in'` (email link); `RemoteErrorCode` adds
  `'unconfirmed'` (a write not acknowledged in 20 s: kept pending, confirmed by the next pull).
- **SYNC-097 Auth codes (verified on the Auth emulator, 2026-11-23):** deleted user → `reload()`
  `auth/user-token-expired`, forced refresh `auth/invalid-refresh-token`; revoked → `reload()`
  `auth/user-token-expired` (refresh still works in the emulator); disabled → `auth/user-disabled`.
  `checkAccount()` forces a refresh first; `auth/invalid-refresh-token` / `auth/user-not-found` → `deleted`.
- **Rules and indexes:** `firestore.rules` (owner only, known paths, field validation, `existsAfter()` on
  creates) and `firestore.indexes.json` (every field but `syncedAt` exempt). Not deployed: deploy with
  `firebase deploy --only firestore` before sign-in ships (SYNC-117).

## Collection page (H-086)
Not an endpoint: the first web consumer of `GET /api/sets` and `GET /api/cards`, plus the pure
Collection view model. TypeScript source of truth: `web/src/app/shared/collection/`.
- **Catalog load** (`web/src/app/core/cards/card-data.ts`, `CardData`): `GET /api/sets`, then
  `GET /api/cards?page=N&pageSize=200` until `total` is reached, folded into the SPEC-007
  `CollectionCatalogView` (`printings` keyed by `printingId`; the `CardWithPrintings.printings`
  array is split off). Once per session; `reload()` retries. Any failure → `{ status: 'error' }`
  (page state S10). In production this fails until ADR-0004 hosts the API or a static snapshot.
- **Ban data:** `CardData.loadBans()` resolves `null` (no `banlist.json` is built or served yet), so
  every card's `EntryBan` is `unknown` ("Ban status unknown", COLL-008). Swap the body when a source exists.
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
