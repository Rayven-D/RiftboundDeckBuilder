// Card data shapes from SPEC-001 v0.4.1 (brain/02-Specs/Card Data Model.md, "Data contract").
// Shapes only. Keep in sync with brain/05-Services/API Contracts.md.

export const SCHEMA_VERSION = '0.2' as const;

export type RiotRegion = 'AMERICAS' | 'ASIA' | 'EUROPE';

export interface CardSnapshot {
  schemaVersion: typeof SCHEMA_VERSION;
  catalogVersion: string; // `${schemaVersion}+${source.lastUpdated}` (CARD-068)
  variantRulesVersion: string; // version of data/variant-rules.json applied (CARD-041)
  source: {
    api: 'riftbound-content-v1';
    region: RiotRegion;
    locale: 'en';
    apiVersion: string; // response.version
    lastUpdated: string; // response.lastUpdated (verbatim; a number as its decimal string)
  };
  fetchedAt: string; // ISO 8601 UTC
  sets: CardSet[]; // sorted by code
  cards: PlayableCard[]; // sorted by cardKey
  printings: Printing[]; // sorted by printingId
}

export interface CardSet {
  code: string;
  name: string;
  setOrder: number; // 0-based position in API sets[] (CARD-071)
  releaseStatus: 'released' | 'preview' | null; // null = unknown (CARD-008, BLOCKED)
  printingCount: number;
}

export type CardCategory =
  | 'legend'
  | 'champion'
  | 'unit'
  | 'spell'
  | 'gear'
  | 'rune'
  | 'battlefield'
  | 'token'
  | 'unknown';

export interface CardStats {
  energy: number | null;
  might: number | null;
  cost: number | null;
  power: number | null;
}

export interface PlayableCard {
  cardKey: string;
  name: string;
  type: string;
  category: CardCategory;
  // null = unknown / not evaluated (CARD-029); never read null as false or []
  domains: string[] | null;
  isChampionUnit: boolean | null;
  championTag: string | null;
  isSignature: boolean | null;
  isPreview: boolean | null;
  stats: CardStats;
  keywords: string[];
  tags: string[];
  text: string;
  flavorText: string | null;
  printingIds: string[]; // in printingSortKey order (CARD-070)
  defaultPrintingId: string;
}

export type VariantKind =
  | 'base'
  | 'showcase'
  | 'alt-art'
  | 'overnumbered'
  | 'signature'
  | 'promo'
  | 'unknown';

export type CollectorForm = 'block' | 'fraction' | 'plain' | 'code';

export interface CollectorInfo {
  key: string;
  block: string | null;
  number: number | null;
  suffix: string | null;
  form: CollectorForm;
}

export interface Printing {
  printingId: string;
  cardKey: string;
  setCode: string;
  collectorNumber: string;
  collector: CollectorInfo;
  publicCode: string | null;
  rarity: string | null;
  variant: { kind: VariantKind; label: string | null; evidence: string | null };
  art: { thumbnailUrl: string | null; fullUrl: string | null; artist: string | null };
  extra: Record<string, unknown>;
}

export type CardLookup =
  | { status: 'found'; cardKey: string; printingIds: string[]; note?: 'variant-not-found' }
  | { status: 'not-found' }
  | { status: 'ambiguous'; cardKeys: string[] };

export interface VariantRule {
  id: string;
  when: { field: string; equals?: string; pattern?: string };
  kind: VariantKind;
  source: string;
}

export interface VariantRulesFile {
  version: string;
  rules: VariantRule[];
}

export type NullCountedAttribute =
  | 'domains'
  | 'isChampionUnit'
  | 'championTag'
  | 'isSignature'
  | 'isPreview'
  | 'releaseStatus';

export interface IngestionReport {
  fetchedAt: string;
  catalogVersion: string;
  countsBySet: Record<string, number>;
  newSets: string[];
  setOrderChanged: string[];
  addedPrintings: string[];
  removedPrintings: string[];
  newProperties: string[];
  unmappedTypes: string[];
  fieldConflicts: { cardKey: string; field: string; printingIds: string[] }[];
  collectorCollisions: { setCode: string; collectorKey: string; cardKeys: string[] }[];
  unknownVariantCount: number;
  nullCounts: Record<NullCountedAttribute, number>;
}
