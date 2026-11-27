import { completionPercent, computeDeckOwnership, summarizeDeck } from './deck-ownership-view';
import { lock, makeCatalog, makeDeck, makeInput, printingIdOf } from './engine-fixtures';
import { computeSharedPool } from './shared-pool';
import type { BanListFile, BanWave, NameLock, TournamentDeckSource, UserDeck } from './types';

// SPEC-005 v0.10.2 (H-311): the completion fields of `view.summary` (OWN-101) and the v0.9 deck
// tile fields of `DeckTileSummary` (OWN-100…104), computed from the same view (OWN-073).
const TODAY = '2026-11-25';
const LEGEND = 'Kennen, Heart of the Tempest';
const NAMES = Array.from({ length: 120 }, (_, i) => `Card ${i}`);
const catalog = makeCatalog([{ name: LEGEND, category: 'legend' }, ...NAMES]);

/** Main-deck entries of `copies` copies in total, 3 per card (the last one takes the rest). */
function mainOf(copies: number): [string, number][] {
  const out: [string, number][] = [];
  for (let i = 0; copies > 0; i++) {
    const q = Math.min(3, copies);
    out.push([NAMES[i], q]);
    copies -= q;
  }
  return out;
}

/** Owned copies covering the first `a` copies of `entries`, in order. */
function ownedFor(entries: [string, number][], a: number): Record<string, number> {
  const owned: Record<string, number> = {};
  for (const [name, q] of entries) {
    if (a <= 0) break;
    owned[name] = Math.min(q, a);
    a -= owned[name];
  }
  return owned;
}

function view(
  deck: UserDeck,
  owned: Record<string, number>,
  opts: { decks?: UserDeck[]; locks?: NameLock[]; ban?: BanListFile | null } = {},
) {
  const input = makeInput(catalog, { owned });
  const shared = computeSharedPool({
    decks: opts.decks ?? [deck],
    locks: opts.locks ?? [],
    ownership: input,
  });
  return computeDeckOwnership(
    deck,
    { status: 'ok', input, shared },
    catalog,
    opts.ban ?? null,
    TODAY,
  );
}

/** A deck of R copies (no Legend) with A of them owned. */
function ratio(a: number, r: number) {
  const main = mainOf(r);
  const deck = makeDeck('d', 'D', { main });
  const v = view(deck, ownedFor(main, a));
  return { deck, v, tile: summarizeDeck(deck, v, null, null) };
}

describe('SPEC-005 OWN-101 completion percentage', () => {
  it('OWN-101 (b) completionPercent: 0 at A = 0, 100 at A = R, floor clamped to 1..99 otherwise', () => {
    expect(completionPercent(34, 66)).toBe(51);
    expect(completionPercent(65, 66)).toBe(98);
    expect(completionPercent(1, 300)).toBe(1);
    expect(completionPercent(299, 300)).toBe(99);
    expect(completionPercent(66, 66)).toBe(100);
    expect(completionPercent(0, 66)).toBe(0);
    expect(completionPercent(20, 40)).toBe(50);
    expect(completionPercent(0, 0)).toBeNull();
  });

  it('OWN-101 (a), (e) view.summary carries completionFill = A / R exact and completionPercent', () => {
    const { v } = ratio(34, 66);
    expect(v.summary).toMatchObject({ copiesAvailable: 34, copiesRequired: 66 });
    expect(v.summary.completionFill).toBe(34 / 66);
    expect(v.summary.completionPercent).toBe(51);
  });

  it('OWN-101 (a) counts copies in every zone, runes and sideboard included, each copy the same', () => {
    const deck = makeDeck('d', 'D', {
      legend: [[LEGEND, 1]],
      main: [['Card 0', 3]],
      runes: [['Card 1', 9]],
      sideboard: [['Card 2', 3]],
    });
    const v = view(deck, { [LEGEND]: 1, 'Card 1': 9 });
    expect(v.summary.copiesRequired).toBe(16);
    expect(v.summary.completionFill).toBe(10 / 16);
    expect(v.summary.completionPercent).toBe(62);
  });

  it('OWN-101 (c) R = 0: both null; ownership unavailable: both null', () => {
    const empty = makeDeck('e', 'Empty', {});
    const ve = view(empty, {});
    expect(ve.summary.completionFill).toBeNull();
    expect(ve.summary.completionPercent).toBeNull();

    const deck = makeDeck('d', 'D', { main: mainOf(66) });
    const vu = computeDeckOwnership(deck, { status: 'unavailable' }, catalog, null, TODAY);
    expect(vu.summary.completionFill).toBeNull();
    expect(vu.summary.completionPercent).toBeNull();
    // OWN-063: catalog not loaded is also "ownership unavailable".
    const input = makeInput(catalog, { owned: {} });
    const shared = computeSharedPool({ decks: [deck], locks: [], ownership: input });
    const vc = computeDeckOwnership(deck, { status: 'ok', input, shared }, null, null, TODAY);
    expect(vc.summary.completionPercent).toBeNull();
  });
});

describe('SPEC-005 OWN-100 / OWN-101 deck tile fill and percentage', () => {
  // KENNEN_1-shaped: Legend ×1 + 65 Main copies = R 66.
  const main = mainOf(65);
  const kennen = makeDeck('k', 'Kennen', { legend: [[LEGEND, 1]], main });

  it('SPEC-005 AC 23 (OWN-100, OWN-101) A = 34 of 66: fill 34/66, "51", partly available, Legend art', () => {
    // The Legend itself is not owned: the deck fill, not the Legend card's state, drives the art.
    const v = view(kennen, ownedFor(main, 34));
    const tile = summarizeDeck(kennen, v, null, null);
    expect(tile.completionFill).toBe(34 / 66);
    expect(tile.completionPercent).toBe(51);
    expect(tile.ownershipLine).toBe('34 of 66 copies available');
    expect(tile.ownershipFilter).toBe('partial');
    expect(tile.legend).toEqual({
      name: LEGEND,
      imageUrl: `https://example.test/${printingIdOf(LEGEND)}.png`,
    });
    expect(v.sections[0].cards[0].state).toBe('none');
  });

  it('SPEC-005 AC 23 (OWN-101) A = 66 of 66: fill 1, 100, ready; empty collection: fill 0, 0, none', () => {
    const full = summarizeDeck(
      kennen,
      view(kennen, { [LEGEND]: 1, ...ownedFor(main, 65) }),
      null,
      null,
    );
    expect(full).toMatchObject({
      completionFill: 1,
      completionPercent: 100,
      ownershipLine: '66 of 66 copies available',
      ownershipFilter: 'ready',
    });
    const none = summarizeDeck(kennen, view(kennen, {}), null, null);
    expect(none).toMatchObject({
      completionFill: 0,
      completionPercent: 0,
      ownershipLine: '0 of 66 copies available',
      ownershipFilter: 'none',
    });
  });

  it('SPEC-005 AC 24 (OWN-101 (b)) edges: 1/300 → 1, 299/300 → 99, 65/66 → 98, A = R → 100', () => {
    expect(ratio(1, 300).tile.completionPercent).toBe(1);
    expect(ratio(299, 300).tile.completionPercent).toBe(99);
    expect(ratio(65, 66).tile.completionPercent).toBe(98);
    expect(ratio(66, 66).tile.completionPercent).toBe(100);
    expect(ratio(0, 66).tile.completionPercent).toBe(0);
    expect(ratio(1, 300).tile.completionFill).toBe(1 / 300);
  });

  it('SPEC-005 AC 24 (OWN-100 (d), (f), OWN-101 (c)) empty deck: no percentage, no fill, "No cards to count", no Legend', () => {
    const empty = makeDeck('e', 'Empty', {});
    const tile = summarizeDeck(empty, view(empty, {}), null, null);
    expect(tile).toMatchObject({
      completionFill: null,
      completionPercent: null,
      ownershipLine: 'No cards to count',
      legend: null,
    });
  });

  it('SPEC-005 AC 24 (OWN-100 (e), OWN-101 (c)) ownership unavailable: no percentage or fill, Legend art kept', () => {
    const v = computeDeckOwnership(kennen, { status: 'unavailable' }, catalog, null, TODAY);
    const tile = summarizeDeck(kennen, v, null, null);
    expect(tile).toMatchObject({
      completionFill: null,
      completionPercent: null,
      ownershipLine: 'Ownership unavailable',
      ownershipFilter: 'unavailable',
    });
    expect(tile.legend?.name).toBe(LEGEND);
  });

  it('SPEC-005 AC 24 (OWN-100 (d)) no Legend and A = 20 of R = 40: legend null, 50', () => {
    const tile = ratio(20, 40).tile;
    expect(tile.legend).toBeNull();
    expect(tile.completionPercent).toBe(50);
    expect(tile.completionFill).toBe(0.5);
  });

  it('OWN-100 (d) unknown Legend card or catalog not loaded: legend null', () => {
    const unknown = makeDeck('u', 'U', { legend: [['Not A Card', 1]], main: [['Card 0', 3]] });
    expect(summarizeDeck(unknown, view(unknown, {}), null, null).legend).toBeNull();
    const input = makeInput(catalog, { owned: {} });
    const shared = computeSharedPool({ decks: [kennen], locks: [], ownership: input });
    const vc = computeDeckOwnership(kennen, { status: 'ok', input, shared }, null, null, TODAY);
    expect(summarizeDeck(kennen, vc, null, null).legend).toBeNull();
  });

  it('OWN-073 / OWN-101 (e) the tile repeats view.summary exactly, so list and detail agree', () => {
    const v = view(kennen, ownedFor(main, 34));
    const tile = summarizeDeck(kennen, v, null, null);
    expect(tile.completionFill).toBe(v.summary.completionFill);
    expect(tile.completionPercent).toBe(v.summary.completionPercent);
  });
});

describe('SPEC-005 AC 25 locked decks and the percentage (OWN-100 (c), OWN-101 (a))', () => {
  const main = mainOf(54); // 18 cards × 3
  const deck = makeDeck('l', 'Locked', { main });
  const all = ownedFor(main, 54);

  it('SPEC-005 AC 25 locked complete deck of 54: 100, "54 of 54 copies locked in", Locked', () => {
    const tile = summarizeDeck(deck, view(deck, all, { locks: lock('l') }), null, null);
    expect(tile).toMatchObject({
      completionFill: 1,
      completionPercent: 100,
      ownershipLine: '54 of 54 copies locked in',
      ownershipFilter: 'locked',
      lockBadge: 'Locked',
    });
  });

  it('SPEC-005 AC 25 / OWN-121 (e) v0.6 4 copies short in 2 cards: those two name locks no longer fit, so the deck is partly locked: fill 50/54, 92, no badge, never "cards short"', () => {
    const fewer = { ...all, 'Card 0': 1, 'Card 1': 1 };
    const v = view(deck, fewer, { locks: lock('l') });
    const tile = summarizeDeck(deck, v, null, null);
    expect(v.lock?.locked).toBe(false);
    expect(tile).toMatchObject({
      completionFill: 50 / 54,
      completionPercent: 92,
      ownershipLine: '50 of 54 copies available',
      lockBadge: null,
    });
  });

  it('SPEC-005 AC 25 an unlocked second deck counts only the copies the locked deck does not hold', () => {
    const other = makeDeck('o', 'Other', { main });
    const owned = { ...all, 'Card 0': 5 }; // 2 copies of Card 0 beyond the locked deck's 3
    const v = view(other, owned, { decks: [deck, other], locks: lock('l') });
    expect(v.summary.copiesAvailable).toBe(2);
    expect(summarizeDeck(other, v, null, null).completionPercent).toBe(3); // floor(200 / 54)
  });

  it('OWN-065 / SHARE-053 (e) locked deck while ownership is unavailable: "Locked", no percentage', () => {
    const v = computeDeckOwnership(
      deck,
      { status: 'unavailable', locks: lock('l') },
      catalog,
      null,
      TODAY,
    );
    expect(summarizeDeck(deck, v, null, null)).toMatchObject({
      lockBadge: 'Locked',
      completionFill: null,
      completionPercent: null,
    });
  });
});

describe('SPEC-005 OWN-103 ban flag counts on the tile', () => {
  const wave = (id: string, announced: string, effective: string, names: string[]): BanWave => ({
    id,
    name: id,
    announced,
    effective,
    sourceUrl: '',
    add: names.map((name) => ({ name, kind: 'card' as const })),
    remove: [],
  });
  const ban: BanListFile = {
    schemaVersion: 1,
    dataVersion: 't',
    lastVerified: TODAY,
    lists: [
      {
        format: 'standard',
        region: 'global',
        status: 'verified',
        waves: [
          wave('w1', '2026-11-13', '2026-11-23', ['Card 0']),
          wave('w3', '2026-11-24', '2027-01-10', ['Card 2']),
          wave('w2', '2026-11-20', '2026-12-15', ['Card 1']),
        ],
      },
    ],
  };

  it('OWN-103 distinct cardKeys: a banned card in Main and Sideboard counts once; earliest upcoming date', () => {
    const deck = makeDeck('d', 'D', {
      main: [
        ['Card 0', 2],
        ['Card 1', 3],
        ['Card 2', 3],
        ['Card 3', 3],
      ],
      sideboard: [['Card 0', 1]],
    });
    const tile = summarizeDeck(deck, view(deck, {}, { ban }), null, null);
    expect(tile.bans).toEqual({ banned: 1, upcoming: 2, upcomingFrom: '2026-12-15' });
  });

  it('OWN-103 nothing banned: zero counts and no date; ban data not loaded: null', () => {
    const deck = makeDeck('d', 'D', { main: [['Card 5', 3]] });
    expect(summarizeDeck(deck, view(deck, {}, { ban }), null, null).bans).toEqual({
      banned: 0,
      upcoming: 0,
      upcomingFrom: null,
    });
    expect(summarizeDeck(deck, view(deck, {}), null, null).bans).toBeNull();
  });
});

describe('SPEC-005 OWN-104 / OWN-002 pilot and read-only', () => {
  const t: TournamentDeckSource = {
    kind: 'tournament',
    eventId: 'e',
    eventName: 'Regional Championship: Europe',
    eventStartDate: '2026-11-06',
    eventEndDate: '2026-11-08',
    region: 'EU',
    decklistId: 'x',
    publishedRank: 1,
    placingLabel: '1st',
    pilot: 'ASC Evansrhim',
    sourceUrl: 'https://example.test/list',
    addedAt: '2026-11-20T00:00:00Z',
  };
  const deck = makeDeck('d', 'D', { main: [['Card 0', 3]] });

  it('OWN-104 a tournament deck carries its pilot verbatim; an imported deck has none', () => {
    const td = { ...deck, source: t };
    expect(summarizeDeck(td, view(td, {}), null, null).pilot).toBe('ASC Evansrhim');
    expect(summarizeDeck(deck, view(deck, {}), null, null).pilot).toBeNull();
  });

  it('OWN-002 / DECK-091 readOnly is true only for a record newer than schemaVersion 1', () => {
    expect(summarizeDeck(deck, view(deck, {}), null, null).readOnly).toBe(false);
    const newer = { ...deck, schemaVersion: 2 } as unknown as UserDeck;
    expect(summarizeDeck(newer, view(newer, {}), null, null).readOnly).toBe(true);
  });

  it('OWN-026 summarizeDeck is pure: the deck is unchanged and two runs are deep-equal', () => {
    const before = structuredClone(deck);
    const v = view(deck, { 'Card 0': 1 });
    expect(summarizeDeck(deck, v, null, null)).toEqual(summarizeDeck(deck, v, null, null));
    expect(deck).toEqual(before);
  });
});
