import { formatIsoDate } from '../decks/deck-ownership-view';
import type { BannedName } from '../decks/ban-status';
import { type SetStatus, normalizeSetCode, setStatus } from './set-legality';
import type {
  DeckRules,
  FormatDef,
  IsoDate,
  LegalityCardView,
  LegalityCatalog,
  LegalityPrinting,
  NotEvaluatedItem,
  RegionId,
  RuleResult,
  Violation,
  Zone,
} from './types';

/** One deck entry after name resolution (LEGAL-019). `card` null = the name resolved to no single `cardKey`. */
export interface ResolvedEntry {
  readonly zone: Zone;
  readonly raw: string;
  readonly qty: number;
  readonly card: LegalityCardView | null;
}

/** Everything a rule reads. Built once per evaluation by `evaluateLegality`; rules are pure functions of it. */
export interface RuleContext {
  /** Every entry of every zone, Legend and Chosen Champion included, in zone order. */
  readonly entries: readonly ResolvedEntry[];
  readonly legend: ResolvedEntry | null;
  readonly champion: ResolvedEntry | null;
  readonly deckRules: DeckRules;
  readonly format: FormatDef;
  readonly region: RegionId;
  readonly asOf: IsoDate;
  readonly catalog: LegalityCatalog;
  /** LEGAL-B02 banned set as of `asOf`, by `cardKey`. */
  readonly banned: ReadonlyMap<string, BannedName>;
}

export type Rule = (ctx: RuleContext) => RuleResult;

// ---------------------------------------------------------------- helpers

const DCR = 'Deck Construction Rules';

/** Zone names inside LEGAL-014 / -015 messages ("can't be in the {zone}"). */
const ZONE_TEXT: Readonly<Record<Zone, string>> = {
  legend: 'Legend slot',
  champion: 'Chosen Champion slot',
  main: 'main deck',
  sideboard: 'sideboard',
  runes: 'rune deck',
  battlefields: 'battlefields',
};

/** Reasons a rule could not be fully checked (`notEvaluatedReason`, DECK-052). */
/**
 * LEGAL-R09: a reason that lists cards also carries its label and distinct names. The text builders below register
 * that structure under the reason's text (same text, same names), and `result()` reads it back into
 * `notEvaluatedItems`, so the rules keep pushing plain strings and `notEvaluatedReason` is unchanged.
 */
const LISTED_REASONS = new Map<string, NotEvaluatedItem>();

function listed(label: string, names: string[]): string {
  const text = `${label}: ${names.join(', ')}`;
  LISTED_REASONS.set(text, { text, label, cardNames: [...new Set(names)] });
  return text;
}

export const NOT_EVALUATED_TEXT = {
  domains: (names: string[]) => listed('Missing domain data for', names),
  noIdentity: "There is no Legend with domain data, so the deck's domains can't be checked.",
  category: (names: string[]) => listed('Missing card type for', names),
  champion: (names: string[]) => listed('Missing champion data for', names),
  signature: (names: string[]) => listed('Missing Signature data for', names),
  sets: (names: string[]) => listed('Set status unknown for', names),
  variant: (names: string[]) => listed('Printing type unknown for', names),
  unknownCards: (names: string[]) => listed('Unknown cards not checked', names),
} as const;

function unique(names: string[]): string[] {
  return [...new Set(names)];
}

/**
 * The rule's status from its findings (LEGAL-R04 inputs): an `error` violation → `fail`; else anything not checked →
 * `not_evaluated`; else a `warning` violation → `warning`; else `pass`.
 */
function result(
  ruleId: string,
  title: string,
  source: string,
  passSummary: string,
  violations: Violation[],
  notChecked: string[],
): RuleResult {
  const reasons = unique(notChecked);
  const status = violations.some((v) => v.severity === 'error')
    ? 'fail'
    : reasons.length
      ? 'not_evaluated'
      : violations.length
        ? 'warning'
        : 'pass';
  const summary =
    status === 'pass'
      ? passSummary
      : status === 'not_evaluated'
        ? 'Not fully checked.'
        : violations.length === 1
          ? violations[0].message
          : `${violations.length} problems found.`;
  const out: RuleResult = { ruleId, title, status, summary, violations, source };
  if (reasons.length) {
    out.notEvaluatedReason = reasons.join(' ');
    out.notEvaluatedItems = reasons.map((text) => LISTED_REASONS.get(text) ?? { text });
  }
  return out;
}

function error(message: string, extra: Omit<Violation, 'severity' | 'message'> = {}): Violation {
  return { severity: 'error', message, ...extra };
}

function onCard(e: ResolvedEntry, card: LegalityCardView): Omit<Violation, 'severity' | 'message'> {
  return { cardName: card.name, cardKey: card.cardKey, zone: e.zone };
}

const inZones = (ctx: RuleContext, zones: readonly Zone[]) => ctx.entries.filter((e) => zones.includes(e.zone));
const total = (entries: readonly ResolvedEntry[]) => entries.reduce((n, e) => n + e.qty, 0);
const unknownNames = (entries: readonly ResolvedEntry[]) => entries.filter((e) => !e.card).map((e) => e.raw);

/** Definitions: no domain fits any identity; one or several domains all in the identity. null = not known. */
function fits(card: LegalityCardView, identity: readonly string[]): boolean | null {
  if (card.domains === null) return null;
  return card.domains.every((d) => identity.includes(d));
}

function isChampionUnit(card: LegalityCardView): boolean | null {
  if (card.category === 'champion' || card.isChampionUnit === true) return true;
  return card.isChampionUnit === false ? false : null;
}

const MAIN_DECK: readonly Zone[] = ['champion', 'main'];
const COPY_ZONES: readonly Zone[] = ['champion', 'main', 'sideboard'];

/** Domain fit over some zones (LEGAL-002, -009, -012); `message` renders a non-fitting card. */
function domainRule(
  ctx: RuleContext,
  zones: readonly Zone[],
  message: (card: LegalityCardView, identity: string) => string,
): { violations: Violation[]; notChecked: string[] } {
  const entries = inZones(ctx, zones);
  const violations: Violation[] = [];
  const notChecked: string[] = [];
  const unknown = unknownNames(entries);
  if (unknown.length) notChecked.push(NOT_EVALUATED_TEXT.unknownCards(unknown));
  const identity = ctx.legend?.card?.domains ?? null;
  if (identity === null) {
    if (entries.length) notChecked.push(NOT_EVALUATED_TEXT.noIdentity);
    return { violations, notChecked };
  }
  const missing: string[] = [];
  for (const e of entries) {
    if (!e.card) continue;
    const ok = fits(e.card, identity);
    if (ok === null) missing.push(e.card.name);
    else if (!ok) violations.push(error(message(e.card, identity.join(', ')), onCard(e, e.card)));
  }
  if (missing.length) notChecked.push(NOT_EVALUATED_TEXT.domains(unique(missing)));
  return { violations, notChecked };
}

/** A category rule over one zone (LEGAL-014, -015): Legends, Runes and Battlefields belong in their own zones. */
function notOwnZoneRule(ctx: RuleContext, zone: Zone): { violations: Violation[]; notChecked: string[] } {
  const entries = inZones(ctx, [zone]);
  const violations: Violation[] = [];
  const missing: string[] = [];
  const notChecked: string[] = [];
  const unknown = unknownNames(entries);
  if (unknown.length) notChecked.push(NOT_EVALUATED_TEXT.unknownCards(unknown));
  for (const e of entries) {
    if (!e.card) continue;
    const c = e.card.category;
    if (c === 'unknown') missing.push(e.card.name);
    else if (c === 'legend' || c === 'rune' || c === 'battlefield') {
      violations.push(error(`${e.card.name} is a ${e.card.type} and can't be in the ${ZONE_TEXT[zone]}.`, onCard(e, e.card)));
    }
  }
  if (missing.length) notChecked.push(NOT_EVALUATED_TEXT.category(unique(missing)));
  return { violations, notChecked };
}

/** Distinct resolved cards of the deck (every zone), first entry per `cardKey`. */
function distinctCards(ctx: RuleContext): { entry: ResolvedEntry; card: LegalityCardView }[] {
  const seen = new Set<string>();
  const out: { entry: ResolvedEntry; card: LegalityCardView }[] = [];
  for (const e of ctx.entries) {
    if (!e.card || seen.has(e.card.cardKey)) continue;
    seen.add(e.card.cardKey);
    out.push({ entry: e, card: e.card });
  }
  return out;
}

/** LEGAL-C10: the printings that count (SAMPLE-stamped ones never do), each with its set's status (LEGAL-C02). */
function countedPrintings(ctx: RuleContext, card: LegalityCardView): { printing: LegalityPrinting; set: SetStatus }[] {
  const isSample = ctx.catalog.isSample;
  return card.printings
    .filter((p) => !isSample?.(card, p))
    .map((printing) => ({ printing, set: setStatus(ctx.format, ctx.region, ctx.catalog.sets, printing.setCode, ctx.asOf) }));
}

const date = formatIsoDate;

// ---------------------------------------------------------------- A. construction rules

export const legal001: Rule = (ctx) => {
  const violations: Violation[] = [];
  const notChecked: string[] = [];
  const l = ctx.legend;
  if (!l) violations.push(error('A deck needs exactly 1 Legend; this deck has 0.', { zone: 'legend', expected: 1, actual: 0 }));
  else if (!l.card) notChecked.push(NOT_EVALUATED_TEXT.unknownCards([l.raw]));
  else if (l.card.category === 'unknown') notChecked.push(NOT_EVALUATED_TEXT.category([l.card.name]));
  else if (l.card.category !== 'legend') violations.push(error(`${l.card.name} is not a Legend.`, onCard(l, l.card)));
  return result('LEGAL-001', 'Exactly 1 Legend', DCR, 'The deck has 1 Legend.', violations, notChecked);
};

export const legal002: Rule = (ctx) => {
  const { violations, notChecked } = domainRule(
    ctx,
    [...MAIN_DECK, 'sideboard'],
    (card, identity) => `${card.name} (${(card.domains ?? []).join(', ')}) is outside this deck's domains (${identity}).`,
  );
  return result('LEGAL-002', "Cards fit the Legend's domains", DCR, "Every card fits the Legend's domains.", violations, notChecked);
};

export const legal003: Rule = (ctx) => {
  const r = ctx.deckRules;
  const n = total(inZones(ctx, MAIN_DECK));
  const ok = r.mainDeckSizeMode === 'exact' ? n === r.mainDeckSize : n >= r.mainDeckSize;
  const diff = n - r.mainDeckSize;
  const violations = ok
    ? []
    : [
        error(
          `The main deck must have exactly ${r.mainDeckSize} cards including the Chosen Champion; it has ${n} (${diff > 0 ? '+' : ''}${diff}).`,
          { zone: 'main', expected: r.mainDeckSize, actual: n },
        ),
      ];
  return result('LEGAL-003', `Main deck of exactly ${r.mainDeckSize} cards`, DCR, `The main deck has ${n} cards.`, violations, []);
};

export const legal004: Rule = (ctx) => {
  const violations: Violation[] = [];
  const notChecked: string[] = [];
  const ch = ctx.champion;
  if (!ch) {
    violations.push(error('A deck needs exactly 1 Chosen Champion; this deck has 0.', { zone: 'champion', expected: 1, actual: 0 }));
  } else if (!ch.card) {
    notChecked.push(NOT_EVALUATED_TEXT.unknownCards([ch.raw]));
  } else {
    const card = ch.card;
    const fail = (reason: string) => violations.push(error(`${card.name} can't be the Chosen Champion: ${reason}.`, onCard(ch, card)));
    const unit = isChampionUnit(card);
    if (unit === false) fail('it is not a Champion Unit');
    else if (unit === null) notChecked.push(NOT_EVALUATED_TEXT.champion([card.name]));
    if (card.isSignature === true) fail('it is a Signature card');
    else if (card.isSignature === null) notChecked.push(NOT_EVALUATED_TEXT.signature([card.name]));
    const legend = ctx.legend?.card ?? null;
    if (card.championTag !== null && legend?.championTag) {
      if (card.championTag !== legend.championTag) {
        fail(`its champion (${card.championTag}) doesn't match the Legend (${legend.championTag})`);
      }
    } else {
      notChecked.push(NOT_EVALUATED_TEXT.champion([card.championTag === null ? card.name : (legend?.name ?? card.name)]));
    }
  }
  return result('LEGAL-004', 'A valid Chosen Champion', DCR, 'The Chosen Champion is valid.', violations, notChecked);
};

export const legal005: Rule = (ctx) => {
  const limit = ctx.deckRules.copyLimit;
  const violations: Violation[] = [];
  const notChecked: string[] = [];
  const entries = inZones(ctx, COPY_ZONES);
  const unknown = unknownNames(entries);
  if (unknown.length) notChecked.push(NOT_EVALUATED_TEXT.unknownCards(unknown));
  if (limit !== null) {
    const byKey = new Map<string, { entry: ResolvedEntry; card: LegalityCardView; m: number; c: number; s: number }>();
    for (const e of entries) {
      if (!e.card) continue;
      const row = byKey.get(e.card.cardKey) ?? { entry: e, card: e.card, m: 0, c: 0, s: 0 };
      if (e.zone === 'main') row.m += e.qty;
      if (e.zone === 'champion') row.c += e.qty;
      if (e.zone === 'sideboard') row.s += e.qty;
      byKey.set(e.card.cardKey, row);
    }
    for (const { entry, card, m, c, s } of byKey.values()) {
      const n = m + c + s;
      if (n <= limit) continue;
      violations.push(
        error(`${card.name}: ${n} copies (main ${m}, champion ${c}, sideboard ${s}); the limit is ${limit} per name.`, {
          ...onCard(entry, card),
          expected: limit,
          actual: n,
        }),
      );
    }
  }
  const title = limit === null ? 'Copies per card name' : `At most ${limit} copies per card name`;
  const pass = limit === null ? 'This format has no copy limit.' : `All card names are within the ${limit}-copy limit.`;
  return result('LEGAL-005', title, DCR, pass, violations, notChecked);
};

/** Signature cards in some zones: the known count (qty-weighted) and the cards whose flag is not known. */
function signatures(ctx: RuleContext, zones: readonly Zone[]): { n: number; missing: string[]; unknown: string[] } {
  let n = 0;
  const missing: string[] = [];
  const entries = inZones(ctx, zones);
  for (const e of entries) {
    if (!e.card) continue;
    if (e.card.isSignature === true) n += e.qty;
    else if (e.card.isSignature === null) missing.push(e.card.name);
  }
  return { n, missing: unique(missing), unknown: unknownNames(entries) };
}

export const legal006: Rule = (ctx) => {
  const limit = ctx.deckRules.signatureLimit;
  const { n, missing, unknown } = signatures(ctx, MAIN_DECK);
  const violations =
    n > limit ? [error(`${n} Signature cards in the main deck; the limit is ${limit}.`, { zone: 'main', expected: limit, actual: n })] : [];
  const notChecked = [
    ...(unknown.length ? [NOT_EVALUATED_TEXT.unknownCards(unknown)] : []),
    ...(missing.length ? [NOT_EVALUATED_TEXT.signature(missing)] : []),
  ];
  return result('LEGAL-006', `At most ${limit} Signature cards in the main deck`, DCR, `The main deck has ${n} Signature cards.`, violations, notChecked);
};

/**
 * LEGAL-006a (SHOULD, `unverified`): main deck + sideboard over the cap while the main deck is not → a `warning`, never
 * an `error` (Riot has not said sideboarded Signature cards count). It never changes the verdict (LEGAL-R04).
 */
export const legal006a: Rule = (ctx) => {
  const limit = ctx.deckRules.signatureLimit;
  const main = signatures(ctx, MAIN_DECK);
  const all = signatures(ctx, [...MAIN_DECK, 'sideboard']);
  const violations: Violation[] =
    all.n > limit && main.n <= limit
      ? [
          {
            severity: 'warning',
            message: `${all.n} Signature cards in the main deck and sideboard together; a sideboard swap could go over the limit of ${limit}.`,
            zone: 'sideboard',
            expected: limit,
            actual: all.n,
          },
        ]
      : [];
  const notChecked = [
    ...(all.unknown.length ? [NOT_EVALUATED_TEXT.unknownCards(all.unknown)] : []),
    ...(all.missing.length ? [NOT_EVALUATED_TEXT.signature(all.missing)] : []),
  ];
  return result(
    'LEGAL-006a',
    'Signature cards in the main deck and sideboard',
    DCR,
    `The main deck and sideboard have ${all.n} Signature cards.`,
    violations,
    notChecked,
  );
};

export const legal007: Rule = (ctx) => {
  const violations: Violation[] = [];
  const missing: string[] = [];
  const entries = inZones(ctx, [...MAIN_DECK, 'sideboard']);
  const unknown = unknownNames(entries);
  const legendTag = ctx.legend?.card?.championTag ?? null;
  for (const e of entries) {
    const card = e.card;
    if (!card) continue;
    if (card.isSignature === null) missing.push(card.name);
    if (card.isSignature !== true) continue;
    if (card.championTag === null || legendTag === null) missing.push(card.name);
    else if (card.championTag !== legendTag) {
      violations.push(error(`${card.name} is a Signature card for ${card.championTag}, but the Legend is ${legendTag}.`, onCard(e, card)));
    }
  }
  const notChecked = [
    ...(unknown.length ? [NOT_EVALUATED_TEXT.unknownCards(unknown)] : []),
    ...(missing.length ? [NOT_EVALUATED_TEXT.signature(unique(missing))] : []),
  ];
  return result('LEGAL-007', "Signature cards share the Legend's champion", DCR, "Every Signature card shares the Legend's champion.", violations, notChecked);
};

export const legal008: Rule = (ctx) => {
  const size = ctx.deckRules.runeDeckSize;
  const entries = inZones(ctx, ['runes']);
  const n = total(entries);
  const violations: Violation[] = [];
  const notChecked: string[] = [];
  if (n !== size) violations.push(error(`The rune deck must have exactly ${size} runes; it has ${n}.`, { zone: 'runes', expected: size, actual: n }));
  const unknown = unknownNames(entries);
  if (unknown.length) notChecked.push(NOT_EVALUATED_TEXT.unknownCards(unknown));
  const missing: string[] = [];
  for (const e of entries) {
    if (!e.card) continue;
    if (e.card.category === 'unknown') missing.push(e.card.name);
    else if (e.card.category !== 'rune') violations.push(error(`${e.card.name} is not a Rune.`, onCard(e, e.card)));
  }
  if (missing.length) notChecked.push(NOT_EVALUATED_TEXT.category(unique(missing)));
  return result('LEGAL-008', `Rune deck of exactly ${size} runes`, DCR, `The rune deck has ${n} runes.`, violations, notChecked);
};

export const legal009: Rule = (ctx) => {
  const { violations, notChecked } = domainRule(
    ctx,
    ['runes'],
    (card, identity) => `${card.name} doesn't match this deck's domains (${identity}).`,
  );
  return result('LEGAL-009', "Runes fit the Legend's domains", DCR, "Every rune fits the Legend's domains.", violations, notChecked);
};

export const legal010: Rule = (ctx) => {
  const count = ctx.deckRules.battlefieldCount;
  const entries = inZones(ctx, ['battlefields']);
  const n = total(entries);
  const violations: Violation[] = [];
  const notChecked: string[] = [];
  if (n !== count) {
    violations.push(error(`A deck needs exactly ${count} battlefields; this deck has ${n}.`, { zone: 'battlefields', expected: count, actual: n }));
  }
  const unknown = unknownNames(entries);
  if (unknown.length) notChecked.push(NOT_EVALUATED_TEXT.unknownCards(unknown));
  const missing: string[] = [];
  for (const e of entries) {
    if (!e.card) continue;
    if (e.card.category === 'unknown') missing.push(e.card.name);
    else if (e.card.category !== 'battlefield') {
      violations.push(error(`${e.card.name} is a ${e.card.type} and can't be in the ${ZONE_TEXT.battlefields}.`, onCard(e, e.card)));
    }
  }
  if (missing.length) notChecked.push(NOT_EVALUATED_TEXT.category(unique(missing)));
  return result('LEGAL-010', `Exactly ${count} battlefields`, DCR, `The deck has ${n} battlefields.`, violations, notChecked);
};

export const legal011: Rule = (ctx) => {
  const entries = inZones(ctx, ['battlefields']);
  const byKey = new Map<string, { entry: ResolvedEntry; card: LegalityCardView; n: number }>();
  for (const e of entries) {
    if (!e.card) continue;
    const row = byKey.get(e.card.cardKey) ?? { entry: e, card: e.card, n: 0 };
    row.n += e.qty;
    byKey.set(e.card.cardKey, row);
  }
  const violations: Violation[] = [];
  for (const { entry, card, n } of byKey.values()) {
    if (n > 1) {
      violations.push(
        error(`Battlefield ${card.name} appears ${n} times; battlefield names must be unique.`, { ...onCard(entry, card), expected: 1, actual: n }),
      );
    }
  }
  const unknown = unknownNames(entries);
  return result(
    'LEGAL-011',
    'Unique battlefields',
    DCR,
    'Every battlefield is different.',
    violations,
    unknown.length ? [NOT_EVALUATED_TEXT.unknownCards(unknown)] : [],
  );
};

export const legal012: Rule = (ctx) => {
  const { violations, notChecked } = domainRule(
    ctx,
    ['battlefields'],
    (card, identity) => `${card.name} doesn't match this deck's domains (${identity}).`,
  );
  return result('LEGAL-012', "Battlefields fit the Legend's domains", DCR, "Every battlefield fits the Legend's domains.", violations, notChecked);
};

export const legal013: Rule = (ctx) => {
  const max = ctx.deckRules.sideboardMax;
  const n = total(inZones(ctx, ['sideboard']));
  const violations =
    n > max ? [error(`The sideboard can have at most ${max} cards; it has ${n}.`, { zone: 'sideboard', expected: max, actual: n })] : [];
  return result('LEGAL-013', `Sideboard of at most ${max} cards`, DCR, `The sideboard has ${n} cards.`, violations, []);
};

export const legal014: Rule = (ctx) => {
  const { violations, notChecked } = notOwnZoneRule(ctx, 'sideboard');
  return result('LEGAL-014', 'Sideboard cards can be in the main deck', DCR, 'Every sideboard card can be in the main deck.', violations, notChecked);
};

export const legal015: Rule = (ctx) => {
  const { violations, notChecked } = notOwnZoneRule(ctx, 'main');
  return result('LEGAL-015', 'Main deck holds no Legends, runes or battlefields', DCR, 'The main deck holds no Legends, runes or battlefields.', violations, notChecked);
};

/** LEGAL-016: one violation per banned card (its first zone in zone order), naming the wave and its effective date. */
export const legal016: Rule = (ctx) => {
  const violations: Violation[] = [];
  for (const { entry, card } of distinctCards(ctx)) {
    const hit = ctx.banned.get(card.cardKey);
    if (!hit) continue;
    violations.push(
      error(
        `${card.name} is banned in ${ctx.format.name} as of ${date(ctx.asOf)} (${hit.wave.name}, effective ${date(hit.wave.effective)}).`,
        { ...onCard(entry, card), banWaveId: hit.wave.id, effectiveDate: hit.wave.effective },
      ),
    );
  }
  const unknown = unknownNames(ctx.entries);
  return result(
    'LEGAL-016',
    'No banned cards',
    'Ban List',
    'No card in the deck is banned.',
    violations,
    unknown.length ? [NOT_EVALUATED_TEXT.unknownCards(unknown)] : [],
  );
};

/**
 * LEGAL-017 (with LEGAL-C02, C07, C10): pass if any counted printing is in a legal set; fail if every one is definitely
 * not legal; otherwise not evaluated. Promos are legal by name: `cardKey` holds all printings of a name, so one
 * legal-set printing is enough, and a card printed only in `excludedSets` fails.
 */
export const legal017: Rule = (ctx) => {
  const violations: Violation[] = [];
  const missing: string[] = [];
  const format = ctx.format.name;
  for (const { entry, card } of distinctCards(ctx)) {
    const counted = countedPrintings(ctx, card);
    if (counted.some((p) => p.set.status === 'legal')) continue;
    if (counted.some((p) => p.set.status === 'unknown')) {
      missing.push(card.name);
      continue;
    }
    const sets = unique(counted.map((p) => normalizeSetCode(p.printing.setCode))).join(', ');
    const head = `${card.name} isn't legal in ${format} on ${date(ctx.asOf)}:`;
    const extra = onCard(entry, card);
    const notYet = counted
      .map((p) => (p.set.status === 'not-yet' ? p.set.legalFrom : null))
      .filter((d): d is string => d !== null)
      .sort()[0];
    if (notYet) violations.push(error(`${head} its sets (${sets}) are not legal until ${date(notYet)}.`, { ...extra, effectiveDate: notYet }));
    else if (counted.some((p) => p.set.status === 'preview')) violations.push(error(`${head} its sets (${sets}) are not released yet.`, extra));
    else if (counted.some((p) => p.set.status === 'rotated')) violations.push(error(`${head} its sets (${sets}) are no longer legal.`, extra));
    else violations.push(error(`${head} it has no printing in a legal set.`, extra));
  }
  const unknown = unknownNames(ctx.entries);
  const notChecked = [
    ...(unknown.length ? [NOT_EVALUATED_TEXT.unknownCards(unknown)] : []),
    ...(missing.length ? [NOT_EVALUATED_TEXT.sets(missing)] : []),
  ];
  return result('LEGAL-017', 'Cards are from legal sets', 'Formats', `Every card has a printing in a set legal in ${format}.`, violations, notChecked);
};

/**
 * LEGAL-018: L = the card's counted printings in legal sets. Pass if L has a printing that is neither `overnumbered` nor
 * `unknown`, or if every printing is in a legal set; fail if L is non-empty and all `overnumbered`; else not evaluated.
 * A card with no legal-set printing is LEGAL-017's failure, not this rule's.
 */
export const legal018: Rule = (ctx) => {
  const violations: Violation[] = [];
  const missing: string[] = [];
  const format = ctx.format.name;
  for (const { entry, card } of distinctCards(ctx)) {
    const counted = countedPrintings(ctx, card);
    const inLegal = counted.filter((p) => p.set.status === 'legal').map((p) => p.printing);
    if (!inLegal.length) continue;
    if (counted.every((p) => p.set.status === 'legal')) continue;
    if (inLegal.some((p) => p.variant.kind !== 'overnumbered' && p.variant.kind !== 'unknown')) continue;
    if (inLegal.every((p) => p.variant.kind === 'overnumbered')) {
      const list = inLegal.map((p) => `${normalizeSetCode(p.setCode)} ${p.collectorNumber}`).join(', ');
      violations.push(
        error(`${card.name} isn't legal in ${format} on ${date(ctx.asOf)}: its only printings in legal sets are overnumbered (${list}).`, onCard(entry, card)),
      );
    } else {
      missing.push(card.name);
    }
  }
  return result(
    'LEGAL-018',
    'Overnumbered printings alone are not enough',
    DCR,
    'No card relies on an overnumbered printing alone.',
    violations,
    missing.length ? [NOT_EVALUATED_TEXT.variant(missing)] : [],
  );
};

export const legal019: Rule = (ctx) => {
  const violations = ctx.entries
    .filter((e) => !e.card)
    .map((e) => error(`Unknown card: "${e.raw}". Check the spelling.`, { zone: e.zone }));
  return result('LEGAL-019', 'Every card name is known', 'Card Data Model', 'Every card name is in the card data.', violations, []);
};

/** Section A in ID order (AC 15). */
export const RULES: readonly Rule[] = [
  legal001,
  legal002,
  legal003,
  legal004,
  legal005,
  legal006,
  legal006a,
  legal007,
  legal008,
  legal009,
  legal010,
  legal011,
  legal012,
  legal013,
  legal014,
  legal015,
  legal016,
  legal017,
  legal018,
  legal019,
];
