/**
 * Deck detail (`/decks/:id`, H-254): the display rules of SPEC-005 section L (OWN-110…119) and the header (OWN-010)
 * over the engine's `DeckOwnershipView` (core/decks, H-059 / H-155 / H-311). Pure: no Angular, no storage, no clock.
 * Every number here comes from the view as it is; nothing is recomputed (the completion percentage in particular is
 * `view.summary.completionPercent`, OWN-010 (f), OWN-101 (d)).
 */
import { ZONE_ORDER, formatIsoDate } from '../../core/decks';
import type {
  CardBan,
  CardUse,
  CollectionCatalogView,
  DeckOwnershipView,
  DeckZone,
  MissingLine,
  OwnedPrintingRow,
  OwnershipCard,
  UserDeck,
  ZoneSection,
} from '../../core/decks';
import { LIMITS } from '../storage/records';

/** OWN-011 section headings (Riot decklist order). */
export const ZONE_LABEL: Readonly<Record<DeckZone, string>> = {
  legend: 'Legend',
  champion: 'Chosen Champion',
  main: 'Main Deck',
  battlefields: 'Battlefields',
  runes: 'Runes',
  sideboard: 'Sideboard',
};

/** OWN-110 section bar link names (Decks Components §8). */
export const NAV_LABEL: Readonly<Record<DeckZone, string>> = {
  legend: 'Legend',
  champion: 'Champion',
  main: 'Main',
  battlefields: 'Battlefields',
  runes: 'Runes',
  sideboard: 'Sideboard',
};

/** DECK-085 export labels (the same as the engine's missing-list text). */
const EXPORT_LABEL: Readonly<Record<DeckZone, string>> = {
  legend: 'Legend:',
  champion: 'Champion:',
  main: 'Main Deck:',
  battlefields: 'Battlefields:',
  runes: 'Rune Pool:',
  sideboard: 'Sideboard:',
};

/** Fixed texts of Deck detail (SPEC-005 OWN-015, 050…052, 061, 062, 111…119; DECK-082…084; Decks Components §14). */
export const DETAIL_TEXT = {
  noCards: 'No cards to count',
  ownershipUnavailableLine: 'Ownership unavailable',
  ownershipUnavailable: 'Ownership unavailable: your collection could not be read.',
  catalogNotLoaded: 'Card data not loaded',
  locksUnreadable: 'Locked decks could not be read; counts ignore locks.',
  banUnknown: "The ban list couldn't load, so ban status is unknown.",
  readOnly: 'This deck was saved by a newer version of Rift Builder. You can view it, but not change it.',
  notFoundHeading: "This deck isn't in your decks",
  notFoundMessage: 'It may have been deleted on another device.',
  /** OWN-119 (b): the polite status when the open deck is deleted elsewhere (wording not in the spec). */
  deletedElsewhere: 'This deck is no longer in your decks.',
  emptyZone: 'No cards in this zone',
  noDeckCards: 'This deck has no cards.',
  cardLeft: 'That card is no longer in this deck.',
  /** H-468 (10): the polite status when a card is selected in the desktop panel. */
  showing: (name: string) => `Showing ${name}`,
  cardLeftDialog: 'This card is no longer in this deck.',
  allAvailable: 'All cards available',
  unknownCard: 'Card no longer in the card data',
  notOwned: "You don't own this card",
  noOtherDeck: 'No other deck uses this card.',
  missingCopied: 'Missing list copied',
  deckListCopied: 'Deck list copied',
  copyFailed: "Couldn't copy. Select the list and copy it yourself.",
  renamed: 'Deck renamed.',
  /** Not in the spec: a save that changed only the description or source. */
  changesSaved: 'Changes saved.',
  duplicated: 'Deck duplicated.',
  open: 'Open',
  deleted: 'Deck deleted.',
  undo: 'Undo',
  deleteLocked: 'Its locked cards will count toward your other decks again.',
  saveFailed: "Couldn't save the deck. Nothing was changed. Try again.",
  /** DECK-094: the record changed since this page read it (another tab or device). */
  saveConflict: 'This deck changed somewhere else. Your change was not saved; check the deck and try again.',
} as const;

// ---------------------------------------------------------------- header (OWN-010)

/** OWN-010 (f): the deck summary in the header. `percent` is `view.summary.completionPercent`, read as it is. */
export interface HeaderSummary {
  /** "34 of 66 copies available" / "… copies locked in" / "No cards to count" / "Ownership unavailable". */
  copies: string;
  /** OWN-101 (d): shown as " · p%" after `copies`, spoken "p percent"; null = nothing at all. */
  percent: number | null;
  /** "18 of 32 cards fully available"; null when R = 0 or ownership is unavailable. */
  cards: string | null;
}

export function headerSummary(view: DeckOwnershipView): HeaderSummary {
  const s = view.summary;
  if (!view.ownershipAvailable) {
    return { copies: DETAIL_TEXT.ownershipUnavailableLine, percent: null, cards: null };
  }
  if (s.copiesRequired === 0) return { copies: DETAIL_TEXT.noCards, percent: null, cards: null };
  return {
    copies: copiesLine(view),
    percent: s.completionPercent,
    cards: cardsLine(view),
  };
}

/** OWN-050: "F of C cards fully available"; singular when C is 1 ("1 of 1 card fully available", H-466). */
export function cardsLine(view: DeckOwnershipView): string {
  const s = view.summary;
  return `${s.cardsFullyAvailable} of ${s.cardsTotal} ${s.cardsTotal === 1 ? 'card' : 'cards'} fully available`;
}

/**
 * OWN-050 / SHARE-050: "A of R copies available", or "… copies locked in" in a locked deck; singular when
 * R is 1 ("1 of 1 copy available", H-521).
 */
export function copiesLine(view: DeckOwnershipView): string {
  const s = view.summary;
  const noun = s.copiesRequired === 1 ? 'copy' : 'copies';
  return `${s.copiesAvailable} of ${s.copiesRequired} ${noun} ${isLocked(view) ? 'locked in' : 'available'}`;
}

/** OWN-050: "X copies excluded from decks" when excluded copies would have filled a gap; else null. */
export function excludedLine(view: DeckOwnershipView): string | null {
  const n = view.summary.copiesExcludedRelevant;
  if (!view.ownershipAvailable || n <= 0) return null;
  return `${n} ${n === 1 ? 'copy' : 'copies'} excluded from decks`;
}

export function isLocked(view: DeckOwnershipView): boolean {
  return view.lock?.locked ?? false;
}

/** OWN-003 + OWN-104: the tournament player and the plain "Source" link (DECK-072: shown, never fetched). */
export function sourceParts(deck: UserDeck): { pilot: string | null; sourceUrl: string | null } {
  const s = deck.source;
  if (s.kind === 'tournament') return { pilot: s.pilot || null, sourceUrl: s.sourceUrl || null };
  return { pilot: null, sourceUrl: null };
}

// ---------------------------------------------------------------- sections (OWN-011, OWN-110)

/**
 * OWN-011: "Main Deck · 39 cards · 12 available" (the part after the label); "· 39 cards" while unavailable. An empty
 * section reads "· 0 cards", with no "· 0 available" (H-466).
 */
export function sectionCounts(section: ZoneSection, view: DeckOwnershipView): string {
  const n = section.required;
  const cards = `${n} ${n === 1 ? 'card' : 'cards'}`;
  if (!view.ownershipAvailable || n === 0) return `· ${cards}`;
  return `· ${cards} · ${section.allocated} ${isLocked(view) ? 'locked in' : 'available'}`;
}

/**
 * OWN-110 (v0.11, H-482): "Main 39", "Battlefields 0" (always a count); the single slots (Legend, Champion) show no
 * count when they hold their card and "Legend 0" / "Champion 0" only when empty (words, not colour alone).
 */
export function navLabel(section: ZoneSection): string {
  const label = NAV_LABEL[section.zone];
  const slot = section.zone === 'legend' || section.zone === 'champion';
  return slot && section.required > 0 ? label : `${label} ${section.required}`;
}

// ---------------------------------------------------------------- cards (OWN-033, OWN-111…115)

/** The key of one tile or row: one per `cardKey` per zone (OWN-040). */
export function cardId(card: Pick<OwnershipCard, 'zone' | 'cardKey'>): string {
  return `${card.zone}:${card.cardKey}`;
}

/** Every card in section order (OWN-111 (b), OWN-113 stepping). */
export function deckCards(view: DeckOwnershipView): OwnershipCard[] {
  return view.sections.flatMap((s) => s.cards);
}

/** OWN-111 (b): the first card in section order (normally the Legend), or null for an empty deck. */
export function firstCardId(view: DeckOwnershipView): string | null {
  const first = deckCards(view)[0];
  return first ? cardId(first) : null;
}

export function findCard(view: DeckOwnershipView, id: string | null): OwnershipCard | null {
  if (id === null) return null;
  return deckCards(view).find((c) => cardId(c) === id) ?? null;
}

/** The previous / next card in section order, or null at the ends. */
export function neighbourId(view: DeckOwnershipView, id: string, step: -1 | 1): string | null {
  const all = deckCards(view);
  const i = all.findIndex((c) => cardId(c) === id);
  if (i < 0) return null;
  const next = all[i + step];
  return next ? cardId(next) : null;
}

/** OWN-033 v0.9: the count part and the optional deck-total part of a tile label. */
export function labelParts(label: string): { count: string; total: string | null } {
  const i = label.indexOf(' · ');
  return i < 0 ? { count: label, total: null } : { count: label.slice(0, i), total: label.slice(i + 3) };
}

/** OWN-015: the ban label text; null for not banned. Unknown reads "Ban status unknown" (dialog and names only). */
export function banText(ban: CardBan): string | null {
  switch (ban.status) {
    case 'banned':
      return `Banned since ${formatIsoDate(ban.bannedSince)}`;
    case 'upcoming':
      return `Banned from ${formatIsoDate(ban.effective)}`;
    case 'unknown':
      return 'Ban status unknown';
    default:
      return null;
  }
}

/** OWN-033 / SHARE-044 accessible name of a tile or row: name, zone, (unknown), label, shared, ban, preview. */
export function cardAccessibleName(card: OwnershipCard): string {
  const parts = [card.name, ZONE_LABEL[card.zone]];
  if (card.flags.includes('unknown-card')) parts.push('card no longer in the card data');
  if (card.label) parts.push(card.label);
  if (card.sharedLabel) parts.push(lowerFirst(card.sharedLabel.replace(' · ', ', ')));
  const ban = banText(card.banStatus);
  if (ban) parts.push(lowerFirst(ban));
  if (card.flags.includes('preview')) parts.push('preview');
  return parts.join(', ');
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/** OWN-042: "Main Deck 2 of 2 · Sideboard 0 of 1" when the card is in more than one zone; else null. */
export function allocationLine(card: OwnershipCard): string | null {
  const zones = ZONE_ORDER.filter((z) => card.allocationByZone[z]);
  if (zones.length < 2) return null;
  return zones
    .map((z) => {
      const a = card.allocationByZone[z]!;
      return `${ZONE_LABEL[z]} ${a.allocated} of ${a.required}`;
    })
    .join(' · ');
}

/** SHARE-043 / OWN-042 "This deck" lines, word for word. */
export function breakdownLines(card: OwnershipCard, locked: boolean): string[] {
  const lines = [
    `Owned for decks: ${card.ownedForDecks}${card.ownedExcluded > 0 ? ` (${card.ownedExcluded} more excluded from decks)` : ''}`,
    `Locked by other decks: ${card.lockedByOthers}`,
    `Available to this deck: ${card.available}${card.extra > 0 ? ` (${card.extra} extra)` : ''}`,
    `This deck needs: ${card.cardRequired}`,
  ];
  if (locked) lines.push(`Locked in by this deck: ${card.heldByThisDeck ?? 0}`);
  return lines;
}

/** OWN-041: one printing row, e.g. "OGN-012 Foil ×1 · Collector", "Printing not specified ×2". */
export function printingRowText(row: OwnedPrintingRow): string {
  let head: string;
  if (row.kind === 'unassigned') head = 'Printing not specified';
  else if (row.kind === 'missing-printing') head = `Printing no longer found (${row.printingCode ?? row.printingId ?? '?'})`;
  else head = [row.printingCode ?? row.printingId ?? 'Unknown printing', row.variantLabel].filter(Boolean).join(' ');
  const tags = row.excludedByTagNames.length ? ` · ${row.excludedByTagNames.join(', ')}` : '';
  return `${head} ×${row.count}${tags}`;
}

/** Decks Components §12: the accessible name of a printing row's Collection link. */
export function printingRowLabel(row: OwnedPrintingRow): string {
  const head =
    row.kind === 'unassigned'
      ? 'Printing not specified'
      : row.kind === 'missing-printing'
        ? `Printing no longer found (${row.printingCode ?? row.printingId ?? '?'})`
        : (row.printingCode ?? row.printingId ?? 'Unknown printing');
  return `Show in Collection: ${head}, ${row.count} ${row.count === 1 ? 'copy' : 'copies'}`;
}

/** SHARE-043: "Jinx Aggro · needs 2 · Locked, holds 2" / "Draven Midrange · needs 3 · Not locked". */
export function otherUseText(use: CardUse): string {
  return `${use.deckName} · needs ${use.need} · ${use.locked ? `Locked, holds ${use.hold}` : 'Not locked'}`;
}

/** OWN-014 / OWN-060 card facts: "Spell · Spell", "Domains: Fury, Calm", "Energy 2 · Might 3"; null when absent. */
export function cardFacts(card: OwnershipCard): { typeLine: string; domains: string; stats: string | null; text: string } | null {
  const c = card.card;
  if (!c) return null;
  const category = c.category === 'unknown' ? 'Unknown' : c.category.charAt(0).toUpperCase() + c.category.slice(1);
  const domains = c.domains === null ? 'Domains: Unknown' : c.domains.length === 0 ? 'No domain' : `Domains: ${c.domains.join(', ')}`;
  const stats = (
    [
      ['Energy', c.stats.energy],
      ['Might', c.stats.might],
      ['Cost', c.stats.cost],
      ['Power', c.stats.power],
    ] as const
  )
    .filter(([, v]) => v !== null)
    .map(([k, v]) => `${k} ${v}`)
    .join(' · ');
  return { typeLine: `${c.type} · ${category}`, domains, stats: stats || null, text: c.text };
}

/** OWN-016: the full art of the card's default printing (the tile shows the thumbnail). */
export function fullArtUrl(card: OwnershipCard, catalog: CollectionCatalogView | null): string | null {
  const c = card.card;
  if (!c || !catalog) return null;
  return catalog.printings[c.defaultPrintingId]?.art.fullUrl ?? null;
}

// ---------------------------------------------------------------- missing list (OWN-051…053)

export interface MissingGroup {
  zone: DeckZone;
  label: string;
  lines: MissingLine[];
}

/** OWN-051: the missing lines grouped by zone in section order. */
export function missingGroups(view: DeckOwnershipView): MissingGroup[] {
  return ZONE_ORDER.map((zone) => ({ zone, label: ZONE_LABEL[zone], lines: view.missing.filter((m) => m.zone === zone) })).filter(
    (g) => g.lines.length > 0,
  );
}

export function missingCopies(view: DeckOwnershipView): number {
  return view.missing.reduce((n, m) => n + m.missing, 0);
}

/** OWN-053 "Copy as one list": per cardKey, deck order of first appearance, `<total missing> <name>`, no labels. */
export function mergedMissingText(missing: readonly MissingLine[]): string {
  const totals = new Map<string, { name: string; n: number }>();
  for (const m of missing) {
    const t = totals.get(m.cardKey);
    if (t) t.n += m.missing;
    else totals.set(m.cardKey, { name: m.name, n: m.missing });
  }
  return [...totals.values()].map((t) => `${t.n} ${t.name}`).join('\n');
}

// ---------------------------------------------------------------- export, duplicate, rename (DECK-081, 084, 085)

/** DECK-085: Riot-style text, sections in order, `<qty> <canonical name>` in stored order, empty zones omitted. */
export function exportDeckText(deck: UserDeck, catalog: CollectionCatalogView | null): string {
  const name = (k: string, stored: string) => catalog?.cards[k]?.name ?? stored;
  return ZONE_ORDER.map((zone) => {
    const entries = zone === 'legend' || zone === 'champion' ? (deck[zone] ? [deck[zone]!] : []) : deck[zone];
    if (entries.length === 0) return null;
    return [EXPORT_LABEL[zone], ...entries.map((e) => `${e.qty} ${name(e.cardKey, e.name)}`)].join('\n');
  })
    .filter((s): s is string => s !== null)
    .join('\n\n');
}

/** DECK-085: `<name>.txt`, unsafe file-name characters replaced by `_`. */
export function exportFileName(name: string): string {
  // eslint-disable-next-line no-control-regex
  const safe = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim();
  return `${safe || 'deck'}.txt`;
}

/**
 * DECK-084: a new deck with a new id, `<name> (copy)` within 80 characters (the original name is shortened so the
 * " (copy)" suffix stays), the same zones, notes and source, new timestamps and `duplicatedFrom`. Never locked
 * (SHARE-026: locks live in the lock store, not on the deck).
 */
export function duplicateDeck(deck: UserDeck, id: string, nowIso: string): UserDeck {
  const suffix = ' (copy)';
  const base = deck.name.slice(0, LIMITS.maxDeckName - suffix.length).trimEnd();
  return {
    ...structuredClone(deck),
    id,
    name: `${base}${suffix}`,
    createdAt: nowIso,
    updatedAt: nowIso,
    duplicatedFrom: deck.id,
  };
}

/** The Rename dialog's fields (OWN-118 (a), DECK-081). */
export interface RenameForm {
  name: string;
  description: string;
  sourceText: string;
  sourceUrl: string;
}

export const RENAME_TEXT = {
  nameRequired: 'Give the deck a name.',
  nameTooLong: `Use at most ${LIMITS.maxDeckName} characters.`,
  descriptionTooLong: `Use at most ${LIMITS.maxDeckNotes.toLocaleString('en-US')} characters.`,
} as const;

export type RenameResult =
  | { ok: true; deck: UserDeck; nameChanged: boolean; changed: boolean; urlInvalid: boolean }
  | { ok: false; errors: Partial<Record<'name' | 'description' | 'source', string>> };

/**
 * OWN-118 / DECK-081 / DECK-073: validate the form and build the renamed record. Only `name`, `notes` and, for a
 * `kind: 'user'` deck, `source` change; a tournament deck's source is never touched (DECK-061). `sourceOf` is the
 * DECK-071 parser (Deck Import's `deckSource`), passed in so the rules stay in one place.
 */
export function applyRename(
  deck: UserDeck,
  form: RenameForm,
  sourceOf: (text: string, url: string) => { text: string | null; url: string | null; urlInvalid: boolean; error: string | null },
): RenameResult {
  const errors: Partial<Record<'name' | 'description' | 'source', string>> = {};
  const name = form.name.trim();
  if (name.length === 0) errors.name = RENAME_TEXT.nameRequired;
  else if (name.length > LIMITS.maxDeckName) errors.name = RENAME_TEXT.nameTooLong;
  const notes = form.description.trim();
  if (notes.length > LIMITS.maxDeckNotes) errors.description = RENAME_TEXT.descriptionTooLong;
  let source = deck.source;
  let urlInvalid = false;
  if (deck.source.kind === 'user') {
    const s = sourceOf(form.sourceText, form.sourceUrl);
    if (s.error) errors.source = s.error;
    urlInvalid = s.urlInvalid;
    source = { kind: 'user', text: s.text, url: s.url };
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const sourceChanged = JSON.stringify(source) !== JSON.stringify(deck.source);
  const nameChanged = name !== deck.name;
  const changed = nameChanged || notes !== deck.notes || sourceChanged;
  return { ok: true, deck: { ...deck, name, notes, source }, nameChanged, changed, urlInvalid };
}

/** DECK-091: a record newer than schemaVersion 1 is shown read-only (the same rule as `summarizeDeck`). */
export function isReadOnlyDeck(deck: { schemaVersion: number }): boolean {
  return deck.schemaVersion > 1;
}

/**
 * DECK-091: a stored record with a newer `schemaVersion` that still has the deck fields this page shows, or null.
 * The store refuses to read it (it is never overwritten); the page shows it read-only.
 */
export function newerDeckRecord(raw: string | null, id: string): UserDeck | null {
  if (raw === null) return null;
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof v !== 'object' || v === null) return null;
  const d = v as Record<string, unknown>;
  const list = (k: string) => Array.isArray(d[k]) && (d[k] as unknown[]).every(isDeckCard);
  if (typeof d['schemaVersion'] !== 'number' || d['schemaVersion'] <= 1) return null;
  if (d['id'] !== id || typeof d['name'] !== 'string') return null;
  if (!list('main') || !list('sideboard') || !list('runes') || !list('battlefields')) return null;
  if (d['legend'] != null && !isDeckCard(d['legend'])) return null;
  if (d['champion'] != null && !isDeckCard(d['champion'])) return null;
  const source = d['source'] as UserDeck['source'] | undefined;
  return {
    ...(d as unknown as UserDeck),
    format: 'standard',
    notes: typeof d['notes'] === 'string' ? (d['notes'] as string) : '',
    source: source && (source.kind === 'user' || source.kind === 'tournament') ? source : { kind: 'user', text: null, url: null },
    legend: (d['legend'] as UserDeck['legend']) ?? null,
    champion: (d['champion'] as UserDeck['champion']) ?? null,
  };
}

function isDeckCard(v: unknown): boolean {
  if (typeof v !== 'object' || v === null) return false;
  const c = v as Record<string, unknown>;
  return typeof c['cardKey'] === 'string' && typeof c['name'] === 'string' && Number.isInteger(c['qty']) && (c['qty'] as number) >= 1;
}

// ---------------------------------------------------------------- rule check (OWN-117)

export interface RuleCheckContent {
  label: string;
  verdict: 'legal' | 'illegal' | 'incomplete';
  /** LEGAL-R07 messages of failed rules (none until the SPEC-002 engine is in `web/`, H-194). */
  failed: string[];
  /** DECK-052 reasons the deck was not fully checked. */
  notChecked: string[];
  /** DECK-051 wording, one line per banned / upcoming-banned card, with its zone. */
  banned: { text: string; zone: string; upcoming: boolean }[];
}

/**
 * Not in the spec: why the check is incomplete while `web/` has no SPEC-002 engine (H-194) or ban data
 * (`CardData.loadBans()` resolves to null). Shown under "Not checked".
 */
export const RULE_CHECK_TEXT = {
  noEngine: "The deck rules aren't checked in this version of Rift Builder yet.",
  noBans: "The ban list couldn't load, so banned cards can't be checked.",
  noCatalog: "Card data didn't load, so the cards can't be checked.",
} as const;

export function ruleCheckContent(view: DeckOwnershipView, legalityLabel: string, verdict: RuleCheckContent['verdict']): RuleCheckContent {
  const notChecked: string[] = [];
  if (verdict === 'incomplete') notChecked.push(RULE_CHECK_TEXT.noEngine);
  const cards = deckCards(view);
  if (view.catalogVersion === null) notChecked.push(RULE_CHECK_TEXT.noCatalog);
  if (cards.some((c) => c.banStatus.status === 'unknown')) notChecked.push(RULE_CHECK_TEXT.noBans);
  const banned: RuleCheckContent['banned'] = [];
  for (const c of cards) {
    const b = c.banStatus;
    if (b.status === 'banned') banned.push({ text: `${c.name}, banned since ${formatIsoDate(b.bannedSince)}`, zone: ZONE_LABEL[c.zone], upcoming: false });
    if (b.status === 'upcoming') banned.push({ text: `${c.name}, will be banned from ${formatIsoDate(b.effective)}`, zone: ZONE_LABEL[c.zone], upcoming: true });
  }
  return { label: legalityLabel, verdict, failed: [], notChecked, banned };
}

// ---------------------------------------------------------------- device setting (OWN-114)

/** OWN-114: Card view or List view, remembered on this device (never `rift.*`, never synced or cleared on sign-out). */
export type DeckViewMode = 'card' | 'list';
export const DECK_VIEW_KEY = 'deck-view';

export function parseViewMode(raw: string | null): DeckViewMode {
  return raw === 'list' ? 'list' : 'card';
}
