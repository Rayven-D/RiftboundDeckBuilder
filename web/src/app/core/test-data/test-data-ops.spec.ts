/**
 * SPEC-013 Test Data (H-205): Load / Remove through the tracked stores and the real sync engine against the fake
 * Firestore: what reaches the account, the write and read counts per action (AC 4, AC 10) and the stored size of the
 * Large `state/collection` document (AC 4, ≤ 262,144 bytes).
 */
import { FakeFirestore } from '../../shared/sync/testing/fakes';
import { Device, T0, card, deckId } from '../../shared/sync/testing/device';
import { documentSize } from '../../shared/sync/testing/firestore-size';
import { PUSH_DEBOUNCE_MS } from '../../shared/sync/sync-engine';
import { DECK_UNDO_MS } from '../../shared/sync/sync-log';
import { TEST_DECK_IDS, isTestCollection } from '../../shared/collection/test-data';
import { generateLargeSample } from '../../shared/collection/sample-data';
import { loadTestData, removeTestData, removeTestDecks } from './test-data-ops';

/** A Firebase Auth uid is 28 characters; the document name size depends on it. */
const UID = 'Q3x9LmP0aZ7tR2vK8sN4bW6yJ1cD';
const COLLECTION = `users/${UID}/state/collection`;
const LOCKS = `users/${UID}/state/locks`;
const deckPath = (id: string) => `users/${UID}/decks/${id}`;

async function signedIn(db: FakeFirestore, d = new Device(db)): Promise<Device> {
  d.auth.nextSignIn = UID;
  await d.engine.signIn('google');
  await d.settle();
  return d;
}

const load = (d: Device, set: 'small' | 'large') => loadTestData(d.stores, set, () => d.now);
const remove = (d: Device) => removeTestData(d.stores, () => d.now);
const writes = (db: FakeFirestore) => db.writeLog.map(([p, k]) => `${k} ${p}`);

describe('SPEC-013 test data through sync (H-205)', () => {
  let db: FakeFirestore;
  beforeEach(() => {
    db = new FakeFirestore();
    db.serverTime = T0;
  });

  it('TEST-020 / AC 4 Large: one set() of state/collection with test-data-5000 and 1,667 cards, 3 decks and the locks: 5 writes, 0 reads; the document is ≤ 262,144 bytes', async () => {
    const laptop = await signedIn(db);
    db.resetCounts();
    expect(await load(laptop, 'large')).toBe('ok');
    await laptop.advance(PUSH_DEBOUNCE_MS);

    expect(writes(db).sort()).toEqual(
      [
        `set ${COLLECTION}`,
        `set ${LOCKS}`,
        ...TEST_DECK_IDS.map((id) => `set ${deckPath(id)}`),
      ].sort(),
    );
    expect(db.reads).toBe(0);
    const doc = db.get(COLLECTION);
    expect(doc.catalogVersion).toBe('test-data-5000');
    expect(Object.keys(doc.cards)).toHaveLength(1667);
    const entries = Object.values(doc.cards as Record<string, { p: Record<string, number> }>).reduce(
      (n, c) => n + Object.keys(c.p).length,
      0,
    );
    expect(entries).toBe(5000);
    const bytes = documentSize(COLLECTION, doc);
    // Recorded in brain/07-Loop/Collection Test Data.md (H-205).
    console.log(`H-205 measured: Large state/collection = ${bytes} bytes; Load writes = ${db.writeLog.length}, reads = ${db.reads}`);
    expect(bytes).toBeLessThanOrEqual(262_144);
    expect(laptop.engine.pendingCount()).toBe(0);
  });

  it('TEST-020 / AC 4 after a build change the account update() goes out with the start-up sync, so a Load is still 5 writes (6 only if it shares that push)', async () => {
    const first = await signedIn(db);
    const laptop = first.reload({ appVersion: 'test-2' });
    db.resetCounts();
    await laptop.engine.start();
    await laptop.settle();
    expect(writes(db)).toEqual([`update users/${UID}`]); // SYNC-012 lastClientVersion
    db.resetCounts();
    expect(await load(laptop, 'small')).toBe('ok');
    await laptop.advance(PUSH_DEBOUNCE_MS);
    // The account update may already have gone out with the start-up sync; either way Load costs 5 or 6.
    const loadWrites = db.writeLog.length;
    expect(loadWrites === 5 || loadWrites === 6).toBe(true);
    expect(writes(db)).toContain(`set ${COLLECTION}`);
    console.log(`H-205 measured: Load after a build change = ${loadWrites} writes, ${db.reads} reads`);
  });

  it('TEST-021 / AC 6 Small keeps the own deck and its lock, adds three test decks, the first two locked', async () => {
    const laptop = await signedIn(db);
    const own = await laptop.createDeck('My Deck', [card('ashen warden 1', 1)], deckId(77));
    await laptop.lock(own.id);
    expect(await load(laptop, 'small')).toBe('ok');
    expect(await laptop.deckNames()).toEqual(['Generated Locked A', 'Generated Locked B', 'Generated Open', 'My Deck']);
    expect((await laptop.lockedIds()).sort()).toEqual([own.id, TEST_DECK_IDS[0], TEST_DECK_IDS[1]].sort());
    const c = await laptop.stores.collection.load();
    expect(c?.catalogVersion).toBe('test-data-150');
    expect(Object.values(c!.cards).reduce((n, x) => n + Object.keys(x.byPrinting).length, 0)).toBe(150);
    for (const id of TEST_DECK_IDS) expect((await laptop.stores.decks.get(id))?.catalogVersion).toBe('test-data-150');
  });

  it('TEST-022 / AC 7 a second Load replaces the test set (Large over Small), keeps the own deck, still three test decks', async () => {
    const laptop = await signedIn(db);
    await laptop.createDeck('My Deck', [], deckId(78));
    await load(laptop, 'small');
    await laptop.advance(PUSH_DEBOUNCE_MS);
    expect(await load(laptop, 'large')).toBe('ok');
    await laptop.advance(PUSH_DEBOUNCE_MS);
    const c = await laptop.stores.collection.load();
    expect(c?.catalogVersion).toBe('test-data-5000');
    expect(Object.values(c!.cards).reduce((n, x) => n + Object.keys(x.byPrinting).length, 0)).toBe(5000);
    expect((await laptop.deckNames()).length).toBe(4);
    expect(db.get(COLLECTION).catalogVersion).toBe('test-data-5000');
    for (const id of TEST_DECK_IDS) expect(db.get(deckPath(id)).catalogVersion).toBe('test-data-5000');
  });

  it('TEST-012 / AC 8 a Load over real cards writes nothing and reports real-cards', async () => {
    const laptop = await signedIn(db);
    await laptop.setCard('hextech ray', 2, { 'OGN-001': 2 });
    await laptop.advance(PUSH_DEBOUNCE_MS);
    db.resetCounts();
    const before = laptop.backend.get('rift.collection');
    expect(await load(laptop, 'large')).toBe('real-cards');
    await laptop.advance(PUSH_DEBOUNCE_MS);
    expect(db.writeLog).toEqual([]);
    expect(laptop.backend.get('rift.collection')).toBe(before);
    expect(await laptop.deckNames()).toEqual([]);
  });

  it('TEST-012 a Load that finds real cards after the generator ran (another device imported meanwhile) writes nothing', async () => {
    const laptop = await signedIn(db);
    const result = await loadTestData(
      laptop.stores,
      'small',
      () => laptop.now,
      async (n) => {
        await laptop.setCard('hextech ray', 1); // the pulled import lands while the set is generated
        return generateLargeSample(n);
      },
    );
    expect(result).toBe('real-cards');
    expect(await laptop.deckNames()).toEqual([]);
    expect((await laptop.stores.collection.load())?.catalogVersion).not.toMatch(/^test-data-/);
  });

  it('TEST-050 / TEST-051 / AC 9 / AC 10 / AC 10a Remove: collection and locks at once, the 3 deck tombstones after the 10 s Undo window: 5 writes, 0 reads; own deck and lock kept', async () => {
    const laptop = await signedIn(db);
    const own = await laptop.createDeck('My Deck', [card('ashen warden 1', 1)], deckId(79));
    await laptop.lock(own.id);
    await laptop.addTag('t_keep01', 'Keep');
    await load(laptop, 'large');
    await laptop.advance(PUSH_DEBOUNCE_MS);
    db.resetCounts();

    await remove(laptop);
    await laptop.advance(PUSH_DEBOUNCE_MS);
    expect(writes(db).sort()).toEqual([`update ${COLLECTION}`, `update ${LOCKS}`].sort());
    await laptop.advance(DECK_UNDO_MS);
    expect(writes(db).slice(2).sort()).toEqual(TEST_DECK_IDS.map((id) => `set ${deckPath(id)}`).sort());
    expect(db.writeLog.length).toBe(5);
    expect(db.reads).toBe(0);
    console.log(`H-205 measured: Remove writes = ${db.writeLog.length} (2 at once, 3 after the Undo window), reads = ${db.reads}`);

    // AC 10a: catalogVersion "" and no live cards, locally and in the cloud
    const local = await laptop.stores.collection.load();
    expect(local?.catalogVersion).toBe('');
    expect(local?.cards).toEqual({});
    expect(isTestCollection(local)).toBe(false);
    const cloud = db.get(COLLECTION);
    expect(cloud.catalogVersion).toBe('');
    expect(Object.values(cloud.cards as Record<string, { q: number }>).every((c) => c.q === 0)).toBe(true);
    const tombBytes = documentSize(COLLECTION, cloud);
    console.log(`H-205 measured: state/collection after Remove (1,667 tombstones) = ${tombBytes} bytes`);
    for (const id of TEST_DECK_IDS) expect(db.get(deckPath(id)).deletedAt).not.toBeNull();
    // own data kept
    expect(await laptop.deckNames()).toEqual(['My Deck']);
    expect(await laptop.lockedIds()).toEqual([own.id]);
    expect(db.get(LOCKS).locks[own.id].lockedAt).not.toBeNull();
    expect((await laptop.tags()).tags.map((t) => t.id)).toEqual(['t_keep01']);
  });

  it('TEST-024 / TEST-031 / AC 5 / AC 10 a second device pulls the marker and the test decks, and after Remove shows neither', async () => {
    const laptop = await signedIn(db);
    await load(laptop, 'large');
    await laptop.advance(PUSH_DEBOUNCE_MS);
    const phone = await signedIn(db, new Device(db, { now: laptop.now }));
    expect(isTestCollection(await phone.stores.collection.load())).toBe(true);
    expect((await phone.stores.collection.load())?.catalogVersion).toBe('test-data-5000');
    expect(await phone.deckNames()).toEqual(['Generated Locked A', 'Generated Locked B', 'Generated Open']);

    // Remove from the phone (TEST-031: either device)
    await remove(phone);
    await phone.advance(PUSH_DEBOUNCE_MS + DECK_UNDO_MS);
    laptop.now = phone.now;
    await laptop.engine.syncNow();
    await laptop.settle();
    const c = await laptop.stores.collection.load();
    expect(isTestCollection(c)).toBe(false);
    expect(Object.keys(c?.cards ?? {})).toEqual([]);
    expect(await laptop.deckNames()).toEqual([]);
    expect(await laptop.lockedIds()).toEqual([]);
  });

  it('TEST-020 Load right after Remove (inside the Undo window) still pushes the new test decks', async () => {
    const laptop = await signedIn(db);
    await load(laptop, 'small');
    await laptop.advance(PUSH_DEBOUNCE_MS);
    await remove(laptop);
    expect(await load(laptop, 'large')).toBe('ok');
    await laptop.advance(PUSH_DEBOUNCE_MS + DECK_UNDO_MS);
    for (const id of TEST_DECK_IDS) {
      expect(db.get(deckPath(id)).deletedAt).toBeNull();
      expect(db.get(deckPath(id)).catalogVersion).toBe('test-data-5000');
    }
    expect(laptop.engine.pendingCount()).toBe(0);
  });

  it('TEST-033 / TEST-034 removeTestDecks (the Replace-import part) removes the test decks and their locks, keeps the collection and own decks', async () => {
    const laptop = await signedIn(db);
    const own = await laptop.createDeck('My Deck', [], deckId(80));
    await laptop.lock(own.id);
    await load(laptop, 'small');
    await laptop.replaceCollection({ 'hextech ray': { quantity: 1, byPrinting: {} } });
    await removeTestDecks(laptop.stores, () => laptop.now);
    expect(await laptop.deckNames()).toEqual(['My Deck']);
    expect(await laptop.lockedIds()).toEqual([own.id]);
    expect(Object.keys((await laptop.stores.collection.load())!.cards)).toEqual(['hextech ray']);
  });

  it('TEST-053 sign-out clears the test data from the device like any account data', async () => {
    const laptop = await signedIn(db);
    await load(laptop, 'small');
    await laptop.advance(PUSH_DEBOUNCE_MS);
    expect(await laptop.engine.signOut()).toBe('ok');
    await laptop.settle();
    expect(laptop.backend.keys().filter((k) => k.startsWith('rift.collection') || k.startsWith('rift.deck.'))).toEqual([]);
  });
});
