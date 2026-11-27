import { deckOwnership } from './deck-ownership';
import { compareLockOrder, deckNeeds } from './shared-pool';
import type {
  CardKey,
  DeckLockV1,
  IsoDateTime,
  NameLock,
  StoredCollection,
  StoredDeckLocks,
  StoredTags,
  UserDeck,
} from './types';

/**
 * SPEC-008 v0.6 card-name lock helpers that need no catalog (H-665): pure, no Angular, no storage, no clock.
 */

/** The collection and tags that `ownedForDecks` reads; null = they could not be read. */
export interface OwnershipRecords {
  collection: StoredCollection | null;
  tags: StoredTags | null;
}

const NO_CATALOG = { catalogVersion: '', sets: [], cards: {}, printings: {} };
const NO_CODES = { schemaVersion: 1 as const, updatedAt: '', codes: {} };
const NO_TAGS: StoredTags = { schemaVersion: 3, updatedAt: '', tags: [], assignments: {} };

/**
 * SPEC-007 COLL-081 `ownedForDecks(k)` from the collection and tags alone: quantity minus the copies of entries with
 * an "exclude from decks" tag. The catalog only orders entries, so it is not needed for the count; the one rule it
 * adds (a name the catalog doesn't have has pool 0, OWN-061) is left to `computeSharedPool`. Used where no catalog is
 * loaded: the sync merge (SHARE-091) and the v1 migration (SHARE-092).
 */
export function ownedForDecksOf(records: OwnershipRecords): (cardKey: CardKey) => number {
  const collection = records.collection ?? { schemaVersion: 1, updatedAt: '', catalogVersion: '', cards: {} };
  const input = { collection, tags: records.tags ?? NO_TAGS, printingCodes: NO_CODES, catalog: NO_CATALOG };
  const memo = new Map<CardKey, number>();
  return (k) => {
    let n = memo.get(k);
    if (n === undefined) {
      n = deckOwnership(input, k).ownedForDecks;
      memo.set(k, n);
    }
    return n;
  };
}

/**
 * SPEC-008 `migrateLocksV1(v1, decks, collection input)` (SHARE-092): pure. Each v1 deck lock (`{ deckId, lockedAt }`)
 * becomes a `NameLock` with the deck's `lockedAt` on **every counted name** the old rule held in full; a name the old
 * rule held short (v0.5 holds: min(need, copies left) in v1 lock order, so a later deck could hold less) gets none,
 * and the deck becomes partly locked (proposal, Open question 12; no notice). Orphans (deck missing) are dropped
 * (SHARE-062), and a second lock of one deck is ignored (v1 SHARE-022: the earliest wins). `ownership` null (the
 * collection or tags could not be read) keeps every name of every locked deck locked; a later settle (SHARE-090)
 * drops any that don't fit. The result is `schemaVersion: 2` with `updatedAt = now`.
 */
export function migrateLocksV1(
  v1: readonly DeckLockV1[],
  decks: readonly UserDeck[],
  ownership: OwnershipRecords | null,
  now: IsoDateTime,
): StoredDeckLocks {
  const byId = new Map(decks.map((d) => [d.id, d]));
  const owned = ownership ? ownedForDecksOf(ownership) : null;
  const held = new Map<CardKey, number>();
  const seen = new Set<string>();
  const locks: NameLock[] = [];
  for (const l of [...v1].sort(compareLockOrder)) {
    const deck = byId.get(l.deckId);
    if (!deck || seen.has(l.deckId)) continue;
    seen.add(l.deckId);
    for (const [k, need] of deckNeeds(deck)) {
      if (owned) {
        const left = Math.max(0, owned(k) - (held.get(k) ?? 0));
        const hold = Math.min(need, left);
        held.set(k, (held.get(k) ?? 0) + hold);
        if (hold < need) continue;
      }
      locks.push({ deckId: deck.id, cardKey: k, lockedAt: l.lockedAt });
    }
  }
  return { schemaVersion: 2, updatedAt: now, locks };
}
