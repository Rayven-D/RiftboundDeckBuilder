/**
 * Stored record shapes of the browser stores, copied from the specs' data contracts:
 * SPEC-003 `StoredCollection` / `CollectionStore`, SPEC-006 `UserDeck` / `DeckStore`,
 * SPEC-007 `StoredTags` / `TagStore` (with SPEC-010 SYNC-016: `schemaVersion: 3`, short tag ids),
 * SPEC-007 `StoredPrintingCodes`, `StoredViewState`, and SPEC-008 `StoredDeckLocks` / `DeckLockStore`.
 *
 * Pure types and small guards only: no Angular, no storage access.
 */

export type CardKey = string;
export type PrintingId = string;
export type PrintingCode = string;
/** 'YYYY-MM-DD'. */
export type IsoDate = string;
/** ISO 8601 UTC. */
export type IsoDateTime = string;

// ---- SPEC-003 ----
export interface CollectionCard {
  quantity: number;
  byPrinting: Record<PrintingId, number>;
}

export interface StoredCollection {
  schemaVersion: 1;
  updatedAt: IsoDateTime;
  catalogVersion: string;
  cards: Record<CardKey, CollectionCard>;
}

export interface CollectionStore {
  load(): Promise<StoredCollection | null>;
  save(c: StoredCollection): Promise<void>;
  loadPrevious(): Promise<StoredCollection | null>;
}

// ---- SPEC-007 (+ SYNC-016) ----
/** `t_` + 6 characters from [0-9A-Za-z] (SYNC-016). Older ids are migrated on load. */
export type TagId = string;
export type TagColour = 'grey' | 'red' | 'orange' | 'yellow' | 'green' | 'teal' | 'blue' | 'purple';
export const TAG_COLOURS: readonly TagColour[] = [
  'grey',
  'red',
  'orange',
  'yellow',
  'green',
  'teal',
  'blue',
  'purple',
];
/**
 * `p:<printingId>` or `u:<cardKey>`. SPEC-007 writes this as the template literal
 * `` `p:${PrintingId}` | `u:${CardKey}` ``; it is kept as `string` here because sync merges and
 * validates keys read from untrusted documents (SYNC-013) before they are known to match.
 */
export type TagTarget = string;

export interface Tag {
  id: TagId;
  label: string;
  key: string;
  colour: TagColour | null;
  excludeFromDecks: boolean;
  createdAt: IsoDateTime;
}

export interface StoredTags {
  schemaVersion: 3;
  updatedAt: IsoDateTime;
  tags: Tag[];
  assignments: Record<TagTarget, TagId[]>;
}

export interface TagStore {
  load(): Promise<StoredTags | null>;
  save(t: StoredTags): Promise<void>;
}

export interface StoredPrintingCodes {
  schemaVersion: 1;
  updatedAt: IsoDateTime;
  codes: Record<
    PrintingId,
    { code: PrintingCode; cardKey: CardKey; lastSeenCatalogVersion: string }
  >;
}

export interface PrintingCodeStore {
  load(): Promise<StoredPrintingCodes | null>;
  save(c: StoredPrintingCodes): Promise<void>;
}

/**
 * SPEC-007 `StoredViewState`. Only the tag filter is typed here: it is the one part another store
 * rewrites (SYNC-016 migration). The rest of `CollectionQuery` belongs to the Collection page (not built).
 */
export interface ViewQuery {
  tags: { ids: string[]; mode: 'any' | 'all' };
  [field: string]: unknown;
}
export interface StoredViewState {
  schemaVersion: 2;
  updatedAt: IsoDateTime;
  query: ViewQuery;
  savedViews?: { id: string; name: string; query: ViewQuery }[];
}
export interface CollectionViewStateStore {
  load(): Promise<StoredViewState | null>;
  save(s: StoredViewState): Promise<void>;
}

// ---- SPEC-006 ----
export type FormatId = 'standard';
export const FORMAT_IDS: readonly FormatId[] = ['standard'];
export type DeckSourceFormat =
  | 'riot-text'
  | 'plain-text'
  | 'piltover-code'
  | 'tts'
  | 'csv'
  | 'tournament'
  | 'manual';
export const DECK_SOURCE_FORMATS: readonly DeckSourceFormat[] = [
  'riot-text',
  'plain-text',
  'piltover-code',
  'tts',
  'csv',
  'tournament',
  'manual',
];

export interface DeckCard {
  cardKey: CardKey;
  name: string;
  qty: number;
}

export interface UserDeckSource {
  kind: 'user';
  text: string | null;
  url: string | null;
}

export interface TournamentDeckSource {
  kind: 'tournament';
  eventId: string;
  eventName: string;
  eventStartDate: IsoDate;
  eventEndDate: IsoDate;
  region: string;
  decklistId: string;
  publishedRank: number;
  placingLabel: string;
  pilot: string;
  sourceUrl: string;
  addedAt: IsoDateTime;
}

export type DeckSource = UserDeckSource | TournamentDeckSource;

export interface UserDeck {
  schemaVersion: 1;
  id: string;
  name: string;
  format: FormatId;
  source: DeckSource;
  sourceFormat: DeckSourceFormat;
  notes: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  catalogVersion: string;
  duplicatedFrom?: string;
  importRemovedLines?: string[];
  legend: DeckCard | null;
  champion: DeckCard | null;
  main: DeckCard[];
  sideboard: DeckCard[];
  runes: DeckCard[];
  battlefields: DeckCard[];
}

/** Zones that hold card lists, in SPEC-006 field order. */
export const DECK_LIST_ZONES = ['main', 'sideboard', 'runes', 'battlefields'] as const;

export interface DeckStore {
  list(): Promise<UserDeck[]>;
  get(id: string): Promise<UserDeck | null>;
  create(deck: UserDeck): Promise<void>;
  update(deck: UserDeck, basedOnUpdatedAt: IsoDateTime): Promise<'ok' | 'conflict'>;
  delete(id: string): Promise<UserDeck | null>;
}

// ---- SPEC-008 ----
export interface DeckLock {
  deckId: string;
  lockedAt: IsoDateTime;
}

export interface StoredDeckLocks {
  schemaVersion: 1;
  updatedAt: IsoDateTime;
  locks: DeckLock[];
}

export interface DeckLockStore {
  load(): Promise<StoredDeckLocks | null>;
  save(l: StoredDeckLocks): Promise<void>;
}

// ---- Limits used by stores and sync validation ----
export const LIMITS = {
  /** COLL-022 */
  maxTags: 200,
  maxTagsPerTarget: 20,
  maxTagLabel: 40,
  /** DECK-070, DECK-073, DECK-092 */
  maxDecks: 200,
  maxDeckName: 80,
  maxDeckNotes: 4000,
  maxDeckEntries: 150,
  maxDeckCopies: 300,
  maxDeckQty: 999,
  /** SYNC-013 */
  maxCardQuantity: 9999,
} as const;

/** Lowercase UUID, as SYNC-111 requires for a deck document id. */
export const DECK_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Every `DeckCard` of a deck (legend, champion, lists). */
export function deckCards(d: Pick<UserDeck, 'legend' | 'champion' | 'main' | 'sideboard' | 'runes' | 'battlefields'>): DeckCard[] {
  const out: DeckCard[] = [];
  if (d.legend) out.push(d.legend);
  if (d.champion) out.push(d.champion);
  for (const z of DECK_LIST_ZONES) out.push(...d[z]);
  return out;
}
