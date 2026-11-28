/**
 * SPEC-011 Keyword Explanations (0.2.2): the glossary shape and its load checks (KW-010…016), the card keyword
 * engine over `PlayableCard.keywords` (KW-030…037), the build report, and the source line (KW-050, KW-051).
 * Pure, no Angular. No glossary ships until ADR-0008 is accepted, so in production the glossary is empty and
 * every card gets no rows (KW-056). The `keywords[]` string format is assumed until H-020 (KW-030a, KW-032a,
 * KW-033a): nothing here strips Riot markup or parses costs.
 */
import { formatIsoDate } from '../decks/deck-ownership-view';

export interface KeywordGlossary {
  schemaVersion: number;
  /** ISO date of the last full research check. */
  asOf: string;
  entries: KeywordEntry[];
}

export interface KeywordEntry {
  /** `keywordKey(displayName)` (KW-033). */
  keywordId: string;
  /** Riot's spelling, verbatim (KW-011). */
  displayName: string;
  /** Riot's text, verbatim (KW-011, KW-011b). */
  definition: string;
  /** KW-016; `null` = not known. Used only for `keyword-value-mismatch`. */
  takesValue: boolean | null;
  source: {
    title: string;
    locator: string | null;
    url: string | null;
    documentDate: string | null;
  };
  /** ISO date research last confirmed the text (KW-012). */
  asOf: string;
  status: 'verified' | 'unverified';
  /** Set code, only when sourced (KW-015). Not shown. */
  introducedIn: string | null;
}

/** One shown row for a card (derived, not stored). */
export interface CardKeyword {
  keywordId: string;
  /** displayName + distinct values, e.g. "Beta 3, 6" (KW-034). */
  label: string;
  /** Distinct values in first-appearance order; [] when none. */
  values: number[];
  entry: KeywordEntry;
}

export type KeywordHiddenReason = 'no-entry' | 'unverified' | 'incomplete';

export interface KeywordReportRow {
  code: 'keyword-no-definition' | 'duplicate-keyword' | 'keyword-mixed-value' | 'keyword-value-mismatch';
  keywordId: string;
  /** keyword-no-definition only. */
  reason?: KeywordHiddenReason;
  /** Raw card strings seen; for `duplicate-keyword`, the entries' `displayName`s. */
  rawStrings: string[];
  cardCount: number;
  /** At most 20, in card order. */
  cardKeys: string[];
}

/** The loaded glossary: what is shown, and why the rest is not. Build it once per glossary. */
export interface KeywordIndex {
  /** Verified, complete, unique entries by `keywordId`: the only ones the UI sees (KW-052). */
  readonly shown: ReadonlyMap<string, KeywordEntry>;
  /** Entries present but not shown: `unverified` (KW-013) or `incomplete` (KW-035). */
  readonly hidden: ReadonlyMap<string, { reason: 'unverified' | 'incomplete'; entry: KeywordEntry | null }>;
  /** `keywordId` → the `displayName`s of two or more entries sharing it (KW-014). None is shown. */
  readonly duplicates: ReadonlyMap<string, readonly string[]>;
}

/** A card as the report needs it: any `PlayableCard` fits. `keywords` may be missing or null in source data. */
export interface KeywordCard {
  readonly cardKey: string;
  readonly keywords?: readonly string[] | null;
}

const REPORT_CARD_KEYS = 20;

/** KW-033 steps before the value split: NFKC, lower-case, trim, collapse whitespace, one enclosing `[...]`, trailing `.,:;`. */
function normalize(raw: string): string {
  let s = raw.normalize('NFKC').toLowerCase().replace(/\s+/gu, ' ').trim();
  if (enclosedInBrackets(s)) s = s.slice(1, -1).trim();
  return s.replace(/[.,:;]+$/u, '').trim();
}

/** True when the first `[` is closed by the last character (so `[a] [b]` is not one enclosing pair). */
function enclosedInBrackets(s: string): boolean {
  if (s.length < 2 || s[0] !== '[' || s[s.length - 1] !== ']') return false;
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '[') depth++;
    else if (s[i] === ']' && --depth === 0) return i === s.length - 1;
  }
  return false;
}

/**
 * KW-032 / KW-033: split a keyword string into its id and value. A trailing run of spaces plus ASCII digits is the
 * value; there is no default value (no "omitted = 1"). Returns null for a blank string (KW-030).
 */
export function parseKeyword(raw: string): { keywordId: string; value: number | null } | null {
  const s = normalize(raw);
  const m = /^(.*\S) +([0-9]+)$/u.exec(s);
  const keywordId = (m ? m[1] : s).trim();
  if (!keywordId) return null;
  return { keywordId, value: m ? Number(m[2]) : null };
}

/** KW-033 `keywordKey(term)`: the normalized id used for matching. Inner spaces and hyphens are kept. */
export function keywordKey(term: string): string {
  return parseKeyword(term)?.keywordId ?? '';
}

const isText = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
const isTextOrNull = (v: unknown) => v === null || typeof v === 'string';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}/u;

/** KW-010…013, KW-016: a well-formed entry (every required field present and typed; `keywordId` matches its name). */
function isComplete(e: Partial<KeywordEntry>, id: string): boolean {
  const src = e.source as Partial<KeywordEntry['source']> | undefined;
  return (
    e.keywordId === id &&
    isText(e.definition) &&
    (e.takesValue === true || e.takesValue === false || e.takesValue === null) &&
    !!src &&
    typeof src === 'object' &&
    isText(src.title) &&
    isTextOrNull(src.locator) &&
    isTextOrNull(src.url) &&
    isTextOrNull(src.documentDate) &&
    isText(e.asOf) &&
    ISO_DATE.test(e.asOf) &&
    (e.status === 'verified' || e.status === 'unverified') &&
    isTextOrNull(e.introducedIn ?? null)
  );
}

/**
 * Load checks for a glossary (KW-010…016). Anything that is not a glossary (absent, `null`, failed to load,
 * `entries` not a list) is an empty glossary, so the feature is off (KW-056). An entry with no usable `displayName`
 * has no id and is dropped.
 */
export function indexGlossary(glossary: unknown): KeywordIndex {
  const shown = new Map<string, KeywordEntry>();
  const hidden = new Map<string, { reason: 'unverified' | 'incomplete'; entry: KeywordEntry | null }>();
  const duplicates = new Map<string, string[]>();
  const entries = (glossary as Partial<KeywordGlossary> | null)?.entries;
  if (!Array.isArray(entries)) return { shown, hidden, duplicates };

  const byId = new Map<string, Partial<KeywordEntry>[]>();
  for (const e of entries as unknown[]) {
    if (!e || typeof e !== 'object') continue;
    const entry = e as Partial<KeywordEntry>;
    const id = isText(entry.displayName) ? keywordKey(entry.displayName) : '';
    if (!id) continue;
    const list = byId.get(id);
    if (list) list.push(entry);
    else byId.set(id, [entry]);
  }
  for (const [id, list] of byId) {
    if (list.length > 1) {
      duplicates.set(id, list.map((e) => e.displayName as string));
      continue;
    }
    const entry = list[0];
    if (!isComplete(entry, id)) hidden.set(id, { reason: 'incomplete', entry: null });
    else if (entry.status !== 'verified') hidden.set(id, { reason: 'unverified', entry: entry as KeywordEntry });
    else shown.set(id, entry as KeywordEntry);
  }
  return { shown, hidden, duplicates };
}

/** The empty glossary (KW-003: until ADR-0008 is accepted). */
export const EMPTY_KEYWORD_INDEX: KeywordIndex = indexGlossary(null);

interface Group {
  keywordId: string;
  values: number[];
  hasValueless: boolean;
  raw: string[];
}

/** KW-030, KW-034, KW-036: one group per distinct id, first-appearance order, distinct values in order. */
function groupKeywords(keywords: readonly string[] | null | undefined): Group[] {
  const groups = new Map<string, Group>();
  for (const raw of keywords ?? []) {
    if (typeof raw !== 'string') continue;
    const parsed = parseKeyword(raw);
    if (!parsed) continue;
    let g = groups.get(parsed.keywordId);
    if (!g) {
      g = { keywordId: parsed.keywordId, values: [], hasValueless: false, raw: [] };
      groups.set(parsed.keywordId, g);
    }
    if (!g.raw.includes(raw)) g.raw.push(raw);
    if (parsed.value === null) g.hasValueless = true;
    else if (!g.values.includes(parsed.value)) g.values.push(parsed.value);
  }
  return [...groups.values()];
}

/**
 * KW-030…036, KW-052: the shown rows for one card's `keywords` (never its text, KW-004 / KW-031). Keywords
 * without a shown entry are left out; an empty result means the section and its heading are hidden (KW-053).
 */
export function cardKeywords(keywords: readonly string[] | null | undefined, index: KeywordIndex): CardKeyword[] {
  const rows: CardKeyword[] = [];
  for (const g of groupKeywords(keywords)) {
    const entry = index.shown.get(g.keywordId);
    if (!entry) continue;
    const label = g.values.length ? `${entry.displayName} ${g.values.join(', ')}` : entry.displayName;
    rows.push({ keywordId: g.keywordId, label, values: g.values, entry });
  }
  return rows;
}

/**
 * The card-data build report (KW-014, KW-034, KW-035, KW-037), next to SPEC-001 CARD-065. Runs on an empty
 * glossary too, so research sees every keyword the data uses. One row per (code, keywordId), sorted by code then id.
 */
export function keywordReport(cards: readonly KeywordCard[], index: KeywordIndex): KeywordReportRow[] {
  const rows = new Map<string, KeywordReportRow>();
  const add = (
    code: KeywordReportRow['code'],
    keywordId: string,
    cardKey: string,
    raw: readonly string[],
    reason?: KeywordHiddenReason,
  ) => {
    const k = `${code}\u0000${keywordId}`;
    let row = rows.get(k);
    if (!row) {
      row = { code, keywordId, ...(reason ? { reason } : {}), rawStrings: [], cardCount: 0, cardKeys: [] };
      rows.set(k, row);
    }
    if (code !== 'duplicate-keyword') for (const r of raw) if (!row.rawStrings.includes(r)) row.rawStrings.push(r);
    row.cardCount++;
    if (row.cardKeys.length < REPORT_CARD_KEYS) row.cardKeys.push(cardKey);
  };

  for (const id of index.duplicates.keys()) {
    rows.set(`duplicate-keyword\u0000${id}`, {
      code: 'duplicate-keyword',
      keywordId: id,
      rawStrings: [...(index.duplicates.get(id) ?? [])],
      cardCount: 0,
      cardKeys: [],
    });
  }

  for (const card of cards) {
    for (const g of groupKeywords(card.keywords)) {
      const id = g.keywordId;
      if (g.hasValueless && g.values.length) add('keyword-mixed-value', id, card.cardKey, g.raw);
      if (index.duplicates.has(id)) {
        add('duplicate-keyword', id, card.cardKey, g.raw);
        continue;
      }
      const shown = index.shown.get(id);
      const hidden = index.hidden.get(id);
      if (!shown) add('keyword-no-definition', id, card.cardKey, g.raw, hidden?.reason ?? 'no-entry');
      const entry = shown ?? hidden?.entry;
      if (entry?.takesValue === false && g.values.length) add('keyword-value-mismatch', id, card.cardKey, g.raw);
    }
  }
  return [...rows.values()].sort((a, b) =>
    a.code === b.code ? (a.keywordId < b.keywordId ? -1 : a.keywordId > b.keywordId ? 1 : 0) : a.code < b.code ? -1 : 1,
  );
}

/** KW-050 / KW-051: "Source: Core Rules 900.1.b, as of Nov 24, 2026" (locator left out when null). */
export function keywordSourceLine(entry: KeywordEntry): string {
  const where = entry.source.locator ? `${entry.source.title} ${entry.source.locator}` : entry.source.title;
  return `Source: ${where}, as of ${formatIsoDate(entry.asOf)}`;
}
