---
tags: [services, contract]
version: 1
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

## Changelog
- v0: created
- v1 (2026-11-23, H-008): first endpoints: `GET /api/health`, `GET /api/sets`, `GET /api/cards`
  (paging), `GET /api/cards/:cardKey`; error shape and codes; `CardWithPrintings` and response
  wrappers over the SPEC-001 v0.2 types; CORS for `http://localhost:4200` in development only.
- v1.1 (2026-11-23, H-055): no endpoint change. Base URL is `/api` in dev and prod (dev via the
  `ng serve` proxy); production `/api/**` returns `404` until ADR-0004 picks an API host.
