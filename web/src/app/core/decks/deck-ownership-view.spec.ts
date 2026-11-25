import {
  computeDeckOwnership,
  formatIsoDate,
  sourceLine,
  summarizeDeck,
} from './deck-ownership-view';
import { lock, makeCatalog, makeDeck, makeInput, makeTag, printingIdOf } from './engine-fixtures';
import { computeSharedPool } from './shared-pool';
import type { BanListFile, FormatName, TournamentDeckSource, UserDeck } from './types';

// SPEC-005 v0.4 computeDeckOwnership / summarizeDeck: the parts SPEC-008/009 changed plus the
// allocation they rely on.
const KAISA = "Kai'Sa, Survivor";
const catalog = makeCatalog(['Lightning Rush', 'The Empyrean', KAISA, 'Hextech Ray']);
const TODAY = '2026-11-23';

function build(deck: UserDeck, owned: Record<string, number>, ban: BanListFile | null = null) {
  const input = makeInput(catalog, { owned });
  const shared = computeSharedPool({ decks: [deck], locks: [], ownership: input });
  return computeDeckOwnership(deck, { status: 'ok', input, shared }, catalog, ban, TODAY);
}

describe('SPEC-005 computeDeckOwnership', () => {
  it('AC 1 (OWN-022, OWN-023) 1 of 3 is a partial fill of exactly 1/3', () => {
    const v = build(makeDeck('d', 'D', { main: [['Lightning Rush', 3]] }), { 'Lightning Rush': 1 });
    expect(v.sections[2].cards[0]).toMatchObject({
      allocated: 1,
      state: 'partial',
      label: '1 of 3 available',
    });
    expect(v.sections[2].cards[0].fill).toBe(1 / 3);
    expect(v.missing).toEqual([
      { zone: 'main', cardKey: 'lightning rush', name: 'Lightning Rush', missing: 2 },
    ]);
  });

  it('AC 2 (OWN-041, OWN-050) excluded foil: 2 of 3, excluded row with tag name, 1 relevant excluded copy', () => {
    const foil = 'p-lr-foil';
    const cat = makeCatalog([{ name: 'Lightning Rush', extraPrintings: [foil] }]);
    const deck = makeDeck('d', 'D', { main: [['Lightning Rush', 3]] });
    const input = makeInput(cat, {
      byPrinting: { 'Lightning Rush': { [printingIdOf('Lightning Rush')]: 2, [foil]: 1 } },
      tags: [makeTag('t_col', 'Collector', true)],
      assignments: { [`p:${foil}`]: ['t_col'] },
    });
    const shared = computeSharedPool({ decks: [deck], locks: [], ownership: input });
    const v = computeDeckOwnership(deck, { status: 'ok', input, shared }, cat, null, TODAY);
    const t = v.sections[2].cards[0];
    expect(t).toMatchObject({
      label: '2 of 3 available',
      ownedForDecks: 2,
      ownedExcluded: 1,
      lockedByOthers: 0,
    });
    expect(t.excludedPrintings).toEqual([
      {
        kind: 'printing',
        printingId: foil,
        printingCode: 'OGN-002',
        variantLabel: 'Foil',
        count: 1,
        excludedByTagIds: ['t_col'],
        excludedByTagNames: ['Collector'],
      },
    ]);
    expect(v.summary.copiesExcludedRelevant).toBe(1);
  });

  it('AC 4 (OWN-022, OWN-033) Main ×2 + Sideboard ×1 with 2 owned: Main full, Sideboard none, card total', () => {
    const deck = makeDeck('d', 'D', {
      main: [['The Empyrean', 2]],
      sideboard: [['The Empyrean', 1]],
    });
    const v = build(deck, { 'The Empyrean': 2 });
    const main = v.sections[2].cards[0];
    const side = v.sections[5].cards[0];
    expect(main).toMatchObject({
      allocated: 2,
      state: 'full',
      label: '2 of 2 available · 2 of 3 in this deck',
    });
    expect(side).toMatchObject({
      allocated: 0,
      state: 'none',
      label: '0 of 1 available · 2 of 3 in this deck',
    });
    expect(main.allocationByZone).toEqual({
      main: { allocated: 2, required: 2 },
      sideboard: { allocated: 0, required: 1 },
    });
    expect(v.summary.cardsFullyAvailable).toBe(0);
    expect(v.missingText).toBe('Sideboard:\n1 The Empyrean');
  });

  it('AC 5 (OWN-022) Champion before Main', () => {
    const v = build(makeDeck('d', 'D', { champion: [[KAISA, 1]], main: [[KAISA, 2]] }), {
      [KAISA]: 2,
    });
    expect(v.sections[1].cards[0]).toMatchObject({ allocated: 1, state: 'full' });
    expect(v.sections[2].cards[0]).toMatchObject({ allocated: 1, state: 'partial' });
  });

  it('AC 9 (OWN-061) unknown card: placeholder flag, 0 available, in the missing list', () => {
    const v = build(makeDeck('d', 'D', { battlefields: [['Gone Field', 1]] }), {});
    expect(v.sections[3].cards[0]).toMatchObject({
      name: 'Gone Field',
      flags: ['unknown-card'],
      label: '0 of 1 available',
      state: 'none',
      card: null,
    });
    expect(v.missing).toHaveLength(1);
  });

  it('AC 13 (OWN-062) ownership unavailable: full colour, no labels, no missing list', () => {
    const deck = makeDeck('d', 'D', { main: [['Lightning Rush', 3]] });
    const v = computeDeckOwnership(deck, { status: 'unavailable' }, catalog, null, TODAY);
    expect(v.ownershipAvailable).toBe(false);
    expect(v.lock).toBeNull();
    expect(v.sections[2].cards[0]).toMatchObject({ state: 'full', fill: 1, label: '' });
    expect(v.missing).toEqual([]);
    expect(summarizeDeck(deck, v, null, null)).toMatchObject({
      ownershipLine: 'Ownership unavailable',
      lockBadge: null,
      ownershipFilter: 'unavailable',
    });
  });

  describe('AC 13 second Given (OWN-065; SPEC-008 AC 19): stored locks while the collection is unreadable', () => {
    const tempo = makeDeck('d1', 'Kennen Tempo', { main: [['Hextech Ray', 3]] });
    const control = makeDeck('d2', 'Kennen Control', { main: [['Hextech Ray', 3]] });
    const locks = [lock('d1', '2026-11-23T10:00:00Z')];
    const unavailable = { status: 'unavailable' as const, locks };

    it('OWN-065 (a)-(d) Kennen Tempo keeps its lock: badge "Locked", line and group unavailable', () => {
      const v = computeDeckOwnership(tempo, unavailable, catalog, null, TODAY);
      expect(v.ownershipAvailable).toBe(false);
      expect(v.lock).toEqual({
        deckId: 'd1',
        locked: true,
        lockedAt: '2026-11-23T10:00:00Z',
        complete: false,
        short: false,
        cardsShort: [],
      });
      const s = summarizeDeck(tempo, v, null, null);
      expect(s).toMatchObject({
        lockBadge: 'Locked',
        ownershipLine: 'Ownership unavailable',
        ownershipFilter: 'unavailable',
      });
      // OWN-006: lock=locked lists it (view.lock); own=ready|partial|none don't (group unavailable).
      expect(v.lock?.locked).toBe(true);
      expect(['ready', 'partial', 'none']).not.toContain(s.ownershipFilter);
    });

    it('OWN-065 (a) Kennen Control has no lock: lock null, the same line and group', () => {
      const v = computeDeckOwnership(control, unavailable, catalog, null, TODAY);
      expect(v.lock).toBeNull();
      expect(summarizeDeck(control, v, null, null)).toMatchObject({
        lockBadge: null,
        ownershipLine: 'Ownership unavailable',
        ownershipFilter: 'unavailable',
      });
    });

    it('OWN-065 (a) / SHARE-061 lock store also unreadable: both decks lock null', () => {
      for (const d of [tempo, control]) {
        const v = computeDeckOwnership(d, { status: 'unavailable', locks: null }, catalog, null, TODAY);
        expect(v.lock).toBeNull();
        expect(summarizeDeck(d, v, null, null).ownershipFilter).toBe('unavailable');
      }
    });

    it('OWN-063 / SHARE-053 catalog not loaded: the pool gives the lock facts only, never short', () => {
      const input = makeInput(catalog, { owned: { 'Hextech Ray': 1 } });
      const shared = computeSharedPool({ decks: [tempo], locks, ownership: input });
      expect(shared.byDeck['d1'].short).toBe(true); // short with the catalog …
      const v = computeDeckOwnership(tempo, { status: 'ok', input, shared }, null, null, TODAY);
      expect(v.ownershipAvailable).toBe(false);
      expect(v.lock).toEqual({
        deckId: 'd1',
        locked: true,
        lockedAt: '2026-11-23T10:00:00Z',
        complete: false,
        short: false,
        cardsShort: [],
      }); // … but holds are not computed without it (SHARE-053 (f))
      expect(summarizeDeck(tempo, v, null, null)).toMatchObject({
        lockBadge: 'Locked',
        ownershipFilter: 'unavailable',
      });
      const ignored = computeSharedPool({ decks: [tempo], locks: null, ownership: input });
      const vi = computeDeckOwnership(tempo, { status: 'ok', input, shared: ignored }, null, null, TODAY);
      expect(vi.lock).toBeNull();
    });
  });

  it('OWN-028 a rune card is counted whatever catalog the view gets, so view and pool agree', () => {
    const poolCat = makeCatalog([{ name: 'Chaos Rune', category: 'rune' }]);
    const otherCat = makeCatalog(['Chaos Rune']); // same card, no rune category
    const deck = makeDeck('d', 'D', { main: [['Chaos Rune', 2]] });
    const input = makeInput(poolCat, { owned: { 'Chaos Rune': 1 } });
    const shared = computeSharedPool({ decks: [deck], locks: [], ownership: input });
    expect(shared.byCard['chaos rune']).toMatchObject({ ownedForDecks: 1 });
    for (const cat of [poolCat, otherCat]) {
      const v = computeDeckOwnership(deck, { status: 'ok', input, shared }, cat, null, TODAY);
      expect(v.sections[2].cards[0]).toMatchObject({ label: '1 of 2 available', state: 'partial' });
      expect(v.missing).toEqual([
        { zone: 'main', cardKey: 'chaos rune', name: 'Chaos Rune', missing: 1 },
      ]);
    }
  });

  it('AC 15 (OWN-025) purity: two runs are deep-equal', () => {
    const deck = makeDeck('d', 'D', { main: [['Lightning Rush', 3]] });
    expect(build(deck, { 'Lightning Rush': 1 })).toEqual(build(deck, { 'Lightning Rush': 1 }));
  });

  it('AC 16 (OWN-020, OWN-033) copies locked by another deck: 0 of 3 available; the other 3 of 3 locked in', () => {
    const a = makeDeck('a', 'Other', { main: [['Hextech Ray', 3]] });
    const b = makeDeck('b', 'This', { main: [['Hextech Ray', 3]] });
    const input = makeInput(catalog, { owned: { 'Hextech Ray': 3 } });
    const shared = computeSharedPool({ decks: [a, b], locks: [lock('a')], ownership: input });
    const vb = computeDeckOwnership(b, { status: 'ok', input, shared }, catalog, null, TODAY);
    const va = computeDeckOwnership(a, { status: 'ok', input, shared }, catalog, null, TODAY);
    expect(vb.sections[2].cards[0]).toMatchObject({
      label: '0 of 3 available',
      sharedLabel: 'Also in 1 other deck · 1 locked',
    });
    expect(vb.missing).toEqual([
      { zone: 'main', cardKey: 'hextech ray', name: 'Hextech Ray', missing: 3 },
    ]);
    expect(va.sections[2].cards[0].label).toBe('3 of 3 locked in');
    expect(summarizeDeck(a, va, null, null)).toMatchObject({
      lockBadge: 'Locked',
      ownershipLine: '3 of 3 copies locked in',
      ownershipFilter: 'locked',
    });
  });

  it('OWN-015 ban status on every card; "unknown" without ban data; never changes the fill', () => {
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
            {
              id: 'w1',
              name: 'Wave',
              announced: '2026-11-13',
              effective: '2026-11-23',
              sourceUrl: '',
              add: [{ name: 'Lightning Rush', kind: 'card' }],
              remove: [],
            },
          ],
        },
      ],
    };
    const deck = makeDeck('d', 'D', { main: [['Lightning Rush', 3]] });
    const t = build(deck, { 'Lightning Rush': 3 }, ban).sections[2].cards[0];
    expect(t.banStatus).toEqual({
      status: 'banned',
      waveId: 'w1',
      waveName: 'Wave',
      bannedSince: '2026-11-23',
    });
    expect(t.state).toBe('full');
    expect(build(deck, {}).sections[2].cards[0].banStatus).toEqual({ status: 'unknown' });
  });
});

describe('SPEC-005 summarizeDeck', () => {
  const deck = makeDeck('d', 'D', { main: [['Lightning Rush', 3]] });

  it('OWN-004 legality labels; null legality or format is "Not fully checked"', () => {
    const v = build(deck, { 'Lightning Rush': 3 });
    const std: FormatName = { id: 'standard', name: 'Standard' };
    const label = (verdict: 'legal' | 'illegal' | 'incomplete') =>
      summarizeDeck(deck, v, { verdict, asOf: TODAY }, std).legalityLabel;
    expect(label('legal')).toBe('Legal in Standard as of Nov 23, 2026');
    expect(label('illegal')).toBe('Not legal in Standard today');
    expect(label('incomplete')).toBe('Not fully checked');
    expect(summarizeDeck(deck, v, { verdict: 'legal', asOf: TODAY }, null)).toMatchObject({
      legalityLabel: 'Not fully checked',
      legalityVerdict: 'incomplete',
    });
  });

  it('SHARE-051 unlocked complete deck is ready; partly available is partial; none available is none', () => {
    const filter = (owned: number) =>
      summarizeDeck(deck, build(deck, { 'Lightning Rush': owned }), null, null).ownershipFilter;
    expect(filter(3)).toBe('ready');
    expect(filter(1)).toBe('partial');
    expect(filter(0)).toBe('none');
  });

  it('OWN-003 source line for tournament and user decks; OWN-090 date format', () => {
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
      pilot: 'p',
      sourceUrl: 'u',
      addedAt: '2026-11-20T00:00:00Z',
    };
    expect(sourceLine({ ...deck, source: t })).toBe(
      '1st, Regional Championship: Europe · Nov 6, 2026 – Nov 8, 2026',
    );
    expect(sourceLine({ ...deck, source: { ...t, eventEndDate: '2026-11-06' } })).toBe(
      '1st, Regional Championship: Europe · Nov 6, 2026',
    );
    expect(
      sourceLine({ ...deck, source: { kind: 'user', text: null, url: 'https://x.test' } }),
    ).toBe('https://x.test');
    expect(sourceLine(deck)).toBe('Imported');
    expect(formatIsoDate('2026-01-05')).toBe('Jan 5, 2026');
  });

  it('OWN-080 200 decks of 150 entries with a 4-wave ban list: shared pool plus every tile summary in under 300 ms', () => {
    const names = Array.from({ length: 1200 }, (_, i) => `Card ${i}`);
    const cat = makeCatalog(names);
    const decks = Array.from({ length: 200 }, (_, d) =>
      makeDeck(`deck-${d}`, `Deck ${d}`, {
        main: Array.from({ length: 150 }, (_, e): [string, number] => [
          names[(d * 37 + e) % names.length],
          2,
        ]),
      }),
    );
    const owned = Object.fromEntries(names.map((n, i) => [n, i % 5]));
    const locks = decks.slice(0, 100).map((d) => lock(d.id));
    // A realistic ban list (LEGAL-B09 scale): 4 waves, 22 names, one remove, one upcoming wave.
    const wave = (
      i: number,
      announced: string,
      effective: string,
      add: number[],
      remove: number[] = [],
    ) => ({
      id: `std-w${i}`,
      name: `Wave ${i}`,
      announced,
      effective,
      sourceUrl: '',
      add: add.map((n) => ({ name: `Card ${n}`, kind: 'card' as const })),
      remove: remove.map((n) => ({ name: `Card ${n}`, kind: 'card' as const })),
    });
    const banData: BanListFile = {
      schemaVersion: 1,
      dataVersion: 'perf',
      lastVerified: TODAY,
      lists: [
        {
          format: 'standard',
          region: 'global',
          status: 'verified',
          waves: [
            wave(1, '2026-03-01', '2026-03-08', [3, 17, 41, 88, 120, 205]),
            wave(2, '2026-06-01', '2026-06-08', [301, 333, 404, 450, 512], [17]),
            wave(3, '2026-09-01', '2026-09-08', [600, 640, 701, 777, 808, 901]),
            wave(4, '2026-11-20', '2026-12-01', [950, 1001, 1100, 1150, 1199]),
          ],
        },
      ],
    };
    const run = () => {
      const input = makeInput(cat, { owned }); // a fresh input each run: nothing cached (OWN-083)
      const shared = computeSharedPool({ decks, locks, ownership: input });
      return decks.map((d) =>
        summarizeDeck(
          d,
          computeDeckOwnership(d, { status: 'ok', input, shared }, cat, banData, TODAY),
          null,
          null,
        ),
      );
    };
    for (let i = 0; i < 3; i++) run(); // warm-up (JIT)
    const start = performance.now();
    expect(run()).toHaveLength(200);
    expect(performance.now() - start).toBeLessThan(300);
  });
});
