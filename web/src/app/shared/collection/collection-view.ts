/**
 * Collection page view model (SPEC-007 v0.7 as cut down by the approved brief
 * brain/04-UI/Collection.md rev 3; SPEC-008 holds and availability). Pure functions of the stored
 * records, the catalog, ban data and today (COLL-068): no Angular, no storage, no clock.
 *
 * - One tile per entry (COLL-001/011/012/014), from SPEC-007 `deckOwnership()` so Collection and
 *   Decks read the same entries.
 * - Locks are per card name (SHARE-002): the lock summary belongs to the card and is shown on every
 *   printing tile of it, never allocated to a printing (brief §4).
 */
import { nameKey } from '../../core/cards/name-key';
import {
  availability,
  banStatus,
  cachedDeckOwnership,
  computeSharedPool,
  formatIsoDate,
  tileOwnership,
} from '../../core/decks';
import type {
  BanListFile,
  CardBan,
  CardCategory,
  CardKey,
  DeckLock,
  DeckOwnershipInput,
  EntryKind,
  IsoDate,
  OwnershipState,
  PlayableCard,
  Printing,
  PrintingId,
  SharedPool,
  UserDeck,
  VariantKind,
} from '../../core/decks';
import { printingRanks } from './printing-sort';

// ---------------------------------------------------------------- shapes

export interface CollectionTile {
  /** `p:<printingId>` or `u:<cardKey>` (SPEC-007 TagTarget). */
  readonly entryId: string;
  readonly kind: EntryKind;
  readonly cardKey: CardKey;
  readonly name: string;
  readonly printingId: PrintingId | null;
  /** "OGN-007a Showcase" · "Printing not specified" · "Printing no longer found: OGN-005". */
  readonly printingLabel: string;
  /** Copies of this entry, locked copies included (COLL-086). */
  readonly count: number;
  /** The entry carries an exclude-from-decks tag (COLL-083, display only). */
  readonly excluded: boolean;
  readonly thumbnailUrl: string | null;
  readonly fullUrl: string | null;
  /** Unassigned and missing-printing tiles show the default printing with a dashed frame. */
  readonly standIn: boolean;
  /** Position in the default order (COLL-031/033); the tie-breaker of every sort. */
  readonly order: number;
}

export interface LockedUse {
  readonly deckId: string;
  readonly deckName: string;
  readonly hold: number;
  /** The locked deck holds fewer copies of this card than it needs (SHARE-033). */
  readonly short: boolean;
}

export interface CardSummary {
  readonly cardKey: CardKey;
  readonly name: string;
  readonly card: PlayableCard;
  /** SPEC-007 quantity (all printings). */
  readonly owned: number;
  /** The card's tiles in set order. */
  readonly tiles: CollectionTile[];
  /** Locked decks holding ≥ 1 copy, lock order; empty when locks are unreadable (SHARE-061). */
  readonly locked: LockedUse[];
  /** Σ hold over `locked`. */
  readonly lockedCopies: number;
  readonly ban: CardBan;
}

export interface UnresolvedCard {
  readonly cardKey: CardKey;
  readonly quantity: number;
}

export interface CollectionView {
  /** Every tile in the default order (COLL-031). */
  readonly tiles: CollectionTile[];
  readonly cards: ReadonlyMap<CardKey, CardSummary>;
  /** COLL-015, in `cardKey` order. */
  readonly unresolved: UnresolvedCard[];
  /** Copies and distinct cards of the whole collection (unresolved records included). */
  readonly totals: { copies: number; cards: number };
  readonly locksIgnored: boolean;
  /** The deck store couldn't be read: Could fit in isn't shown (no deck counts as "none use it"). */
  readonly decksUnreadable: boolean;
  readonly banUnknown: boolean;
  readonly pool: SharedPool;
}

export interface CollectionViewInput {
  readonly ownership: DeckOwnershipInput;
  /** null = the deck store couldn't be read; treated as no decks, and flagged. */
  readonly decks: readonly UserDeck[] | null;
  /** null = the lock store couldn't be read (SHARE-061). */
  readonly locks: readonly DeckLock[] | null;
  /** null = ban data couldn't be loaded (COLL-008). */
  readonly banData: BanListFile | null;
  readonly today: IsoDate;
}

// ---------------------------------------------------------------- building

const KIND_ORDER: Record<EntryKind, number> = { printing: 0, unassigned: 1, 'missing-printing': 2 };

const VARIANT_LABEL: Partial<Record<VariantKind, string>> = {
  showcase: 'Showcase',
  'alt-art': 'Alt art',
  overnumbered: 'Overnumbered',
  signature: 'Signature',
  promo: 'Promo',
};

/** COLL-004: the variant label when `variant.kind` is not base / unknown. */
export function variantLabel(p: Printing): string | null {
  if (p.variant.kind === 'base' || p.variant.kind === 'unknown') return null;
  return p.variant.label ?? VARIANT_LABEL[p.variant.kind] ?? null;
}

/** Printing code per SPEC-007: `publicCode`, else `SET-collectorNumber`. */
export function printingCode(p: Printing): string {
  return p.publicCode ?? `${p.setCode}-${p.collectorNumber}`;
}

export function buildCollectionView(input: CollectionViewInput): CollectionView {
  const own = input.ownership;
  const catalog = own.catalog;
  const ranks = printingRanks(catalog.sets, catalog.printings);
  const pool = computeSharedPool({ decks: input.decks ?? [], locks: input.locks, ownership: own });

  interface Ranked {
    tile: Omit<CollectionTile, 'order'>;
    rank: number;
    kind: number;
  }
  const ranked: Ranked[] = [];
  const unresolved: UnresolvedCard[] = [];
  const summaries = new Map<CardKey, Omit<CardSummary, 'tiles'> & { tiles: CollectionTile[] }>();
  let copies = 0;
  let cards = 0;

  for (const cardKey of Object.keys(own.collection.cards)) {
    const record = own.collection.cards[cardKey];
    const card = catalog.cards[cardKey];
    if (!card) {
      const assigned = Object.values(record.byPrinting).reduce(
        (s, n) => s + Math.max(0, Math.trunc(n)),
        0,
      );
      const quantity = Math.max(Math.max(0, Math.trunc(record.quantity)), assigned);
      if (quantity > 0) {
        unresolved.push({ cardKey, quantity });
        copies += quantity;
        cards++;
      }
      continue;
    }
    const o = cachedDeckOwnership(own, cardKey);
    if (o.owned === 0) continue;
    copies += o.owned;
    cards++;
    const def = catalog.printings[card.defaultPrintingId] ?? null;
    for (const e of o.entries) {
      const printing =
        e.kind === 'printing' && e.printingId ? catalog.printings[e.printingId] : null;
      const shown = printing ?? def;
      let label: string;
      if (printing) {
        const v = variantLabel(printing);
        label = v ? `${printingCode(printing)} ${v}` : printingCode(printing);
      } else if (e.kind === 'unassigned') {
        label = 'Printing not specified';
      } else {
        label = e.printingCode
          ? `Printing no longer found: ${e.printingCode}`
          : `Printing no longer found (id ${e.printingId})`;
      }
      ranked.push({
        rank: ranks.get(shown?.printingId ?? '') ?? Number.MAX_SAFE_INTEGER,
        kind: KIND_ORDER[e.kind],
        tile: {
          entryId: e.entryId,
          kind: e.kind,
          cardKey,
          name: card.name,
          printingId: e.printingId,
          printingLabel: label,
          count: e.count,
          excluded: e.excluded,
          thumbnailUrl: shown?.art.thumbnailUrl ?? null,
          fullUrl: shown?.art.fullUrl ?? shown?.art.thumbnailUrl ?? null,
          standIn: e.kind !== 'printing',
        },
      });
    }

    const cardPool = pool.byCard[cardKey];
    const locked: LockedUse[] = [];
    if (cardPool && !pool.locksIgnored) {
      for (const u of cardPool.uses) {
        if (!u.locked || u.hold < 1) continue;
        locked.push({
          deckId: u.deckId,
          deckName: u.deckName,
          hold: u.hold,
          short: pool.byDeck[u.deckId]?.cardsShort.includes(cardKey) ?? false,
        });
      }
    }
    summaries.set(cardKey, {
      cardKey,
      name: card.name,
      card,
      owned: o.owned,
      tiles: [],
      locked,
      lockedCopies: locked.reduce((s, u) => s + u.hold, 0),
      ban: input.banData
        ? banStatus(input.banData, cardKey, 'standard', 'global', input.today)
        : { status: 'unknown' },
    });
  }

  // COLL-031/033: printingSortKey of the representative printing, entry kind, cardKey, printingId.
  ranked.sort(
    (a, b) =>
      a.rank - b.rank ||
      a.kind - b.kind ||
      cmp(a.tile.cardKey, b.tile.cardKey) ||
      cmp(a.tile.printingId ?? '', b.tile.printingId ?? ''),
  );
  const tiles = ranked.map((r, order): CollectionTile => ({ ...r.tile, order }));
  for (const t of tiles) summaries.get(t.cardKey)?.tiles.push(t);
  unresolved.sort((a, b) => cmp(a.cardKey, b.cardKey));

  return {
    tiles,
    cards: summaries,
    unresolved,
    totals: { copies, cards },
    locksIgnored: pool.locksIgnored,
    decksUnreadable: input.decks === null,
    banUnknown: input.banData === null,
    pool,
  };
}

const cmp = (a: string, b: string): number => (a === b ? 0 : a < b ? -1 : 1);

// ---------------------------------------------------------------- search and sort

export type CollectionSort = 'set' | 'name' | 'copies';
export const SORTS: readonly { value: CollectionSort; label: string }[] = [
  { value: 'set', label: 'Set & number' },
  { value: 'name', label: 'Name' },
  { value: 'copies', label: 'Copies' },
];

/** COLL-040: every space-separated token of `nameKey(query)` is a substring of the cardKey. */
export function nameMatcher(query: string): ((cardKey: CardKey) => boolean) | null {
  const tokens = nameKey(query).split(' ').filter(Boolean);
  if (tokens.length === 0) return null;
  return (cardKey) => tokens.every((t) => cardKey.includes(t));
}

/** COLL-034 name comparison: locale `en`, base sensitivity, numeric segments. */
const nameCollator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

/**
 * Search + one of three sorts (brief §7). Name: COLL-034. Copies: most first. Ties always fall back
 * to the default order, which never flips (COLL-033).
 */
export function queryTiles(
  tiles: readonly CollectionTile[],
  query: string,
  sort: CollectionSort,
): CollectionTile[] {
  const match = nameMatcher(query);
  const out = match ? tiles.filter((t) => match(t.cardKey)) : [...tiles];
  if (sort === 'name')
    out.sort((a, b) => nameCollator.compare(a.name, b.name) || a.order - b.order);
  else if (sort === 'copies') out.sort((a, b) => b.count - a.count || a.order - b.order);
  return out;
}

/** Unresolved cards matching the search (COLL-015: text search applies to them). */
export function queryUnresolved(list: readonly UnresolvedCard[], query: string): UnresolvedCard[] {
  const match = nameMatcher(query);
  return match ? list.filter((u) => match(u.cardKey)) : [...list];
}

// ---------------------------------------------------------------- URL and memory (COLL-060…063)

export interface UrlQuery {
  readonly text: string;
  readonly sort: CollectionSort;
  /** Values that were not understood and dropped (COLL-062). */
  readonly ignored: number;
}

/** Reads `q` and `sort`. `sort=set` and unknown values fall back to the default. */
export function parseUrlQuery(params: { q?: string | null; sort?: string | null }): UrlQuery {
  const text = params.q ?? '';
  const raw = params.sort ?? null;
  if (raw === null || raw === '') return { text, sort: 'set', ignored: 0 };
  if (raw === 'name' || raw === 'copies') return { text, sort: raw, ignored: 0 };
  return { text, sort: 'set', ignored: 1 };
}

/** Defaults are omitted, so the default query has a clean `/collection` URL. */
export function urlParams(
  text: string,
  sort: CollectionSort,
): { q: string | null; sort: string | null } {
  return { q: text.trim() ? text : null, sort: sort === 'set' ? null : sort };
}

/** "1 filter value not found and was ignored" (COLL-062, verbatim). */
export function ignoredNotice(n: number): string | null {
  if (n < 1) return null;
  return `${n} filter ${n === 1 ? 'value' : 'values'} not found and ${n === 1 ? 'was' : 'were'} ignored`;
}

/** SPEC-007 `CollectionQuery.sort` stored in the view state for each of the three sorts. */
export function storedSort(sort: CollectionSort): { field: string; dir: 'asc' | 'desc' } {
  return sort === 'name'
    ? { field: 'name', dir: 'asc' }
    : sort === 'copies'
      ? { field: 'quantity', dir: 'desc' }
      : { field: 'default', dir: 'asc' };
}

export function sortFromStored(v: unknown): CollectionSort {
  const field = (v as { field?: unknown } | null)?.field;
  return field === 'name' ? 'name' : field === 'quantity' ? 'copies' : 'set';
}

// ---------------------------------------------------------------- text

const n = (v: number) => v.toLocaleString('en-US');

/** "1 copy" / "3 copies". */
export function copiesText(count: number): string {
  return `${n(count)} ${count === 1 ? 'copy' : 'copies'}`;
}

/** Count line: "1,204 copies of 412 cards" (COLL-010, brief §10). */
export function countLine(copies: number, cards: number): string {
  return `${copiesText(copies)} of ${n(cards)} ${cards === 1 ? 'card' : 'cards'}`;
}

/** "Showing 12 of 538" (tiles shown of all tiles). */
export function showingLine(shown: number, total: number): string {
  return `Showing ${n(shown)} of ${n(total)}`;
}

/** "A", "A and B", "A, B and C". */
export function joinAnd(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** Lock band: "2 of this card locked in Jinx Aggro" / "3 of this card locked in 2 decks". */
export function lockBandText(copies: number, decks: readonly string[]): string {
  const where = decks.length === 1 ? decks[0] : `${decks.length} decks`;
  return `${n(copies)} of this card locked in ${where}`;
}

export type BanVariant = 'banned' | 'upcoming' | 'unknown';

/** COLL-008/009 label for the dialog; null when not banned. */
export function banLabel(ban: CardBan): { variant: BanVariant; text: string } | null {
  switch (ban.status) {
    case 'banned':
      return { variant: 'banned', text: `Banned since ${formatIsoDate(ban.bannedSince)}` };
    case 'upcoming':
      return { variant: 'upcoming', text: `Banned from ${formatIsoDate(ban.effective)}` };
    case 'unknown':
      return { variant: 'unknown', text: 'Ban status unknown' };
    default:
      return null;
  }
}

/**
 * Tile button name (brief §4, components note §5): name, printing, copies, card-level lock text
 * with every deck name, ban.
 */
export function tileAccessibleName(tile: CollectionTile, card: CardSummary | undefined): string {
  const parts = [tile.name, tile.printingLabel, copiesText(tile.count)];
  if (card && card.lockedCopies > 0) {
    parts.push(
      `${n(card.lockedCopies)} of this card locked in ${joinAnd(card.locked.map((u) => u.deckName))}`,
    );
  }
  const ban = card?.ban;
  if (ban?.status === 'banned') parts.push('banned');
  else if (ban?.status === 'upcoming') parts.push(`banned from ${formatIsoDate(ban.effective)}`);
  else if (ban?.status === 'unknown') parts.push('ban status unknown');
  return parts.join(', ');
}

// ---------------------------------------------------------------- dialog (brief §5)

/**
 * Art orientation known from the card's category, for `app-card-art [landscape]`: battlefields are
 * landscape, other known categories portrait, `unknown` (or no card) is measured from the image.
 */
export function landscapeFor(category: CardCategory | undefined): boolean | null {
  if (category === undefined || category === 'unknown') return null;
  return category === 'battlefield';
}

/** Page notice and dialog line when the deck store couldn't be read. */
export const DECKS_UNREADABLE = "Your decks couldn't be read, so Could fit in isn't shown.";

export interface PrintingRow {
  readonly entryId: string;
  /** "2 × OGN-007". */
  readonly text: string;
  readonly current: boolean;
  /** "Show OGN-007, 2 copies". */
  readonly ariaLabel: string;
}

export interface FitRow {
  readonly deckId: string;
  readonly deckName: string;
  readonly state: OwnershipState;
  /** SHARE-040 "a of q available". */
  readonly label: string;
}

export interface CardDetail {
  readonly tile: CollectionTile;
  readonly card: CardSummary;
  /** "OGN-007a Showcase · 3 copies". */
  readonly printingLine: string;
  /** "1 not counted in your decks" when this entry is excluded (COLL-083). */
  readonly excludedLine: string | null;
  /** "You own 6 across all printings", or null with only one entry. */
  readonly ownedHeading: string | null;
  readonly printings: PrintingRow[];
  readonly lockedIn: { deckId: string; deckName: string; copies: string; short: boolean }[];
  /** Unlocked decks using the card; fully available first, then by name. */
  readonly couldFit: FitRow[];
  /**
   * Could fit in with no rows: "None of your other decks use this card." only when Locked in
   * shows, otherwise "None of your decks use this card." (brief §5.4 as corrected by the H-086 review).
   */
  readonly couldFitEmpty: string;
  /** The decks couldn't be read: show `DECKS_UNREADABLE` in place of Could fit in's rows. */
  readonly decksUnreadable: boolean;
  readonly ban: { variant: BanVariant; text: string } | null;
}

export function cardDetail(view: CollectionView, entryId: string): CardDetail | null {
  const tile = view.tiles.find((t) => t.entryId === entryId);
  const card = tile ? view.cards.get(tile.cardKey) : undefined;
  if (!tile || !card) return null;
  const many = card.tiles.length > 1;

  // Runes are cards (COLL-089): Locked in and Could fit in cover them like any card.
  const couldFit: FitRow[] = [];
  for (const u of view.pool.byCard[card.cardKey]?.uses ?? []) {
    if (u.locked) continue;
    const av = availability(view.pool, u.deckId, card.cardKey);
    if (av.need < 1) continue;
    const t = tileOwnership(Math.min(av.available, av.need), av.need);
    couldFit.push({ deckId: u.deckId, deckName: u.deckName, state: t.state, label: t.label });
  }
  couldFit.sort(
    (a, b) =>
      Number(b.state === 'full') - Number(a.state === 'full') ||
      nameCollator.compare(a.deckName, b.deckName) ||
      cmp(a.deckId, b.deckId),
  );

  return {
    tile,
    card,
    printingLine: `${tile.printingLabel} · ${copiesText(tile.count)}`,
    excludedLine: tile.excluded ? `${n(tile.count)} not counted in your decks` : null,
    ownedHeading: many ? `You own ${n(card.owned)} across all printings` : null,
    printings: many
      ? card.tiles.map((t) => ({
          entryId: t.entryId,
          text: `${n(t.count)} × ${t.printingLabel}`,
          current: t.entryId === tile.entryId,
          ariaLabel: `Show ${t.printingLabel}, ${copiesText(t.count)}`,
        }))
      : [],
    lockedIn: card.locked.map((u) => ({
      deckId: u.deckId,
      deckName: u.deckName,
      copies: copiesText(u.hold),
      short: u.short,
    })),
    couldFit,
    couldFitEmpty:
      card.locked.length > 0
        ? 'None of your other decks use this card.'
        : 'None of your decks use this card.',
    decksUnreadable: view.decksUnreadable,
    ban: banLabel(card.ban),
  };
}

// ---------------------------------------------------------------- grid layout (brief §8)

/**
 * Columns for a content width: as many `tileMin` columns as fit with `gap`, at least 2 from
 * 18rem (288px) up and 1 below (brief §11.7).
 */
export function columnsFor(width: number, tileMin: number, gap: number): number {
  const cols = Math.floor((width + gap) / (tileMin + gap));
  return Math.max(width >= 288 ? 2 : 1, cols);
}

/** Row height of the virtual scroll: tile width × 88/63 plus the row gap. */
export function rowHeightFor(width: number, cols: number, gap: number): number {
  const tile = (width - gap * (cols - 1)) / cols;
  return Math.round(tile * (88 / 63) + gap);
}

export function chunkRows<T>(items: readonly T[], cols: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += cols) rows.push(items.slice(i, i + cols));
  return rows;
}

/** Roving-focus target for a grid key (brief §7, components note §5); null = not a grid key. */
export function gridMove(
  key: string,
  ctrl: boolean,
  index: number,
  total: number,
  cols: number,
): number | null {
  if (total === 0) return null;
  const rowStart = index - (index % cols);
  let next: number;
  switch (key) {
    case 'ArrowRight':
      next = index + 1;
      break;
    case 'ArrowLeft':
      next = index - 1;
      break;
    case 'ArrowDown':
      next = index + cols;
      break;
    case 'ArrowUp':
      next = index - cols;
      break;
    case 'Home':
      next = ctrl ? 0 : rowStart;
      break;
    case 'End':
      next = ctrl ? total - 1 : Math.min(rowStart + cols - 1, total - 1);
      break;
    default:
      return null;
  }
  return next < 0 || next >= total ? index : next;
}
