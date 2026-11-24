/**
 * Made-up Collection data for the /styleguide preview (Collection Components §10): badge, lock band
 * (one deck, long name, several decks), tiles (printing, unassigned, missing, no image), dialogs
 * (several printings, locked + short, no decks, a rune counted like any card, COLL-089). Invented
 * names, not Riot cards.
 */
import type {
  BanListFile,
  CollectionCatalogView,
  DeckCard,
  PlayableCard,
  Printing,
  VariantKind,
} from '../../core/decks';
import { buildCollectionView, CollectionView } from '../../shared/collection/collection-view';
import { sampleDeck } from '../../shared/collection/sample-data';
import { sampleCardArt } from '../../shared/deck/sample-art';

interface Spec {
  name: string;
  color: string | null;
  category?: PlayableCard['category'];
  printings: { num: string; kind?: VariantKind }[];
}

const SPECS: Spec[] = [
  {
    name: 'Storm Caller',
    color: '#2f8f6b',
    printings: [{ num: '007' }, { num: '007a', kind: 'showcase' }],
  },
  { name: 'Iron Warden', color: null, printings: [{ num: '012' }] },
  { name: 'Hextech Ray', color: '#4a6fb5', printings: [{ num: '020' }] },
  { name: 'Lonely Lantern', color: '#8a6d2f', printings: [{ num: '031' }] },
  { name: 'Calm Rune', color: '#6c4fa3', category: 'rune', printings: [{ num: '040' }] },
];

function catalog(): CollectionCatalogView {
  const cards: Record<string, PlayableCard> = {};
  const printings: Record<string, Printing> = {};
  SPECS.forEach((s, i) => {
    const cardKey = s.name.toLowerCase();
    const ids = s.printings.map((p) => `SGP-${p.num}`);
    s.printings.forEach((p, j) => {
      const art = s.color ? sampleCardArt(s.color, i + j) : null;
      printings[ids[j]] = {
        printingId: ids[j],
        cardKey,
        setCode: 'SGP',
        collectorNumber: p.num,
        publicCode: ids[j],
        rarity: null,
        variant: { kind: p.kind ?? 'base', label: null, evidence: null },
        art: { thumbnailUrl: art, fullUrl: art, artist: null },
      };
    });
    cards[cardKey] = {
      cardKey,
      name: s.name,
      type: s.category === 'rune' ? 'Rune' : 'Unit',
      category: s.category ?? 'unit',
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
      printingIds: ids,
      defaultPrintingId: ids[0],
    };
  });
  return {
    catalogVersion: 'styleguide',
    sets: [{ code: 'SGP', name: 'Preview', setOrder: 0, releaseStatus: null, printingCount: 6 }],
    cards,
    printings,
  };
}

const BANS: BanListFile = {
  schemaVersion: 1,
  dataVersion: 'styleguide',
  lastVerified: '2026-11-24',
  lists: [
    {
      format: 'standard',
      region: 'global',
      status: 'verified',
      waves: [
        {
          id: 'w1',
          name: 'Preview wave',
          announced: '2026-11-13',
          effective: '2026-11-23',
          sourceUrl: 'https://example.test',
          add: [{ name: 'Iron Warden', kind: 'card' }],
          remove: [],
        },
        {
          id: 'w2',
          name: 'Preview wave 2',
          announced: '2026-11-20',
          effective: '2026-12-15',
          sourceUrl: 'https://example.test',
          add: [{ name: 'Hextech Ray', kind: 'card' }],
          remove: [],
        },
      ],
    },
  ],
};

const dc = (name: string, qty: number): DeckCard => ({ cardKey: name.toLowerCase(), name, qty });

export function styleguideCollection(): CollectionView {
  const decks = [
    sampleDeck(1, 'Jinx Aggro', [dc('Storm Caller', 2), dc('Iron Warden', 1)]),
    sampleDeck(2, 'Kennen Tempo with a very long locked deck name', [
      dc('Storm Caller', 6),
      dc('Iron Warden', 2),
    ]),
    sampleDeck(
      3,
      'Draven Midrange',
      [dc('Hextech Ray', 3), dc('Storm Caller', 1)],
      [dc('Calm Rune', 9)],
    ),
    sampleDeck(4, 'Ezreal Control', [dc('Hextech Ray', 2)], [dc('Calm Rune', 12)]),
  ];
  return buildCollectionView({
    ownership: {
      catalog: catalog(),
      collection: {
        schemaVersion: 1,
        updatedAt: '',
        catalogVersion: 'styleguide',
        cards: {
          'storm caller': {
            quantity: 7,
            byPrinting: { 'SGP-007': 2, 'SGP-007a': 3, 'SGP-gone': 1 },
          },
          'iron warden': { quantity: 3, byPrinting: { 'SGP-012': 3 } },
          'hextech ray': { quantity: 12, byPrinting: { 'SGP-020': 12 } },
          'lonely lantern': { quantity: 1, byPrinting: { 'SGP-031': 1 } },
          'calm rune': { quantity: 999, byPrinting: { 'SGP-040': 999 } },
        },
      },
      tags: { schemaVersion: 3, updatedAt: '', tags: [], assignments: {} },
      printingCodes: {
        schemaVersion: 1,
        updatedAt: '',
        codes: {
          'SGP-gone': { code: 'SGP-005', cardKey: 'storm caller', lastSeenCatalogVersion: 'old' },
        },
      },
    },
    decks,
    locks: [
      { deckId: decks[0].id, lockedAt: '2026-11-20T10:00:00.000Z' },
      { deckId: decks[1].id, lockedAt: '2026-11-21T10:00:00.000Z' },
      { deckId: decks[3].id, lockedAt: '2026-11-22T10:00:00.000Z' },
    ],
    banData: BANS,
    today: '2026-11-24',
  });
}
