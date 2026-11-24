import { computeDeckOwnership, summarizeDeck } from './deck-ownership-view';
import { lock, makeCard, makeCatalog, makeDeck, makeInput } from './engine-fixtures';
import { isRuneEntry } from './runes';
import { canLock, computeSharedPool } from './shared-pool';
import type { DeckLock, DeckOwnershipInput, UserDeck } from './types';

// SPEC-009 v0.2. KENNEN_1-shaped deck: 66 copies in 32 cards, of which Chaos Rune ×9 and
// Order Rune ×3 (12 copies in 2 rune cards), so 54 counted copies in 30 counted cards.
const MAIN = Array.from({ length: 15 }, (_, i): [string, number] => [
  `Main Card ${i + 1}`,
  i < 9 ? 3 : 2,
]);
const SIDE = Array.from({ length: 10 }, (_, i): [string, number] => [`Side Card ${i + 1}`, 1]);
const FIELDS: [string, number][] = [
  ['Minefield', 1],
  ['Veiled Temple', 1],
  ['Zaun Warrens', 1],
];
const LEGEND = 'Kennen, Heart of the Tempest';
const CHAMP = 'Kennen, Storm of Shuriken';
const counted: [string, number][] = [[LEGEND, 1], [CHAMP, 1], ...MAIN, ...FIELDS, ...SIDE];
const catalog = makeCatalog([
  ...counted.map(([n]) => n),
  { name: 'Chaos Rune', category: 'rune' },
  { name: 'Order Rune', category: 'rune' },
]);
const kennen1 = makeDeck('k1', 'Kennen', {
  legend: [[LEGEND, 1]],
  champion: [[CHAMP, 1]],
  main: MAIN,
  battlefields: FIELDS,
  runes: [
    ['Chaos Rune', 9],
    ['Order Rune', 3],
  ],
  sideboard: SIDE,
});

function viewOf(deck: UserDeck, input: DeckOwnershipInput, decks = [deck], locks: DeckLock[] = []) {
  const shared = computeSharedPool({ decks, locks, ownership: input });
  const view = computeDeckOwnership(
    deck,
    { status: 'ok', input, shared },
    catalog,
    null,
    '2026-11-23',
  );
  return { shared, view };
}

describe('SPEC-009 Runes Assumed Owned', () => {
  describe('RUNE-001 isRuneEntry', () => {
    const rune = makeCard({ name: 'Chaos Rune', category: 'rune' }).card;
    const spell = makeCard({ name: 'Hextech Ray' }).card;
    const unknown = { ...spell, category: 'unknown' as const };

    it('RUNE-001 the runes zone is always a rune entry', () => {
      expect(isRuneEntry('runes', spell)).toBe(true);
      expect(isRuneEntry('runes', null)).toBe(true);
    });

    it('RUNE-001 a rune-category card is a rune entry in any zone', () => {
      expect(isRuneEntry('main', rune)).toBe(true);
      expect(isRuneEntry('sideboard', rune)).toBe(true);
    });

    it('RUNE-001 with no catalog card or an unknown category only the zone decides', () => {
      expect(isRuneEntry('main', null)).toBe(false);
      expect(isRuneEntry('main', unknown)).toBe(false);
      expect(isRuneEntry('main', spell)).toBe(false);
    });
  });

  it('AC 1 (RUNE-002, RUNE-003, RUNE-006) empty collection: runes full, "Assumed owned", 0 of 54, 0 of 30', () => {
    const { view } = viewOf(kennen1, makeInput(catalog));
    const runes = view.sections.find((s) => s.zone === 'runes');
    expect(runes?.required).toBe(12);
    expect(runes?.cards.map((c) => [c.name, c.state, c.fill, c.label, c.isRune])).toEqual([
      ['Chaos Rune', 'full', 1, 'Assumed owned', true],
      ['Order Rune', 'full', 1, 'Assumed owned', true],
    ]);
    expect(view.summary).toMatchObject({
      copiesRequired: 54,
      copiesAvailable: 0,
      cardsTotal: 30,
      cardsFullyAvailable: 0,
    });
    expect(view.missing.reduce((n, m) => n + m.missing, 0)).toBe(54);
    expect(view.missing.some((m) => m.zone === 'runes')).toBe(false);
    expect(view.missingText).not.toContain('Rune Pool:');
    expect(summarizeDeck(kennen1, view, null, null).ownershipLine).toBe('0 of 54 copies available');
  });

  it('AC 2 (RUNE-004) every counted card owned, no runes: 54 of 54, nothing missing, Lock in enabled', () => {
    const input = makeInput(catalog, { owned: Object.fromEntries(counted) });
    const { shared, view } = viewOf(kennen1, input);
    expect(view.summary).toMatchObject({
      copiesRequired: 54,
      copiesAvailable: 54,
      cardsFullyAvailable: 30,
    });
    expect(view.missing).toEqual([]);
    expect(canLock(shared, kennen1, false)).toEqual({ ok: true });
  });

  it('AC 3 (RUNE-005) runes are never shared, held or listed', () => {
    const other = makeDeck('k2', 'Other', {
      main: [['Main Card 1', 1]],
      runes: [['Chaos Rune', 6]],
    });
    const input = makeInput(catalog, {
      owned: { ...Object.fromEntries(counted), 'Chaos Rune': 3 },
    });
    const cases: [UserDeck, DeckLock[]][] = [
      [kennen1, [lock('k2')]],
      [other, [lock('k1')]],
    ];
    for (const [deck, locks] of cases) {
      const { shared, view } = viewOf(deck, input, [kennen1, other], locks);
      expect(shared.byCard['chaos rune']).toBeUndefined();
      const chaos = view.sections.find((s) => s.zone === 'runes')?.cards[0];
      expect(chaos).toMatchObject({
        sharedLabel: null,
        otherUses: [],
        heldByThisDeck: null,
        label: 'Assumed owned',
      });
    }
  });

  it('AC 4 (RUNE-001, RUNE-003) a rune in Main is "Assumed owned" and never missing', () => {
    const deck = makeDeck('w', 'Wrong Zone', {
      main: [
        ['Chaos Rune', 1],
        ['Main Card 1', 3],
      ],
    });
    const { shared, view } = viewOf(deck, makeInput(catalog));
    expect(view.sections[2].cards[0]).toMatchObject({
      isRune: true,
      label: 'Assumed owned',
      state: 'full',
    });
    expect(view.missing.map((m) => m.name)).toEqual(['Main Card 1']);
    expect(view.summary.copiesRequired).toBe(3);
    expect(shared.byCard['chaos rune']).toBeUndefined();
  });
});
