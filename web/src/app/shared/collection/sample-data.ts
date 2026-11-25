/**
 * Sample data for the Collection page: a generated catalog + collection of any size (performance
 * check, brief AC 18 / A11) and a sample collection over a given catalog (the fixture). Invented
 * data only, for tests and the dev-only sample loader on /styleguide. Pure.
 */
import type {
  CardSet,
  CollectionCatalogView,
  DeckCard,
  DeckLock,
  PlayableCard,
  Printing,
  StoredCollection,
  StoredPrintingCodes,
  UserDeck,
} from '../../core/decks';

export interface SampleData {
  catalog: CollectionCatalogView;
  collection: StoredCollection;
  printingCodes: StoredPrintingCodes;
  decks: UserDeck[];
  locks: DeckLock[];
}

const STAMP = '2026-11-24T00:00:00.000Z';
const ADJ = [
  'Ashen',
  'Bright',
  'Cinder',
  'Dusk',
  'Ember',
  'Frost',
  'Gilded',
  'Hollow',
  'Iron',
  'Jade',
];
const NOUN = [
  'Warden',
  'Recruit',
  'Hauler',
  'Gambit',
  'Current',
  'Squire',
  'Oath',
  'Snare',
  'Charge',
  'Market',
];
/** Placeholder art already in web/public (invented fixture images, not Riot data). */
const ART = [
  'OGN-001',
  'OGN-002',
  'OGN-003',
  'OGN-004',
  'OGN-005',
  'OGS-001',
  'SFD-001',
  'UNL-001',
  'VEN-001',
  'RAD-001',
];

export function sampleDeckId(i: number): string {
  return `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
}

/** The zones besides Main Deck and Runes (SPEC-006 `UserDeck`); empty when not given. */
export type SampleDeckZones = Partial<
  Pick<UserDeck, 'legend' | 'champion' | 'sideboard' | 'battlefields'>
>;

export function sampleDeck(
  i: number,
  name: string,
  main: DeckCard[],
  runes: DeckCard[] = [],
  zones: SampleDeckZones = {},
): UserDeck {
  return {
    schemaVersion: 1,
    id: sampleDeckId(i),
    name,
    format: 'standard',
    source: { kind: 'user', text: null, url: null },
    sourceFormat: 'manual',
    notes: '',
    createdAt: STAMP,
    updatedAt: STAMP,
    catalogVersion: 'sample',
    legend: zones.legend ?? null,
    champion: zones.champion ?? null,
    main,
    sideboard: zones.sideboard ?? [],
    runes,
    battlefields: zones.battlefields ?? [],
  };
}

/** A generated card's role: category, verbatim type (CARD-024 mapping) and placeholder art of the same kind. */
interface CardRole {
  category: PlayableCard['category'];
  type: string;
  isChampionUnit: boolean | null;
  art: readonly string[];
}

const UNIT: CardRole = { category: 'unit', type: 'Unit', isChampionUnit: null, art: ART };
const LEGEND: CardRole = {
  category: 'legend',
  type: 'Legend',
  isChampionUnit: null,
  art: ['OGN-001', 'RAD-001', 'SFD-001'],
};
/** CARD-024: a Champion Unit is a `unit` with `isChampionUnit: true` (deck import's Chosen Champion test). */
const CHAMPION: CardRole = {
  category: 'unit',
  type: 'Unit',
  isChampionUnit: true,
  art: ['OGN-002', 'RAD-002', 'SFD-002'],
};
/** Battlefield art is the landscape placeholder art. */
const BATTLEFIELD: CardRole = {
  category: 'battlefield',
  type: 'Battlefield',
  isChampionUnit: null,
  art: ['OGN-011', 'OGN-012', 'RAD-009', 'RAD-010', 'SFD-009', 'UNL-008', 'VEN-007'],
};
const RUNE: CardRole = {
  category: 'rune',
  type: 'Rune',
  isChampionUnit: null,
  art: ['OGS-001', 'OGS-002', 'OGS-003', 'OGS-004', 'OGS-005', 'OGS-006'],
};

/**
 * TEST-025: the non-unit cards the test decks need, at fixed indices among the first 50 generated cards (all fully
 * owned from 150 entries on). Every other generated card is a unit.
 */
const LEGENDS = [34, 35, 36];
const CHAMPIONS = [37, 38, 39];
const BATTLEFIELDS = [40, 41, 42, 43, 44, 45];
const RUNES = [46, 47, 48, 49];

function roleOf(i: number): CardRole {
  if (LEGENDS.includes(i)) return LEGEND;
  if (CHAMPIONS.includes(i)) return CHAMPION;
  if (BATTLEFIELDS.includes(i)) return BATTLEFIELD;
  if (RUNES.includes(i)) return RUNE;
  return UNIT;
}

function card(cardKey: string, name: string, printingIds: string[], role: CardRole): PlayableCard {
  return {
    cardKey,
    name,
    type: role.type,
    category: role.category,
    domains: null,
    isChampionUnit: role.isChampionUnit,
    championTag: null,
    isSignature: null,
    isPreview: null,
    stats: { energy: null, might: null, cost: null, power: null },
    keywords: [],
    tags: [],
    text: '',
    flavorText: null,
    printingIds,
    defaultPrintingId: printingIds[0],
  };
}

/**
 * A generated catalog of ⌈entries / 3⌉ cards with three printings each (regular, `a` suffix,
 * overnumbered) and a collection owning exactly `entries` of them (one tile each), with three
 * decks: two locked, one unlocked (full shape from 150 entries on, TEST-025: see `DECK_PLANS`).
 */
export function generateLargeSample(entries: number): SampleData {
  const setCodes = ['GNA', 'GNB', 'GNC', 'GND', 'GNE', 'GNF'];
  const sets: CardSet[] = setCodes.map((code, i) => ({
    code,
    name: `Generated ${i + 1}`,
    setOrder: i,
    releaseStatus: null,
    printingCount: 0,
  }));
  const cardCount = Math.ceil(entries / 3);
  const perSet = Math.ceil(cardCount / setCodes.length);
  const cards: Record<string, PlayableCard> = {};
  const printings: Record<string, Printing> = {};
  const collection: StoredCollection = {
    schemaVersion: 1,
    updatedAt: STAMP,
    catalogVersion: 'generated',
    cards: {},
  };
  let owned = 0;
  for (let i = 0; i < cardCount; i++) {
    const set = setCodes[Math.floor(i / perSet)];
    const num = (i % perSet) + 1;
    const name = `${ADJ[i % ADJ.length]} ${NOUN[Math.floor(i / ADJ.length) % NOUN.length]} ${i + 1}`;
    const cardKey = name.toLowerCase();
    const forms: [string, Printing['variant']['kind']][] = [
      [String(num).padStart(3, '0'), 'unknown'],
      [`${String(num).padStart(3, '0')}a`, 'unknown'],
      [String(perSet + num + 100), 'overnumbered'],
    ];
    const ids = forms.map(([n]) => `${set}-${n}`);
    const role = roleOf(i);
    forms.forEach(([n, kind], j) => {
      const art = `/fixture-cards/${role.art[(i + j) % role.art.length]}.svg`;
      printings[ids[j]] = {
        printingId: ids[j],
        cardKey,
        setCode: set,
        collectorNumber: n,
        publicCode: ids[j],
        rarity: null,
        variant: { kind, label: null, evidence: null },
        art: { thumbnailUrl: art, fullUrl: art, artist: null },
      };
    });
    cards[cardKey] = card(cardKey, name, ids, role);
    const byPrinting: Record<string, number> = {};
    let quantity = 0;
    for (const [j, id] of ids.entries()) {
      if (owned >= entries) break;
      const c = ((i + j) % 4) + 1;
      byPrinting[id] = c;
      quantity += c;
      owned++;
    }
    if (quantity > 0) collection.cards[cardKey] = { quantity, byPrinting };
  }
  const decks = generatedDecks(Object.keys(cards), cards);
  return {
    catalog: { catalogVersion: 'generated', sets, cards, printings },
    collection,
    printingCodes: { schemaVersion: 1, updatedAt: STAMP, codes: {} },
    decks,
    locks: [
      { deckId: decks[0].id, lockedAt: '2026-11-20T10:00:00.000Z' },
      { deckId: decks[1].id, lockedAt: '2026-11-21T10:00:00.000Z' },
    ],
  };
}

/** `[card index, copies]` pairs. */
type Plan = [number, number][];
/** Two copies of each card index, the first one three. */
const twos = (indices: number[]): Plan => indices.map((i, k) => [i, k === 0 ? 3 : 2]);
const range = (from: number, to: number) => Array.from({ length: to - from }, (_, k) => from + k);

interface DeckPlan {
  legend: number;
  champion: number;
  main: Plan;
  sideboard: Plan;
  runes: Plan;
  battlefields: number[];
}

/**
 * SPEC-013 TEST-025: the three test decks, all six zones each: Legend 1, Chosen Champion 1, Main Deck 39 copies in
 * 19 entries, Battlefields 3, Runes 12 in 2 entries (6 each), Sideboard 10 in 6 entries: 66 copies in 32 entries
 * (DECK-092: at most 150 entries and 300 copies). Each deck has one card in both Main Deck (×2) and Sideboard (×1).
 *
 * Card `i` owns 6, 9, 8, 7 copies for `i % 4` = 0, 1, 2, 3 (all three printings, from 150 entries on). The two locked
 * decks share units 10…23 but never need more than 5 copies of one card together, so both stay complete (Locked).
 * The open deck needs 3 of unit 12 (2 left after the locks), 6 of rune 46 (Locked A holds 6 of 8) and 6 of rune 48
 * (Locked B holds all 6), so it is partly available. Cards a small catalog doesn't have are left out.
 */
const DECK_PLANS: [number, string, DeckPlan][] = [
  [
    1,
    'Generated Locked A',
    {
      legend: LEGENDS[0],
      champion: CHAMPIONS[0],
      main: twos(range(0, 19)),
      sideboard: [
        [18, 1],
        [19, 2],
        [20, 2],
        [21, 2],
        [22, 2],
        [23, 1],
      ], // 18 is in Main Deck too
      runes: [
        [RUNES[0], 6],
        [RUNES[1], 6],
      ],
      battlefields: BATTLEFIELDS.slice(0, 3),
    },
  ],
  [
    2,
    'Generated Locked B',
    {
      legend: LEGENDS[1],
      champion: CHAMPIONS[1],
      main: twos(range(10, 29)),
      sideboard: [
        [28, 1],
        [29, 2],
        [30, 2],
        [31, 2],
        [32, 2],
        [33, 1],
      ], // 28 is in Main Deck too
      runes: [
        [RUNES[2], 6],
        [RUNES[3], 6],
      ],
      battlefields: BATTLEFIELDS.slice(3, 6),
    },
  ],
  [
    3,
    'Generated Open',
    {
      legend: LEGENDS[2],
      champion: CHAMPIONS[2],
      main: twos([12, ...range(0, 12), ...range(13, 19)]),
      sideboard: [
        [17, 1],
        [24, 2],
        [25, 2],
        [26, 2],
        [27, 2],
        [33, 1],
      ], // 17 is in Main Deck too
      runes: [
        [RUNES[0], 6],
        [RUNES[2], 6],
      ],
      battlefields: [BATTLEFIELDS[0], BATTLEFIELDS[3], BATTLEFIELDS[4]],
    },
  ],
];

function generatedDecks(keys: readonly string[], cards: Record<string, PlayableCard>): UserDeck[] {
  const entry = (i: number, qty: number): DeckCard | null =>
    i < keys.length ? { cardKey: keys[i], name: cards[keys[i]].name, qty } : null;
  const list = (plan: Plan) =>
    plan.map(([i, qty]) => entry(i, qty)).filter((c): c is DeckCard => c !== null);
  return DECK_PLANS.map(([n, name, p]) =>
    sampleDeck(n, name, list(p.main), list(p.runes), {
      legend: entry(p.legend, 1),
      champion: entry(p.champion, 1),
      sideboard: list(p.sideboard),
      battlefields: list(p.battlefields.map((i): [number, number] => [i, 1])),
    }),
  );
}

/**
 * A sample collection over a real catalog (the fixture): most printings owned with varied counts,
 * some unassigned copies, one missing printing, one unresolved card, two locked decks (one short)
 * and one unlocked deck, so every tile and dialog state shows.
 */
export function sampleOverCatalog(catalog: CollectionCatalogView): Omit<SampleData, 'catalog'> {
  const cards: StoredCollection['cards'] = {};
  const counts = [1, 2, 1, 3, 4, 1];
  const keys = Object.keys(catalog.cards).sort();
  keys.forEach((k, i) => {
    if (i % 7 === 6) return; // not owned
    const byPrinting: Record<string, number> = {};
    let quantity = 0;
    catalog.cards[k].printingIds.forEach((id, j) => {
      const c = counts[(i + j) % counts.length];
      byPrinting[id] = c;
      quantity += c;
    });
    if (i % 5 === 0) quantity += 2; // unassigned copies (COLL-012)
    cards[k] = { quantity, byPrinting };
  });
  const codes: StoredPrintingCodes['codes'] = {};
  const missingOwner = keys[1];
  if (missingOwner && cards[missingOwner]) {
    cards[missingOwner].byPrinting['retired-printing'] = 1; // COLL-014
    cards[missingOwner].quantity += 1;
    codes['retired-printing'] = {
      code: 'OGN-099',
      cardKey: missingOwner,
      lastSeenCatalogVersion: 'older',
    };
  }
  cards['retired sample card'] = { quantity: 2, byPrinting: {} }; // COLL-015
  const owned = keys.filter((k) => cards[k]);
  const deckCards = (from: number, n: number, qty: number) =>
    owned
      .slice(from, from + n)
      .map((k): DeckCard => ({ cardKey: k, name: catalog.cards[k].name, qty }));
  const decks = [
    sampleDeck(1, 'Jinx Aggro', deckCards(0, 6, 2)),
    sampleDeck(2, 'Kennen Tempo', deckCards(3, 6, 3)),
    sampleDeck(3, 'Draven Midrange', deckCards(2, 8, 3)),
  ];
  return {
    collection: {
      schemaVersion: 1,
      updatedAt: STAMP,
      catalogVersion: catalog.catalogVersion,
      cards,
    },
    printingCodes: { schemaVersion: 1, updatedAt: STAMP, codes },
    decks,
    locks: [
      { deckId: decks[0].id, lockedAt: '2026-11-20T10:00:00.000Z' },
      { deckId: decks[1].id, lockedAt: '2026-11-21T10:00:00.000Z' },
    ],
  };
}
