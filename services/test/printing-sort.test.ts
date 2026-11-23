import { describe, expect, it } from 'vitest';
import { collectorKey } from '../src/domain/collector.ts';
import { makePrintingComparator, type SortablePrinting } from '../src/domain/printing-sort.ts';
import type { VariantKind } from '../src/domain/types.ts';

function p(setCode: string, num: string, kind: VariantKind = 'unknown', id = `${setCode}-${num}`): SortablePrinting {
  return { printingId: id, setCode, collector: collectorKey(num), variant: { kind, label: null, evidence: null } };
}
const label = (x: SortablePrinting): string => `${x.setCode} ${x.printingId.split('-').slice(1).join('-')}`;

describe('CARD-070 printingSortKey', () => {
  const cmp = makePrintingComparator(new Map([['OGN', 0], ['SFD', 2]]));

  it('AC20: set order, numeric, suffix, overnumbered, block', () => {
    const input = [p('OGN', '002a'), p('OGN', 'SP1/005'), p('SFD', '001'), p('OGN', '300', 'overnumbered'), p('OGN', '001'), p('OGN', '002'), p('OGN', '250')];
    expect(input.sort(cmp).map(label)).toEqual(['OGN 001', 'OGN 002', 'OGN 002a', 'OGN 250', 'OGN 300', 'OGN SP1/005', 'SFD 001']);
  });

  it('overnumbered (group 1) follows all regular numbers even if lower', () => {
    expect([p('OGN', '300'), p('OGN', '200', 'overnumbered')].sort(cmp).map(label)).toEqual(['OGN 300', 'OGN 200']);
  });

  it('unknown-variant overnumbered stays numeric (group 0)', () => {
    expect([p('OGN', '300/250'), p('OGN', '250/250')].sort(cmp).map(label)).toEqual(['OGN 250/250', 'OGN 300/250']);
  });

  it('blocks compare letters then digits as integers; codes last', () => {
    const input = [p('OGN', 'PROMO'), p('OGN', 'SP10/001'), p('OGN', 'SP2/001'), p('OGN', 'SP1/002')];
    expect(input.sort(cmp).map(label)).toEqual(['OGN SP1/002', 'OGN SP2/001', 'OGN SP10/001', 'OGN PROMO']);
  });

  it('printingId is the final tie-break', () => {
    const input = [p('OGN', '001', 'unknown', 'b'), p('OGN', '001', 'unknown', 'a')];
    expect(input.sort(cmp).map((x) => x.printingId)).toEqual(['a', 'b']);
  });
});
