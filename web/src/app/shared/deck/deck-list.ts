import {
  type BanListFile,
  type CollectionCatalogView,
  type CollectionOwnership,
  type NameLock,
  type DeckOwnershipInput,
  type DeckOwnershipView,
  type DeckTileSummary,
  type FormatName,
  type IsoDate,
  type LegalityVerdict,
  type SharedPool,
  type StoredCollection,
  type StoredPrintingCodes,
  type StoredTags,
  type UserDeck,
  computeDeckOwnership,
  computeSharedPool,
  summarizeDeck,
} from '../../core/decks';
import { OWNERSHIP_OPTION_LABEL } from './deck-status-chip';

/**
 * The Decks list model (SPEC-005 OWN-001…008, OWN-084, OWN-100…105; SPEC-008 SHARE-050…053; H-060). Pure: no Angular,
 * no storage, no clock. The page reads the stores, then `buildDeckList` computes **one** `SharedPool` and every
 * tile's `DeckOwnershipView` + `DeckTileSummary` before the first render (OWN-073, OWN-084, SHARE-071), and the
 * query functions filter, sort and count them.
 */

// ---------------------------------------------------------------- query

export type DeckSort = 'updated' | 'name' | 'added';
export type OwnOption = 'ready' | 'partial' | 'none';
export type LockOption = 'locked' | 'unlocked';
export type LegalityOption = 'legal' | 'illegal' | 'incomplete';
export type SourceOption = 'user' | 'tournament';

export interface DeckListQuery {
  readonly text: string;
  readonly own: OwnOption | null;
  readonly lock: LockOption | null;
  readonly legality: LegalityOption | null;
  readonly source: SourceOption | null;
  readonly sort: DeckSort;
}

export type DeckFilterKey = 'own' | 'lock' | 'legality' | 'source';

export const DEFAULT_DECK_QUERY: DeckListQuery = {
  text: '',
  own: null,
  lock: null,
  legality: null,
  source: null,
  sort: 'updated',
};

/** OWN-006 sort options, in menu order; the only three (AC 32). */
export const DECK_SORTS: readonly { value: DeckSort; label: string }[] = [
  { value: 'updated', label: 'Last updated' },
  { value: 'name', label: 'Name A–Z' },
  { value: 'added', label: 'Date added' },
];

export const OWN_OPTIONS: readonly OwnOption[] = ['ready', 'partial', 'none'];
export const LOCK_OPTIONS: readonly { value: LockOption | null; label: string }[] = [
  { value: null, label: 'All decks' },
  { value: 'locked', label: 'Locked' },
  { value: 'unlocked', label: 'Not locked' },
];
export const SOURCE_OPTIONS: readonly { value: SourceOption; label: string }[] = [
  { value: 'user', label: 'Imported' },
  { value: 'tournament', label: 'From Tournaments' },
];

/** OWN-006 legality options: the OWN-004 labels without the date, format name per LEGAL-R08. */
export function legalityOptions(formatName: string): { value: LegalityOption; label: string }[] {
  return [
    { value: 'legal', label: `Legal in ${formatName}` },
    { value: 'illegal', label: `Not legal in ${formatName} today` },
    { value: 'incomplete', label: 'Not fully checked' },
  ];
}

const ALLOWED = {
  own: ['ready', 'partial', 'none'],
  lock: ['locked', 'unlocked'],
  legality: ['legal', 'illegal', 'incomplete'],
  source: ['user', 'tournament'],
  sort: ['updated', 'name', 'added'],
} as const;

type UrlKey = keyof typeof ALLOWED;

/**
 * OWN-006 / OWN-105 (e): the URL query (`q`, `own`, `lock`, `legality`, `source`, `sort`) as a `DeckListQuery`.
 * Unknown values are ignored and counted for the notice "1 filter value not found and was ignored"; an empty value
 * is the default (not counted).
 */
export function parseDeckQuery(params: Readonly<Record<string, string | null | undefined>>): {
  query: DeckListQuery;
  ignored: number;
} {
  let ignored = 0;
  const pick = <K extends UrlKey>(key: K): (typeof ALLOWED)[K][number] | null => {
    const raw = params[key];
    if (raw === null || raw === undefined || raw === '') return null;
    if ((ALLOWED[key] as readonly string[]).includes(raw)) return raw as (typeof ALLOWED)[K][number];
    ignored += 1;
    return null;
  };
  const query: DeckListQuery = {
    text: params['q'] ?? '',
    own: pick('own'),
    lock: pick('lock'),
    legality: pick('legality'),
    source: pick('source'),
    sort: pick('sort') ?? 'updated',
  };
  return { query, ignored };
}

/** The URL parameters of a query, defaults left out (`sort=updated` too), so the default list is a clean `/decks`. */
export function deckQueryParams(q: DeckListQuery): Record<UrlKey | 'q', string | null> {
  return {
    q: q.text.trim() ? q.text : null,
    own: q.own,
    lock: q.lock,
    legality: q.legality,
    source: q.source,
    sort: q.sort === 'updated' ? null : q.sort,
  };
}

/** True when a search or any filter is on (the count line then reads "Showing x of y decks", OWN-105 (b)). */
export function isFiltered(q: DeckListQuery): boolean {
  return !!q.text.trim() || q.own !== null || q.lock !== null || q.legality !== null || q.source !== null;
}

/** Number of active filters (not the search): the Filters button's badge counts Legality and Source only. */
export function menuFilterCount(q: DeckListQuery): number {
  return (q.legality ? 1 : 0) + (q.source ? 1 : 0);
}

export function clearFilters(q: DeckListQuery): DeckListQuery {
  return { ...q, text: '', own: null, lock: null, legality: null, source: null };
}

/** OWN-105 (c): one removable chip per active filter, in toolbar order (search has its own clear control). */
export function activeFilters(q: DeckListQuery, formatName: string): { key: DeckFilterKey; label: string }[] {
  const out: { key: DeckFilterKey; label: string }[] = [];
  if (q.own) out.push({ key: 'own', label: OWNERSHIP_OPTION_LABEL[q.own] });
  if (q.lock) out.push({ key: 'lock', label: q.lock === 'locked' ? 'Locked' : 'Not locked' });
  if (q.legality) {
    const label = legalityOptions(formatName).find((o) => o.value === q.legality)?.label ?? '';
    out.push({ key: 'legality', label });
  }
  if (q.source) {
    out.push({ key: 'source', label: SOURCE_OPTIONS.find((o) => o.value === q.source)?.label ?? '' });
  }
  return out;
}

// ---------------------------------------------------------------- model

export interface DeckListEntry {
  readonly deck: UserDeck;
  readonly view: DeckOwnershipView;
  readonly summary: DeckTileSummary;
}

export interface DeckListModel {
  readonly entries: readonly DeckListEntry[];
  /** The one pool every tile used (SHARE-071); null while ownership is unavailable. */
  readonly pool: SharedPool | null;
  /** OWN-062: the collection or its tags couldn't be read. */
  readonly collectionUnreadable: boolean;
  /** OWN-063: the card catalog isn't loaded. */
  readonly catalogMissing: boolean;
  /** SHARE-061: the lock store couldn't be read; counts ignore every lock. */
  readonly locksUnreadable: boolean;
  /** OWN-015: ban data isn't loaded (one page notice, no ban flags). */
  readonly banUnknown: boolean;
}

export interface DeckListInput {
  /** Every deck in the store: readable ones and newer-schema ones shown read-only (DECK-091, OWN-064). */
  readonly decks: readonly UserDeck[];
  /** null = lock store unreadable (SHARE-061). */
  readonly locks: readonly NameLock[] | null;
  /** null = the collection or the tags couldn't be read (OWN-062). A missing record is an empty one, not null. */
  readonly collection: {
    readonly collection: StoredCollection;
    readonly tags: StoredTags;
    readonly printingCodes: StoredPrintingCodes;
  } | null;
  /** null = not loaded (OWN-063). */
  readonly catalog: CollectionCatalogView | null;
  readonly banData: BanListFile | null;
  readonly today: IsoDate;
  /** SPEC-002 verdict per deck, when a legality engine exists in `web/`; until then null → "Not fully checked". */
  readonly legality?: (deck: UserDeck) => LegalityVerdict | null;
  /** `FormatDef` of `standard` (LEGAL-R08); null = formats not loaded → "Not fully checked". */
  readonly format: FormatName | null;
}

/**
 * Builds every tile from one `SharedPool` (SHARE-071, OWN-073). A new `DeckOwnershipInput` object is made on every
 * call, so `cachedDeckOwnership` never serves stale counts (API Contracts). Ownership unavailable (collection or tags
 * unreadable, or no catalog): the `'unavailable'` variant carries the stored locks, so locked decks keep their badge
 * (SHARE-053, OWN-065; H-155).
 */
export function buildDeckList(input: DeckListInput): DeckListModel {
  let ownership: CollectionOwnership;
  let pool: SharedPool | null = null;
  if (input.collection && input.catalog) {
    const ownershipInput: DeckOwnershipInput = { ...input.collection, catalog: input.catalog };
    pool = computeSharedPool({ decks: input.decks, locks: input.locks, ownership: ownershipInput });
    ownership = { status: 'ok', input: ownershipInput, shared: pool };
  } else {
    ownership = { status: 'unavailable', locks: input.locks };
  }
  const entries = input.decks.map((deck): DeckListEntry => {
    const view = computeDeckOwnership(deck, ownership, input.catalog, input.banData, input.today);
    const summary = summarizeDeck(deck, view, input.legality?.(deck) ?? null, input.format);
    return { deck, view, summary };
  });
  return {
    entries,
    pool,
    collectionUnreadable: input.collection === null,
    catalogMissing: input.catalog === null,
    locksUnreadable: input.locks === null,
    banUnknown: input.banData === null,
  };
}

// ---------------------------------------------------------------- filter, sort, count

/** OWN-006 search: case- and accent-insensitive substring on the deck name. */
export function foldName(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('en');
}

const locked = (e: DeckListEntry) => e.view.lock?.locked ?? false;

/** Whether an entry matches the query, leaving out the filter `except` (for the chip counts and the hint). */
export function matchesDeck(e: DeckListEntry, q: DeckListQuery, except?: DeckFilterKey): boolean {
  const text = foldName(q.text.trim());
  if (text && !foldName(e.deck.name).includes(text)) return false;
  // SHARE-051: one group per deck; `locked` and `unavailable` match none of the three options.
  if (except !== 'own' && q.own && e.summary.ownershipFilter !== q.own) return false;
  if (except !== 'lock' && q.lock && locked(e) !== (q.lock === 'locked')) return false;
  if (except !== 'legality' && q.legality && e.summary.legalityVerdict !== q.legality) return false;
  if (except !== 'source' && q.source && e.deck.source.kind !== q.source) return false;
  return true;
}

/** COLL-034 name comparison: locale `en`, base sensitivity, numeric segments. */
const nameCollator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

const desc = (a: string, b: string) => (a < b ? 1 : a > b ? -1 : 0);

/** OWN-005: `updatedAt` descending; ties by `createdAt` descending, then `id`. */
function byDefault(a: DeckListEntry, b: DeckListEntry): number {
  return (
    desc(a.deck.updatedAt, b.deck.updatedAt) ||
    desc(a.deck.createdAt, b.deck.createdAt) ||
    (a.deck.id < b.deck.id ? -1 : a.deck.id > b.deck.id ? 1 : 0)
  );
}

/** OWN-005 / OWN-006: the matching decks in the chosen order (the whole list, never a page of it, OWN-084). */
export function queryDecks(entries: readonly DeckListEntry[], q: DeckListQuery): DeckListEntry[] {
  const out = entries.filter((e) => matchesDeck(e, q));
  if (q.sort === 'name') out.sort((a, b) => nameCollator.compare(a.deck.name, b.deck.name) || byDefault(a, b));
  else if (q.sort === 'added') out.sort((a, b) => desc(a.deck.createdAt, b.deck.createdAt) || byDefault(a, b));
  else out.sort(byDefault);
  return out;
}

/**
 * OWN-102 / OWN-105 (a): deck counts on the ownership chips, the user's own counts. Each counts the decks that match
 * every other filter and the search (so a chip says what choosing it would show); `all` is that total.
 */
export function ownershipCounts(
  entries: readonly DeckListEntry[],
  q: DeckListQuery,
): Record<OwnOption | 'all', number> {
  const counts = { all: 0, ready: 0, partial: 0, none: 0 };
  for (const e of entries) {
    if (!matchesDeck(e, q, 'own')) continue;
    counts.all += 1;
    const f = e.summary.ownershipFilter;
    if (f === 'ready' || f === 'partial' || f === 'none') counts[f] += 1;
  }
  return counts;
}

/**
 * OWN-105 (d): how many locked complete decks (`ownershipFilter: 'locked'`, SHARE-051) `own=ready` hides, among the
 * decks that match the other filters; 0 unless `own=ready`. At least 1 shows "Locked decks are under Locked."
 */
export function hiddenLockedCount(entries: readonly DeckListEntry[], q: DeckListQuery): number {
  if (q.own !== 'ready') return 0;
  return entries.filter((e) => e.summary.ownershipFilter === 'locked' && matchesDeck(e, q, 'own')).length;
}

/** OWN-105 (b) count line: "3 decks" / "1 deck"; with a search or filter "Showing 2 of 3 decks". */
export function deckCountLine(shown: number, total: number, filtered: boolean): string {
  if (filtered) return `Showing ${shown} of ${total} ${total === 1 ? 'deck' : 'decks'}`;
  return `${total} ${total === 1 ? 'deck' : 'decks'}`;
}
