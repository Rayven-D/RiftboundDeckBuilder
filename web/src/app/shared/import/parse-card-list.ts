/**
 * Shared card-list parsing for both imports (SPEC-003 Part A, reused by SPEC-006).
 *
 * Every entry is a quantity followed by a card name: `3 Lightning Rush`, `3x Lightning Rush`,
 * `3 x Lightning Rush` (IMP-019). A row without a quantity is an error (RJ, 2026-11-23; this
 * replaces IMP-021's "assume 1"). CSV and Excel rows follow the same rule: either one cell
 * holding `3x Name`, or a quantity cell followed by the name. Parsing never writes anything
 * (IMP-002) and one bad line never stops the rest (IMP-003).
 */

export type DeckSection = 'legend' | 'champion' | 'main' | 'battlefields' | 'runes' | 'sideboard';

export interface ParsedEntry {
  /** 1-based line (text) or row (CSV / Excel) number. */
  readonly line: number;
  readonly quantity: number;
  readonly name: string;
  /** Section label in effect for this line, or null when there was none (IMP-018). */
  readonly section: DeckSection | null;
}

export type IssueCode =
  | 'MISSING_QUANTITY'
  | 'BAD_QUANTITY'
  | 'ZERO_QUANTITY'
  | 'MISSING_NAME'
  | 'LINE_TOO_LONG'
  | 'INPUT_TOO_LARGE';

export interface ParseIssue {
  /** 0 for input-level issues. */
  readonly line: number;
  readonly code: IssueCode;
  readonly severity: 'error' | 'warning';
  readonly message: string;
  readonly raw: string;
}

export interface ParseResult {
  readonly entries: readonly ParsedEntry[];
  readonly issues: readonly ParseIssue[];
  /** Sum of quantities over all entries. */
  readonly totalCopies: number;
}

export const MAX_INPUT_BYTES = 1024 * 1024;
export const MAX_LINES = 10_000;
const MAX_LINE_LENGTH = 500;
const MAX_ROW_LENGTH = 2000;
const MAX_QUANTITY = 999;

/** IMP-016 / IMP-017: section labels and their accepted aliases. */
const SECTION_ALIASES: Readonly<Record<string, DeckSection>> = {
  legend: 'legend',
  legends: 'legend',
  champion: 'champion',
  champions: 'champion',
  'main deck': 'main',
  main: 'main',
  battlefields: 'battlefields',
  battlefield: 'battlefields',
  'rune pool': 'runes',
  runes: 'runes',
  'rune deck': 'runes',
  sideboard: 'sideboard',
};

const LABEL_RE = /^#*\s*([a-z][a-z ]*?)\s*(?::\s*(.*))?$/i;
const ENTRY_RE = /^(\d+)\s*(?:[xX]\s+|\s+)(\S.*)$/;
const QUANTITY_CELL_RE = /^(\d+)\s*[xX]?$/;
const STARTS_WITH_NUMBER_RE = /^-?\d/;
const HEADER_WORDS = /^(qty|quantity|count|amount|copies|#|x|name|card|card name|cardname)$/i;

type LineOutcome =
  | { kind: 'skip' }
  | { kind: 'section'; section: DeckSection; rest: string }
  | { kind: 'entry'; quantity: number; name: string }
  | { kind: 'issue'; code: IssueCode; severity: 'error' | 'warning'; message: string };

/** Parses pasted text or a .txt file: one entry per line. */
export function parseCardText(text: string): ParseResult {
  const tooLarge = checkSize(text);
  if (tooLarge) return tooLarge;
  const lines = splitLines(text);
  const builder = new ResultBuilder();
  let section: DeckSection | null = null;

  lines.forEach((raw, i) => {
    const lineNo = i + 1;
    if (raw.length > MAX_LINE_LENGTH) {
      builder.issue(
        lineNo,
        raw,
        'LINE_TOO_LONG',
        'error',
        `Line is longer than ${MAX_LINE_LENGTH} characters.`,
      );
      return;
    }
    let outcome = classifyLine(raw);
    if (outcome.kind === 'section') {
      section = outcome.section;
      if (!outcome.rest) return;
      // IMP-023: "Champion: 1 Kennen, Storm of Shuriken" carries an entry after the label.
      outcome = parseEntry(outcome.rest);
    }
    builder.add(lineNo, raw, outcome, section);
  });
  return builder.result();
}

/** Parses CSV text (comma, semicolon or tab separated, RFC 4180 quoting). */
export function parseCardCsv(text: string): ParseResult {
  const tooLarge = checkSize(text);
  if (tooLarge) return tooLarge;
  return parseCardRows(splitCsv(stripBom(text)));
}

/**
 * Parses spreadsheet-like rows (CSV or Excel). A row is either one cell with `3x Name`, or a
 * quantity cell followed by the name. A first row of column titles is skipped.
 */
export function parseCardRows(rows: readonly (readonly unknown[])[]): ParseResult {
  if (rows.length > MAX_LINES) return inputTooLarge();
  const builder = new ResultBuilder();
  let section: DeckSection | null = null;
  let seenContent = false;

  rows.forEach((row, i) => {
    const rowNo = i + 1;
    const cells = trimTrailingEmpty(row.map(cellText));
    const raw = cells.join(', ');
    if (cells.length === 0) return;
    if (raw.length > MAX_ROW_LENGTH) {
      builder.issue(
        rowNo,
        raw.slice(0, 120) + '…',
        'LINE_TOO_LONG',
        'error',
        `Row is longer than ${MAX_ROW_LENGTH} characters.`,
      );
      return;
    }
    if (!seenContent) {
      seenContent = true;
      if (isHeaderRow(cells)) return;
    }

    let outcome: LineOutcome;
    const quantityCell = QUANTITY_CELL_RE.exec(cells[0]);
    if (cells.length >= 2 && quantityCell) {
      // Card names can contain commas ("Kennen, Heart of the Tempest"): an unquoted CSV row
      // splits them, so the rest of the row is joined back together.
      const name = cells.slice(1).filter(Boolean).join(', ');
      outcome = toEntry(quantityCell[1], name);
    } else if (cells.length >= 2 && STARTS_WITH_NUMBER_RE.test(cells[0])) {
      outcome = toEntry(cells[0], cells.slice(1).filter(Boolean).join(', '));
    } else {
      outcome = classifyLine(cells.length === 1 ? cells[0] : raw);
      if (outcome.kind === 'section') {
        section = outcome.section;
        if (!outcome.rest) return;
        outcome = parseEntry(outcome.rest);
      }
    }
    builder.add(rowNo, raw, outcome, section);
  });
  return builder.result();
}

/**
 * Turns CSV / Excel rows into one text line per row so an upload can be shown and edited in the
 * text box: `qty, name` cells become `qty name`, one-cell rows stay as they are, and a first row of
 * column titles is dropped. Rows that don't fit the rule are kept as-is so they show up as errors.
 */
export function rowsToText(rows: readonly (readonly unknown[])[]): string {
  const out: string[] = [];
  let seenContent = false;
  for (const row of rows) {
    const cells = trimTrailingEmpty(row.map(cellText));
    if (cells.length === 0) continue;
    if (!seenContent) {
      seenContent = true;
      if (isHeaderRow(cells)) continue;
    }
    const quantityCell = QUANTITY_CELL_RE.exec(cells[0]);
    if (cells.length >= 2 && quantityCell) {
      out.push(`${cells[0]} ${cells.slice(1).filter(Boolean).join(', ')}`);
    } else {
      out.push(cells.filter(Boolean).join(', '));
    }
  }
  return out.join('\n');
}

/** Turns a result back into one `qty name` line per entry, e.g. to show an upload in the text box. */
export function entriesToText(result: ParseResult): string {
  const out: string[] = [];
  let section: DeckSection | null = null;
  for (const e of result.entries) {
    if (e.section && e.section !== section) {
      section = e.section;
      out.push(`${SECTION_LABELS[section]}:`);
    }
    out.push(`${e.quantity} ${e.name}`);
  }
  return out.join('\n');
}

export const SECTION_LABELS: Readonly<Record<DeckSection, string>> = {
  legend: 'Legend',
  champion: 'Champion',
  main: 'Main Deck',
  battlefields: 'Battlefields',
  runes: 'Rune Pool',
  sideboard: 'Sideboard',
};

function classifyLine(raw: string): LineOutcome {
  const line = raw.trim();
  if (!line) return { kind: 'skip' };
  const label = LABEL_RE.exec(line);
  if (label && !/^\d/.test(line)) {
    const section = SECTION_ALIASES[label[1].toLowerCase().replace(/\s+/g, ' ')];
    if (section) return { kind: 'section', section, rest: (label[2] ?? '').trim() };
  }
  // IMP-022: comment lines.
  if (line.startsWith('//') || line.startsWith('#')) return { kind: 'skip' };
  return parseEntry(line);
}

function parseEntry(line: string): LineOutcome {
  const match = ENTRY_RE.exec(line.trim());
  if (match) return toEntry(match[1], match[2]);
  if (/^-\d/.test(line.trim())) {
    return issue('BAD_QUANTITY', 'error', 'Quantity must be a whole number from 1 to 999.');
  }
  if (/^\d+\s*[xX]?$/.test(line.trim())) {
    return issue('MISSING_NAME', 'error', 'Add the card name after the number.');
  }
  return issue(
    'MISSING_QUANTITY',
    'error',
    'Start the line with a number, like "1 Card name" or "1x Card name".',
  );
}

function toEntry(quantityText: string, rawName: string): LineOutcome {
  const name = rawName.trim();
  const quantityPart = quantityText.trim().replace(/[xX]$/, '').trim();
  if (!/^\d+$/.test(quantityPart)) {
    return issue('BAD_QUANTITY', 'error', 'Quantity must be a whole number from 1 to 999.');
  }
  const quantity = Number(quantityPart);
  if (!name) return issue('MISSING_NAME', 'error', 'Add the card name after the number.');
  if (quantity === 0)
    return issue('ZERO_QUANTITY', 'warning', 'Quantity is 0, so this line is skipped.');
  if (quantity > MAX_QUANTITY) {
    return issue('BAD_QUANTITY', 'error', 'Quantity must be a whole number from 1 to 999.');
  }
  return { kind: 'entry', quantity, name: name.replace(/\s+/g, ' ') };
}

function issue(code: IssueCode, severity: 'error' | 'warning', message: string): LineOutcome {
  return { kind: 'issue', code, severity, message };
}

class ResultBuilder {
  private readonly entries: ParsedEntry[] = [];
  private readonly issues: ParseIssue[] = [];

  add(line: number, raw: string, outcome: LineOutcome, section: DeckSection | null): void {
    if (outcome.kind === 'entry') {
      this.entries.push({ line, quantity: outcome.quantity, name: outcome.name, section });
    } else if (outcome.kind === 'issue') {
      this.issue(line, raw.trim(), outcome.code, outcome.severity, outcome.message);
    }
  }

  issue(
    line: number,
    raw: string,
    code: IssueCode,
    severity: 'error' | 'warning',
    message: string,
  ): void {
    this.issues.push({ line, raw, code, severity, message });
  }

  result(): ParseResult {
    const totalCopies = this.entries.reduce((sum, e) => sum + e.quantity, 0);
    return { entries: this.entries, issues: this.issues, totalCopies };
  }
}

function checkSize(text: string): ParseResult | null {
  if (new TextEncoder().encode(text).length > MAX_INPUT_BYTES) return inputTooLarge();
  if (splitLines(text).length > MAX_LINES) return inputTooLarge();
  return null;
}

function inputTooLarge(): ParseResult {
  return {
    entries: [],
    totalCopies: 0,
    issues: [
      {
        line: 0,
        raw: '',
        code: 'INPUT_TOO_LARGE',
        severity: 'error',
        message: `This is too large to import (limit: 1 MB or ${MAX_LINES.toLocaleString('en-US')} lines).`,
      },
    ],
  };
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function splitLines(text: string): string[] {
  return stripBom(text).split(/\r\n|\r|\n/);
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function trimTrailingEmpty(cells: string[]): string[] {
  let end = cells.length;
  while (end > 0 && cells[end - 1] === '') end--;
  return cells.slice(0, end);
}

function isHeaderRow(cells: readonly string[]): boolean {
  return cells.some((c) => HEADER_WORDS.test(c)) && !cells.some((c) => /^\d/.test(c));
}

/** Minimal RFC 4180 CSV reader. The delimiter (comma, semicolon or tab) comes from the first line. */
export function splitCsv(text: string): string[][] {
  const firstLine = text.split(/\r\n|\r|\n/, 1)[0] ?? '';
  const counts = [',', ';', '\t'].map((d) => [d, firstLine.split(d).length - 1] as const);
  const delimiter = counts.reduce((best, c) => (c[1] > best[1] ? c : best), counts[0])[0];

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"' && cell.trim() === '') {
      quoted = true;
      cell = '';
    } else if (ch === delimiter) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}
