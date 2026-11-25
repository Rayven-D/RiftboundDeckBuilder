/**
 * SPEC-008 lock pieces (H-060): the pure lock-store functions and texts behind `app-lock-actions` (SHARE-020…023,
 * SHARE-029, SHARE-060…063).
 */
import { lock, makeCatalog, makeDeck } from '../../core/decks/engine-fixtures';
import type { DeckLockStore, StoredDeckLocks } from '../../core/decks';
import { MemoryBackend } from '../../core/storage/kv-backend';
import { createBrowserStores } from '../../core/storage/browser-stores';
import { STORAGE_KEYS } from '../../core/storage/local-stores';
import { buildDeckList } from './deck-list';
import {
  LOCK_TEXT,
  deckLockCheck,
  lockInTitle,
  lockedInNotice,
  otherDecksLine,
  readLocks,
  saveLock,
  saveUnlock,
  unlockedNotice,
  withLock,
  withoutLock,
} from './deck-locks';

const CATALOG = makeCatalog(['Hextech Ray', 'Gust']);
const deck = (id: string, name: string, n = 3) => makeDeck(id, name, { main: [['Hextech Ray', n]] });
const owned = (n: number) => ({
  collection: {
    schemaVersion: 1 as const,
    updatedAt: '2026-11-23T00:00:00Z',
    catalogVersion: '0.3+test',
    cards: { 'hextech ray': { quantity: n, byPrinting: {} } },
  },
  tags: { schemaVersion: 3 as const, updatedAt: '', tags: [], assignments: {} },
  printingCodes: { schemaVersion: 1 as const, updatedAt: '', codes: {} },
});

describe('SPEC-008 lock texts (SHARE-021, SHARE-029, SHARE-061, SHARE-063)', () => {
  it('SHARE-021 / SHARE-029 confirmation and snack bar texts, word for word', () => {
    expect(lockInTitle('Kennen Tempo')).toBe("Lock in 'Kennen Tempo'?");
    expect(LOCK_TEXT.confirmBody).toBe("Its cards won't count toward your other decks until you unlock or delete it.");
    expect(lockedInNotice('Kennen Tempo')).toBe('Kennen Tempo is locked in.');
    expect(unlockedNotice('Kennen Tempo')).toBe('Kennen Tempo is unlocked. Its cards count toward your other decks again.');
    expect(LOCK_TEXT.lockingIn).toBe('Locking in…');
    expect(LOCK_TEXT.saveFailed).toBe("Couldn't save the lock. Try again.");
    expect(LOCK_TEXT.locksUnreadable).toBe('Locked decks could not be read; counts ignore locks.');
  });

  it('SHARE-021 other decks line: unique names in order, 3 at most then "and r more"; none → null', () => {
    const decks = ['Kennen Tempo', 'Jinx Aggro', 'Draven Midrange', 'Ezreal', 'Ahri'].map((n, i) => deck(`d${i}`, n));
    const model = buildDeckList({
      decks,
      locks: [],
      collection: owned(3),
      catalog: CATALOG,
      banData: null,
      today: '2026-11-25',
      format: null,
    });
    const view = model.entries[0].view;
    expect(otherDecksLine(view)).toBe('4 other decks use some of these cards: Ahri, Draven Midrange, Ezreal and 1 more');
    const two = buildDeckList({ ...{ decks: decks.slice(0, 2) }, locks: [], collection: owned(3), catalog: CATALOG, banData: null, today: '2026-11-25', format: null });
    expect(otherDecksLine(two.entries[0].view)).toBe('1 other deck uses some of these cards: Jinx Aggro');
    const alone = buildDeckList({ decks: decks.slice(0, 1), locks: [], collection: owned(3), catalog: CATALOG, banData: null, today: '2026-11-25', format: null });
    expect(otherDecksLine(alone.entries[0].view)).toBeNull();
  });
});

describe('SPEC-008 SHARE-020 deckLockCheck (canLock with the lock store state)', () => {
  const d1 = deck('d1', 'Kennen Tempo');
  const build = (n: number, locks: ReturnType<typeof lock>[] | null, collection: ReturnType<typeof owned> | null = owned(n)) =>
    buildDeckList({ decks: [d1, deck('d2', 'Kennen Control')], locks, collection, catalog: CATALOG, banData: null, today: '2026-11-25', format: null });

  it('SPEC-008 AC 23 / SHARE-020 incomplete: "Lock in needs every card available" with the cards short; complete: ok', () => {
    const short = build(2, []);
    const e = short.entries.find((x) => x.deck.id === 'd1')!;
    expect(deckLockCheck({ pool: short.pool, deck: d1, readOnly: false, lock: e.view.lock, locksUnreadable: false })).toEqual({
      ok: false,
      reason: 'incomplete',
      cardsShort: 1,
    });
    const full = build(3, []);
    const f = full.entries.find((x) => x.deck.id === 'd1')!;
    expect(deckLockCheck({ pool: full.pool, deck: d1, readOnly: false, lock: f.view.lock, locksUnreadable: false })).toEqual({ ok: true });
  });

  it('SHARE-020 a locked deck is already-locked (Unlock shows), also while ownership is unavailable (SHARE-053)', () => {
    const locked = build(3, [lock('d1')]);
    const e = locked.entries.find((x) => x.deck.id === 'd1')!;
    expect(deckLockCheck({ pool: locked.pool, deck: d1, readOnly: false, lock: e.view.lock, locksUnreadable: false })).toEqual({
      ok: false,
      reason: 'already-locked',
    });
    const unavailable = build(3, [lock('d1')], null);
    const u = unavailable.entries.find((x) => x.deck.id === 'd1')!;
    expect(deckLockCheck({ pool: null, deck: d1, readOnly: false, lock: u.view.lock, locksUnreadable: false })).toEqual({
      ok: false,
      reason: 'already-locked',
    });
  });

  it('SPEC-008 AC 13 / SHARE-061 lock store unreadable: locks-unreadable, before ownership-unavailable too', () => {
    const m = build(3, null);
    const e = m.entries.find((x) => x.deck.id === 'd1')!;
    expect(deckLockCheck({ pool: m.pool, deck: d1, readOnly: false, lock: e.view.lock, locksUnreadable: true }).ok).toBe(false);
    expect(deckLockCheck({ pool: m.pool, deck: d1, readOnly: false, lock: e.view.lock, locksUnreadable: true })).toEqual({
      ok: false,
      reason: 'locks-unreadable',
    });
    expect(deckLockCheck({ pool: null, deck: d1, readOnly: false, lock: null, locksUnreadable: true })).toEqual({
      ok: false,
      reason: 'locks-unreadable',
    });
    expect(deckLockCheck({ pool: null, deck: d1, readOnly: false, lock: null, locksUnreadable: false })).toEqual({
      ok: false,
      reason: 'ownership-unavailable',
    });
  });

  it('SHARE-020 read-only (DECK-091) comes before locks and ownership', () => {
    expect(deckLockCheck({ pool: null, deck: d1, readOnly: true, lock: null, locksUnreadable: true })).toEqual({
      ok: false,
      reason: 'read-only',
    });
  });
});

describe('SPEC-008 DeckLockStore helpers (SHARE-021…023, SHARE-060…063)', () => {
  const at = '2026-11-25T12:00:00.000Z';

  it('SHARE-021 / SHARE-022 withLock adds { deckId, lockedAt: now }, at most one per deck', () => {
    const stored: StoredDeckLocks = { schemaVersion: 1, updatedAt: 'x', locks: [lock('a'), lock('b', '2026-11-20T00:00:00Z')] };
    expect(withLock(stored, 'b', at)).toEqual({
      schemaVersion: 1,
      updatedAt: at,
      locks: [lock('a'), { deckId: 'b', lockedAt: at }],
    });
    expect(withLock(null, 'c', at).locks).toEqual([{ deckId: 'c', lockedAt: at }]);
  });

  it('SHARE-023 withoutLock removes the deck lock at once', () => {
    const stored: StoredDeckLocks = { schemaVersion: 1, updatedAt: 'x', locks: [lock('a'), lock('b')] };
    expect(withoutLock(stored, 'a', at)).toEqual({ schemaVersion: 1, updatedAt: at, locks: [lock('b')] });
  });

  it('SHARE-061 readLocks: [] when none stored, the list, or null for a newer / unreadable record (never overwritten)', async () => {
    const backend = new MemoryBackend();
    const stores = createBrowserStores(backend, { now: () => Date.now(), changed: () => undefined, readOnly: () => false });
    expect(await readLocks(stores.locks)).toEqual([]);
    backend.set(STORAGE_KEYS.locks, JSON.stringify({ schemaVersion: 2, updatedAt: 'x', locks: [] }));
    expect(await readLocks(stores.locks)).toBeNull();
    await expect(saveLock(stores.locks, 'd1', at)).rejects.toThrow();
    expect(JSON.parse(backend.get(STORAGE_KEYS.locks)!).schemaVersion).toBe(2);
  });

  it('SHARE-062 a saved lock store drops orphan locks (deck not in the store); SHARE-060 schema 1', async () => {
    const backend = new MemoryBackend();
    const stores = createBrowserStores(backend, { now: () => Date.now(), changed: () => undefined, readOnly: () => false });
    await stores.raw.decks.put(deck('00000000-0000-4000-9000-000000000001', 'Kennen Tempo'));
    backend.set(STORAGE_KEYS.locks, JSON.stringify({ schemaVersion: 1, updatedAt: 'x', locks: [lock('gone')] }));
    await saveLock(stores.locks, '00000000-0000-4000-9000-000000000001', at);
    const stored = JSON.parse(backend.get(STORAGE_KEYS.locks)!) as StoredDeckLocks;
    expect(stored.schemaVersion).toBe(1);
    expect(stored.locks).toEqual([{ deckId: '00000000-0000-4000-9000-000000000001', lockedAt: at }]);
    await saveUnlock(stores.locks, '00000000-0000-4000-9000-000000000001', at);
    expect((JSON.parse(backend.get(STORAGE_KEYS.locks)!) as StoredDeckLocks).locks).toEqual([]);
  });

  it('SHARE-063 a failed save throws and leaves the previous state', async () => {
    const before: StoredDeckLocks = { schemaVersion: 1, updatedAt: 'x', locks: [lock('a')] };
    let saved = before;
    const store: DeckLockStore = {
      load: async () => saved,
      save: async () => {
        throw new Error('quota');
      },
    };
    await expect(saveLock(store, 'b', at)).rejects.toThrow('quota');
    expect(saved).toBe(before);
    saved = before;
  });
});
