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

export function sampleDeck(
  i: number,
  name: string,
  main: DeckCard[],
  runes: DeckCard[] = [],
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
    legend: null,
    champion: null,
    main,
    sideboard: [],
    runes,
    battlefields: [],
  };
}

function card(
  cardKey: string,
  name: string,
  printingIds: string[],
  category: PlayableCard['category'] = 'unit',
): PlayableCard {
  return {
    cardKey,
    name,
    type: category === 'rune' ? 'Rune' : 'Unit',
    category,
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
    printingIds,
    defaultPrintingId: printingIds[0],
  };
}

/**
 * A generated catalog of ⌈entries / 3⌉ cards with three printings each (regular, `a` suffix,
 * overnumbered) and a collection owning exactly `entries` of them (one tile each), with three
 * decks: two locked, one unlocked.
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
    forms.forEach(([n, kind], j) => {
      const art = `/fixture-cards/${ART[(i + j) % ART.length]}.svg`;
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
    cards[cardKey] = card(cardKey, name, ids);
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
  const keys = Object.keys(cards);
  const use = (from: number, qty: number) =>
    keys.slice(from, from + 20).map((k): DeckCard => ({ cardKey: k, name: cards[k].name, qty }));
  const decks = [
    sampleDeck(1, 'Generated Locked A', use(0, 2)),
    sampleDeck(2, 'Generated Locked B', use(10, 3)),
    sampleDeck(3, 'Generated Open', use(5, 3)),
  ];
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
