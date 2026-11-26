---
tags: [services, testing, playwright]
updated: 2026-11-26
---
# Browser Tests

Real-browser checks with **Playwright** (`@playwright/test` 1.65.1, exact devDependency, approved by RJ
2026-11-26). They cover what jsdom can't see in the `ng test` unit tests: layout, sticky bars, smooth
scrolling and real `storage` events between tabs. Built in H-440 / H-431.

| Test (file in `web/e2e/`) | Checks |
|---|---|
| `deck-detail-section-bar.e2e.ts` | **OWN-110** ([[Your Decks Ownership View]]): on "Generated Open" (all six zones, TEST-025), at 1440×900 and 375×812, each of the six section-bar links (then Legend again) scrolls its heading under the sticky bar (at bar bottom + 12 px, `LAND_GAP`, unless the page is at its scroll limit), focuses the heading and leaves exactly that link `aria-current="location"`; a plain page scroll moves `aria-current` to the section at the landing line. Guards the H-390 fix (checked by hand in Validation H-254 attempt 2). |
| `decks-scroll-kept.e2e.ts` | **OWN-071 / [[Decks]] §10 L11 "scroll kept"**: a `/decks` list of 27 decks scrolled halfway; a second page of the same browser context changes `rift.collection` (removes the Open deck's Legend), the browser fires a real `storage` event, the tile text changes (the recompute ran), the tile's DOM node is the same, and `scrollY` is unchanged and non-zero (Validation H-380 caveat). |

## How to run
1. Prerequisites: Node 22 (as for the rest of `web/`), `cd web; npm ci`.
2. Once per machine: `npx playwright install chromium` (goes to `%LOCALAPPDATA%\ms-playwright`; Chromium only).
3. `cd web; npm run e2e` (= `playwright test`, config `web/playwright.config.ts`).

- Playwright starts its own `ng serve --port 4310` (dev build) and stops it at the end (`reuseExistingServer: false`;
  sessions use 4200). If 4310 is busy (another worktree's run) Playwright refuses to start: wait, or run on
  another port with `E2E_PORT=4311 npm run e2e` (PowerShell: `$env:E2E_PORT=4311; npm run e2e`).
- First build takes about 20 to 40 s; the five tests about 40 s. One worker, Chromium only, no retries.
- Output: `web/test-results/` (trace of a failed test, open with `npx playwright show-trace <zip>`); git-ignored, as is `web/playwright-report/`.
- Tests are named by requirement ID. Files are `e2e/*.e2e.ts` so `ng test` (only `src/**/*.spec.ts`), `ng lint`
  (only `src/**`) and `npm run build` (`tsconfig.app.json`, `src/**`) never pick them up.

## Test data and the sign-in gate (why it works this way)
- **No real Firebase, no sign-in.** The dev build points at the Auth / Firestore emulators (127.0.0.1:9099 / 8080),
  which other sessions often run on this PC. Without a Firebase user the app would mark the session lost and show
  the sign-in panel on Decks and Deck detail; against a live emulator it might even treat a fake user as deleted.
- **Gate:** `e2e/fixtures.ts` writes a sync log "signed in, first sync done" (`sessionExpected: true`, a `uid`,
  `lastFullSyncAt`). `gateState()` (`web/src/app/shared/sync/gate.ts`) decides from that log alone at the first
  frame, so the gated pages open (SYNC-009).
- **Firebase blocked:** `blockFirebase()` aborts, for the whole browser context, every request whose local path
  contains `firebase` (the Vite-prebundled `firebase_app.js`, `firebase_auth.js`, `firebase_firestore.js`), ports
  9099 / 8080, `/api`, and Google / Firebase hosts. The lazy adapter import fails, so the session restore never runs
  and the gate stays open. Expected noise: one `Failed to fetch dynamically imported module` unhandled rejection per
  page load from `SyncService.start()` (shown as `[WebServer] ... [console.error]` lines). Don't assert a clean console.
- **Cards:** SPEC-013's **Large** test set built in Node by the app's own pure code (`generateLargeSample` +
  `loadTestData` through `createBrowserStores` over a `MemoryBackend`, the same writes as Collection's "Load test
  data → Large"; [[Collection Test Data]]). The `rift.*` keys are copied into localStorage from a page on
  `/favicon.svg` (same origin, a static file, so no app code runs there). The `test-data-5000` marker makes
  `CardData` use the generated catalog, so no `services/` server or `/api` is needed. The same static page is the
  "second tab" in the L11 test.
- No app code was changed for these tests.

## Adding a test
Import `blockFirebase`, `buildSeed`, `seedStorage` (and `scrollSettled` for smooth scrolls) from `e2e/fixtures.ts`;
call `blockFirebase(context)` before the first navigation, then `seedStorage(page, seed)`, then `page.goto(...)`.
Name the test by its requirement ID.
