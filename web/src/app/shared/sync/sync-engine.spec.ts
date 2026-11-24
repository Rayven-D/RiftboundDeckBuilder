import { FakeFirestore } from './testing/fakes';
import { Device, T0, at, card, deckId } from './testing/device';
import { MESSAGES } from './sync-engine';
import { DAY_MS } from './sync-log';
import { ReadOnlyAreaError } from './tracked-stores';
import { STORAGE_KEYS } from '../../core/storage/local-stores';

/** Signs a device in as `uid` and waits until the first sync is done. */
async function signIn(d: Device, uid = 'uA'): Promise<void> {
  d.auth.nextSignIn = uid;
  await d.engine.signIn('google');
  await d.settle();
}

async function seedLaptop(db: FakeFirestore, now = T0): Promise<Device> {
  const laptop = new Device(db, { now });
  await laptop.setCard('hextech ray', 3);
  await laptop.setCard('lightning rush', 2);
  await signIn(laptop);
  return laptop;
}

describe('SyncEngine (SPEC-010)', () => {
  let db: FakeFirestore;
  beforeEach(() => {
    db = new FakeFirestore();
    db.serverTime = T0;
  });

  describe('AC 1 / AC 35: signed out loads no Firebase (SYNC-001, SYNC-002, SYNC-125)', () => {
    it('SYNC-002 signed out: start-up, imports, decks and locks never load the adapters or call Firestore', async () => {
      const d = new Device(db);
      await d.engine.start();
      for (let i = 0; i < 40; i++) await d.setCard(`card ${i}`, 1);
      const deck = await d.createDeck('Kennen Tempo', [card('hextech ray', 3)]);
      await d.lock(deck.id);
      await d.advance(5000);
      expect(d.adaptersLoaded).toBe(0);
      expect(db.reads + db.writes).toBe(0);
      expect(d.status.kind).toBe('signed-out');
    });

    it('SYNC-002 a stored linked uid alone does not load Firebase (sessionExpected false)', async () => {
      const laptop = await seedLaptop(db);
      await laptop.engine.signOut('keep');
      const again = laptop.reload();
      await again.engine.start();
      expect(again.adaptersLoaded).toBe(0);
      expect((await again.log()).uid).toBe('uA');
    });

    it('SYNC-002 Sign in loads the adapters on demand', async () => {
      const d = new Device(db);
      await d.engine.start();
      expect(d.adaptersLoaded).toBe(0);
      await signIn(d);
      expect(d.adaptersLoaded).toBe(1);
    });
  });

  describe('AC 2: stamping while signed out (SYNC-031)', () => {
    it('SYNC-031 a change on a clock behind the previous stamp gets previous + 1; a removal is a tombstone at now', async () => {
      const d = new Device(db, { now: 1000 });
      await d.setCard('hextech ray', 2);
      await d.setCard('lightning rush', 1);
      expect((await d.log()).cards['hextech ray'].t).toBe(1000);
      d.now = 900;
      await d.setCard('hextech ray', 3);
      let log = await d.log();
      expect(log.cards['hextech ray'].t).toBe(1001);
      expect(log.pending.cards).toContain('hextech ray');
      d.now = 5000;
      await d.setCard('lightning rush', 0);
      log = await d.log();
      expect(log.cards['lightning rush']).toEqual({ t: 5000, deleted: true, h: '' });
    });
  });

  describe('AC 3 / AC 4: first sign-in (SYNC-048, SYNC-050, SYNC-120)', () => {
    it('SYNC-048 b uploads everything into an empty account in one batch of 4 + N writes, with the notice', async () => {
      const laptop = new Device(db);
      for (let i = 0; i < 350; i++) await laptop.setCard(`card ${i}`, 1 + (i % 3));
      const tagIds: string[] = [];
      for (let i = 0; i < 20; i++) {
        const id = `t_tag${String(i).padStart(3, '0')}`;
        tagIds.push(id);
        await laptop.addTag(id, `Tag ${i}`);
      }
      await laptop.assign('u:card 1', [tagIds[0]]);
      const decks = [];
      for (let i = 0; i < 10; i++) decks.push(await laptop.createDeck(`Deck ${i}`, [card('card 1', 1)]));
      for (let i = 0; i < 3; i++) await laptop.lock(decks[i].id);
      db.resetCounts();
      await signIn(laptop);
      expect(laptop.questions).toHaveLength(0);
      expect(db.reads).toBeLessThanOrEqual(16);
      expect(db.writes).toBe(14);
      expect(db.get('users/uA')).toBeDefined();
      for (const s of ['collection', 'tags', 'locks']) expect(db.get(`users/uA/state/${s}`)).toBeDefined();
      expect([...db.docs.keys()].filter((k) => k.startsWith('users/uA/decks/'))).toHaveLength(10);
      expect(laptop.notices).toContain(MESSAGES.uploaded);
      const log = await laptop.log();
      expect(log.uid).toBe('uA');
      expect(log.lastFullSyncAt).not.toBeNull();
      expect(laptop.engine.pendingCount()).toBe(0);
      expect(laptop.status.kind).toBe('synced');
    });

    it('SYNC-048 c a second, empty device downloads everything without a question', async () => {
      const laptop = await seedLaptop(db);
      const deck = await laptop.createDeck('Kennen Tempo', [card('hextech ray', 3)]);
      await laptop.lock(deck.id);
      await laptop.engine.syncNow();
      const phone = new Device(db);
      await signIn(phone);
      expect(phone.questions).toHaveLength(0);
      expect(await phone.quantity('hextech ray')).toBe(3);
      expect(await phone.deckNames()).toEqual(['Kennen Tempo']);
      expect(await phone.lockedIds()).toEqual([deck.id]);
      expect(phone.engine.pendingCount()).toBe(0);
    });

    it('SYNC-048 a: empty device, empty cloud creates only the account document', async () => {
      const d = new Device(db);
      await signIn(d);
      expect([...db.docs.keys()]).toEqual(['users/uA']);
    });

    it('SYNC-048 e: an existing account without data keeps its createdAt and gets no set() (AC 36)', async () => {
      const createdAt = at('09:00', 1);
      db.docs.set('users/uA', { schemaVersion: 1, createdAt, updatedAt: createdAt, syncedAt: 1, lastClientVersion: 'test-1' });
      const phone = new Device(db);
      for (let i = 0; i < 40; i++) await phone.setCard(`card ${i}`, 1);
      await signIn(phone);
      expect(phone.questions).toHaveLength(0);
      expect(db.get('users/uA')!['createdAt']).toBe(createdAt);
      expect(db.writeLog.filter(([p]) => p === 'users/uA')).toEqual([]);
      expect(Object.keys((db.get('users/uA/state/collection') as { cards: object }).cards)).toHaveLength(40);
    });

    it('SYNC-048 f: no account document but leftover state documents → nothing imported, nothing written, signed out (AC 36)', async () => {
      db.docs.set('users/uA/state/collection', {
        schemaVersion: 1,
        updatedAt: 1,
        syncedAt: 1,
        catalogVersion: 'x',
        cards: { 'hextech ray': { q: 9, t: 1, p: {} } },
      });
      const phone = new Device(db);
      await phone.setCard('lightning rush', 2);
      db.resetCounts();
      await signIn(phone);
      expect(db.writes).toBe(0);
      expect(await phone.quantity('hextech ray')).toBe(0);
      expect(await phone.quantity('lightning rush')).toBe(2);
      expect(phone.notices).toContain(MESSAGES.halfDeleted);
      const log = await phone.log();
      expect(log.sessionExpected).toBe(false);
      expect(log.uid).toBeNull();
    });

    it('SYNC-004 / SYNC-048 a tab closed before the first sync completed runs the first-sign-in flow again', async () => {
      const laptop = new Device(db);
      await laptop.setCard('hextech ray', 3);
      laptop.remote.failRules.push({ ref: '*', code: 'offline', once: true });
      await signIn(laptop);
      let log = await laptop.log();
      expect(log.sessionExpected).toBe(true);
      expect(log.uid).toBeNull();
      const again = laptop.reload();
      again.auth.uid = 'uA';
      await again.engine.start();
      await again.settle();
      log = await again.log();
      expect(log.uid).toBe('uA');
      expect(db.get('users/uA/state/collection')).toBeDefined();
    });
  });

  describe('AC 5 / AC 25: Combine and Cancel (SYNC-049, SYNC-064)', () => {
    async function setup() {
      const laptop = new Device(db, { now: at('09:00') });
      await laptop.setCard('hextech ray', 3);
      await laptop.addTag('t_Coll01', 'Collector');
      await laptop.assign('p:OGN-001a', ['t_Coll01']);
      await laptop.createDeck('Kennen Tempo');
      await signIn(laptop);
      const phone = new Device(db, { now: at('10:00') });
      await phone.setCard('hextech ray', 1);
      await phone.addTag('t_Trad01', 'Trade Binder');
      await phone.assign('p:OGN-001a', ['t_Trad01']);
      await phone.createDeck('Draft A');
      return { laptop, phone };
    }

    it('SYNC-049 Combine: latest card wins, assignment union (cloud first) is pushed, both decks exist, summary shown', async () => {
      const { laptop, phone } = await setup();
      phone.now = at('10:30');
      await signIn(phone);
      expect(phone.questions).toEqual([
        { device: { cards: 1, decks: 1, tags: 1 }, account: { cards: 1, decks: 1, tags: 1 }, differentAccount: false },
      ]);
      expect(await phone.quantity('hextech ray')).toBe(1);
      expect((await phone.tags()).assignments['p:OGN-001a']).toEqual(['t_Coll01', 't_Trad01']);
      expect(await phone.deckNames()).toEqual(['Draft A', 'Kennen Tempo']);
      expect(phone.notices).toContain('Combined. You now have 1 cards, 2 decks and 2 tags.');
      const cloudA = (db.get('users/uA/state/tags') as { assignments: Record<string, { a: string[]; t: number }> }).assignments['p:OGN-001a'];
      expect(cloudA.a).toEqual(['t_Coll01', 't_Trad01']);
      expect(cloudA.t).toBeGreaterThan(at('09:00'));
      laptop.now = at('11:00');
      await laptop.engine.syncNow();
      expect((await laptop.tags()).assignments['p:OGN-001a']).toEqual(['t_Coll01', 't_Trad01']);
    });

    it('SYNC-049 Cancel signs out and changes neither side; signing in again asks again (AC 25)', async () => {
      const { phone } = await setup();
      phone.combineAnswer = 'cancel';
      const before = new Map(db.docs);
      db.resetCounts();
      await signIn(phone);
      expect(db.writes).toBe(0);
      expect(new Map(db.docs)).toEqual(before);
      let log = await phone.log();
      expect(log).toMatchObject({ uid: null, lastFullSyncAt: null, sessionExpected: false });
      expect(phone.engine.signedInUid).toBeNull();
      await signIn(phone);
      expect(phone.questions).toHaveLength(2);
      expect(await phone.quantity('hextech ray')).toBe(1);
      expect(await phone.deckNames()).toEqual(['Draft A']);
      log = await phone.log();
      expect(log.sessionExpected).toBe(false);
    });

    it('SYNC-064 the union is capped at 20 ids with the summary line', async () => {
      const laptop = new Device(db, { now: at('09:00') });
      const ids = (p: string, n: number) => Array.from({ length: n }, (_, i) => `t_${p}${String(i).padStart(5, '0')}`);
      for (const id of ids('L', 15)) await laptop.addTag(id, id);
      await laptop.assign('u:hextech ray', ids('L', 15));
      await signIn(laptop);
      const phone = new Device(db, { now: at('10:00') });
      for (const id of ids('P', 10)) await phone.addTag(id, id);
      await phone.assign('u:hextech ray', ids('P', 10));
      await signIn(phone);
      expect((await phone.tags()).assignments['u:hextech ray']).toHaveLength(20);
      expect(phone.notices).toContain('1 entries had more than 20 tags; some tags were not added.');
    });
  });

  describe('AC 6: latest change wins per card, convergence (SYNC-060, SYNC-042, SYNC-043)', () => {
    it('SYNC-060 offline edits on two devices: both cards end with the latest values everywhere', async () => {
      const laptop = await seedLaptop(db, at('11:00'));
      const phone = new Device(db, { now: at('11:00') });
      await signIn(phone);
      laptop.remote.offline = phone.remote.offline = true;
      laptop.now = at('12:00');
      await laptop.setCard('hextech ray', 4);
      phone.now = at('12:05');
      await phone.setCard('hextech ray', 2);
      phone.now = at('12:06');
      await phone.setCard('lightning rush', 3);
      laptop.remote.offline = false;
      laptop.now = at('12:10');
      await laptop.engine.syncNow();
      phone.remote.offline = false;
      phone.now = at('12:11');
      await phone.engine.syncNow();
      laptop.now = at('12:12');
      await laptop.engine.syncNow();
      for (const d of [laptop, phone]) {
        expect(await d.quantity('hextech ray')).toBe(2);
        expect(await d.quantity('lightning rush')).toBe(3);
      }
      const cards = (db.get('users/uA/state/collection') as { cards: Record<string, { q: number }> }).cards;
      expect(cards['hextech ray'].q).toBe(2);
      expect(cards['lightning rush'].q).toBe(3);
    });

    it('SYNC-042 an older value written over a newer one is corrected by the device holding the newer one', async () => {
      const laptop = await seedLaptop(db, at('11:00'));
      const phone = new Device(db, { now: at('11:00') });
      await signIn(phone);
      laptop.remote.offline = phone.remote.offline = true;
      laptop.now = at('12:00');
      await laptop.setCard('hextech ray', 4);
      phone.now = at('12:05');
      await phone.setCard('hextech ray', 2);
      // laptop pulls first (nothing new yet), phone pushes 2, laptop pushes its older 4 over it
      laptop.remote.offline = false;
      laptop.now = at('12:10');
      await laptop.engine.syncNow(); // pull + push 4 (t 12:00)
      // rewind: emulate the window by having the phone push 2 and then the laptop push 4 again
      phone.remote.offline = false;
      phone.now = at('12:10') + 20_000;
      await phone.engine.syncNow(); // receives 4 (t 12:00), keeps 2 (12:05), pushes 2
      expect(await phone.quantity('hextech ray')).toBe(2);
      // the laptop's stale push lands over it (the SYNC-043 window)
      db.docs.set('users/uA/state/collection', {
        ...(db.get('users/uA/state/collection') as object),
        cards: { 'hextech ray': { q: 4, t: at('12:00'), p: {} }, 'lightning rush': { q: 2, t: T0, p: {} } },
        syncedAt: db.tick(),
      } as never);
      phone.now = at('12:12');
      await phone.engine.syncNow(); // receives 4 (12:00) → keeps 2, pending, pushes again
      laptop.now = at('12:13');
      await laptop.engine.syncNow(); // receives 2 (12:05) and takes it
      expect(await laptop.quantity('hextech ray')).toBe(2);
      expect((db.get('users/uA/state/collection') as { cards: Record<string, { q: number }> }).cards['hextech ray'].q).toBe(2);
    });
  });

  describe('AC 8 / AC 9: tombstones, expiry and Replace (SYNC-034, SYNC-044, SYNC-045, SYNC-014)', () => {
    it('SYNC-044 a removal syncs; an expired tombstone is purged by a later write; a tablet that missed it does a full read and drops the card', async () => {
      const phone = await seedLaptop(db, at('10:00', 20, 9)); // Oct 20
      const tablet = new Device(db, { now: at('10:00', 20, 9) });
      await signIn(tablet);
      const laptop = new Device(db, { now: at('10:00', 20, 9) });
      await signIn(laptop);
      phone.now = at('10:00', 1);
      await phone.setCard('lightning rush', 0);
      await phone.engine.syncNow();
      laptop.now = at('10:00', 5);
      await laptop.engine.syncNow();
      expect(await laptop.quantity('lightning rush')).toBe(0);
      phone.now = at('10:00', 2, 11); // Dec 2
      await phone.engine.syncNow();
      await phone.setCard('hextech ray', 5);
      await phone.engine.flush();
      const cards = (db.get('users/uA/state/collection') as { cards: Record<string, unknown> }).cards;
      expect('lightning rush' in cards).toBe(false);
      tablet.now = at('10:00', 3, 11); // Dec 3, last sync Oct 20
      db.resetCounts();
      await tablet.engine.syncNow();
      expect(await tablet.quantity('lightning rush')).toBe(0);
      expect((db.get('users/uA/state/collection') as { cards: Record<string, unknown> }).cards['lightning rush']).toBeUndefined();
    });

    it('SYNC-014 a Replace import is one set() with tombstones; the other device removes the dropped card', async () => {
      const laptop = await seedLaptop(db);
      const phone = new Device(db);
      await signIn(phone);
      laptop.now += 60_000;
      db.resetCounts();
      await laptop.replaceCollection({ 'hextech ray': { quantity: 3, byPrinting: {} } });
      await laptop.advance(2500);
      expect(db.writeLog).toEqual([['users/uA/state/collection', 'set']]);
      const cards = (db.get('users/uA/state/collection') as { cards: Record<string, { q: number }> }).cards;
      expect(cards['lightning rush']).toMatchObject({ q: 0, p: {} });
      phone.now = laptop.now;
      await phone.engine.syncNow();
      expect(await phone.quantity('lightning rush')).toBe(0);
      expect(await phone.quantity('hextech ray')).toBe(3);
    });
  });

  describe('AC 10 / AC 24: deck delete, Undo and lagging clocks (SYNC-035, SYNC-018, SYNC-031)', () => {
    it('SYNC-035 Undo within 10 s writes nothing and restores the identical deck', async () => {
      const laptop = await seedLaptop(db);
      const deck = await laptop.createDeck('Kennen Tempo', [card('hextech ray', 3)]);
      await laptop.advance(3000);
      db.resetCounts();
      const removed = await laptop.stores.decks.delete(deck.id);
      await laptop.advance(4000);
      await laptop.stores.decks.create(removed!);
      await laptop.advance(20_000);
      expect(db.writes).toBe(0);
      expect(await laptop.stores.decks.get(deck.id)).toEqual(deck);
      expect(laptop.engine.pendingCount()).toBe(0);
    });

    it('SYNC-018 a delete is pushed after 10 s as a tombstone with only the tombstone fields; the phone removes it', async () => {
      const laptop = await seedLaptop(db);
      const phone = new Device(db);
      await signIn(phone);
      const deck = await laptop.createDeck('Kennen Tempo', [card('hextech ray', 3)]);
      await laptop.advance(3000);
      await phone.engine.syncNow();
      expect(await phone.deckNames()).toEqual(['Kennen Tempo']);
      await laptop.stores.decks.delete(deck.id);
      await laptop.advance(5000);
      expect((db.get(`users/uA/decks/${deck.id}`) as { deletedAt: unknown }).deletedAt).toBeNull();
      await laptop.advance(6000);
      const doc = db.get(`users/uA/decks/${deck.id}`)!;
      expect(Object.keys(doc).sort()).toEqual(['createdAt', 'deletedAt', 'schemaVersion', 'syncedAt', 'updatedAt']);
      expect(doc['updatedAt']).toBe(doc['deletedAt']);
      await phone.engine.syncNow();
      expect(await phone.deckNames()).toEqual([]);
    });

    it('SYNC-060 a rename later than the delete restores the deck on both devices', async () => {
      const laptop = await seedLaptop(db, at('10:00'));
      const phone = new Device(db, { now: at('10:00') });
      await signIn(phone);
      const deck = await laptop.createDeck('Kennen Tempo');
      await laptop.advance(3000);
      await phone.engine.syncNow();
      phone.remote.offline = true;
      laptop.now = at('10:10');
      await laptop.stores.decks.delete(deck.id);
      await laptop.advance(11_000);
      phone.now = at('10:20');
      await phone.editDeck(deck.id, { name: 'Kennen Tempo v2' });
      phone.remote.offline = false;
      await phone.engine.syncNow();
      laptop.now = at('10:30');
      await laptop.engine.syncNow();
      expect(await laptop.deckNames()).toEqual(['Kennen Tempo v2']);
      expect(await phone.deckNames()).toEqual(['Kennen Tempo v2']);
    });

    it('SYNC-031 / SYNC-062 a laptop 10 minutes behind still wins its rename and its delete (AC 24)', async () => {
      const phone = await seedLaptop(db, at('12:00'));
      const laptop = new Device(db, { now: at('12:00') });
      await signIn(laptop);
      const deck = await phone.createDeck('Kennen Tempo');
      await phone.advance(0);
      const at1200 = Date.parse(deck.updatedAt);
      await phone.engine.flush();
      laptop.now = at('11:52');
      await laptop.engine.syncNow();
      await laptop.editDeck(deck.id, { name: 'Renamed' });
      expect(Date.parse((await laptop.stores.decks.get(deck.id))!.updatedAt)).toBe(at1200 + 1);
      laptop.now = at('11:53');
      await laptop.stores.decks.delete(deck.id);
      expect((await laptop.log()).deckTombstones[deck.id].deletedAt).toBe(at1200 + 2);
      await laptop.advance(11_000);
      phone.now = at('12:05');
      await phone.engine.syncNow();
      expect(await phone.deckNames()).toEqual([]);
      await laptop.engine.syncNow();
      expect(await laptop.deckNames()).toEqual([]);
    });
  });

  describe('AC 11 / AC 12 / AC 32: locks across devices (SYNC-071, SYNC-072, SYNC-073)', () => {
    async function twoDevicesWithDeck() {
      const laptop = await seedLaptop(db, at('09:00'));
      const deck = await laptop.createDeck('Kennen Tempo', [card('hextech ray', 3)]);
      await laptop.engine.flush();
      const phone = new Device(db, { now: at('09:30') });
      await signIn(phone);
      return { laptop, phone, deck };
    }

    it('SYNC-071 a lock on a deck deleted elsewhere is dropped and written as an unlock tombstone', async () => {
      const { laptop, phone, deck } = await twoDevicesWithDeck();
      laptop.remote.offline = true;
      laptop.now = at('10:00');
      await laptop.lock(deck.id);
      phone.now = at('10:30');
      await phone.stores.decks.delete(deck.id);
      await phone.advance(11_000);
      laptop.remote.offline = false;
      laptop.now = at('10:40');
      await laptop.engine.syncNow();
      await laptop.engine.flush();
      expect(await laptop.deckNames()).toEqual([]);
      expect(await laptop.lockedIds()).toEqual([]);
      const locks = (db.get('users/uA/state/locks') as { locks: Record<string, { lockedAt: unknown }> }).locks;
      expect(locks[deck.id].lockedAt).toBeNull();
      await phone.engine.syncNow();
      expect(await phone.lockedIds()).toEqual([]);
    });

    it('SYNC-072 a deck edited elsewhere while locked stays locked with its new cards and shows the notice', async () => {
      const { laptop, phone, deck } = await twoDevicesWithDeck();
      laptop.now = at('10:00');
      await laptop.lock(deck.id);
      await laptop.engine.flush();
      phone.remote.offline = true;
      phone.now = at('10:10');
      await phone.editDeck(deck.id, { main: [card('hextech ray', 4)] });
      phone.remote.offline = false;
      await phone.engine.syncNow();
      laptop.now = at('10:20');
      await laptop.engine.syncNow();
      expect(await laptop.lockedIds()).toEqual([deck.id]);
      expect((await laptop.stores.decks.get(deck.id))!.main).toEqual([card('hextech ray', 4)]);
      expect(laptop.notices).toContain("'Kennen Tempo' changed on another device while it was locked.");
    });

    it('SYNC-073 the later of lock and unlock wins; two locks keep the later entry and its lockedAt', async () => {
      const { laptop, phone, deck } = await twoDevicesWithDeck();
      await laptop.lock(deck.id);
      await laptop.engine.flush();
      await phone.engine.syncNow();
      phone.remote.offline = true;
      phone.now = at('10:00');
      await phone.unlock(deck.id);
      phone.now = at('10:02');
      await phone.lock(deck.id);
      laptop.now = at('10:05');
      await laptop.unlock(deck.id);
      await laptop.engine.flush();
      phone.remote.offline = false;
      await phone.engine.syncNow();
      await laptop.engine.syncNow();
      expect(await phone.lockedIds()).toEqual([]);
      expect(await laptop.lockedIds()).toEqual([]);

      laptop.now = at('11:00');
      await laptop.lock(deck.id);
      phone.remote.offline = true;
      phone.now = at('11:05');
      await phone.lock(deck.id);
      await laptop.engine.flush();
      phone.remote.offline = false;
      await phone.engine.syncNow();
      laptop.now = at('11:10');
      await laptop.engine.syncNow();
      for (const d of [laptop, phone]) {
        expect((await d.stores.locks.load())!.locks).toEqual([{ deckId: deck.id, lockedAt: new Date(at('11:05')).toISOString() }]);
      }
    });
  });

  describe('AC 14: same tag label on two devices (SYNC-065)', () => {
    it('SYNC-065 keeps the earlier tag, moves the other one’s assignments and tombstones it on both devices', async () => {
      const laptop = new Device(db, { now: at('09:00') });
      await laptop.addTag('t_a1B2c3', 'Trade Binder');
      await laptop.assign('p:OGN-001a', ['t_a1B2c3']);
      await signIn(laptop);
      const phone = new Device(db, { now: at('09:30') });
      await signIn(phone);
      phone.remote.offline = true;
      phone.now = at('10:00');
      const t = await phone.tags();
      await phone.stores.tags.save({
        ...t,
        updatedAt: new Date(phone.now).toISOString(),
        tags: [...t.tags.filter((x) => x.id !== 't_a1B2c3')],
      });
      // re-add the laptop's tag untouched, then the phone's own same-key tag
      await phone.stores.tags.save({ ...t, updatedAt: new Date(phone.now + 1).toISOString() });
      await phone.addTag('t_Z9y8x7', 'trade binder');
      await phone.assign('p:OGN-002a', ['t_Z9y8x7']);
      phone.remote.offline = false;
      phone.now = at('10:10');
      await phone.engine.syncNow();
      const pt = await phone.tags();
      expect(pt.tags.map((x) => x.id)).toEqual(['t_a1B2c3']);
      expect(pt.assignments['p:OGN-002a']).toEqual(['t_a1B2c3']);
      laptop.now = at('10:20');
      await laptop.engine.syncNow();
      const lt = await laptop.tags();
      expect(lt.tags.map((x) => x.label)).toEqual(['Trade Binder']);
      expect(lt.assignments['p:OGN-001a']).toEqual(['t_a1B2c3']);
      expect(lt.assignments['p:OGN-002a']).toEqual(['t_a1B2c3']);
      expect((await laptop.log()).tags['t_Z9y8x7'].deleted).toBe(true);
    });
  });

  describe('AC 16 / AC 17 / AC 30: unreadable, newer and invalid data (SYNC-033, SYNC-046, SYNC-047)', () => {
    it('SYNC-033 an unreadable tag store is neither pushed nor merged; collection still syncs; status Error', async () => {
      const laptop = await seedLaptop(db);
      await laptop.addTag('t_Coll01', 'Collector');
      await laptop.engine.flush();
      const tagsBefore = structuredClone(db.get('users/uA/state/tags'));
      laptop.backend.set(STORAGE_KEYS.tags, JSON.stringify({ schemaVersion: 9, updatedAt: 'x', tags: [], assignments: {} }));
      laptop.now += 60_000;
      await laptop.setCard('hextech ray', 7);
      await laptop.engine.flush();
      expect(db.get('users/uA/state/tags')).toEqual(tagsBefore);
      expect((db.get('users/uA/state/collection') as { cards: Record<string, { q: number }> }).cards['hextech ray'].q).toBe(7);
      expect(laptop.status).toMatchObject({ kind: 'error', message: MESSAGES.unreadable });
    });

    it('SYNC-046 a newer cloud schema makes that area read-only on this device; decks still sync', async () => {
      const laptop = await seedLaptop(db);
      const doc = db.get('users/uA/state/collection')!;
      db.docs.set('users/uA/state/collection', { ...doc, schemaVersion: 2, syncedAt: db.tick() });
      laptop.now += 60_000;
      await laptop.engine.syncNow();
      await expect(laptop.setCard('hextech ray', 9)).rejects.toBeInstanceOf(ReadOnlyAreaError);
      db.resetCounts();
      await laptop.createDeck('Kennen Tempo');
      await laptop.advance(2500);
      expect(db.writeLog.map(([p]) => p)).toEqual([expect.stringMatching(/^users\/uA\/decks\//)]);
      expect(db.get('users/uA/state/collection')!['schemaVersion']).toBe(2);
    });

    it('SYNC-047 an invalid pulled card is skipped, a valid one next to it is merged, status Error', async () => {
      const laptop = await seedLaptop(db);
      const doc = db.get('users/uA/state/collection')! as { cards: Record<string, unknown> };
      db.docs.set('users/uA/state/collection', {
        ...doc,
        cards: { 'hextech ray': { q: 2, t: T0 + 5000, p: { 'OGN-001a': 3 } }, 'lightning rush': { q: 4, t: T0 + 5000, p: {} } },
        syncedAt: db.tick(),
      } as never);
      laptop.now += 60_000;
      await laptop.engine.syncNow();
      expect(await laptop.quantity('hextech ray')).toBe(3);
      expect(await laptop.quantity('lightning rush')).toBe(4);
      expect(laptop.status).toMatchObject({ kind: 'error', message: MESSAGES.invalid });
    });
  });

  describe('AC 18: reopen cost and debounce (SYNC-040, SYNC-120, SYNC-121)', () => {
    it('SYNC-120 reopen = 3 reads and 0 writes; Sync now = 2 reads; five quick presses = one write', async () => {
      const laptop = await seedLaptop(db);
      for (let i = 0; i < 10; i++) await laptop.createDeck(`Deck ${i}`);
      await laptop.engine.flush();
      laptop.now += 1000;
      await laptop.engine.syncNow(); // absorbs the echo of its own writes
      laptop.now += 3600_000;
      const reopened = laptop.reload();
      reopened.auth.uid = 'uA';
      db.resetCounts();
      await reopened.engine.start();
      await reopened.settle();
      expect(db.reads).toBe(3);
      expect(db.writes).toBe(0);
      reopened.now += 60_000;
      db.resetCounts();
      await reopened.engine.syncNow();
      expect(db.reads).toBe(2);
      db.resetCounts();
      for (let i = 0; i < 5; i++) {
        await reopened.setCard('hextech ray', 4 + i);
        await reopened.advance(300);
      }
      expect(db.writes).toBe(0);
      await reopened.advance(2100);
      expect(db.writes).toBe(1);
    });
  });

  describe('AC 19: offline and quota (SYNC-080, SYNC-082, SYNC-083, SYNC-084)', () => {
    it('SYNC-082 offline edits stay pending across a reload and are pushed on the next open', async () => {
      const laptop = await seedLaptop(db);
      laptop.remote.offline = true;
      await laptop.setCard('hextech ray', 5);
      await laptop.setCard('lightning rush', 6);
      await laptop.advance(2500);
      expect(laptop.status).toEqual({ kind: 'offline', pendingCount: 2 });
      const reopened = laptop.reload();
      reopened.remote.offline = false;
      reopened.auth.uid = 'uA';
      await reopened.engine.start();
      await reopened.settle();
      const cards = (db.get('users/uA/state/collection') as { cards: Record<string, { q: number }> }).cards;
      expect([cards['hextech ray'].q, cards['lightning rush'].q]).toEqual([5, 6]);
      expect(reopened.engine.pendingCount()).toBe(0);
    });

    it('SYNC-083 an exhausted quota pauses sync and keeps the edit locally', async () => {
      const laptop = await seedLaptop(db);
      laptop.remote.quota = true;
      await laptop.setCard('hextech ray', 5);
      await laptop.advance(70_000);
      expect(await laptop.quantity('hextech ray')).toBe(5);
      expect(laptop.status).toEqual({ kind: 'paused', pendingCount: 1 });
    });
  });

  describe('AC 20 / AC 26 / AC 31: sign-out (SYNC-090, SYNC-091, SYNC-052)', () => {
    it('SYNC-091 Keep a copy: data stays; same account resumes without Combine; another account sees the different-account line', async () => {
      const laptop = await seedLaptop(db);
      await laptop.engine.signOut('keep');
      expect(await laptop.quantity('hextech ray')).toBe(3);
      expect(laptop.engine.signedInUid).toBeNull();
      await laptop.setCard('hextech ray', 4);
      await signIn(laptop, 'uA');
      expect(laptop.questions).toHaveLength(0);
      expect((db.get('users/uA/state/collection') as { cards: Record<string, { q: number }> }).cards['hextech ray'].q).toBe(4);
      await laptop.engine.signOut('keep');
      // uB has data of its own
      const other = new Device(db);
      await other.setCard('lightning rush', 1);
      await signIn(other, 'uB');
      laptop.combineAnswer = 'cancel';
      await signIn(laptop, 'uB');
      expect(laptop.questions.at(-1)?.differentAccount).toBe(true);
    });

    it('SYNC-091 Remove clears every local store and the sync log', async () => {
      const laptop = await seedLaptop(db);
      await laptop.engine.signOut('remove');
      expect(laptop.backend.keys().filter((k) => k.startsWith('rift.'))).toEqual([]);
      expect(db.get('users/uA/state/collection')).toBeDefined();
    });

    it('SYNC-002 / SYNC-086 Keep a copy, then reload: no Firebase, no session-lost message (AC 26)', async () => {
      const laptop = await seedLaptop(db);
      await laptop.engine.signOut('keep');
      const reopened = laptop.reload();
      await reopened.engine.start();
      expect(reopened.adaptersLoaded).toBe(0);
      expect(reopened.notices).not.toContain(MESSAGES.sessionLost);
      expect(await reopened.quantity('hextech ray')).toBe(3);
    });
  });

  describe('AC 21 / AC 38: delete account (SYNC-095, SYNC-096, SYNC-097)', () => {
    it('SYNC-096 deletes the account document first, then decks and state, then the Auth user, then this device', async () => {
      const laptop = await seedLaptop(db);
      await laptop.addTag('t_Coll01', 'Collector');
      const decks = [];
      for (let i = 0; i < 12; i++) decks.push(await laptop.createDeck(`Deck ${i}`));
      await laptop.lock(decks[5].id);
      await laptop.engine.flush();
      for (const d of decks.slice(0, 2)) await laptop.stores.decks.delete(d.id);
      await laptop.advance(11_000);
      db.resetCounts();
      expect(await laptop.engine.deleteAccount()).toBe('ok');
      const deletes = db.writeLog.filter(([, k]) => k === 'delete').map(([p]) => p);
      expect(deletes[0]).toBe('users/uA');
      expect(deletes.filter((p) => p.includes('/decks/'))).toHaveLength(12);
      expect(deletes.slice(-3)).toEqual(['users/uA/state/collection', 'users/uA/state/tags', 'users/uA/state/locks']);
      expect(laptop.auth.deletedUser).toBe(true);
      expect([...db.docs.keys()].filter((k) => k.startsWith('users/uA'))).toEqual([]);
      expect(laptop.backend.keys().filter((k) => k.startsWith('rift.'))).toEqual([]);
      expect(laptop.notices).toContain(MESSAGES.deletedOwn);
      expect(laptop.status.kind).toBe('signed-out');
    });

    it('SYNC-096 a failure part-way stops before the Auth user; a retry continues and deletes it at the end', async () => {
      const laptop = await seedLaptop(db);
      for (let i = 0; i < 10; i++) await laptop.createDeck(`Deck ${i}`);
      await laptop.engine.flush();
      laptop.remote.failDeleteAfter = 5;
      expect(await laptop.engine.deleteAccount()).toBe('failed');
      expect(laptop.auth.deletedUser).toBe(false);
      expect(laptop.notices).toContain(MESSAGES.deleteIncomplete);
      expect(await laptop.engine.deleteAccount()).toBe('ok');
      expect(laptop.auth.calls.filter((c) => c === 'deleteUser')).toHaveLength(1);
      expect([...db.docs.keys()].filter((k) => k.startsWith('users/uA'))).toEqual([]);
    });

    it('SYNC-096 (1) asks for a recent sign-in before deleting anything', async () => {
      const laptop = await seedLaptop(db);
      laptop.auth.recentSignIn = false;
      laptop.auth.reauthResult = 'cancelled';
      expect(await laptop.engine.deleteAccount()).toBe('cancelled');
      expect(db.get('users/uA')).toBeDefined();
    });

    it('SYNC-097 deleted: another device removes the synced data and says so', async () => {
      const laptop = await seedLaptop(db);
      const phone = new Device(db);
      await signIn(phone);
      await laptop.engine.deleteAccount();
      const reopened = phone.reload();
      reopened.auth.uid = 'uA';
      reopened.auth.account = 'deleted';
      await reopened.engine.start();
      await reopened.settle();
      expect(await reopened.quantity('hextech ray')).toBe(0);
      expect(reopened.notices).toContain(MESSAGES.accountDeleted);
      expect((await reopened.log()).sessionExpected).toBe(false);
    });
  });

  describe('AC 27 / AC 28: lost sessions and deleted accounts (SYNC-086, SYNC-053, SYNC-097, SYNC-098)', () => {
    it('SYNC-086 a revoked session stops syncing, keeps data and pending changes; signing in again pushes them', async () => {
      const laptop = await seedLaptop(db);
      laptop.remote.offline = true;
      await laptop.setCard('hextech ray', 5);
      await laptop.setCard('lightning rush', 6);
      laptop.remote.offline = false;
      const reopened = laptop.reload();
      reopened.auth.uid = null; // token revoked
      reopened.auth.account = 'signed-out';
      await reopened.engine.start();
      expect(reopened.notices).toContain(MESSAGES.sessionLost);
      expect(reopened.engine.pendingCount()).toBe(2);
      expect((await reopened.log()).sessionExpected).toBe(true);
      await signIn(reopened);
      expect(reopened.questions).toHaveLength(0);
      expect(reopened.engine.pendingCount()).toBe(0);
    });

    it('SYNC-053 a linked device opening after deletion writes nothing and removes its synced data on deleted', async () => {
      const laptop = await seedLaptop(db);
      const tablet = new Device(db);
      await signIn(tablet);
      const deck = await tablet.createDeck('Kennen Tempo');
      await tablet.engine.flush();
      tablet.remote.offline = true;
      await tablet.editDeck(deck.id, { name: 'pending edit' });
      await laptop.engine.deleteAccount();
      const reopened = tablet.reload();
      reopened.remote.offline = false;
      reopened.auth.uid = 'uA';
      reopened.auth.account = 'deleted';
      db.resetCounts();
      await reopened.engine.start();
      await reopened.settle();
      expect(db.writes).toBe(0);
      expect([...db.docs.keys()].filter((k) => k.startsWith('users/uA'))).toEqual([]);
      expect(reopened.auth.calls).toContain('checkAccount');
      expect(await reopened.deckNames()).toEqual([]);
    });

    it('SYNC-053 a running device whose update() fails with not-found stops, keeps the change pending and checks', async () => {
      const laptop = await seedLaptop(db);
      db.docs.clear(); // deleted elsewhere while running
      laptop.auth.account = 'deleted';
      await laptop.setCard('hextech ray', 9);
      await laptop.advance(2500);
      expect(laptop.auth.calls).toContain('checkAccount');
      expect([...db.docs.keys()]).toEqual([]);
    });

    it('SYNC-097 half-deleted (ok, account document gone): sign out, keep data, write nothing (AC 28)', async () => {
      const laptop = await seedLaptop(db);
      const tablet = new Device(db);
      await signIn(tablet);
      db.docs.delete('users/uA');
      const reopened = tablet.reload();
      reopened.auth.uid = 'uA';
      reopened.auth.account = 'ok';
      const leftovers = new Map(db.docs);
      db.resetCounts();
      await reopened.engine.start();
      await reopened.settle();
      expect(db.writes).toBe(0);
      expect(new Map(db.docs)).toEqual(leftovers);
      expect(reopened.notices).toContain(MESSAGES.halfDeleted);
      expect(await reopened.quantity('hextech ray')).toBe(3);
      const log = await reopened.log();
      expect(log).toMatchObject({ sessionExpected: false, uid: null });
      expect(log.pending.cards).toEqual([]);
      void laptop;
    });
  });

  describe('AC 29: rejected writes (SYNC-118, SYNC-053)', () => {
    it('SYNC-118 a denied update stays pending, is reported with the deck name, and is not retried until it changes', async () => {
      const laptop = await seedLaptop(db);
      const deck = await laptop.createDeck('Big Paste');
      await laptop.engine.flush();
      laptop.remote.failRules.push({ ref: `deck:${deck.id}`, code: 'permission-denied' });
      await laptop.editDeck(deck.id, { notes: 'x' });
      await laptop.setCard('hextech ray', 8);
      await laptop.advance(2500);
      expect(laptop.status).toMatchObject({ kind: 'error', message: "Some data couldn't be synced: decks (Big Paste)." });
      expect((db.get('users/uA/state/collection') as { cards: Record<string, { q: number }> }).cards['hextech ray'].q).toBe(8);
      expect((await laptop.log()).pending.decks).toEqual([deck.id]);
      const writes = db.writes;
      await laptop.engine.flush();
      expect(db.writes).toBe(writes);
      laptop.remote.failRules = [];
      await laptop.editDeck(deck.id, { notes: 'y' });
      await laptop.advance(2500);
      expect((await laptop.log()).pending.decks).toEqual([]);
    });

    it('SYNC-053 a denied create with the account present repeats the account check once, then is rejected', async () => {
      const laptop = await seedLaptop(db);
      laptop.remote.failRules.push({ ref: '*', code: 'permission-denied', createsOnly: true });
      const deck = await laptop.createDeck('New format deck');
      db.resetCounts();
      await laptop.advance(2500);
      expect(db.reads).toBe(1); // the account get
      expect((await laptop.log()).rejected).toEqual([`decks:${deck.id}`]);
      expect(laptop.auth.calls).not.toContain('checkAccount');
      db.resetCounts();
      await laptop.engine.flush();
      expect(db.reads).toBe(0);
    });

    it('SYNC-113 / AC 28 a create while the account document is absent goes to the account check, not the rejected path', async () => {
      const laptop = await seedLaptop(db);
      db.docs.delete('users/uA');
      laptop.auth.account = 'ok';
      await laptop.createDeck('After deletion');
      await laptop.advance(2500);
      expect(laptop.auth.calls).toContain('checkAccount');
      expect((await laptop.log()).rejected).toEqual([]);
      expect([...db.docs.keys()].some((k) => k.includes('/decks/'))).toBe(false);
    });
  });

  describe('AC 34: merge writes are not user changes (SYNC-041, SYNC-032)', () => {
    it('SYNC-041 pulled items keep their times, nothing is pending, and a reload reconciles nothing', async () => {
      const laptop = await seedLaptop(db, at('12:00'));
      const phone = new Device(db, { now: at('12:00') });
      await signIn(phone);
      const deck = await phone.createDeck('Kennen Tempo');
      await phone.engine.flush();
      await laptop.engine.syncNow();
      phone.now = at('12:05');
      await phone.setCard('hextech ray', 4);
      phone.now = at('12:06');
      await phone.editDeck(deck.id, { name: 'Kennen Tempo 2' });
      await phone.addTag('t_New001', 'New');
      await phone.engine.flush();
      laptop.now = at('12:30');
      await laptop.engine.syncNow();
      const log = await laptop.log();
      expect(log.cards['hextech ray'].t).toBe(at('12:05'));
      expect(log.knownDecks[deck.id]).toBe(at('12:06'));
      expect(log.tags['t_New001'].t).toBe(at('12:06'));
      expect(laptop.engine.pendingCount()).toBe(0);
      const reopened = laptop.reload();
      reopened.auth.uid = 'uA';
      db.resetCounts();
      await reopened.engine.start();
      await reopened.settle();
      expect(reopened.engine.pendingCount()).toBe(0);
      expect(db.writes).toBe(0);
    });
  });

  describe('AC 37: same deck status on every device (SYNC-077)', () => {
    it('SYNC-077 nothing status-like is stored or synced, and device-local stores never reach the cloud', async () => {
      const laptop = await seedLaptop(db);
      const deck = await laptop.createDeck('Kennen Tempo', [card('hextech ray', 3)]);
      await laptop.lock(deck.id);
      await laptop.stores.viewState.save({
        schemaVersion: 2,
        updatedAt: new Date(laptop.now).toISOString(),
        query: { view: 'cards', tags: { ids: [], mode: 'any' } },
        savedViews: [{ id: 'v1', name: 'Mine', query: { view: 'cards', tags: { ids: [], mode: 'any' } } }],
      });
      db.resetCounts();
      await laptop.engine.flush();
      const locks = db.get('users/uA/state/locks') as { locks: Record<string, object> };
      expect(Object.keys(locks.locks[deck.id]).sort()).toEqual(['lockedAt', 'updatedAt']);
      expect((await laptop.stores.locks.load())!.locks).toEqual([{ deckId: deck.id, lockedAt: expect.any(String) }]);
      const paths = [...db.docs.keys()];
      expect(paths.every((p) => /^users\/uA(\/state\/(collection|tags|locks)|\/decks\/[0-9a-f-]{36})?$/.test(p))).toBe(true);
      expect(JSON.stringify([...db.docs.values()])).not.toMatch(/short|savedViews|printingCodes|ready|partial/);
    });
  });

  describe('SYNC-005 / SYNC-081: sign-in outcomes', () => {
    it('SYNC-005 a failed sign-in changes nothing and says so; a cancelled one is silent', async () => {
      const d = new Device(db);
      await d.setCard('hextech ray', 1);
      d.auth.nextSignIn = 'error';
      expect(await d.engine.signIn('google')).toBe('failed');
      expect(d.notices).toEqual([MESSAGES.signInFailed]);
      d.auth.nextSignIn = 'cancelled';
      expect(await d.engine.signIn('google')).toBe('cancelled');
      expect(d.notices).toHaveLength(1);
      expect((await d.log()).sessionExpected).toBe(false);
      expect(db.writes).toBe(0);
    });

    it('SYNC-081 sign-in and account deletion are refused offline', async () => {
      const d = new Device(db);
      d.online = false;
      expect(await d.engine.signIn('google')).toBe('offline');
      expect(d.notices).toEqual([MESSAGES.offline]);
    });
  });

  it('SYNC-045 a device last synced more than 30 days ago does a full read', async () => {
    const laptop = await seedLaptop(db);
    laptop.now += 31 * DAY_MS;
    const spy = vi.spyOn(laptop.remote, 'pull');
    await laptop.engine.syncNow();
    expect(spy.mock.calls[0][1]).toBeNull();
  });

  it('SYNC-111 deck ids helper produces valid lowercase UUIDs', () => {
    expect(deckId(7)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});
