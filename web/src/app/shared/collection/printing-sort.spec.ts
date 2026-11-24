import type { Printing, VariantKind } from '../../core/decks';
import { collectorKey, printingRanks } from './printing-sort';

const p = (
  printingId: string,
  setCode: string,
  collectorNumber: string,
  kind: VariantKind = 'unknown',
): Printing => ({
  printingId,
  cardKey: 'x',
  setCode,
  collectorNumber,
  publicCode: null,
  rarity: null,
  variant: { kind, label: null, evidence: null },
  art: { thumbnailUrl: null, fullUrl: null, artist: null },
});

describe('printingSortKey (SPEC-001 CARD-070, ported for COLL-031)', () => {
  it('CARD-070 SPEC-001 AC 20: 001, 002, 002a, 250, 300 overnumbered, SP1/005, SP1/012, SP2, SP10, then the next set', () => {
    const all = [
      p('sp10', 'OGN', 'SP10/001'),
      p('next', 'SFD', '001'),
      p('300', 'OGN', '300', 'overnumbered'),
      p('sp1-12', 'OGN', 'SP1/012'),
      p('002a', 'OGN', '002a'),
      p('001', 'OGN', '001'),
      p('sp2', 'OGN', 'SP2/001'),
      p('250', 'OGN', '250'),
      p('sp1-5', 'OGN', 'SP1/005'),
      p('002', 'OGN', '002'),
    ];
    const ranks = printingRanks(
      [
        { code: 'OGN', name: 'OGN', setOrder: 0, releaseStatus: null, printingCount: 0 },
        { code: 'SFD', name: 'SFD', setOrder: 1, releaseStatus: null, printingCount: 0 },
      ],
      Object.fromEntries(all.map((x) => [x.printingId, x])),
    );
    expect([...ranks.entries()].sort((a, b) => a[1] - b[1]).map(([id]) => id)).toEqual([
      '001',
      '002',
      '002a',
      '250',
      '300',
      'sp1-5',
      'sp1-12',
      'sp2',
      'sp10',
      'next',
    ]);
  });

  it('CARD-037: collector keys for plain, fraction, block and code forms', () => {
    expect(collectorKey('007a')).toEqual({
      key: '7',
      block: null,
      number: 7,
      suffix: 'A',
      form: 'plain',
    });
    expect(collectorKey('005/298')).toMatchObject({ key: '5', form: 'fraction' });
    expect(collectorKey('SP1/005')).toMatchObject({
      key: 'SP1/5',
      block: 'SP1',
      number: 5,
      form: 'block',
    });
    expect(collectorKey('PROMO')).toMatchObject({ key: '#PROMO', form: 'code' });
  });
});
