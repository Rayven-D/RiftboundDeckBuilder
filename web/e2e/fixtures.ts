/**
 * Shared setup for the real-browser checks (H-431, H-440). See brain/05-Services/Browser Tests.md.
 *
 * Test data: SPEC-013's Large test set, built in Node by the app's own pure code (`generateLargeSample` and
 * `loadTestData` through `createBrowserStores` over a `MemoryBackend`), the same writes Collection's
 * "Load test data -> Large" makes. The `rift.*` keys are then copied into the page's localStorage. The
 * `test-data-5000` marker makes `CardData` use the generated catalog, so no `/api` server is needed.
 *
 * Sign-in gate: a sync log "signed in, first sync done" (sessionExpected + uid + lastFullSyncAt) opens the
 * SYNC-009 gate at the first frame (`gateState()` reads only the log). Every Firebase request is aborted
 * (`blockFirebase`), so the session restore never runs: nothing reaches an emulator (other sessions run Auth /
 * Firestore emulators on 9099 / 8080 on this PC) or the real project, and the gate stays open.
 */
import type { BrowserContext, Page } from '@playwright/test';
import { MemoryBackend } from '../src/app/core/storage/kv-backend';
import { createBrowserStores } from '../src/app/core/storage/browser-stores';
import { STORAGE_KEYS } from '../src/app/core/storage/local-stores';
import { loadTestData } from '../src/app/core/test-data/test-data-ops';
import { generateLargeSample, sampleDeckId } from '../src/app/shared/collection/sample-data';
import { TEST_DECK_IDS } from '../src/app/shared/collection/test-data';
import { emptySyncLog } from '../src/app/shared/sync/sync-log';
import type { StoredCollection, UserDeck } from '../src/app/shared/storage/records';

/** "Generated Open": the unlocked test deck, all six zones filled (SPEC-013 TEST-025). */
export const OPEN_DECK_ID = TEST_DECK_IDS[2];

export const COLLECTION_KEY = STORAGE_KEYS.collection;

export interface Seed {
  /** Every `rift.*` localStorage entry, as the app would have written it. */
  entries: Record<string, string>;
  collection: StoredCollection;
  decks: UserDeck[];
}

/** The Large test set, plus `extraDecks` own copies of "Generated Open" (named "E2E Deck n") for a long list. */
export async function buildSeed(opts: { extraDecks?: number } = {}): Promise<Seed> {
  const backend = new MemoryBackend();
  const now = Date.now();
  const stores = createBrowserStores(backend, { now: () => now, changed: () => undefined, readOnly: () => false });
  await stores.log.save({
    ...emptySyncLog(),
    uid: 'e2e-local-only-user',
    sessionExpected: true,
    lastFullSyncAt: now,
    lastSyncAt: now,
  });
  const result = await loadTestData(stores, 'large', () => now, async (n) => generateLargeSample(n));
  if (result !== 'ok') throw new Error(`loadTestData: ${result}`);
  const open = await stores.decks.get(OPEN_DECK_ID);
  if (!open) throw new Error('"Generated Open" test deck missing');
  for (let i = 0; i < (opts.extraDecks ?? 0); i++) {
    const at = new Date(now - (i + 1) * 60_000).toISOString();
    await stores.decks.create({ ...open, id: sampleDeckId(100 + i), name: `E2E Deck ${i + 1}`, createdAt: at, updatedAt: at });
  }
  const collection = await stores.collection.load();
  if (!collection) throw new Error('collection missing');
  return { entries: Object.fromEntries(backend.data), collection, decks: await stores.decks.list() };
}

/** Aborts every request to Firebase (SDK chunks, emulators, Google hosts) and to `/api`. */
export async function blockFirebase(context: BrowserContext): Promise<void> {
  await context.route(
    (url) =>
      (isLocal(url) && (url.port === '9099' || url.port === '8080')) ||
      (isLocal(url) && /firebase|\/api(\/|$)/i.test(url.pathname)) ||
      /(^|\.)(googleapis\.com|firebaseio\.com|firebaseapp\.com|gstatic\.com|google\.com)$/.test(url.hostname),
    (route) => {
      if (process.env['E2E_LOG_BLOCKED']) console.log(`blocked ${route.request().url()}`);
      return route.abort();
    },
  );
}

const isLocal = (url: URL) => url.hostname === 'localhost' || url.hostname === '127.0.0.1';

/** A same-origin static file: no app code runs there, so a page on it reads and writes localStorage like a second tab. */
export const STATIC_PAGE = '/favicon.svg';

/** Replaces the origin's localStorage with the seed (from a page on the static file, before the app starts). */
export async function seedStorage(page: Page, seed: Seed): Promise<void> {
  await page.goto(STATIC_PAGE);
  await page.evaluate((entries) => {
    localStorage.clear();
    for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, v);
  }, seed.entries);
}

/** Resolves once `window.scrollY` has not changed for `quietMs` (a smooth scroll has ended). */
export async function scrollSettled(page: Page, quietMs = 400, timeoutMs = 8_000): Promise<number> {
  return page.evaluate(
    ({ quietMs, timeoutMs }) =>
      new Promise<number>((resolve, reject) => {
        const start = performance.now();
        let last = scrollY;
        let since = performance.now();
        const tick = () => {
          const now = performance.now();
          if (scrollY !== last) {
            last = scrollY;
            since = now;
          }
          if (now - since >= quietMs) return resolve(scrollY);
          if (now - start > timeoutMs) return reject(new Error(`scroll did not settle (scrollY ${scrollY})`));
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    { quietMs, timeoutMs },
  );
}
