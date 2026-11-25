/**
 * The Decks list model (H-060): SPEC-005 OWN-001…006, OWN-084, OWN-101…105 and SPEC-008 SHARE-050…053, SHARE-061
 * at the list level (one SharedPool for every tile, filters, sort, counts, URL).
 */
import { lock, makeCatalog, makeDeck } from '../../core/decks/engine-fixtures';
import { nameKey } from '../../core/cards/name-key';
import type { DeckLock, UserDeck } from '../../core/decks';
import {
  DECK_SORTS,
  DEFAULT_DECK_QUERY,
  DeckListInput,
  DeckListQuery,
  activeFilters,
  buildDeckList,
  deckCountLine,
  deckQueryParams,
  hiddenLockedCount,
  isFiltered,
  ownershipCounts,
  parseDeckQuery,
  queryDecks,
} from './deck-list';

const CATALOG = makeCatalog([
  { name: 'Kennen, Heart of the Tempest', category: 'legend' },
  'Hextech Ray',
  'Gust',
  { name: 'Chaos Rune', category: 'rune' },
  { name: 'Order Rune', category: 'rune' },
]);

function collection(owned: Record<string, number>): NonNullable<DeckListInput['collection']> {
  const cards: Record<string, { quantity: number; byPrinting: Record<string, number> }> = {};
  for (const [name, n] of Object.entries(owned)) cards[nameKey(name)] = { quantity: n, byPrinting: {} };
  return {
    collection: { schemaVersion: 1, updatedAt: '2026-11-23T00:00:00Z', catalogVersion: '0.3+test', cards },
    tags: { schemaVersion: 3, updatedAt: '', tags: [], assignments: {} },
    printingCodes: { schemaVersion: 1, updatedAt: '', codes: {} },
  };
}

function build(decks: UserDeck[], locks: DeckLock[] | null, owned: Record<string, number> | null, extra: Partial<DeckListInput> = {}) {
  return buildDeckList({
    decks,
    locks,
    collection: owned ? collection(owned) : null,
    catalog: CATALOG,
    banData: null,
    today: '2026-11-25',
    format: { id: 'standard', name: 'Standard' },
    ...extra,
  });
}

const q = (patch: Partial<DeckListQuery> = {}): DeckListQuery => ({ ...DEFAULT_DECK_QUERY, ...patch });
const names = (e: { deck: UserDeck }[]) => e.map((x) => x.deck.name);

function dated(id: string, name: string, createdAt: string, updatedAt: string, zones = { main: [['Gust', 1]] as [string, number][] }): UserDeck {
  return { ...makeDeck(id, name, zones), createdAt, updatedAt };
}

describe('SPEC-005 Decks list order and filters (OWN-005, OWN-006)', () => {
  const decks = [
    dated('c', 'Kai’Sa, Daughter of the Void', '2026-11-21T10:00:00Z', '2026-11-22T10:00:00Z'),
    dated('a', 'Kennen: ASC Evansrhim (1st, Regional Championship: Europe)', '2026-11-20T10:00:00Z', '2026-11-20T10:00:00Z'),
    dated('b', 'Éclair Aggro', '2026-11-23T10:00:00Z', '2026-11-20T10:00:00Z'),
    dated('d', 'deck 10', '2026-11-19T10:00:00Z', '2026-11-20T10:00:00Z'),
    dated('e', 'deck 9', '2026-11-19T10:00:00Z', '2026-11-20T10:00:00Z'),
  ];
  const model = build(decks, [], { Gust: 1 });

  it('SPEC-005 AC 11 / OWN-005 default: updatedAt newest first, ties by createdAt newest, then id', () => {
    expect(queryDecks(model.entries, q()).map((e) => e.deck.id)).toEqual(['c', 'b', 'a', 'd', 'e']);
  });

  it('OWN-006 Name A–Z uses the COLL-034 comparison (base letters, numeric runs); Date added is createdAt newest', () => {
    expect(names(queryDecks(model.entries, q({ sort: 'name' })))).toEqual([
      'deck 9',
      'deck 10',
      'Éclair Aggro',
      'Kai’Sa, Daughter of the Void',
      'Kennen: ASC Evansrhim (1st, Regional Championship: Europe)',
    ]);
    expect(queryDecks(model.entries, q({ sort: 'added' })).map((e) => e.deck.id)).toEqual(['b', 'c', 'a', 'd', 'e']);
  });

  it('OWN-006 search is a case- and accent-insensitive substring of the name', () => {
    expect(names(queryDecks(model.entries, q({ text: 'ECLAIR' })))).toEqual(['Éclair Aggro']);
    expect(names(queryDecks(model.entries, q({ text: 'kai’sa' })))).toEqual(['Kai’Sa, Daughter of the Void']);
    expect(queryDecks(model.entries, q({ text: 'zzz' }))).toEqual([]);
  });

  it('OWN-006 source filter (Imported / From Tournaments) and legality filter by verdict', () => {
    const t: UserDeck = {
      ...decks[1],
      source: {
        kind: 'tournament',
        eventId: 'e1',
        eventName: 'Regional Championship: Europe',
        eventStartDate: '2026-11-06',
        eventEndDate: '2026-11-08',
        region: 'europe',
        decklistId: 'k1',
        publishedRank: 1,
        placingLabel: '1st',
        pilot: 'ASC Evansrhim',
        sourceUrl: 'https://example.test/k1',
        addedAt: '2026-11-20T10:00:00Z',
      },
    };
    const m = build([decks[0], t], [], { Gust: 1 });
    expect(names(queryDecks(m.entries, q({ source: 'tournament' })))).toEqual([t.name]);
    expect(names(queryDecks(m.entries, q({ source: 'user' })))).toEqual([decks[0].name]);
    // No legality engine in web/ yet: every deck is "Not fully checked" (OWN-004).
    expect(queryDecks(m.entries, q({ legality: 'incomplete' }))).toHaveLength(2);
    expect(queryDecks(m.entries, q({ legality: 'legal' }))).toHaveLength(0);
    const legal = build([decks[0]], [], { Gust: 1 }, { legality: () => ({ verdict: 'legal', asOf: '2026-11-25' }) });
    expect(legal.entries[0].summary.legalityLabel).toBe('Legal in Standard as of Nov 25, 2026');
    expect(queryDecks(legal.entries, q({ legality: 'legal' }))).toHaveLength(1);
  });

  it('SPEC-005 AC 32 / OWN-007 / OWN-054 neutrality: only Last updated, Name A–Z, Date added; no sort or filter by %', () => {
    expect(DECK_SORTS.map((s) => s.label)).toEqual(['Last updated', 'Name A–Z', 'Date added']);
    expect(Object.keys(DEFAULT_DECK_QUERY).sort()).toEqual(['legality', 'lock', 'own', 'sort', 'source', 'text']);
  });
});

describe('SPEC-008 ownership groups on the list (SHARE-050, SHARE-051; AC 15)', () => {
  const deck1 = makeDeck('d1', 'Kennen Tempo', { main: [['Hextech Ray', 3]] });
  const runeTest = makeDeck('rt', 'Rune Test', { runes: [['Chaos Rune', 9], ['Order Rune', 3]] });
  const empty = makeDeck('ed', 'Empty Draft', {});
  const rayOnly = makeDeck('ro', 'Ray Only', { main: [['Hextech Ray', 3]] });
  const model = build([deck1, runeTest, empty, rayOnly], [lock('d1', '2026-11-23T10:00:00Z'), lock('ro', '2026-11-23T11:00:00Z')], {
    'Hextech Ray': 3,
  });
  const byName = (n: string) => model.entries.find((e) => e.deck.name === n)!;

  it('SHARE-050 tile lines: "0 of 12 copies available", "No cards to count", "0 of 3 copies locked in"', () => {
    expect(byName('Rune Test').summary.ownershipLine).toBe('0 of 12 copies available');
    expect(byName('Empty Draft').summary.ownershipLine).toBe('No cards to count');
    expect(byName('Ray Only').summary.ownershipLine).toBe('0 of 3 copies locked in');
    expect(byName('Ray Only').summary.lockBadge).toBe('Locked · 1 card short');
    expect(byName('Kennen Tempo').summary.ownershipLine).toBe('3 of 3 copies locked in');
  });

  it('SPEC-008 AC 15 / SHARE-051 own=none lists all three; partial and ready none; none+locked only Ray Only; Deck 1 only with lock=locked', () => {
    expect(names(queryDecks(model.entries, q({ own: 'none', sort: 'name' })))).toEqual(['Empty Draft', 'Ray Only', 'Rune Test']);
    expect(queryDecks(model.entries, q({ own: 'partial' }))).toEqual([]);
    expect(queryDecks(model.entries, q({ own: 'ready' }))).toEqual([]);
    expect(names(queryDecks(model.entries, q({ own: 'none', lock: 'locked' })))).toEqual(['Ray Only']);
    expect(names(queryDecks(model.entries, q({ lock: 'locked', sort: 'name' })))).toEqual(['Kennen Tempo', 'Ray Only']);
    expect(names(queryDecks(model.entries, q({ lock: 'unlocked', sort: 'name' })))).toEqual(['Empty Draft', 'Rune Test']);
  });

  it('OWN-102 / OWN-105 (a) chip counts are the user\'s own deck counts, with the other filters applied', () => {
    expect(ownershipCounts(model.entries, q())).toEqual({ all: 4, ready: 0, partial: 0, none: 3 });
    expect(ownershipCounts(model.entries, q({ lock: 'locked', own: 'ready' }))).toEqual({ all: 2, ready: 0, partial: 0, none: 1 });
  });

  it('OWN-105 (d) / brief choice 7: own=ready hiding a locked complete deck gives the "Locked decks are under Locked." count', () => {
    expect(hiddenLockedCount(model.entries, q({ own: 'ready' }))).toBe(1);
    expect(hiddenLockedCount(model.entries, q())).toBe(0);
    expect(hiddenLockedCount(model.entries, q({ own: 'ready', lock: 'unlocked' }))).toBe(0);
  });

  it('SHARE-071 / OWN-073 every tile comes from the one pool the list built', () => {
    expect(model.pool).not.toBeNull();
    expect(model.pool!.byDeck['ro'].short).toBe(true);
    expect(byName('Ray Only').view.lock).toEqual(model.pool!.byDeck['ro']);
  });
});

describe('SPEC-005 list states (OWN-062, OWN-063, OWN-065; SPEC-008 SHARE-053, SHARE-061)', () => {
  const tempo = makeDeck('d1', 'Kennen Tempo', { main: [['Hextech Ray', 3]] });
  const control = makeDeck('d2', 'Kennen Control', { main: [['Hextech Ray', 3]] });

  it('SPEC-008 AC 19 / SPEC-005 AC 13 collection unreadable: the stored lock is kept; lock=locked lists it; own=* none', () => {
    const m = build([tempo, control], [lock('d1', '2026-11-23T10:00:00Z')], null);
    expect(m.collectionUnreadable).toBe(true);
    expect(m.pool).toBeNull();
    const t = m.entries.find((e) => e.deck.id === 'd1')!;
    expect(t.view.lock).toEqual({ deckId: 'd1', locked: true, lockedAt: '2026-11-23T10:00:00Z', complete: false, short: false, cardsShort: [] });
    expect(t.summary).toMatchObject({ lockBadge: 'Locked', ownershipLine: 'Ownership unavailable', ownershipFilter: 'unavailable' });
    expect(names(queryDecks(m.entries, q({ lock: 'locked' })))).toEqual(['Kennen Tempo']);
    expect(names(queryDecks(m.entries, q({ lock: 'unlocked' })))).toEqual(['Kennen Control']);
    for (const own of ['ready', 'partial', 'none'] as const) expect(queryDecks(m.entries, q({ own }))).toEqual([]);
    expect(queryDecks(m.entries, q())).toHaveLength(2);
    expect(t.summary.completionPercent).toBeNull();
  });

  it('OWN-063 catalog not loaded: ownership unavailable for every deck, the lock still shown, no Legend', () => {
    const m = build([tempo, control], [lock('d1')], { 'Hextech Ray': 3 }, { catalog: null });
    expect(m.catalogMissing).toBe(true);
    expect(m.entries.every((e) => e.summary.ownershipFilter === 'unavailable')).toBe(true);
    expect(m.entries.find((e) => e.deck.id === 'd1')!.summary.lockBadge).toBe('Locked');
  });

  it('SPEC-008 AC 13 / SHARE-061 lock store unreadable: counts ignore locks (Deck 2 3 of 3 available), no badge', () => {
    const m = build([tempo, control], null, { 'Hextech Ray': 3 });
    expect(m.locksUnreadable).toBe(true);
    expect(m.entries.map((e) => e.summary.ownershipLine)).toEqual(['3 of 3 copies available', '3 of 3 copies available']);
    expect(m.entries.every((e) => e.summary.lockBadge === null)).toBe(true);
  });

  it('SPEC-005 AC 16 (OWN-020) copies locked by another deck: this deck reads 0 of 3 copies available', () => {
    const m = build([tempo, control], [lock('d1')], { 'Hextech Ray': 3 });
    expect(m.entries.find((e) => e.deck.id === 'd2')!.summary.ownershipLine).toBe('0 of 3 copies available');
    expect(m.entries.find((e) => e.deck.id === 'd1')!.summary.ownershipLine).toBe('3 of 3 copies locked in');
  });

  it('OWN-015 ban data not loaded: banUnknown, no ban flags on any tile', () => {
    const m = build([tempo], [], { 'Hextech Ray': 3 });
    expect(m.banUnknown).toBe(true);
    expect(m.entries[0].summary.bans).toBeNull();
  });

  it('DECK-091 / OWN-064 a newer-schema deck is listed read-only with ownership', () => {
    const newer = { ...control, schemaVersion: 2 } as unknown as UserDeck;
    const m = build([tempo, newer], [], { 'Hextech Ray': 6 });
    const e = m.entries.find((x) => x.deck.id === 'd2')!;
    expect(e.summary.readOnly).toBe(true);
    expect(e.summary.ownershipLine).toBe('3 of 3 copies available');
  });
});

describe('SPEC-005 OWN-105 URL, count line and chips', () => {
  it('OWN-105 (e) unknown values are ignored and counted: "1 filter value not found and was ignored"', () => {
    expect(parseDeckQuery({ own: 'ready', sort: 'name' })).toEqual({ query: q({ own: 'ready', sort: 'name' }), ignored: 0 });
    expect(parseDeckQuery({ own: 'best', lock: 'locked' })).toEqual({ query: q({ lock: 'locked' }), ignored: 1 });
    expect(parseDeckQuery({ own: 'x', lock: 'y', legality: 'z', source: 'w', sort: 'rank' }).ignored).toBe(5);
    expect(parseDeckQuery({ own: '', q: 'kennen' })).toEqual({ query: q({ text: 'kennen' }), ignored: 0 });
  });

  it('OWN-006 URL reflects sort and filters, defaults omitted (e.g. ?sort=name&legality=legal&own=ready)', () => {
    expect(deckQueryParams(q())).toEqual({ q: null, own: null, lock: null, legality: null, source: null, sort: null });
    expect(deckQueryParams(q({ sort: 'name', legality: 'legal', own: 'ready', text: 'ken' }))).toEqual({
      q: 'ken',
      own: 'ready',
      lock: null,
      legality: 'legal',
      source: null,
      sort: 'name',
    });
  });

  it('OWN-105 (b) count line: "3 decks", "1 deck", "Showing 2 of 3 decks"', () => {
    expect(deckCountLine(3, 3, false)).toBe('3 decks');
    expect(deckCountLine(1, 1, false)).toBe('1 deck');
    expect(deckCountLine(2, 3, true)).toBe('Showing 2 of 3 decks');
    expect(deckCountLine(0, 3, true)).toBe('Showing 0 of 3 decks');
    expect(isFiltered(q())).toBe(false);
    expect(isFiltered(q({ text: ' x ' }))).toBe(true);
  });

  it('OWN-105 (c) active filter chips in toolbar order, with the OWN-006 labels', () => {
    expect(activeFilters(q({ own: 'ready', lock: 'unlocked', legality: 'illegal', source: 'tournament' }), 'Standard')).toEqual([
      { key: 'own', label: 'Ready to build' },
      { key: 'lock', label: 'Not locked' },
      { key: 'legality', label: 'Not legal in Standard today' },
      { key: 'source', label: 'From Tournaments' },
    ]);
  });

  it('OWN-080 / OWN-084 200 decks: one pool and every tile in under 300 ms, all before display', () => {
    const decks = Array.from({ length: 200 }, (_, i) => makeDeck(`d${i}`, `Deck ${i}`, { main: [['Hextech Ray', 3], ['Gust', 3]] }));
    const t0 = performance.now();
    const m = build(decks, [lock('d0')], { 'Hextech Ray': 3, Gust: 3 });
    expect(performance.now() - t0).toBeLessThan(300);
    expect(m.entries).toHaveLength(200);
  });
});
