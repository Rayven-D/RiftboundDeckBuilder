---
tags: [loop, testing, collection]
updated: 2026-11-24
---
# Collection Test Data

How to fill the Collection page with **injected sample cards**, in the browser and in unit tests.
Use this for any review, validation or screenshot of `/collection` (and the deck engine) until
real card data exists (H-020) and the Import page saves a collection. All sample data is
invented. Built in H-086, fixes H-095, runes-as-cards H-098.

> **On live (H-204, [[Test Data]] SPEC-012, build H-205):** signed-in testers get Small (150) and Large (5,000) generated sets from the Collection page, synced to their account and removable; the fixture sample stays dev-only (needs `/api`). The section below is the **dev-only** `/styleguide` tool.

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
