import {
  CollectionCard,
  StoredCollection,
  StoredDeckLocks,
  StoredTags,
  Tag,
  TagId,
  UserDeck,
} from '../storage/records';
import {
  addPending,
  canonicalJson,
  cloneLog,
  hashAssignment,
  hashCard,
  hashTag,
  isoToMs,
  msToIso,
  rememberCreated,
  removePending,
  unreject,
} from './sync-log';
import { nextStamp } from './stamp';
import {
  CollectionDoc,
  DeckDoc,
  DeckDocLive,
  KNOWN_DOC_SCHEMA,
  LocksDoc,
  Ms,
  StoredSyncLog,
  TagsDoc,
  isDeckTombstone,
  isTagTombstone,
} from './sync-types';
import { validAssignment, validCard, validDeck, validLock, validTag } from './validate';

/**
 * SYNC-041…047, SYNC-060…077: merge pulled documents into the local records. Pure function of
 * (local records, sync log, pulled documents, now) (SYNC-131).
 *
 * Merge writes are not user changes (SYNC-041): items taken from the cloud keep the pulled change
 * time and leave the pending set. Only rewritten tag lists, SYNC-065/071 tombstones and items the
 * local version won are (or stay) pending.
 */

/** A local area: the record, null when there is none yet, or 'unreadable' (SYNC-033). */
export type Area<T> = T | null | 'unreadable';

export interface LocalSnapshot {
  collection: Area<StoredCollection>;
  tags: Area<StoredTags>;
  locks: Area<StoredDeckLocks>;
  decks: UserDeck[];
  /** Deck ids whose stored record is newer or corrupt (DECK-091): never merged or pushed. */
  unreadableDecks: string[];
}

export interface PulledDocs {
  collection?: CollectionDoc;
  tags?: TagsDoc;
  locks?: LocksDoc;
  decks: Record<string, DeckDoc>;
  /** Every `decks` document was read (SYNC-045), so a missing one was purged (SYNC-044). */
  fullRead: boolean;
}

export interface MergeInput {
  local: LocalSnapshot;
  log: StoredSyncLog;
  pulled: PulledDocs;
  /** SYNC-044 applies only on a device that completed a full read with this uid before. */
  absentMeansDeleted: boolean;
  now: Ms;
}

export interface MergeResult {
  /** Records to write locally (only areas that changed). */
  collection?: StoredCollection;
  tags?: StoredTags;
  locks?: StoredDeckLocks;
  decksPut: UserDeck[];
  decksDelete: string[];
  log: StoredSyncLog;
  notices: string[];
  /** SYNC-047: at least one pulled item was invalid and skipped. */
  invalid: boolean;
  /** SYNC-046: areas whose cloud document is newer than this app ('collection' | 'tags' | 'locks' | 'deck:<id>'). */
  newerSchema: string[];
}

export const deckFromDoc = (id: string, d: DeckDocLive): UserDeck => {
  const deck: UserDeck = {
    schemaVersion: 1,
    id,
    name: d.name,
    format: d.format,
    source: d.source,
    sourceFormat: d.sourceFormat,
    notes: d.notes,
    createdAt: msToIso(d.createdAt),
    updatedAt: msToIso(d.updatedAt),
    catalogVersion: d.catalogVersion,
    legend: d.legend,
    champion: d.champion,
    main: d.main,
    sideboard: d.sideboard,
    runes: d.runes,
    battlefields: d.battlefields,
  };
  if (d.duplicatedFrom !== undefined) deck.duplicatedFrom = d.duplicatedFrom;
  if (d.importRemovedLines !== undefined) deck.importRemovedLines = d.importRemovedLines;
  return deck;
};

export const deckToDoc = (d: UserDeck): DeckDocLive => {
  const doc: DeckDocLive = {
    schemaVersion: d.schemaVersion,
    updatedAt: isoToMs(d.updatedAt),
    syncedAt: 0,
    createdAt: isoToMs(d.createdAt),
    deletedAt: null,
    name: d.name,
    format: d.format,
    source: d.source,
    sourceFormat: d.sourceFormat,
    notes: d.notes,
    catalogVersion: d.catalogVersion,
    legend: d.legend,
    champion: d.champion,
    main: d.main,
    sideboard: d.sideboard,
    runes: d.runes,
    battlefields: d.battlefields,
  };
  if (d.duplicatedFrom !== undefined) doc.duplicatedFrom = d.duplicatedFrom;
  if (d.importRemovedLines !== undefined) doc.importRemovedLines = d.importRemovedLines;
  return doc;
};

const sameCards = (a: UserDeck, b: UserDeck) => canonicalJson(cardsOf(a)) === canonicalJson(cardsOf(b));
const cardsOf = (d: UserDeck) => ({ l: d.legend, c: d.champion, m: d.main, s: d.sideboard, r: d.runes, b: d.battlefields });
const addCloudDoc = (log: StoredSyncLog, ref: string) => {
  if (!log.cloudDocs.includes(ref)) log.cloudDocs.push(ref);
};

export function mergePulled(input: MergeInput): MergeResult {
  const { local, pulled, now, absentMeansDeleted } = input;
  const log = cloneLog(input.log);
  const result: MergeResult = { decksPut: [], decksDelete: [], log, notices: [], invalid: false, newerSchema: [] };
  const iso = msToIso(now);

  // ---- Decks first: locks depend on the merged deck state (SYNC-071) ----
  const localDecks = new Map(local.decks.map((d) => [d.id, d]));
  const deletedNow = new Set<string>();
  const cloudWonDecks: { before: UserDeck; after: UserDeck }[] = [];
  for (const [id, doc] of Object.entries(pulled.decks)) {
    if (local.unreadableDecks.includes(id)) continue;
    if (doc.schemaVersion > KNOWN_DOC_SCHEMA) {
      result.newerSchema.push(`deck:${id}`);
      continue;
    }
    if (!validDeck(id, doc)) {
      result.invalid = true;
      continue;
    }
    addCloudDoc(log, `deck:${id}`);
    rememberCreated(log, id, doc.createdAt);
    const mine = localDecks.get(id);
    const tomb = log.deckTombstones[id];
    const localT = mine ? isoToMs(mine.updatedAt) : tomb ? tomb.deletedAt : -Infinity;
    if (doc.updatedAt < localT) {
      addPending(log, 'decks', id); // local won (SYNC-042)
      continue;
    }
    removePending(log, 'decks', id);
    unreject(log, 'decks', id);
    if (isDeckTombstone(doc)) {
      if (mine) {
        result.decksDelete.push(id);
        localDecks.delete(id);
      }
      deletedNow.add(id);
      log.deckTombstones[id] = { deletedAt: doc.deletedAt, pushAfter: 0, createdAt: doc.createdAt, wasPending: false };
      log.knownDecks[id] = doc.deletedAt;
    } else {
      const deck = deckFromDoc(id, doc);
      if (!mine || canonicalJson(mine) !== canonicalJson(deck)) {
        result.decksPut.push(deck);
        if (mine && !sameCards(mine, deck)) cloudWonDecks.push({ before: mine, after: deck });
        localDecks.set(id, deck);
      }
      delete log.deckTombstones[id];
      log.knownDecks[id] = doc.updatedAt;
    }
  }
  if (pulled.fullRead && absentMeansDeleted) {
    for (const [id] of localDecks) {
      if (id in pulled.decks || log.pending.decks.includes(id) || local.unreadableDecks.includes(id)) continue;
      result.decksDelete.push(id);
      localDecks.delete(id);
      deletedNow.add(id);
      delete log.knownDecks[id];
    }
    for (const id of Object.keys(log.deckTombstones)) {
      if (id in pulled.decks || log.pending.decks.includes(id)) continue;
      delete log.deckTombstones[id]; // purged in the cloud (SYNC-034)
      delete log.knownDecks[id];
      delete log.deckCreated?.[id];
      log.cloudDocs = log.cloudDocs.filter((r) => r !== `deck:${id}`);
    }
  }

  // ---- Collection (SYNC-013, SYNC-060, SYNC-061, SYNC-044) ----
  if (pulled.collection && local.collection !== 'unreadable') {
    const doc = pulled.collection;
    if (doc.schemaVersion > KNOWN_DOC_SCHEMA) result.newerSchema.push('collection');
    else {
      addCloudDoc(log, 'collection');
      const cards: Record<string, CollectionCard> = { ...(local.collection?.cards ?? {}) };
      let changed = false;
      for (const [k, c] of Object.entries(doc.cards ?? {})) {
        if (!validCard(c)) {
          result.invalid = true;
          continue;
        }
        const e = log.cards[k];
        if (c.t < (e?.t ?? -Infinity)) {
          addPending(log, 'cards', k);
          continue;
        }
        const value = c.q > 0 ? { quantity: c.q, byPrinting: { ...c.p } } : undefined;
        if (canonicalJson(cards[k]) !== canonicalJson(value)) {
          if (value) cards[k] = value;
          else delete cards[k];
          changed = true;
        }
        log.cards[k] = { t: c.t, deleted: !value, h: value ? hashCard(value) : '' };
        removePending(log, 'cards', k);
        unreject(log, 'cards', k);
      }
      if (absentMeansDeleted) {
        for (const k of Object.keys(log.cards)) {
          if (k in (doc.cards ?? {}) || log.pending.cards.includes(k)) continue;
          if (k in cards) {
            delete cards[k];
            changed = true;
          }
          delete log.cards[k];
        }
      }
      if (changed || !local.collection) {
        result.collection = {
          schemaVersion: 1,
          updatedAt: iso,
          catalogVersion: local.collection?.catalogVersion ?? doc.catalogVersion,
          cards,
        };
        log.recordUpdatedAt.collection = iso;
      }
    }
  }

  // ---- Tags and assignments (SYNC-015, SYNC-064…066) ----
  if (local.tags !== 'unreadable' && pulled.tags) {
    const doc = pulled.tags;
    if (doc && doc.schemaVersion > KNOWN_DOC_SCHEMA) result.newerSchema.push('tags');
    else {
      const merged = mergeTags(local.tags, doc, log, absentMeansDeleted, now, result);
      if (merged) {
        result.tags = { ...merged, updatedAt: iso };
        log.recordUpdatedAt.tags = iso;
      }
    }
  }

  // ---- Locks (SYNC-017, SYNC-070…076) ----
  if (local.locks !== 'unreadable' && !(pulled.locks && pulled.locks.schemaVersion > KNOWN_DOC_SCHEMA)) {
    const locks = new Map((local.locks?.locks ?? []).map((l) => [l.deckId, l.lockedAt]));
    let changed = false;
    const doc = pulled.locks;
    if (doc) {
      addCloudDoc(log, 'locks');
      for (const [deckId, cl] of Object.entries(doc.locks ?? {})) {
        if (!validLock(cl)) {
          result.invalid = true;
          continue;
        }
        const e = log.locks[deckId];
        if (cl.updatedAt < (e?.t ?? -Infinity)) {
          addPending(log, 'locks', deckId);
          continue;
        }
        const value = cl.lockedAt === null ? undefined : msToIso(cl.lockedAt);
        if (locks.get(deckId) !== value) {
          if (value) locks.set(deckId, value);
          else locks.delete(deckId);
          changed = true;
        }
        log.locks[deckId] = { t: cl.updatedAt, unlocked: !value, h: value ?? '' };
        removePending(log, 'locks', deckId);
        unreject(log, 'locks', deckId);
      }
      if (absentMeansDeleted) {
        for (const deckId of Object.keys(log.locks)) {
          if (deckId in (doc.locks ?? {}) || log.pending.locks.includes(deckId)) continue;
          if (locks.delete(deckId)) changed = true;
          delete log.locks[deckId];
        }
      }
    }
    // SYNC-071: deletion wins over a lock; the drop is written as a pending unlock tombstone.
    for (const deckId of [...locks.keys()]) {
      if (localDecks.has(deckId) || !(deletedNow.has(deckId) || log.deckTombstones[deckId])) continue;
      locks.delete(deckId);
      changed = true;
      log.locks[deckId] = { t: nextStamp(now, log.locks[deckId]?.t), unlocked: true, h: '' };
      addPending(log, 'locks', deckId);
    }
    if (changed) {
      result.locks = {
        schemaVersion: 1,
        updatedAt: iso,
        locks: [...locks].map(([deckId, lockedAt]) => ({ deckId, lockedAt })),
      };
      log.recordUpdatedAt.locks = iso;
    }
    // SYNC-072: a deck changed elsewhere while locked stays locked with its new cards.
    for (const { after } of cloudWonDecks) {
      if (locks.has(after.id)) result.notices.push(`'${after.name}' changed on another device while it was locked.`);
    }
  } else if (pulled.locks) {
    result.newerSchema.push('locks');
  }

  return result;
}

/** Returns the merged tags record, or null when nothing changed locally. Mutates `log` and `result`. */
function mergeTags(
  local: StoredTags | null,
  doc: TagsDoc | undefined,
  log: StoredSyncLog,
  absentMeansDeleted: boolean,
  now: Ms,
  result: MergeResult,
): StoredTags | null {
  const tags = new Map<TagId, Tag>((local?.tags ?? []).map((t) => [t.id, t]));
  const lists = new Map<string, TagId[]>(Object.entries(local?.assignments ?? {}).filter(([, a]) => a.length > 0));
  let changed = false;

  if (doc) {
    addCloudDoc(log, 'tags');
    for (const [id, ct] of Object.entries(doc.tags ?? {})) {
      if (!validTag(ct)) {
        result.invalid = true;
        continue;
      }
      const e = log.tags[id];
      if (ct.updatedAt < (e?.t ?? -Infinity)) {
        addPending(log, 'tags', id);
        continue;
      }
      if (isTagTombstone(ct)) {
        if (tags.delete(id)) changed = true;
        log.tags[id] = { t: ct.updatedAt, deleted: true, h: '' };
      } else {
        const tag: Tag = {
          id,
          label: ct.label,
          key: ct.key,
          colour: ct.colour,
          excludeFromDecks: ct.excludeFromDecks,
          createdAt: msToIso(ct.createdAt),
        };
        if (canonicalJson(tags.get(id)) !== canonicalJson(tag)) {
          tags.set(id, tag);
          changed = true;
        }
        log.tags[id] = { t: ct.updatedAt, deleted: false, h: hashTag(tag) };
      }
      removePending(log, 'tags', id);
      unreject(log, 'tags', id);
    }

    for (const [target, ca] of Object.entries(doc.assignments ?? {})) {
      if (!validAssignment(ca)) {
        result.invalid = true;
        continue;
      }
      const e = log.assignments[target];
      if (ca.t < (e?.t ?? -Infinity)) {
        addPending(log, 'assignments', target);
        continue;
      }
      takeCloudList(target, ca.a, ca.t);
    }

    if (absentMeansDeleted) {
      for (const id of Object.keys(log.tags)) {
        if (id in (doc.tags ?? {}) || log.pending.tags.includes(id)) continue;
        if (tags.delete(id)) changed = true;
        delete log.tags[id];
      }
      for (const target of Object.keys(log.assignments)) {
        if (target in (doc.assignments ?? {}) || log.pending.assignments.includes(target)) continue;
        if (lists.delete(target)) changed = true;
        delete log.assignments[target];
      }
    }
  }

  // SYNC-065: two live tags with the same key → keep the earlier createdAt (then lower id).
  const byKey = new Map<string, Tag[]>();
  for (const t of tags.values()) byKey.set(t.key, [...(byKey.get(t.key) ?? []), t]);
  for (const group of byKey.values()) {
    if (group.length < 2) continue;
    group.sort((a, b) => isoToMs(a.createdAt) - isoToMs(b.createdAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const [keep, ...drop] = group;
    for (const d of drop) {
      for (const [target, ids] of lists) {
        if (!ids.includes(d.id)) continue;
        const moved = ids.includes(keep.id) ? ids.filter((x) => x !== d.id) : ids.map((x) => (x === d.id ? keep.id : x));
        rewriteList(target, moved);
      }
      tags.delete(d.id);
      log.tags[d.id] = { t: nextStamp(now, log.tags[d.id]?.t), deleted: true, h: '' };
      addPending(log, 'tags', d.id);
      changed = true;
    }
  }

  // SYNC-066: ids of deleted or unknown tags are removed from every list.
  for (const [target, ids] of [...lists]) {
    const kept = ids.filter((x) => tags.has(x));
    if (kept.length !== ids.length) rewriteList(target, kept);
  }

  if (!changed && (local || !doc)) return null;
  return {
    schemaVersion: 3,
    updatedAt: local?.updatedAt ?? msToIso(now),
    tags: [...tags.values()],
    assignments: Object.fromEntries(lists),
  };

  function takeCloudList(target: string, a: TagId[], t: Ms): void {
    const mine = lists.get(target) ?? [];
    if (canonicalJson(mine) !== canonicalJson(a)) {
      if (a.length) lists.set(target, [...a]);
      else lists.delete(target);
      changed = true;
    }
    log.assignments[target] = { t, deleted: a.length === 0, h: a.length ? hashAssignment(a) : '' };
    removePending(log, 'assignments', target);
    unreject(log, 'assignments', target);
  }

  /** A list rewritten by the merge to a value neither side had: stamped and pending (SYNC-041). */
  function rewriteList(target: string, ids: TagId[]): void {
    if (ids.length) lists.set(target, ids);
    else lists.delete(target);
    log.assignments[target] = {
      t: nextStamp(now, log.assignments[target]?.t),
      deleted: ids.length === 0,
      h: ids.length ? hashAssignment(ids) : '',
    };
    addPending(log, 'assignments', target);
    changed = true;
  }
}
