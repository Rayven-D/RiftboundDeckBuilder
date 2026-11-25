import type { CollectionCard, Tag, TagId } from '../storage/records';
import type { StoredSyncLog } from './sync-types';

export const DAY_MS = 24 * 60 * 60 * 1000;
/** SYNC-034 */
export const TOMBSTONE_TTL_MS = 30 * DAY_MS;
/** SYNC-035 / DECK-083 */
export const DECK_UNDO_MS = 10_000;

export function emptySyncLog(): StoredSyncLog {
  return {
    schemaVersion: 1,
    uid: null,
    sessionExpected: false,
    recordUpdatedAt: { collection: null, tags: null, locks: null },
    knownDecks: {},
    rejected: [],
    cursors: { state: null, decks: null },
    lastFullSyncAt: null,
    lastSyncAt: null,
    clockOffsetMs: null,
    cards: {},
    tags: {},
    assignments: {},
    locks: {},
    deckTombstones: {},
    pending: { account: false, cards: [], tags: [], assignments: [], locks: [], decks: [] },
    cloudDocs: [],
    deckCreated: {},
    lastBuild: null,
    deletingUid: null,
    sessionLostUid: null,
    username: null,
  };
}

/** Deep copy (the log is plain JSON). Pure functions never mutate their input log. */
export function cloneLog(log: StoredSyncLog): StoredSyncLog {
  return structuredClone(log);
}

/** JSON with object keys sorted, so equal values hash equally (SYNC-032). */
export function canonicalJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(',')}]`;
  if (v !== null && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .sort()
      .filter((k) => o[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v);
}

/** 32-bit FNV-1a over the UTF-16 code units, as 8 hex digits (SYNC-032). */
export function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export const hashCard = (c: CollectionCard): string =>
  fnv1a(canonicalJson({ q: c.quantity, p: c.byPrinting }));
export const hashTag = (t: Tag): string =>
  fnv1a(
    canonicalJson({ label: t.label, key: t.key, colour: t.colour, x: t.excludeFromDecks, c: Date.parse(t.createdAt) }),
  );
export const hashAssignment = (ids: readonly TagId[]): string => fnv1a(canonicalJson(ids));

export type PendingList = 'cards' | 'tags' | 'assignments' | 'locks' | 'decks';

export function addPending(log: StoredSyncLog, list: PendingList, key: string): void {
  if (!log.pending[list].includes(key)) log.pending[list].push(key);
}

export function removePending(log: StoredSyncLog, list: PendingList, key: string): void {
  const i = log.pending[list].indexOf(key);
  if (i >= 0) log.pending[list].splice(i, 1);
}

/** Item ref used by `rejected` (SYNC-118). */
export const itemRef = (list: PendingList, key: string): string => `${list}:${key}`;

export function unreject(log: StoredSyncLog, list: PendingList, key: string): void {
  const ref = itemRef(list, key);
  log.rejected = log.rejected.filter((r) => r !== ref);
}

/** SYNC-018: remembers a deck's `createdAt` for its tombstone. */
export function rememberCreated(log: StoredSyncLog, id: string, createdAt: number): void {
  if (Number.isFinite(createdAt)) (log.deckCreated ??= {})[id] = createdAt;
}

/** Number of pending changes shown in the status (SYNC-084). */
export function pendingCount(log: StoredSyncLog): number {
  const p = log.pending;
  return p.cards.length + p.tags.length + p.assignments.length + p.locks.length + p.decks.length;
}

export const msToIso = (ms: number): string => new Date(ms).toISOString();
export const isoToMs = (iso: string): number => Date.parse(iso);
