import type { BrowserStores } from '../storage/browser-stores';
import type { SampleData } from '../../shared/collection/sample-data';
import {
  TEST_SETS,
  TestSetId,
  canLoadTestData,
  planTestLoad,
  planTestRemove,
} from '../../shared/collection/test-data';

/** The tracked (stamping) stores only: test data syncs like any user save (TEST-020), never `stores.raw`. */
export type TestDataStores = Pick<BrowserStores, 'collection' | 'decks' | 'locks'>;

/** Loads the generator on demand, so it stays out of the main bundle (TEST-024). */
export async function generateTestSet(entries: number): Promise<SampleData> {
  const { generateLargeSample } = await import('../../shared/collection/sample-data');
  return generateLargeSample(entries);
}

const iso = (ms: number) => new Date(ms).toISOString();

/**
 * SPEC-013 TEST-020…023, TEST-012: writes the test set through the tracked stores. Returns 'real-cards' and writes
 * nothing when the collection holds real cards at write time. Order: the three test decks (by id, own decks kept),
 * then the collection as one replacement (`replace`: one `set()`, SYNC-014), then the locks (own locks kept, the two
 * test locks added). Throws if a store write fails (the caller shows TEST-023's error).
 */
export async function loadTestData(
  stores: TestDataStores,
  set: TestSetId,
  now: () => number,
  generate: (entries: number) => Promise<SampleData> = generateTestSet,
): Promise<'ok' | 'real-cards'> {
  if (!canLoadTestData(await stores.collection.load())) return 'real-cards';
  const entries = TEST_SETS[set];
  const sample = await generate(entries);
  const plan = planTestLoad(sample, entries, await stores.locks.load(), iso(now()));
  // Re-check after the (async) generator: another device's import may have been pulled meanwhile (TEST-012).
  if (!canLoadTestData(await stores.collection.load())) return 'real-cards';

  for (const deck of plan.decks) {
    if (!(await stores.decks.get(deck.id))) {
      // A create inside a just-removed deck's 10 s Undo window is taken as an Undo and is not stamped (SYNC-035),
      // so it is always followed by the update below, which stamps the new content for the push.
      await stores.decks.create(deck);
    }
    for (let attempt = 0; attempt < 2; attempt++) {
      const stored = await stores.decks.get(deck.id);
      if (!stored) throw new Error(`test deck ${deck.id} missing`);
      if ((await stores.decks.update({ ...deck, createdAt: stored.createdAt }, stored.updatedAt)) === 'ok') break;
    }
  }
  await stores.collection.save(plan.collection, { replace: true });
  await stores.locks.save(plan.locks);
  return 'ok';
}

/**
 * SPEC-013 TEST-050 / TEST-051: removes only the test cards (one collection write with `catalogVersion ""` and a
 * tombstone per card), the test decks (soft-deleted, pushed after the Undo window) and their locks. Own decks, own
 * locks and tags are not touched. Locks go first so no lock ever points at a deleted deck (SHARE-062).
 */
export async function removeTestData(stores: TestDataStores, now: () => number): Promise<void> {
  await removeTest(stores, now, true);
}

/**
 * SPEC-013 TEST-033 / TEST-034: the part of a Replace import that ends the test state. The import writes the new
 * collection itself; this removes the test decks and their locks. The import commit (not built yet: imports can't
 * save, SPEC-003) must call it in the same commit as its Replace.
 */
export async function removeTestDecks(stores: TestDataStores, now: () => number): Promise<void> {
  await removeTest(stores, now, false);
}

async function removeTest(stores: TestDataStores, now: () => number, removeCollection: boolean): Promise<void> {
  const [collection, decks, locks] = await Promise.all([
    removeCollection ? stores.collection.load() : Promise.resolve(null),
    stores.decks.list(),
    stores.locks.load(),
  ]);
  const plan = planTestRemove(collection, decks, locks, iso(now()), { removeCollection });
  if (plan.locks) await stores.locks.save(plan.locks);
  for (const id of plan.deckIds) await stores.decks.delete(id);
  if (plan.collection) await stores.collection.save(plan.collection);
}
