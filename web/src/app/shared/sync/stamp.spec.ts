import type { StoredCollection, StoredDeckLocks, UserDeck } from '../storage/records';
import {
  cancelDeckDelete,
  nextStamp,
  reconcileCollection,
  reconcileDecks,
  stampCollection,
  stampDeckDelete,
  stampDeckSave,
  stampLocks,
} from './stamp';
import { canonicalJson, emptySyncLog, fnv1a } from './sync-log';

const coll = (updatedAt: string, cards: StoredCollection['cards']): StoredCollection => ({
  schemaVersion: 1,
  updatedAt,
  catalogVersion: 'cv',
  cards,
});
const deck = (updatedAt: string): UserDeck => ({
  schemaVersion: 1,
  id: '0b7c0000-0000-4000-8000-000000000001',
  name: 'Kennen Tempo',
  format: 'standard',
  source: { kind: 'user', text: null, url: null },
  sourceFormat: 'manual',
  notes: '',
  createdAt: '2026-11-23T09:00:00.000Z',
  updatedAt,
  catalogVersion: 'cv',
  legend: null,
  champion: null,
  main: [],
  sideboard: [],
  runes: [],
  battlefields: [],
});

describe('stamping (SPEC-010 SYNC-031, SYNC-032, SYNC-035, SYNC-062)', () => {
  it('SYNC-062 stamps are max(now, previous + 1)', () => {
    expect(nextStamp(900, 1000)).toBe(1001);
    expect(nextStamp(2000, 1000)).toBe(2000);
    expect(nextStamp(5, undefined)).toBe(5);
  });

  it('SYNC-031 only items that changed, appeared or disappeared are stamped and pending', () => {
    let log = stampCollection(emptySyncLog(), coll('a', { x: { quantity: 1, byPrinting: {} }, y: { quantity: 2, byPrinting: {} } }), 100);
    log.pending.cards = [];
    log = stampCollection(log, coll('b', { x: { quantity: 1, byPrinting: {} }, y: { quantity: 2, byPrinting: { p1: 1 } } }), 200);
    expect(log.cards['x'].t).toBe(100);
    expect(log.cards['y'].t).toBe(200);
    expect(log.pending.cards).toEqual(['y']);
    log = stampCollection(log, coll('c', { y: { quantity: 2, byPrinting: { p1: 1 } } }), 300);
    expect(log.cards['x']).toEqual({ t: 300, deleted: true, h: '' });
    expect(log.recordUpdatedAt.collection).toBe('c');
  });

  it('SYNC-031 a lock changes when added, removed or its lockedAt differs', () => {
    const l = (locks: StoredDeckLocks['locks']): StoredDeckLocks => ({ schemaVersion: 1, updatedAt: 'u', locks });
    let log = stampLocks(emptySyncLog(), l([{ deckId: 'd', lockedAt: 'A' }]), 10);
    log.pending.locks = [];
    log = stampLocks(log, l([{ deckId: 'd', lockedAt: 'A' }]), 20);
    expect(log.pending.locks).toEqual([]);
    log = stampLocks(log, l([{ deckId: 'd', lockedAt: 'B' }]), 30);
    expect(log.locks['d']).toEqual({ t: 30, unlocked: false, h: 'B' });
    log = stampLocks(log, l([]), 25);
    expect(log.locks['d']).toEqual({ t: 31, unlocked: true, h: '' });
  });

  it('SYNC-032 reconcile stamps only what differs from the hashes, with the record’s updatedAt; unchanged record → no-op', () => {
    const t1 = '2026-11-23T10:00:00.000Z';
    const t2 = '2026-11-23T11:00:00.000Z';
    const log = stampCollection(emptySyncLog(), coll(t1, { x: { quantity: 1, byPrinting: {} }, y: { quantity: 1, byPrinting: {} } }), 100);
    expect(reconcileCollection(log, coll(t1, {}))).toBe(log);
    const after = reconcileCollection(log, coll(t2, { x: { quantity: 1, byPrinting: {} }, y: { quantity: 4, byPrinting: {} } }));
    expect(after.cards['x'].t).toBe(100);
    expect(after.cards['y'].t).toBe(Date.parse(t2));
    expect(reconcileCollection(emptySyncLog(), null).cards).toEqual({}); // SYNC-033: missing → no tombstones
  });

  it('SYNC-032 a record saved before the sync log has every item stamped once with its updatedAt', () => {
    const t = '2026-11-01T00:00:00.000Z';
    const log = reconcileCollection(emptySyncLog(), coll(t, { a: { quantity: 1, byPrinting: {} }, b: { quantity: 2, byPrinting: {} } }));
    expect(Object.values(log.cards).map((e) => e.t)).toEqual([Date.parse(t), Date.parse(t)]);
    expect(log.pending.cards).toEqual(['a', 'b']);
  });

  it('SYNC-031 deck saves and deletes are monotonic on a lagging clock (AC 24)', () => {
    const noon = Date.parse('2026-11-23T12:00:00.000Z');
    const pulled = deck('2026-11-23T12:00:00.000Z');
    const log = emptySyncLog();
    log.knownDecks[pulled.id] = noon;
    const saved = stampDeckSave(log, { ...pulled, name: 'Renamed' }, pulled, Date.parse('2026-11-23T11:52:00.000Z'));
    expect(saved.deck.updatedAt).toBe('2026-11-23T12:00:00.001Z');
    const del = stampDeckDelete(saved.log, saved.deck, Date.parse('2026-11-23T11:53:00.000Z'));
    expect(del.deckTombstones[pulled.id].deletedAt).toBe(noon + 2);
    expect(del.pending.decks).toEqual([pulled.id]);
  });

  it('SYNC-035 Undo inside the window cancels the tombstone; after the window it does not', () => {
    const d = deck('2026-11-23T12:00:00.000Z');
    const log = emptySyncLog();
    log.knownDecks[d.id] = Date.parse(d.updatedAt);
    const del = stampDeckDelete(log, d, 1_000);
    const undone = cancelDeckDelete(del, d, 5_000)!;
    expect(undone.deckTombstones).toEqual({});
    expect(undone.pending.decks).toEqual([]);
    expect(undone.knownDecks[d.id]).toBe(Date.parse(d.updatedAt));
    expect(cancelDeckDelete(del, d, 11_000)).toBeNull();
  });

  it('SYNC-032 a known deck missing from the store is tombstoned; an unreadable one never is', () => {
    const log = emptySyncLog();
    log.knownDecks['a'] = 10;
    log.knownDecks['b'] = 10;
    const r = reconcileDecks(log, [], ['b'], 50);
    expect(Object.keys(r.deckTombstones)).toEqual(['a']);
    expect(r.pending.decks).toEqual(['a']);
  });

  it('SYNC-018 a reconciled deck tombstone carries the deck createdAt, not its last updatedAt', () => {
    const d = deck('2026-11-23T12:00:00.000Z');
    let log = reconcileDecks(emptySyncLog(), [d], [], 100);
    expect(log.deckCreated![d.id]).toBe(Date.parse(d.createdAt));
    log = reconcileDecks(log, [], [], 200);
    expect(log.deckTombstones[d.id].createdAt).toBe(Date.parse('2026-11-23T09:00:00.000Z'));
  });

  it('SYNC-032 value hash: FNV-1a of canonical JSON is key-order independent', () => {
    expect(canonicalJson({ b: 1, a: [2, { d: 1, c: 2 }] })).toBe('{"a":[2,{"c":2,"d":1}],"b":1}');
    expect(fnv1a('')).toBe('811c9dc5');
    expect(fnv1a('a')).toBe('e40c292c');
  });
});
