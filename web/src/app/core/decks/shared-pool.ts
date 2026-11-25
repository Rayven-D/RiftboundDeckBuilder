import { cachedDeckOwnership } from './deck-ownership';
import type {
  CardAvailability,
  CardKey,
  CardPool,
  CardUse,
  DeckCard,
  DeckLock,
  DeckLockState,
  DeckZone,
  LockCheck,
  LockedShortfall,
  SharedPool,
  SharedPoolInput,
  UserDeck,
} from './types';

/** SPEC-005 ZONE_ORDER: Riot decklist order, the section and allocation order (OWN-011, OWN-022). */
export const ZONE_ORDER: readonly DeckZone[] = [
  'legend',
  'champion',
  'main',
  'battlefields',
  'runes',
  'sideboard',
];

/** SPEC-008 COUNTED_ZONES: every zone, = ZONE_ORDER, Runes included (SHARE-001, SHARE-006). */
export const COUNTED_ZONES: readonly DeckZone[] = ZONE_ORDER;

/** A deck's entries of one zone, in stored order (single slots as a 0/1-element list). */
export function zoneEntries(deck: UserDeck, zone: DeckZone): readonly DeckCard[] {
  switch (zone) {
    case 'legend':
      return deck.legend ? [deck.legend] : [];
    case 'champion':
      return deck.champion ? [deck.champion] : [];
    default:
      return deck[zone];
  }
}

/** Counted entries (SPEC-008 definition): every entry of every counted zone, runes included (SHARE-006). */
export function countedEntries(deck: UserDeck): { zone: DeckZone; entry: DeckCard }[] {
  const out: { zone: DeckZone; entry: DeckCard }[] = [];
  for (const zone of COUNTED_ZONES) {
    for (const entry of zoneEntries(deck, zone)) out.push({ zone, entry });
  }
  return out;
}

/** need(D, k) per counted cardKey, in deck order of first appearance (Map keeps insertion order). */
function needs(deck: UserDeck): Map<CardKey, number> {
  const m = new Map<CardKey, number>();
  for (const { entry } of countedEntries(deck)) {
    m.set(entry.cardKey, (m.get(entry.cardKey) ?? 0) + entry.qty);
  }
  return m;
}

/** Parsed `lockedAt` in ms; unparseable values map to +Infinity so they sort after every parseable one. */
function lockTime(lockedAt: string): number {
  const t = Date.parse(lockedAt);
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

/**
 * SHARE-030 total order: parsed `lockedAt` ascending (unparseable values after all parseable ones),
 * then the raw `lockedAt` string, then `deckId`. Each step compares one derived key for every
 * lock, so the order is transitive whatever mix of timestamps the store holds.
 */
function compareLockOrder(a: DeckLock, b: DeckLock): number {
  const ta = lockTime(a.lockedAt);
  const tb = lockTime(b.lockedAt);
  if (ta !== tb) return ta < tb ? -1 : 1;
  if (a.lockedAt !== b.lockedAt) return a.lockedAt < b.lockedAt ? -1 : 1;
  return a.deckId < b.deckId ? -1 : a.deckId > b.deckId ? 1 : 0;
}

/** SPEC-007 COLL-034 name comparison: locale `en`, base sensitivity, numeric segments. */
const nameCollator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

/**
 * SPEC-008 `computeSharedPool` (SHARE-070): pure function of (decks, locks, ownership input).
 * One pool per counted cardKey across all decks (SHARE-001/002); `deckOwnership` is called at most
 * once per counted cardKey and never for a card the catalog doesn't have (pool 0, OWN-061). Holds
 * are filled in lock order (SHARE-031); unlocked decks hold nothing (SHARE-012). Locks of decks not
 * in `decks` are ignored (SHARE-062); `locks === null` ignores every lock (SHARE-061).
 */
export function computeSharedPool(input: SharedPoolInput): SharedPool {
  const catalog = input.ownership.catalog;
  const locksIgnored = input.locks === null;

  const decksById = new Map<string, UserDeck>();
  for (const d of input.decks) if (!decksById.has(d.id)) decksById.set(d.id, d);

  // Valid locks in lock order, at most one per deck (SHARE-022: the earliest one wins).
  const lockByDeck = new Map<string, DeckLock>();
  for (const lock of [...(input.locks ?? [])].sort(compareLockOrder)) {
    if (decksById.has(lock.deckId) && !lockByDeck.has(lock.deckId)) {
      lockByDeck.set(lock.deckId, lock);
    }
  }
  const lockOrder = [...lockByDeck.values()];

  const needByDeck = new Map<string, Map<CardKey, number>>();
  for (const d of decksById.values()) needByDeck.set(d.id, needs(d));

  // Pool per counted cardKey (SHARE-004).
  const byCard: Record<CardKey, CardPool> = {};
  for (const need of needByDeck.values()) {
    for (const k of need.keys()) {
      if (byCard[k]) continue;
      const o = catalog.cards[k] ? cachedDeckOwnership(input.ownership, k) : null;
      byCard[k] = {
        cardKey: k,
        ownedForDecks: o?.ownedForDecks ?? 0,
        ownedExcluded: o?.ownedExcluded ?? 0,
        heldTotal: 0,
        uses: [],
      };
    }
  }

  // Holds in lock order (SHARE-031); locked uses are pushed in lock order (SHARE-015).
  const holdOf = new Map<string, Map<CardKey, number>>();
  for (const lock of lockOrder) {
    const deck = decksById.get(lock.deckId) as UserDeck;
    const held = new Map<CardKey, number>();
    for (const [k, need] of needByDeck.get(deck.id) as Map<CardKey, number>) {
      const pool = byCard[k];
      const hold = Math.min(need, Math.max(0, pool.ownedForDecks - pool.heldTotal));
      pool.heldTotal += hold;
      held.set(k, hold);
      pool.uses.push({ deckId: deck.id, deckName: deck.name, need, locked: true, hold });
    }
    holdOf.set(deck.id, held);
  }

  // Unlocked uses: by name (COLL-034), then deckId (SHARE-015).
  const unlocked = [...decksById.values()]
    .filter((d) => !lockByDeck.has(d.id))
    .sort(
      (a, b) => nameCollator.compare(a.name, b.name) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    );
  for (const deck of unlocked) {
    for (const [k, need] of needByDeck.get(deck.id) as Map<CardKey, number>) {
      byCard[k].uses.push({ deckId: deck.id, deckName: deck.name, need, locked: false, hold: 0 });
    }
  }

  const byDeck: Record<string, DeckLockState> = {};
  for (const deck of decksById.values()) {
    const need = needByDeck.get(deck.id) as Map<CardKey, number>;
    const lock = lockByDeck.get(deck.id) ?? null;
    const held = holdOf.get(deck.id);
    const cardsShort: CardKey[] = [];
    for (const [k, n] of need) {
      const pool = byCard[k];
      // Locked: allocated = hold. Unlocked: available = owned − Σ holds of locked decks (SHARE-011).
      const allocated = held
        ? (held.get(k) ?? 0)
        : Math.min(n, Math.max(0, pool.ownedForDecks - pool.heldTotal));
      if (allocated < n) cardsShort.push(k);
    }
    byDeck[deck.id] = {
      deckId: deck.id,
      locked: lock !== null,
      lockedAt: lock?.lockedAt ?? null,
      complete: need.size > 0 && cardsShort.length === 0,
      short: lock !== null && cardsShort.length > 0,
      cardsShort,
    };
  }

  return { locksIgnored, byCard, byDeck };
}

/**
 * SPEC-008 `availability(pool, deckId, cardKey)`: what deck D sees for card k (SHARE-010, SHARE-011,
 * SHARE-015, SHARE-043). A cardKey not in `pool.byCard` (a card no deck uses) gets all zeros.
 */
export function availability(pool: SharedPool, deckId: string, cardKey: CardKey): CardAvailability {
  const card = pool.byCard[cardKey];
  const locked = pool.byDeck[deckId]?.locked ?? false;
  if (!card) {
    return {
      deckId,
      cardKey,
      ownedForDecks: 0,
      ownedExcluded: 0,
      lockedByOthers: 0,
      available: 0,
      need: 0,
      heldByThisDeck: locked ? 0 : null,
      otherUses: [],
    };
  }
  const own = card.uses.find((u) => u.deckId === deckId);
  const hold = own?.hold ?? 0;
  const lockedByOthers = card.heldTotal - hold;
  return {
    deckId,
    cardKey,
    ownedForDecks: card.ownedForDecks,
    ownedExcluded: card.ownedExcluded,
    lockedByOthers,
    available: Math.max(0, card.ownedForDecks - lockedByOthers),
    need: own?.need ?? 0,
    heldByThisDeck: locked ? hold : null,
    otherUses: card.uses.filter((u) => u.deckId !== deckId),
  };
}

/**
 * SPEC-008 `canLock(pool, deck, readOnly, isLocked)` (SHARE-020): the first failing check, in the
 * order already-locked → read-only → locks-unreadable → ownership-unavailable → no-cards → incomplete.
 * `pool === null` means ownership is unavailable (OWN-062/063). `isLocked` = the deck has a `DeckLock`
 * in a readable lock store (v0.4.2): whether a deck is locked comes from the lock store, not from the
 * pool, so `already-locked` is returned also with a null pool (SHARE-053). With an unreadable lock
 * store the caller passes `false` and the reason is `locks-unreadable`.
 */
export function canLock(
  pool: SharedPool | null,
  deck: UserDeck,
  readOnly: boolean,
  isLocked: boolean,
): LockCheck {
  if (isLocked) return { ok: false, reason: 'already-locked' };
  if (readOnly) return { ok: false, reason: 'read-only' };
  if (pool?.locksIgnored) return { ok: false, reason: 'locks-unreadable' };
  if (!pool) return { ok: false, reason: 'ownership-unavailable' };
  // SHARE-020 v0.4: `no-cards` only for a deck with no entry at all (runes count, SHARE-006).
  if (countedEntries(deck).length === 0) return { ok: false, reason: 'no-cards' };
  const state = pool.byDeck[deck.id];
  if (!state || !state.complete) {
    return { ok: false, reason: 'incomplete', cardsShort: state?.cardsShort.length ?? 0 };
  }
  return { ok: true };
}

/**
 * SPEC-008 SHARE-053 (a) / SPEC-005 OWN-065 (a): a deck's lock state while ownership is unavailable,
 * built from the stored locks. `{ locked: true, lockedAt, complete: false, short: false,
 * cardsShort: [] }` for a deck with a stored lock (the earliest in lock order, SHARE-022); `null`
 * for a deck without one, or for every deck when the lock store is unreadable (`locks === null`,
 * SHARE-061). Holds are unknown, so it is never short (SHARE-053 (f)).
 */
export function storedLockState(
  locks: readonly DeckLock[] | null,
  deckId: string,
): DeckLockState | null {
  const own = (locks ?? []).filter((l) => l.deckId === deckId).sort(compareLockOrder);
  if (own.length === 0) return null;
  return {
    deckId,
    locked: true,
    lockedAt: own[0].lockedAt,
    complete: false,
    short: false,
    cardsShort: [],
  };
}

/** "1 card short" / "3 cards short" (SHARE-020, SHARE-033, SHARE-034). */
export function cardsShortText(n: number): string {
  return `${n} ${n === 1 ? 'card' : 'cards'} short`;
}

/** SHARE-020 disabled-reason text for a failed `LockCheck`; null for ok and `already-locked`. */
export function lockCheckMessage(check: LockCheck): string | null {
  if (check.ok) return null;
  switch (check.reason) {
    case 'already-locked':
      return null;
    case 'read-only':
      return 'This deck is read-only';
    case 'locks-unreadable':
      return 'Locked decks could not be read';
    case 'ownership-unavailable':
      return 'Ownership unavailable';
    case 'no-cards':
      return 'Lock in needs at least one card';
    case 'incomplete':
      return `Lock in needs every card available: ${cardsShortText(check.cardsShort ?? 0)}`;
  }
}

/** hold(L, k) and the deck name per locked deck, from the uses in the pool. */
function holdsByDeck(pool: SharedPool): Map<string, { name: string; holds: Map<CardKey, number> }> {
  const m = new Map<string, { name: string; holds: Map<CardKey, number> }>();
  for (const card of Object.values(pool.byCard)) {
    for (const u of card.uses) {
      if (!u.locked) continue;
      const t = m.get(u.deckId) ?? { name: u.deckName, holds: new Map<CardKey, number>() };
      t.holds.set(card.cardKey, u.hold);
      m.set(u.deckId, t);
    }
  }
  return m;
}

/**
 * SPEC-008 `lockedShortfalls(before, after)` (SHARE-034, v0.4.2 per card): decks locked in both pools
 * that hold fewer copies of at least one cardKey in `after` than in `before` (a Σ that stays equal
 * does not hide a drop), with the number of short cardKeys in `after`, in `after`'s lock order.
 * `after` is the pool for the collection as it would be after the change (computed on a parsed
 * Replace import before commit), or, for an import Undo, as it now is.
 */
export function lockedShortfalls(before: SharedPool, after: SharedPool): LockedShortfall[] {
  const lockedAfter = Object.values(after.byDeck)
    .filter((s) => s.locked && before.byDeck[s.deckId]?.locked)
    .map((s) => ({ deckId: s.deckId, lockedAt: s.lockedAt as string, state: s }))
    .sort(compareLockOrder);
  const holdsBefore = holdsByDeck(before);
  const holdsAfter = holdsByDeck(after);
  const out: LockedShortfall[] = [];
  for (const { deckId, state } of lockedAfter) {
    const was = holdsBefore.get(deckId);
    const now = holdsAfter.get(deckId);
    if (!was) continue;
    let dropped = false;
    for (const [k, hold] of was.holds) {
      if ((now?.holds.get(k) ?? 0) < hold) {
        dropped = true;
        break;
      }
    }
    if (!dropped) continue;
    out.push({ deckId, deckName: now?.name ?? was.name, cardsShort: state.cardsShort.length });
  }
  return out;
}

/** SHARE-034 warning inside a confirmation: "'Kennen Aggro' (locked) will be 1 card short." */
export function shortfallWarning(s: LockedShortfall): string {
  return `'${s.deckName}' (locked) will be ${cardsShortText(s.cardsShort)}.`;
}

/** SHARE-034 notice after an import Undo: "'Kennen Tempo' (locked) is now 1 card short." */
export function shortfallNotice(s: LockedShortfall): string {
  return `'${s.deckName}' (locked) is now ${cardsShortText(s.cardsShort)}.`;
}

/** SHARE-042 shared indicator: "Also in 1 other deck · 1 locked"; null with no other use. */
export function sharedIndicator(otherUses: readonly CardUse[]): string | null {
  const n = otherUses.length;
  if (n === 0) return null;
  const m = otherUses.filter((u) => u.locked).length;
  return `Also in ${n} other ${n === 1 ? 'deck' : 'decks'}${m > 0 ? ` · ${m} locked` : ''}`;
}
