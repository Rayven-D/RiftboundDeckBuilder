/**
 * SPEC-001 CARD-037 `collectorKey` and CARD-070 `printingSortKey` order, ported from
 * `services/src/domain/collector.ts` and `printing-sort.ts` (`web/` can't import from `services/`;
 * keep the two in step). Pure: no Angular, no storage.
 */
import type { CardSet, Printing, PrintingId } from '../../core/decks/types';

export type CollectorForm = 'block' | 'fraction' | 'plain' | 'code';

export interface CollectorInfo {
  key: string;
  block: string | null;
  number: number | null;
  suffix: string | null;
  form: CollectorForm;
}

const BLOCK_FORM = /^([A-Z]+[0-9]*)\/([0-9]+)([A-Z*]*)$/u; // SP1/005
const FRACTION_FORM = /^([0-9]+)([A-Z*]*)\/([0-9]+)$/u; // 005/298
const PLAIN_FORM = /^([0-9]+)([A-Z*]*)$/u; // 007a, 7

/** CARD-037: collector-number normalization (same steps as the services ingest). */
export function collectorKey(raw: string): CollectorInfo {
  let s = raw.normalize('NFKC').trim();
  if (s.startsWith('#')) s = s.slice(1);
  s = s.toUpperCase();
  let m = BLOCK_FORM.exec(s);
  if (m) {
    const block = m[1];
    const number = Number.parseInt(m[2], 10);
    return { key: `${block}/${number}`, block, number, suffix: m[3] || null, form: 'block' };
  }
  m = FRACTION_FORM.exec(s);
  if (m) {
    const number = Number.parseInt(m[1], 10);
    return { key: String(number), block: null, number, suffix: m[2] || null, form: 'fraction' };
  }
  m = PLAIN_FORM.exec(s);
  if (m) {
    const number = Number.parseInt(m[1], 10);
    return { key: String(number), block: null, number, suffix: m[2] || null, form: 'plain' };
  }
  return { key: `#${s}`, block: null, number: null, suffix: null, form: 'code' };
}

const cmp = (a: string | number, b: string | number): number => (a === b ? 0 : a < b ? -1 : 1);

function group(p: Printing, c: CollectorInfo): number {
  if (c.form === 'block') return 2;
  if (c.form === 'code') return 3;
  return p.variant.kind === 'overnumbered' ? 1 : 0;
}

function splitBlock(block: string): { letters: string; digits: number } {
  const m = /^([A-Z]+)([0-9]*)$/u.exec(block);
  return m
    ? { letters: m[1], digits: m[2] ? Number.parseInt(m[2], 10) : -1 }
    : { letters: block, digits: -1 };
}

/**
 * CARD-070 comparator: set order (unknown sets last, by code), group, block, number (group 3: key by
 * code point), suffix (none first), then `printingId`.
 */
export function makePrintingComparator(
  sets: readonly CardSet[],
): (a: Printing, b: Printing) => number {
  const order = new Map(sets.map((s) => [s.code, s.setOrder]));
  const info = new Map<Printing, CollectorInfo>();
  const ci = (p: Printing) => {
    let c = info.get(p);
    if (!c) info.set(p, (c = collectorKey(p.collectorNumber)));
    return c;
  };
  return (a, b) => {
    const ca = ci(a);
    const cb = ci(b);
    let c = cmp(
      order.get(a.setCode) ?? Number.MAX_SAFE_INTEGER,
      order.get(b.setCode) ?? Number.MAX_SAFE_INTEGER,
    );
    if (c) return c;
    if ((c = cmp(a.setCode, b.setCode))) return c;
    const ga = group(a, ca);
    if ((c = cmp(ga, group(b, cb)))) return c;
    if (ga === 2) {
      const ba = splitBlock(ca.block ?? '');
      const bb = splitBlock(cb.block ?? '');
      if ((c = cmp(ba.letters, bb.letters)) || (c = cmp(ba.digits, bb.digits))) return c;
    }
    c = ga === 3 ? cmp(ca.key, cb.key) : cmp(ca.number ?? 0, cb.number ?? 0);
    if (c) return c;
    if (ca.suffix !== cb.suffix) {
      if (ca.suffix === null) return -1;
      if (cb.suffix === null) return 1;
      if ((c = cmp(ca.suffix, cb.suffix))) return c;
    }
    return cmp(a.printingId, b.printingId);
  };
}

/** Rank of every catalog printing in `printingSortKey` order (0 = first). */
export function printingRanks(
  sets: readonly CardSet[],
  printings: Readonly<Record<PrintingId, Printing>>,
): Map<PrintingId, number> {
  const sorted = Object.values(printings).sort(makePrintingComparator(sets));
  return new Map(sorted.map((p, i) => [p.printingId, i]));
}
