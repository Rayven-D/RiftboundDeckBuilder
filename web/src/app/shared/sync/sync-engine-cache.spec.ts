/**
 * SPEC-010 section M, the browser cache (SYNC-140…SYNC-146, account-only since v0.12, H-172): ACs 59–62.
 * The browser holds a cache of the signed-in account (the whole collection, tags, locks and every deck), cleared
 * only on sign-out, account deletion, the deleted / half-deleted sign-outs and a different account's first
 * sign-in; it is never uploaded; browsing it makes no Firestore request.
 */
import { FakeFirestore } from './testing/fakes';
import { Device, T0, card } from './testing/device';
import { gateState } from './gate';
import { STORAGE_KEYS } from '../../core/storage/local-stores';

async function signIn(d: Device, uid = 'uA'): Promise<void> {
  d.auth.nextSignIn = uid;
  await d.engine.signIn('google');
  await d.settle();
}

const riftKeys = (d: Device) => d.backend.keys().filter((k) => k.startsWith('rift.')).sort();
const deckKeys = (d: Device) => riftKeys(d).filter((k) => k.startsWith(STORAGE_KEYS.deckPrefix));
const stateOrDeckWrites = (db: FakeFirestore) => db.writeLog.filter(([p]) => /\/(state|decks)\//.test(p));

/**
 * `uA` signed in on the laptop with `cards` cards, 20 tags, `decks` decks and 3 locks, all pushed, plus the
 * device-only records: view state, printing-code memory and an import Undo snapshot (SYNC-141 d).
 */
async function account(db: FakeFirestore, opts: { cards?: number; decks?: number } = {}): Promise<Device> {
  const laptop = new Device(db);
  laptop.auth.email = 'rj@example.com';
  await signIn(laptop);
  const cards: Record<string, { quantity: number; byPrinting: Record<string, number> }> = {};
  for (let i = 0; i < (opts.cards ?? 350); i++) cards[`card ${i}`] = { quantity: 1 + (i % 3), byPrinting: {} };
  await laptop.replaceCollection(cards);
  for (let i = 0; i < 20; i++) await laptop.addTag(`t_tag${String(i).padStart(3, '0')}`, `Tag ${i}`);
  const ids: string[] = [];
  for (let i = 0; i < (opts.decks ?? 10); i++) ids.push((await laptop.createDeck(`Deck ${i}`, [card('card 1', 1)])).id);
  for (let i = 0; i < 3; i++) await laptop.lock(ids[i]);
  const at = new Date(laptop.now).toISOString();
  await laptop.stores.viewState.save({
    schemaVersion: 2,
    updatedAt: at,
    query: { view: 'cards', tags: { ids: [], mode: 'any' } },
    savedViews: [],
  });
  await laptop.stores.printingCodes.save({ schemaVersion: 1, updatedAt: at, codes: {} });
  laptop.backend.set(STORAGE_KEYS.collectionPrevious, laptop.backend.get(STORAGE_KEYS.collection)!);
  await laptop.engine.flush();
  laptop.now += 60_000;
  await laptop.engine.syncNow();
  expect(laptop.engine.pendingCount()).toBe(0);
  return laptop;
}

const CACHE_KEYS = [
  STORAGE_KEYS.collection,
  STORAGE_KEYS.collectionPrevious,
  STORAGE_KEYS.tags,
  STORAGE_KEYS.locks,
  STORAGE_KEYS.printingCodes,
  STORAGE_KEYS.viewState,
  STORAGE_KEYS.syncLog,
];

describe('Browser cache (SPEC-010 SYNC-140…SYNC-146, H-172)', () => {
  let db: FakeFirestore;
  beforeEach(() => {
    db = new FakeFirestore();
    db.serverTime = T0;
  });

  describe('AC 59 what the cache holds (SYNC-141, SYNC-140, SYNC-144)', () => {
    it('AC 59 / SYNC-141 the whole account is cached: sync log, collection, tags, locks, all 10 decks, view state, printing codes; no email address', async () => {
      const laptop = await account(db);
      for (const k of CACHE_KEYS) expect(riftKeys(laptop)).toContain(k);
      expect(deckKeys(laptop)).toHaveLength(10);
      const log = await laptop.log();
      expect(log.sessionExpected).toBe(true);
      expect(log.uid).toBe('uA');
      expect(log.lastFullSyncAt).not.toBeNull();
      expect(Object.keys((await laptop.collection()).cards)).toHaveLength(350);
      expect((await laptop.tags()).tags).toHaveLength(20);
      expect(await laptop.lockedIds()).toHaveLength(3);
      // SYNC-141 / SYNC-100: the app keeps no email address of its own (Firebase Auth keeps its session).
      for (const v of laptop.backend.data.values()) expect(v).not.toContain('rj@example.com');
    });

    it('AC 59 / SYNC-144 / SYNC-080 reloaded offline, the gate is open at the first frame and every list opens from the cache with no read', async () => {
      const laptop = await account(db);
      db.resetCounts();
      const r = laptop.reload();
      r.online = false;
      r.remote.offline = true;
      expect(gateState(r.stores.log.peek())).toBe('open'); // decided from the cache, before anything loads
      expect(Object.keys((await r.collection()).cards)).toHaveLength(350);
      expect(await r.deckNames()).toHaveLength(10);
      const decks = await r.stores.decks.list();
      expect((await r.stores.decks.get(decks[0].id))?.main).toEqual([card('card 1', 1)]);
      await r.engine.start();
      await r.settle();
      expect(r.engine.gate()).toBe('open');
      expect(db.reads + db.writes).toBe(0);
    });
  });

  describe('AC 60 when the cache is cleared (SYNC-142)', () => {
    it('AC 60 / SYNC-091 sign-out empties every store, the sync log, view state, printing codes and the Undo snapshot; no Firestore write; other browser data stays', async () => {
      const laptop = await account(db);
      laptop.backend.set('catalog-http-cache', 'public'); // stands in for anything outside the app's stores
      const cloud = structuredClone([...db.docs.entries()]);
      db.resetCounts();
      expect(await laptop.engine.signOut()).toBe('ok');
      expect(riftKeys(laptop)).toEqual([]);
      expect(laptop.backend.get('catalog-http-cache')).toBe('public'); // SYNC-141 e: not cleared by sign-out
      expect(db.writes).toBe(0);
      expect(db.writeLog).toEqual([]);
      expect([...db.docs.entries()]).toEqual(cloud);
      expect(gateState(laptop.stores.log.peek())).toBe('signed-out');
    });

    it('AC 60 / SYNC-096 deleting the account empties the same stores', async () => {
      const laptop = await account(db);
      expect(await laptop.engine.deleteAccount()).toBe('ok');
      await laptop.settle();
      expect(riftKeys(laptop)).toEqual([]);
      expect([...db.docs.keys()].filter((p) => p.startsWith('users/uA'))).toEqual([]);
    });

    it('AC 60 / SYNC-048 / SYNC-098 a lost session for uA, then uB signs in: uA’s data and pending items are cleared, none uploaded to uB', async () => {
      const laptop = await account(db, { cards: 3 });
      laptop.remote.offline = true;
      await laptop.setCard('card 0', 9); // pending
      laptop.remote.offline = false;
      const r = laptop.reload();
      r.auth.uid = null; // token revoked: the session is lost
      r.auth.account = 'signed-out';
      await r.engine.start();
      await r.settle();
      expect(r.engine.gate()).toBe('session-lost');
      expect(r.engine.pendingCount()).toBe(1); // kept until someone signs in (SYNC-086)
      expect(await r.quantity('card 0')).toBe(9);

      r.auth.account = 'ok';
      db.resetCounts();
      await signIn(r, 'uB');
      expect(await r.quantity('card 0')).toBe(0);
      expect(r.engine.pendingCount()).toBe(0);
      expect((await r.log()).uid).toBe('uB');
      expect(stateOrDeckWrites(db)).toEqual([]); // nothing of uA's went to uB
      expect(db.writeLog).toEqual([['users/uB', 'set']]);
      expect(db.get('users/uA/state/collection').cards['card 0'].q).toBe(1); // uA's account unchanged
    });

    it('AC 60 / SYNC-142 closing and reopening, a reload, or going offline does not clear the cache', async () => {
      const laptop = await account(db);
      const before = riftKeys(laptop);
      const reopened = laptop.reload();
      reopened.auth.uid = 'uA';
      await reopened.engine.start();
      await reopened.settle();
      expect(riftKeys(reopened)).toEqual(before);
      expect(reopened.engine.gate()).toBe('open');

      const offline = reopened.reload();
      offline.online = false;
      offline.remote.offline = true;
      await offline.engine.start();
      await offline.settle();
      expect(riftKeys(offline)).toEqual(before);
      expect(Object.keys((await offline.collection()).cards)).toHaveLength(350);
      expect(offline.engine.gate()).toBe('open');
    });
  });

  describe('AC 61 the cache is never uploaded (SYNC-143, SYNC-049, SYNC-050)', () => {
    it('AC 61 / AC 48 a phone with stale data signs in to uA: at most 1 write, no state or decks write, then exactly the account’s data', async () => {
      await account(db, { cards: 5, decks: 3 });
      const phone = new Device(db);
      for (let i = 0; i < 40; i++) await phone.setCard(`stale ${i}`, 2); // the old no-account build's data
      await phone.createDeck('Stale deck');
      db.resetCounts();
      await signIn(phone, 'uA');
      expect(db.writes).toBeLessThanOrEqual(1);
      expect(stateOrDeckWrites(db)).toEqual([]);
      expect(Object.keys((await phone.collection()).cards).sort()).toEqual(
        ['card 0', 'card 1', 'card 2', 'card 3', 'card 4'],
      );
      expect((await phone.deckNames()).sort()).toEqual(['Deck 0', 'Deck 1', 'Deck 2']);
      expect(phone.engine.pendingCount()).toBe(0);
    });

    it('AC 61 / SYNC-043 uA’s own offline edit is the only thing pushed, as one update()', async () => {
      await account(db, { cards: 5, decks: 3 });
      const phone = new Device(db);
      await signIn(phone, 'uA');
      phone.online = false;
      phone.remote.offline = true;
      await phone.setCard('hextech ray', 2);
      await phone.advance(5000);
      expect(phone.engine.pendingCount()).toBe(1);
      phone.online = true;
      phone.remote.offline = false;
      db.resetCounts();
      await phone.engine.flush();
      expect(db.writeLog).toEqual([['users/uA/state/collection', 'update']]);
      expect(Object.keys(db.pushLog.at(-1)?.collection?.cards ?? {})).toEqual(['hextech ray']);
    });
  });

  describe('AC 62 scrolling reads nothing from Firestore (SYNC-145, SYNC-144)', () => {
    it('AC 62 / SYNC-145 3,000 entries and 200 decks: browsing, filtering and opening cards and decks make 0 reads and 0 writes', async () => {
      const laptop = await account(db, { cards: 3000, decks: 200 });
      db.resetCounts();
      // What Collection and Decks do while the user scrolls, filters and opens items: read the cache, save the
      // device-only view state. None of it reaches the RemoteStore.
      for (let round = 0; round < 10; round++) {
        const cards = (await laptop.stores.collection.load())!.cards;
        expect(Object.keys(cards)).toHaveLength(3000);
        await laptop.stores.tags.load();
        await laptop.stores.locks.load();
        const decks = await laptop.stores.decks.list();
        expect(decks).toHaveLength(200);
        await laptop.stores.decks.get(decks[round * 20].id);
        await laptop.stores.viewState.save({
          schemaVersion: 2,
          updatedAt: new Date(laptop.now).toISOString(),
          query: { view: 'cards', text: `card ${round}`, tags: { ids: [], mode: 'any' } },
          savedViews: [],
        });
        await laptop.settle();
      }
      expect(db.reads).toBe(0);
      expect(db.writes).toBe(0);
      expect(laptop.engine.pendingCount()).toBe(0);
    }, 30_000); // H-420: 3,000 cards × 10 rounds outgrows the 5 s default when the machine is busy
  });
});
