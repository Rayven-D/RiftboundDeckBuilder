import { cachedDeckOwnership } from './deck-ownership';
import type {
  CardAvailability,
  CardKey,
  CardPool,
  CardUse,
  DeckCard,
  DeckLockState,
  DeckZone,
  LockCheck,
  LockLoss,
  NameLock,
  NameLockCheck,
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
export function deckNeeds(deck: UserDeck): Map<CardKey, number> {
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
 * SHARE-030 total order of name locks: parsed `lockedAt` ascending (unparseable values after all parseable ones),
 * then the raw `lockedAt` string, then `deckId`, then `cardKey` (v0.6). Each step compares one derived key, so the
 * order is transitive whatever mix of timestamps the store holds.
 */
export function compareLockOrder(
  a: Pick<NameLock, 'lockedAt' | 'deckId'> & { cardKey?: string },
  b: Pick<NameLock, 'lockedAt' | 'deckId'> & { cardKey?: string },
): number {
  const ta = lockTime(a.lockedAt);
  const tb = lockTime(b.lockedAt);
  if (ta !== tb) return ta < tb ? -1 : 1;
  if (a.lockedAt !== b.lockedAt) return a.lockedAt < b.lockedAt ? -1 : 1;
  if (a.deckId !== b.deckId) return a.deckId < b.deckId ? -1 : 1;
  const ka = a.cardKey ?? '';
  const kb = b.cardKey ?? '';
  return ka < kb ? -1 : ka > kb ? 1 : 0;
}

/** SPEC-007 COLL-034 name comparison: locale `en`, base sensitivity, numeric segments. */
const nameCollator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

/**
 * The valid name locks of `locks`, at most one per (deck, cardKey) (SHARE-022: the earliest wins), in lock order:
 * a lock whose deck is not in `decks`, or whose `cardKey` is not a counted name of that deck, is ignored (SHARE-062).
 */
function validLocks(locks: readonly NameLock[], needByDeck: ReadonlyMap<string, ReadonlyMap<CardKey, number>>): NameLock[] {
  const seen = new Set<string>();
  const out: NameLock[] = [];
  for (const l of [...locks].sort(compareLockOrder)) {
    const need = needByDeck.get(l.deckId)?.get(l.cardKey) ?? 0;
    const key = `${l.deckId}|${l.cardKey}`;
    if (need < 1 || seen.has(key)) continue;
    seen.add(key);
    out.push(l);
  }
  return out;
}

/**
 * SPEC-008 `settleLocks(locks, ownedForDecks, decks)` (SHARE-090, SHARE-031 invariant): pure. The name locks to keep:
 * the valid ones (SHARE-062, SHARE-022) such that, per cardKey, Σ hold ≤ ownedForDecks. A lock holds its deck's whole
 * need (never part of it), so the locks on one name are dropped **whole, latest first** (reverse SHARE-030 order)
 * until the rest fit: the kept locks are the longest prefix in lock order whose needs fit. Returned in lock order.
 */
export function settleLocks(
  locks: readonly NameLock[],
  ownedForDecks: (cardKey: CardKey) => number,
  decks: readonly UserDeck[],
): NameLock[] {
  const needByDeck = new Map<string, Map<CardKey, number>>();
  for (const d of decks) if (!needByDeck.has(d.id)) needByDeck.set(d.id, deckNeeds(d));
  return settleValid(validLocks(locks, needByDeck), ownedForDecks, needByDeck);
}

function settleValid(
  ordered: readonly NameLock[],
  ownedForDecks: (cardKey: CardKey) => number,
  needByDeck: ReadonlyMap<string, ReadonlyMap<CardKey, number>>,
): NameLock[] {
  const held = new Map<CardKey, number>();
  const full = new Set<CardKey>();
  const kept: NameLock[] = [];
  for (const l of ordered) {
    if (full.has(l.cardKey)) continue; // a later lock on a name that already overflowed is dropped too
    const need = needByDeck.get(l.deckId)?.get(l.cardKey) ?? 0;
    const total = (held.get(l.cardKey) ?? 0) + need;
    if (total > Math.max(0, ownedForDecks(l.cardKey))) {
      full.add(l.cardKey);
      continue;
    }
    held.set(l.cardKey, total);
    kept.push(l);
  }
  return kept;
}

/**
 * SPEC-008 `computeSharedPool` (SHARE-070): pure function of (decks, locks, ownership input). One pool per counted
 * cardKey across all decks (SHARE-001/002); `deckOwnership` is called at most once per counted cardKey and never for
 * a card the catalog doesn't have (pool 0, OWN-061). A name lock holds its deck's need of the name (SHARE-031); the
 * stored locks are settled first (SHARE-090: a lock that no longer fits, latest first, holds nothing and counts as
 * not locked), so a locked name is never short. Unlocked names hold nothing (SHARE-012). Orphan locks are ignored
 * (SHARE-062); `locks === null` ignores every lock (SHARE-061). A deck is locked exactly when every counted name has
 * an (effective) name lock (SHARE-083).
 */
export function computeSharedPool(input: SharedPoolInput): SharedPool {
  const catalog = input.ownership.catalog;
  const locksIgnored = input.locks === null;

  const decksById = new Map<string, UserDeck>();
  for (const d of input.decks) if (!decksById.has(d.id)) decksById.set(d.id, d);

  const needByDeck = new Map<string, Map<CardKey, number>>();
  for (const d of decksById.values()) needByDeck.set(d.id, deckNeeds(d));

  // Pool per counted cardKey (SHARE-004).
  const byCard: Record<CardKey, CardPool> = {};
  for (const deck of decksById.values()) {
    for (const { entry } of countedEntries(deck)) {
      const k = entry.cardKey;
      if (byCard[k]) continue;
      const card = catalog.cards[k];
      const o = card ? cachedDeckOwnership(input.ownership, k) : null;
      const owned = o?.ownedForDecks ?? 0;
      byCard[k] = {
        cardKey: k,
        cardName: card?.name ?? entry.name,
        ownedForDecks: owned,
        ownedExcluded: o?.ownedExcluded ?? 0,
        heldTotal: 0,
        free: owned,
        uses: [],
      };
    }
  }

  // Effective name locks in lock order (SHARE-030, SHARE-090).
  const effective = settleValid(
    validLocks(input.locks ?? [], needByDeck),
    (k) => byCard[k]?.ownedForDecks ?? 0,
    needByDeck,
  );
  const lockOf = new Map<string, NameLock>();
  for (const l of effective) {
    const deck = decksById.get(l.deckId) as UserDeck;
    const need = needByDeck.get(l.deckId)?.get(l.cardKey) as number;
    const pool = byCard[l.cardKey];
    pool.heldTotal += need;
    pool.free = pool.ownedForDecks - pool.heldTotal;
    pool.uses.push({ deckId: deck.id, deckName: deck.name, need, locked: true, hold: need, lockedAt: l.lockedAt });
    lockOf.set(`${l.deckId}|${l.cardKey}`, l);
  }

  // Unlocked uses: by name (COLL-034), then deckId (SHARE-015).
  const byName = [...decksById.values()].sort(
    (a, b) => nameCollator.compare(a.name, b.name) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  for (const deck of byName) {
    for (const [k, need] of needByDeck.get(deck.id) as Map<CardKey, number>) {
      if (lockOf.has(`${deck.id}|${k}`)) continue;
      byCard[k].uses.push({ deckId: deck.id, deckName: deck.name, need, locked: false, hold: 0, lockedAt: null });
    }
  }

  const byDeck: Record<string, DeckLockState> = {};
  for (const deck of decksById.values()) {
    const need = needByDeck.get(deck.id) as Map<CardKey, number>;
    const lockedNames: CardKey[] = [];
    let latest: NameLock | null = null;
    let complete = need.size > 0;
    for (const [k, n] of need) {
      const own = lockOf.get(`${deck.id}|${k}`);
      if (own) {
        lockedNames.push(k);
        if (!latest || compareLockOrder(own, latest) > 0) latest = own;
      }
      const pool = byCard[k];
      // available(D, k) = owned − Σ holds of the other decks (SHARE-010, SHARE-011).
      const available = pool.ownedForDecks - (pool.heldTotal - (own ? n : 0));
      if (available < n) complete = false;
    }
    const locked = need.size > 0 && lockedNames.length === need.size;
    byDeck[deck.id] = {
      deckId: deck.id,
      locked,
      lockedAt: locked && latest ? latest.lockedAt : null,
      lockedNames,
      complete,
    };
  }

  return { locksIgnored, byCard, byDeck };
}

/**
 * SPEC-008 `availability(pool, deckId, cardKey)`: what deck D sees for card k (SHARE-010, SHARE-011, SHARE-015,
 * SHARE-043). A cardKey not in `pool.byCard` (a card no deck uses) gets all zeros.
 */
export function availability(pool: SharedPool, deckId: string, cardKey: CardKey): CardAvailability {
  const card = pool.byCard[cardKey];
  if (!card) {
    return {
      deckId,
      cardKey,
      ownedForDecks: 0,
      ownedExcluded: 0,
      lockedByOthers: 0,
      available: 0,
      need: 0,
      heldByThisDeck: null,
      nameLocked: false,
      otherUses: [],
    };
  }
  const own = card.uses.find((u) => u.deckId === deckId);
  const hold = own?.hold ?? 0;
  const nameLocked = own?.locked ?? false;
  const lockedByOthers = card.heldTotal - hold;
  return {
    deckId,
    cardKey,
    ownedForDecks: card.ownedForDecks,
    ownedExcluded: card.ownedExcluded,
    lockedByOthers,
    available: Math.max(0, card.ownedForDecks - lockedByOthers),
    need: own?.need ?? 0,
    heldByThisDeck: nameLocked ? hold : null,
    nameLocked,
    otherUses: card.uses.filter((u) => u.deckId !== deckId),
  };
}

/** Counted cardKeys of `deck` with available < need in `pool` (SHARE-020 `incomplete`). */
function cardsShortIn(pool: SharedPool, deck: UserDeck): number {
  let n = 0;
  for (const [k, need] of deckNeeds(deck)) if (availability(pool, deck.id, k).available < need) n++;
  return n;
}

/**
 * SPEC-008 `canLock(pool, deck, readOnly, isLocked)` (SHARE-020): the deck-level toggle's check, the first failing
 * one in the order already-locked → read-only → locks-unreadable → ownership-unavailable → no-cards → incomplete.
 * `pool === null` means ownership is unavailable (OWN-062/063). `isLocked` = every counted name of the deck has a
 * name lock in a readable lock store (v0.6, SHARE-083), so `already-locked` is returned also with a null pool
 * (SHARE-053). With an unreadable lock store the caller passes `false` and the reason is `locks-unreadable`. A
 * partly locked deck is not locked: its toggle locks the names still open, so the whole deck must be complete.
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
    return { ok: false, reason: 'incomplete', cardsShort: state ? cardsShortIn(pool, deck) : deckNeeds(deck).size };
  }
  return { ok: true };
}

/**
 * SPEC-008 `canLockName(pool, deck, cardKey, readOnly, isNameLocked)` (SHARE-081): pure. The first failing check in
 * the order already-locked → read-only → locks-unreadable → ownership-unavailable → not-in-deck → not-full. A name
 * can be locked only when need ≥ 1 and available ≥ need (every tile of the name fully coloured in). `not-full`
 * carries `available` (capped at need) and `need` for its message. No legality and no complete deck are needed.
 */
export function canLockName(
  pool: SharedPool | null,
  deck: UserDeck,
  cardKey: CardKey,
  readOnly: boolean,
  isNameLocked: boolean,
): NameLockCheck {
  if (isNameLocked) return { ok: false, reason: 'already-locked' };
  if (readOnly) return { ok: false, reason: 'read-only' };
  if (pool?.locksIgnored) return { ok: false, reason: 'locks-unreadable' };
  if (!pool) return { ok: false, reason: 'ownership-unavailable' };
  const need = deckNeeds(deck).get(cardKey) ?? 0;
  if (need < 1) return { ok: false, reason: 'not-in-deck' };
  const available = availability(pool, deck.id, cardKey).available;
  if (available < need) return { ok: false, reason: 'not-full', available: Math.min(available, need), need };
  return { ok: true };
}

/**
 * SPEC-008 SHARE-053 (a) / SPEC-005 OWN-065 (a): a deck's lock state while ownership is unavailable, built from the
 * stored name locks (no ownership needed): `{ locked: true, lockedAt, lockedNames, complete: false }` when every
 * counted name of `deck` has a stored name lock (lockedAt = the latest in lock order), else null; null for every deck
 * when the lock store is unreadable (`locks === null`, SHARE-061). Holds are unknown (SHARE-053 (f)).
 */
export function storedLockState(locks: readonly NameLock[] | null, deck: UserDeck): DeckLockState | null {
  if (!locks) return null;
  const names = storedLockedNames(locks, deck);
  const need = deckNeeds(deck);
  if (need.size === 0 || names.length !== need.size) return null;
  const own = locks.filter((l) => l.deckId === deck.id && need.has(l.cardKey)).sort(compareLockOrder);
  return { deckId: deck.id, locked: true, lockedAt: own[own.length - 1].lockedAt, lockedNames: names, complete: false };
}

/** The counted names of `deck` with a stored name lock, deck order (used while ownership is unavailable). */
export function storedLockedNames(locks: readonly NameLock[] | null, deck: UserDeck): CardKey[] {
  if (!locks) return [];
  const own = new Set(locks.filter((l) => l.deckId === deck.id).map((l) => l.cardKey));
  return [...deckNeeds(deck).keys()].filter((k) => own.has(k));
}

/** "1 card short" / "3 cards short" (SHARE-020 `incomplete`). */
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

/**
 * SHARE-081 disabled-reason text for a failed `NameLockCheck` (the `not-full` text is the spec's proposal wording):
 * "Lock needs every copy available: 2 of 3"; null for ok and `already-locked` (the control shows Unlock instead).
 */
export function nameLockCheckMessage(check: NameLockCheck): string | null {
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
    case 'not-in-deck':
      return null;
    case 'not-full':
      return `Lock needs every copy available: ${check.available ?? 0} of ${check.need ?? 0}`;
  }
}

/**
 * SPEC-008 `lockLosses(before, after)` (SHARE-087…091): pure. The name locks that hold copies in `before` and no
 * longer can in `after` (dropped whole by SHARE-090, so they are not locked in `after`), latest lock first, with the
 * copies each held and whether its deck stops being locked. `after` is the pool for the collection as it would be
 * after the change (a Replace import, the snapshot an import Undo restores), computed before anything is written,
 * with the same stored locks; or, after a sync, the merged state. Empty when free copies cover the change (no
 * dialog, no notice). A deck missing from `after` is not listed (it was removed, not unlocked).
 */
export function lockLosses(before: SharedPool, after: SharedPool): LockLoss[] {
  if (before.locksIgnored) return [];
  const losses: (LockLoss & { lockedAt: string })[] = [];
  for (const card of Object.values(before.byCard)) {
    for (const u of card.uses) {
      if (!u.locked || !after.byDeck[u.deckId]) continue;
      const now = after.byCard[card.cardKey]?.uses.find((x) => x.deckId === u.deckId);
      if (now?.locked) continue;
      losses.push({
        deckId: u.deckId,
        deckName: u.deckName,
        cardKey: card.cardKey,
        cardName: card.cardName,
        copies: u.hold,
        deckUnlocks: (before.byDeck[u.deckId]?.locked ?? false) && !(after.byDeck[u.deckId]?.locked ?? false),
        lockedAt: u.lockedAt ?? '',
      });
    }
  }
  losses.sort((a, b) => -compareLockOrder(a, b));
  return losses.map((l) => ({
    deckId: l.deckId,
    deckName: l.deckName,
    cardKey: l.cardKey,
    cardName: l.cardName,
    copies: l.copies,
    deckUnlocks: l.deckUnlocks,
  }));
}

/** SHARE-042 shared indicator: "Also in 1 other deck · 1 locked"; null with no other use. (Not displayed since H-663.) */
export function sharedIndicator(otherUses: readonly CardUse[]): string | null {
  const n = otherUses.length;
  if (n === 0) return null;
  const m = otherUses.filter((u) => u.locked).length;
  return `Also in ${n} other ${n === 1 ? 'deck' : 'decks'}${m > 0 ? ` · ${m} locked` : ''}`;
}
