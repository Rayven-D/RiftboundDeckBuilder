/**
 * Shared card-list parsing for both imports (SPEC-003 Part A, reused by SPEC-006).
 *
 * Every entry is a quantity plus a card part (SPEC-003 v0.5 "Line grammar"). The quantity leads
 * (`3 Name`, `3x Name`, `3 x Name`, `x3 Name`) or trails (`Name x3`), once per line (IMP-019/020).
 * The card part is a name, a printing code (`RAD 001/167`, `OGN-007a`, `(OGN 299/298)`) at its
 * start or end, or both (IMP-064/065); a code alone is a valid entry (IMP-066). A line without a
 * quantity is an error (IMP-021). CSV and Excel rows become one line each and use the same
 * grammar (IMP-040). Parsing never writes anything (IMP-002) and one bad line never stops the
 * rest (IMP-003). Codes are only read here; resolving them needs the card catalog (IMP-067…069).
 */

export type DeckSection = 'legend' | 'champion' | 'main' | 'battlefields' | 'runes' | 'sideboard';

/** The printing a line names, before resolution (SPEC-003 Data contract, IMP-064). */
export interface PrintingHint {
  /** Upper-cased, e.g. `RAD`. */
  readonly setCode: string;
  /** Verbatim as typed, e.g. `001 /167`, `007a`, `SP1/005`. */
  readonly collectorNumber: string;
  /** The code as typed without brackets, e.g. `RAD 001 /167`, `OGN-007a`. */
  readonly text: string;
}

export interface ParsedEntry {
  /** 1-based line (text) or row (CSV / Excel) number. */
  readonly line: number;
  readonly quantity: number;
  /** Card name as typed, without quantity or code. Empty only for a code-only line (IMP-066). */
  readonly name: string;
  /** Printing code written on the line, or null (IMP-064). */
  readonly printing: PrintingHint | null;
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

/**
 * IMP-016 / IMP-017: section labels and their accepted aliases, keyed without spaces so one- and
 * two-word spellings both match ("Main Deck" / "MainDeck", "Rune Pool" / "RunePool"; RJ, 2026-11-23).
 */
const SECTION_ALIASES: Readonly<Record<string, DeckSection>> = {
  legend: 'legend',
  legends: 'legend',
  champion: 'champion',
  champions: 'champion',
  maindeck: 'main',
  main: 'main',
  battlefields: 'battlefields',
  battlefield: 'battlefields',
  runepool: 'runes',
  runes: 'runes',
  runedeck: 'runes',
  sideboard: 'sideboard',
};

const LABEL_RE = /^#*\s*([a-z][a-z ]*?)\s*(?::\s*(.*))?$/i;

// SPEC-003 v0.5 Line grammar (IMP-019, IMP-020, IMP-064, IMP-065).
const QTY_LEAD_RE = /^(?:(\d+)(?:\s*[xX])?|[xX](\d+))\s+(.+)$/;
const QTY_TRAIL_RE = /\s+[xX](\d+)$/;
const QTY_ONLY_RE = /^(?:\d+(?:\s*[xX])?|[xX]\d+)$/;
const NEG_LEAD_RE = /^-\d/;
/** A second quantity left at the end of the card part, also when it is all that is left. */
const SECOND_QTY_RE = /(?:^|\s)[xX]\d+$/;

/** Collector number: block `SP1/005`, fraction `001/167` / `001 /167`, plain `001` / `7a`. */
const NUM = String.raw`[A-Za-z]+\d*\s*\/\s*\d+[A-Za-z*]*|\d+[A-Za-z*]*\s*\/\s*\d+|\d+[A-Za-z*]*`;
/** A printing code; groups: whole code, set code, collector number. */
const CODE = String.raw`(([A-Za-z]{3})(?:-|\s+)?(${NUM}))`;
const SEP = String.raw`(?:\s+-\s+|\s*,\s*|\s+)`;
const BRACKETED = String.raw`(?:\(\s*${CODE}\s*\)|\[\s*${CODE}\s*\])`;

const CODE_ONLY_RE = new RegExp(String.raw`^(?:${CODE}|${BRACKETED})$`);
const CODE_AT_END_RE = new RegExp(String.raw`^(.*?)(?:${SEP}${CODE}|${SEP}?${BRACKETED})$`);
const CODE_AT_START_RE = new RegExp(String.raw`^(?:${CODE}${SEP}|${BRACKETED}${SEP}?)(.+)$`);

const QUANTITY_CELL_RE = /^(\d+)\s*[xX]?$/;
const STARTS_WITH_NUMBER_RE = /^-?\d/;
const HEADER_WORDS = /^(qty|quantity|count|amount|copies|#|x|name|card|card name|cardname)$/i;

type LineOutcome =
  | { kind: 'skip' }
  | { kind: 'section'; section: DeckSection; rest: string }
  | { kind: 'entry'; quantity: number; name: string; printing: PrintingHint | null }
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
      // splits them, so the rest of the row is joined back together. The resulting line goes
      // through the full line grammar, so a code cell after the name is read too (IMP-040).
      const name = cells.slice(1).filter(Boolean).join(', ');
      outcome = parseEntry(`${cells[0]} ${name}`);
    } else if (cells.length >= 2 && STARTS_WITH_NUMBER_RE.test(cells[0])) {
      outcome = toEntry(cells[0], cells.slice(1).filter(Boolean).join(', '), null);
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

/**
 * Turns a result back into one `qty name` line per entry (with its printing code, if any), e.g. to
 * show an upload in the text box.
 */
export function entriesToText(result: ParseResult): string {
  const out: string[] = [];
  let section: DeckSection | null = null;
  for (const e of result.entries) {
    if (e.section && e.section !== section) {
      section = e.section;
      out.push(`${SECTION_LABELS[section]}:`);
    }
    out.push([e.quantity, e.name, e.printing?.text].filter(Boolean).join(' '));
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
    const section = SECTION_ALIASES[label[1].toLowerCase().replace(/\s+/g, '')];
    if (section) return { kind: 'section', section, rest: (label[2] ?? '').trim() };
  }
  // IMP-022: comment lines.
  if (line.startsWith('//') || line.startsWith('#')) return { kind: 'skip' };
  return parseEntry(line);
}

/** SPEC-003 Line grammar, steps 1-7, on a line that is not blank, a comment or a label. */
function parseEntry(raw: string): LineOutcome {
  const line = raw.trim();
  // Step 1.
  if (QTY_ONLY_RE.test(line)) return missingName();
  if (NEG_LEAD_RE.test(line)) return badQuantity();

  // Step 2: leading quantity.
  let quantity: string | null = null;
  let body = line;
  const lead = QTY_LEAD_RE.exec(line);
  if (lead) {
    quantity = lead[1] ?? lead[2];
    body = lead[3];
  }

  // Step 3: trailing quantity and/or trailing code, at most once each.
  let printing: PrintingHint | null = null;
  let cutEnd = false;
  for (let i = 0; i < 2; i++) {
    const trail = quantity === null ? QTY_TRAIL_RE.exec(body) : null;
    if (trail) {
      quantity = trail[1];
      body = body.slice(0, trail.index);
      cutEnd = true;
      continue;
    }
    const end: CodeCut | null = printing ? null : codeAtEnd(body);
    if (!end) break;
    printing = end.printing;
    body = end.rest;
    cutEnd = true;
  }

  // Step 4: leading code.
  let cutStart = false;
  if (!printing) {
    const start = CODE_AT_START_RE.exec(body);
    if (start) {
      printing = hintFrom(start, 1);
      body = start[10];
      cutStart = true;
    }
  }

  // Step 5: two quantities.
  if (lead && SECOND_QTY_RE.test(body)) {
    return issue('BAD_QUANTITY', 'error', 'Give the number of copies once per line.');
  }

  // Step 6: name, without a separator left dangling at a cut.
  let name = body.trim();
  if (cutEnd) name = name.replace(/\s*[-,]$/, '');
  if (cutStart) name = name.replace(/^[-,]\s*/, '');

  // Step 7.
  if (quantity === null) {
    return issue(
      'MISSING_QUANTITY',
      'error',
      'Start the line with a number, like "1 Card name" or "1x Card name".',
    );
  }
  return toEntry(quantity, name, printing);
}

interface CodeCut {
  readonly printing: PrintingHint;
  readonly rest: string;
}

/** A code that is the whole card part, or ends it after a separator (IMP-065). */
function codeAtEnd(body: string): CodeCut | null {
  const only = CODE_ONLY_RE.exec(body);
  if (only) return { printing: hintFrom(only, 1), rest: '' };
  const end = CODE_AT_END_RE.exec(body);
  return end ? { printing: hintFrom(end, 2), rest: end[1] } : null;
}

/** Reads the first matched (code, set, number) group triple: bare, `()` or `[]`. */
function hintFrom(match: RegExpExecArray, first: number): PrintingHint {
  for (let g = first; g < first + 9; g += 3) {
    if (match[g] !== undefined) {
      return {
        setCode: match[g + 1].toUpperCase(),
        collectorNumber: match[g + 2],
        text: match[g],
      };
    }
  }
  throw new Error('No printing code in match');
}

function toEntry(
  quantityText: string,
  rawName: string,
  printing: PrintingHint | null,
): LineOutcome {
  const name = rawName.trim();
  const quantityPart = quantityText.trim().replace(/[xX]$/, '').trim();
  if (!/^\d+$/.test(quantityPart)) return badQuantity();
  const quantity = Number(quantityPart);
  if (!name && !printing) return missingName();
  if (quantity === 0)
    return issue('ZERO_QUANTITY', 'warning', 'Quantity is 0, so this line is skipped.');
  if (quantity > MAX_QUANTITY) return badQuantity();
  return { kind: 'entry', quantity, name: name.replace(/\s+/g, ' '), printing };
}

function badQuantity(): LineOutcome {
  return issue('BAD_QUANTITY', 'error', 'Quantity must be a whole number from 1 to 999.');
}

function missingName(): LineOutcome {
  return issue('MISSING_NAME', 'error', 'Add the card name after the number.');
}

function issue(code: IssueCode, severity: 'error' | 'warning', message: string): LineOutcome {
  return { kind: 'issue', code, severity, message };
}

class ResultBuilder {
  private readonly entries: ParsedEntry[] = [];
  private readonly issues: ParseIssue[] = [];

  add(line: number, raw: string, outcome: LineOutcome, section: DeckSection | null): void {
    if (outcome.kind === 'entry') {
      const { quantity, name, printing } = outcome;
      this.entries.push({ line, quantity, name, printing, section });
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
