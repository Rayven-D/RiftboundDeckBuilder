import { banStatus } from './ban-status';
import { cachedDeckOwnership } from './deck-ownership';
import {
  ZONE_ORDER,
  availability,
  cardsShortText,
  sharedIndicator,
  storedLockState,
  zoneEntries,
} from './shared-pool';
import { tileOwnership } from './tile-ownership';
import type {
  BanListFile,
  CardAvailability,
  CardBan,
  CardKey,
  CollectionCatalogView,
  CollectionOwnership,
  DeckCard,
  DeckLockState,
  DeckOwnership,
  DeckOwnershipInput,
  DeckOwnershipView,
  DeckTileBans,
  DeckTileSummary,
  DeckZone,
  FormatId,
  FormatName,
  IsoDate,
  LegalityVerdict,
  MissingLine,
  OwnedPrintingRow,
  OwnershipCard,
  OwnershipFilter,
  UserDeck,
  ZoneSection,
} from './types';

/** DECK-085 section labels, used by the "Copy missing list" text (OWN-052). */
const EXPORT_LABEL: Readonly<Record<DeckZone, string>> = {
  legend: 'Legend:',
  champion: 'Champion:',
  main: 'Main Deck:',
  battlefields: 'Battlefields:',
  runes: 'Rune Pool:',
  sideboard: 'Sideboard:',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** OWN-090: an ISO date ('YYYY-MM-DD…') as `MMM D, YYYY`, e.g. `Nov 23, 2026`. */
export function formatIsoDate(iso: IsoDate): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

/**
 * SPEC-005 `computeDeckOwnership(deck, ownership, catalog, banData, today)` (OWN-025): pure.
 * The pool for counted card k is SPEC-008 `availability(shared, deck.id, k).available` (OWN-020),
 * allocated over the deck's counted entries of k in zone order, Main before Sideboard (OWN-022).
 * Rune entries are counted, allocated and listed like any entry (OWN-028). With ownership
 * unavailable or no catalog (OWN-062/063) every tile is full colour without a label, and `lock`
 * comes from the stored locks (SHARE-053, OWN-065): locked, never short, holds not computed.
 * Entries must already be valid per SPEC-006 DECK-096 (`qty` an integer 1..999): this function
 * doesn't re-validate, and `tileOwnership` throws a RangeError for `qty < 1` (SHARE-003).
 */
export function computeDeckOwnership(
  deck: UserDeck,
  ownership: CollectionOwnership,
  catalog: CollectionCatalogView | null,
  banData: BanListFile | null,
  today: IsoDate,
): DeckOwnershipView {
  const ok = ownership.status === 'ok' && catalog !== null ? ownership : null;
  const lock = ok ? (ok.shared.byDeck[deck.id] ?? null) : unavailableLock(deck.id, ownership);
  const locked = lock?.locked ?? false;

  const tagLabels = new Map(ok ? ok.input.tags.tags.map((t) => [t.id, t.label]) : []);

  // Counted entries per cardKey, in allocation order (OWN-022: ZONE_ORDER, every entry, OWN-028).
  interface Counted {
    zone: DeckZone;
    qty: number;
    allocated: number;
  }
  const counted = new Map<CardKey, Counted[]>();
  const countedOf = new Map<DeckCard, Counted>();
  for (const zone of ZONE_ORDER) {
    for (const e of zoneEntries(deck, zone)) {
      const c: Counted = { zone, qty: e.qty, allocated: 0 };
      const list = counted.get(e.cardKey);
      if (list) list.push(c);
      else counted.set(e.cardKey, [c]);
      countedOf.set(e, c);
    }
  }

  // Per counted card (card-level values, the same on every zone tile of the card).
  interface CardInfo {
    required: number;
    allocated: number;
    pool: number;
    av: CardAvailability;
    owned: DeckOwnership | null;
    split: boolean;
    sharedLabel: string | null;
    allocationByZone: OwnershipCard['allocationByZone'];
    printingsOwned: OwnedPrintingRow[];
    excludedPrintings: OwnedPrintingRow[];
  }
  const info = new Map<CardKey, CardInfo>();
  if (ok) {
    for (const [k, entries] of counted) {
      const av = availability(ok.shared, deck.id, k);
      let required = 0;
      let remaining = av.available;
      const allocationByZone: OwnershipCard['allocationByZone'] = {};
      for (const e of entries) {
        required += e.qty;
        e.allocated = Math.min(remaining, e.qty);
        remaining -= e.allocated;
        const z = allocationByZone[e.zone] ?? { allocated: 0, required: 0 };
        z.allocated += e.allocated;
        z.required += e.qty;
        allocationByZone[e.zone] = z;
      }
      const owned = catalog?.cards[k] ? cachedDeckOwnership(ok.input, k) : null;
      const printingsOwned: OwnedPrintingRow[] = [];
      const excludedPrintings: OwnedPrintingRow[] = [];
      for (const e of owned?.entries ?? []) {
        (e.excluded ? excludedPrintings : printingsOwned).push(printingRow(e, ok.input, tagLabels));
      }
      info.set(k, {
        required,
        allocated: av.available - remaining,
        pool: av.available,
        av,
        owned,
        split: entries.length > 1,
        sharedLabel: sharedIndicator(av.otherUses),
        allocationByZone,
        printingsOwned,
        excludedPrintings,
      });
    }
  }

  const sections: ZoneSection[] = ZONE_ORDER.map((zone) => {
    const cards = zoneEntries(deck, zone).map((entry): OwnershipCard => {
      const card = catalog?.cards[entry.cardKey] ?? null;
      const flags: OwnershipCard['flags'] = [];
      if (catalog && !card) flags.push('unknown-card');
      if (card?.isPreview === true) flags.push('preview');
      const name = card?.name ?? entry.name;
      const banStatus = cardBan(banData, entry.cardKey, deck.format, today);
      const imageUrl = card
        ? (catalog?.printings[card.defaultPrintingId]?.art.thumbnailUrl ?? null)
        : null;
      const ci = info.get(entry.cardKey);
      if (!ci) {
        // OWN-062/063 (ownership unavailable): full colour, nothing counted.
        return {
          cardKey: entry.cardKey,
          zone,
          name,
          required: entry.qty,
          allocated: entry.qty,
          fill: 1,
          state: 'full',
          label: '',
          sharedLabel: null,
          cardRequired: 0,
          ownedForDecks: 0,
          ownedExcluded: 0,
          lockedByOthers: 0,
          available: 0,
          heldByThisDeck: null,
          otherUses: [],
          extra: 0,
          allocationByZone: {},
          printingsOwned: [],
          excludedPrintings: [],
          banStatus,
          card,
          imageUrl,
          flags,
        };
      }
      const av = ci.av;
      const tile = tileOwnership(countedOf.get(entry)?.allocated ?? 0, entry.qty, locked);
      return {
        cardKey: entry.cardKey,
        zone,
        name,
        required: entry.qty,
        allocated: tile.allocated,
        fill: tile.fill,
        state: tile.state,
        // OWN-033: a card split across zones adds the card total.
        label: ci.split
          ? `${tile.label} · ${ci.allocated} of ${ci.required} in this deck`
          : tile.label,
        sharedLabel: ci.sharedLabel,
        cardRequired: ci.required,
        ownedForDecks: av.ownedForDecks,
        ownedExcluded: av.ownedExcluded,
        lockedByOthers: av.lockedByOthers,
        available: av.available,
        heldByThisDeck: av.heldByThisDeck,
        otherUses: av.otherUses,
        extra: Math.max(0, av.available - ci.required),
        allocationByZone: ci.allocationByZone,
        printingsOwned: ci.printingsOwned,
        excludedPrintings: ci.excludedPrintings,
        banStatus,
        card,
        imageUrl,
        flags,
      };
    });
    return {
      zone,
      cards,
      required: cards.reduce((n, c) => n + c.required, 0),
      allocated: cards.reduce((n, c) => n + c.allocated, 0),
    };
  });

  // OWN-050 summary and OWN-051 missing list: every entry, Runes included (OWN-028).
  let copiesRequired = 0;
  let copiesAvailable = 0;
  let cardsFullyAvailable = 0;
  let copiesExcludedRelevant = 0;
  for (const entries of counted.values()) {
    for (const e of entries) copiesRequired += e.qty;
  }
  for (const ci of info.values()) {
    copiesAvailable += ci.allocated;
    if (ci.pool >= ci.required) cardsFullyAvailable += 1;
    copiesExcludedRelevant += Math.min(ci.owned?.ownedExcluded ?? 0, ci.required - ci.allocated);
  }
  const missing: MissingLine[] = [];
  if (ok) {
    for (const s of sections) {
      for (const c of s.cards) {
        if (c.allocated < c.required) {
          missing.push({
            zone: s.zone,
            cardKey: c.cardKey,
            name: c.name,
            missing: c.required - c.allocated,
          });
        }
      }
    }
  }

  return {
    deckId: deck.id,
    asOf: today,
    catalogVersion: catalog?.catalogVersion ?? null,
    ownershipAvailable: ok !== null,
    locksIgnored: ok?.shared.locksIgnored ?? false,
    lock,
    sections,
    summary: {
      copiesRequired,
      copiesAvailable,
      cardsTotal: counted.size,
      cardsFullyAvailable,
      copiesExcludedRelevant,
      // OWN-101 (c): no value when R = 0 or ownership is unavailable.
      completionFill: ok && copiesRequired > 0 ? copiesAvailable / copiesRequired : null,
      completionPercent: ok ? completionPercent(copiesAvailable, copiesRequired) : null,
    },
    missing,
    missingText: missingText(missing),
  };
}

/**
 * SPEC-005 OWN-101 (b) completion percentage of A available copies out of R required: 0 when
 * A = 0, 100 when A = R, else `min(99, max(1, floor(100·A/R)))`; null when R = 0 (OWN-101 (c)).
 */
export function completionPercent(a: number, r: number): number | null {
  if (r <= 0) return null;
  if (a <= 0) return 0;
  if (a >= r) return 100;
  return Math.min(99, Math.max(1, Math.floor((100 * a) / r)));
}

/**
 * SHARE-053 (a) lock state while ownership is unavailable. With the catalog not loaded (OWN-063) a
 * pool may still exist; only its lock facts are used (holds unknown), and none when it ignored the
 * lock store (SHARE-061).
 */
function unavailableLock(deckId: string, ownership: CollectionOwnership): DeckLockState | null {
  if (ownership.status === 'unavailable') return storedLockState(ownership.locks ?? null, deckId);
  const s = ownership.shared.byDeck[deckId];
  if (ownership.shared.locksIgnored || !s?.locked) return null;
  return {
    deckId,
    locked: true,
    lockedAt: s.lockedAt,
    complete: false,
    short: false,
    cardsShort: [],
  };
}

function cardBan(
  data: BanListFile | null,
  cardKey: CardKey,
  format: FormatId,
  today: IsoDate,
): CardBan {
  return data ? banStatus(data, cardKey, format, 'global', today) : { status: 'unknown' };
}

function printingRow(
  e: DeckOwnership['entries'][number],
  input: DeckOwnershipInput,
  labels: ReadonlyMap<string, string>,
): OwnedPrintingRow {
  return {
    kind: e.kind,
    printingId: e.printingId,
    printingCode: e.printingCode,
    variantLabel:
      e.kind === 'printing' && e.printingId
        ? (input.catalog.printings[e.printingId]?.variant.label ?? null)
        : null,
    count: e.count,
    excludedByTagIds: e.excludedByTagIds,
    excludedByTagNames: e.excludedByTagIds
      .map((id) => labels.get(id))
      .filter((l): l is string => l !== undefined),
  };
}

/** OWN-052: DECK-085 layout, sections in ZONE_ORDER, blank line between, empty ones omitted. */
function missingText(missing: readonly MissingLine[]): string {
  const byZone = new Map<DeckZone, string[]>();
  for (const m of missing) {
    const lines = byZone.get(m.zone) ?? [EXPORT_LABEL[m.zone]];
    lines.push(`${m.missing} ${m.name}`);
    byZone.set(m.zone, lines);
  }
  return ZONE_ORDER.filter((z) => byZone.has(z))
    .map((z) => (byZone.get(z) as string[]).join('\n'))
    .join('\n\n');
}

/**
 * SPEC-005 `summarizeDeck(deck, view, legality, format)` → `DeckTileSummary` (OWN-002…004,
 * SHARE-050, SHARE-051, SHARE-053, OWN-065): pure. `legality` / `format` null → "Not fully checked".
 * Ownership unavailable: line "Ownership unavailable", group `unavailable`, badge "Locked" only.
 */
export function summarizeDeck(
  deck: UserDeck,
  view: DeckOwnershipView,
  legality: LegalityVerdict | null,
  format: FormatName | null,
): DeckTileSummary {
  const { copiesRequired: r, copiesAvailable: a } = view.summary;
  const lock = view.lock;
  const locked = lock?.locked ?? false;

  let ownershipLine: string;
  if (!view.ownershipAvailable) ownershipLine = 'Ownership unavailable';
  else if (r === 0) ownershipLine = 'No cards to count';
  // H-521: singular when the required total is 1 ("1 of 1 copy available").
  else ownershipLine = `${a} of ${r} ${r === 1 ? 'copy' : 'copies'} ${locked ? 'locked in' : 'available'}`;

  // SHARE-051: first matching rule wins; rule 0 (SHARE-053 (d), OWN-065 (d)) whatever the lock.
  let ownershipFilter: OwnershipFilter;
  if (!view.ownershipAvailable) ownershipFilter = 'unavailable';
  else if (locked && !lock?.short && r > 0) ownershipFilter = 'locked';
  else if (r === 0) ownershipFilter = 'none';
  else if (!locked && lock?.complete) ownershipFilter = 'ready';
  else if (a === 0) ownershipFilter = 'none';
  else ownershipFilter = 'partial';

  // SHARE-053 (b): with ownership unavailable a locked deck reads "Locked", never "cards short".
  let lockBadge: string | null = null;
  if (locked) {
    lockBadge =
      lock?.short && view.ownershipAvailable
        ? `Locked · ${cardsShortText(lock.cardsShort.length)}`
        : 'Locked';
  }

  const verdict = legality && format ? legality.verdict : 'incomplete';
  let legalityLabel = 'Not fully checked';
  if (legality && format && verdict === 'illegal')
    legalityLabel = `Not legal in ${format.name} today`;
  if (legality && format && verdict === 'legal') {
    legalityLabel = `Legal in ${format.name} as of ${formatIsoDate(legality.asOf)}`;
  }

  return {
    deckId: deck.id,
    name: deck.name,
    sourceLine: sourceLine(deck),
    legalityVerdict: verdict,
    legalityLabel,
    ownershipLine,
    ownershipFilter,
    lockBadge,
    updatedAt: deck.updatedAt,
    legend: tileLegend(view),
    completionFill: view.summary.completionFill,
    completionPercent: view.summary.completionPercent,
    bans: tileBans(view),
    pilot: deck.source.kind === 'tournament' ? deck.source.pilot : null,
    // DECK-091: a record newer than schemaVersion 1 is shown read-only.
    readOnly: (deck.schemaVersion as number) > 1,
  };
}

/** OWN-100 (a), (d): the Legend tile of the view; null when none, unknown or catalog not loaded. */
function tileLegend(view: DeckOwnershipView): DeckTileSummary['legend'] {
  const legend = view.sections.find((s) => s.zone === 'legend')?.cards[0];
  if (!legend?.card) return null;
  return { name: legend.name, imageUrl: legend.imageUrl };
}

/**
 * OWN-103: distinct cardKeys with status `banned` / `upcoming` (a card in several zones counts
 * once), and the earliest upcoming `effective`. null when ban data is not loaded (any card
 * 'unknown', OWN-015).
 */
function tileBans(view: DeckOwnershipView): DeckTileBans | null {
  const byCard = new Map<CardKey, CardBan>();
  for (const s of view.sections) for (const c of s.cards) byCard.set(c.cardKey, c.banStatus);
  let banned = 0;
  let upcoming = 0;
  let upcomingFrom: IsoDate | null = null;
  for (const b of byCard.values()) {
    if (b.status === 'unknown') return null;
    if (b.status === 'banned') banned += 1;
    if (b.status === 'upcoming') {
      upcoming += 1;
      if (upcomingFrom === null || b.effective < upcomingFrom) upcomingFrom = b.effective;
    }
  }
  return { banned, upcoming, upcomingFrom };
}

/** OWN-003 source line. */
export function sourceLine(deck: UserDeck): string {
  const s = deck.source;
  if (s.kind === 'tournament') {
    const start = formatIsoDate(s.eventStartDate);
    const end = formatIsoDate(s.eventEndDate);
    return `${s.placingLabel}, ${s.eventName} · ${start === end ? start : `${start} – ${end}`}`;
  }
  return s.text || s.url || 'Imported';
}
