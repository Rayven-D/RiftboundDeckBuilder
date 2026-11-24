---
tags: [services, contract]
version: 1.4
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
data contracts: [[Shared Cards and Lock-in]] v0.2, [[Runes Assumed Owned]] v0.2,
[[Your Decks Ownership View]] v0.4, plus the parts of SPEC-001/002/003/006/007 they read.

| Group | Types |
|---|---|
| SPEC-008 | `DeckLock`, `StoredDeckLocks`, `DeckLockStore`, `SharedPoolInput`, `SharedPool`, `CardPool`, `CardUse`, `DeckLockState`, `CardAvailability`, `LockCheck` (`LockFailure`), `LockedShortfall` |
| SPEC-005 | `CollectionOwnership`, `DeckOwnershipView`, `ZoneSection`, `OwnershipCard`, `OwnedPrintingRow`, `MissingLine`, `CardBan`, `DeckTileSummary` (`OwnershipFilter`) |
| Read from other specs | SPEC-006 `UserDeck`, `DeckCard`, `DeckZone`, `DeckSource`; SPEC-007 `DeckOwnershipInput`, `DeckOwnership`, `CollectionCatalogView`, `StoredTags`, `Tag`, `StoredPrintingCodes`; SPEC-003 `StoredCollection`; SPEC-002 `BanListFile`, `BanStatus`; SPEC-001 `PlayableCard`, `Printing`, `CardSet` (subset: no `collector` / `extra`) |

```ts
isRuneEntry(zone: DeckZone, card: PlayableCard | null): boolean                    // RUNE-001
computeSharedPool(input: SharedPoolInput): SharedPool                              // SHARE-070
availability(pool: SharedPool, deckId: string, cardKey: CardKey): CardAvailability // SHARE-010/011/015
canLock(pool: SharedPool | null, deck: UserDeck, readOnly: boolean): LockCheck     // SHARE-020; null = ownership unavailable
lockedShortfalls(before: SharedPool, after: SharedPool): LockedShortfall[]         // SHARE-034
computeDeckOwnership(deck, ownership: CollectionOwnership, catalog | null, banData | null, today): DeckOwnershipView // OWN-025
summarizeDeck(deck, view, legality: { verdict; asOf } | null, format: { id; name } | null): DeckTileSummary
// text helpers: lockCheckMessage(), cardsShortText(), sharedIndicator(), shortfallWarning(), shortfallNotice()
// minimal stand-ins until SPEC-007 / SPEC-002 are built in web/: deckOwnership(input, cardKey) (COLL-081),
//   cachedDeckOwnership() (OWN-083, per input object), banStatus(data, cardKey, format, region, asOf) (LEGAL-B10)
```
Notes for the UI:
- Treat every input as an immutable snapshot. **H-060 must create a new `DeckOwnershipInput` object
  on every change** to the collection, tags, printing codes or catalog. `cachedDeckOwnership`
  reuses results per input object (WeakMap identity), so mutating an input in place would show
  stale counts.
- Treat `BanListFile` as an immutable snapshot too: `banStatus` builds its banned/upcoming lookup
  once per (file object, format, region, asOf) (OWN-080), so load a new object when the ban data
  changes.
- Rune detection (RUNE-001) in `computeDeckOwnership` uses `ownership.input.catalog` when ownership
  is ok, the same catalog as `computeSharedPool`. Deck entries must be DECK-096-valid (`qty` 1..999).
- Compute one `SharedPool` per input change and pass it to every deck view and tile (SHARE-071).
- Lock order (SHARE-030) is a total order: parsed `lockedAt` ascending with unparseable values
  after every parseable one, then the raw `lockedAt` string, then `deckId`.
- `canLock(null, …)`: with ownership unavailable the pool is `null`, and the pool is the engine's
  only lock source, so `already-locked` can't be detected (a locked deck gets `read-only` or
  `ownership-unavailable`). **The caller must check the lock store itself** and show Unlock, not a
  disabled Lock in, for a locked deck.
- With ownership unavailable (OWN-062/063), all **pending a spec-writer decision** (board item to
  follow): `OwnershipCard.label` is `''` (no count labels); `DeckOwnershipView.lock` is `null`, so
  `DeckTileSummary.lockBadge` is `null` (no lock badge, even for a locked deck);
  `DeckTileSummary.ownershipLine` is "Ownership unavailable" (wording pending spec); and
  `DeckTileSummary.ownershipFilter` is `'none'`.

## Changelog
- v0: created
- v1 (2026-11-23, H-008): first endpoints: `GET /api/health`, `GET /api/sets`, `GET /api/cards`
  (paging), `GET /api/cards/:cardKey`; error shape and codes; `CardWithPrintings` and response
  wrappers over the SPEC-001 v0.2 types; CORS for `http://localhost:4200` in development only.
- v1.1 (2026-11-23, H-055): no endpoint change. Base URL is `/api` in dev and prod (dev via the
  `ng serve` proxy); production `/api/**` returns `404` until ADR-0004 picks an API host.
- v1.2 (2026-11-23, H-059): no endpoint change. Added "Browser-side shared types": the pure deck
  ownership engine in `web/src/app/core/decks/` (SPEC-005 v0.4, SPEC-008 v0.2, SPEC-009 v0.2).
- v1.3 (2026-11-23, H-059 review): no endpoint change. Engine notes: SHARE-030 total lock order,
  `canLock(null, …)` caller duty, new `DeckOwnershipInput` per change (H-060), and the
  ownership-unavailable view values pending spec.
- v1.4 (2026-11-23, H-059 review 2): no endpoint change and no shape change. `banStatus` memoizes
  its lookup per `BanListFile` object (OWN-080); rune detection in the view uses the pool's
  catalog; entries rely on DECK-096 validation.
