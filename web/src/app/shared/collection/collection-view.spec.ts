import type {
  BanListFile,
  CardSet,
  CollectionCatalogView,
  DeckLock,
  PlayableCard,
  Printing,
  StoredCollection,
  UserDeck,
  VariantKind,
} from '../../core/decks';
import { availability } from '../../core/decks';
import {
  banLabel,
  buildCollectionView,
  cardDetail,
  chunkRows,
  columnsFor,
  copiesText,
  countLine,
  gridMove,
  ignoredNotice,
  landscapeFor,
  lockBandText,
  parseUrlQuery,
  queryTiles,
  queryUnresolved,
  rowHeightFor,
  showingLine,
  sortFromStored,
  storedSort,
  tileAccessibleName,
  urlParams,
} from './collection-view';
import { generateLargeSample, sampleDeck } from './sample-data';

// ---------------------------------------------------------------- builders

type P = [id: string, set: string, num: string, kind?: VariantKind, code?: string];

const SETS: CardSet[] = ['OGN', 'OGS', 'SFD', 'UNL', 'VEN', 'RAD'].map((code, setOrder) => ({
  code,
  name: code,
  setOrder,
  releaseStatus: null,
  printingCount: 0,
}));

function catalogOf(
  cards: Record<string, { printings: P[]; category?: PlayableCard['category'] }>,
): CollectionCatalogView {
  const out: CollectionCatalogView = { catalogVersion: 't', sets: SETS, cards: {}, printings: {} };
  for (const [name, spec] of Object.entries(cards)) {
    const cardKey = name.toLowerCase().replace(/[^a-z0-9 ]/g, '');
    for (const [id, set, num, kind, code] of spec.printings) {
      out.printings[id] = {
        printingId: id,
        cardKey,
        setCode: set,
        collectorNumber: num,
        publicCode: code ?? `${set}-${num}`,
        rarity: null,
        variant: { kind: kind ?? 'unknown', label: null, evidence: null },
        art: { thumbnailUrl: `/t/${id}.png`, fullUrl: `/f/${id}.png`, artist: null },
      } satisfies Printing;
    }
    out.cards[cardKey] = {
      cardKey,
      name,
      type: 'Unit',
      category: spec.category ?? 'unit',
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
      printingIds: spec.printings.map((p) => p[0]),
      defaultPrintingId: spec.printings[0][0],
    };
  }
  return out;
}

function collectionOf(
  cards: Record<string, { quantity: number; byPrinting?: Record<string, number> }>,
): StoredCollection {
  const out: StoredCollection = { schemaVersion: 1, updatedAt: '', catalogVersion: 't', cards: {} };
  for (const [k, v] of Object.entries(cards))
    out.cards[k] = { quantity: v.quantity, byPrinting: v.byPrinting ?? {} };
  return out;
}

function view(
  catalog: CollectionCatalogView,
  collection: StoredCollection,
  opts: {
    decks?: UserDeck[] | null;
    locks?: DeckLock[] | null;
    bans?: BanListFile | null;
    codes?: Record<string, string>;
  } = {},
) {
  return buildCollectionView({
    ownership: {
      catalog,
      collection,
      tags: { schemaVersion: 3, updatedAt: '', tags: [], assignments: {} },
      printingCodes: {
        schemaVersion: 1,
        updatedAt: '',
        codes: Object.fromEntries(
          Object.entries(opts.codes ?? {}).map(([id, code]) => [
            id,
            { code, cardKey: '', lastSeenCatalogVersion: '' },
          ]),
        ),
      },
    },
    decks: opts.decks === undefined ? [] : opts.decks,
    locks: opts.locks === undefined ? [] : opts.locks,
    banData: opts.bans === undefined ? null : opts.bans,
    today: '2026-11-24',
  });
}

const deckCards = (cards: [string, number][]) =>
  cards.map(([n, qty]) => ({
    cardKey: n.toLowerCase().replace(/[^a-z0-9 ]/g, ''),
    name: n,
    qty,
  }));
const deck = (i: number, name: string, cards: [string, number][], runes: [string, number][] = []) =>
  sampleDeck(i, name, deckCards(cards), deckCards(runes));
const lockOf = (d: UserDeck, at: string): DeckLock => ({ deckId: d.id, lockedAt: at });

// ---------------------------------------------------------------- entries and order

describe('Collection view: entries and order', () => {
  it('COLL-011 COLL-031 SPEC-007 AC 1: tiles follow printingSortKey across sets, numbers, overnumbered and block forms', () => {
    const cat = catalogOf({
      'Card A': {
        printings: [
          ['a7', 'OGN', '007'],
          ['a7a', 'OGN', '007a'],
        ],
      },
      'Card B': { printings: [['b10', 'OGN', '010']] },
      'Card C': { printings: [['c100', 'OGN', '100']] },
      'Card D': { printings: [['d298', 'OGN', '298', 'overnumbered']] },
      'Card E': { printings: [['e3', 'OGS', '003']] },
      'Card F': { printings: [['f12', 'SFD', '012']] },
      'Card G': { printings: [['gsp', 'RAD', 'SP1/005']] },
    });
    const all = Object.fromEntries(
      Object.values(cat.cards).map((c) => [
        c.cardKey,
        {
          quantity: c.printingIds.length,
          byPrinting: Object.fromEntries(c.printingIds.map((id) => [id, 1])),
        },
      ]),
    );
    const v = view(cat, collectionOf(all));
    expect(v.tiles.map((t) => t.printingId)).toEqual([
      'a7',
      'a7a',
      'b10',
      'c100',
      'd298',
      'e3',
      'f12',
      'gsp',
    ]);
  });

  it('COLL-011 COLL-016 SPEC-007 AC 20 (A1, A2): a foil ×3 and its regular ×1 are exactly two tiles, counted 4 copies of 1 card', () => {
    const cat = catalogOf({
      'Lightning Rush': {
        printings: [
          ['lr', 'OGN', '007'],
          ['lr_foil', 'OGN', '007a'],
        ],
      },
    });
    const v = view(
      cat,
      collectionOf({ 'lightning rush': { quantity: 4, byPrinting: { lr: 1, lr_foil: 3 } } }),
    );
    expect(v.tiles.map((t) => [t.printingId, t.count])).toEqual([
      ['lr', 1],
      ['lr_foil', 3],
    ]);
    expect(countLine(v.totals.copies, v.totals.cards)).toBe('4 copies of 1 card');
  });

  it('COLL-012 SPEC-007 AC 3: unassigned copies sit right after the default printing, as a stand-in tile', () => {
    const cat = catalogOf({
      'Lightning Rush': {
        printings: [
          ['lr', 'OGN', '007'],
          ['lr2', 'RAD', '001'],
        ],
      },
      Gust: { printings: [['g', 'OGN', '008']] },
    });
    const v = view(
      cat,
      collectionOf({
        'lightning rush': { quantity: 4, byPrinting: { lr: 1 } },
        gust: { quantity: 1, byPrinting: { g: 1 } },
      }),
    );
    expect(v.tiles.map((t) => [t.entryId, t.count, t.standIn])).toEqual([
      ['p:lr', 1, false],
      ['u:lightning rush', 3, true],
      ['p:g', 1, false],
    ]);
    expect(v.tiles[1].printingLabel).toBe('Printing not specified');
    expect(v.tiles[1].thumbnailUrl).toBe('/t/lr.png');
  });

  it('COLL-014: a printing no longer in the catalog is its own stand-in tile after the unassigned one, with its remembered code', () => {
    const cat = catalogOf({ 'Lightning Rush': { printings: [['lr', 'OGN', '007']] } });
    const v = view(
      cat,
      collectionOf({ 'lightning rush': { quantity: 4, byPrinting: { lr: 1, gone: 1, gone2: 1 } } }),
      { codes: { gone: 'OGN-005' } },
    );
    expect(v.tiles.map((t) => t.printingLabel)).toEqual([
      'OGN-007',
      'Printing not specified',
      'Printing no longer found: OGN-005',
      'Printing no longer found (id gone2)',
    ]);
    expect(v.tiles[2].standIn).toBe(true);
    expect(v.tiles[2].thumbnailUrl).toBe('/t/lr.png');
  });

  it('COLL-004: the variant label follows the code when the kind is not base or unknown', () => {
    const cat = catalogOf({
      "Kai'Sa, Survivor": {
        printings: [
          ['k', 'OGN', '007', 'base'],
          ['ks', 'OGN', '007a', 'showcase'],
        ],
      },
    });
    const v = view(
      cat,
      collectionOf({ 'kaisa survivor': { quantity: 2, byPrinting: { k: 1, ks: 1 } } }),
    );
    expect(v.tiles.map((t) => t.printingLabel)).toEqual(['OGN-007', 'OGN-007a Showcase']);
  });

  it('COLL-015: records not in the catalog are listed as unresolved in cardKey order and still counted', () => {
    const cat = catalogOf({ Gust: { printings: [['g', 'OGN', '008']] } });
    const v = view(
      cat,
      collectionOf({
        zeta: { quantity: 2 },
        gust: { quantity: 1, byPrinting: { g: 1 } },
        alpha: { quantity: 3 },
      }),
    );
    expect(v.unresolved).toEqual([
      { cardKey: 'alpha', quantity: 3 },
      { cardKey: 'zeta', quantity: 2 },
    ]);
    expect(v.totals).toEqual({ copies: 6, cards: 3 });
    expect(queryUnresolved(v.unresolved, 'alp')).toEqual([{ cardKey: 'alpha', quantity: 3 }]);
  });
});

// ---------------------------------------------------------------- search, sort, count line

describe('Collection view: search, sort and count line', () => {
  const cat = catalogOf({
    "Zhonya's Hourglass": { printings: [['z', 'OGN', '001']] },
    "Kai'Sa, Survivor": {
      printings: [
        ['k', 'OGN', '002'],
        ['k2', 'RAD', '002'],
      ],
    },
    Gust: { printings: [['g', 'SFD', '001']] },
  });
  const v = view(
    cat,
    collectionOf({
      'zhonyas hourglass': { quantity: 3, byPrinting: { z: 3 } },
      'kaisa survivor': { quantity: 4, byPrinting: { k: 1, k2: 3 } },
      gust: { quantity: 3, byPrinting: { g: 3 } },
    }),
  );

  it('COLL-040 SPEC-007 AC 10 (A8): name search uses nameKey tokens in any order', () => {
    expect(queryTiles(v.tiles, 'ZHONYA’S', 'set').map((t) => t.name)).toEqual([
      "Zhonya's Hourglass",
    ]);
    expect(queryTiles(v.tiles, 'kaisa surv', 'set').map((t) => t.printingId)).toEqual(['k', 'k2']);
    expect(queryTiles(v.tiles, 'survivor kai', 'set')).toHaveLength(2);
    expect(queryTiles(v.tiles, '  ', 'set')).toHaveLength(4);
  });

  it('COLL-032 COLL-034 (A8): Name sorts by name with the default order as tie-breaker', () => {
    expect(queryTiles(v.tiles, '', 'name').map((t) => t.printingId)).toEqual(['g', 'k', 'k2', 'z']);
  });

  it('COLL-033 SPEC-007 AC 13 (A8): Copies sorts most first and ties keep printingSortKey order, not reversed', () => {
    expect(queryTiles(v.tiles, '', 'copies').map((t) => t.printingId)).toEqual([
      'z',
      'g',
      'k2',
      'k',
    ]);
  });

  it('COLL-010 (A8): count line and "Showing X of Y"', () => {
    expect(countLine(v.totals.copies, v.totals.cards)).toBe('10 copies of 3 cards');
    expect(countLine(1204, 412)).toBe('1,204 copies of 412 cards');
    expect(countLine(1, 1)).toBe('1 copy of 1 card');
    expect(showingLine(12, 538)).toBe('Showing 12 of 538');
  });

  it('COLL-061 COLL-062 (A8): only q and sort are in the URL; defaults are omitted; unknown sort values are ignored with a notice', () => {
    expect(urlParams('', 'set')).toEqual({ q: null, sort: null });
    expect(urlParams('gust', 'copies')).toEqual({ q: 'gust', sort: 'copies' });
    expect(parseUrlQuery({ q: 'gust', sort: 'name' })).toEqual({
      text: 'gust',
      sort: 'name',
      ignored: 0,
    });
    expect(parseUrlQuery({ sort: 'cost' })).toEqual({ text: '', sort: 'set', ignored: 1 });
    expect(ignoredNotice(1)).toBe('1 filter value not found and was ignored');
    expect(ignoredNotice(0)).toBeNull();
  });

  it('COLL-060: the three sorts round-trip through the stored SPEC-007 query sort', () => {
    for (const s of ['set', 'name', 'copies'] as const)
      expect(sortFromStored(storedSort(s))).toBe(s);
    expect(storedSort('copies')).toEqual({ field: 'quantity', dir: 'desc' });
  });
});

// ---------------------------------------------------------------- locks, dialog, ban

describe('Collection view: locks, dialog and ban (SPEC-008)', () => {
  const cat = catalogOf({
    "Kai'Sa, Survivor": {
      printings: [
        ['k', 'OGN', '007'],
        ['ks', 'OGN', '007a', 'showcase'],
      ],
    },
    Gust: { printings: [['g', 'OGN', '010']] },
    'Calm Rune': { printings: [['r', 'OGN', '050']], category: 'rune' },
    Lonely: { printings: [['l', 'OGN', '060']] },
  });
  const collection = collectionOf({
    'kaisa survivor': { quantity: 6, byPrinting: { k: 2, ks: 3 } },
    gust: { quantity: 3, byPrinting: { g: 3 } },
    'calm rune': { quantity: 4, byPrinting: { r: 4 } },
    lonely: { quantity: 1, byPrinting: { l: 1 } },
  });
  const jinx = deck(1, 'Jinx Aggro', [
    ["Kai'Sa, Survivor", 2],
    ['Gust', 1],
  ]);
  const kennen = deck(2, 'Kennen Tempo', [["Kai'Sa, Survivor", 5]]);
  const draven = deck(3, 'Draven Midrange', [
    ['Gust', 3],
    ["Kai'Sa, Survivor", 1],
  ]);
  const ezreal = deck(4, 'Ezreal Control', [['Gust', 2]]);
  const decks = [jinx, kennen, draven, ezreal];
  const locks = [lockOf(jinx, '2026-11-20T00:00:00Z'), lockOf(kennen, '2026-11-21T00:00:00Z')];
  const v = view(cat, collection, { decks, locks });

  it('SHARE-002 SHARE-033 (A3): the lock band sums holds per card and sits on every printing tile of the card', () => {
    const kaisa = v.cards.get('kaisa survivor')!;
    expect(kaisa.locked.map((u) => [u.deckName, u.hold, u.short])).toEqual([
      ['Jinx Aggro', 2, false],
      ['Kennen Tempo', 4, true],
    ]);
    expect(kaisa.lockedCopies).toBe(6);
    expect(kaisa.tiles.map((t) => t.entryId)).toEqual(['p:k', 'u:kaisa survivor', 'p:ks']);
    expect(
      lockBandText(
        kaisa.lockedCopies,
        kaisa.locked.map((u) => u.deckName),
      ),
    ).toBe('6 of this card locked in 2 decks');
    const gust = v.cards.get('gust')!;
    expect(
      lockBandText(
        gust.lockedCopies,
        gust.locked.map((u) => u.deckName),
      ),
    ).toBe('1 of this card locked in Jinx Aggro');
    expect(v.cards.get('lonely')!.lockedCopies).toBe(0);
  });

  it('COLL-086 (A2): locked copies never change the tile counts', () => {
    expect(v.cards.get('kaisa survivor')!.tiles.map((t) => t.count)).toEqual([2, 1, 3]);
  });

  it('SHARE-061 (S7): with unreadable locks no card shows locked copies', () => {
    const w = view(cat, collection, { decks, locks: null });
    expect(w.locksIgnored).toBe(true);
    expect([...w.cards.values()].every((c) => c.lockedCopies === 0)).toBe(true);
  });

  it('A4: the tile name has name, printing, copies, card-level lock text with every deck and the ban', () => {
    const t = v.tiles.find((x) => x.entryId === 'p:ks')!;
    expect(tileAccessibleName(t, v.cards.get('kaisa survivor'))).toBe(
      "Kai'Sa, Survivor, OGN-007a Showcase, 3 copies, 6 of this card locked in Jinx Aggro and Kennen Tempo, ban status unknown",
    );
    const lonely = v.tiles.find((x) => x.entryId === 'p:l')!;
    const banned = {
      ...v.cards.get('lonely')!,
      ban: { status: 'banned' as const, waveId: 'w', waveName: 'w', bannedSince: '2026-11-23' },
    };
    expect(tileAccessibleName(lonely, banned)).toBe('Lonely, OGN-060, 1 copy, banned');
  });

  it('A5 SHARE-040: the dialog opens on the clicked printing with card-level sections and chips matching availability()', () => {
    const d = cardDetail(v, 'p:ks')!;
    expect(d.printingLine).toBe('OGN-007a Showcase · 3 copies');
    expect(d.ownedHeading).toBe('You own 6 across all printings');
    expect(d.printings.map((p) => [p.text, p.current])).toEqual([
      ['2 × OGN-007', false],
      ['1 × Printing not specified', false],
      ['3 × OGN-007a Showcase', true],
    ]);
    expect(d.printings[0].ariaLabel).toBe('Show OGN-007, 2 copies');
    expect(d.lockedIn).toEqual([
      { deckId: jinx.id, deckName: 'Jinx Aggro', copies: '2 copies', short: false },
      { deckId: kennen.id, deckName: 'Kennen Tempo', copies: '4 copies', short: true },
    ]);
    const av = availability(v.pool, draven.id, 'kaisa survivor');
    expect(d.couldFit).toEqual([
      {
        deckId: draven.id,
        deckName: 'Draven Midrange',
        state: 'none',
        label: `${Math.min(av.available, 1)} of 1 available`,
      },
    ]);
  });

  it('A5 SHARE-040: Could fit in lists fully available decks first, then by name', () => {
    const d = cardDetail(v, 'p:g')!;
    // Gust: 3 owned, Jinx holds 1 → 2 available; Ezreal needs 2 (full), Draven needs 3 (2 of 3).
    expect(d.couldFit.map((r) => [r.deckName, r.label, r.state])).toEqual([
      ['Ezreal Control', '2 of 2 available', 'full'],
      ['Draven Midrange', '2 of 3 available', 'partial'],
    ]);
    expect(d.ownedHeading).toBeNull();
  });

  it('A6: no decks → empty Could fit in and no Locked in, for a rune as for any card (COLL-089)', () => {
    for (const id of ['p:l', 'p:r']) {
      const d = cardDetail(v, id)!;
      expect(d.couldFit).toEqual([]);
      expect(d.lockedIn).toEqual([]);
      expect(d.couldFitEmpty).toBe('None of your decks use this card.');
    }
  });

  it('COLL-089 SPEC-007 AC 25 (engine part): a rune gets Locked in and Could fit in like any card', () => {
    const tempo = deck(5, 'Rune Tempo', [], [['Calm Rune', 3]]);
    const control = deck(6, 'Rune Control', [], [['Calm Rune', 2]]);
    const rv = view(cat, collection, {
      decks: [tempo, control],
      locks: [lockOf(tempo, '2026-11-22T00:00:00Z')],
    });
    const d = cardDetail(rv, 'p:r')!;
    expect(d.lockedIn).toEqual([
      { deckId: tempo.id, deckName: 'Rune Tempo', copies: '3 copies', short: false },
    ]);
    // 4 owned, Rune Tempo holds 3 → 1 available to Rune Control, which needs 2.
    expect(d.couldFit.map((r) => [r.deckName, r.label, r.state])).toEqual([
      ['Rune Control', '1 of 2 available', 'partial'],
    ]);
    expect(rv.cards.get('calm rune')!.lockedCopies).toBe(3);
  });

  it('A6 H-095 fix 7: "None of your decks" without locks, "None of your other decks" when Locked in shows', () => {
    expect(cardDetail(v, 'p:l')!.couldFitEmpty).toBe('None of your decks use this card.');
    const onlyLocked = view(cat, collection, {
      decks: [jinx],
      locks: [lockOf(jinx, '2026-11-20T00:00:00Z')],
    });
    const d = cardDetail(onlyLocked, 'p:k')!;
    expect(d.lockedIn).toHaveLength(1);
    expect(d.couldFit).toEqual([]);
    expect(d.couldFitEmpty).toBe('None of your other decks use this card.');
  });

  it('H-086 review 3: unreadable decks (null) are flagged on the view and in the card detail', () => {
    expect(v.decksUnreadable).toBe(false);
    expect(cardDetail(v, 'p:k')!.decksUnreadable).toBe(false);
    const unreadable = view(cat, collection, { decks: null });
    expect(unreadable.decksUnreadable).toBe(true);
    const d = cardDetail(unreadable, 'p:k')!;
    expect(d.decksUnreadable).toBe(true);
    expect(d.couldFit).toEqual([]);
  });

  it('H-086 review 5: landscapeFor knows battlefields and leaves unknown categories to measuring', () => {
    expect(landscapeFor('battlefield')).toBe(true);
    expect(landscapeFor('unit')).toBe(false);
    expect(landscapeFor('legend')).toBe(false);
    expect(landscapeFor('unknown')).toBeNull();
    expect(landscapeFor(undefined)).toBeNull();
  });

  it('S13: a card that left the collection has no detail', () => {
    expect(cardDetail(v, 'p:missing')).toBeNull();
  });

  it('COLL-008 COLL-009 (S9): ban labels as of today; no ban data reads "Ban status unknown"', () => {
    expect(banLabel(v.cards.get('gust')!.ban)).toEqual({
      variant: 'unknown',
      text: 'Ban status unknown',
    });
    const bans: BanListFile = {
      schemaVersion: 1,
      dataVersion: 't',
      lastVerified: '2026-11-24',
      lists: [
        {
          format: 'standard',
          region: 'global',
          status: 'verified',
          waves: [
            {
              id: 'a',
              name: 'A',
              announced: '2026-11-13',
              effective: '2026-11-23',
              sourceUrl: '',
              add: [{ name: 'Gust', kind: 'card' }],
              remove: [],
            },
            {
              id: 'b',
              name: 'B',
              announced: '2026-11-20',
              effective: '2026-12-15',
              sourceUrl: '',
              add: [{ name: 'Lonely', kind: 'card' }],
              remove: [],
            },
          ],
        },
      ],
    };
    const w = view(cat, collection, { bans });
    expect(w.banUnknown).toBe(false);
    expect(banLabel(w.cards.get('gust')!.ban)).toEqual({
      variant: 'banned',
      text: 'Banned since Nov 23, 2026',
    });
    expect(banLabel(w.cards.get('lonely')!.ban)).toEqual({
      variant: 'upcoming',
      text: 'Banned from Dec 15, 2026',
    });
    expect(banLabel(w.cards.get('kaisa survivor')!.ban)).toBeNull();
  });

  it('COLL-016: copies text', () => {
    expect(copiesText(1)).toBe('1 copy');
    expect(copiesText(4)).toBe('4 copies');
  });
});

// ---------------------------------------------------------------- grid layout and keyboard

describe('Collection grid layout and keyboard', () => {
  it('Components §5: 7 / 6 / 4 / 2 columns at 1440 / 1024 / 768 / 390, 2 down to 18rem and 1 below', () => {
    expect(columnsFor(1152, 144, 16)).toBe(7);
    expect(columnsFor(992, 144, 16)).toBe(6);
    expect(columnsFor(736, 144, 12)).toBe(4);
    expect(columnsFor(358, 144, 12)).toBe(2);
    expect(columnsFor(288, 144, 12)).toBe(2);
    expect(columnsFor(260, 144, 12)).toBe(1);
  });

  it('COLL-066: rows are chunks of the column count with a 63:88 row height plus the gap', () => {
    expect(chunkRows([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(rowHeightFor(1152, 7, 16)).toBe(Math.round(((1152 - 96) / 7) * (88 / 63) + 16));
  });

  it('A12: arrows move by one and by a row, Home/End within the row, Ctrl+Home/End overall, ends clamp', () => {
    expect(gridMove('ArrowRight', false, 0, 10, 4)).toBe(1);
    expect(gridMove('ArrowLeft', false, 0, 10, 4)).toBe(0);
    expect(gridMove('ArrowDown', false, 1, 10, 4)).toBe(5);
    expect(gridMove('ArrowDown', false, 7, 10, 4)).toBe(7);
    expect(gridMove('ArrowUp', false, 5, 10, 4)).toBe(1);
    expect(gridMove('Home', false, 6, 10, 4)).toBe(4);
    expect(gridMove('End', false, 8, 10, 4)).toBe(9);
    expect(gridMove('Home', true, 6, 10, 4)).toBe(0);
    expect(gridMove('End', true, 1, 10, 4)).toBe(9);
    expect(gridMove('a', false, 1, 10, 4)).toBeNull();
  });
});

// ---------------------------------------------------------------- performance

describe('Collection performance (COLL-065, SPEC-007 AC 18, A11)', () => {
  it('COLL-065 COLL-066: 5,000 generated entries with two locked decks build, sort and search without blocking', () => {
    const s = generateLargeSample(5000);
    let t0 = performance.now();
    const v = buildCollectionView({
      ownership: {
        catalog: s.catalog,
        collection: s.collection,
        tags: { schemaVersion: 3, updatedAt: '', tags: [], assignments: {} },
        printingCodes: s.printingCodes,
      },
      decks: s.decks,
      locks: s.locks,
      banData: null,
      today: '2026-11-24',
    });
    const build = performance.now() - t0;
    expect(v.tiles).toHaveLength(5000);
    expect([...v.cards.values()].filter((c) => c.lockedCopies > 0).length).toBeGreaterThan(0);

    // H-430: best of 3 runs, so a load spike from another process doesn't fail a single timing.
    let byName = queryTiles(v.tiles, '', 'name');
    let found = queryTiles(v.tiles, 'ember warden', 'set');
    let sortName = Infinity;
    let search = Infinity;
    for (let i = 0; i < 3; i++) {
      t0 = performance.now();
      byName = queryTiles(v.tiles, '', 'name');
      sortName = Math.min(sortName, performance.now() - t0);
      t0 = performance.now();
      found = queryTiles(v.tiles, 'ember warden', 'set');
      search = Math.min(search, performance.now() - t0);
    }

    expect(byName).toHaveLength(5000);
    expect(found.length).toBeGreaterThan(0);
    // SHOULD 200 ms on RJ's PC (COLL-066); first render within 1 s. These are gross-regression guards
    // with 3× headroom (H-430): a shared, busy test machine is not RJ's PC, so the SHOULD isn't measurable here.
    expect(build).toBeLessThan(3000);
    expect(sortName).toBeLessThan(600);
    expect(search).toBeLessThan(600);
  }, 30_000);
});
