import {
  DECK_ID_PATTERN,
  DECK_LIST_ZONES,
  DECK_SOURCE_FORMATS,
  FORMAT_IDS,
  LIMITS,
  TAG_COLOURS,
  deckCards,
} from '../storage/records';
import type { CloudAssignment, CloudCard, CloudLock, CloudTag, DeckDoc } from './sync-types';

/**
 * SYNC-047: the client checks each pulled item against SYNC-013…018 and the SPEC-003/006/007 limits,
 * because the rules cannot check map entries (SYNC-112). Invalid items are skipped by the merge.
 */

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const isStr = (v: unknown, min: number, max: number): v is string =>
  typeof v === 'string' && v.length >= min && v.length <= max;

export function validCard(v: unknown): v is CloudCard {
  if (!isObj(v) || !isInt(v['q'], 0, LIMITS.maxCardQuantity) || !isTime(v['t']) || !isObj(v['p'])) return false;
  const counts = Object.values(v['p']);
  if (!counts.every((n) => isInt(n, 1, LIMITS.maxCardQuantity))) return false;
  const sum = (counts as number[]).reduce((s, n) => s + n, 0);
  if (v['q'] === 0) return counts.length === 0;
  return sum <= v['q']; // COLL-002
}

export function validTag(v: unknown): v is CloudTag {
  if (!isObj(v) || !isTime(v['updatedAt'])) return false;
  if (v['deleted'] === true) return Object.keys(v).length === 2;
  return (
    isStr(v['label'], 1, LIMITS.maxTagLabel) &&
    isStr(v['key'], 1, 200) &&
    (v['colour'] === null || TAG_COLOURS.includes(v['colour'] as never)) &&
    typeof v['excludeFromDecks'] === 'boolean' &&
    isTime(v['createdAt'])
  );
}

export function validAssignment(v: unknown): v is CloudAssignment {
  return (
    isObj(v) &&
    isTime(v['t']) &&
    Array.isArray(v['a']) &&
    v['a'].length <= LIMITS.maxTagsPerTarget &&
    v['a'].every((x) => typeof x === 'string') &&
    new Set(v['a']).size === v['a'].length
  );
}

export function validLock(v: unknown): v is CloudLock {
  return isObj(v) && isTime(v['updatedAt']) && (v['lockedAt'] === null || isTime(v['lockedAt']));
}

function validDeckCard(v: unknown): boolean {
  return isObj(v) && isStr(v['cardKey'], 1, 500) && typeof v['name'] === 'string' && isInt(v['qty'], 1, LIMITS.maxDeckQty);
}

export function validDeck(id: string, v: unknown): v is DeckDoc {
  if (!DECK_ID_PATTERN.test(id) || !isObj(v)) return false;
  if (!isTime(v['createdAt']) || !isTime(v['updatedAt'])) return false;
  if (v['deletedAt'] !== null) return isTime(v['deletedAt']);
  const src = v['source'];
  if (!isObj(src) || (src['kind'] !== 'user' && src['kind'] !== 'tournament')) return false;
  if (
    !isStr(v['name'], 1, LIMITS.maxDeckName) ||
    !FORMAT_IDS.includes(v['format'] as never) ||
    !DECK_SOURCE_FORMATS.includes(v['sourceFormat'] as never) ||
    !isStr(v['notes'], 0, LIMITS.maxDeckNotes) ||
    typeof v['catalogVersion'] !== 'string'
  )
    return false;
  for (const slot of ['legend', 'champion'] as const) {
    if (v[slot] !== null && !validDeckCard(v[slot])) return false;
  }
  for (const z of DECK_LIST_ZONES) {
    const list = v[z];
    if (!Array.isArray(list) || list.length > LIMITS.maxDeckEntries || !list.every(validDeckCard)) return false;
  }
  if (v['duplicatedFrom'] !== undefined && typeof v['duplicatedFrom'] !== 'string') return false;
  const removed = v['importRemovedLines'];
  if (removed !== undefined && (!Array.isArray(removed) || !removed.every((x) => typeof x === 'string'))) return false;
  const cards = deckCards(v as unknown as Parameters<typeof deckCards>[0]);
  return cards.length <= LIMITS.maxDeckEntries && cards.reduce((s, c) => s + c.qty, 0) <= LIMITS.maxDeckCopies;
}
