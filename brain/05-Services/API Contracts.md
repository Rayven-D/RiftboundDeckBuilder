---
tags: [services, contract]
version: 1.24
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
canLock(pool: SharedPool | null, deck: UserDeck, readOnly: boolean, isLocked: boolean): LockCheck // SHARE-020; null = ownership unavailable; isLocked from the lock store; no-cards = no entry at all
storedLockState(locks: readonly DeckLock[] | null, deckId: string): DeckLockState | null // SHARE-053 (a): lock state without a pool
countedEntries(deck: UserDeck): { zone; entry }[]                                  // every entry of COUNTED_ZONES (= ZONE_ORDER, runes included)
lockedShortfalls(before: SharedPool, after: SharedPool): LockedShortfall[]         // SHARE-034 v0.4.2: per cardKey hold drop
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
- `canLock(pool, deck, readOnly, isLocked)` (SHARE-020 v0.4.2): `isLocked` = the deck has a `DeckLock` in a
  **readable** lock store (pass `false` when the store is unreadable, SHARE-061). `already-locked` is checked first,
  so it is returned also with a `null` pool (ownership unavailable) and on a read-only deck; the engine no longer
  reads the lock from the pool for this check. Show Unlock (no reason line) for `already-locked`.
- `lockedShortfalls(before, after)` (SHARE-034 v0.4.2): a deck locked in both pools is listed when, for **any**
  `cardKey`, its hold in `after` is lower than in `before` (a Σ that stays equal does not hide it); `cardsShort` =
  the deck's number of short cardKeys in `after`; order = `after`'s lock order. The caller appends " It stays locked."
  in confirmations (`collection-import.ts`).
- Ownership unavailable (OWN-062/063, SHARE-053, OWN-065): `CollectionOwnership` `{ status: 'unavailable', locks? }`
  carries the stored locks (`readonly DeckLock[]`; `null` = lock store unreadable; omitted = no lock known, treated
  like `null`). **The page must pass the stored locks** so locked decks keep their badge. Then:
  `OwnershipCard.label` is `''` (no count labels); `DeckOwnershipView.lock` is
  `{ deckId, locked: true, lockedAt, complete: false, short: false, cardsShort: [] }` for a deck with a stored lock
  (earliest in lock order, SHARE-022), else `null` (`storedLockState`). With `status: 'ok'` and `catalog === null`
  (OWN-063) the same state is built from the pool's lock facts (none when `locksIgnored`), holds discarded.
  `DeckTileSummary`: `ownershipLine` "Ownership unavailable", `ownershipFilter` `'unavailable'` (SHARE-051 rule 0,
  for every deck), `lockBadge` "Locked" for a locked deck, never "… cards short"; `null` otherwise.
- `OwnershipFilter` = `'ready' | 'partial' | 'none' | 'locked' | 'unavailable'`; `unavailable` and `locked` match none
  of the three ownership filter options (OWN-006).

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

## Owned Cards Import commit and Undo (SPEC-003 IMP-049…052, IMP-072…075; H-158)
Not an endpoint. Writes go through the **tracked** `stores.collection` only.
- **Pure logic** (`web/src/app/shared/import/collection-commit.ts`): `resolveCollectionImport(parse, catalog)` →
  `ResolvedCollectionImport { cards, copies, cardCount, leftOut, notes, catalogVersion }`: exact `nameKey` names
  (IMP-025) and printing codes through `printingLookup(catalog)(setCode, collectorNumber)` (CARD-036 over the browser
  catalog: `found` with the first printing / `not-found` / `ambiguous`; IMP-067 exact-name guard, IMP-068 a/c,
  IMP-069). Names that would need the fuzzy review (IMP-026…030), IMP-068 (b) and ambiguous codes are **left out**
  with a line message. `addToCollection(before, imp, at)`, `replaceCollection(imp, at)`, `replaceChanges` +
  `replaceConfirmText` (IMP-050, AC 19 form), `commitNotice(mode, imp, written)` (IMP-073), `changedSinceCommit`,
  `snapshotIsOurs`, `nextUpdatedAt(now, previous)` (monotonic), `UNDO_TEXT`.
- **Dialog seam** (`ImportCommitter<P = PreparedOk, C = CommitMode> { prepare(parse, text), commit(prepared, choice) }`,
  passed as `ImportDialogData.committer`): with it, Continue shows the review step and the dialog closes with `'committed'`
  only after `{ status: 'written' }`; `{ status: 'error', message }` stays in the dialog; `'cancelled'` (Replace
  confirmation cancelled) stays too. Without a committer the dialog closes with the `ParseResult` (no caller does
  this any more since H-253). v1.24: generic over the review shape `P` and the action's choice `C`; `prepare` also
  gets the text box as parsed (`text`, used by Deck Import for `importRemovedLines`; the collection ignores it).
- **Service** (`web/src/app/core/import/collection-import.ts`, `CollectionImport`, root): implements
  `ImportCommitter`; `undo()`; `written: Subject<void>` (fires after a commit or Undo this tab wrote; Collection
  reloads in place, COLL-091). Notice: `MatSnackBar` `(message, 'Undo', { duration: COMMIT_NOTICE_MS = 10_000,
  politeness: 'polite' })`. Undo: Nothing to undo unless the stored snapshot's `updatedAt` equals the one this commit
  kept; COLL-058 confirmation when the stored record's `updatedAt` differs from the commit's; IMP-050a warnings from
  `lockedShortfalls` over `computeSharedPool`; restore = `save({ ...snapshot, updatedAt: next }, { replace: true })`
  then `clearPrevious()`. Error strings: `COMMIT_TEXT`.

## Deck Import save (SPEC-006 DECK-001…098; H-253)
Not an endpoint. "Import deck" on `/decks` reuses the H-158 dialog seam (folds in H-273): `ImportDialogData.deckCommitter`
is an `ImportCommitter<PreparedDeck, DeckSaveRequest>`. Writes go through the **tracked** `stores.decks.create()` only
(one new `decks/{id}` document per Save, stamped for sync, SYNC-031); nothing else is written (DECK-002), and Continue
writes nothing (DECK-003).
- **Pure logic** (`web/src/app/shared/import/deck-import.ts`): `prepareDeckImport(parse, sourceLines(text), catalog)` →
  `PreparedDeck { lines: DeckImportLine[], sourceFormat, catalogVersion, sections, legends, champions, catalog }`
  (exact `nameKey` names and printing codes through `printingLookup`, as the collection commit; a line that can't
  resolve carries `attention: { code: 'UNKNOWN_CARD' | 'UNKNOWN_PRINTING' | 'PRINTING_NAME_MISMATCH' |
  'AMBIGUOUS_PRINTING', message }` and, for a code/name mismatch, two `choices`).
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
  puts them all in `main`. Save still waits for every answer (DECK-038).
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
- **Not built:** legality in the review (DECK-050…056, no SPEC-002 engine or ban data in `web/`), fuzzy suggestions
  (DECK-043, IMP-026…030, H-272), the optional leading article (CARD-034), deck codes / TTS (DECK-012, DECK-039, H-047).

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
  `removeTestDecks(stores, now)`: the TEST-033 part for a Replace import (test decks and their locks only). The
  import commit exists since H-158 (`CollectionImport.commit`, see "Owned Cards Import commit"); **a Replace must
  call `removeTestDecks` in the same commit** (H-233, marked in the code next to the save).
- **Catalog** (`CardData.loadCatalog()`): reads the stored collection (`stores.raw.collection`, read only); with the
  marker it returns `generateLargeSample(n).catalog` (dynamic import, its own lazy chunk), with no `/api` call and no
  dev key; the cached catalog follows the marker (a Remove goes back to `/api`). The dev key path is unchanged.
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
