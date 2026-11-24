import type { StoredCollection, StoredDeckLocks, StoredTags, UserDeck } from '../storage/records';
import { LocalSnapshot, MergeInput, deckToDoc, mergePulled } from './merge';
import { emptySyncLog, hashCard } from './sync-log';
import type { CollectionDoc, DeckDoc, LocksDoc, StoredSyncLog, TagsDoc } from './sync-types';

const NOW = 1_000_000;
const coll = (cards: StoredCollection['cards']): StoredCollection => ({
  schemaVersion: 1,
  updatedAt: '2026-11-23T00:00:00.000Z',
  catalogVersion: 'cv',
  cards,
});
const cdoc = (cards: CollectionDoc['cards']): CollectionDoc => ({
  schemaVersion: 1,
  updatedAt: 1,
  syncedAt: 1,
  catalogVersion: 'cv',
  cards,
});
const local = (over: Partial<LocalSnapshot> = {}): LocalSnapshot => ({
  collection: null,
  tags: null,
  locks: null,
  decks: [],
  unreadableDecks: [],
  ...over,
});
const withCards = (log: StoredSyncLog, cards: Record<string, [number, StoredCollection['cards'][string] | null]>) => {
  for (const [k, [t, v]] of Object.entries(cards)) log.cards[k] = { t, deleted: !v, h: v ? hashCard(v) : '' };
  return log;
};
const merge = (over: Partial<MergeInput>) =>
  mergePulled({
    local: local(),
    log: emptySyncLog(),
    pulled: { decks: {}, fullRead: false },
    mode: 'regular',
    absentMeansDeleted: true,
    now: NOW,
    ...over,
  });

const deck = (id: string, name: string, updatedAt: number, main = [{ cardKey: 'hextech ray', name: 'Hextech Ray', qty: 3 }]): UserDeck => ({
  schemaVersion: 1,
  id,
  name,
  format: 'standard',
  source: { kind: 'user', text: null, url: null },
  sourceFormat: 'manual',
  notes: '',
  createdAt: new Date(1000).toISOString(),
  updatedAt: new Date(updatedAt).toISOString(),
  catalogVersion: 'cv',
  legend: null,
  champion: null,
  main,
  sideboard: [],
  runes: [],
  battlefields: [],
});
const D1 = '0b7c0000-0000-4000-8000-000000000001';

describe('mergePulled (SPEC-010 sections E and F)', () => {
  it('SYNC-061 a tie goes to the cloud copy and nothing is pending (AC 7)', () => {
    const lr = { quantity: 2, byPrinting: {} };
    const log = withCards(emptySyncLog(), { 'lightning rush': [5000, lr] });
    log.pending.cards = ['lightning rush'];
    const r = merge({
      local: local({ collection: coll({ 'lightning rush': lr }) }),
      log,
      pulled: { collection: cdoc({ 'lightning rush': { q: 3, t: 5000, p: {} } }), decks: {}, fullRead: false },
    });
    expect(r.collection!.cards['lightning rush'].quantity).toBe(3);
    expect(r.log.pending.cards).toEqual([]);
  });

  it('SYNC-060 / SYNC-042 different cards both survive; a newer local card wins and stays pending', () => {
    const hr = { quantity: 4, byPrinting: {} };
    const log = withCards(emptySyncLog(), { 'hextech ray': [9000, hr] });
    const r = merge({
      local: local({ collection: coll({ 'hextech ray': hr }) }),
      log,
      pulled: {
        collection: cdoc({ 'hextech ray': { q: 2, t: 8000, p: {} }, 'lightning rush': { q: 3, t: 8500, p: {} } }),
        decks: {},
        fullRead: false,
      },
    });
    expect(r.collection!.cards).toEqual({ 'hextech ray': hr, 'lightning rush': { quantity: 3, byPrinting: {} } });
    expect(r.log.pending.cards).toEqual(['hextech ray']);
    expect(r.log.cards['lightning rush'].t).toBe(8500);
  });

  it('SYNC-060 a card is one item: quantity and byPrinting win together (Σ p ≤ q holds)', () => {
    const mine = { quantity: 5, byPrinting: { 'OGN-001a': 5 } };
    const log = withCards(emptySyncLog(), { 'hextech ray': [1000, mine] });
    const r = merge({
      local: local({ collection: coll({ 'hextech ray': mine }) }),
      log,
      pulled: { collection: cdoc({ 'hextech ray': { q: 2, t: 2000, p: { 'OGN-001b': 1 } } }), decks: {}, fullRead: false },
    });
    expect(r.collection!.cards['hextech ray']).toEqual({ quantity: 2, byPrinting: { 'OGN-001b': 1 } });
  });

  it('SYNC-044 absent means deleted only after a first sync; pending items are kept', () => {
    const a = { quantity: 1, byPrinting: {} };
    const log = withCards(emptySyncLog(), { gone: [100, a], mine: [200, a] });
    log.pending.cards = ['mine'];
    const input = {
      local: local({ collection: coll({ gone: a, mine: a }) }),
      log,
      pulled: { collection: cdoc({}), decks: {}, fullRead: false },
    };
    expect(Object.keys(merge(input).collection!.cards)).toEqual(['mine']);
    expect(merge({ ...input, absentMeansDeleted: false }).collection).toBeUndefined();
  });

  it('SYNC-047 an invalid item is skipped and flagged; a valid one beside it is merged (AC 30)', () => {
    const r = merge({
      local: local({ collection: coll({ 'hextech ray': { quantity: 3, byPrinting: {} } }) }),
      log: withCards(emptySyncLog(), { 'hextech ray': [10, { quantity: 3, byPrinting: {} }] }),
      pulled: {
        collection: cdoc({
          'hextech ray': { q: 2, t: 5000, p: { 'OGN-001a': 3 } },
          'lightning rush': { q: 1, t: 5000, p: {} },
        }),
        decks: {},
        fullRead: false,
      },
    });
    expect(r.invalid).toBe(true);
    expect(r.collection!.cards['hextech ray'].quantity).toBe(3);
    expect(r.collection!.cards['lightning rush'].quantity).toBe(1);
    expect(r.log.pending.cards).toEqual([]);
  });

  it('SYNC-046 a newer collection schema is not merged and is reported read-only', () => {
    const r = merge({ pulled: { collection: { ...cdoc({ x: { q: 1, t: 1, p: {} } }), schemaVersion: 2 }, decks: {}, fullRead: false } });
    expect(r.collection).toBeUndefined();
    expect(r.newerSchema).toEqual(['collection']);
  });

  it('SYNC-033 an unreadable local area is not merged', () => {
    const r = merge({
      local: local({ collection: 'unreadable' }),
      pulled: { collection: cdoc({ x: { q: 1, t: 1, p: {} } }), decks: {}, fullRead: false },
    });
    expect(r.collection).toBeUndefined();
    expect(r.log.cards).toEqual({});
  });

  describe('tags', () => {
    const tags = (list: StoredTags['tags'], assignments: StoredTags['assignments'] = {}): StoredTags => ({
      schemaVersion: 3,
      updatedAt: 'x',
      tags: list,
      assignments,
    });
    const tag = (id: string, label: string, createdAt: number) => ({
      id,
      label,
      key: label.toLowerCase(),
      colour: null,
      excludeFromDecks: false,
      createdAt: new Date(createdAt).toISOString(),
    });
    const tdoc = (t: TagsDoc['tags'], a: TagsDoc['assignments']): TagsDoc => ({
      schemaVersion: 1,
      updatedAt: 1,
      syncedAt: 1,
      tags: t,
      assignments: a,
    });

    it('SYNC-064 Combine unions each list (cloud first) and stamps it later than the cloud', () => {
      const r = merge({
        mode: 'combine',
        absentMeansDeleted: false,
        local: local({ tags: tags([tag('t_Trad01', 'Trade Binder', 100)], { 'p:OGN-001a': ['t_Trad01'] }) }),
        pulled: {
          tags: tdoc(
            { t_Coll01: { label: 'Collector', key: 'collector', colour: null, excludeFromDecks: true, createdAt: 50, updatedAt: 60 } },
            { 'p:OGN-001a': { a: ['t_Coll01'], t: 70 } },
          ),
          decks: {},
          fullRead: true,
        },
      });
      expect(r.tags!.assignments['p:OGN-001a']).toEqual(['t_Coll01', 't_Trad01']);
      expect(r.log.assignments['p:OGN-001a'].t).toBeGreaterThan(70);
      expect(r.log.pending.assignments).toEqual(['p:OGN-001a']);
    });

    it('SYNC-065 same key: the earlier tag is kept, assignments move, the other becomes a pending tombstone (AC 14)', () => {
      const r = merge({
        local: local({ tags: tags([tag('t_Z9y8x7', 'trade binder', 2000)], { 'p:OGN-002a': ['t_Z9y8x7'] }) }),
        log: (() => {
          const l = emptySyncLog();
          l.tags['t_Z9y8x7'] = { t: 2000, deleted: false, h: 'x' };
          l.assignments['p:OGN-002a'] = { t: 2000, deleted: false, h: 'y' };
          l.pending.tags = ['t_Z9y8x7'];
          l.pending.assignments = ['p:OGN-002a'];
          return l;
        })(),
        pulled: {
          tags: tdoc(
            { t_a1B2c3: { label: 'Trade Binder', key: 'trade binder', colour: null, excludeFromDecks: false, createdAt: 1000, updatedAt: 1000 } },
            { 'p:OGN-001a': { a: ['t_a1B2c3'], t: 1000 } },
          ),
          decks: {},
          fullRead: false,
        },
      });
      expect(r.tags!.tags.map((t) => t.id)).toEqual(['t_a1B2c3']);
      expect(r.tags!.assignments['p:OGN-002a']).toEqual(['t_a1B2c3']);
      expect(r.log.tags['t_Z9y8x7'].deleted).toBe(true);
      expect(r.log.pending.tags).toContain('t_Z9y8x7');
      expect(r.log.pending.assignments).toContain('p:OGN-002a');
      expect(r.log.assignments['p:OGN-002a'].t).toBeGreaterThan(2000);
    });

    it('SYNC-066 ids of deleted or unknown tags are removed from every list', () => {
      const r = merge({
        local: local({ tags: tags([tag('t_Keep01', 'Keep', 1)], { 'u:x': ['t_Keep01', 't_Gone01'] }) }),
        log: (() => {
          const l = emptySyncLog();
          l.tags['t_Keep01'] = { t: 1, deleted: false, h: 'h' };
          l.tags['t_Gone01'] = { t: 1, deleted: false, h: 'h' };
          return l;
        })(),
        pulled: { tags: tdoc({ t_Gone01: { deleted: true, updatedAt: 5 }, t_Keep01: { label: 'Keep', key: 'keep', colour: null, excludeFromDecks: false, createdAt: 1, updatedAt: 1 } }, {}), decks: {}, fullRead: false },
        absentMeansDeleted: false,
      });
      expect(r.tags!.assignments['u:x']).toEqual(['t_Keep01']);
      expect(r.log.pending.assignments).toEqual(['u:x']);
    });
  });

  describe('decks and locks', () => {
    const ldoc = (locks: LocksDoc['locks']): LocksDoc => ({ schemaVersion: 1, updatedAt: 1, syncedAt: 1, locks });
    const locks = (ids: [string, number][]): StoredDeckLocks => ({
      schemaVersion: 1,
      updatedAt: 'x',
      locks: ids.map(([deckId, t]) => ({ deckId, lockedAt: new Date(t).toISOString() })),
    });

    it('SYNC-071 a lock on a deck deleted elsewhere is dropped and becomes a pending unlock tombstone (AC 11)', () => {
      const log = emptySyncLog();
      log.knownDecks[D1] = 500;
      log.locks[D1] = { t: 600, unlocked: false, h: new Date(600).toISOString() };
      const tomb: DeckDoc = { schemaVersion: 1, createdAt: 100, updatedAt: 900, deletedAt: 900, syncedAt: 2 };
      const r = merge({
        local: local({ decks: [deck(D1, 'Kennen Tempo', 500)], locks: locks([[D1, 600]]) }),
        log,
        pulled: { decks: { [D1]: tomb }, fullRead: false },
      });
      expect(r.decksDelete).toEqual([D1]);
      expect(r.locks!.locks).toEqual([]);
      expect(r.log.locks[D1]).toMatchObject({ unlocked: true });
      expect(r.log.pending.locks).toEqual([D1]);
    });

    it('SYNC-072 a locked deck changed elsewhere keeps its lock and raises the notice (AC 12)', () => {
      const log = emptySyncLog();
      log.locks[D1] = { t: 600, unlocked: false, h: new Date(600).toISOString() };
      const changed = deckToDoc(deck(D1, 'Kennen Tempo', 700, [{ cardKey: 'hextech ray', name: 'Hextech Ray', qty: 4 }]));
      const r = merge({
        local: local({ decks: [deck(D1, 'Kennen Tempo', 500)], locks: locks([[D1, 600]]) }),
        log,
        pulled: { decks: { [D1]: changed }, fullRead: false },
      });
      expect(r.decksPut[0].main[0].qty).toBe(4);
      expect(r.locks).toBeUndefined();
      expect(r.notices).toEqual(["'Kennen Tempo' changed on another device while it was locked."]);
    });

    it('SYNC-073 the later of lock and unlock wins', () => {
      const log = emptySyncLog();
      log.locks[D1] = { t: 1000, unlocked: false, h: new Date(1000).toISOString() };
      const r = merge({
        local: local({ decks: [deck(D1, 'K', 1)], locks: locks([[D1, 1000]]) }),
        log,
        pulled: { locks: ldoc({ [D1]: { lockedAt: null, updatedAt: 1500 } }), decks: {}, fullRead: false },
      });
      expect(r.locks!.locks).toEqual([]);
      const r2 = merge({
        local: local({ decks: [deck(D1, 'K', 1)], locks: locks([[D1, 1000]]) }),
        log,
        pulled: { locks: ldoc({ [D1]: { lockedAt: null, updatedAt: 900 } }), decks: {}, fullRead: false },
      });
      expect(r2.locks).toBeUndefined();
      expect(r2.log.pending.locks).toEqual([D1]);
    });

    it('SYNC-075 a merge never creates a lock the cloud does not hold', () => {
      const r = merge({
        local: local({ decks: [deck(D1, 'K', 1)] }),
        pulled: { decks: { [D1]: deckToDoc(deck(D1, 'K', 2)) }, fullRead: true },
      });
      expect(r.locks).toBeUndefined();
    });

    it('SYNC-044 a full read removes a local deck missing from the cloud unless it is pending', () => {
      const log = emptySyncLog();
      log.knownDecks[D1] = 1;
      const r = merge({ local: local({ decks: [deck(D1, 'K', 1)] }), log, pulled: { decks: {}, fullRead: true } });
      expect(r.decksDelete).toEqual([D1]);
      log.pending.decks = [D1];
      expect(merge({ local: local({ decks: [deck(D1, 'K', 1)] }), log, pulled: { decks: {}, fullRead: true } }).decksDelete).toEqual([]);
    });

    it('SYNC-041 merge writes keep the pulled times and leave nothing pending (AC 34)', () => {
      const r = merge({
        pulled: {
          collection: cdoc({ 'hextech ray': { q: 4, t: 1205, p: {} } }),
          decks: { [D1]: deckToDoc(deck(D1, 'Kennen Tempo', 1206)) },
          fullRead: false,
        },
      });
      expect(r.log.cards['hextech ray'].t).toBe(1205);
      expect(r.log.knownDecks[D1]).toBe(1206);
      expect(r.decksPut[0].updatedAt).toBe(new Date(1206).toISOString());
      expect(r.log.pending).toMatchObject({ cards: [], decks: [], tags: [], assignments: [], locks: [] });
      expect(r.log.recordUpdatedAt.collection).toBe(r.collection!.updatedAt);
    });
  });
});
