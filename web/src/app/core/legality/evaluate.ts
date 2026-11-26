import { nameKey, nameLookup } from '../cards/name-key';
import { banListFor, bannedSet, orderedWaves } from '../decks/ban-status';
import type { CollectionCatalogView, UserDeck } from '../decks/types';
import { RULES, type ResolvedEntry, type RuleContext } from './rules';
import type {
  BanListFile,
  DeckInput,
  FormatDef,
  FormatsFile,
  LegalityCardView,
  LegalityCatalog,
  LegalityPrinting,
  LegalityRequest,
  LegalityResult,
  RuleResult,
  UpcomingBan,
  Zone,
} from './types';

/** LEGAL-C10 stub: SPEC-001 CARD-044 has no SAMPLE marker yet (BLOCKED, H-020), so no printing is SAMPLE. */
export const NO_SAMPLE_MARKER = (): boolean => false;

/** LEGAL-R05: only official, supported formats are evaluated. `2v2` has ban data only and no `FormatDef`. */
export function supportedFormat(formats: FormatsFile, id: string): FormatDef | null {
  return formats.formats.find((f) => f.id === id && f.official && f.supported) ?? null;
}

/** LEGAL-R04: `illegal` if any `error`, else `incomplete` if any rule is `not_evaluated`, else `legal`. Warnings never count. */
export function verdictOf(rules: readonly RuleResult[]): LegalityResult['verdict'] {
  if (rules.some((r) => r.violations.some((v) => v.severity === 'error'))) return 'illegal';
  if (rules.some((r) => r.status === 'not_evaluated')) return 'incomplete';
  return 'legal';
}

const resolvers = new WeakMap<object, (name: string) => string | null>();

/** LEGAL-019: a name resolves only when the SPEC-001 lookup (CARD-033/034, no aliases) finds exactly one `cardKey`. */
function resolverFor(catalog: LegalityCatalog): (name: string) => string | null {
  let r = resolvers.get(catalog.cards);
  if (!r) {
    const find = nameLookup(Object.keys(catalog.cards));
    r = (name) => {
      const hit = find(name);
      return hit.status === 'found' ? hit.cardKey : null;
    };
    resolvers.set(catalog.cards, r);
  }
  return r;
}

/**
 * LEGAL-B08: announced-not-effective waves (`announced <= asOf < effective`) that ban a card of this deck not banned
 * now, or unban one that is. A wave announced after `asOf` is not shown.
 */
function upcomingBans(bans: BanListFile, req: Required<Pick<LegalityRequest, 'format' | 'region' | 'asOf'>>, keys: ReadonlyMap<string, string>, banned: ReadonlyMap<string, unknown>): UpcomingBan[] {
  const list = banListFor(bans, req.format, req.region);
  if (!list) return [];
  const out: UpcomingBan[] = [];
  const seen = new Set<string>();
  for (const w of orderedWaves(list)) {
    if (!(w.announced <= req.asOf && req.asOf < w.effective)) continue;
    const changes = [
      ...w.remove.map((e) => ({ e, change: 'unban' as const })),
      ...w.add.map((e) => ({ e, change: 'ban' as const })),
    ];
    for (const { e, change } of changes) {
      const key = nameKey(e.name);
      const name = keys.get(key);
      if (name === undefined || seen.has(`${change}|${key}`)) continue;
      if ((change === 'ban') === banned.has(key)) continue;
      seen.add(`${change}|${key}`);
      out.push({ cardKey: key, name, kind: e.kind, change, announced: w.announced, effective: w.effective, waveId: w.id });
    }
  }
  return out;
}

/**
 * SPEC-002 evaluator (LEGAL-R01): a pure function of the request, the catalog snapshot and the two data files. Every
 * rule of section A runs and returns one `RuleResult`, in ID order (LEGAL-R03, AC 15). `asOf` is a calendar date
 * only (LEGAL-B12). Throws for a format that is not offered (LEGAL-R05).
 */
export function evaluateLegality(
  request: LegalityRequest,
  catalog: LegalityCatalog,
  bans: BanListFile,
  formats: FormatsFile,
): LegalityResult {
  const format = supportedFormat(formats, request.format);
  if (!format) throw new Error(`Format not offered: ${request.format}`);
  const region = request.region ?? 'global';
  const { deck, asOf } = request;
  const resolve = resolverFor(catalog);
  const entry = (zone: Zone, raw: string, qty: number): ResolvedEntry => {
    const key = resolve(raw);
    return { zone, raw, qty, card: key ? (catalog.cards[key] ?? null) : null };
  };
  const legend = deck.legend === null ? null : entry('legend', deck.legend, 1);
  const champion = deck.chosenChampion === null ? null : entry('champion', deck.chosenChampion, 1);
  const list = (zone: Zone, items: DeckInput['main']) => items.map((e) => entry(zone, e.name, e.qty));
  const entries: ResolvedEntry[] = [
    ...(legend ? [legend] : []),
    ...(champion ? [champion] : []),
    ...list('main', deck.main),
    ...list('sideboard', deck.sideboard),
    ...list('runes', deck.runes),
    ...list('battlefields', deck.battlefields),
  ];
  const banned = bannedSet(bans, request.format, region, asOf);
  const ctx: RuleContext = { entries, legend, champion, deckRules: format.deckRules, format, region, asOf, catalog, banned };
  const rules = RULES.map((rule) => rule(ctx));
  const sum = (zone: Zone) => entries.filter((e) => e.zone === zone).reduce((n, e) => n + e.qty, 0);
  const names = new Map<string, string>();
  for (const e of entries) if (e.card) names.set(e.card.cardKey, e.card.name);
  return {
    verdict: verdictOf(rules),
    format: request.format,
    region,
    asOf,
    banListDataVersion: bans.dataVersion,
    formatsDataVersion: formats.dataVersion,
    catalogVersion: catalog.catalogVersion,
    counts: { main: sum('champion') + sum('main'), sideboard: sum('sideboard'), runes: sum('runes'), battlefields: sum('battlefields') },
    rules,
    upcomingBans: upcomingBans(bans, { format: request.format, region, asOf }, names, banned),
  };
}

const views = new WeakMap<CollectionCatalogView, LegalityCatalog>();

/**
 * The browser catalog (SPEC-001 snapshot as `CardData` loads it) as the evaluator's `LegalityCatalog`, built once per
 * catalog object. No printing is SAMPLE until SPEC-001 defines the marker (LEGAL-C10, `NO_SAMPLE_MARKER`).
 */
export function legalityCatalog(view: CollectionCatalogView): LegalityCatalog {
  let out = views.get(view);
  if (!out) {
    const cards: Record<string, LegalityCardView> = {};
    for (const [key, c] of Object.entries(view.cards)) {
      const printings: LegalityPrinting[] = c.printingIds
        .map((id) => view.printings[id])
        .filter((p) => p !== undefined)
        .map((p) => ({ setCode: p.setCode, collectorNumber: p.collectorNumber, variant: { kind: p.variant.kind } }));
      cards[key] = {
        cardKey: c.cardKey,
        name: c.name,
        type: c.type,
        category: c.category,
        domains: c.domains,
        isChampionUnit: c.isChampionUnit,
        isSignature: c.isSignature,
        championTag: c.championTag,
        printings,
      };
    }
    out = {
      catalogVersion: view.catalogVersion,
      cards,
      sets: view.sets.map((s) => ({ code: s.code, releaseStatus: s.releaseStatus })),
      isSample: NO_SAMPLE_MARKER,
    };
    views.set(view, out);
  }
  return out;
}

/** SPEC-006 mapping: a stored deck (canonical names) as SPEC-002 `DeckInput`. */
export function toDeckInput(d: Pick<UserDeck, 'legend' | 'champion' | 'main' | 'sideboard' | 'runes' | 'battlefields'>): DeckInput {
  const list = (cards: UserDeck['main']) => cards.map((c) => ({ name: c.name, qty: c.qty }));
  return {
    legend: d.legend?.name ?? null,
    chosenChampion: d.champion?.name ?? null,
    main: list(d.main),
    sideboard: list(d.sideboard),
    runes: list(d.runes),
    battlefields: list(d.battlefields),
  };
}
