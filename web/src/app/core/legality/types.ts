/**
 * SPEC-002 v0.5 Deck Legality data contract (browser copy; `web/` can't import from `services/`). Keep in sync with
 * the spec and with brain/05-Services/API Contracts.md ("Deck legality engine"). The ban-list shapes are the ones
 * Decks already reads (`core/decks/types`), re-exported here.
 */
import type { BanKind, BanListFile, CardCategory, IsoDate, RegionId, VariantKind } from '../decks/types';

export type {
  BanEntry,
  BanKind,
  BanList,
  BanListFile,
  BanStatus,
  BanWave,
  IsoDate,
  RegionId,
} from '../decks/types';

/** MVP: only `standard` is offered and evaluated (LEGAL-R05); `2v2` is ban data only (LEGAL-B11). */
export type LegalityFormatId = 'standard';
export type Zone = 'legend' | 'champion' | 'main' | 'sideboard' | 'runes' | 'battlefields';

// ---------- Inputs ----------
export interface DeckEntry {
  name: string;
  qty: number;
}

export interface DeckInput {
  legend: string | null;
  chosenChampion: string | null;
  main: DeckEntry[];
  sideboard: DeckEntry[];
  runes: DeckEntry[];
  battlefields: DeckEntry[];
}

export interface LegalityRequest {
  deck: DeckInput;
  format: LegalityFormatId;
  /** Default `'global'` (LEGAL-B03). */
  region?: RegionId;
  /** A calendar date only, no time or zone (LEGAL-R02, LEGAL-B12). */
  asOf: IsoDate;
}

// ---------- Card view required from SPEC-001 ----------
export interface LegalityPrinting {
  setCode: string;
  collectorNumber: string;
  variant: { kind: VariantKind };
}

export interface LegalityCardView {
  cardKey: string;
  name: string;
  type: string;
  category: CardCategory;
  domains: string[] | null;
  isChampionUnit: boolean | null;
  isSignature: boolean | null;
  championTag: string | null;
  printings: LegalityPrinting[];
}

export interface LegalitySetView {
  code: string;
  releaseStatus: 'released' | 'preview' | null;
}

/** The catalog snapshot the evaluator reads (LEGAL-R01): cards by `cardKey`, sets, and SPEC-001 `catalogVersion`. */
export interface LegalityCatalog {
  catalogVersion: string;
  cards: Readonly<Record<string, LegalityCardView>>;
  sets: readonly LegalitySetView[];
  /**
   * LEGAL-C10: is this printing stamped SAMPLE? SPEC-001 CARD-044 has no field for the marker yet (BLOCKED, H-020), so
   * the catalog built from the API never marks one (`NO_SAMPLE_MARKER`); tests pass their own predicate.
   */
  isSample?: (card: LegalityCardView, printing: LegalityPrinting) => boolean;
}

// ---------- Output ----------
export type RuleStatus = 'pass' | 'fail' | 'warning' | 'not_evaluated';
export type Severity = 'error' | 'warning';

export interface Violation {
  severity: Severity;
  message: string;
  cardName?: string;
  cardKey?: string;
  zone?: Zone;
  expected?: number | string;
  actual?: number | string;
  banWaveId?: string;
  effectiveDate?: IsoDate;
}

export interface RuleResult {
  ruleId: string;
  title: string;
  status: RuleStatus;
  summary: string;
  violations: Violation[];
  notEvaluatedReason?: string;
  source: string;
}

export interface UpcomingBan {
  cardKey: string;
  name: string;
  kind: BanKind;
  change: 'ban' | 'unban';
  announced: IsoDate;
  effective: IsoDate;
  waveId: string;
}

export interface LegalityResult {
  verdict: 'legal' | 'illegal' | 'incomplete';
  format: LegalityFormatId;
  region: RegionId;
  asOf: IsoDate;
  banListDataVersion: string;
  formatsDataVersion: string;
  catalogVersion: string;
  counts: { main: number; sideboard: number; runes: number; battlefields: number };
  rules: RuleResult[];
  upcomingBans: UpcomingBan[];
}

// ---------- data/formats.json ----------
export interface DeckRules {
  mainDeckSize: number;
  mainDeckSizeMode: 'exact' | 'minimum';
  copyLimit: number | null;
  signatureLimit: number;
  runeDeckSize: number;
  battlefieldCount: number;
  sideboardMax: number;
}

export interface SetLegality {
  code: string;
  legalFrom: IsoDate | null;
  legalUntil: IsoDate | null;
  basis: 'riot-date' | 'riot-listing';
  sourceUrl: string;
  research: string;
}

export interface FormatDef {
  id: string;
  name: string;
  official: true;
  supported: boolean;
  deckRules: DeckRules;
  sets: Record<RegionId, SetLegality[]>;
  /** Not legal as sets, legal by name (LEGAL-C07): `['OPP', 'JDG', 'PR']`. */
  excludedSets: string[];
  /** Free text for people reading the file (e.g. why `excludedSets` holds the promo groupings); never read by code. */
  notes?: string;
}

export interface FormatsFile {
  schemaVersion: 2;
  dataVersion: string;
  lastVerified: IsoDate;
  formats: FormatDef[];
}

/** The two data files the evaluator needs next to the catalog. */
export interface LegalityData {
  bans: BanListFile;
  formats: FormatsFile;
}
