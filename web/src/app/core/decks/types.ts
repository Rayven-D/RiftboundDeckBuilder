/**
 * Browser-side shapes for the deck ownership engine (SPEC-005 v0.4, SPEC-008 v0.2, SPEC-009 v0.2)
 * and the parts of SPEC-001/002/003/006/007 it reads. Shapes only; copied from the specs' data
 * contracts because `web/` can't import from `services/`. Keep in sync with the specs and with
 * brain/05-Services/API Contracts.md ("Browser-side shared types").
 */

import type { OwnershipState } from './tile-ownership';

export type CardKey = string;
export type PrintingId = string;
export type PrintingCode = string;
export type TagId = string;
/** 'YYYY-MM-DD'. */
export type IsoDate = string;
/** ISO 8601 UTC. */
export type IsoDateTime = string;

// ---- SPEC-001 v0.3 (subset the engine reads) ----
export type CardCategory =
  'legend' | 'champion' | 'unit' | 'spell' | 'gear' | 'rune' | 'battlefield' | 'token' | 'unknown';

export type VariantKind =
  'base' | 'showcase' | 'alt-art' | 'overnumbered' | 'signature' | 'promo' | 'unknown';

export interface CardSet {
  code: string;
  name: string;
  setOrder: number;
  releaseStatus: 'released' | 'preview' | null;
  printingCount: number;
}

export interface PlayableCard {
  cardKey: CardKey;
  name: string;
  type: string;
  category: CardCategory;
  domains: string[] | null;
  isChampionUnit: boolean | null;
  championTag: string | null;
  isSignature: boolean | null;
  isPreview: boolean | null;
  stats: { energy: number | null; might: number | null; cost: number | null; power: number | null };
  keywords: string[];
  tags: string[];
  text: string;
  flavorText: string | null;
  /** printingSortKey order (CARD-070). */
  printingIds: PrintingId[];
  defaultPrintingId: PrintingId;
}

export interface Printing {
  printingId: PrintingId;
  cardKey: CardKey;
  setCode: string;
  collectorNumber: string;
  publicCode: string | null;
  rarity: string | null;
  variant: { kind: VariantKind; label: string | null; evidence: string | null };
  art: { thumbnailUrl: string | null; fullUrl: string | null; artist: string | null };
}

// ---- SPEC-002 v0.3 (ban data and the legality fields the deck tile reads) ----
export type FormatId = string;
export type RegionId = string;
export type BanKind = 'card' | 'battlefield' | 'legend';
export interface BanEntry {
  name: string;
  kind: BanKind;
}
export interface BanWave {
  id: string;
  name: string;
  announced: IsoDate;
  /** Inclusive (LEGAL-B02). */
  effective: IsoDate;
  sourceUrl: string;
  add: BanEntry[];
  remove: BanEntry[];
  notes?: string;
}
export interface BanList {
  format: FormatId;
  region: RegionId;
  status: 'verified' | 'conflict';
  waves: BanWave[];
}
export interface BanListFile {
  schemaVersion: 1;
  dataVersion: string;
  lastVerified: IsoDate;
  lists: BanList[];
}
export type BanStatus =
  | { status: 'banned'; waveId: string; waveName: string; bannedSince: IsoDate }
  | { status: 'upcoming'; waveId: string; waveName: string; announced: IsoDate; effective: IsoDate }
  | { status: 'not-banned' };
/** The `LegalityResult` fields `summarizeDeck` reads; a full SPEC-002 `LegalityResult` fits. */
export interface LegalityVerdict {
  verdict: 'legal' | 'illegal' | 'incomplete';
  asOf: IsoDate;
}
/** The `FormatDef` field `summarizeDeck` reads (LEGAL-R08). */
export interface FormatName {
  id: FormatId;
  name: string;
}

// ---- SPEC-003 v0.6 ----
export interface StoredCollection {
  schemaVersion: 1;
  updatedAt: IsoDateTime;
  catalogVersion: string;
  cards: Record<CardKey, { quantity: number; byPrinting: Record<PrintingId, number> }>;
}

// ---- SPEC-007 v0.5 ----
export interface Tag {
  id: TagId;
  label: string;
  key: string;
  colour: string | null;
  excludeFromDecks: boolean;
  createdAt: IsoDateTime;
}
export type TagTarget = `p:${PrintingId}` | `u:${CardKey}`;
export interface StoredTags {
  schemaVersion: 2;
  updatedAt: IsoDateTime;
  tags: Tag[];
  assignments: Record<TagTarget, TagId[]>;
}
export interface StoredPrintingCodes {
  schemaVersion: 1;
  updatedAt: IsoDateTime;
  codes: Record<
    PrintingId,
    { code: PrintingCode; cardKey: CardKey; lastSeenCatalogVersion: string }
  >;
}
export interface CollectionCatalogView {
  catalogVersion: string;
  sets: CardSet[];
  cards: Record<CardKey, PlayableCard>;
  printings: Record<PrintingId, Printing>;
}
export interface DeckOwnershipInput {
  collection: StoredCollection;
  tags: StoredTags;
  printingCodes: StoredPrintingCodes;
  catalog: CollectionCatalogView;
}
export type EntryKind = 'printing' | 'unassigned' | 'missing-printing';
export interface DeckOwnershipEntry {
  entryId: TagTarget;
  kind: EntryKind;
  printingId: PrintingId | null;
  printingCode: PrintingCode | null;
  count: number;
  excluded: boolean;
  excludedByTagIds: TagId[];
}
export interface DeckOwnership {
  cardKey: CardKey;
  owned: number;
  ownedForDecks: number;
  ownedExcluded: number;
  /** printingSortKey order; unassigned, then missing-printing entries at the default printing. */
  entries: DeckOwnershipEntry[];
}

// ---- SPEC-006 v0.6 ----
export type DeckZone = 'legend' | 'champion' | 'main' | 'sideboard' | 'runes' | 'battlefields';
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
  sourceFormat: string;
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

// ---- SPEC-008 v0.2 ----
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
export interface SharedPoolInput {
  /** Every deck in the DeckStore (SHARE-005). */
  decks: readonly UserDeck[];
  /** null = lock store unreadable → all locks ignored (SHARE-061). */
  locks: readonly DeckLock[] | null;
  ownership: DeckOwnershipInput;
}
export interface CardUse {
  deckId: string;
  deckName: string;
  need: number;
  locked: boolean;
  /** 0 when not locked. */
  hold: number;
}
export interface CardPool {
  cardKey: CardKey;
  ownedForDecks: number;
  ownedExcluded: number;
  /** Σ hold over locked decks; ≤ ownedForDecks. */
  heldTotal: number;
  /** Every user of the card, SHARE-015 order. */
  uses: CardUse[];
}
export interface DeckLockState {
  deckId: string;
  locked: boolean;
  lockedAt: IsoDateTime | null;
  /** SHARE-014 (for a locked deck: not short). */
  complete: boolean;
  /** Locked and some hold < need (SHARE-033). */
  short: boolean;
  /** Counted cardKeys with allocated < need, deck order of first appearance. */
  cardsShort: CardKey[];
}
export interface SharedPool {
  locksIgnored: boolean;
  byCard: Record<CardKey, CardPool>;
  byDeck: Record<string, DeckLockState>;
}
export interface CardAvailability {
  deckId: string;
  cardKey: CardKey;
  ownedForDecks: number;
  ownedExcluded: number;
  lockedByOthers: number;
  available: number;
  need: number;
  /** H for a locked deck, null otherwise. */
  heldByThisDeck: number | null;
  /** SHARE-015 order, without this deck. */
  otherUses: CardUse[];
}
export type LockFailure =
  | 'already-locked'
  | 'no-cards'
  | 'incomplete'
  | 'ownership-unavailable'
  | 'locks-unreadable'
  | 'read-only';
export type LockCheck = { ok: true } | { ok: false; reason: LockFailure; cardsShort?: number };
export interface LockedShortfall {
  deckId: string;
  deckName: string;
  cardsShort: number;
}

// ---- SPEC-005 v0.4 ----
export type CollectionOwnership =
  { status: 'ok'; input: DeckOwnershipInput; shared: SharedPool } | { status: 'unavailable' };

export type CardBan = BanStatus | { status: 'unknown' };

export interface OwnedPrintingRow {
  kind: EntryKind;
  printingId: PrintingId | null;
  printingCode: PrintingCode | null;
  variantLabel: string | null;
  count: number;
  excludedByTagIds: TagId[];
  excludedByTagNames: string[];
}

export interface OwnershipCard {
  cardKey: CardKey;
  zone: DeckZone;
  name: string;
  isRune: boolean;
  required: number;
  allocated: number;
  fill: number;
  state: OwnershipState;
  /** '' when ownership is unavailable (OWN-062/063: no count labels). */
  label: string;
  sharedLabel: string | null;
  cardRequired: number;
  ownedForDecks: number;
  ownedExcluded: number;
  lockedByOthers: number;
  available: number;
  heldByThisDeck: number | null;
  otherUses: CardUse[];
  extra: number;
  allocationByZone: Partial<Record<DeckZone, { allocated: number; required: number }>>;
  printingsOwned: OwnedPrintingRow[];
  excludedPrintings: OwnedPrintingRow[];
  banStatus: CardBan;
  card: PlayableCard | null;
  imageUrl: string | null;
  flags: ('unknown-card' | 'preview')[];
}

export interface ZoneSection {
  zone: DeckZone;
  cards: OwnershipCard[];
  required: number;
  allocated: number;
}

export interface MissingLine {
  zone: DeckZone;
  cardKey: CardKey;
  name: string;
  missing: number;
}

export interface DeckOwnershipView {
  deckId: string;
  asOf: IsoDate;
  catalogVersion: string | null;
  ownershipAvailable: boolean;
  locksIgnored: boolean;
  lock: DeckLockState | null;
  sections: ZoneSection[];
  summary: {
    copiesRequired: number;
    copiesAvailable: number;
    cardsTotal: number;
    cardsFullyAvailable: number;
    copiesExcludedRelevant: number;
  };
  missing: MissingLine[];
  missingText: string;
}

export type OwnershipFilter = 'ready' | 'partial' | 'none' | 'locked';

export interface DeckTileSummary {
  deckId: string;
  name: string;
  sourceLine: string;
  legalityVerdict: 'legal' | 'illegal' | 'incomplete';
  legalityLabel: string;
  ownershipLine: string;
  ownershipFilter: OwnershipFilter;
  lockBadge: string | null;
  updatedAt: IsoDateTime;
}
