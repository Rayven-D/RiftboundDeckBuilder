// CARD-070: printingSortKey, the normative default order of printings.
import { compareCodePoint, compareNumber } from './compare.ts';
import type { Printing } from './types.ts';

export type SortablePrinting = Pick<Printing, 'printingId' | 'setCode' | 'collector' | 'variant'>;

/** 0 = numeric, not overnumbered; 1 = numeric overnumbered; 2 = block form; 3 = code form. */
export function printingGroup(p: SortablePrinting): 0 | 1 | 2 | 3 {
  switch (p.collector.form) {
    case 'fraction':
    case 'plain':
      return p.variant.kind === 'overnumbered' ? 1 : 0;
    case 'block':
      return 2;
    case 'code':
      return 3;
  }
}

function splitBlock(block: string): { letters: string; digits: number } {
  const m = /^([A-Z]+)([0-9]*)$/u.exec(block);
  if (!m) return { letters: block, digits: -1 };
  const digits = m[2] ? Number.parseInt(m[2], 10) : -1;
  return { letters: m[1] as string, digits };
}

/**
 * Returns a comparator for printings. `setOrder` maps set code → CardSet.setOrder (CARD-071);
 * unknown set codes sort after known ones, by code.
 */
export function makePrintingComparator(
  setOrder: ReadonlyMap<string, number>,
): (a: SortablePrinting, b: SortablePrinting) => number {
  const orderOf = (code: string): number => setOrder.get(code) ?? Number.MAX_SAFE_INTEGER;
  return (a, b) => {
    // (1) set order
    let c = compareNumber(orderOf(a.setCode), orderOf(b.setCode));
    if (c !== 0) return c;
    c = compareCodePoint(a.setCode, b.setCode);
    if (c !== 0) return c;
    // (2) group
    const ga = printingGroup(a);
    const gb = printingGroup(b);
    c = compareNumber(ga, gb);
    if (c !== 0) return c;
    // (3) block: letters, then digits as integer
    if (ga === 2) {
      const ba = splitBlock(a.collector.block ?? '');
      const bb = splitBlock(b.collector.block ?? '');
      c = compareCodePoint(ba.letters, bb.letters);
      if (c !== 0) return c;
      c = compareNumber(ba.digits, bb.digits);
      if (c !== 0) return c;
    }
    // (4) number ascending (group 3: code by code point)
    if (ga === 3) {
      c = compareCodePoint(a.collector.key, b.collector.key);
    } else {
      c = compareNumber(a.collector.number ?? 0, b.collector.number ?? 0);
    }
    if (c !== 0) return c;
    // (5) suffix: none first, then by code point
    const sa = a.collector.suffix;
    const sb = b.collector.suffix;
    if (sa !== sb) {
      if (sa === null) return -1;
      if (sb === null) return 1;
      c = compareCodePoint(sa, sb);
      if (c !== 0) return c;
    }
    // (6) printingId
    return compareCodePoint(a.printingId, b.printingId);
  };
}
