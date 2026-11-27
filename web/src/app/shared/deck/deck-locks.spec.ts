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
  LOCK_REMOVAL_TEXT,
  lockRemovalLines,
  noLongerFullyLockedNotice,
  readLocks,
  saveLocks,
  unlockedNotice,
  withDeckLocked,
  withDeckUnlocked,
  withNameLocked,
  withNameUnlocked,
  withoutLosses,
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

  it('SHARE-094 / SHARE-029 v0.6 / SHARE-088 proposal wording, word for word (SPEC-008 Open questions 8, 9)', () => {
    expect(LOCK_TEXT.lockName).toBe('Lock these copies');
    expect(LOCK_TEXT.unlockName).toBe('Unlock these copies');
    expect(noLongerFullyLockedNotice('Kennen Tempo')).toBe('Kennen Tempo is no longer fully locked.');
    expect(LOCK_REMOVAL_TEXT).toEqual({
      title: 'Unlock cards in your decks?',
      intro: 'Some of the cards you are removing are locked in your decks. Going on unlocks them:',
      confirm: 'Unlock and continue',
    });
  });

  it('SHARE-088 / SPEC-008 AC 31 removal lines: one per deck with each name and its copies, then "will no longer be locked." for a locked deck', () => {
    const loss = (deckId: string, deckName: string, cardName: string, copies: number, deckUnlocks: boolean) => ({
      deckId,
      deckName,
      cardKey: cardName.toLowerCase(),
      cardName,
      copies,
      deckUnlocks,
    });
    expect(lockRemovalLines([loss('d1', 'Kennen Tempo', 'Hextech Ray', 3, true)])).toEqual([
      "'Kennen Tempo': 3 Hextech Ray",
      "'Kennen Tempo' will no longer be locked.",
    ]);
    expect(
      lockRemovalLines([
        loss('d1', 'Kennen Tempo', 'Hextech Ray', 3, false),
        loss('d3', 'Kennen Aggro', 'Hextech Ray', 2, false),
        loss('d1', 'Kennen Tempo', 'Gust', 2, false),
      ]),
    ).toEqual(["'Kennen Tempo': 3 Hextech Ray, 2 Gust", "'Kennen Aggro': 2 Hextech Ray"]);
    expect(lockRemovalLines([])).toEqual([]);
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
  const build = (n: number, locks: ReturnType<typeof lock> | null, collection: ReturnType<typeof owned> | null = owned(n)) =>
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
    const locked = build(3, lock('d1'));
    const e = locked.entries.find((x) => x.deck.id === 'd1')!;
    expect(deckLockCheck({ pool: locked.pool, deck: d1, readOnly: false, lock: e.view.lock, locksUnreadable: false })).toEqual({
      ok: false,
      reason: 'already-locked',
    });
    const unavailable = build(3, lock('d1'), null);
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

  const tempo = makeDeck('a', 'Kennen Tempo', { main: [['Hextech Ray', 3], ['Gust', 2]] });
  const nl = (deckId: string, cardKey: string, lockedAt = at) => ({ deckId, cardKey, lockedAt });

  it('SHARE-084 withDeckLocked adds a name lock on every name not locked yet, one lockedAt; other decks untouched', () => {
    const stored: StoredDeckLocks = { schemaVersion: 2, updatedAt: 'x', locks: [nl('a', 'hextech ray', 'old'), nl('b', 'gust', 'old')] };
    expect(withDeckLocked(stored, tempo, at)).toEqual({
      schemaVersion: 2,
      updatedAt: at,
      locks: [nl('a', 'hextech ray', 'old'), nl('b', 'gust', 'old'), nl('a', 'gust')],
    });
    expect(withDeckLocked(null, tempo, at).locks).toEqual([nl('a', 'hextech ray'), nl('a', 'gust')]);
  });

  it('SHARE-023 / SHARE-084 withDeckUnlocked removes every name lock of that deck and none of another', () => {
    const stored: StoredDeckLocks = { schemaVersion: 2, updatedAt: 'x', locks: [nl('a', 'hextech ray'), nl('a', 'gust'), nl('b', 'hextech ray')] };
    expect(withDeckUnlocked(stored, 'a', at)).toEqual({ schemaVersion: 2, updatedAt: at, locks: [nl('b', 'hextech ray')] });
  });

  it('SHARE-082 / SHARE-085 withNameLocked / withNameUnlocked change exactly one (deck, name)', () => {
    const stored: StoredDeckLocks = { schemaVersion: 2, updatedAt: 'x', locks: [nl('a', 'hextech ray', 'old'), nl('b', 'gust', 'old')] };
    expect(withNameLocked(stored, 'a', 'gust', at).locks).toEqual([nl('a', 'hextech ray', 'old'), nl('b', 'gust', 'old'), nl('a', 'gust')]);
    expect(withNameLocked(stored, 'a', 'hextech ray', at).locks).toEqual([nl('b', 'gust', 'old'), nl('a', 'hextech ray')]);
    expect(withNameUnlocked(stored, 'a', 'hextech ray', at).locks).toEqual([nl('b', 'gust', 'old')]);
  });

  it('SHARE-088 withoutLosses removes exactly the listed name locks', () => {
    const stored: StoredDeckLocks = { schemaVersion: 2, updatedAt: 'x', locks: [nl('a', 'hextech ray'), nl('a', 'gust')] };
    const loss = { deckId: 'a', deckName: 'Kennen Tempo', cardKey: 'hextech ray', cardName: 'Hextech Ray', copies: 3, deckUnlocks: true };
    expect(withoutLosses(stored, [loss], at).locks).toEqual([nl('a', 'gust')]);
  });

  it('SHARE-061 readLocks: [] when none stored, the list, or null for a newer / unreadable record (never overwritten)', async () => {
    const backend = new MemoryBackend();
    const stores = createBrowserStores(backend, { now: () => Date.now(), changed: () => undefined, readOnly: () => false });
    expect(await readLocks(stores.locks)).toEqual([]);
    backend.set(STORAGE_KEYS.locks, JSON.stringify({ schemaVersion: 3, updatedAt: 'x', locks: [] }));
    expect(await readLocks(stores.locks)).toBeNull();
    await expect(saveLocks(stores.locks, (s) => withNameLocked(s, 'd1', 'gust', at))).rejects.toThrow();
    expect(JSON.parse(backend.get(STORAGE_KEYS.locks)!).schemaVersion).toBe(3);
  });

  it('SHARE-062 a saved lock store drops orphan name locks (deck not in the store); SHARE-061 schema 2', async () => {
    const backend = new MemoryBackend();
    const stores = createBrowserStores(backend, { now: () => Date.now(), changed: () => undefined, readOnly: () => false });
    await stores.raw.decks.put(deck('00000000-0000-4000-9000-000000000001', 'Kennen Tempo'));
    backend.set(STORAGE_KEYS.locks, JSON.stringify({ schemaVersion: 2, updatedAt: 'x', locks: [{ deckId: 'gone', cardKey: 'hextech ray', lockedAt: 'x' }] }));
    const d = deck('00000000-0000-4000-9000-000000000001', 'Kennen Tempo');
    await saveLocks(stores.locks, (s) => withDeckLocked(s, d, at));
    const stored = JSON.parse(backend.get(STORAGE_KEYS.locks)!) as StoredDeckLocks;
    expect(stored.schemaVersion).toBe(2);
    expect(stored.locks).toEqual([{ deckId: d.id, cardKey: 'hextech ray', lockedAt: at }]);
    await saveLocks(stores.locks, (s) => withDeckUnlocked(s, d.id, at));
    expect((JSON.parse(backend.get(STORAGE_KEYS.locks)!) as StoredDeckLocks).locks).toEqual([]);
  });

  it('SHARE-063 a failed save throws and leaves the previous state', async () => {
    const before: StoredDeckLocks = { schemaVersion: 2, updatedAt: 'x', locks: lock('a') };
    let saved = before;
    const store: DeckLockStore = {
      load: async () => saved,
      save: async () => {
        throw new Error('quota');
      },
    };
    await expect(saveLocks(store, (s) => withNameLocked(s, 'b', 'gust', at))).rejects.toThrow('quota');
    expect(saved).toBe(before);
    saved = before;
  });
});
