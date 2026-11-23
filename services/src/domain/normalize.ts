// SPEC-001: map one raw Riot API response (riftbound-content-v1, schema per research fact #9,
// unverified) to a deterministic CardSnapshot plus an IngestionReport.
import { categoryOf } from './category.ts';
import { collectorKey } from './collector.ts';
import { compareCodePoint, compareNumber } from './compare.ts';
import { IngestionError } from './errors.ts';
import { nameKey } from './name-key.ts';
import { makePrintingComparator } from './printing-sort.ts';
import {
  SCHEMA_VERSION,
  type CardSet,
  type CardSnapshot,
  type CardStats,
  type IngestionReport,
  type PlayableCard,
  type Printing,
  type RiotRegion,
  type VariantRulesFile,
} from './types.ts';
import { detectVariant } from './variant-rules.ts';

export interface NormalizeOptions {
  region: RiotRegion;
  fetchedAt: string;
  variantRules: VariantRulesFile;
  previous: CardSnapshot | null;
}

export interface NormalizeResult {
  snapshot: CardSnapshot;
  report: IngestionReport;
}

// Raw card fields this model maps (fact #9). Everything else goes to `extra` (CARD-063).
const MAPPED_CARD_FIELDS = new Set([
  'id',
  'collectorNumber',
  'set',
  'name',
  'description',
  'type',
  'rarity',
  'stats',
  'keywords',
  'art',
  'flavorText',
  'tags',
]);
const MAPPED_STATS_FIELDS = new Set(['energy', 'might', 'cost', 'power']);
const MAPPED_ART_FIELDS = new Set(['thumbnailURL', 'fullURL', 'artist']);
const MAPPED_SET_FIELDS = new Set(['id', 'name', 'cards']);
const MAPPED_TOP_FIELDS = new Set(['game', 'version', 'lastUpdated', 'sets']);

type Raw = Record<string, unknown>;

function isObject(v: unknown): v is Raw {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function strOrNull(v: unknown): string | null {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return null;
}

function numOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function strList(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  return v.filter((x): x is string => typeof x === 'string');
}

function sortedObject(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj).sort(compareCodePoint)) out[k] = obj[k];
  return out;
}

function sortedUnique(values: Iterable<string>): string[] {
  return [...new Set(values)].sort(compareCodePoint);
}

/** CARD-068 */
export function catalogVersionOf(lastUpdated: string): string {
  return `${SCHEMA_VERSION}+${lastUpdated}`;
}

/** Gameplay values read from one printing; null = absent in that printing. */
interface Gameplay {
  type: string | null;
  'stats.energy': number | null;
  'stats.might': number | null;
  'stats.cost': number | null;
  'stats.power': number | null;
  keywords: string[] | null;
  tags: string[] | null;
  text: string | null;
  flavorText: string | null;
}
const GAMEPLAY_FIELDS = [
  'type',
  'stats.energy',
  'stats.might',
  'stats.cost',
  'stats.power',
  'keywords',
  'tags',
  'text',
  'flavorText',
] as const satisfies readonly (keyof Gameplay)[];

interface Staged {
  printing: Printing;
  name: string;
  setOrder: number;
  gameplay: Gameplay;
}

export function normalizeContents(raw: unknown, opts: NormalizeOptions): NormalizeResult {
  const problems: string[] = [];
  if (!isObject(raw)) throw new IngestionError(['response is not a JSON object']);
  const rawSets = raw['sets'];
  if (!Array.isArray(rawSets)) throw new IngestionError(['response.sets is missing or not an array']);
  const lastUpdated = strOrNull(raw['lastUpdated']);
  if (lastUpdated === null) throw new IngestionError(['response.lastUpdated is missing (needed for catalogVersion, CARD-068)']);
  const apiVersion = strOrNull(raw['version']) ?? 'unknown';

  const newProperties = new Set<string>();
  for (const k of Object.keys(raw)) if (!MAPPED_TOP_FIELDS.has(k)) newProperties.add(k);

  // --- sets (CARD-020, CARD-021, CARD-071)
  const sets: CardSet[] = [];
  const setOrder = new Map<string, number>();
  const staged: Staged[] = [];
  const seenIds = new Set<string>();

  rawSets.forEach((rs: unknown, setIndex: number) => {
    if (!isObject(rs)) {
      problems.push(`sets[${setIndex}] is not an object`);
      return;
    }
    const code = strOrNull(rs['id'])?.trim().toUpperCase() ?? '';
    if (code === '') {
      problems.push(`sets[${setIndex}] has no id`);
      return;
    }
    if (setOrder.has(code)) {
      problems.push(`set code ${code} appears twice in sets[]`);
      return;
    }
    for (const k of Object.keys(rs)) if (!MAPPED_SET_FIELDS.has(k)) newProperties.add(`sets[].${k}`);
    setOrder.set(code, setIndex);
    const cards = Array.isArray(rs['cards']) ? rs['cards'] : [];
    sets.push({
      code,
      name: strOrNull(rs['name']) ?? code,
      setOrder: setIndex,
      releaseStatus: null, // CARD-008 BLOCKED: no verified API source yet
      printingCount: 0,
    });

    cards.forEach((rc: unknown, cardIndex: number) => {
      const where = `sets[${setIndex}] (${code}).cards[${cardIndex}]`;
      if (!isObject(rc)) {
        problems.push(`${where} is not an object`);
        return;
      }
      const id = strOrNull(rc['id']);
      const label = id === null ? where : `card id ${id}`;
      const missing: string[] = [];
      if (id === null || id.trim() === '') missing.push('id');
      const name = typeof rc['name'] === 'string' && rc['name'].trim() !== '' ? rc['name'] : null;
      if (name === null) missing.push('name');
      if (rc['set'] === undefined || rc['set'] === null) missing.push('set');
      const collectorNumber = strOrNull(rc['collectorNumber']);
      if (collectorNumber === null || collectorNumber.trim() === '') missing.push('collectorNumber');
      if (missing.length > 0 || id === null || name === null || collectorNumber === null) {
        problems.push(`${label} is missing required field(s): ${missing.join(', ')} (CARD-064)`);
        return;
      }
      if (seenIds.has(id)) {
        problems.push(`duplicate printingId ${id} (CARD-010)`);
        return;
      }
      seenIds.add(id);

      const extra: Record<string, unknown> = {};
      for (const k of Object.keys(rc)) {
        if (!MAPPED_CARD_FIELDS.has(k)) extra[k] = rc[k];
      }
      // The enclosing set is authoritative for setCode; keep a differing card.set verbatim.
      const cardSet = isObject(rc['set']) ? strOrNull(rc['set']['id']) : strOrNull(rc['set']);
      if (cardSet === null || cardSet.trim().toUpperCase() !== code) extra['set'] = rc['set'];
      const stats = isObject(rc['stats']) ? rc['stats'] : {};
      for (const k of Object.keys(stats)) if (!MAPPED_STATS_FIELDS.has(k)) extra[`stats.${k}`] = stats[k];
      const art = isObject(rc['art']) ? rc['art'] : {};
      for (const k of Object.keys(art)) if (!MAPPED_ART_FIELDS.has(k)) extra[`art.${k}`] = art[k];
      for (const k of Object.keys(extra)) newProperties.add(k);

      const cardKey = nameKey(name);
      const printing: Printing = {
        printingId: id,
        cardKey,
        setCode: code,
        collectorNumber,
        collector: collectorKey(collectorNumber),
        publicCode: `${code}-${collectorNumber.trim()}`,
        rarity: strOrNull(rc['rarity']),
        variant: detectVariant(rc, opts.variantRules),
        art: {
          thumbnailUrl: strOrNull(art['thumbnailURL']),
          fullUrl: strOrNull(art['fullURL']),
          artist: strOrNull(art['artist']),
        },
        extra: sortedObject(extra),
      };
      staged.push({
        printing,
        name,
        setOrder: setIndex,
        gameplay: {
          type: strOrNull(rc['type']),
          'stats.energy': numOrNull(stats['energy']),
          'stats.might': numOrNull(stats['might']),
          'stats.cost': numOrNull(stats['cost']),
          'stats.power': numOrNull(stats['power']),
          keywords: strList(rc['keywords']),
          tags: strList(rc['tags']),
          text: typeof rc['description'] === 'string' ? rc['description'] : null,
          flavorText: typeof rc['flavorText'] === 'string' ? rc['flavorText'] : null,
        },
      });
    });
  });

  // --- name keys (CARD-012, CARD-032)
  const nameByKey = new Map<string, string>();
  for (const s of staged) {
    if (s.printing.cardKey === '') {
      problems.push(`card id ${s.printing.printingId} name ${JSON.stringify(s.name)} has an empty name key`);
      continue;
    }
    const other = nameByKey.get(s.printing.cardKey);
    if (other === undefined) nameByKey.set(s.printing.cardKey, s.name);
    else if (other !== s.name) {
      problems.push(
        `name key collision (CARD-032): ${JSON.stringify(other)} and ${JSON.stringify(s.name)} both give "${s.printing.cardKey}"`,
      );
    }
  }
  if (problems.length > 0) throw new IngestionError(sortedUnique(problems));

  const comparePrintings = makePrintingComparator(setOrder);

  // --- playable cards (CARD-012, CARD-015, CARD-016, CARD-024)
  const byKey = new Map<string, Staged[]>();
  for (const s of staged) {
    const list = byKey.get(s.printing.cardKey);
    if (list) list.push(s);
    else byKey.set(s.printing.cardKey, [s]);
  }

  const fieldConflicts: IngestionReport['fieldConflicts'] = [];
  const unmappedTypes = new Set<string>();
  const cards: PlayableCard[] = [];

  for (const [cardKey, group] of byKey) {
    group.sort((a, b) => comparePrintings(a.printing, b.printing));
    // Preference for gameplay fields: latest set first, then printingSortKey (CARD-015).
    const preferred = [...group].sort(
      (a, b) => compareNumber(b.setOrder, a.setOrder) || comparePrintings(a.printing, b.printing),
    );
    const chosen = {} as Record<keyof Gameplay, unknown>;
    for (const field of GAMEPLAY_FIELDS) {
      const withValue = preferred.filter((s) => s.gameplay[field] !== null);
      chosen[field] = withValue[0]?.gameplay[field] ?? null;
      const distinct = new Set(withValue.map((s) => JSON.stringify(s.gameplay[field])));
      if (distinct.size > 1) {
        fieldConflicts.push({
          cardKey,
          field,
          printingIds: sortedUnique(withValue.map((s) => s.printing.printingId)),
        });
      }
    }
    const type = (chosen.type as string | null) ?? '';
    const category = categoryOf(type);
    if (category === 'unknown') unmappedTypes.add(type);
    const stats: CardStats = {
      energy: chosen['stats.energy'] as number | null,
      might: chosen['stats.might'] as number | null,
      cost: chosen['stats.cost'] as number | null,
      power: chosen['stats.power'] as number | null,
    };
    const printingIds = group.map((s) => s.printing.printingId);
    const base = group.find((s) => s.printing.variant.kind === 'base');
    cards.push({
      cardKey,
      name: (group[0] as Staged).name,
      type,
      category,
      domains: null, // CARD-025 BLOCKED
      isChampionUnit: null, // CARD-026 BLOCKED
      championTag: null, // CARD-026 BLOCKED
      isSignature: null, // CARD-027 BLOCKED
      isPreview: null, // CARD-006 BLOCKED
      stats,
      keywords: (chosen.keywords as string[] | null) ?? [],
      tags: (chosen.tags as string[] | null) ?? [],
      text: (chosen.text as string | null) ?? '',
      flavorText: chosen.flavorText as string | null,
      printingIds,
      defaultPrintingId: (base ?? (group[0] as Staged)).printing.printingId,
    });
  }
  cards.sort((a, b) => compareCodePoint(a.cardKey, b.cardKey));

  const printings = staged.map((s) => s.printing).sort((a, b) => compareCodePoint(a.printingId, b.printingId));
  const countsBySet: Record<string, number> = {};
  for (const set of sets) {
    set.printingCount = printings.filter((p) => p.setCode === set.code).length;
  }
  sets.sort((a, b) => compareCodePoint(a.code, b.code));
  for (const set of sets) countsBySet[set.code] = set.printingCount;

  // --- collector collisions (CARD-036)
  const byCollector = new Map<string, Set<string>>();
  for (const p of printings) {
    const k = `${p.setCode}\u0000${p.collector.key}`;
    const keys = byCollector.get(k) ?? new Set<string>();
    keys.add(p.cardKey);
    byCollector.set(k, keys);
  }
  const collectorCollisions: IngestionReport['collectorCollisions'] = [];
  for (const [k, keys] of [...byCollector].sort(([a], [b]) => compareCodePoint(a, b))) {
    if (keys.size > 1) {
      const [setCode, collectorKeyValue] = k.split('\u0000') as [string, string];
      collectorCollisions.push({ setCode, collectorKey: collectorKeyValue, cardKeys: sortedUnique(keys) });
    }
  }

  // --- diff with previous snapshot (CARD-021, CARD-065, CARD-066, CARD-071)
  const prev = opts.previous;
  const prevSetCodes = new Set(prev?.sets.map((s) => s.code) ?? []);
  const prevIds = new Set(prev?.printings.map((p) => p.printingId) ?? []);
  const nowIds = new Set(printings.map((p) => p.printingId));
  const newSets = sets.filter((s) => !prevSetCodes.has(s.code)).map((s) => s.code);
  const setOrderChanged: string[] = [];
  if (prev) {
    const common = sets.filter((s) => prevSetCodes.has(s.code)).map((s) => s.code);
    const rank = (order: (code: string) => number): Map<string, number> =>
      new Map([...common].sort((a, b) => compareNumber(order(a), order(b))).map((c, i) => [c, i]));
    const prevOrder = new Map(prev.sets.map((s) => [s.code, s.setOrder]));
    const before = rank((c) => prevOrder.get(c) ?? 0);
    const after = rank((c) => setOrder.get(c) ?? 0);
    for (const c of common) if (before.get(c) !== after.get(c)) setOrderChanged.push(c);
  }

  const catalogVersion = catalogVersionOf(lastUpdated);
  const snapshot: CardSnapshot = {
    schemaVersion: SCHEMA_VERSION,
    catalogVersion,
    variantRulesVersion: opts.variantRules.version,
    source: {
      api: 'riftbound-content-v1',
      region: opts.region,
      locale: 'en',
      apiVersion,
      lastUpdated,
    },
    fetchedAt: opts.fetchedAt,
    sets,
    cards,
    printings,
  };

  const report: IngestionReport = {
    fetchedAt: opts.fetchedAt,
    catalogVersion,
    countsBySet,
    newSets,
    setOrderChanged: setOrderChanged.sort(compareCodePoint),
    addedPrintings: [...nowIds].filter((id) => !prevIds.has(id)).sort(compareCodePoint),
    removedPrintings: [...prevIds].filter((id) => !nowIds.has(id)).sort(compareCodePoint),
    newProperties: sortedUnique(newProperties),
    unmappedTypes: sortedUnique(unmappedTypes),
    fieldConflicts: fieldConflicts.sort(
      (a, b) => compareCodePoint(a.cardKey, b.cardKey) || compareCodePoint(a.field, b.field),
    ),
    collectorCollisions,
    unknownVariantCount: printings.filter((p) => p.variant.kind === 'unknown').length,
    nullCounts: {
      domains: cards.filter((c) => c.domains === null).length,
      isChampionUnit: cards.filter((c) => c.isChampionUnit === null).length,
      championTag: cards.filter((c) => c.championTag === null).length,
      isSignature: cards.filter((c) => c.isSignature === null).length,
      isPreview: cards.filter((c) => c.isPreview === null).length,
      releaseStatus: sets.filter((s) => s.releaseStatus === null).length,
    },
  };
  return { snapshot, report };
}

/** Stable JSON text: fixed key order comes from construction; 2-space indent, trailing newline. */
export function toStableJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
