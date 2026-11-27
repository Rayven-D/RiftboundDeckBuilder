import {
  type DeckLock,
  type DeckLockStore,
  type DeckOwnershipView,
  type IsoDateTime,
  type LockCheck,
  type SharedPool,
  type StoredDeckLocks,
  type UserDeck,
  canLock,
} from '../../core/decks';

/**
 * SPEC-008 lock pieces shared by the Decks list (H-060) and Deck detail (H-254): pure functions over the stored
 * locks and the SHARE-020…029 texts. No Angular, no storage of their own (the `DeckLockStore` is passed in), no
 * clock (the time is passed in), so they are easy to test.
 */

/** SHARE-021, SHARE-029, SHARE-061, SHARE-063 texts, word for word. */
export const LOCK_TEXT = {
  lockIn: 'Lock in',
  lockingIn: 'Locking in…',
  unlock: 'Unlock',
  unlocking: 'Unlocking…',
  /** H-662: name and tooltip of the Deck detail title-row lock toggle (icon only). */
  lockDeck: 'Lock deck',
  unlockDeck: 'Unlock deck',
  cancel: 'Cancel',
  confirmBody: "Its cards won't count toward your other decks until you unlock or delete it.",
  saveFailed: "Couldn't save the lock. Try again.",
  /** SHARE-061 banner. */
  locksUnreadable: 'Locked decks could not be read; counts ignore locks.',
} as const;

/** SHARE-021 confirmation title: "Lock in 'Kennen Tempo'?" (straight quotes kept, SPEC-005 Open question 15). */
export const lockInTitle = (deckName: string): string => `Lock in '${deckName}'?`;
/** SHARE-029 (a): "Kennen Tempo is locked in." (no quotes, no Undo). */
export const lockedInNotice = (deckName: string): string => `${deckName} is locked in.`;
/** SHARE-029 (b): "Kennen Tempo is unlocked. Its cards count toward your other decks again." (no Undo). */
export const unlockedNotice = (deckName: string): string =>
  `${deckName} is unlocked. Its cards count toward your other decks again.`;

/**
 * SHARE-021 (SHOULD) line of the confirmation: the other decks that use any counted card of this deck, unique, in
 * the order they first appear walking the deck's cards in section order and each card's uses in SHARE-015 order;
 * at most 3 names, then "and <r> more". null when no other deck uses its cards.
 * "2 other decks use some of these cards: Jinx Aggro, Draven Midrange"; one: "1 other deck uses some of these cards: …".
 */
export function otherDecksLine(view: DeckOwnershipView): string | null {
  const names = new Map<string, string>();
  for (const s of view.sections) {
    for (const c of s.cards) for (const u of c.otherUses) if (!names.has(u.deckId)) names.set(u.deckId, u.deckName);
  }
  const m = names.size;
  if (m === 0) return null;
  const all = [...names.values()];
  const shown = all.slice(0, 3).join(', ');
  const more = m > 3 ? ` and ${m - 3} more` : '';
  return `${m} other ${m === 1 ? 'deck uses' : 'decks use'} some of these cards: ${shown}${more}`;
}

/**
 * The lock check behind Lock in (SHARE-020), from the engine's `canLock`. `lock` is the view's lock state (from the
 * lock store, also while ownership is unavailable, OWN-065), so `isLocked` never comes from the pool. With ownership
 * unavailable there is no pool to say the lock store was unreadable, so `locksUnreadable` (the page read the store
 * and it failed, SHARE-061) puts `locks-unreadable` before `ownership-unavailable`, as SHARE-020's order says.
 */
export function deckLockCheck(args: {
  pool: SharedPool | null;
  deck: UserDeck;
  readOnly: boolean;
  lock: DeckOwnershipView['lock'];
  locksUnreadable: boolean;
}): LockCheck {
  const isLocked = !args.locksUnreadable && (args.lock?.locked ?? false);
  const check = canLock(args.pool, args.deck, args.readOnly, isLocked);
  if (!check.ok && check.reason === 'ownership-unavailable' && args.locksUnreadable) {
    return { ok: false, reason: 'locks-unreadable' };
  }
  return check;
}

/**
 * Reads the stored locks (SHARE-060): the list, `[]` when none is stored, or **null when the record is unreadable or
 * newer** (SHARE-061: counts then ignore every lock, a banner shows, Lock in / Unlock are disabled, and the record
 * is never overwritten).
 */
export async function readLocks(store: Pick<DeckLockStore, 'load'>): Promise<readonly DeckLock[] | null> {
  try {
    return (await store.load())?.locks ?? [];
  } catch {
    return null;
  }
}

/**
 * The record after Lock in (SHARE-021, SHARE-022): any earlier lock of the deck is replaced (at most one per deck),
 * the new one gets `lockedAt = now`. Orphans (SHARE-062) are dropped by the store when it saves.
 */
export function withLock(stored: StoredDeckLocks | null, deckId: string, now: IsoDateTime): StoredDeckLocks {
  const others = (stored?.locks ?? []).filter((l) => l.deckId !== deckId);
  return { schemaVersion: 1, updatedAt: now, locks: [...others, { deckId, lockedAt: now }] };
}

/** The record after Unlock (SHARE-023): the deck's lock removed at once. */
export function withoutLock(stored: StoredDeckLocks | null, deckId: string, now: IsoDateTime): StoredDeckLocks {
  return { schemaVersion: 1, updatedAt: now, locks: (stored?.locks ?? []).filter((l) => l.deckId !== deckId) };
}

/**
 * Lock in (SHARE-021) against a store: load (an unreadable record throws and is never overwritten, SHARE-061), add
 * the lock, save. A failed save throws and leaves the previous state (SHARE-063).
 */
export async function saveLock(store: DeckLockStore, deckId: string, now: IsoDateTime): Promise<void> {
  const stored = await store.load();
  await store.save(withLock(stored, deckId, now));
}

/** Unlock (SHARE-023) against a store, as `saveLock`. */
export async function saveUnlock(store: DeckLockStore, deckId: string, now: IsoDateTime): Promise<void> {
  const stored = await store.load();
  await store.save(withoutLock(stored, deckId, now));
}
