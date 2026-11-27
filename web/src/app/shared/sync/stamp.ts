import { nameLockKey } from '../storage/records';
import type { StoredCollection, StoredDeckLocks, StoredTags, UserDeck } from '../storage/records';
import {
  PendingList,
  addPending,
  cloneLog,
  hashAssignment,
  hashCard,
  hashTag,
  isoToMs,
  msToIso,
  rememberCreated,
  removePending,
  unreject,
  DECK_UNDO_MS,
} from './sync-log';
import type { ItemStamp, LockStamp, Ms, StoredSyncLog } from './sync-types';

/**
 * SYNC-031 / SYNC-032 / SYNC-062: change stamps. Pure: every function returns a new log.
 *
 * Saves compare the new record with the sync log's view of the previous one (value hashes), which
 * is the same as comparing with the previous record while the log is reconciled (SYNC-032).
 */

/** Monotonic stamp: `max(now, previous + 1)` (SYNC-031, SYNC-062). */
export const nextStamp = (now: Ms, previous: Ms | undefined): Ms =>
  previous === undefined ? now : Math.max(now, previous + 1);

function stampItems(
  log: StoredSyncLog,
  list: Exclude<PendingList, 'decks' | 'locks'>,
  current: Record<string, string>,
  base: Ms,
): void {
  const entries = log[list] as Record<string, ItemStamp>;
  for (const [key, h] of Object.entries(current)) {
    const e = entries[key];
    if (e && !e.deleted && e.h === h) continue;
    entries[key] = { t: nextStamp(base, e?.t), deleted: false, h };
    addPending(log, list, key);
    unreject(log, list, key);
  }
  for (const [key, e] of Object.entries(entries)) {
    if (e.deleted || key in current) continue;
    entries[key] = { t: nextStamp(base, e.t), deleted: true, h: '' };
    addPending(log, list, key);
    unreject(log, list, key);
  }
}

const cardHashes = (c: StoredCollection) =>
  Object.fromEntries(Object.entries(c.cards).map(([k, v]) => [k, hashCard(v)]));
const tagHashes = (t: StoredTags) => Object.fromEntries(t.tags.map((x) => [x.id, hashTag(x)]));
const assignmentHashes = (t: StoredTags) =>
  Object.fromEntries(
    Object.entries(t.assignments)
      .filter(([, ids]) => ids.length > 0) // an empty list is the same as no assignment (tombstone)
      .map(([k, ids]) => [k, hashAssignment(ids)]),
  );

/** SYNC-031: a user save of the collection. */
export function stampCollection(log: StoredSyncLog, record: StoredCollection, now: Ms): StoredSyncLog {
  const next = cloneLog(log);
  stampItems(next, 'cards', cardHashes(record), now);
  next.recordUpdatedAt.collection = record.updatedAt;
  return next;
}

/** SYNC-031: a user save of the tags (tags and tag targets). */
export function stampTags(log: StoredSyncLog, record: StoredTags, now: Ms): StoredSyncLog {
  const next = cloneLog(log);
  stampItems(next, 'tags', tagHashes(record), now);
  stampItems(next, 'assignments', assignmentHashes(record), now);
  next.recordUpdatedAt.tags = record.updatedAt;
  return next;
}

/**
 * SYNC-031: a name lock changes when it is added, removed, or its `lockedAt` differs. Entries are keyed
 * `<deckId>|<cardKey>` (SYNC-017 v0.18); an entry of the old per-deck shape (key without `|`) is never current, so
 * it becomes a pending tombstone that the push removes from the cloud map (the SYNC-017 migration).
 */
export function stampLocks(log: StoredSyncLog, record: StoredDeckLocks, now: Ms): StoredSyncLog {
  const next = cloneLog(log);
  const current = Object.fromEntries(record.locks.map((l) => [nameLockKey(l.deckId, l.cardKey), l.lockedAt]));
  const entries: Record<string, LockStamp> = next.locks;
  for (const [deckId, lockedAt] of Object.entries(current)) {
    const e = entries[deckId];
    if (e && !e.unlocked && e.h === lockedAt) continue;
    entries[deckId] = { t: nextStamp(now, e?.t), unlocked: false, h: lockedAt };
    addPending(next, 'locks', deckId);
    unreject(next, 'locks', deckId);
  }
  for (const [deckId, e] of Object.entries(entries)) {
    if (e.unlocked || deckId in current) continue;
    entries[deckId] = { t: nextStamp(now, e.t), unlocked: true, h: '' };
    addPending(next, 'locks', deckId);
    unreject(next, 'locks', deckId);
  }
  next.recordUpdatedAt.locks = record.updatedAt;
  return next;
}

/**
 * SYNC-032 reconcile on load. A record whose `updatedAt` differs from the one the log last wrote is
 * stamped with the record's own `updatedAt` as the base time; unchanged items keep their stamps.
 * A missing record (null) never produces tombstones (SYNC-033).
 */
export function reconcileCollection(log: StoredSyncLog, record: StoredCollection | null): StoredSyncLog {
  if (!record || record.updatedAt === log.recordUpdatedAt.collection) return log;
  return stampCollection(log, record, baseTime(record.updatedAt));
}
export function reconcileTags(log: StoredSyncLog, record: StoredTags | null): StoredSyncLog {
  if (!record || record.updatedAt === log.recordUpdatedAt.tags) return log;
  return stampTags(log, record, baseTime(record.updatedAt));
}
export function reconcileLocks(log: StoredSyncLog, record: StoredDeckLocks | null): StoredSyncLog {
  if (!record || record.updatedAt === log.recordUpdatedAt.locks) return log;
  return stampLocks(log, record, baseTime(record.updatedAt));
}

const baseTime = (iso: string): Ms => {
  const ms = isoToMs(iso);
  return Number.isFinite(ms) ? ms : 0;
};

/**
 * SYNC-032 for decks: a deck whose `updatedAt` differs from `knownDecks` is pending; a known deck
 * missing from the store gets a tombstone. `unreadable` decks are never tombstoned (SYNC-033).
 */
export function reconcileDecks(
  log: StoredSyncLog,
  decks: readonly UserDeck[],
  unreadable: readonly string[],
  now: Ms,
): StoredSyncLog {
  const next = cloneLog(log);
  const present = new Set(decks.map((d) => d.id));
  for (const d of decks) {
    const ms = isoToMs(d.updatedAt);
    if (next.deckCreated?.[d.id] === undefined) rememberCreated(next, d.id, isoToMs(d.createdAt));
    if (next.knownDecks[d.id] === ms) continue;
    next.knownDecks[d.id] = ms;
    delete next.deckTombstones[d.id];
    addPending(next, 'decks', d.id);
  }
  for (const [id, known] of Object.entries(next.knownDecks)) {
    if (present.has(id) || unreadable.includes(id) || next.deckTombstones[id]) continue;
    const deletedAt = nextStamp(now, known);
    // SYNC-018: the tombstone carries the deck's createdAt (known only from the log here).
    const createdAt = next.deckCreated?.[id] ?? known;
    next.deckTombstones[id] = { deletedAt, pushAfter: now, createdAt, wasPending: false };
    next.knownDecks[id] = deletedAt;
    addPending(next, 'decks', id);
  }
  return changedDecks(log, next) ? next : log;
}

const changedDecks = (a: StoredSyncLog, b: StoredSyncLog) =>
  JSON.stringify([a.knownDecks, a.deckTombstones, a.pending.decks, a.deckCreated]) !==
  JSON.stringify([b.knownDecks, b.deckTombstones, b.pending.decks, b.deckCreated]);

/**
 * SYNC-031 deck save: `updatedAt = max(now, previous + 1 ms)`, previous being the version this device
 * last held (the stored record or `knownDecks`, local or pulled). Also covers re-creating a deck
 * whose tombstone was already pushed.
 */
export function stampDeckSave(
  log: StoredSyncLog,
  deck: UserDeck,
  previous: UserDeck | null,
  now: Ms,
): { deck: UserDeck; log: StoredSyncLog } {
  const next = cloneLog(log);
  const candidates = [next.knownDecks[deck.id], previous ? isoToMs(previous.updatedAt) : undefined].filter(
    (x): x is number => x !== undefined && Number.isFinite(x),
  );
  const prev = candidates.length ? Math.max(...candidates) : undefined;
  const updatedAt = nextStamp(now, prev);
  const stamped: UserDeck = { ...deck, updatedAt: msToIso(updatedAt) };
  next.knownDecks[deck.id] = updatedAt;
  rememberCreated(next, deck.id, isoToMs(deck.createdAt));
  delete next.deckTombstones[deck.id];
  addPending(next, 'decks', deck.id);
  unreject(next, 'decks', deck.id);
  return { deck: stamped, log: next };
}

/** SYNC-031 / SYNC-035: deck delete → tombstone `deletedAt = max(now, updatedAt + 1)`, pushed after the Undo window. */
export function stampDeckDelete(log: StoredSyncLog, deck: UserDeck, now: Ms): StoredSyncLog {
  const next = cloneLog(log);
  const prev = Math.max(isoToMs(deck.updatedAt), next.knownDecks[deck.id] ?? -Infinity);
  const deletedAt = nextStamp(now, prev);
  next.deckTombstones[deck.id] = {
    deletedAt,
    pushAfter: now + DECK_UNDO_MS,
    createdAt: isoToMs(deck.createdAt),
    wasPending: next.pending.decks.includes(deck.id),
  };
  next.knownDecks[deck.id] = deletedAt;
  addPending(next, 'decks', deck.id);
  unreject(next, 'decks', deck.id);
  return next;
}

/**
 * SYNC-035 Undo within the window: the pending tombstone is cancelled and the restored record keeps
 * its id and timestamps; nothing reaches the cloud. Returns null when there is nothing to cancel.
 */
export function cancelDeckDelete(log: StoredSyncLog, deck: UserDeck, now: Ms): StoredSyncLog | null {
  const tomb = log.deckTombstones[deck.id];
  if (!tomb || tomb.pushAfter === 0 || now >= tomb.pushAfter || !log.pending.decks.includes(deck.id)) return null;
  const next = cloneLog(log);
  delete next.deckTombstones[deck.id];
  next.knownDecks[deck.id] = isoToMs(deck.updatedAt);
  if (!tomb.wasPending) removePending(next, 'decks', deck.id);
  return next;
}
