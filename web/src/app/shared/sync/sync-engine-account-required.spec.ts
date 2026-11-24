/**
 * SPEC-010 v0.8 account-required mode, engine side (H-081): the first sign-in clears the device then downloads
 * (SYNC-048, no Combine SYNC-049), sign-out clears the device (SYNC-090/091), the half-deleted branch clears
 * (SYNC-097), a lost session closes the gate (SYNC-086, `sessionLostUid`), and the gate itself (SYNC-009).
 * The engine only runs when `signInEnabled` is true; local-only mode is covered in `gate.spec.ts` and the
 * page tests.
 */
import { FakeFirestore } from './testing/fakes';
import { Device, T0, at, card } from './testing/device';
import { MESSAGES } from './sync-engine';
import { gateState } from './gate';
import { emptySyncLog } from './sync-log';
import type { PullResult, StoredSyncLog } from './sync-types';
import { STORAGE_KEYS } from '../../core/storage/local-stores';

async function signIn(d: Device, uid = 'uA'): Promise<void> {
  d.auth.nextSignIn = uid;
  await d.engine.signIn('google');
  await d.settle();
}

/** A fresh page load that restores the session of `uid` (null = the session is gone). */
async function reopen(d: Device, opts: { uid?: string | null; appVersion?: string } = {}): Promise<Device> {
  const r = d.reload({ appVersion: opts.appVersion });
  r.auth.uid = opts.uid === undefined ? 'uA' : opts.uid;
  await r.engine.start();
  await r.settle();
  return r;
}

/** The gate as a fresh page computes it at its first frame: from the stored log only (SYNC-009). */
const firstFrameGate = (d: Device) => gateState(true, d.stores.log.peek());
const riftKeys = (d: Device) => d.backend.keys().filter((k) => k.startsWith('rift.'));
const stateOrDeckWrites = (db: FakeFirestore) => db.writeLog.filter(([p]) => /\/(state|decks)\//.test(p));

/** `uA` signed in on the laptop with the given cards, pushed. */
async function accountWith(db: FakeFirestore, cards: Record<string, number>): Promise<Device> {
  const laptop = new Device(db);
  await signIn(laptop);
  for (const [k, q] of Object.entries(cards)) await laptop.setCard(k, q);
  await laptop.engine.flush();
  return laptop;
}

describe('SyncEngine account-required mode (SPEC-010 v0.8, H-081)', () => {
  let db: FakeFirestore;
  beforeEach(() => {
    db = new FakeFirestore();
    db.serverTime = T0;
  });

  describe('SYNC-048 first sign-in clears the device, then downloads', () => {
    it('AC 3 / SYNC-048 a: legacy data is cleared before the full read; exactly 1 write (users/uA) and 3 reads; Collection and Decks empty', async () => {
      const laptop = new Device(db);
      for (let i = 0; i < 350; i++) await laptop.setCard(`card ${i}`, 1 + (i % 3));
      for (let i = 0; i < 20; i++) await laptop.addTag(`t_tag${String(i).padStart(3, '0')}`, `Tag ${i}`);
      const decks = [];
      for (let i = 0; i < 10; i++) decks.push(await laptop.createDeck(`Deck ${i}`, [card('card 1', 1)]));
      for (let i = 0; i < 3; i++) await laptop.lock(decks[i].id);
      expect(firstFrameGate(laptop)).toBe('signed-out'); // legacy data is never shown (SYNC-009)

      let keysAtRead: string[] = [];
      const pull = laptop.remote.pull.bind(laptop.remote);
      vi.spyOn(laptop.remote, 'pull').mockImplementation((uid, cursors, opts) => {
        keysAtRead = riftKeys(laptop);
        return pull(uid, cursors, opts);
      });
      db.resetCounts();
      await signIn(laptop);

      expect(keysAtRead).toEqual([STORAGE_KEYS.syncLog]); // step 1 ran before the read
      expect(db.writeLog).toEqual([['users/uA', 'set']]);
      expect(db.writes).toBe(1);
      expect(db.reads).toBe(3);
      expect([...db.docs.keys()]).toEqual(['users/uA']);
      expect(laptop.notices).toEqual([]); // no Combine, no upload notice
      const log = await laptop.log();
      expect(log.uid).toBe('uA');
      expect(log.uploadingUid ?? null).toBeNull();
      expect(await laptop.stores.collection.load()).toBeNull();
      expect(await laptop.deckNames()).toEqual([]);
      expect(await laptop.lockedIds()).toEqual([]);
      expect((await laptop.stores.tags.load()) ?? null).toBeNull();
      expect(laptop.engine.pendingCount()).toBe(0);
      expect(laptop.engine.gate()).toBe('open');
    });

    it('AC 5 / SYNC-049 no Combine: legacy card, tag and deck are dropped; the account wins; nothing is written', async () => {
      const laptop = new Device(db, { now: at('09:00') });
      await signIn(laptop);
      await laptop.setCard('hextech ray', 3);
      await laptop.addTag('t_Coll01', 'Collector');
      await laptop.assign('p:OGN-001a', ['t_Coll01']);
      await laptop.createDeck('Kennen Tempo');
      await laptop.engine.flush();

      const phone = new Device(db, { now: at('10:00') });
      await phone.setCard('hextech ray', 1);
      await phone.addTag('t_Trad01', 'Trade Binder');
      await phone.assign('p:OGN-001a', ['t_Trad01']);
      await phone.createDeck('Draft A');
      const cloudBefore = structuredClone([...db.docs.entries()]);
      db.resetCounts();
      await signIn(phone);

      expect(await phone.quantity('hextech ray')).toBe(3);
      expect((await phone.tags()).assignments['p:OGN-001a']).toEqual(['t_Coll01']);
      expect((await phone.tags()).tags.map((t) => t.label)).toEqual(['Collector']);
      expect(await phone.deckNames()).toEqual(['Kennen Tempo']);
      expect(stateOrDeckWrites(db)).toEqual([]);
      expect(db.writes).toBe(0);
      expect(phone.notices).toEqual([]);
      expect([...db.docs.entries()]).toEqual(cloudBefore);

      laptop.now = at('10:30');
      await laptop.engine.syncNow();
      expect(await laptop.quantity('hextech ray')).toBe(3);
      expect((await laptop.tags()).assignments['p:OGN-001a']).toEqual(['t_Coll01']);
      expect(await laptop.deckNames()).toEqual(['Kennen Tempo']);
    });

    it('AC 36 / SYNC-048 e: an account without data keeps createdAt; 40 legacy cards are cleared, not uploaded; 0 writes', async () => {
      const createdAt = at('09:00', 1);
      db.docs.set('users/uA', { schemaVersion: 1, createdAt, updatedAt: createdAt, syncedAt: 1, lastClientVersion: 'test-1' });
      const phone = new Device(db);
      for (let i = 0; i < 40; i++) await phone.setCard(`card ${i}`, 1);
      db.resetCounts();
      await signIn(phone);
      expect(db.writes).toBe(0);
      expect(db.get('users/uA').createdAt).toBe(createdAt);
      expect(db.get('users/uA/state/collection')).toBeUndefined();
      expect(phone.notices).toEqual([]);
      expect(await phone.stores.collection.load()).toBeNull();
      expect(phone.engine.gate()).toBe('open');
    });

    it('AC 36 / SYNC-048 f: leftover state documents without an account: nothing imported or written; signed out, device empty', async () => {
      db.docs.set('users/uA/state/collection', {
        schemaVersion: 1,
        updatedAt: 1,
        syncedAt: 1,
        catalogVersion: 'x',
        cards: { 'hextech ray': { q: 9, t: 1, p: {} } },
      });
      const leftovers = structuredClone([...db.docs.entries()]);
      const phone = new Device(db);
      for (let i = 0; i < 40; i++) await phone.setCard(`card ${i}`, 1);
      db.resetCounts();
      await signIn(phone);
      expect(db.writes).toBe(0);
      expect([...db.docs.entries()]).toEqual(leftovers);
      expect(phone.notices).toEqual([MESSAGES.halfDeleted]);
      expect(MESSAGES.halfDeleted).toBe(
        "This account is being deleted, so you've been signed out and its data was removed from this device.",
      );
      expect(riftKeys(phone)).toEqual([]);
      expect((await phone.log()).sessionExpected).toBe(false);
      expect(phone.engine.signedInUid).toBeNull();
      expect(phone.engine.gate()).toBe('signed-out');
    });

    it('AC 25 / SYNC-048 an interrupted first sign-in shows Try again, writes nothing, and starts over at step 1 on reopen', async () => {
      const laptop = await accountWith(db, {});
      for (let i = 0; i < 350; i++) await laptop.setCard(`card ${i}`, 1);
      for (let i = 0; i < 10; i++) await laptop.createDeck(`Deck ${i}`);
      await laptop.engine.flush();

      const phone = new Device(db);
      phone.remote.offline = true; // the full read fails after sign-in
      db.resetCounts();
      await signIn(phone);
      expect(phone.engine.gate()).toBe('first-sync-failed');
      expect(await phone.log()).toMatchObject({ uid: null, lastFullSyncAt: null, sessionExpected: true });
      expect(db.writes).toBe(0);

      const again = phone.reload();
      again.remote.offline = false;
      again.auth.uid = 'uA';
      expect(firstFrameGate(again)).toBe('first-sync'); // "Getting your collection and decks…"
      const clear = vi.spyOn(again.stores.raw, 'clearAll');
      await again.engine.start();
      await again.settle();
      expect(clear).toHaveBeenCalled();
      expect(Object.keys((await again.collection()).cards)).toHaveLength(350);
      expect(await again.deckNames()).toHaveLength(10);
      expect(db.writes).toBe(0);
      expect((await again.log()).uid).toBe('uA');
      expect(again.engine.gate()).toBe('open');
    });

    it('AC 25 / SYNC-009 Try again (Sync now) in the same session reruns the flow and opens the gate', async () => {
      await accountWith(db, { 'hextech ray': 3 });
      const phone = new Device(db);
      phone.remote.offline = true;
      await signIn(phone);
      expect(phone.engine.gate()).toBe('first-sync-failed');
      phone.remote.offline = false;
      await phone.engine.syncNow();
      expect(phone.engine.gate()).toBe('open');
      expect(await phone.quantity('hextech ray')).toBe(3);
    });

    it('AC 40 / SYNC-030 an old uploadingUid is ignored: the device is cleared, the 9 decks download, nothing is uploaded', async () => {
      const other = new Device(db);
      await signIn(other);
      for (let i = 0; i < 9; i++) await other.createDeck(`Uploaded ${i}`);
      await other.engine.flush();

      const laptop = new Device(db);
      for (let i = 0; i < 350; i++) await laptop.setCard(`card ${i}`, 1);
      for (let i = 0; i < 25; i++) await laptop.createDeck(`Local ${i}`);
      const v07: StoredSyncLog = { ...(await laptop.log()), sessionExpected: true, uid: null, lastFullSyncAt: null, uploadingUid: 'uA' };
      await laptop.stores.log.save(v07);

      db.resetCounts();
      const r = await reopen(laptop);
      expect(await r.stores.collection.load()).toBeNull();
      expect((await r.deckNames()).sort()).toEqual(Array.from({ length: 9 }, (_, i) => `Uploaded ${i}`).sort());
      expect(stateOrDeckWrites(db)).toEqual([]);
      expect(db.writes).toBe(0); // same build: no account update
      expect(r.notices.some((n) => /saved to your account/.test(n))).toBe(false);
      expect((await r.log()).uploadingUid ?? null).toBeNull();
      expect([...db.docs.keys()].filter((k) => k.includes('/decks/'))).toHaveLength(9);
    });

    it('AC 40 / SYNC-012 with a different build the first sign-in makes exactly 1 write: the account update()', async () => {
      const other = new Device(db);
      await signIn(other);
      await other.createDeck('Kennen Tempo');
      await other.engine.flush();
      const phone = new Device(db, { appVersion: 'test-2' });
      db.resetCounts();
      await signIn(phone);
      expect(db.writeLog).toEqual([['users/uA', 'update']]);
      expect(db.get('users/uA').lastClientVersion).toBe('test-2');
    });

    it('AC 48 / SYNC-008 a browser with local-only data switched to account-required: gate closed, then cleared on sign-in with 1 write', async () => {
      const browser = new Device(db);
      for (let i = 0; i < 120; i++) await browser.setCard(`card ${i}`, 1);
      await browser.createDeck('Deck A');
      await browser.createDeck('Deck B');
      expect(gateState(false, browser.stores.log.peek())).toBe('open'); // before the switch: no gate
      expect(firstFrameGate(browser)).toBe('signed-out'); // after it: the panel, not the 120 cards
      db.resetCounts();
      await signIn(browser, 'uNew');
      expect(db.writeLog).toEqual([['users/uNew', 'set']]);
      expect(await browser.stores.collection.load()).toBeNull();
      expect(await browser.deckNames()).toEqual([]);
    });
  });

  describe('SYNC-090 / SYNC-091 sign-out clears this device', () => {
    it('AC 20 / SYNC-091 sign-out clears every store and the sync log; the cloud is unchanged; offline it is refused', async () => {
      const laptop = await accountWith(db, { 'hextech ray': 3 });
      await laptop.stores.viewState.save({
        schemaVersion: 2,
        updatedAt: new Date(laptop.now).toISOString(),
        query: { view: 'cards', tags: { ids: [], mode: 'any' } },
        savedViews: [],
      });
      laptop.remote.offline = true;
      await laptop.setCard('hextech ray', 4);
      await laptop.advance(2500);
      expect(laptop.engine.pendingCount()).toBe(1);

      laptop.online = false; // SYNC-081: nothing is cleared while offline
      expect(await laptop.engine.signOut()).toBe('offline');
      expect(await laptop.quantity('hextech ray')).toBe(4);
      expect(laptop.engine.signedInUid).toBe('uA');

      laptop.online = true;
      laptop.remote.offline = false;
      const cloud = structuredClone(db.get('users/uA/state/collection'));
      expect(await laptop.engine.signOut()).toBe('ok'); // Sign out anyway: the pending change is lost
      expect(riftKeys(laptop)).toEqual([]);
      expect(db.get('users/uA/state/collection')).toEqual(cloud);
      expect(laptop.auth.signOuts).toBe(1);
      expect(laptop.engine.gate()).toBe('signed-out');
      expect(firstFrameGate(laptop)).toBe('signed-out');

      db.resetCounts();
      await signIn(laptop); // signing in again downloads (AC 4): 0 writes
      expect(db.writes).toBe(0);
      expect(await laptop.quantity('hextech ray')).toBe(3);
    });

    /** Makes the next pulls wait until `release()`; resolves `started` when one is waiting. */
    function deferPulls(d: Device) {
      let release!: () => void;
      const gate = new Promise<void>((res) => (release = res));
      const pull = d.remote.pull.bind(d.remote);
      const spy = vi.spyOn(d.remote, 'pull').mockImplementation(async (uid, cursors, opts): Promise<PullResult> => {
        await gate;
        return pull(uid, cursors, opts);
      });
      return { release, started: () => vi.waitFor(() => expect(spy).toHaveBeenCalled()) };
    }

    it('SYNC-091 / AC 20 sign-out during a running first sync (and a regular sync) leaves the device cleared', async () => {
      await accountWith(db, { 'hextech ray': 3 });

      // (1) first sync: the full read is still in flight when the user signs out
      const phone = new Device(db);
      const first = deferPulls(phone);
      phone.auth.nextSignIn = 'uA';
      const signingIn = phone.engine.signIn('google');
      await first.started();
      expect(await phone.engine.signOut()).toBe('ok');
      first.release();
      await signingIn;
      await phone.settle();
      expect(riftKeys(phone)).toEqual([]);
      expect(await phone.quantity('hextech ray')).toBe(0);
      expect(phone.engine.gate()).toBe('signed-out');
      expect(phone.engine.signedInUid).toBeNull();

      // (2) regular sync: a synced device pulls a change from another device while the user signs out
      const tablet = new Device(db);
      await signIn(tablet);
      expect(await tablet.quantity('hextech ray')).toBe(3);
      const other = new Device(db); // another device writes to uA
      await signIn(other);
      await other.setCard('lightning rush', 4);
      await other.engine.flush();
      tablet.now += 60_000;
      const regular = deferPulls(tablet);
      const syncing = tablet.engine.syncNow();
      await regular.started();
      expect(await tablet.engine.signOut()).toBe('ok');
      regular.release();
      await syncing;
      await tablet.settle();
      expect(riftKeys(tablet)).toEqual([]);
      expect(await tablet.quantity('lightning rush')).toBe(0);
      expect(tablet.engine.gate()).toBe('signed-out');
      expect(db.get('users/uA/state/collection').cards['lightning rush'].q).toBe(4); // the cloud is untouched
    });

    it('SYNC-091 / SYNC-096 sign-out while a deletion is running: nothing is written back to the cleared device', async () => {
      const laptop = await accountWith(db, { 'hextech ray': 3 });
      let release!: () => void;
      const hold = new Promise<void>((res) => (release = res));
      const deleteAll = laptop.remote.deleteAll.bind(laptop.remote);
      const spy = vi.spyOn(laptop.remote, 'deleteAll').mockImplementation(async (uid) => {
        await hold;
        return deleteAll(uid);
      });
      const deleting = laptop.engine.deleteAccount();
      await vi.waitFor(() => expect(spy).toHaveBeenCalled());
      expect(await laptop.engine.signOut()).toBe('ok'); // H-083 default: allowed during a deletion
      release();
      expect(await deleting).toBe('failed');
      await laptop.settle();
      expect(riftKeys(laptop)).toEqual([]);
      expect(laptop.auth.deletedUser).toBe(false); // the Auth user is never deleted from an ended session
    });

    it('SYNC-002 a stored linked uid with sessionExpected false loads no Firebase at start-up', async () => {
      const d = new Device(db);
      await d.stores.log.save({ ...emptySyncLog(), uid: 'uA', sessionExpected: false, lastFullSyncAt: T0, cursors: { state: 1, decks: 1 } });
      await d.engine.start();
      expect(d.adaptersLoaded).toBe(0);
      expect(db.reads + db.writes).toBe(0);
      expect(d.engine.gate()).toBe('signed-out');
    });

    it('AC 26 / SYNC-002 sign out then reload: no Firebase, no session-lost message, gate closed, stores empty', async () => {
      const laptop = await accountWith(db, { 'hextech ray': 3 });
      await laptop.engine.signOut();
      const reopened = laptop.reload();
      expect(firstFrameGate(reopened)).toBe('signed-out');
      await reopened.engine.start();
      expect(reopened.adaptersLoaded).toBe(0);
      expect(reopened.notices).not.toContain(MESSAGES.sessionLost);
      expect(riftKeys(reopened)).toEqual([]);
      expect(reopened.engine.gate()).toBe('signed-out');
    });
  });

  describe('SYNC-086 / SYNC-009 a lost session closes the gate', () => {
    async function lostWithTwoPending(): Promise<Device> {
      const laptop = await accountWith(db, { 'hextech ray': 3, 'lightning rush': 2 });
      laptop.remote.offline = true;
      await laptop.setCard('hextech ray', 5);
      await laptop.setCard('lightning rush', 6);
      laptop.remote.offline = false;
      const r = laptop.reload();
      r.auth.uid = null; // token revoked
      r.auth.account = 'signed-out';
      await r.engine.start();
      await r.settle();
      return r;
    }

    it('AC 27 / SYNC-086 the loss sets sessionLostUid, closes the gate and keeps local data and the 2 pending changes', async () => {
      const r = await lostWithTwoPending();
      expect(r.notices).toContain(MESSAGES.sessionLost);
      const log = await r.log();
      expect(log.sessionLostUid).toBe('uA');
      expect(log.sessionExpected).toBe(true);
      expect(r.engine.pendingCount()).toBe(2);
      expect(await r.quantity('hextech ray')).toBe(5);
      expect(r.engine.gate()).toBe('session-lost');
    });

    it('AC 27 / SYNC-009 a reload (online or offline) keeps the gate closed from the first frame', async () => {
      const r = await lostWithTwoPending();
      const offline = r.reload();
      offline.remote.offline = true;
      expect(firstFrameGate(offline)).toBe('session-lost');
      const online = r.reload();
      expect(firstFrameGate(online)).toBe('session-lost');
    });

    it('AC 27 / SYNC-086 signing in again as uA clears sessionLostUid, opens the gate and pushes the 2 changes; nothing is cleared', async () => {
      const r = await lostWithTwoPending();
      r.auth.account = 'ok';
      await signIn(r, 'uA');
      expect((await r.log()).sessionLostUid ?? null).toBeNull();
      expect(r.engine.gate()).toBe('open');
      expect(r.engine.pendingCount()).toBe(0);
      expect(db.get('users/uA/state/collection').cards['hextech ray'].q).toBe(5);
      expect(await r.quantity('lightning rush')).toBe(6);
    });

    it('AC 27 / SYNC-098 signing in as uB instead clears the device (uA’s 2 changes are lost) and downloads uB', async () => {
      const b = new Device(db);
      await signIn(b, 'uB');
      await b.setCard('poro snax', 2);
      await b.engine.flush();
      const r = await lostWithTwoPending();
      r.auth.account = 'ok';
      await signIn(r, 'uB');
      expect(await r.quantity('hextech ray')).toBe(0);
      expect(await r.quantity('poro snax')).toBe(2);
      expect((await r.log()).uid).toBe('uB');
      expect(db.get('users/uA/state/collection').cards['hextech ray'].q).toBe(3);
      expect(r.engine.gate()).toBe('open');
    });

    it('SYNC-086 a later start-up whose restore returns the linked uid and passes the account check clears sessionLostUid', async () => {
      const r = await lostWithTwoPending();
      const back = await reopen(r, { uid: 'uA' });
      expect((await back.log()).sessionLostUid ?? null).toBeNull();
      expect(back.engine.gate()).toBe('open');
      expect(back.engine.pendingCount()).toBe(0);
    });
  });

  describe('SYNC-097 deleted and half-deleted accounts clear the device', () => {
    it('AC 28 / SYNC-097 half-deleted (ok, account document gone): write nothing, sign out, clear every store and the log', async () => {
      const laptop = await accountWith(db, { 'hextech ray': 3 });
      const tablet = new Device(db);
      await signIn(tablet);
      const deck = await tablet.createDeck('Kennen Tempo');
      await tablet.engine.flush();
      tablet.remote.offline = true;
      await tablet.editDeck(deck.id, { name: 'pending edit' });
      tablet.remote.offline = false;
      db.docs.delete('users/uA');
      const leftovers = structuredClone([...db.docs.entries()]);
      db.resetCounts();
      const r = await reopen(tablet);
      expect(db.writes).toBe(0);
      expect([...db.docs.entries()]).toEqual(leftovers);
      expect(r.notices).toContain(MESSAGES.halfDeleted);
      expect(riftKeys(r)).toEqual([]);
      expect(await r.log()).toEqual(emptySyncLog());
      expect(r.engine.gate()).toBe('signed-out');
      expect(r.auth.signOuts).toBe(1);
      void laptop;
    });

    it('AC 28 / SYNC-097 deleted: every local store (also view state and printing codes) and the sync log are cleared', async () => {
      const laptop = await accountWith(db, { 'hextech ray': 3 });
      await laptop.engine.deleteAccount();
      const phone = new Device(db);
      phone.backend.set(STORAGE_KEYS.viewState, '{}');
      phone.backend.set(STORAGE_KEYS.printingCodes, '{}');
      phone.backend.set(STORAGE_KEYS.collection, '{}');
      phone.backend.set(STORAGE_KEYS.syncLog, JSON.stringify({ ...emptySyncLog(), uid: 'uA', sessionExpected: true, lastFullSyncAt: T0 }));
      phone.auth.uid = 'uA';
      phone.auth.account = 'deleted';
      await phone.engine.start();
      await phone.settle();
      expect(phone.notices).toContain(MESSAGES.accountDeleted);
      expect(riftKeys(phone)).toEqual([]);
      expect(phone.engine.gate()).toBe('signed-out');
    });
  });

  describe('SYNC-009 the gate at start-up, offline and during the first sync', () => {
    it('AC 47 / SYNC-080 a synced device reloaded offline opens at once; imports are pending and pushed when online', async () => {
      const laptop = await accountWith(db, { 'hextech ray': 3 });
      const r = laptop.reload();
      r.auth.uid = 'uA';
      r.remote.offline = true;
      expect(firstFrameGate(r)).toBe('open');
      await r.engine.start();
      await r.settle();
      expect(r.engine.gate()).toBe('open');
      for (const k of ['card a', 'card b', 'card c']) await r.setCard(k, 1);
      await r.advance(2500);
      expect(r.engine.pendingCount()).toBe(3);
      r.remote.offline = false;
      await r.engine.syncNow();
      expect(r.engine.pendingCount()).toBe(0);
      expect(Object.keys(db.get('users/uA/state/collection').cards)).toEqual(
        expect.arrayContaining(['card a', 'card b', 'card c']),
      );
    });

    it('AC 47 / SYNC-086 an undetected loss shows the cards until the restore finds it; the edit made meanwhile stays pending', async () => {
      const laptop = await accountWith(db, { 'hextech ray': 3 });
      const r = laptop.reload();
      r.auth.uid = null; // revoked while the tab was closed; sessionLostUid unset
      r.auth.account = 'signed-out';
      expect(firstFrameGate(r)).toBe('open');
      await r.setCard('hextech ray', 4); // edited in the window
      await r.engine.start();
      await r.settle();
      expect(r.engine.gate()).toBe('session-lost');
      expect((await r.log()).sessionLostUid).toBe('uA');
      expect(await r.quantity('hextech ray')).toBe(4);
      expect((await r.log()).pending.cards).toEqual(['hextech ray']);
      expect(firstFrameGate(r.reload())).toBe('session-lost');
    });

    it('AC 47 / SYNC-048 while the download runs the gate is "first-sync"; it opens when the flow completes', async () => {
      await accountWith(db, { 'hextech ray': 3 });
      const phone = new Device(db);
      let release!: () => void;
      const gateOpen = new Promise<void>((res) => (release = res));
      const pull = phone.remote.pull.bind(phone.remote);
      vi.spyOn(phone.remote, 'pull').mockImplementation(async (uid, cursors, opts): Promise<PullResult> => {
        await gateOpen;
        return pull(uid, cursors, opts);
      });
      phone.auth.nextSignIn = 'uA';
      const done = phone.engine.signIn('google');
      await vi.waitFor(() => expect(phone.remote.pull).toHaveBeenCalled());
      expect(phone.engine.gate()).toBe('first-sync');
      expect(firstFrameGate(phone)).toBe('first-sync');
      release();
      await done;
      await phone.settle();
      expect(phone.engine.gate()).toBe('open');
      expect(await phone.quantity('hextech ray')).toBe(3);
    });
  });
});
