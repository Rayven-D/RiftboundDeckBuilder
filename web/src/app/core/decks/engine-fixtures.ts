/**
 * Test builders for the deck ownership engine (used by the *.spec.ts files only). Card names
 * follow the spec acceptance criteria; ids and printings are invented.
 */
import { nameKey } from '../cards/name-key';
import type {
  CardCategory,
  CollectionCatalogView,
  DeckCard,
  NameLock,
  DeckOwnershipInput,
  DeckZone,
  PlayableCard,
  Printing,
  StoredCollection,
  Tag,
  TagTarget,
  UserDeck,
} from './types';

export interface CardSpec {
  name: string;
  category?: CardCategory;
  /** Extra printing ids after the default one (`p-<key>`). */
  extraPrintings?: string[];
}

export function printingIdOf(name: string): string {
  return `p-${nameKey(name).replace(/ /g, '-')}`;
}

export function makeCard(spec: CardSpec): { card: PlayableCard; printings: Printing[] } {
  const cardKey = nameKey(spec.name);
  const ids = [printingIdOf(spec.name), ...(spec.extraPrintings ?? [])];
  const printings = ids.map((printingId, i): Printing => ({
    printingId,
    cardKey,
    setCode: 'OGN',
    collectorNumber: String(i + 1).padStart(3, '0'),
    publicCode: `OGN-${String(i + 1).padStart(3, '0')}`,
    rarity: null,
    variant: { kind: 'unknown', label: i === 0 ? null : 'Foil', evidence: null },
    art: { thumbnailUrl: `https://example.test/${printingId}.png`, fullUrl: null, artist: null },
  }));
  const card: PlayableCard = {
    cardKey,
    name: spec.name,
    type: spec.category === 'rune' ? 'Rune' : 'Spell',
    category: spec.category ?? 'spell',
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
  return { card, printings };
}

export function makeCatalog(specs: (CardSpec | string)[]): CollectionCatalogView {
  const catalog: CollectionCatalogView = {
    catalogVersion: '0.3+test',
    sets: [],
    cards: {},
    printings: {},
  };
  for (const s of specs) {
    const { card, printings } = makeCard(typeof s === 'string' ? { name: s } : s);
    catalog.cards[card.cardKey] = card;
    for (const p of printings) catalog.printings[p.printingId] = p;
  }
  return catalog;
}

export interface OwnedSpec {
  /** Unassigned copies by card name. */
  owned?: Record<string, number>;
  /** Copies per printing id, keyed by card name. */
  byPrinting?: Record<string, Record<string, number>>;
  tags?: Tag[];
  assignments?: Record<TagTarget, string[]>;
}

export function makeCollection(spec: OwnedSpec): StoredCollection {
  const cards: StoredCollection['cards'] = {};
  for (const [name, n] of Object.entries(spec.owned ?? {})) {
    cards[nameKey(name)] = { quantity: n, byPrinting: {} };
  }
  for (const [name, by] of Object.entries(spec.byPrinting ?? {})) {
    const key = nameKey(name);
    const rec = cards[key] ?? { quantity: 0, byPrinting: {} };
    for (const [id, n] of Object.entries(by)) {
      rec.byPrinting[id] = n;
      rec.quantity += n;
    }
    cards[key] = rec;
  }
  return { schemaVersion: 1, updatedAt: '2026-11-23T00:00:00Z', catalogVersion: '0.3+test', cards };
}

export function makeInput(
  catalog: CollectionCatalogView,
  spec: OwnedSpec = {},
): DeckOwnershipInput {
  return {
    collection: makeCollection(spec),
    tags: {
      schemaVersion: 3,
      updatedAt: '2026-11-23T00:00:00Z',
      tags: spec.tags ?? [],
      assignments: spec.assignments ?? {},
    },
    printingCodes: { schemaVersion: 1, updatedAt: '2026-11-23T00:00:00Z', codes: {} },
    catalog,
  };
}

export function makeTag(id: string, label: string, excludeFromDecks: boolean): Tag {
  return {
    id,
    label,
    key: label.toLowerCase(),
    colour: null,
    excludeFromDecks,
    createdAt: '2026-11-23T00:00:00Z',
  };
}

export type ZoneSpec = Partial<Record<DeckZone, [string, number][]>>;

function entry([name, qty]: [string, number]): DeckCard {
  return { cardKey: nameKey(name), name, qty };
}

/** Decks made by `makeDeck`, by id (latest wins), so `lock(id)` can lock every name of one (test seam). */
const made = new Map<string, UserDeck>();
/** Lets a test register a deck it built another way (e.g. a page fixture), for `lock(id)`. */
export function registerDeck(deck: UserDeck): UserDeck {
  made.set(deck.id, deck);
  return deck;
}

export function makeDeck(id: string, name: string, zones: ZoneSpec): UserDeck {
  return registerDeck(buildDeck(id, name, zones));
}

function buildDeck(id: string, name: string, zones: ZoneSpec): UserDeck {
  return {
    schemaVersion: 1,
    id,
    name,
    format: 'standard',
    source: { kind: 'user', text: null, url: null },
    sourceFormat: 'riot-text',
    notes: '',
    createdAt: '2026-11-20T10:00:00Z',
    updatedAt: '2026-11-22T10:00:00Z',
    catalogVersion: '0.3+test',
    legend: zones.legend?.[0] ? entry(zones.legend[0]) : null,
    champion: zones.champion?.[0] ? entry(zones.champion[0]) : null,
    main: (zones.main ?? []).map(entry),
    sideboard: (zones.sideboard ?? []).map(entry),
    runes: (zones.runes ?? []).map(entry),
    battlefields: (zones.battlefields ?? []).map(entry),
  };
}

/**
 * SPEC-008 v0.6 test helper: the deck toggle's locks (a name lock on every counted name, SHARE-084) for a deck, or for
 * the latest `makeDeck` / `registerDeck` with that id.
 */
export function lock(deck: UserDeck | string, lockedAt = '2026-11-23T10:00:00Z'): NameLock[] {
  const d = typeof deck === 'string' ? made.get(deck) : deck;
  if (!d) throw new Error(`lock(): no deck ${deck as string} was made`);
  return lockAll(d, lockedAt);
}

/** One name lock (SPEC-008 v0.6). */
export function nameLock(deckId: string, cardKey: string, lockedAt = '2026-11-23T10:00:00Z'): NameLock {
  return { deckId, cardKey, lockedAt };
}

/** The deck toggle (SHARE-084): a name lock on every counted name of `deck`, one `lockedAt`. */
export function lockAll(deck: UserDeck, lockedAt = '2026-11-23T10:00:00Z'): NameLock[] {
  const all = [deck.legend, deck.champion, ...deck.main, ...deck.battlefields, ...deck.runes, ...deck.sideboard];
  const keys = [...new Set(all.filter((c) => c !== null).map((c) => c!.cardKey))];
  return keys.map((cardKey) => ({ deckId: deck.id, cardKey, lockedAt }));
}
