/**
 * Shared card-list parsing for both imports (SPEC-003 Part A, reused by SPEC-006).
 *
 * Every entry is a quantity plus a card part (SPEC-003 v0.8 "Line grammar"). The quantity leads
 * (`3 Name`, `3x Name`, `3 x Name`, `x3 Name`) or trails (`Name x3`), once per line (IMP-019/020).
 * The card part is a name, a printing code (`RAD 001/167`, `OGN-007a`, `(OGN 299/298)`) at its
 * start or end, or both (IMP-064/065); a code alone is a valid entry (IMP-066). A line without a
 * quantity is an error (IMP-021). Uploads go through `readImportFile`, which turns CSV and Excel
 * rows into one text line each (IMP-040, IMP-062); the dialog writes that text into its text box
 * and parses it with `parseCardText`, like pasted text. There is one parse path. Parsing never
 * writes anything (IMP-002) and one bad line never stops the rest (IMP-003). Codes are only read
 * here; resolving them needs the card catalog (IMP-067…069).
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
  | 'INPUT_TOO_LARGE'
  | 'INPUT_ENCODING';

export interface ParseIssue {
  /** 0 for input-level issues. */
  readonly line: number;
  readonly code: IssueCode;
  readonly severity: 'error' | 'warning';
  readonly message: string;
  /** Raw text excerpt, at most 120 characters (IMP-056). */
  readonly raw: string;
}

/** SPEC-003 `SourceFormat`. Only `csv`, `riot-text` and `plain-text` are produced so far (H-047). */
export type SourceFormat = 'riot-text' | 'plain-text' | 'piltover-code' | 'tts' | 'csv';

/** SPEC-003 `UploadInfo` (IMP-001, IMP-061, IMP-062). */
export interface UploadInfo {
  readonly fileName: string;
  readonly fileType: 'txt' | 'csv' | 'xlsx';
}

/**
 * The catalog-free part of SPEC-003 `ImportResult.summary` (IMP-057). `resolvedExact` and
 * `needsReview` need name resolution against the card catalog and are added with it.
 */
export interface ParseSummary {
  /** Lines of the parsed text; a final empty line after a trailing line break is not counted. */
  readonly linesRead: number;
  readonly entriesParsed: number;
  /** Issues with severity `error`, input-level ones included. */
  readonly errors: number;
  /** Distinct `nameKey`s (CARD-030) of the entries; a code-only entry counts by its code. */
  readonly distinctNames: number;
  /** Sum of quantities over all entries. */
  readonly totalCopies: number;
}

export interface ParseResult {
  readonly entries: readonly ParsedEntry[];
  readonly issues: readonly ParseIssue[];
  /** IMP-011 (partial, H-047): `csv` for a .csv/.xlsx upload, else riot-text / plain-text. */
  readonly format: SourceFormat;
  /** IMP-012. */
  readonly formatReason: string;
  /** The upload the text came from; absent for pasted or typed text. */
  readonly upload?: UploadInfo;
  readonly summary: ParseSummary;
}

export interface ParseOptions {
  /** Set when the text is the converted content of an upload (IMP-062). */
  readonly upload?: UploadInfo | null;
}

export const MAX_INPUT_BYTES = 1024 * 1024;
export const MAX_LINES = 10_000;
/** IMP-061: files above this are rejected before reading. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_LINE_LENGTH = 500;
const MAX_ROW_LENGTH = 2000;
const MAX_RAW_LENGTH = 120;
const MAX_QUANTITY = 999;
const TOO_LARGE_LIMIT = `limit: 1 MB or ${MAX_LINES.toLocaleString('en-US')} lines`;

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

// SPEC-003 v0.8 Line grammar (IMP-019, IMP-020, IMP-064, IMP-065).
const QTY_LEAD_RE = /^(?:(\d+)(?:\s*[xX])?|[xX](\d+))\s+(.+)$/;
const QTY_TRAIL_RE = /\s+[xX](\d+)$/;
const QTY_ONLY_RE = /^(?:\d+(?:\s*[xX])?|[xX]\d+)$/;
const NEG_LEAD_RE = /^-\d/;
/**
 * IMP-008: a non-integer quantity is BAD_QUANTITY: `2.5 Gust`, `x2.5 Gust`, `Gust x2.5`, and a
 * decimal comma (`2,5 Gust`, or CSV `2,5;Gust` → `2,5, Gust`). A digit must follow the `.`/`,`.
 */
const DECIMAL_LEAD_RE = /^(?:\d*[.,]\d+(?:\s*[xX])?|[xX]\d*[.,]\d+)(?=[\s,]|$)/;
const DECIMAL_TRAIL_RE = /\s[xX]\d*[.,]\d+$/;
/** A second quantity left at the end of the card part, also when it is all that is left. */
const SECOND_QTY_RE = /(?:^|\s)[xX](?:\d+|\d*[.,]\d+)$/;

/** Collector number: block `SP1/005`, fraction `001/167` / `001 /167`, plain `001` / `7a`. */
const NUM = String.raw`[A-Za-z]+\d*\s*\/\s*\d+[A-Za-z*]*|\d+[A-Za-z*]*\s*\/\s*\d+|\d+[A-Za-z*]*`;
/** A printing code; groups: whole code, set code, collector number. */
const CODE = String.raw`(([A-Za-z]{3})(?:-|\s+)?(${NUM}))`;
const SEP = String.raw`(?:\s+-\s+|\s*,\s*|\s+)`;
const BRACKETED = String.raw`(?:\(\s*${CODE}\s*\)|\[\s*${CODE}\s*\])`;

const CODE_ONLY_RE = new RegExp(String.raw`^(?:${CODE}|${BRACKETED})$`);
const CODE_AT_END_RE = new RegExp(String.raw`^(.*?)(?:${SEP}${CODE}|${SEP}?${BRACKETED})$`);
const CODE_AT_START_RE = new RegExp(String.raw`^(?:${CODE}${SEP}|${BRACKETED}${SEP}?)(.+)$`);

/** SPEC-003 "Quantity cell": `3`, `3x`, `3 X`, and (like the text forms, IMP-020) `x3` / `X3`. */
const QUANTITY_CELL_RE = /^(?:\d+\s*[xX]?|[xX]\d+)$/;
const HEADER_WORDS = /^(qty|quantity|count|amount|copies|#|x|name|card|card name|cardname)$/i;

type LineOutcome =
  | { kind: 'skip' }
  | { kind: 'section'; section: DeckSection; rest: string }
  | { kind: 'entry'; quantity: number; name: string; printing: PrintingHint | null }
  | { kind: 'issue'; code: IssueCode; severity: 'error' | 'warning'; message: string };

/**
 * Parses the dialog's text: pasted or typed text, or the text an upload was converted into
 * (`readImportFile`). One entry per line.
 */
export function parseCardText(text: string, options: ParseOptions = {}): ParseResult {
  const upload = options.upload ?? undefined;
  const fromRows = upload?.fileType === 'csv' || upload?.fileType === 'xlsx';
  if (exceedsTextLimit(text)) return inputTooLarge(upload);
  const lines = splitLines(text);
  const builder = new ResultBuilder();
  let section: DeckSection | null = null;
  let firstLabel: { line: number; section: DeckSection } | null = null;

  // IMP-007: a line converted from a CSV/Excel row has the 2,000-char row limit, a text line 500.
  const maxLength = fromRows ? MAX_ROW_LENGTH : MAX_LINE_LENGTH;
  const tooLong = `${fromRows ? 'Row' : 'Line'} is longer than ${maxLength.toLocaleString('en-US')} characters.`;

  for (const [i, raw] of lines.entries()) {
    const lineNo = i + 1;
    if (raw.length > maxLength) {
      builder.issue(lineNo, raw, 'LINE_TOO_LONG', 'error', tooLong);
      continue;
    }
    let outcome = classifyLine(raw);
    if (outcome.kind === 'section') {
      section = outcome.section;
      firstLabel ??= { line: lineNo, section };
      if (!outcome.rest) continue;
      // IMP-023: "Champion: 1 Kennen, Storm of Shuriken" carries an entry after the label.
      outcome = parseEntry(outcome.rest);
    }
    builder.add(lineNo, raw, outcome, section);
  }

  // IMP-011 steps 1, 4 and 5 (deck codes and TTS tokens are H-047).
  let format: SourceFormat = 'plain-text';
  let formatReason = 'no section labels found';
  if (fromRows) {
    format = 'csv';
    formatReason = `uploaded file ${upload.fileName}`;
  } else if (firstLabel) {
    format = 'riot-text';
    formatReason = `found section label ${SECTION_LABELS[firstLabel.section]} on line ${firstLabel.line}`;
  }
  return builder.result(countLines(lines), format, formatReason, upload);
}

/** An upload converted into text for the dialog's text box (IMP-062). */
export interface ImportFile {
  readonly text: string;
  readonly upload: UploadInfo;
}

/** An upload that was rejected; the text box is left unchanged (IMP-061). */
export class ImportFileError extends Error {
  constructor(
    readonly code: 'INPUT_TOO_LARGE' | 'INPUT_ENCODING' | 'FILE_REJECTED',
    message: string,
  ) {
    super(message);
    this.name = 'ImportFileError';
  }
}

/**
 * Reads an uploaded file into the text the dialog writes into its text box (IMP-001, IMP-061,
 * IMP-062): `.txt` as-is, `.csv` and `.xlsx` (first sheet) one line per row (IMP-040). Text is
 * decoded as strict UTF-8 (IMP-010). Excel support is loaded only when needed.
 *
 * Limits (H-053): a `.txt` file *is* its text, so it gets the 1 MiB text limit (IMP-006) before
 * reading, with the same message. `.csv` / `.xlsx` are rejected above 5 MiB before reading
 * (IMP-061), and the text they convert into must then fit the IMP-006 limit too; if it doesn't,
 * the upload is rejected with that message instead of filling the text box with text that can't
 * be imported.
 */
export async function readImportFile(file: File): Promise<ImportFile> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.xls')) {
    throw new ImportFileError(
      'FILE_REJECTED',
      "Older .xls files aren't supported. Save it as .xlsx or .csv and try again.",
    );
  }
  const fileType = (['txt', 'csv', 'xlsx'] as const).find((t) => lower.endsWith(`.${t}`));
  if (!fileType) {
    throw new ImportFileError(
      'FILE_REJECTED',
      `${file.name} can't be imported. Use a .txt, .csv or .xlsx file.`,
    );
  }
  const tooLarge = `${file.name} is too large to import (${TOO_LARGE_LIMIT}).`;
  if (fileType === 'txt' && file.size > MAX_INPUT_BYTES + 3 /* UTF-8 BOM */) {
    throw new ImportFileError('INPUT_TOO_LARGE', tooLarge);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ImportFileError(
      'INPUT_TOO_LARGE',
      `${file.name} is too large to import (limit: 5 MB).`,
    );
  }

  let text: string;
  if (fileType === 'xlsx') {
    const { readSheet } = await import('read-excel-file/browser');
    try {
      text = rowsToText(await readSheet(file));
    } catch {
      throw new ImportFileError(
        'FILE_REJECTED',
        `Couldn't read ${file.name}. Save it as .xlsx or .csv and try again.`,
      );
    }
  } else {
    const decoded = decodeUtf8(await file.arrayBuffer(), file.name);
    text = fileType === 'csv' ? rowsToText(splitCsv(decoded)) : decoded;
  }
  if (exceedsTextLimit(text)) throw new ImportFileError('INPUT_TOO_LARGE', tooLarge);
  if (!text.trim()) {
    throw new ImportFileError('FILE_REJECTED', `${file.name} has no lines to import.`);
  }
  return { text, upload: { fileName: file.name, fileType } };
}

/**
 * IMP-040: turns CSV / Excel rows into one text line per row for the text box. `qty, name…` rows
 * become `qty name…`, one-cell rows stay as they are, a first row of column titles is dropped
 * (IMP-041), and other rows are kept as their cells joined with `, ` so they show up as errors.
 * A row whose first cell is a section label and whose later cells hold the entry
 * (`Champion,1 Kennen` or `Champion,1,Kennen`) becomes `Champion: 1 Kennen` (label with an
 * entry, IMP-023), per IMP-040 (c).
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
    out.push(rowToLine(cells));
  }
  return out.join('\n');
}

function rowToLine(cells: readonly string[]): string {
  if (cells.length >= 2 && QUANTITY_CELL_RE.test(cells[0])) {
    return `${cells[0]} ${cells.slice(1).filter(Boolean).join(', ')}`;
  }
  if (cells.length >= 2 && isLabelOnly(cells[0])) {
    const rest = cells.slice(1).filter(Boolean);
    return `${cells[0].replace(/\s*:$/, '')}: ${rowToLine(rest)}`;
  }
  return cells.filter(Boolean).join(', ');
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
  if (NEG_LEAD_RE.test(line) || DECIMAL_LEAD_RE.test(line)) return badQuantity();

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

  // Step 7. A trailing non-integer quantity (`Gust x2.5`) is BAD_QUANTITY too (IMP-008).
  if (quantity === null) {
    if (DECIMAL_TRAIL_RE.test(body)) return badQuantity();
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
    this.issues.push({ line, raw: excerpt(raw), code, severity, message });
  }

  result(
    linesRead: number,
    format: SourceFormat,
    formatReason: string,
    upload: UploadInfo | undefined,
  ): ParseResult {
    const entries = this.entries;
    const issues = this.issues;
    const summary: ParseSummary = {
      linesRead,
      entriesParsed: entries.length,
      errors: issues.filter((i) => i.severity === 'error').length,
      distinctNames: new Set(entries.map(entryKey)).size,
      totalCopies: entries.reduce((sum, e) => sum + e.quantity, 0),
    };
    return { entries, issues, format, formatReason, ...(upload ? { upload } : {}), summary };
  }
}

/** IMP-056: raw excerpts are at most 120 characters, ending in `…` when cut. */
function excerpt(raw: string): string {
  return raw.length > MAX_RAW_LENGTH ? raw.slice(0, MAX_RAW_LENGTH - 1) + '…' : raw;
}

/** The key `distinctNames` counts: the CARD-030 name key, or the code for a code-only entry. */
function entryKey(e: ParsedEntry): string {
  if (e.name || !e.printing) return 'n:' + nameKey(e.name);
  return 'c:' + e.printing.setCode + e.printing.collectorNumber.replace(/\s+/g, '').toUpperCase();
}

/**
 * CARD-030 `nameKey` (same steps as `services/src/domain/name-key.ts`). Only used for the
 * `distinctNames` count here; resolution against the catalog uses the catalog's own keys.
 */
function nameKey(name: string): string {
  return name
    .normalize('NFKC')
    .replace(/[’‘ʼ´`]/gu, "'")
    .replace(/[“”]/gu, '"')
    .replace(/[‐‑–—]/gu, '-')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

/** IMP-006: more than 1 MiB of UTF-8 or more than 10,000 lines. */
function exceedsTextLimit(text: string): boolean {
  return (
    new TextEncoder().encode(text).length > MAX_INPUT_BYTES ||
    countLines(splitLines(text)) > MAX_LINES
  );
}

/** Lines of a split text, not counting the empty line after a trailing line break. */
function countLines(lines: readonly string[]): number {
  return lines.length > 0 && lines[lines.length - 1] === '' ? lines.length - 1 : lines.length;
}

function inputTooLarge(upload: UploadInfo | undefined): ParseResult {
  const issues: ParseIssue[] = [
    {
      line: 0,
      raw: '',
      code: 'INPUT_TOO_LARGE',
      severity: 'error',
      message: `This is too large to import (${TOO_LARGE_LIMIT}).`,
    },
  ];
  return {
    entries: [],
    issues,
    format: upload && upload.fileType !== 'txt' ? 'csv' : 'plain-text',
    formatReason: 'input too large to read',
    ...(upload ? { upload } : {}),
    summary: { linesRead: 0, entriesParsed: 0, errors: 1, distinctNames: 0, totalCopies: 0 },
  };
}

/** IMP-010: strict UTF-8; the decoder drops a leading BOM. */
function decodeUtf8(bytes: ArrayBuffer, fileName: string): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new ImportFileError(
      'INPUT_ENCODING',
      `${fileName} isn't UTF-8 text. Save it as UTF-8 or .xlsx and try again.`,
    );
  }
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function splitLines(text: string): string[] {
  return stripBom(text).split(/\r\n|\r|\n/);
}

/**
 * Cell text for IMP-040: trimmed, Excel dates as `YYYY-MM-DD`. Line breaks inside a cell (a quoted
 * multi-line CSV field, or Alt+Enter in Excel) become one space, so a row stays one line in the
 * text box (IMP-042; H-053).
 */
function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value)
    .replace(/\s*(?:\r\n|\r|\n)\s*/g, ' ')
    .trim();
}

function trimTrailingEmpty(cells: string[]): string[] {
  let end = cells.length;
  while (end > 0 && cells[end - 1] === '') end--;
  return cells.slice(0, end);
}

function isHeaderRow(cells: readonly string[]): boolean {
  return cells.some((c) => HEADER_WORDS.test(c)) && !cells.some((c) => /^\d/.test(c));
}

/** A cell that is a section label with nothing after it (IMP-016), e.g. `Champion` or `Main Deck:`. */
function isLabelOnly(cell: string): boolean {
  const outcome = classifyLine(cell);
  return outcome.kind === 'section' && !outcome.rest;
}

/**
 * Picks the CSV delimiter from the first non-empty line, counting only characters outside double
 * quotes (SPEC-003 IMP-042 interim rule, approved by RJ 2026-11-23, H-053): if `;` or tab
 * occurs there, it wins over `,`, because commas appear in card names
 * (`2;Kennen, Heart of the Tempest`); between `;` and tab the more frequent wins (tie → `;`);
 * otherwise `,`.
 */
function detectDelimiter(text: string): ',' | ';' | '\t' {
  let semicolons = 0;
  let tabs = 0;
  let quoted = false;
  let content = false;
  for (const ch of text) {
    if (ch === '"') {
      quoted = !quoted; // `""` inside a quoted field toggles twice, so it nets out.
      content = true;
    } else if (quoted) {
      continue;
    } else if (ch === '\n' || ch === '\r') {
      if (content) break;
    } else if (ch === ';') {
      semicolons++;
    } else if (ch === '\t') {
      tabs++;
    } else if (ch.trim()) {
      content = true;
    }
  }
  if (semicolons === 0 && tabs === 0) return ',';
  return tabs > semicolons ? '\t' : ';';
}

/** Minimal RFC 4180 CSV reader (IMP-042); the delimiter comes from `detectDelimiter`. */
function splitCsv(text: string): string[][] {
  const delimiter = detectDelimiter(text);

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
