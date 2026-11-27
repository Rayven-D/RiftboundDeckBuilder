import { generateLargeSample, sampleDeck, sampleDeckId } from './sample-data';
import {
  TEST_DECK_IDS,
  canLoadTestData,
  isTestCollection,
  isTestDeck,
  planTestLoad,
  planTestRemove,
  testEntries,
  testMarker,
} from './test-data';
import type { StoredCollection, StoredDeckLocks } from '../storage/records';

const NOW = '2026-11-25T12:00:00.000Z';
const coll = (catalogVersion: string, cards: StoredCollection['cards'] = { 'x 1': { quantity: 1, byPrinting: {} } }) =>
  ({ schemaVersion: 1, updatedAt: NOW, catalogVersion, cards }) as StoredCollection;

describe('SPEC-013 test data rules (H-205)', () => {
  it('TEST-030 / AC 10a a collection is test data iff it has a card and the test-data- prefix; empty is never test data', () => {
    expect(isTestCollection(coll('test-data-5000'))).toBe(true);
    expect(isTestCollection(coll('test-data-5000', {}))).toBe(false);
    expect(isTestCollection(coll('', {}))).toBe(false);
    expect(isTestCollection(coll('0.2+2026-11-20T18:04:00Z'))).toBe(false);
    expect(isTestCollection(null)).toBe(false);
    expect(testEntries('test-data-150')).toBe(150);
    expect(testEntries('test-data-0')).toBeNull();
    expect(testEntries('test-data-x')).toBeNull();
    expect(testEntries('generated')).toBeNull();
    expect(testMarker(5000)).toBe('test-data-5000');
  });

  it('TEST-030 a test deck has a reserved id and the marker; the dev tool’s sample deck (catalogVersion "sample") is not one', () => {
    expect(TEST_DECK_IDS).toEqual([1, 2, 3].map(sampleDeckId));
    const d = sampleDeck(1, 'A', []);
    expect(isTestDeck(d)).toBe(false);
    expect(isTestDeck({ ...d, catalogVersion: 'test-data-150' })).toBe(true);
    expect(isTestDeck({ ...d, id: sampleDeckId(4), catalogVersion: 'test-data-150' })).toBe(false);
  });

  it('TEST-012 Load is allowed on no collection, an empty one or test data, never over real cards', () => {
    expect(canLoadTestData(null)).toBe(true);
    expect(canLoadTestData(coll('0.2', {}))).toBe(true);
    expect(canLoadTestData(coll('test-data-150'))).toBe(true);
    expect(canLoadTestData(coll('0.2'))).toBe(false);
  });

  it('TEST-020 / TEST-021 the Load plan marks the collection and decks test-data-<n> and adds the two test locks to the own locks', () => {
    const sample = generateLargeSample(150);
    const own: StoredDeckLocks = {
      schemaVersion: 2,
      updatedAt: NOW,
      locks: [
        { deckId: 'aaaaaaaa-0000-4000-8000-000000000001', cardKey: 'gust', lockedAt: NOW },
        { deckId: TEST_DECK_IDS[2], cardKey: 'gust', lockedAt: NOW }, // a stale lock on a test id is replaced
      ],
    };
    const plan = planTestLoad(sample, 150, own, NOW);
    expect(plan.collection.catalogVersion).toBe('test-data-150');
    expect(plan.collection.updatedAt).toBe(NOW);
    expect(plan.collection.cards).toEqual(sample.collection.cards);
    expect(plan.decks.map((d) => [d.id, d.name, d.catalogVersion])).toEqual([
      [TEST_DECK_IDS[0], 'Generated Locked A', 'test-data-150'],
      [TEST_DECK_IDS[1], 'Generated Locked B', 'test-data-150'],
      [TEST_DECK_IDS[2], 'Generated Open', 'test-data-150'],
    ]);
    // TEST-021 v0.1.5: one NameLock per counted name of each locked test deck, one lockedAt per deck, schemaVersion 2.
    expect(plan.locks.schemaVersion).toBe(2);
    expect([...new Set(plan.locks.locks.map((l) => l.deckId))]).toEqual([
      'aaaaaaaa-0000-4000-8000-000000000001',
      TEST_DECK_IDS[0],
      TEST_DECK_IDS[1],
    ]);
    for (const d of plan.decks.slice(0, 2)) {
      const names = new Set([d.legend, d.champion, ...d.main, ...d.battlefields, ...d.runes, ...d.sideboard].filter((c) => c).map((c) => c!.cardKey));
      const locked = plan.locks.locks.filter((l) => l.deckId === d.id);
      expect(new Set(locked.map((l) => l.cardKey))).toEqual(names);
      expect(new Set(locked.map((l) => l.lockedAt)).size).toBe(1);
    }
    expect(plan.locks.locks.some((l) => l.deckId === TEST_DECK_IDS[2])).toBe(false);
    // the generator itself is untouched (the dev tool keeps its values)
    expect(sample.collection.catalogVersion).toBe('generated');
    expect(sample.decks[0].catalogVersion).toBe('sample');
  });

  it('TEST-050 the Remove plan empties the collection with catalogVersion "" and removes only test decks and their locks', () => {
    const sample = generateLargeSample(150);
    const plan = planTestLoad(sample, 150, null, NOW);
    const own = sampleDeck(9, 'Mine', []);
    own.id = 'bbbbbbbb-0000-4000-8000-000000000001';
    const devDeck = sampleDeck(3, 'Dev sample', []); // reserved id, no marker: not ours to remove
    const locks: StoredDeckLocks = {
      ...plan.locks,
      locks: [...plan.locks.locks, { deckId: own.id, cardKey: 'gust', lockedAt: NOW }],
    };
    const r = planTestRemove(plan.collection, [...plan.decks.slice(0, 2), own, devDeck], locks, NOW);
    expect(r.collection).toEqual({ ...plan.collection, catalogVersion: '', cards: {} });
    expect(r.deckIds).toEqual([TEST_DECK_IDS[0], TEST_DECK_IDS[1]]);
    expect([...new Set(r.locks?.locks.map((l) => l.deckId))]).toEqual([own.id]);
  });

  it('TEST-033 / TEST-034 the Replace-import plan leaves the collection alone; a stray test deck under real cards is removed', () => {
    const plan = planTestLoad(generateLargeSample(150), 150, null, NOW);
    const r = planTestRemove(coll('0.2'), plan.decks, plan.locks, NOW, { removeCollection: false });
    expect(r.collection).toBeNull();
    expect(r.deckIds).toEqual([...TEST_DECK_IDS]);
    expect(r.locks?.locks).toEqual([]);
    expect(planTestRemove(coll('0.2'), plan.decks, null, NOW).deckIds).toEqual([...TEST_DECK_IDS]);
  });

  it('TEST-011 / AC 15 the generated cards are clearly fake: numbered names, Generated sets GNA…GNF, invented placeholder art only', () => {
    const { catalog } = generateLargeSample(5000);
    const cards = Object.values(catalog.cards);
    expect(cards).toHaveLength(1667);
    for (const c of cards) expect(c.name).toMatch(/ \d+$/);
    expect(catalog.sets.map((s) => [s.code, s.name])).toEqual([1, 2, 3, 4, 5, 6].map((i) => [`GN${'ABCDEF'[i - 1]}`, `Generated ${i}`]));
    for (const p of Object.values(catalog.printings)) {
      expect(p.art.thumbnailUrl).toMatch(/^\/fixture-cards\/[A-Z]{3}-\d{3}\.svg$/);
      expect(p.art.fullUrl).toBe(p.art.thumbnailUrl);
    }
  });
});
