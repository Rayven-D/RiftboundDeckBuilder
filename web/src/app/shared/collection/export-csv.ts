/**
 * SPEC-003 IMP-055 "Collection CSV export" rules 1–10 (v0.7, H-045). Pure: builds the file text and
 * the export notices from the stored collection and the catalog.
 *
 * Self-check (rule 6): web has no catalog name resolver yet (H-057 waits on H-020), so a row is
 * checked with the shared parser (`parseCardText`, the importer's own Line grammar) plus the parts of
 * IMP-067/068 that decide a round trip here: the name part's `nameKey` must be the record's cardKey,
 * the exact-name guard (`nameKey("<name> <SET> <NUM>")` must not be another card), and the code must
 * name this printing first among printings sharing its set, collector key and suffix.
 */
import { nameKey } from '../../core/cards/name-key';
import { deckOwnership } from '../../core/decks';
import type { CardKey, DeckOwnershipInput, Printing } from '../../core/decks';
import { parseCardText } from '../import/parse-card-list';
import { collectorKey, printingRanks } from './printing-sort';

export interface CsvExport {
  readonly csv: string;
  /** Copies and cards written to the file. */
  readonly copies: number;
  readonly cards: number;
  /** Spec notices, verbatim, in this order: no printing, left out, may not import back. */
  readonly notices: string[];
}

const NUM_RE = /^(?:[A-Za-z]+\d*\/\d+[A-Za-z*]*|\d+[A-Za-z*]*\/\d+|\d+[A-Za-z*]*)$/;
const MAX_ROW_QTY = 999;

/** Rule 4: `<SET> <NUM>`, or null when the printing has no canonical code. */
export function canonicalCode(p: Printing): string | null {
  const num = p.collectorNumber.trim().replace(/\s+/gu, '').replace(/^#/u, '');
  if (!/^[A-Za-z]{3}$/u.test(p.setCode) || !NUM_RE.test(num)) return null;
  if (collectorKey(num).form === 'code') return null;
  return `${p.setCode.toUpperCase()} ${num}`;
}

/** Rule 1: RFC 4180 quoting of one cell. */
export function csvCell(s: string): string {
  return /[",\r\n]/u.test(s) ? `"${s.replace(/"/gu, '""')}"` : s;
}

/** Rule 8: one quantity split into rows of at most 999. */
export function splitQuantity(qty: number): number[] {
  const out: number[] = [];
  for (let left = qty; left > 0; left -= MAX_ROW_QTY) out.push(Math.min(left, MAX_ROW_QTY));
  return out;
}

function codeKey(p: Printing): string {
  const c = collectorKey(p.collectorNumber);
  return `${p.setCode.toUpperCase()}|${c.key}|${c.suffix ?? ''}`;
}

export function exportCollectionCsv(input: DeckOwnershipInput): CsvExport {
  const catalog = input.catalog;
  const ranks = printingRanks(catalog.sets, catalog.printings);
  const rankOf = (id: string) => ranks.get(id) ?? Number.MAX_SAFE_INTEGER;

  // Printings sharing set + collector key + suffix, in printingSortKey order (CARD-036 ambiguity).
  const byCode = new Map<string, Printing[]>();
  for (const p of Object.values(catalog.printings)) {
    const k = codeKey(p);
    const list = byCode.get(k);
    if (list) list.push(p);
    else byCode.set(k, [p]);
  }
  for (const list of byCode.values())
    list.sort((a, b) => rankOf(a.printingId) - rankOf(b.printingId));

  /** Rule 6 check of a printing row; `name` empty = code-only retry (IMP-066). */
  const printingRowOk = (
    cardKey: CardKey,
    name: string,
    code: string,
    p: Printing,
    qty: number,
  ): boolean => {
    const cell = name ? `${name} ${code}` : code;
    const r = parseCardText(`${qty} ${cell}`);
    const e = r.entries[0];
    if (r.issues.length > 0 || r.entries.length !== 1 || e.quantity !== qty || !e.printing)
      return false;
    const want = collectorKey(p.collectorNumber);
    const got = collectorKey(e.printing.collectorNumber);
    if (
      e.printing.setCode !== p.setCode.toUpperCase() ||
      got.key !== want.key ||
      got.suffix !== want.suffix
    ) {
      return false;
    }
    const candidates = byCode.get(codeKey(p)) ?? [];
    if (name) {
      if (nameKey(e.name) !== cardKey) return false;
      const whole = nameKey(cell);
      if (whole !== cardKey && catalog.cards[whole]) return false; // exact-name guard (IMP-067)
      return candidates.find((c) => c.cardKey === cardKey)?.printingId === p.printingId;
    }
    return e.name === '' && candidates[0]?.printingId === p.printingId;
  };

  const nameRowOk = (cardKey: CardKey, name: string, qty: number): boolean => {
    const r = parseCardText(`${qty} ${name}`);
    const e = r.entries[0];
    return (
      r.issues.length === 0 &&
      r.entries.length === 1 &&
      e.quantity === qty &&
      e.printing === null &&
      nameKey(e.name) === cardKey
    );
  };

  interface Row {
    rank: number;
    tie: number;
    cardKey: string;
    printingId: string;
    cell: string;
    qty: number;
  }
  const rows: Row[] = [];
  let leftOut = 0;
  let withoutPrinting = 0;
  let copies = 0;
  let cards = 0;
  const mayNotImport: string[] = [];

  for (const cardKey of Object.keys(input.collection.cards)) {
    const card = catalog.cards[cardKey];
    if (!card) {
      leftOut++; // rule 10
      continue;
    }
    const o = deckOwnership(input, cardKey);
    if (o.owned === 0) continue;
    cards++;
    copies += o.owned;
    let nameOnly = 0;
    for (const e of o.entries) {
      const p = e.kind === 'printing' && e.printingId ? catalog.printings[e.printingId] : undefined;
      if (!p) {
        nameOnly += e.count;
        if (e.kind === 'missing-printing') withoutPrinting += e.count;
        continue;
      }
      const code = canonicalCode(p);
      const qty = Math.min(e.count, MAX_ROW_QTY);
      let cell: string | null = null;
      if (code && printingRowOk(cardKey, card.name, code, p, qty)) cell = `${card.name} ${code}`;
      else if (code && printingRowOk(cardKey, '', code, p, qty)) cell = code;
      if (cell === null) {
        nameOnly += e.count;
        withoutPrinting += e.count;
        continue;
      }
      rows.push({
        rank: rankOf(p.printingId),
        tie: 0,
        cardKey,
        printingId: p.printingId,
        cell,
        qty: e.count,
      });
    }
    if (nameOnly > 0) {
      if (!nameRowOk(cardKey, card.name, Math.min(nameOnly, MAX_ROW_QTY)))
        mayNotImport.push(card.name);
      // Rule 9: at the unassigned entry's position (COLL-012).
      rows.push({
        rank: rankOf(card.defaultPrintingId),
        tie: 1,
        cardKey,
        printingId: '',
        cell: card.name,
        qty: nameOnly,
      });
    }
  }

  rows.sort(
    (a, b) =>
      a.rank - b.rank ||
      a.tie - b.tie ||
      (a.cardKey < b.cardKey ? -1 : a.cardKey > b.cardKey ? 1 : 0) ||
      (a.printingId < b.printingId ? -1 : a.printingId > b.printingId ? 1 : 0),
  );
  const lines = ['Quantity,Card Name'];
  for (const r of rows) for (const q of splitQuantity(r.qty)) lines.push(`${q},${csvCell(r.cell)}`);

  const notices: string[] = [];
  if (withoutPrinting > 0) {
    notices.push(
      `${withoutPrinting.toLocaleString('en-US')} ${withoutPrinting === 1 ? 'copy was saved without its printing' : 'copies were saved without their printing'}.`,
    );
  }
  if (leftOut > 0) {
    notices.push(
      `${leftOut.toLocaleString('en-US')} ${leftOut === 1 ? 'card' : 'cards'} not in the card data ${leftOut === 1 ? 'was' : 'were'} left out.`,
    );
  }
  for (const name of mayNotImport) notices.push(`${name} may not import back as written.`);

  return { csv: `${lines.join('\r\n')}\r\n`, copies, cards, notices };
}
