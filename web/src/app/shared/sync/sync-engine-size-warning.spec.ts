/**
 * SPEC-010 SYNC-123 (SHOULD, H-075): a heavy collection document stays under 700 KB; above that the app logs a
 * warning for RJ (never a user notice). The size is Firestore's storage size of `state/collection`.
 */
import { FakeFirestore } from './testing/fakes';
import { Device, T0 } from './testing/device';
import { COLLECTION_WARN_BYTES, collectionDocBytes, firestoreValueBytes } from './push-plan';
import { collectionSizeWarning } from './sync-engine';
import { emptySyncLog } from './sync-log';
import type { StoredCollection } from '../storage/records';

async function signIn(d: Device, uid = 'uA'): Promise<void> {
  d.auth.nextSignIn = uid;
  await d.engine.signIn('google');
  await d.settle();
}

/** `n` cards with six printings each (about 150 bytes a card in the document). */
function bigCards(n: number): Record<string, { quantity: number; byPrinting: Record<string, number> }> {
  const cards: Record<string, { quantity: number; byPrinting: Record<string, number> }> = {};
  for (let i = 0; i < n; i++) {
    const byPrinting: Record<string, number> = {};
    for (let j = 0; j < 6; j++) byPrinting[`OGN-${String(i).padStart(4, '0')}${'abcdef'[j]}`] = 1;
    cards[`sample card number ${String(i).padStart(4, '0')}`] = { quantity: 6, byPrinting };
  }
  return cards;
}

describe('SYNC-123 Firestore size estimate', () => {
  it('SYNC-123 strings are UTF-8 + 1, numbers 8, maps their keys (UTF-8 + 1) plus values', () => {
    expect(firestoreValueBytes('abc')).toBe(4);
    expect(firestoreValueBytes('é')).toBe(3);
    expect(firestoreValueBytes(7)).toBe(8);
    expect(firestoreValueBytes(true)).toBe(1);
    expect(firestoreValueBytes({ q: 3, p: { x: 1 } })).toBe(2 + 8 + 2 + (2 + 8));
  });

  it('SYNC-123 an empty collection document is small; tracked cards add their stamped values', () => {
    const log = emptySyncLog();
    const empty = collectionDocBytes(null, log);
    expect(empty).toBeLessThan(200);
    log.cards['hextech ray'] = { t: 1, deleted: false, h: 'x' };
    const one = collectionDocBytes(
      { schemaVersion: 1, catalogVersion: '', updatedAt: '', cards: { 'hextech ray': { quantity: 3, byPrinting: {} } } } as StoredCollection,
      log,
    );
    expect(one - empty).toBe(12 + (2 + 8) + (2 + 8) + 2);
  });
});

describe('SYNC-123 SyncEngine collection size warning', () => {
  let db: FakeFirestore;
  beforeEach(() => {
    db = new FakeFirestore();
    db.serverTime = T0;
  });

  it('SYNC-123 a push leaving the collection document over 700 KB logs one warning, no notice; the push still goes', async () => {
    const d = new Device(db);
    await signIn(d);
    const c = await d.collection();
    await d.stores.collection.save({ ...c, updatedAt: new Date(d.now).toISOString(), cards: bigCards(5000) });
    await d.engine.flush();
    expect(d.warnings).toHaveLength(1);
    expect(d.warnings[0]).toMatch(/^Rift Builder sync: the collection document is about \d+ KB, over the 700 KB budget/);
    expect(d.warnings[0]).not.toContain('uA');
    expect(d.notices.filter((n) => /KB/.test(n))).toEqual([]);
    expect(Object.keys(db.get('users/uA/state/collection').cards)).toHaveLength(5000);

    await d.setCard('sample card number 0001', 2);
    await d.engine.flush();
    expect(d.warnings).toHaveLength(1); // once per page load
  });

  it('SYNC-123 a collection under 700 KB logs nothing', async () => {
    const d = new Device(db);
    await signIn(d);
    const c = await d.collection();
    await d.stores.collection.save({ ...c, updatedAt: new Date(d.now).toISOString(), cards: bigCards(500) });
    await d.engine.flush();
    expect(d.warnings).toEqual([]);
  });

  it('SYNC-123 the warning text states the size in KB', () => {
    expect(collectionSizeWarning(COLLECTION_WARN_BYTES + 10 * 1024)).toContain('about 710 KB');
  });
});
