import {
  type CardKey,
  type DeckLockStore,
  type DeckOwnershipView,
  type IsoDateTime,
  type LockCheck,
  type LockLoss,
  type NameLock,
  type NameLockCheck,
  type SharedPool,
  type StoredDeckLocks,
  type UserDeck,
  canLock,
  canLockName,
  deckNeeds,
} from '../../core/decks';

/**
 * SPEC-008 v0.6 lock pieces shared by the Decks list (H-060), Deck detail (H-254), the card dialog (H-665) and the
 * Collection imports: pure functions over the stored name locks and the SHARE-020…029, SHARE-081…094 texts. No
 * Angular, no storage of their own (the `DeckLockStore` is passed in), no clock (the time is passed in).
 */

/** SHARE-021, SHARE-029, SHARE-061, SHARE-063, SHARE-094 texts, word for word. */
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
  /** SHARE-094 (a), proposal wording (SPEC-008 Open question 9): the card dialog's per-name control. */
  lockName: 'Lock these copies',
  unlockName: 'Unlock these copies',
} as const;

/** SHARE-021 confirmation title: "Lock in 'Kennen Tempo'?" (straight quotes kept, SPEC-005 Open question 15). */
export const lockInTitle = (deckName: string): string => `Lock in '${deckName}'?`;
/** SHARE-029 (a): "Kennen Tempo is locked in." (no quotes, no Undo); also after the automatic deck lock (SHARE-083). */
export const lockedInNotice = (deckName: string): string => `${deckName} is locked in.`;
/** SHARE-029 (b): "Kennen Tempo is unlocked. Its cards count toward your other decks again." (deck toggle only). */
export const unlockedNotice = (deckName: string): string =>
  `${deckName} is unlocked. Its cards count toward your other decks again.`;
/** SHARE-029 (b) v0.6 / SHARE-085, proposal wording: one name unlocked in a locked deck. */
export const noLongerFullyLockedNotice = (deckName: string): string => `${deckName} is no longer fully locked.`;

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
 * The lock check behind the deck toggle (SHARE-020), from the engine's `canLock`. `lock` is the view's lock state (from
 * the lock store, also while ownership is unavailable, OWN-065), so `isLocked` never comes from the pool. With
 * ownership unavailable there is no pool to say the lock store was unreadable, so `locksUnreadable` (the page read
 * the store and it failed, SHARE-061) puts `locks-unreadable` before `ownership-unavailable`, as SHARE-020's order says.
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

/** The check behind the card dialog's "Lock these copies" (SHARE-081), with the same unreadable-store rule. */
export function nameLockCheck(args: {
  pool: SharedPool | null;
  deck: UserDeck;
  cardKey: CardKey;
  readOnly: boolean;
  nameLocked: boolean;
  locksUnreadable: boolean;
}): NameLockCheck {
  const isLocked = !args.locksUnreadable && args.nameLocked;
  const check = canLockName(args.pool, args.deck, args.cardKey, args.readOnly, isLocked);
  if (!check.ok && check.reason === 'ownership-unavailable' && args.locksUnreadable) {
    return { ok: false, reason: 'locks-unreadable' };
  }
  return check;
}

/**
 * Reads the stored name locks (SHARE-060): the list, `[]` when none is stored, or **null when the record is
 * unreadable or newer** (SHARE-061: counts then ignore every lock, a banner shows, Lock / Unlock are disabled, and
 * the record is never overwritten).
 */
export async function readLocks(store: Pick<DeckLockStore, 'load'>): Promise<readonly NameLock[] | null> {
  try {
    return (await store.load())?.locks ?? [];
  } catch {
    return null;
  }
}

const record = (locks: NameLock[], now: IsoDateTime): StoredDeckLocks => ({ schemaVersion: 2, updatedAt: now, locks });

/**
 * The record after the deck toggle locks a deck (SHARE-021, SHARE-084): a `NameLock` for every counted name of the
 * deck not locked yet, all with `lockedAt = now`; names already locked keep theirs (SHARE-022). Other decks unchanged.
 */
export function withDeckLocked(stored: StoredDeckLocks | null, deck: UserDeck, now: IsoDateTime): StoredDeckLocks {
  const locks = stored?.locks ?? [];
  const have = new Set(locks.filter((l) => l.deckId === deck.id).map((l) => l.cardKey));
  const added = [...deckNeeds(deck).keys()].filter((k) => !have.has(k)).map((cardKey) => ({ deckId: deck.id, cardKey, lockedAt: now }));
  return record([...locks, ...added], now);
}

/** The record after unlocking a deck (SHARE-023, SHARE-084): every name lock of that deck and none of another. */
export function withDeckUnlocked(stored: StoredDeckLocks | null, deckId: string, now: IsoDateTime): StoredDeckLocks {
  return record((stored?.locks ?? []).filter((l) => l.deckId !== deckId), now);
}

/** The record after locking one name (SHARE-082): one `NameLock { deckId, cardKey, lockedAt: now }`. */
export function withNameLocked(stored: StoredDeckLocks | null, deckId: string, cardKey: CardKey, now: IsoDateTime): StoredDeckLocks {
  const rest = (stored?.locks ?? []).filter((l) => !(l.deckId === deckId && l.cardKey === cardKey));
  return record([...rest, { deckId, cardKey, lockedAt: now }], now);
}

/** The record after unlocking one name (SHARE-082, SHARE-085): that one name lock removed. */
export function withNameUnlocked(stored: StoredDeckLocks | null, deckId: string, cardKey: CardKey, now: IsoDateTime): StoredDeckLocks {
  return record((stored?.locks ?? []).filter((l) => !(l.deckId === deckId && l.cardKey === cardKey)), now);
}

/** The record after a confirmed removal (SHARE-088): exactly the name locks in `losses` removed, every other kept. */
export function withoutLosses(stored: StoredDeckLocks | null, losses: readonly LockLoss[], now: IsoDateTime): StoredDeckLocks {
  const gone = new Set(losses.map((l) => `${l.deckId}|${l.cardKey}`));
  return record((stored?.locks ?? []).filter((l) => !gone.has(`${l.deckId}|${l.cardKey}`)), now);
}

/** Load (an unreadable record throws and is never overwritten, SHARE-061), change, save; a failed save throws (SHARE-063). */
export async function saveLocks(
  store: DeckLockStore,
  change: (stored: StoredDeckLocks | null) => StoredDeckLocks,
): Promise<void> {
  const stored = await store.load();
  await store.save(change(stored));
}

/**
 * SHARE-088 removal confirmation, **proposal wording** (SPEC-008 Open question 8 (a), not RJ's): the title and button
 * of a confirmation shown only for the locks (an import Undo with no confirmation of its own), the intro line and the
 * per-deck lines that go inside any removal confirmation (`app-lock-removal-notice`).
 */
export const LOCK_REMOVAL_TEXT = {
  title: 'Unlock cards in your decks?',
  intro: 'Some of the cards you are removing are locked in your decks. Going on unlocks them:',
  confirm: 'Unlock and continue',
} as const;

/**
 * SHARE-088 lines from `lockLosses` (latest lock first): per deck, in the order its first loss appears, "'Kennen
 * Tempo': 3 Hextech Ray" (more names joined with ", ": "'Kennen Tempo': 3 Hextech Ray, 2 Gust"), then "'Kennen Tempo'
 * will no longer be locked." when that deck stops being locked. Name locks that stay are not listed.
 */
export function lockRemovalLines(losses: readonly LockLoss[]): string[] {
  const byDeck = new Map<string, { name: string; parts: string[]; unlocks: boolean }>();
  for (const l of losses) {
    const d = byDeck.get(l.deckId) ?? { name: l.deckName, parts: [], unlocks: false };
    d.parts.push(`${l.copies} ${l.cardName}`);
    d.unlocks ||= l.deckUnlocks;
    byDeck.set(l.deckId, d);
  }
  const lines: string[] = [];
  for (const d of byDeck.values()) {
    lines.push(`'${d.name}': ${d.parts.join(', ')}`);
    if (d.unlocks) lines.push(`'${d.name}' will no longer be locked.`);
  }
  return lines;
}
