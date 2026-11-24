---
tags: [services, contract]
version: 1
---
# API Contracts

Owner: **service-builder**. The UI builds only against this note. Update it *before* behavior
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
  instead of `void`; `PushChanges` carries `replace` per state document, `updatedAt`, and the account
  write as `{ create, createdAt, updatedAt, lastClientVersion }` (no `batch` flag since v1.5: `push()` writes
  one document at a time, in order, account first); `AuthService.restore()`,
  `sendEmailLink(email)`, `isEmailLinkReturn()`, `needsRecentSignIn()`, `signIn(providerId, email?)`;
  `StoredSyncLog.cloudDocs` (documents known to exist, for create vs update), `pending.collectionReplace`,
  `locks[id].h` (lockedAt), `deckTombstones[id].createdAt` and `.wasPending`; after H-062 round 1 also
  `deckCreated` (deck createdAt for tombstones), `lastBuild` (this device's build: SYNC-118 retry and the
  once-per-build account update), `uploadingUid` (v0.7 only: no longer written since H-081, an old value is
  ignored and dropped by the first-sign-in clear), `deletingUid` (this device's unfinished deletion: sync stopped, Delete retryable);
  `AuthService.reauthenticate()` may return `'needs-sign-in'` (email link); `RemoteErrorCode` adds
  `'unconfirmed'` (a write not acknowledged in 20 s: kept pending, confirmed by the next pull).
- **Unfinished deletion and Cancel deletion (SYNC-096, H-086):** `RemoteStore.deleteAll(uid)` returns
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
- **Account-required mode (SYNC-008/009/048/086/090/091/097, H-081):** the sync engine runs only when
  `signInEnabled` is true, so everything below applies to that mode; with `signInEnabled: false` nothing here
  runs (no gate, no clearing).
  - Sync log `sessionLostUid?: string | null`: set to the linked uid when a lost session is detected (SYNC-086);
    cleared by a successful sign-in with that uid, by a start-up whose restore returns the linked uid and passes
    the account check, and by every log clear (`emptySyncLog()` writes `sessionLostUid: null` and no longer writes
    `uploadingUid`).
  - Gate (pure, `web/src/app/shared/sync/gate.ts`): `gateState(signInEnabled, log, { firstSyncFailed?, sessionLost? })`
    → `'open' | 'signed-out' | 'session-lost' | 'first-sync' | 'first-sync-failed'`; always `'open'` in local-only
    mode. `LocalSyncLogStore.peek()` reads the log synchronously so the gate is right at the first frame.
    `SyncEngine.gate()` adds the session's runtime state. Angular: `SignInGate` (`core/sync/sign-in-gate.ts`):
    `state`, `open`, `deckControls` (Tournaments Add to your decks / In your decks / Add another copy render only
    while true), `offerDeleteLocalData` (SYNC-052: true only in local-only mode), `signIn()`, `retry()`; kept
    current by `SyncService`. Gated pages render `<app-sign-in-panel page="collection|decks|import">` instead of
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
- **SYNC-097 Auth codes (verified on the Auth emulator, 2026-11-23):** deleted user → `reload()`
  `auth/user-token-expired`, forced refresh `auth/invalid-refresh-token`; revoked → `reload()`
  `auth/user-token-expired` (refresh still works in the emulator); disabled → `auth/user-disabled`.
  `checkAccount()` forces a refresh first; `auth/invalid-refresh-token` / `auth/user-not-found` → `deleted`.
- **Rules and indexes:** `firestore.rules` (owner only, known paths, field validation, `existsAfter()` on
  creates) and `firestore.indexes.json` (every field but `syncedAt` exempt). Not deployed: deploy with
  `firebase deploy --only firestore` before sign-in ships (SYNC-117).

## Builds and deploys (SPEC-010 SYNC-007, SYNC-012, H-078)
- **`appVersion` per build (SYNC-012).** `web/scripts/build.mjs` computes it and passes it to `ng build` as the
  define `APP_VERSION` (nothing is written into the source tree). Format `web-<prod|preview>-<id>`: `<id>` is
  the first 7 characters of the full commit id, lowercased (`git rev-parse HEAD`, else `GITHUB_SHA`), or the
  UTC build time `YYYYMMDDTHHMMSSZ` when neither gives a full id. ≤ 40 characters of `[0-9A-Za-z._+-]`; the
  script fails the build rather than ship anything else. Pure logic: `web/scripts/app-version.mjs`
  (`appVersion`, `resolveCommitId`, `formatBuildTime`, `ngBuildArgs`). `environment.ts` and
  `environment.preview.ts` read `APP_VERSION`; a bare `ng build` without the define falls back to `web-dev`.
  The dev server keeps `web-dev` (`environment.development.ts`); unit tests inject their own value.
  The id is the commit checked out: uncommitted changes do not change it.
- **Builds** (from `web/`): `npm run build` = production (`signInEnabled: false`, `web-prod-…`, output
  `web/dist/web`); `npm run build:preview` = `ng build --configuration preview` (`signInEnabled: true`,
  `web-preview-…`, output `web/dist/web-preview`).
- **Production deploys (unchanged):** `firebase deploy --only hosting` and the GitHub Actions deploy of `main`
  run the `firebase.json` predeploy `npm --prefix web run build` and upload `web/dist/web/browser`.
- **Preview deploy (SYNC-007), the only supported way to put sign-in on a URL:**
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

## Changelog
- v0: created
- v1 (2026-11-23, H-008): first endpoints: `GET /api/health`, `GET /api/sets`, `GET /api/cards`
  (paging), `GET /api/cards/:cardKey`; error shape and codes; `CardWithPrintings` and response
  wrappers over the SPEC-001 v0.2 types; CORS for `http://localhost:4200` in development only.
- v1.1 (2026-11-23, H-055): no endpoint change. Base URL is `/api` in dev and prod (dev via the
  `ng serve` proxy); production `/api/**` returns `404` until ADR-0004 picks an API host.
- v1.2 (2026-11-23, H-062): no endpoint change. New section "Browser stores and sync": the SPEC-010
  store, sync-log and adapter contracts in `web/`, and the additions the build needed.
- v1.3 (2026-11-24, H-086): no endpoint change. `RemoteStore.deleteAll` reports `removedAny`; sync log
  `deletingRemovedAny`; engine/service `unfinishedDeletion()` and `cancelDeletion()` (SYNC-096).
- v1.4 (2026-11-24, H-081): no endpoint change. Account-required mode: sync log `sessionLostUid`,
  `uploadingUid` no longer written, the gate (`gateState`, `SignInGate`, `LocalSyncLogStore.peek()`), sign-out
  without a mode, Combine and upload paths removed.
- v1.5 (2026-11-24, H-077): no endpoint change. `PushChanges.batch` and `PlanOptions.batch` removed (the adapter
  no longer uses `writeBatch`); new pure `planAccountPush(account)`; the first-sign-in flow pushes the account
  write only (SYNC-050).
- v1.6 (2026-11-24, H-078): no endpoint change. New section "Builds and deploys": per-build `appVersion`
  (SYNC-012) and the preview deploy command `npm run deploy:preview -- <channel> [expires]` (SYNC-007).
