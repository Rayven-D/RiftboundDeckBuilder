import type { StoredCollection, StoredTags, UserDeck } from '../storage/records';
import type { LocalSnapshot } from './merge';
import { MAP_CAPS, applyPushSuccess, planAccountPush, planPush } from './push-plan';
import { DAY_MS, emptySyncLog, hashCard } from './sync-log';

const NOW = Date.UTC(2026, 11, 2);
const D1 = '0b7c0000-0000-4000-8000-000000000001';
const snap = (over: Partial<LocalSnapshot> = {}): LocalSnapshot => ({
  collection: null,
  tags: null,
  locks: null,
  decks: [],
  unreadableDecks: [],
  ...over,
});
const coll = (cards: StoredCollection['cards']): StoredCollection => ({
  schemaVersion: 1,
  updatedAt: 'x',
  catalogVersion: 'cv',
  cards,
});
const deck = (id: string): UserDeck => ({
  schemaVersion: 1,
  id,
  name: 'Kennen Tempo',
  format: 'standard',
  source: { kind: 'user', text: null, url: null },
  sourceFormat: 'manual',
  notes: '',
  createdAt: new Date(1000).toISOString(),
  updatedAt: new Date(2000).toISOString(),
  catalogVersion: 'cv',
  legend: null,
  champion: null,
  main: [],
  sideboard: [],
  runes: [],
  battlefields: [],
});

describe('planPush (SPEC-010 SYNC-043)', () => {
  it('SYNC-014 a change to some cards is an update carrying only those cards, replaced whole', () => {
    const hr = { quantity: 3, byPrinting: { 'OGN-001a': 1 } };
    const log = emptySyncLog();
    log.cloudDocs = ['collection'];
    log.cards['hextech ray'] = { t: NOW - 5, deleted: false, h: hashCard(hr) };
    log.cards['other'] = { t: 10, deleted: false, h: 'x' };
    log.pending.cards = ['hextech ray'];
    const plan = planPush(snap({ collection: coll({ 'hextech ray': hr, other: hr }) }), log, { now: NOW, readOnly: [] });
    expect(plan.changes.collection).toMatchObject({
      replace: false,
      cards: { 'hextech ray': { q: 3, t: NOW - 5, p: { 'OGN-001a': 1 } } },
      updatedAt: NOW - 5,
    });
  });

  it('SYNC-014 a Replace import is a set() of every card plus tombstones (AC 9)', () => {
    const log = emptySyncLog();
    log.cloudDocs = ['collection'];
    log.cards['hextech ray'] = { t: NOW, deleted: false, h: 'x' };
    log.cards['lightning rush'] = { t: NOW, deleted: true, h: '' };
    log.pending.cards = ['hextech ray', 'lightning rush'];
    log.pending.collectionReplace = true;
    const plan = planPush(snap({ collection: coll({ 'hextech ray': { quantity: 3, byPrinting: {} } }) }), log, {
      now: NOW,
      readOnly: [],
    });
    expect(plan.changes.collection!.replace).toBe(true);
    expect(plan.changes.collection!.cards['lightning rush']).toEqual({ q: 0, t: NOW, p: {} });
  });

  it('SYNC-034 a tombstone older than 30 days is purged in the next write of its document (AC 8)', () => {
    const log = emptySyncLog();
    log.cloudDocs = ['collection'];
    log.cards['lightning rush'] = { t: NOW - 31 * DAY_MS, deleted: true, h: '' };
    log.cards['hextech ray'] = { t: NOW, deleted: false, h: 'x' };
    log.pending.cards = ['hextech ray'];
    const plan = planPush(snap({ collection: coll({ 'hextech ray': { quantity: 5, byPrinting: {} } }) }), log, {
      now: NOW,
      readOnly: [],
    });
    expect(plan.changes.collection!.purge).toEqual(['lightning rush']);
    const after = applyPushSuccess(log, plan, { collection: 'ok' });
    expect(after.cards['lightning rush']).toBeUndefined();
    expect(after.pending.cards).toEqual([]);
  });

  it('SYNC-119 at the cap, the oldest tombstone is dropped in the same update (AC 33)', () => {
    const log = emptySyncLog();
    log.cloudDocs = ['tags'];
    const tags: StoredTags = { schemaVersion: 3, updatedAt: 'x', tags: [], assignments: {} };
    for (let i = 0; i < 199; i++) {
      const id = `t_L${String(i).padStart(5, '0')}`;
      log.tags[id] = { t: NOW - DAY_MS, deleted: false, h: 'h' };
      tags.tags.push({ id, label: id, key: id, colour: null, excludeFromDecks: false, createdAt: new Date(1).toISOString() });
    }
    for (let i = 0; i < 201; i++) log.tags[`t_D${String(i).padStart(5, '0')}`] = { t: NOW - DAY_MS - (201 - i), deleted: true, h: '' };
    log.tags['t_New001'] = { t: NOW, deleted: false, h: 'n' };
    tags.tags.push({ id: 't_New001', label: 'Trade Binder', key: 'trade binder', colour: null, excludeFromDecks: false, createdAt: new Date(NOW).toISOString() });
    log.pending.tags = ['t_New001'];
    const plan = planPush(snap({ tags }), log, { now: NOW, readOnly: [] });
    expect(plan.changes.tags!.purgeTags).toEqual(['t_D00000']);
    expect(Object.keys(plan.changes.tags!.tags)).toEqual(['t_New001']);
    expect(Object.keys(log.tags).length - plan.changes.tags!.purgeTags.length).toBe(MAP_CAPS.tags);
  });

  it('SYNC-119 / SYNC-124 live items above the cap are not sent', () => {
    const log = emptySyncLog();
    for (let i = 0; i <= MAP_CAPS.locks; i++) log.locks[`d${i}`] = { t: 1, unlocked: false, h: 'x' };
    log.pending.locks = ['d0'];
    log.cloudDocs = ['locks', 'deck:d0'];
    const plan = planPush(snap({ locks: { schemaVersion: 1, updatedAt: 'x', locks: [{ deckId: 'd0', lockedAt: 'x' }] } }), log, {
      now: NOW,
      readOnly: [],
    });
    expect(plan.tooLarge).toEqual(['locks']);
    expect(plan.changes.locks).toBeUndefined();
  });

  it('SYNC-035 a deck deletion inside the Undo window is held back, then sent as the tombstone only', () => {
    const log = emptySyncLog();
    log.deckTombstones[D1] = { deletedAt: NOW, pushAfter: NOW + 10_000, createdAt: 1000, wasPending: false };
    log.pending.decks = [D1];
    expect(planPush(snap(), log, { now: NOW + 4000, readOnly: [] }).changes.decks).toBeUndefined();
    const plan = planPush(snap(), log, { now: NOW + 10_000, readOnly: [] });
    expect(plan.changes.decks![D1]).toEqual({ schemaVersion: 1, createdAt: 1000, updatedAt: NOW, deletedAt: NOW, syncedAt: 0 });
  });

  it('SYNC-076 a lock is pushed only with or after its deck', () => {
    const log = emptySyncLog();
    log.cloudDocs = ['locks'];
    log.locks[D1] = { t: 5, unlocked: false, h: new Date(5).toISOString() };
    log.pending.locks = [D1];
    const locks = { schemaVersion: 1 as const, updatedAt: 'x', locks: [{ deckId: D1, lockedAt: new Date(5).toISOString() }] };
    expect(planPush(snap({ locks, decks: [deck(D1)] }), log, { now: NOW, readOnly: [] }).changes.locks).toBeUndefined();
    log.pending.decks = [D1];
    log.knownDecks[D1] = 2000;
    const plan = planPush(snap({ locks, decks: [deck(D1)] }), log, { now: NOW, readOnly: [] });
    expect(plan.changes.decks![D1]).toBeDefined();
    expect(plan.changes.locks!.locks[D1]).toEqual({ lockedAt: 5, updatedAt: 5 });
  });

  it('SYNC-118 / SYNC-033 / SYNC-046 rejected items, unreadable and read-only areas are not pushed', () => {
    const log = emptySyncLog();
    log.cards['a'] = { t: 1, deleted: false, h: 'x' };
    log.pending.cards = ['a'];
    log.pending.decks = [D1];
    log.knownDecks[D1] = 2000;
    log.rejected = [`decks:${D1}`];
    const c = coll({ a: { quantity: 1, byPrinting: {} } });
    expect(planPush(snap({ collection: c, decks: [deck(D1)] }), log, { now: NOW, readOnly: [] }).changes.decks).toBeUndefined();
    expect(planPush(snap({ collection: 'unreadable' }), log, { now: NOW, readOnly: [] }).changes.collection).toBeUndefined();
    expect(planPush(snap({ collection: c }), log, { now: NOW, readOnly: ['collection'] }).changes.collection).toBeUndefined();
  });

  it('SYNC-043 an item changed during the push stays pending after success', () => {
    const log = emptySyncLog();
    log.cards['a'] = { t: 1, deleted: false, h: 'x' };
    log.pending.cards = ['a'];
    const plan = planPush(snap({ collection: coll({ a: { quantity: 1, byPrinting: {} } }) }), log, { now: NOW, readOnly: [] });
    const changed = structuredClone(log);
    changed.cards['a'].t = 2;
    expect(applyPushSuccess(changed, plan, { collection: 'ok' }).pending.cards).toEqual(['a']);
    expect(applyPushSuccess(log, plan, { collection: 'ok' }).pending.cards).toEqual([]);
    expect(applyPushSuccess(log, plan, { collection: 'permission-denied' }).pending.cards).toEqual(['a']);
  });
  it('SYNC-050 planAccountPush sends the account only; on success the account is no longer pending and nothing else changes', () => {
    const account = { create: false, createdAt: 1, updatedAt: NOW, lastClientVersion: 'web-0.2.0' };
    const plan = planAccountPush(account);
    expect(plan.changes).toEqual({ account });
    expect(plan.empty).toBe(false);
    const log = emptySyncLog();
    log.pending.account = true;
    log.cards['a'] = { t: 1, deleted: false, h: 'x' };
    log.pending.cards = ['a'];
    const after = applyPushSuccess(log, plan, { account: 'ok' });
    expect(after.pending.account).toBe(false);
    expect(after.pending.cards).toEqual(['a']);
    expect(after.cloudDocs).toEqual([]);
  });

  it('SYNC-050 / SYNC-013 planPush sends pending items only: known but settled cards are not re-sent', () => {
    const log = emptySyncLog();
    log.cloudDocs = ['collection'];
    log.cards['a'] = { t: 1, deleted: false, h: 'x' };
    log.cards['b'] = { t: 2, deleted: false, h: 'y' };
    log.pending.cards = ['b'];
    const c = coll({ a: { quantity: 1, byPrinting: {} }, b: { quantity: 2, byPrinting: {} } });
    const plan = planPush(snap({ collection: c }), log, { now: NOW, readOnly: [] });
    expect(Object.keys(plan.changes)).toEqual(['collection']);
    expect(Object.keys(plan.changes.collection?.cards ?? {})).toEqual(['b']);
    expect(planPush(snap({ collection: c }), { ...log, pending: { ...log.pending, cards: [] } }, { now: NOW, readOnly: [] }).empty).toBe(true);
  });
});
