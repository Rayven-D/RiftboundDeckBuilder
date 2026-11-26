/**
 * SPEC-006 Deck Import, the review and the record it saves (H-253): name resolution against the card catalog
 * (DECK-015, DECK-040, DECK-041), sections to zones (DECK-020…026), zones rebuilt from card data where there is no
 * section (DECK-030…039), the deck's name, source and description (DECK-070…076) and the `UserDeck` draft
 * (DECK-090…096). Pure: no Angular, no storage, no clock (the caller passes `today`);
 * `core/import/deck-import.ts` does the write.
 *
 * Resolution, as in the Owned Cards Import (H-158): a name through the SPEC-001 name lookup (DECK-040, IMP-025: exact
 * `nameKey`, then the optional leading "a" / "the" of CARD-034), a printing code through `printingLookup` (CARD-036,
 * IMP-067…069; the IMP-067 guard and IMP-068 compare names exactly, as those rows say). A name several cards share
 * under CARD-034 is `AMBIGUOUS_NAME` with those cards to pick from. Fuzzy suggestions (IMP-026…030, DECK-043) are
 * not built yet; such a line "needs attention" and blocks Save until the user removes it or goes back and fixes the
 * text (DECK-041).
 *
 * Legality (DECK-050…056) is not shown: there is no SPEC-002 engine or ban data in `web/` yet (H-194).
 */
import { type NameLookupResult, nameKey, nameLookup } from '../../core/cards/name-key';
import type { CardCategory, CollectionCatalogView, PlayableCard } from '../../core/decks/types';
import { LIMITS, type CardKey, type DeckCard, type DeckSourceFormat, type UserDeck } from '../storage/records';
import { type ImportCommitter, printingLookup } from './collection-commit';
import { type DeckSection, type ParseResult, type ParsedEntry, SECTION_LABELS, sectionLabelOf } from './parse-card-list';

/** SPEC-006 `DeckZone` (= SPEC-002 `Zone`). */
export type DeckZone = DeckSection;
export type ZoneMethod = 'section' | 'inferred' | 'user';

/** Riot's section order (DECK-085), used for the review's zone counts and pickers. */
export const DECK_ZONE_ORDER: readonly DeckZone[] = ['legend', 'champion', 'main', 'battlefields', 'runes', 'sideboard'];

/** DECK-037: the Main Deck holds 39 cards next to the Chosen Champion. */
export const MAIN_DECK_SIZE = 39;
/** DECK-071 */
export const MAX_SOURCE_TEXT = 200;
export const MAX_SOURCE_URL = 2048;

export type DeckIssueCode =
  | 'ZONE_CATEGORY_MISMATCH'
  | 'NO_SIDEBOARD_SECTION'
  | 'TOKEN_NOT_DECK_CARD'
  | 'SOURCE_URL_INVALID'
  | 'DECK_LIMIT'
  | 'DECK_TOO_LARGE'
  | 'STORAGE_FULL';

/** Why a line can't be saved yet (DECK-015, DECK-041). */
export type AttentionCode =
  | 'UNKNOWN_CARD'
  | 'AMBIGUOUS_NAME'
  | 'UNKNOWN_PRINTING'
  | 'PRINTING_NAME_MISMATCH'
  | 'AMBIGUOUS_PRINTING';

/** One parsed entry after name resolution (fixed for the review; the user's choices live in `DeckReviewState`). */
export interface DeckImportLine {
  /** Index in `PreparedDeck.lines`; the key of every per-line choice. */
  readonly id: number;
  /** 1-based line (or row) number in the text box. */
  readonly line: number;
  /** The line as written (trimmed), for `importRemovedLines` (DECK-042). */
  readonly raw: string;
  readonly qty: number;
  /** The section label in effect, or null (unsectioned, DECK-030). */
  readonly section: DeckSection | null;
  /** The resolved card, or null when the line needs attention. */
  readonly card: PlayableCard | null;
  /** Set when the line needs attention (blocks Save, DECK-041). */
  readonly attention: { readonly code: AttentionCode; readonly message: string } | null;
  /** Cards the user can pick for this line (DECK-015: the code's card or the named card; DECK-040: the cards a name
   * matches under CARD-034, by `cardKey`). */
  readonly choices: readonly PlayableCard[];
  /** A note on a resolved line that does not block Save (IMP-068 c, IMP-069 a). */
  readonly note: string | null;
  /** H-452: `codeUsed` = the code's card was used over the typed name (IMP-068 c); `nameUsed` = IMP-069 (a). */
  readonly noteKind: 'codeUsed' | 'nameUsed' | null;
  /** The printing code as written on the line (DECK-015), or null. */
  readonly code: string | null;
}

/** What Continue produced: the resolved lines and what the review needs from the catalog. */
export interface PreparedDeck {
  readonly status: 'ok';
  readonly lines: readonly DeckImportLine[];
  /** DECK-076 */
  readonly sourceFormat: DeckSourceFormat;
  readonly catalogVersion: string;
  /** Sections the input has (with or without entries left), for "the input has no Legend section" (DECK-033, 034, 037). */
  readonly sections: ReadonlySet<DeckSection>;
  /** Catalog search for PICK_LEGEND (DECK-036): every `legend` card, by name. */
  readonly legends: readonly PlayableCard[];
  /** Catalog search for PICK_CHAMPION (DECK-034): every Champion Unit, by name. */
  readonly champions: readonly PlayableCard[];
  readonly catalog: CollectionCatalogView;
}

/** What the review's Save passes to the committer: the record as the review built it (`DeckReview.draft`). */
export interface DeckSaveRequest {
  readonly draft: Omit<UserDeck, 'id' | 'createdAt' | 'updatedAt'>;
}

/** Deck Import on the H-158 dialog seam (H-273): `core/import/deck-import.ts` implements it. */
export type DeckImportCommitter = ImportCommitter<PreparedDeck, DeckSaveRequest>;

/** The user's choices in the review. Every field is a fresh object per change (signals compare by identity). */
export interface DeckReviewState {
  /** DECK-041 / DECK-042: lines the user removed. */
  readonly removed: ReadonlySet<number>;
  /** DECK-015: the card picked for a line that needed attention. */
  readonly picks: ReadonlyMap<number, CardKey>;
  /** PICK_ZONE answers (DECK-035), "Move to" (DECK-023) and zone changes of inferred lines (DECK-030). */
  readonly zones: ReadonlyMap<number, DeckZone>;
  /** PICK_LEGEND answer (DECK-033, DECK-036). */
  readonly legend: CardKey | 'empty' | null;
  /** PICK_CHAMPION answer (DECK-034). */
  readonly champion: CardKey | 'empty' | null;
  /** DECK-070: null until the user types in the name field; then never overwritten. */
  readonly typedName: string | null;
  /** DECK-071 */
  readonly sourceText: string;
  readonly sourceUrl: string;
}

export const EMPTY_REVIEW_STATE: DeckReviewState = {
  removed: new Set(),
  picks: new Map(),
  zones: new Map(),
  legend: null,
  champion: null,
  typedName: null,
  sourceText: '',
  sourceUrl: '',
};

export type ZoneQuestion =
  | {
      readonly kind: 'PICK_LEGEND';
      /** Lines the question is about ([] = no Legend in the input, DECK-036). */
      readonly lineIds: readonly number[];
      /** [] = free catalog search (`PreparedDeck.legends`). */
      readonly candidates: readonly PlayableCard[];
      readonly answer: CardKey | 'empty' | null;
    }
  | {
      readonly kind: 'PICK_CHAMPION';
      readonly lineIds: readonly number[];
      /** May be empty; the catalog search (`PreparedDeck.champions`) is offered next to them. */
      readonly candidates: readonly PlayableCard[];
      readonly answer: CardKey | 'empty' | null;
    }
  | { readonly kind: 'PICK_ZONE'; readonly lineIds: readonly [number]; readonly answer: null };

/**
 * A question's identity across reviews (H-450): its kind and its first line. The review tracks questions by this key,
 * so when an answered question leaves the list the next one keeps its own select, never the old one's value.
 */
export function questionKey(q: ZoneQuestion): string {
  return `${q.kind}:${q.lineIds[0] ?? ''}`;
}

/** One line as it stands in the review. */
export interface ReviewLine {
  readonly id: number;
  readonly line: number;
  readonly qty: number;
  /** Canonical name when resolved, else the text as typed. */
  readonly name: string;
  readonly zone: DeckZone | null;
  readonly zoneMethod: ZoneMethod | null;
  /** DECK-030: why an inferred zone was chosen, e.g. "Card type is Battlefield". */
  readonly zoneReason: string | null;
  /** H-452: copies of this line that were in the Chosen Champion zone and went to `main` (DECK-027, DECK-034 b). */
  readonly movedToMain: number;
  /** DECK-022 / DECK-023: the zone the card data expects, when it disagrees with the section. */
  readonly mismatch: { readonly message: string; readonly moveTo: DeckZone } | null;
}

export interface SlotInfo {
  readonly name: string;
  readonly method: ZoneMethod | null;
  readonly reason: string | null;
}

export interface ReviewNote {
  /** The line's id (`DeckImportLine.id`), for Remove line. */
  readonly id: number;
  readonly line: number;
  readonly message: string;
  /** H-452: the code's card was used instead of the typed name, so the review offers Remove line. */
  readonly removable: boolean;
}

export interface ReviewIssue {
  readonly code: DeckIssueCode;
  readonly severity: 'warning' | 'info';
  readonly message: string;
  readonly line?: number;
}

export interface DeckReview {
  /** Lines that still need attention (not removed, not picked), DECK-041. */
  readonly attention: readonly DeckImportLine[];
  /** Every placed line, in input order. */
  readonly lines: readonly ReviewLine[];
  /** The single slots as they stand (DECK-030: how each was chosen). */
  readonly slots: {
    readonly legend: SlotInfo | null;
    readonly champion: SlotInfo | null;
  };
  /** Open and answered zone questions, in the order they are asked. */
  readonly questions: readonly ZoneQuestion[];
  readonly issues: readonly ReviewIssue[];
  /** Resolution notes on resolved lines (DECK-015 warnings), by line. */
  readonly notes: readonly ReviewNote[];
  /** H-452: lines left out of the deck (DECK-042), in `importRemovedLines` order: line number and card name or text. */
  readonly removedLines: readonly { readonly line: number; readonly name: string }[];
  /** Copies per zone (DECK-001 summary). */
  readonly byZone: Readonly<Record<DeckZone, number>>;
  /** DECK-070: the default name for the Legend as it stands now. */
  readonly defaultName: string;
  /** What the name field shows: the typed name, else the default. */
  readonly name: string;
  readonly nameError: string | null;
  readonly sourceError: string | null;
  /** DECK-038 / DECK-041 */
  readonly blockers: { readonly unresolvedLines: number; readonly openQuestions: number };
  readonly canSave: boolean;
  /** The record Save writes, without `id`, `createdAt` and `updatedAt` (SPEC-006 `DeckImportResult.draft`). */
  readonly draft: Omit<UserDeck, 'id' | 'createdAt' | 'updatedAt'>;
}

export const DECK_REVIEW_TEXT = {
  unknownCard: (name: string) => `No card named "${name}" in the card data.`,
  /** DECK-040 / IMP-025 `AMBIGUOUS_NAME` (several cards share the name without its leading "a" / "the"). */
  ambiguousName: (name: string) => `"${name}" matches more than one card. Pick one.`,
  unknownCode: (code: string) => `${code} isn't in the card data. Add the card name or fix the code.`,
  codeMismatch: (code: string, codeCard: string, named: string) => `${code} is ${codeCard}, but the line says ${named}.`,
  ambiguousCode: (code: string) => `${code} matches more than one card in the card data.`,
  codeUsed: (code: string, card: string) => `${code} is ${card}, so that card was used.`,
  nameUsed: (code: string) => `${code} isn't in the card data, so the card name was used.`,
  /** DECK-026 */
  token: (name: string) => `${name} is a token and can't be put in a deck`,
  /** DECK-022 */
  mismatch: (name: string, type: string) => `${name} is a ${type}`,
  /** DECK-034: a card under `Champion:` that was not picked as the Chosen Champion (a line's zone reason; H-452). */
  championNotPicked: 'Not picked as Chosen Champion, so it moves to the Main Deck',
  /** DECK-027 / DECK-034: the Chosen Champion had more copies; `n` = the extra copies (a line's zone reason; H-452). */
  championExtraToMain: (n: number) =>
    `1 copy is the Chosen Champion; ${n === 1 ? 'the other copy moves' : `the other ${n} move`} to the Main Deck`,
  /** DECK-037 */
  noSideboard:
    'This list has no Sideboard section, so all cards are in the Main Deck. Move sideboard cards if needed.',
  /** DECK-071 */
  sourceUrlInvalid: 'This link isn\'t an http or https address, so it is kept as text.',
  sourceTooLong: `The source can be at most ${MAX_SOURCE_TEXT} characters.`,
  nameRequired: 'Give the deck a name.',
  /** DECK-041 (AC 8): "1 card needs attention". */
  needAttention: (n: number) => `${n} ${n === 1 ? 'card needs' : 'cards need'} attention`,
  /** AC 3: "1 question to answer". */
  questions: (n: number) => `${n} ${n === 1 ? 'question' : 'questions'} to answer`,
  /** DECK-070 fallback. */
  fallbackName: (date: string) => `Imported deck ${date}`,
} as const;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** SPEC-006 shared display rule: `MMM D, YYYY` in English (e.g. `Nov 23, 2026`), the user's local date. */
export function displayDate(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

const CATEGORY_LABEL: Readonly<Record<CardCategory, string>> = {
  legend: 'Legend',
  champion: 'Champion Unit',
  unit: 'Unit',
  spell: 'Spell',
  gear: 'Gear',
  rune: 'Rune',
  battlefield: 'Battlefield',
  token: 'Token',
  unknown: 'Unknown',
};

/** SPEC-002 Champion Unit: `category === 'champion'` or `isChampionUnit === true`. */
export function isChampionUnit(c: PlayableCard): boolean {
  return c.category === 'champion' || c.isChampionUnit === true;
}

const byName = (a: PlayableCard, b: PlayableCard) => a.name.localeCompare(b.name);

/**
 * Continue: resolves every entry against the catalog (DECK-015, DECK-040). `sourceLines` is the text box split into
 * lines (`sourceLines()` in parse-card-list), so a removed line keeps its text as written (DECK-042).
 */
export function prepareDeckImport(
  parse: ParseResult,
  sourceLines: readonly string[],
  catalog: CollectionCatalogView,
): PreparedDeck {
  const lookup = printingLookup(catalog);
  const findName = nameLookup(Object.keys(catalog.cards));
  const exact = (name: string): PlayableCard | null => {
    const key = nameKey(name);
    return (key && catalog.cards[key]) || null;
  };
  const sections = new Set<DeckSection>();
  for (const text of sourceLines) {
    const label = sectionLabelOf(text);
    if (label) sections.add(label);
  }
  const lines: DeckImportLine[] = [];
  for (const e of parse.entries) {
    if (e.section) sections.add(e.section);
    if (e.quantity <= 0) continue; // ZERO_QUANTITY adds nothing (IMP-008)
    const raw = (sourceLines[e.line - 1] ?? '').trim() || rawOf(e);
    const base = { id: lines.length, line: e.line, raw, qty: e.quantity, section: e.section, code: e.printing?.text ?? null };
    lines.push({ ...base, ...resolveEntry(e, exact, findName, lookup, catalog) });
  }
  const cards = Object.values(catalog.cards);
  return {
    status: 'ok',
    lines,
    sourceFormat: parse.format,
    catalogVersion: catalog.catalogVersion,
    sections,
    legends: cards.filter((c) => c.category === 'legend').sort(byName),
    champions: cards.filter(isChampionUnit).sort(byName),
    catalog,
  };
}


function rawOf(e: ParsedEntry): string {
  return [String(e.quantity), e.name, e.printing?.text].filter(Boolean).join(' ');
}

type Resolution = Pick<DeckImportLine, 'card' | 'attention' | 'choices' | 'note' | 'noteKind'>;

function resolveEntry(
  e: ParsedEntry,
  exact: (name: string) => PlayableCard | null,
  findName: (name: string) => NameLookupResult,
  lookup: ReturnType<typeof printingLookup>,
  catalog: CollectionCatalogView,
): Resolution {
  const T = DECK_REVIEW_TEXT;
  const ok = (card: PlayableCard, note: string | null = null, noteKind: Resolution['noteKind'] = null): Resolution => ({
    card,
    attention: null,
    choices: [],
    note,
    noteKind: note ? noteKind : null,
  });
  const needs = (code: AttentionCode, message: string, choices: PlayableCard[] = []): Resolution => ({
    card: null,
    attention: { code, message },
    choices,
    note: null,
    noteKind: null,
  });
  // DECK-040 / IMP-025 / CARD-034: exact name, then the optional leading article; several cards → AMBIGUOUS_NAME.
  const resolveName = (name: string, note: string | null = null): Resolution => {
    const r = findName(name);
    if (r.status === 'found') return ok(catalog.cards[r.cardKey], note, 'nameUsed');
    if (r.status === 'ambiguous') {
      return needs('AMBIGUOUS_NAME', T.ambiguousName(name), r.cardKeys.map((k) => catalog.cards[k]));
    }
    return needs('UNKNOWN_CARD', T.unknownCard(name));
  };
  if (!e.printing) return resolveName(e.name);
  // IMP-067 exact-name guard: the card part as typed (name and code together) is itself a card name.
  if (e.name) {
    const whole = exact(`${e.name} ${e.printing.text}`) ?? exact(`${e.printing.text} ${e.name}`);
    if (whole) return ok(whole);
  }
  const code = e.printing.text;
  const found = lookup(e.printing.setCode, e.printing.collectorNumber);
  if (found.status === 'found') {
    const codeCard = catalog.cards[found.cardKey];
    if (!e.name || nameKey(e.name) === found.cardKey) return ok(codeCard);
    const named = exact(e.name);
    // DECK-015: PRINTING_NAME_MISMATCH blocks Save until the user picks (IMP-068 b).
    if (named) return needs('PRINTING_NAME_MISMATCH', T.codeMismatch(code, codeCard.name, named.name), [codeCard, named]);
    return ok(codeCard, T.codeUsed(code, codeCard.name), 'codeUsed'); // IMP-068 (c)
  }
  if (found.status === 'ambiguous') return needs('AMBIGUOUS_PRINTING', T.ambiguousCode(code));
  if (!e.name) return needs('UNKNOWN_PRINTING', T.unknownCode(code)); // code-only, IMP-069 (b)
  return resolveName(e.name, T.nameUsed(code)); // IMP-069 (a)
}

/** DECK-032 / DECK-022: the zone the card data puts a card in (`null` = unknown, ask). Champion Units → `main`. */
export function expectedZone(c: PlayableCard): DeckZone | null {
  switch (c.category) {
    case 'legend':
      return 'legend';
    case 'rune':
      return 'runes';
    case 'battlefield':
      return 'battlefields';
    case 'champion':
    case 'unit':
    case 'spell':
    case 'gear':
      return 'main';
    default:
      return null; // token (rejected, DECK-026) and unknown (PICK_ZONE, DECK-035)
  }
}

/** DECK-022: does a section disagree with known card data? Returns the expected zone, or null. */
function sectionMismatch(c: PlayableCard, zone: DeckZone): DeckZone | null {
  if (c.category === 'unknown' || c.category === 'token') return null;
  const own = expectedZone(c);
  if (own === null) return null;
  const fixedZone = c.category === 'legend' || c.category === 'rune' || c.category === 'battlefield';
  if (fixedZone) return zone === own ? null : own; // a legend, rune or battlefield outside its own zone
  if (zone === 'legend') return own; // a known non-legend under Legend
  if (zone === 'champion') {
    if (c.category === 'champion') return null;
    if (c.category === 'unit' && c.isChampionUnit !== false) return null; // `null` is "not known": no warning
    return own; // a known non-Champion Unit under Champion
  }
  if (zone === 'runes' || zone === 'battlefields') return own; // unit, spell, gear or champion there
  return null;
}

interface Placed {
  readonly line: DeckImportLine;
  readonly card: PlayableCard;
  zone: DeckZone | null;
  method: ZoneMethod | null;
  reason: string | null;
  mismatch: ReviewLine['mismatch'];
  /** Unsectioned legend (DECK-033) or Champion Unit (DECK-034) waiting for the slot rules. */
  pending: 'legend' | null;
  /** Copies moved to `champion` from this `main` line (DECK-034, unsectioned or under `Champion:`). */
  movedToChampion: number;
  /** Dropped by the slot rules (an unpicked Legend; DECK-033), saved in `importRemovedLines`. */
  dropped: boolean;
  /** In the Chosen Champion zone, sent to `main` by the slot rules (DECK-027, DECK-034 b). */
  fromChampion: boolean;
}

/**
 * The review as it stands for the user's choices (DECK-020…044, DECK-070…076). Pure; recompute on every change.
 * `today` is the user's local date (the name fallback, DECK-070).
 */
export function reviewDeck(p: PreparedDeck, s: DeckReviewState, today: Date): DeckReview {
  const T = DECK_REVIEW_TEXT;
  const issues: ReviewIssue[] = [];
  const notes: ReviewNote[] = [];
  const removedRaw: string[] = [];
  const removedLines: { line: number; name: string }[] = [];
  const leaveOut = (line: DeckImportLine, card: PlayableCard | null) => {
    removedRaw.push(line.raw);
    removedLines.push({ line: line.line, name: card?.name ?? line.raw });
  };
  const attention: DeckImportLine[] = [];
  const placed: Placed[] = [];
  const questions: ZoneQuestion[] = [];

  for (const line of p.lines) {
    if (s.removed.has(line.id)) {
      leaveOut(line, line.card ?? line.choices.find((c) => c.cardKey === s.picks.get(line.id)) ?? null);
      continue;
    }
    let card = line.card;
    if (!card) {
      const pick = s.picks.get(line.id);
      const picked = pick ? line.choices.find((c) => c.cardKey === pick) : undefined;
      if (!picked) {
        attention.push(line);
        continue;
      }
      card = picked;
      // H-452: the user kept the code's card over the typed name (DECK-015, IMP-068 b): same warning as IMP-068 (c).
      if (line.attention?.code === 'PRINTING_NAME_MISMATCH' && line.code && picked === line.choices[0])
        notes.push({ id: line.id, line: line.line, message: T.codeUsed(line.code, picked.name), removable: true });
    } else if (line.note)
      notes.push({ id: line.id, line: line.line, message: line.note, removable: line.noteKind === 'codeUsed' });
    // DECK-026: tokens are rejected in any section, with a warning; their text goes to importRemovedLines.
    if (card.category === 'token') {
      issues.push({ code: 'TOKEN_NOT_DECK_CARD', severity: 'warning', message: T.token(card.name), line: line.line });
      leaveOut(line, card);
      continue;
    }
    placed.push(place(line, card, s.zones.get(line.id) ?? null));
  }

  // ---- Legend slot (DECK-033, DECK-036; data contract note: single slot) ----
  const inLegend = placed.filter((x) => x.zone === 'legend');
  const unsectionedLegends = placed.filter((x) => x.pending === 'legend');
  const legendLines = [...inLegend, ...unsectionedLegends];
  const legendCards = distinctCards(legendLines);
  let legend: PlayableCard | null = null;
  let legendMethod: ZoneMethod | null = null;
  let legendOpen = false;
  const answerLegend = (candidates: PlayableCard[], lineIds: number[]) => {
    const a = s.legend;
    const valid =
      a === 'empty' ||
      (a !== null && (candidates.length ? candidates.some((c) => c.cardKey === a) : p.legends.some((c) => c.cardKey === a)));
    questions.push({ kind: 'PICK_LEGEND', lineIds, candidates, answer: valid ? a : null });
    if (!valid) {
      legendOpen = true;
      return;
    }
    legendMethod = 'user';
    legend = a === 'empty' ? null : (p.catalog.cards[a as CardKey] ?? null);
  };
  if (legendCards.length === 0) {
    answerLegend([], []); // DECK-036: no Legend in the input at all
  } else if (unsectionedLegends.length === 0 && legendCards.length === 1) {
    legend = legendCards[0];
    legendMethod = inLegend[0].method;
  } else if (
    inLegend.length === 0 &&
    unsectionedLegends.length === 1 &&
    unsectionedLegends[0].line.qty === 1 &&
    !p.sections.has('legend')
  ) {
    legend = legendCards[0];
    legendMethod = 'inferred';
    const x = unsectionedLegends[0];
    x.zone = 'legend';
    x.method = 'inferred';
    x.reason = 'Card type is Legend';
  } else {
    answerLegend(legendCards, legendLines.map((x) => x.line.id));
  }
  // Lines of the Legend that was kept are in `legend`; the others (not picked) leave the deck.
  for (const x of legendLines) {
    if (legend && x.card.cardKey === (legend as PlayableCard).cardKey) {
      x.zone = 'legend';
      x.method ??= legendMethod;
    } else if (!legendOpen) {
      x.dropped = true;
    } else {
      x.zone = null; // waits for PICK_LEGEND
    }
  }

  // ---- Chosen Champion slot (DECK-034; single slot) ----
  const inChampion = placed.filter((x) => x.zone === 'champion');
  const championCards = distinctCards(inChampion);
  let champion: PlayableCard | null = null;
  let championMethod: ZoneMethod | null = null;
  let championReason: string | null = null;
  /** PICK_CHAMPION: `'open'` while unanswered, else the picked card (null = "Leave empty"). */
  const answerChampion = (candidates: PlayableCard[], lineIds: number[], withCatalog: boolean): PlayableCard | null | 'open' => {
    const a = s.champion;
    const valid =
      a === 'empty' ||
      (a !== null &&
        (candidates.some((c) => c.cardKey === a) || (withCatalog && p.champions.some((c) => c.cardKey === a))));
    questions.push({ kind: 'PICK_CHAMPION', lineIds, candidates, answer: valid ? a : null });
    if (!valid) return 'open';
    championMethod = 'user';
    return a === 'empty' ? null : (p.catalog.cards[a as CardKey] ?? null);
  };
  if (championCards.length === 1) {
    champion = championCards[0];
    championMethod = inChampion[0].method;
    championReason = inChampion[0].reason;
    // DECK-027 (H-410): the slot holds one copy. When the card's lines in `champion` add up to more than one copy
    // (`Champion: 2 X`, or X on two lines under `Champion:`), 1 stays in `champion` and the rest go to `main`
    // (merged by cardKey, DECK-021), each line keeping its method (`section`, or `user` if the user placed it).
    const copies = inChampion.reduce((n, x) => n + x.line.qty, 0);
    if (copies > 1) {
      inChampion.forEach((x, i) => {
        x.zone = 'main';
        x.fromChampion = true;
        x.movedToChampion = i === 0 ? 1 : 0;
        x.reason = T.championExtraToMain(copies - 1);
      });
    }
  } else if (championCards.length > 1) {
    // Two or more cards under `Champion:` (single slot, e.g. a precon's "Champion Unit Options"): the user picks
    // one. One copy of the pick is the Chosen Champion; every other copy is an ordinary Main Deck card (DECK-034:
    // copies not picked stay in `main`; Deck Construction Rules #1, #4). "Leave empty" puts them all in `main`.
    const picked = answerChampion(championCards, inChampion.map((x) => x.line.id), false);
    let pickedLine: Placed | undefined;
    const pickedCopies =
      picked && picked !== 'open'
        ? inChampion.filter((x) => x.card.cardKey === picked.cardKey).reduce((n, x) => n + x.line.qty, 0)
        : 0;
    for (const x of inChampion) {
      if (picked === 'open') {
        x.zone = null;
        continue;
      }
      x.zone = 'main';
      x.method = 'user';
      x.fromChampion = true;
      if (x.mismatch?.moveTo === 'main') x.mismatch = null; // now in the zone its card data expects
      if (picked && x.card.cardKey === picked.cardKey) {
        // The pick's first line gives the one copy (DECK-027); its other lines are extra copies, not unpicked cards.
        if (!pickedLine) {
          pickedLine = x;
          x.movedToChampion = 1;
        }
        x.reason = T.championExtraToMain(pickedCopies - 1);
      } else {
        x.reason = T.championNotPicked;
      }
    }
    champion = picked === 'open' ? null : picked;
  } else if (!p.sections.has('champion') && legend && !legendOpen) {
    // DECK-034: no Champion section and a known Legend.
    const lg: PlayableCard = legend;
    const fromMain = placed.filter(
      (x) =>
        x.zone === 'main' &&
        x.method === 'inferred' &&
        isChampionUnit(x.card) &&
        x.card.isSignature !== true &&
        !(x.card.championTag !== null && lg.championTag !== null && x.card.championTag !== lg.championTag),
    );
    const candidates = distinctCards(fromMain);
    const only = candidates.length === 1 ? candidates[0] : null;
    if (only && only.isSignature === false && only.championTag !== null && only.championTag === lg.championTag) {
      champion = only;
      championMethod = 'inferred';
      championReason = 'Only Champion Unit matching the Legend';
    } else {
      const picked = answerChampion(candidates, fromMain.map((x) => x.line.id), true);
      champion = picked === 'open' ? null : picked;
    }
    // One copy of a listed champion moves out of `main`; the rest stays there (DECK-034).
    const from = champion ? fromMain.find((x) => x.card.cardKey === champion!.cardKey) : undefined;
    if (from) from.movedToChampion = 1;
  }

  // ---- Zones (DECK-021: merged by cardKey within a zone, separate across zones) ----
  const lists: Record<'main' | 'sideboard' | 'runes' | 'battlefields', DeckCard[]> = {
    main: [],
    sideboard: [],
    runes: [],
    battlefields: [],
  };
  let legendCard: DeckCard | null = null;
  let championCard: DeckCard | null = null;
  const addTo = (zone: DeckZone, card: PlayableCard, qty: number) => {
    if (qty <= 0) return;
    if (zone === 'legend' || zone === 'champion') {
      const slot = zone === 'legend' ? legendCard : championCard;
      const next = slot && slot.cardKey === card.cardKey ? { ...slot, qty: slot.qty + qty } : { cardKey: card.cardKey, name: card.name, qty };
      if (zone === 'legend') legendCard = next;
      else championCard = next;
      return;
    }
    const list = lists[zone];
    const i = list.findIndex((c) => c.cardKey === card.cardKey);
    if (i >= 0) list[i] = { ...list[i], qty: list[i].qty + qty };
    else list.push({ cardKey: card.cardKey, name: card.name, qty });
  };
  for (const x of placed) {
    if (x.dropped) {
      leaveOut(x.line, x.card);
      continue;
    }
    if (x.zone === null) {
      if (x.pending === null && !questions.some((q) => q.lineIds.includes(x.line.id))) {
        questions.push({ kind: 'PICK_ZONE', lineIds: [x.line.id], answer: null }); // DECK-035
      }
      continue;
    }
    addTo(x.zone, x.card, x.line.qty - x.movedToChampion);
    if (x.movedToChampion) addTo('champion', x.card, x.movedToChampion);
  }
  // A champion picked from the catalog (DECK-034: none in the list) is one copy.
  if (champion && !championCard) {
    const c: PlayableCard = champion;
    championCard = { cardKey: c.cardKey, name: c.name, qty: 1 };
  }
  // A Legend picked from the catalog search (DECK-036) is one copy.
  if (legend && !legendCard) {
    const c: PlayableCard = legend;
    legendCard = { cardKey: c.cardKey, name: c.name, qty: 1 };
  }

  for (const x of placed) {
    if (x.mismatch && !x.dropped && x.zone !== null)
      issues.push({ code: 'ZONE_CATEGORY_MISMATCH', severity: 'warning', message: x.mismatch.message, line: x.line.line });
  }
  // DECK-037: no Sideboard section and unsectioned cards made the Main Deck longer than 39.
  const mainCopies = lists.main.reduce((n, c) => n + c.qty, 0);
  const unsectionedInMain = placed.some((x) => x.zone === 'main' && x.line.section === null);
  if (!p.sections.has('sideboard') && unsectionedInMain && mainCopies > MAIN_DECK_SIZE)
    issues.push({ code: 'NO_SIDEBOARD_SECTION', severity: 'info', message: T.noSideboard });

  // ---- Name (DECK-070), source (DECK-071), description (DECK-073) ----
  const legendName = (legendCard as DeckCard | null)?.name ?? null;
  const defaultName = legendName ? legendName.slice(0, LIMITS.maxDeckName) : T.fallbackName(displayDate(today));
  const name = s.typedName ?? defaultName;
  const trimmedName = name.trim();
  const nameError = trimmedName.length === 0 ? T.nameRequired : null;
  const source = deckSource(s.sourceText, s.sourceUrl);
  if (source.urlInvalid) issues.push({ code: 'SOURCE_URL_INVALID', severity: 'warning', message: T.sourceUrlInvalid });

  const openQuestions = questions.filter((q) => q.answer === null).length;
  const blockers = { unresolvedLines: attention.length, openQuestions };
  const byZone = Object.fromEntries(DECK_ZONE_ORDER.map((z) => [z, 0])) as Record<DeckZone, number>;
  const lc = legendCard as DeckCard | null;
  const cc = championCard as DeckCard | null;
  if (lc) byZone.legend = lc.qty;
  if (cc) byZone.champion = cc.qty;
  for (const z of ['main', 'sideboard', 'runes', 'battlefields'] as const) byZone[z] = lists[z].reduce((n, c) => n + c.qty, 0);

  const draft: Omit<UserDeck, 'id' | 'createdAt' | 'updatedAt'> = {
    schemaVersion: 1,
    name: trimmedName.slice(0, LIMITS.maxDeckName),
    format: 'standard',
    source: { kind: 'user', text: source.text, url: source.url },
    sourceFormat: p.sourceFormat,
    notes: '',
    catalogVersion: p.catalogVersion,
    ...(removedRaw.length ? { importRemovedLines: removedRaw } : {}),
    legend: lc,
    champion: cc,
    main: lists.main,
    sideboard: lists.sideboard,
    runes: lists.runes,
    battlefields: lists.battlefields,
  };

  const reviewLines: ReviewLine[] = placed
    .filter((x) => !x.dropped)
    .map((x) => {
      // A line whose only copy became the Chosen Champion (DECK-034) is shown in `champion`.
      const allMoved = x.movedToChampion > 0 && x.movedToChampion === x.line.qty;
      const zone: DeckZone | null = allMoved ? 'champion' : x.zone;
      return {
        id: x.line.id,
        line: x.line.line,
        qty: x.line.qty,
        name: x.card.name,
        zone,
        zoneMethod: zone ? (allMoved ? championMethod : x.method) : null,
        zoneReason: zone ? (allMoved ? championReason : x.reason) : null,
        movedToMain: zone === 'main' && x.fromChampion ? x.line.qty - x.movedToChampion : 0,
        mismatch: zone ? x.mismatch : null,
      };
    });

  const legendSlot = legendLines.find((x) => x.zone === 'legend');
  return {
    attention,
    lines: reviewLines,
    slots: {
      legend: lc ? { name: lc.name, method: legendMethod, reason: legendSlot?.reason ?? null } : null,
      champion: cc ? { name: cc.name, method: championMethod, reason: championReason } : null,
    },
    questions,
    issues,
    notes,
    removedLines,
    byZone,
    defaultName,
    name,
    nameError,
    sourceError: source.error,
    blockers,
    canSave: blockers.unresolvedLines === 0 && openQuestions === 0 && !nameError && !source.error,
    draft,
  };
}

/**
 * DECK-101: each line's identity across Back → Continue, by `DeckImportLine.id`: its trimmed text (exact,
 * case-sensitive), its section context (the zone of its section label, or none) and its occurrence number (the n-th
 * line from the top with the same text and context). Position in the text box is not part of it.
 */
export function lineIdentities(p: PreparedDeck): readonly string[] {
  const seen = new Map<string, number>();
  return p.lines.map((l) => {
    const base = `${l.section ?? ''}\n${l.raw}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return `${base}\n${n}`;
  });
}

/**
 * DECK-100 / DECK-101: the review answers that survive Back → edit → Continue. `prev` and `s` are the review the user
 * left with Back; `next` is the list as resolved again. Kept, for lines whose identity is unchanged: removed lines
 * (DECK-041, DECK-042) and zone answers (PICK_ZONE, "Move to", "Put all in Main Deck", a changed inferred zone) on
 * lines that resolve. The PICK_LEGEND / PICK_CHAMPION answer (a card or "Leave empty") is kept only when the
 * question is asked again with the same lines and the same candidates (no line changed or left, no new one came).
 * Not kept (DECK-101 open-question defaults): suggestion picks ("Use X"), the typed name, Source and Link.
 * Pure: the result lives only in the open dialog (DECK-102).
 */
export function carryReviewAnswers(
  prev: PreparedDeck,
  s: DeckReviewState,
  next: PreparedDeck,
  today: Date,
): DeckReviewState {
  const prevIds = lineIdentities(prev);
  const nextIdByIdentity = new Map(lineIdentities(next).map((k, i) => [k, next.lines[i].id]));
  const map = (id: number): number | undefined => nextIdByIdentity.get(prevIds[id]);

  const removed = new Set<number>();
  for (const id of s.removed) {
    const to = map(id);
    if (to !== undefined) removed.add(to);
  }
  const zones = new Map<number, DeckZone>();
  for (const [id, zone] of s.zones) {
    const to = map(id);
    // A line that needs attention again (its pick is not kept) gets its zone asked again once it resolves.
    if (to !== undefined && next.lines[to].card) zones.set(to, zone);
  }
  let carried: DeckReviewState = { ...EMPTY_REVIEW_STATE, removed, zones };

  const before = reviewDeck(prev, s, today).questions;
  const keep = (kind: 'PICK_LEGEND' | 'PICK_CHAMPION'): CardKey | 'empty' | null => {
    const old = before.find((q) => q.kind === kind);
    if (!old || old.kind === 'PICK_ZONE' || old.answer === null) return null;
    const now = reviewDeck(next, carried, today).questions.find((q) => q.kind === kind);
    if (!now || now.kind === 'PICK_ZONE') return null;
    const mapped = old.lineIds.map(map);
    if (mapped.some((id) => id === undefined)) return null;
    const keys = (cs: readonly PlayableCard[]) => cs.map((c) => c.cardKey);
    return sameSet(mapped as number[], now.lineIds) && sameSet(keys(old.candidates), keys(now.candidates))
      ? old.answer
      : null;
  };
  carried = { ...carried, legend: keep('PICK_LEGEND') };
  // After the Legend: an unsectioned list asks PICK_CHAMPION only once its Legend is known (DECK-034).
  carried = { ...carried, champion: keep('PICK_CHAMPION') };
  return carried;
}

function sameSet<T>(a: readonly T[], b: readonly T[]): boolean {
  const sa = new Set(a);
  const sb = new Set(b);
  return sa.size === sb.size && [...sa].every((x) => sb.has(x));
}

function place(line: DeckImportLine, card: PlayableCard, override: DeckZone | null): Placed {
  const x: Placed = {
    line,
    card,
    zone: null,
    method: null,
    reason: null,
    mismatch: null,
    pending: null,
    movedToChampion: 0,
    dropped: false,
    fromChampion: false,
  };
  if (override) {
    x.zone = override;
    x.method = 'user';
    return x;
  }
  if (line.section) {
    // DECK-020 / DECK-022: the section wins over card data; a disagreement is a warning with a "Move to".
    x.zone = line.section;
    x.method = 'section';
    x.reason = `Section ${SECTION_LABELS[line.section]} (line ${line.line})`;
    const moveTo = sectionMismatch(card, line.section);
    if (moveTo)
      x.mismatch = { message: DECK_REVIEW_TEXT.mismatch(card.name, CATEGORY_LABEL[card.category]), moveTo };
    return x;
  }
  // DECK-032: unsectioned, by category.
  switch (card.category) {
    case 'legend':
      x.pending = 'legend';
      return x;
    case 'unknown':
      return x; // DECK-035: PICK_ZONE
    default: {
      const zone = expectedZone(card)!;
      x.zone = zone;
      x.method = 'inferred';
      x.reason = `Card type is ${CATEGORY_LABEL[isChampionUnit(card) ? 'champion' : card.category]}`;
      return x;
    }
  }
}

function distinctCards(xs: readonly Placed[]): PlayableCard[] {
  const seen = new Map<CardKey, PlayableCard>();
  for (const x of xs) if (!seen.has(x.card.cardKey)) seen.set(x.card.cardKey, x.card);
  return [...seen.values()];
}

/** DECK-071: free text (≤ 200) and/or an http(s) URL (≤ 2,048); any other URL is kept as text with a warning. */
export function deckSource(
  textIn: string,
  urlIn: string,
): { text: string | null; url: string | null; urlInvalid: boolean; error: string | null } {
  const text = textIn.trim();
  const url = urlIn.trim();
  let outText = text || null;
  let outUrl: string | null = null;
  let urlInvalid = false;
  if (url) {
    if (isHttpUrl(url) && url.length <= MAX_SOURCE_URL) outUrl = url;
    else {
      urlInvalid = true;
      outText = text ? `${text} ${url}` : url;
    }
  }
  const error = outText !== null && outText.length > MAX_SOURCE_TEXT ? DECK_REVIEW_TEXT.sourceTooLong : null;
  return { text: outText, url: outUrl, urlInvalid, error };
}

function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}
