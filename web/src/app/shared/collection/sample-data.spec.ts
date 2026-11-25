/**
 * SPEC-013 TEST-025 / AC 18 (H-310): the three test decks of `generateLargeSample(n)` have all six zones, filled
 * from the generated catalog with cards of the right kind, within DECK-092, the two locked decks complete against
 * the test collection and the open deck partly available.
 */
import { availability, computeSharedPool, countedEntries } from '../../core/decks';
import type { DeckCard, UserDeck } from '../../core/decks';
import { isChampionUnit } from '../import/deck-import';
import { LIMITS } from '../storage/records';
import { generateLargeSample, sampleDeckId } from './sample-data';
import { TEST_DECK_IDS, planTestLoad } from './test-data';

const NOW = '2026-11-25T12:00:00.000Z';
const copies = (list: readonly DeckCard[]) => list.reduce((n, c) => n + c.qty, 0);
const entries = (d: UserDeck) => countedEntries(d).length;
const deckCopies = (d: UserDeck) => countedEntries(d).reduce((n, x) => n + x.entry.qty, 0);
const pool = (n: number) => {
  const s = generateLargeSample(n);
  return {
    s,
    pool: computeSharedPool({
      decks: s.decks,
      locks: s.locks,
      ownership: {
        catalog: s.catalog,
        collection: s.collection,
        tags: { schemaVersion: 3, updatedAt: NOW, tags: [], assignments: {} },
        printingCodes: s.printingCodes,
      },
    }),
  };
};

describe('SPEC-013 full-shape test decks (H-310)', () => {
  for (const n of [150, 5000]) {
    describe(`${n} entries`, () => {
      it('TEST-025 / AC 18 every test deck has all six zones: Legend 1, Chosen Champion 1, Main Deck, Battlefields 3, Runes, Sideboard', () => {
        for (const d of generateLargeSample(n).decks) {
          expect(d.legend?.qty, d.name).toBe(1);
          expect(d.champion?.qty, d.name).toBe(1);
          expect(d.main.length, d.name).toBeGreaterThan(0);
          expect(copies(d.battlefields), d.name).toBe(3);
          expect(d.battlefields.length, d.name).toBe(3);
          expect(d.runes.length, d.name).toBeGreaterThan(0);
          expect(d.sideboard.length, d.name).toBeGreaterThan(0);
          // a legal-size shape: 1 + 1 + 39 + 3 + 12 + 10
          expect([copies(d.main), copies(d.runes), copies(d.sideboard)], d.name).toEqual([
            39, 12, 10,
          ]);
          expect(deckCopies(d), d.name).toBe(66);
          expect(entries(d), d.name).toBe(32);
        }
      });

      it('TEST-025 / AC 18 every zone holds generated cards of its kind: legend, Champion Unit, battlefields, runes; units elsewhere', () => {
        const { catalog, decks } = generateLargeSample(n);
        const cat = (c: DeckCard) => {
          const card = catalog.cards[c.cardKey];
          expect(card, c.cardKey).toBeDefined();
          expect(c.name).toBe(card.name);
          return card;
        };
        for (const d of decks) {
          expect(cat(d.legend!).category).toBe('legend');
          expect(isChampionUnit(cat(d.champion!))).toBe(true);
          for (const c of d.battlefields) expect(cat(c).category).toBe('battlefield');
          for (const c of d.runes) expect(cat(c).category).toBe('rune');
          for (const c of [...d.main, ...d.sideboard]) expect(cat(c).category).toBe('unit');
          // battlefields use the landscape placeholder art; every printing has art
          for (const c of d.battlefields) {
            for (const id of cat(c).printingIds) {
              expect(catalog.printings[id].art.thumbnailUrl).toMatch(
                /\/(OGN-011|OGN-012|RAD-009|RAD-010|SFD-009|UNL-008|VEN-007)\.svg$/,
              );
            }
          }
        }
      });

      it('TEST-025 / AC 18 each deck holds one card in both Main Deck and Sideboard, and a rune card with 3 or more copies', () => {
        for (const d of generateLargeSample(n).decks) {
          const main = new Set(d.main.map((c) => c.cardKey));
          expect(d.sideboard.filter((c) => main.has(c.cardKey)).length, d.name).toBe(1);
          expect(
            d.runes.some((c) => c.qty >= 3),
            d.name,
          ).toBe(true);
        }
      });

      it('TEST-025 / DECK-092 each test deck is at most 150 entries and 300 copies', () => {
        for (const d of generateLargeSample(n).decks) {
          expect(entries(d)).toBeLessThanOrEqual(LIMITS.maxDeckEntries);
          expect(deckCopies(d)).toBeLessThanOrEqual(LIMITS.maxDeckCopies);
        }
      });

      it('TEST-025 the two locked decks are complete against the test collection (Locked); the open deck is partly available', () => {
        const { s, pool: p } = pool(n);
        const [a, b, open] = s.decks;
        for (const d of [a, b]) {
          expect(p.byDeck[d.id], d.name).toEqual(
            expect.objectContaining({ locked: true, complete: true, short: false, cardsShort: [] }),
          );
        }
        expect(p.byDeck[open.id].locked).toBe(false);
        expect(p.byDeck[open.id].complete).toBe(false);
        const avail = countedEntries(open).map(({ entry }) =>
          availability(p, open.id, entry.cardKey),
        );
        const per = new Map(avail.map((x) => [x.cardKey, x]));
        const state = [...per.values()].map((x) =>
          x.available >= x.need ? 'full' : x.available > 0 ? 'partial' : 'none',
        );
        expect(state).toContain('full');
        expect(state).toContain('partial');
        expect(state).toContain('none');
        const available = [...per.values()].reduce((m, x) => m + Math.min(x.available, x.need), 0);
        expect(available).toBeGreaterThan(0);
        expect(available).toBeLessThan(deckCopies(open));
      });

      it('TEST-011 / TEST-020 ids, names and the test-data-<n> catalogVersion are unchanged', () => {
        const plan = planTestLoad(generateLargeSample(n), n, null, NOW);
        expect(plan.decks.map((d) => [d.id, d.name, d.catalogVersion])).toEqual([
          [TEST_DECK_IDS[0], 'Generated Locked A', `test-data-${n}`],
          [TEST_DECK_IDS[1], 'Generated Locked B', `test-data-${n}`],
          [TEST_DECK_IDS[2], 'Generated Open', `test-data-${n}`],
        ]);
        expect(TEST_DECK_IDS).toEqual([1, 2, 3].map(sampleDeckId));
      });
    });
  }

  it('TEST-011 the generated catalog keeps its size and numbered names; only 16 of the first 50 cards are not units', () => {
    const { catalog } = generateLargeSample(5000);
    const cards = Object.values(catalog.cards);
    expect(cards).toHaveLength(1667);
    const notUnits = cards.flatMap((c, i) =>
      c.category === 'unit' && !c.isChampionUnit ? [] : [i],
    );
    expect(notUnits).toEqual(Array.from({ length: 16 }, (_, k) => 34 + k));
  });

  it('a catalog too small for the plan gives decks with only the cards it has (the dev and page tests use 3…300 entries)', () => {
    const { catalog, decks } = generateLargeSample(30);
    for (const d of decks) {
      for (const { entry } of countedEntries(d)) expect(catalog.cards[entry.cardKey]).toBeDefined();
    }
    expect(decks[0].main.length).toBe(10);
    expect(decks[0].legend).toBeNull();
    expect(generateLargeSample(3).decks.map(entries)).toEqual([1, 0, 1]);
  });
});
