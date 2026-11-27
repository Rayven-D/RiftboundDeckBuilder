/**
 * Made-up Decks data for the /styleguide preview (H-391; [[Decks Components]] §16): deck tiles in every ownership
 * group (ready, partial, none, empty, locked, locked short, ownership unavailable, read-only, no Legend), and one
 * full deck for the card tiles, list rows and the desktop panel (full, partial, none, split, shared + locked,
 * banned, upcoming, preview, unknown card, no image, battlefield; more than 10 missing lines). Everything goes
 * through the real engine (`computeSharedPool`, `computeDeckOwnership`, `summarizeDeck`), so the numbers match
 * the app. Invented names, no Firestore or browser storage.
 */
import {
  type BanListFile,
  type CardCategory,
  type CollectionCatalogView,
  type CollectionOwnership,
  type DeckCard,
  type NameLock,
  type DeckOwnershipInput,
  type DeckOwnershipView,
  type DeckTileSummary,
  type LegalityVerdict,
  type PlayableCard,
  type SharedPool,
  type Printing,
  type StoredCollection,
  type UserDeck,
  computeDeckOwnership,
  computeSharedPool,
  summarizeDeck,
} from '../../core/decks';
import { lockEveryName } from '../../shared/collection/sample-data';
import { sampleCardArt } from '../../shared/deck/sample-art';

const TODAY = '2026-11-25';
const STANDARD = { id: 'standard', name: 'Standard' } as const;

interface Spec {
  name: string;
  category: CardCategory;
  /** null = no image (the placeholder). */
  color: string | null;
  preview?: boolean;
}

const SPECS: Spec[] = [
  { name: 'Tempest Warden', category: 'legend', color: '#4a6fb5' },
  { name: 'Ember Queen', category: 'legend', color: '#b8563a' },
  { name: 'Grave Marshal', category: 'legend', color: '#6c4fa3' },
  { name: 'Storm Herald', category: 'champion', color: '#2f8f6b' },
  { name: 'Hextech Ray', category: 'spell', color: '#4a6fb5' },
  { name: 'Rally Banner', category: 'gear', color: '#b8563a' },
  { name: 'Storm Caller', category: 'unit', color: '#2f8f6b' },
  { name: 'Void Gate', category: 'spell', color: '#6c4fa3' },
  { name: 'Iron Warden', category: 'unit', color: '#8a6d2f' },
  { name: 'Ember Spark', category: 'spell', color: '#c0392b' },
  { name: 'Mist Walker', category: 'unit', color: '#5d7f99', preview: true },
  { name: 'Glass Lantern', category: 'gear', color: null },
  { name: 'Thorn Sentry', category: 'unit', color: '#3f7f3f' },
  { name: 'River Guide', category: 'unit', color: '#2b7a99' },
  { name: 'Ash Hound', category: 'unit', color: '#7a4a2b' },
  { name: 'Quiet Blade', category: 'spell', color: '#55606e' },
  { name: 'Sunken Market', category: 'battlefield', color: '#7d6a3a' },
  { name: 'Calm Rune', category: 'rune', color: '#6c4fa3' },
  { name: 'Fury Rune', category: 'rune', color: '#b8563a' },
];

const key = (name: string): string => name.toLowerCase();

function catalog(): CollectionCatalogView {
  const cards: Record<string, PlayableCard> = {};
  const printings: Record<string, Printing> = {};
  SPECS.forEach((s, i) => {
    const cardKey = key(s.name);
    const id = `SGD-${String(i + 1).padStart(3, '0')}`;
    const art = s.color ? sampleCardArt(s.color, i) : null;
    printings[id] = {
      printingId: id,
      cardKey,
      setCode: 'SGD',
      collectorNumber: String(i + 1).padStart(3, '0'),
      publicCode: id,
      rarity: null,
      variant: { kind: 'base', label: null, evidence: null },
      art: { thumbnailUrl: art, fullUrl: art, artist: null },
    };
    cards[cardKey] = {
      cardKey,
      name: s.name,
      type: s.category[0].toUpperCase() + s.category.slice(1),
      category: s.category,
      domains: s.category === 'rune' ? null : ['Fury'],
      isChampionUnit: null,
      championTag: null,
      isSignature: null,
      isPreview: s.preview ?? null,
      stats: { energy: 2, might: s.category === 'unit' ? 3 : null, cost: null, power: null },
      keywords: [],
      tags: [],
      text: 'Sample rules text for the preview.',
      flavorText: null,
      printingIds: [id],
      defaultPrintingId: id,
    };
  });
  return { catalogVersion: 'styleguide', sets: [], cards, printings };
}

const BANS: BanListFile = {
  schemaVersion: 1,
  dataVersion: 'styleguide',
  lastVerified: TODAY,
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
          add: [{ name: 'Ember Spark', kind: 'card' }],
          remove: [],
        },
      ],
    },
  ],
};

const OWNED: Record<string, number> = {
  'Tempest Warden': 1,
  'Ember Queen': 1,
  'Grave Marshal': 1,
  'Hextech Ray': 3,
  'Rally Banner': 2,
  'Storm Caller': 3,
  'Iron Warden': 2,
  'Mist Walker': 1,
  'Thorn Sentry': 2,
  'River Guide': 1,
  'Ash Hound': 2,
  'Sunken Market': 1,
  'Calm Rune': 12,
  'Fury Rune': 3,
};

function collection(): StoredCollection {
  const cards: StoredCollection['cards'] = {};
  for (const [name, n] of Object.entries(OWNED)) cards[key(name)] = { quantity: n, byPrinting: {} };
  return { schemaVersion: 1, updatedAt: '2026-11-24T10:00:00Z', catalogVersion: 'styleguide', cards };
}

type Zones = Partial<Record<'legend' | 'champion' | 'main' | 'battlefields' | 'runes' | 'sideboard', [string, number][]>>;

const dc = ([name, qty]: [string, number]): DeckCard => ({ cardKey: key(name), name, qty });

function deck(n: number, name: string, zones: Zones, extra: Partial<UserDeck> = {}): UserDeck {
  return {
    schemaVersion: 1,
    id: `00000000-0000-4000-8000-5d0000000${String(n).padStart(3, '0')}`,
    name,
    format: 'standard',
    source: { kind: 'user', text: 'Imported from a text list', url: null },
    sourceFormat: 'riot-text',
    notes: '',
    createdAt: '2026-11-20T10:00:00Z',
    updatedAt: '2026-11-22T10:00:00Z',
    catalogVersion: 'styleguide',
    legend: zones.legend?.[0] ? dc(zones.legend[0]) : null,
    champion: zones.champion?.[0] ? dc(zones.champion[0]) : null,
    main: (zones.main ?? []).map(dc),
    sideboard: (zones.sideboard ?? []).map(dc),
    runes: (zones.runes ?? []).map(dc),
    battlefields: (zones.battlefields ?? []).map(dc),
    ...extra,
  };
}

/** The full deck behind the card tiles, list rows and panel: partly available, with bans and a split card. */
const TEMPEST = deck(
  1,
  'Tempest Control',
  {
    legend: [['Tempest Warden', 1]],
    champion: [['Storm Herald', 1]],
    main: [
      ['Hextech Ray', 3],
      ['Rally Banner', 3],
      ['Storm Caller', 3],
      ['Void Gate', 2],
      ['Iron Warden', 2],
      ['Ember Spark', 2],
      ['Mist Walker', 2],
      ['Glass Lantern', 1],
      ['Thorn Sentry', 2],
      ['River Guide', 2],
      ['Ash Hound', 3],
      ['Quiet Blade', 2],
      ['Lost Relic', 1],
    ],
    battlefields: [['Sunken Market', 1]],
    runes: [
      ['Calm Rune', 6],
      ['Fury Rune', 6],
    ],
    sideboard: [
      ['Storm Caller', 1],
      ['Void Gate', 1],
    ],
  },
  {
    source: {
      kind: 'tournament',
      eventId: 'sg-event',
      eventName: 'Regional Championship: Preview',
      eventStartDate: '2026-11-06',
      eventEndDate: '2026-11-08',
      region: 'global',
      decklistId: 'sg-list',
      publishedRank: 1,
      placingLabel: '1st',
      pilot: 'Sample Pilot',
      sourceUrl: 'https://example.test/decklist',
      addedAt: '2026-11-20T10:00:00Z',
    },
  },
);

/** Locked, complete: holds 2 Rally Banner and 2 Thorn Sentry, so Tempest's copies of them are shared + locked. */
const JINX = deck(2, 'Jinx Aggro', {
  legend: [['Ember Queen', 1]],
  main: [
    ['Rally Banner', 1],
    ['Thorn Sentry', 2],
  ],
  runes: [['Fury Rune', 3]],
});
/** Locked, short: needs 3 River Guide, 1 owned. */
const DRAVEN = deck(3, 'Draven Midrange', {
  legend: [['Grave Marshal', 1]],
  main: [
    ['River Guide', 3],
    ['Ash Hound', 2],
  ],
});
const READY = deck(4, 'Ezreal Ramp', {
  legend: [['Tempest Warden', 1]],
  main: [['Hextech Ray', 3]],
  runes: [['Calm Rune', 6]],
});
const NONE = deck(5, 'Void Rush', {
  legend: [['Grave Marshal', 1]],
  main: [
    ['Void Gate', 3],
    ['Quiet Blade', 3],
  ],
});
const NO_LEGEND = deck(6, 'Lantern Combo with a long deck name that wraps onto a second line', {
  main: [
    ['Glass Lantern', 3],
    ['Storm Caller', 2],
  ],
});
const EMPTY = deck(7, 'Empty deck', {});
/** DECK-091: a record newer than this app knows is read-only. */
const READ_ONLY = deck(8, 'Shared from a newer version', { legend: [['Ember Queen', 1]], main: [['Ash Hound', 2]] }, {
  schemaVersion: 2 as 1,
});

const ALL = [TEMPEST, JINX, DRAVEN, READY, NONE, NO_LEGEND, EMPTY, READ_ONLY];
const LOCKS: NameLock[] = [...lockEveryName(JINX, '2026-11-23T10:00:00Z'), ...lockEveryName(DRAVEN, '2026-11-21T10:00:00Z')];

export interface DeckTileSample {
  readonly label: string;
  readonly summary: DeckTileSummary;
}

export interface DeckSamples {
  readonly catalog: CollectionCatalogView;
  readonly tiles: readonly DeckTileSample[];
  /** The full deck: unlocked and as if locked (for the Lock in / Unlock preview). */
  readonly deck: UserDeck;
  readonly view: DeckOwnershipView;
  readonly lockedView: DeckOwnershipView;
  /** Complete and unlocked: Lock in is enabled. */
  readonly readyDeck: UserDeck;
  readonly readyView: DeckOwnershipView;
  /** The pool the ready deck's Lock in check reads (SHARE-020). */
  readonly pool: SharedPool;
  /** The ready deck once locked in (the preview's fake lock store flips to it). */
  readonly readyLockedView: DeckOwnershipView;
  /** Ownership unavailable: the full deck's view with nothing counted. */
  readonly unavailableView: DeckOwnershipView;
}

function ownershipOf(
  input: DeckOwnershipInput,
  decks: UserDeck[],
  locks: NameLock[],
): Extract<CollectionOwnership, { status: 'ok' }> {
  return { status: 'ok', input, shared: computeSharedPool({ decks, locks, ownership: input }) };
}

export function styleguideDecks(): DeckSamples {
  const cat = catalog();
  const input: DeckOwnershipInput = {
    collection: collection(),
    tags: { schemaVersion: 3, updatedAt: '', tags: [], assignments: {} },
    printingCodes: { schemaVersion: 1, updatedAt: '', codes: {} },
    catalog: cat,
  };
  const ok = ownershipOf(input, ALL, LOCKS);
  const view = (d: UserDeck, o: CollectionOwnership = ok) => computeDeckOwnership(d, o, cat, BANS, TODAY);
  const tile = (d: UserDeck, v: DeckOwnershipView, legality: LegalityVerdict['verdict'] | null = null) =>
    summarizeDeck(d, v, legality ? { verdict: legality, asOf: TODAY } : null, legality ? STANDARD : null);

  const unavailable: CollectionOwnership = { status: 'unavailable', locks: LOCKS };
  const tempestView = view(TEMPEST);
  const readyView = view(READY);
  const withLock = (d: UserDeck) => ownershipOf(input, ALL, [...LOCKS, ...lockEveryName(d, '2026-11-24T10:00:00Z')]);

  const tiles: DeckTileSample[] = [
    { label: 'Ready to build, legal', summary: tile(READY, readyView, 'legal') },
    { label: 'Partly available, banned + upcoming, illegal, tournament', summary: tile(TEMPEST, tempestView, 'illegal') },
    { label: 'None available', summary: tile(NONE, view(NONE)) },
    { label: 'Locked (complete)', summary: tile(JINX, view(JINX)) },
    { label: 'Partly locked (a name that no longer fits is unlocked)', summary: tile(DRAVEN, view(DRAVEN)) },
    { label: 'No Legend, long name', summary: tile(NO_LEGEND, view(NO_LEGEND)) },
    { label: 'Empty deck', summary: tile(EMPTY, view(EMPTY)) },
    { label: 'Read-only', summary: tile(READ_ONLY, view(READ_ONLY)) },
    { label: 'Ownership unavailable', summary: tile(NONE, view(NONE, unavailable)) },
    { label: 'Ownership unavailable, locked', summary: tile(DRAVEN, view(DRAVEN, unavailable)) },
  ];

  return {
    catalog: cat,
    tiles,
    deck: TEMPEST,
    view: tempestView,
    // v0.6: a locked deck is never short, so the locked sample is the complete Jinx deck (TEMPEST can't be locked).
    lockedView: view(JINX),
    readyDeck: READY,
    readyView,
    readyLockedView: view(READY, withLock(READY)),
    pool: ok.shared,
    unavailableView: view(TEMPEST, unavailable),
  };
}
