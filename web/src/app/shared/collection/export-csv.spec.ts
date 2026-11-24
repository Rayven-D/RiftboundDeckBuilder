import type { CollectionCatalogView, Printing, PlayableCard, VariantKind } from '../../core/decks';
import { nameKey } from '../../core/cards/name-key';
import { deckOwnership } from '../../core/decks';
import { parseCardText, readImportFile } from '../import/parse-card-list';
import { canonicalCode, csvCell, exportCollectionCsv, splitQuantity } from './export-csv';

type P = [id: string, set: string, num: string, kind?: VariantKind];

function catalog(cards: Record<string, P[]>, sets = ['OGN', 'RAD']): CollectionCatalogView {
  const out: CollectionCatalogView = {
    catalogVersion: 't',
    sets: sets.map((code, setOrder) => ({
      code,
      name: code,
      setOrder,
      releaseStatus: null,
      printingCount: 0,
    })),
    cards: {},
    printings: {},
  };
  for (const [name, ps] of Object.entries(cards)) {
    const cardKey = nameKey(name);
    for (const [id, set, num, kind] of ps) {
      out.printings[id] = {
        printingId: id,
        cardKey,
        setCode: set,
        collectorNumber: num,
        publicCode: `${set}-${num}`,
        rarity: null,
        variant: { kind: kind ?? 'unknown', label: null, evidence: null },
        art: { thumbnailUrl: null, fullUrl: null, artist: null },
      } satisfies Printing;
    }
    out.cards[cardKey] = {
      cardKey,
      name,
      type: 'Unit',
      category: 'unit',
      domains: null,
      isChampionUnit: null,
      championTag: null,
      isSignature: null,
      isPreview: null,
      stats: { energy: null, might: null, cost: null, power: null },
      keywords: [],
      tags: [],
      text: '',
      flavorText: null,
      printingIds: ps.map((p) => p[0]),
      defaultPrintingId: ps[0][0],
    } satisfies PlayableCard;
  }
  return out;
}

const empty = { schemaVersion: 3 as const, updatedAt: '', tags: [], assignments: {} };

describe('Collection CSV export (SPEC-003 IMP-055, SPEC-007 AC 24)', () => {
  const cat = catalog({
    'Kennen, Heart of the Tempest': [['p_kn_299', 'OGN', '299']],
    'Lightning Rush': [
      ['p_lr_001', 'RAD', '001'],
      ['p_lr_001a', 'RAD', '001a'],
    ],
    Gust: [['p_gust', 'RAD', '050']],
  });
  const input = {
    catalog: cat,
    tags: empty,
    printingCodes: {
      schemaVersion: 1 as const,
      updatedAt: '',
      codes: {
        p_lr_old: { code: 'RAD-002', cardKey: 'lightning rush', lastSeenCatalogVersion: 'old' },
      },
    },
    collection: {
      schemaVersion: 1 as const,
      updatedAt: '',
      catalogVersion: 't',
      cards: {
        'lightning rush': { quantity: 6, byPrinting: { p_lr_001: 2, p_lr_001a: 1, p_lr_old: 1 } },
        'kennen heart of the tempest': { quantity: 1, byPrinting: { p_kn_299: 1 } },
        gust: { quantity: 1200, byPrinting: {} },
      },
    },
  };

  it('IMP-055 SPEC-003 AC 35 (A10): writes exactly the AC rows, in printingSortKey order, quoting and splitting as specified', () => {
    const out = exportCollectionCsv(input);
    expect(out.csv).toBe(
      [
        'Quantity,Card Name',
        '1,"Kennen, Heart of the Tempest OGN 299"',
        '2,Lightning Rush RAD 001',
        '3,Lightning Rush',
        '1,Lightning Rush RAD 001a',
        '999,Gust',
        '201,Gust',
        '',
      ].join('\r\n'),
    );
    expect(out.notices).toEqual(['1 copy was saved without its printing.']);
    expect(out.copies).toBe(1207);
    expect(out.cards).toBe(3);
  });

  it('IMP-055 SPEC-003 AC 35: the file reads back through the importer into the same lines with no issue', async () => {
    const out = exportCollectionCsv(input);
    const file = await readImportFile(new File([out.csv], 'owned.csv', { type: 'text/csv' }));
    expect(file.text.split('\n')).toEqual([
      '1 Kennen, Heart of the Tempest OGN 299',
      '2 Lightning Rush RAD 001',
      '3 Lightning Rush',
      '1 Lightning Rush RAD 001a',
      '999 Gust',
      '201 Gust',
    ]);
    const parsed = parseCardText(file.text, { upload: file.upload });
    expect(parsed.issues).toEqual([]);
    expect(
      parsed.entries.map((e) => [e.quantity, nameKey(e.name), e.printing?.text ?? null]),
    ).toEqual([
      [1, 'kennen heart of the tempest', 'OGN 299'],
      [2, 'lightning rush', 'RAD 001'],
      [3, 'lightning rush', null],
      [1, 'lightning rush', 'RAD 001a'],
      [999, 'gust', null],
      [201, 'gust', null],
    ]);
  });

  it('IMP-055 rule 10: cards not in the card data are left out with a notice', () => {
    const out = exportCollectionCsv({
      ...input,
      collection: {
        ...input.collection,
        cards: { ...input.collection.cards, 'old card': { quantity: 2, byPrinting: {} } },
      },
    });
    expect(out.csv).not.toContain('old card');
    expect(out.notices).toContain('1 card not in the card data was left out.');
  });

  it('IMP-055 rules 4 and 7: printings with no canonical code go to the name-only row and are counted', () => {
    const c = catalog(
      {
        'Promo Thing': [
          ['pr', 'PR', '001'],
          ['ok', 'OGN', '002'],
        ],
      },
      ['OGN', 'PR'],
    );
    const out = exportCollectionCsv({
      catalog: c,
      tags: empty,
      printingCodes: { schemaVersion: 1, updatedAt: '', codes: {} },
      collection: {
        schemaVersion: 1,
        updatedAt: '',
        catalogVersion: 't',
        cards: { 'promo thing': { quantity: 3, byPrinting: { pr: 2, ok: 1 } } },
      },
    });
    expect(out.csv).toBe(
      ['Quantity,Card Name', '1,Promo Thing OGN 002', '2,Promo Thing', ''].join('\r\n'),
    );
    expect(out.notices).toEqual(['2 copies were saved without their printing.']);
  });

  it('IMP-055 rule 6: the exact-name guard falls back to the code-only row', () => {
    // Hypothetical from the spec: card "Ion" printed as ARC 2 next to a card named "Ion Arc 2".
    const c = catalog({ Ion: [['ion', 'ARC', '2']], 'Ion Arc 2': [['other', 'ARC', '9']] }, [
      'ARC',
    ]);
    const out = exportCollectionCsv({
      catalog: c,
      tags: empty,
      printingCodes: { schemaVersion: 1, updatedAt: '', codes: {} },
      collection: {
        schemaVersion: 1,
        updatedAt: '',
        catalogVersion: 't',
        cards: { ion: { quantity: 1, byPrinting: { ion: 1 } } },
      },
    });
    expect(out.csv).toBe(['Quantity,Card Name', '1,ARC 2', ''].join('\r\n'));
    expect(out.notices).toEqual([]);
  });

  it('IMP-055 rules 1, 4 and 8: quoting, canonical codes and the 999 split', () => {
    expect(csvCell('Kennen, Heart')).toBe('"Kennen, Heart"');
    expect(csvCell('Say "hi"')).toBe('"Say ""hi"""');
    expect(csvCell('Gust')).toBe('Gust');
    expect(splitQuantity(1200)).toEqual([999, 201]);
    expect(splitQuantity(1998)).toEqual([999, 999]);
    expect(splitQuantity(3)).toEqual([3]);
    const p = cat.printings['p_lr_001a'];
    expect(canonicalCode(p)).toBe('RAD 001a');
    expect(canonicalCode({ ...p, collectorNumber: ' #SP1/005 ' })).toBe('RAD SP1/005');
    expect(canonicalCode({ ...p, setCode: 'PR' })).toBeNull();
    expect(canonicalCode({ ...p, collectorNumber: 'PROMO' })).toBeNull();
  });
});

describe('SPEC-003 AC 42: runes are exported and re-imported like any card (IMP-055, IMP-071; COLL-089)', () => {
  const cat = catalog({
    'Lightning Rush': [['p_lr_001', 'RAD', '001']],
    'Chaos Rune': [['p_chaos', 'RAD', '060']],
    'Order Rune': [['p_order', 'RAD', '070']],
  });
  for (const k of ['chaos rune', 'order rune'])
    cat.cards[k] = { ...cat.cards[k], type: 'Rune', category: 'rune' };
  // The committed Add of `9 Chaos Rune` + `2 Chaos Rune` and `3 Order Rune` (name-only, IMP-047/049).
  const cards = {
    'lightning rush': { quantity: 2, byPrinting: { p_lr_001: 2 } },
    'chaos rune': { quantity: 11, byPrinting: {} },
    'order rune': { quantity: 3, byPrinting: {} },
  };
  const input = {
    catalog: cat,
    tags: empty,
    printingCodes: { schemaVersion: 1 as const, updatedAt: '', codes: {} },
    collection: { schemaVersion: 1 as const, updatedAt: '', catalogVersion: 't', cards },
  };

  it('IMP-071 committed runes count toward decks: deckOwnership(chaos rune).ownedForDecks = 11', () => {
    expect(deckOwnership(input, 'chaos rune')).toMatchObject({ owned: 11, ownedForDecks: 11 });
    expect(deckOwnership(input, 'order rune')).toMatchObject({ owned: 3, ownedForDecks: 3 });
  });

  it('IMP-055 IMP-071 the export writes 11,Chaos Rune and 3,Order Rune name-only, in rule 9 order', () => {
    const out = exportCollectionCsv(input);
    expect(out.csv).toBe(
      ['Quantity,Card Name', '2,Lightning Rush RAD 001', '11,Chaos Rune', '3,Order Rune', ''].join(
        '\r\n',
      ),
    );
    expect(out.notices).toEqual([]);
    expect([out.copies, out.cards]).toEqual([16, 3]);
  });

  it('IMP-071 re-importing the file (Replace) keeps both rune quantities', async () => {
    const out = exportCollectionCsv(input);
    const file = await readImportFile(new File([out.csv], 'owned.csv', { type: 'text/csv' }));
    const parsed = parseCardText(file.text, { upload: file.upload });
    expect(parsed.issues).toEqual([]);
    // Replace = the collection becomes the parsed quantities, merged by cardKey (IMP-047, IMP-050).
    const replaced = new Map<string, number>();
    for (const e of parsed.entries)
      replaced.set(nameKey(e.name), (replaced.get(nameKey(e.name)) ?? 0) + e.quantity);
    expect(replaced.get('chaos rune')).toBe(11);
    expect(replaced.get('order rune')).toBe(3);
  });
});
