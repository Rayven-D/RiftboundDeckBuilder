import type { StoredCollection, StoredDeckLocks, StoredTags } from '../storage/records';
import type { LocalSnapshot } from './merge';
import { deckToDoc } from './merge';
import { PendingList, TOMBSTONE_TTL_MS, cloneLog, isoToMs, itemRef, removePending } from './sync-log';
import type {
  CloudAssignment,
  CloudCard,
  CloudLock,
  CloudTag,
  DeckDoc,
  ItemStamp,
  Ms,
  PushChanges,
  PushOutcome,
  StoredSyncLog,
} from './sync-types';

/** SYNC-112 map caps (design decision 7). */
export const MAP_CAPS = { cards: 6000, tags: 400, assignments: 6000, locks: 400 } as const;

export interface PlannedItem {
  list: PendingList;
  key: string;
  /** Stamp at plan time: the item leaves the pending set only if it did not change meanwhile. */
  t: Ms;
}

export interface PushPlan {
  changes: PushChanges;
  /** Items carried by each document write ('collection' | 'tags' | 'locks' | 'deck:<id>'). */
  items: Record<string, PlannedItem[]>;
  /** Tombstones removed with `deleteField()` per document (SYNC-034, SYNC-119). */
  purged: Record<'collection' | 'tags' | 'locks', PlannedItem[]>;
  /** Documents not sent because their live items alone exceed the cap (SYNC-119 → SYNC-124). */
  tooLarge: string[];
  empty: boolean;
}

export interface PlanOptions {
  now: Ms;
  /** Areas not to write: newer cloud schema (SYNC-046), e.g. 'collection' or 'deck:<id>'. */
  readOnly: readonly string[];
  /** Account write (SYNC-012): `update()` of `lastClientVersion` when this device's build changed. */
  account?: PushChanges['account'];
}

const rec = <T>(a: T | null | 'unreadable'): T | null => (a && a !== 'unreadable' ? a : null);

/**
 * Builds one push from the pending set (SYNC-043). Pure. Rejected items (SYNC-118), unreadable areas
 * (SYNC-033), newer-schema areas (SYNC-046) and deck deletions still inside the Undo window
 * (SYNC-035) are left out and stay pending.
 */
export function planPush(local: LocalSnapshot, log: StoredSyncLog, opts: PlanOptions): PushPlan {
  const { now } = opts;
  const plan: PushPlan = {
    changes: {},
    items: {},
    purged: { collection: [], tags: [], locks: [] },
    tooLarge: [],
    empty: true,
  };
  const rejected = new Set(log.rejected);
  const pendingOf = (list: PendingList) => log.pending[list].filter((k) => !rejected.has(itemRef(list, k)));
  const expired = (t: Ms) => t < now - TOMBSTONE_TTL_MS;
  const ro = new Set(opts.readOnly);

  if (opts.account) {
    plan.changes.account = opts.account;
    plan.empty = false;
  }

  // ---- Decks first: a lock is pushed only with (or after) its deck (SYNC-076) ----
  const decks = new Map((local.decks ?? []).map((d) => [d.id, d]));
  const deckDocs: Record<string, DeckDoc> = {};
  for (const id of pendingOf('decks')) {
    if (local.unreadableDecks.includes(id) || ro.has(`deck:${id}`)) continue;
    const tomb = log.deckTombstones[id];
    const deck = decks.get(id);
    if (tomb && !deck) {
      if (tomb.pushAfter > now) continue; // SYNC-035 Undo window
      deckDocs[id] = {
        schemaVersion: 1,
        createdAt: tomb.createdAt,
        updatedAt: tomb.deletedAt,
        deletedAt: tomb.deletedAt,
        syncedAt: 0,
      };
      plan.items[`deck:${id}`] = [{ list: 'decks', key: id, t: tomb.deletedAt }];
    } else if (deck) {
      deckDocs[id] = deckToDoc(deck);
      plan.items[`deck:${id}`] = [{ list: 'decks', key: id, t: isoToMs(deck.updatedAt) }];
    }
  }
  const hardDelete = Object.entries(log.deckTombstones)
    .filter(([id, t]) => expired(t.deletedAt) && !log.pending.decks.includes(id) && log.cloudDocs.includes(`deck:${id}`))
    .map(([id]) => id);
  if (Object.keys(deckDocs).length) {
    plan.changes.decks = deckDocs;
    plan.empty = false;
  }
  if (hardDelete.length) {
    plan.changes.hardDelete = hardDelete;
    plan.empty = false;
  }

  // ---- Collection (SYNC-013, SYNC-014) ----
  const collection = rec(local.collection);
  if (local.collection !== 'unreadable' && !ro.has('collection')) {
    const keys = pendingOf('cards');
    const replace = !!log.pending.collectionReplace || !log.cloudDocs.includes('collection');
    if (keys.length || log.pending.collectionReplace) {
      const area = planMap('collection', 'cards', log.cards, replace ? Object.keys(log.cards) : keys, MAP_CAPS.cards, now, plan, (k, e) =>
        cardValue(collection, k, e),
      );
      if (area) {
        plan.changes.collection = {
          replace,
          updatedAt: area.updatedAt,
          cards: area.values as Record<string, CloudCard>,
          purge: area.purge,
          catalogVersion: collection?.catalogVersion ?? '',
        };
        plan.empty = false;
      }
    }
  }

  // ---- Tags (SYNC-015) ----
  const tagsRec = rec(local.tags);
  if (local.tags !== 'unreadable' && !ro.has('tags')) {
    const tagKeys = pendingOf('tags');
    const targetKeys = pendingOf('assignments');
    if (tagKeys.length || targetKeys.length) {
      const replace = !log.cloudDocs.includes('tags');
      const t = planMap('tags', 'tags', log.tags, replace ? Object.keys(log.tags) : tagKeys, MAP_CAPS.tags, now, plan, (k, e) =>
        tagValue(tagsRec, k, e),
      );
      const a = planMap(
        'tags',
        'assignments',
        log.assignments,
        replace ? Object.keys(log.assignments) : targetKeys,
        MAP_CAPS.assignments,
        now,
        plan,
        (k, e) => assignmentValue(tagsRec, k, e),
      );
      if (t || a) {
        plan.changes.tags = {
          replace,
          updatedAt: Math.max(t?.updatedAt ?? 0, a?.updatedAt ?? 0),
          tags: (t?.values ?? {}) as Record<string, CloudTag>,
          assignments: (a?.values ?? {}) as Record<string, CloudAssignment>,
          purgeTags: t?.purge ?? [],
          purgeAssignments: a?.purge ?? [],
        };
        plan.empty = false;
      }
    }
  }

  // ---- Locks (SYNC-017) ----
  const locksRec = rec(local.locks);
  if (local.locks !== 'unreadable' && !ro.has('locks')) {
    const deckInCloud = (id: string) => log.cloudDocs.includes(`deck:${id}`) || (id in deckDocs && deckDocs[id].deletedAt === null);
    const replace = !log.cloudDocs.includes('locks');
    const keys = (replace ? Object.keys(log.locks) : pendingOf('locks')).filter(
      (id) => log.locks[id]?.unlocked || deckInCloud(id),
    );
    if (keys.length && (!replace || pendingOf('locks').length > 0)) {
      const lockEntries = Object.fromEntries(
        Object.entries(log.locks).map(([k, e]) => [k, { t: e.t, deleted: e.unlocked, h: e.h }]),
      );
      const area = planMap('locks', 'locks', lockEntries, keys, MAP_CAPS.locks, now, plan, (k, e) =>
        lockValue(locksRec, k, e),
      );
      if (area) {
        plan.changes.locks = { replace, updatedAt: area.updatedAt, locks: area.values as Record<string, CloudLock>, purge: area.purge };
        plan.empty = false;
      }
    }
  }

  return plan;
}

/**
 * The first-sign-in flow's only write (SYNC-048, SYNC-050): the account `set()` (case a) or `update()`
 * (cases c / e when this build differs). Nothing else is sent, even if the download left an item pending
 * or an expired deck tombstone to purge: those wait for the first regular push.
 */
export function planAccountPush(account: NonNullable<PushChanges['account']>): PushPlan {
  return {
    changes: { account },
    items: {},
    purged: { collection: [], tags: [], locks: [] },
    tooLarge: [],
    empty: false,
  };
}

/**
 * One map of one document: values for `keys`, expired tombstones purged (SYNC-034), and the oldest
 * tombstones dropped early when the map would pass its cap (SYNC-119). Null when nothing is sent.
 */
function planMap(
  doc: 'collection' | 'tags' | 'locks',
  list: PendingList,
  entries: Record<string, ItemStamp>,
  keys: string[],
  cap: number,
  now: Ms,
  plan: PushPlan,
  value: (key: string, e: ItemStamp) => unknown,
): { values: Record<string, unknown>; purge: string[]; updatedAt: Ms } | null {
  const all = Object.entries(entries);
  const tombs = all.filter(([, e]) => e.deleted).sort((a, b) => a[1].t - b[1].t);
  const purge = new Set(tombs.filter(([, e]) => e.t < now - TOMBSTONE_TTL_MS).map(([k]) => k));
  const live = all.length - tombs.length;
  if (live > cap) {
    plan.tooLarge.push(doc);
    return null;
  }
  for (const [k] of tombs) {
    if (all.length - purge.size <= cap) break;
    purge.add(k);
  }
  const values: Record<string, unknown> = {};
  let updatedAt = 0;
  const items = (plan.items[doc] ??= []);
  for (const k of keys) {
    const e = entries[k];
    if (!e) continue;
    if (purge.has(k)) continue;
    const v = value(k, e);
    if (v === undefined) continue;
    values[k] = v;
    updatedAt = Math.max(updatedAt, e.t);
    items.push({ list, key: k, t: e.t });
  }
  for (const k of purge) {
    // A purged tombstone is settled by the same write: the key is gone from the cloud map.
    plan.purged[doc].push({ list, key: k, t: entries[k].t });
    items.push({ list, key: k, t: entries[k].t });
  }
  if (!Object.keys(values).length && !purge.size) return null;
  return { values, purge: [...purge], updatedAt: updatedAt || now };
}

function cardValue(c: StoredCollection | null, k: string, e: ItemStamp): CloudCard | undefined {
  if (e.deleted) return { q: 0, t: e.t, p: {} };
  const card = c?.cards[k];
  return card ? { q: card.quantity, t: e.t, p: { ...card.byPrinting } } : undefined;
}

function tagValue(tags: StoredTags | null, id: string, e: ItemStamp): CloudTag | undefined {
  if (e.deleted) return { deleted: true, updatedAt: e.t };
  const t = tags?.tags.find((x) => x.id === id);
  return t
    ? {
        label: t.label,
        key: t.key,
        colour: t.colour,
        excludeFromDecks: t.excludeFromDecks,
        createdAt: isoToMs(t.createdAt),
        updatedAt: e.t,
      }
    : undefined;
}

function assignmentValue(tags: StoredTags | null, target: string, e: ItemStamp): CloudAssignment | undefined {
  if (e.deleted) return { a: [], t: e.t };
  const a = tags?.assignments[target];
  return a && a.length ? { a: [...a], t: e.t } : undefined;
}

function lockValue(locks: StoredDeckLocks | null, deckId: string, e: ItemStamp): CloudLock | undefined {
  if (e.deleted) return { lockedAt: null, updatedAt: e.t };
  const l = locks?.locks.find((x) => x.deckId === deckId);
  return l ? { lockedAt: isoToMs(l.lockedAt), updatedAt: e.t } : undefined;
}

/** Current stamp of an item in the log (decks: knownDecks). */
function currentStamp(log: StoredSyncLog, item: PlannedItem): Ms | undefined {
  if (item.list === 'decks') return log.deckTombstones[item.key]?.deletedAt ?? log.knownDecks[item.key];
  if (item.list === 'locks') return log.locks[item.key]?.t;
  return (log[item.list] as Record<string, ItemStamp>)[item.key]?.t;
}

/**
 * Applies the successful documents of a push to the log (pure): their items leave the pending set
 * unless they changed during the push, purged tombstones leave the log, and the documents are
 * known to exist in the cloud. Failed documents are untouched (they stay pending).
 */
export function applyPushSuccess(log: StoredSyncLog, plan: PushPlan, outcome: PushOutcome): StoredSyncLog {
  const next = cloneLog(log);
  const ok = (ref: string) => outcome[ref] === 'ok';
  for (const [ref, items] of Object.entries(plan.items)) {
    if (!ok(ref)) continue;
    if (!next.cloudDocs.includes(ref)) next.cloudDocs.push(ref);
    for (const item of items) if (currentStamp(next, item) === item.t) removePending(next, item.list, item.key);
    if (ref === 'collection') delete next.pending.collectionReplace;
  }
  for (const doc of ['collection', 'tags', 'locks'] as const) {
    if (!ok(doc)) continue;
    for (const item of plan.purged[doc]) {
      if (currentStamp(next, item) !== item.t) continue;
      if (item.list === 'locks') delete next.locks[item.key];
      else if (item.list !== 'decks') delete (next[item.list] as Record<string, ItemStamp>)[item.key];
      removePending(next, item.list, item.key);
    }
  }
  for (const id of plan.changes.hardDelete ?? []) {
    if (!ok(`delete:${id}`)) continue;
    delete next.deckTombstones[id];
    delete next.knownDecks[id];
    delete next.deckCreated?.[id];
    next.cloudDocs = next.cloudDocs.filter((r) => r !== `deck:${id}`);
  }
  if (plan.changes.account && ok('account')) next.pending.account = false;
  return next;
}

