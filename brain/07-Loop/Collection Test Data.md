---
tags: [loop, testing, collection]
updated: 2026-11-25
---
# Collection Test Data

How to fill the Collection page with **injected sample cards**, in the browser and in unit tests.
Use this for any review, validation or screenshot of `/collection` (and the deck engine) until
real card data exists (H-020) and the Import page saves a collection. All sample data is
invented. Built in H-086, fixes H-095, runes-as-cards H-098.

> **On live (H-204, [[Test Data]] SPEC-013, build H-205):** signed-in testers get Small (150) and Large (5,000) generated sets from the Collection page, synced to their account and removable; the fixture sample stays dev-only (needs `/api`). The section below is the **dev-only** `/styleguide` tool.

## On live: Load test data (H-205)
Signed in, on an empty **Collection**: **Load test data** under "Add to your collection" → Small (150) or Large
(5,000). While test data is present a banner sits above the list with **Change set** and **Remove test data**.
It writes through the tracked stores, so it syncs to the account like an import. Marker: the collection's
`catalogVersion` is `test-data-<n>`; test decks use the reserved ids `…000000000001…003`. Flag:
`environment.testDataEnabled`. Code: `web/src/app/shared/collection/test-data.ts`,
`web/src/app/core/test-data/`, [[API Contracts]] "Test data on live".

### Quota and document-size checks (recorded 2026-11-25, H-205)
Measured by `web/src/app/core/test-data/test-data-ops.spec.ts` with the real sync engine and push plan against the
fake Firestore (`shared/sync/testing/fakes.ts`; it logs one entry per document write and counts reads), and the
size by the Firestore storage-size rules (`shared/sync/testing/firestore-size.ts`: string = UTF-8 + 1, number and
timestamp = 8, map = keys + values + 32, document name = ids + 16, document = name + fields + 32) applied to the
document the push actually stored, with a 28-character uid.

| Check | Measured | Accepted |
|---|---|---|
| Large `users/{uid}/state/collection`, serialized (1,667 cards, 5,000 printings, `test-data-5000`) | **254,167 bytes** (24.2 % of 1 MiB) | ≤ 262,144 |
| Same document after Remove (1,667 tombstones, `catalogVersion ""`) | 172,486 bytes | (no limit set; spec ≈ 172 KB) |
| Writes per **Load** (Large; Small is the same) | **5**: `set` collection, `set` locks, `set` × 3 decks | 5 to 6 |
| Writes per Load after a build change | **5**: the account `update()` (SYNC-012) went out with the start-up sync, before the Load; it would be the 6th only if it shared the Load's push | 5 to 6 |
| Reads per Load | **0** | 0 |
| Writes per **Remove** | **5**: `update` collection + `update` locks at once, then `set` × 3 deck tombstones after the 10 s Undo window | 5 to 6 |
| Reads per Remove | **0** | 0 |

Caveat: these pushes ran within 60 s of the last pull. A push that starts more than 60 s after the last pull is
preceded by the usual delta pull (`PULL_BEFORE_PUSH_MS`, SYNC-040), which reads like any other push would; that is
sync behaviour, not the cost of a Load or Remove.

Rules: `web/rules-tests/test-data.test.ts` shows the Large load (generator output, adapter shape) and its Remove are
accepted for the owner under the unchanged `firestore.rules`, and refused for another user.

## In the browser (dev build only)
1. **Card data:** `services/` serves the fixture. Run `npm run ingest:fixture` once (writes
   `data/cards.json` from `data/samples/fixture/riot-contents.fixture.json`), then `npm run dev`
   (port 3000).
2. **App:** `web/` → `npm start` (port 4200; `/api` is proxied to :3000).
   `.claude/launch.json` has both as `services` and `web` (start `services` first).
3. Open **`/styleguide`** → section **"Sample collection (dev builds only)"**:

| Button | What it writes | Needs the API? |
|---|---|---|
| **Load fixture sample** | `sampleOverCatalog(fixture)`: most printings owned with varied counts, unassigned copies, one missing printing, one unresolved card, **two locked decks (one short)** and one unlocked deck. Shows "123 copies of 46 cards" (2026-11-24). | Yes |
| **Load 5,000 generated entries** | `generateLargeSample(5000)`: a generated catalog (⌈5000/3⌉ cards × 3 printings), 5,000 tiles, two locked decks and one unlocked. Sets `rift.dev.sample = large`, so `CardData` uses the generated catalog instead of `/api`. | No |
| **Clear sample data** | Asks first. Clears the collection, locks and printing codes, and deletes **only** the decks the sample wrote (ids in `rift.dev.sampleDecks`). Decks you added yourself stay. | No |

4. Open **`/collection`**.

**Both Load buttons replace this browser's collection, decks and locks** after a `confirm()`.
In an automated browser (Playwright, the browser pane), check `localStorage` is empty or
disposable first, then accept the dialog, e.g. `window.confirm = () => true` before clicking.
Never load samples into a browser profile that holds real data.

**Storage keys** (localStorage, prefix `rift.`): `rift.collection`, `rift.locks`,
`rift.printingCodes`, `rift.deck.<id>`, plus the dev keys `rift.dev.sample` and
`rift.dev.sampleDecks`.

**Expected, not bugs:** the notice "The ban list couldn't load, so ban status is unknown." shows
on every visit: `CardData.loadBans()` returns null until a ban-list source exists. On the live
site, `/collection` shows "Card data couldn't load" because `/api` has no production host
(ADR-0004).

## In unit tests
- `web/src/app/shared/collection/sample-data.ts`: `generateLargeSample(n)` (catalog,
  collection, decks, locks of any size), `sampleOverCatalog(catalog)`, `sampleDeck(...)`,
  `sampleDeckId(i)`. Pure; use them instead of hand-built records.
- `web/src/app/pages/collection/collection-page.spec.ts` `setup(url, options)`: an in-memory
  `MemoryBackend` + `createBrowserStores`, seeds the sample through `stores.raw`, and stubs
  `CardData` (`loadCatalog`, `reload`, `loadBans`). Options exercise the failure states:
  `catalogError`, `corruptCollection`, `corruptLocks`, `decksError`, `bans`.
- `web/src/app/pages/styleguide/collection-samples.ts`: the tiny `SGP` "Preview" catalog behind
  the styleguide tiles and dialog samples (Storm Caller, Iron Warden, Hextech Ray, Lonely
  Lantern, Calm Rune). Calm Rune sits in a locked and an unlocked deck (runes are cards, H-098).
- Performance: the page and view specs check 5,000 entries (virtual scroll renders ~8 rows).

## Checks to run on a Collection change
Lint, build and `npm test -- --watch=false` in `web/`. Then the fixture sample at 1440 / 1024
/ 768 / 390 (and 320), dark and light, reduced motion, keyboard (one Tab stop, arrows, Enter,
Escape, `/`, `[` / `]`), and the 5,000 sample for scrolling. Acceptance points:
[[Collection]] A1–A14 and [[Collection Components]] reviewer checklist; last review
[[Collection Review H-086]].
