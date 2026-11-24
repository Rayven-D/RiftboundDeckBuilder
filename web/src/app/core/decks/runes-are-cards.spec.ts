import { parseCardText } from '../../shared/import/parse-card-list';
import { deckOwnership } from './deck-ownership';
import { computeDeckOwnership, summarizeDeck } from './deck-ownership-view';
import { lock, makeCatalog, makeDeck, makeInput, makeTag, OwnedSpec } from './engine-fixtures';
import {
  canLock,
  computeSharedPool,
  lockCheckMessage,
  lockedShortfalls,
  shortfallWarning,
} from './shared-pool';
import type { DeckLock, DeckOwnershipInput, UserDeck } from './types';

// Runes are cards (RJ, 2026-11-24): SPEC-005 v0.5 OWN-028/029, SPEC-008 v0.4 SHARE-006,
// SPEC-007 v0.8 COLL-089. KENNEN_1-shaped deck: 66 copies in 32 cards, of which Chaos Rune ×9
// and Order Rune ×3 (12 copies in 2 rune cards).
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
const RUNES: [string, number][] = [
  ['Chaos Rune', 9],
  ['Order Rune', 3],
];
const LEGEND = 'Kennen, Heart of the Tempest';
const CHAMP = 'Kennen, Storm of Shuriken';
const nonRunes: [string, number][] = [[LEGEND, 1], [CHAMP, 1], ...MAIN, ...FIELDS, ...SIDE];
const catalog = makeCatalog([
  ...nonRunes.map(([n]) => n),
  { name: 'Chaos Rune', category: 'rune' },
  { name: 'Order Rune', category: 'rune' },
]);
const zones = {
  legend: [[LEGEND, 1]] as [string, number][],
  champion: [[CHAMP, 1]] as [string, number][],
  main: MAIN,
  battlefields: FIELDS,
  runes: RUNES,
  sideboard: SIDE,
};
const kennen1 = makeDeck('k1', 'Kennen: ASC Evansrhim', zones);
const kennen7 = makeDeck('k7', 'Kennen: HXN Gonkra', zones);
const ownAllNonRunes = (times = 1) => Object.fromEntries(nonRunes.map(([n, q]) => [n, q * times]));
const TODAY = '2026-11-24';

function viewOf(deck: UserDeck, input: DeckOwnershipInput, decks = [deck], locks: DeckLock[] = []) {
  const shared = computeSharedPool({ decks, locks, ownership: input });
  const view = computeDeckOwnership(deck, { status: 'ok', input, shared }, catalog, null, TODAY);
  return { shared, view };
}
const runeTiles = (view: ReturnType<typeof viewOf>['view']) =>
  view.sections.find((s) => s.zone === 'runes')?.cards ?? [];

describe('Runes are cards (SPEC-005 OWN-028/029, SPEC-008 SHARE-006, SPEC-007 COLL-089)', () => {
  it('SPEC-005 AC 7 (OWN-028, OWN-050, OWN-052) nothing owned: 0 of 66, rune tiles darkened, Rune Pool in the copied list', () => {
    const { view } = viewOf(kennen1, makeInput(catalog));
    expect(view.summary).toMatchObject({
      copiesRequired: 66,
      copiesAvailable: 0,
      cardsTotal: 32,
      cardsFullyAvailable: 0,
    });
    expect(summarizeDeck(kennen1, view, null, null).ownershipLine).toBe('0 of 66 copies available');
    for (const s of view.sections) for (const c of s.cards) expect(c.state).toBe('none');
    expect(view.missing.reduce((n, m) => n + m.missing, 0)).toBe(66);
    expect(view.missingText).toContain('Rune Pool:\n9 Chaos Rune\n3 Order Rune');
    // DECK-086: the copied text parses back into the same zones and quantities.
    const parsed = parseCardText(view.missingText);
    expect(parsed.issues).toEqual([]);
    expect(parsed.entries.map((e) => [e.section, e.name, e.quantity])).toEqual(
      view.missing.map((m) => [m.zone, m.name, m.missing]),
    );
  });

  it('SPEC-005 AC 8 (OWN-011, OWN-051) sections and missing groups in Riot order, Battlefields before Runes', () => {
    const { view } = viewOf(kennen1, makeInput(catalog));
    const order = ['legend', 'champion', 'main', 'battlefields', 'runes', 'sideboard'];
    expect(view.sections.map((s) => s.zone)).toEqual(order);
    expect(view.sections.map((s) => s.required)).toEqual([1, 1, 39, 3, 12, 10]);
    expect(runeTiles(view).map((c) => [c.name, c.required])).toEqual(RUNES);
    expect([...new Set(view.missing.map((m) => m.zone))]).toEqual(order);
  });

  describe('SPEC-005 AC 17 (OWN-022, OWN-028, OWN-033, OWN-050…052) runes are counted like any card', () => {
    const input = makeInput(catalog, { owned: { ...ownAllNonRunes(), 'Chaos Rune': 6 } });
    const { view } = viewOf(kennen1, input);

    it('OWN-028 Chaos Rune 6 of 9 (partial), Order Rune 0 of 3 (none); Runes section 6 of 12', () => {
      const runes = view.sections.find((s) => s.zone === 'runes')!;
      expect([runes.required, runes.allocated]).toEqual([12, 6]);
      expect(runes.cards.map((c) => [c.name, c.allocated, c.fill, c.state, c.label])).toEqual([
        ['Chaos Rune', 6, 6 / 9, 'partial', '6 of 9 available'],
        ['Order Rune', 0, 0, 'none', '0 of 3 available'],
      ]);
      for (const c of runes.cards) expect(c.label).not.toMatch(/assumed|not tracked/i);
    });

    it('OWN-050 summary 60 of 66 copies, 30 of 32 cards; OWN-051/052 missing list is the Rune Pool only', () => {
      expect(view.summary).toMatchObject({
        copiesRequired: 66,
        copiesAvailable: 60,
        cardsTotal: 32,
        cardsFullyAvailable: 30,
      });
      expect(view.missing.map((m) => [m.zone, m.missing, m.name])).toEqual([
        ['runes', 3, 'Chaos Rune'],
        ['runes', 3, 'Order Rune'],
      ]);
      expect(view.missingText).toBe('Rune Pool:\n3 Chaos Rune\n3 Order Rune');
    });

    it('OWN-070 after an Add of 3 Chaos Rune and 3 Order Rune: 66 of 66, nothing missing', () => {
      const after = makeInput(catalog, {
        owned: { ...ownAllNonRunes(), 'Chaos Rune': 9, 'Order Rune': 3 },
      });
      const v = viewOf(kennen1, after).view;
      expect(runeTiles(v).map((c) => c.state)).toEqual(['full', 'full']);
      expect(v.summary).toMatchObject({ copiesRequired: 66, copiesAvailable: 66 });
      expect(v.missing).toEqual([]);
    });
  });

  it('SPEC-005 AC 18 (OWN-022, OWN-028) a rune in Main is allocated first, like any card', () => {
    const deck = makeDeck('w', 'Wrong Zone', {
      main: [['Chaos Rune', 1]],
      runes: [['Chaos Rune', 9]],
    });
    const { view } = viewOf(deck, makeInput(catalog, { owned: { 'Chaos Rune': 9 } }));
    expect(view.sections[2].cards[0]).toMatchObject({
      state: 'full',
      label: '1 of 1 available · 9 of 10 in this deck',
    });
    expect(runeTiles(view)[0]).toMatchObject({
      state: 'partial',
      fill: 8 / 9,
      label: '8 of 9 available · 9 of 10 in this deck',
    });
    expect(view.missing).toEqual([
      { zone: 'runes', cardKey: 'chaos rune', name: 'Chaos Rune', missing: 1 },
    ]);
  });

  it('SPEC-005 AC 19 (OWN-029) no migration: stored records unchanged, unimported runes read as missing', () => {
    const input = makeInput(catalog, { owned: ownAllNonRunes() });
    const locks = [lock('k1')];
    const before = JSON.stringify({ kennen1, input, locks });
    const storageBefore = localStorage.length;
    const { view } = viewOf(kennen1, input, [kennen1], locks);
    expect(JSON.stringify({ kennen1, input, locks })).toBe(before);
    expect(localStorage.length).toBe(storageBefore);
    expect(kennen1.schemaVersion).toBe(1);
    expect(input.collection.schemaVersion).toBe(1);
    expect(runeTiles(view).map((c) => c.allocated)).toEqual([0, 0]);
    expect(view.missing.filter((m) => m.zone === 'runes').map((m) => m.missing)).toEqual([9, 3]);
    const unlocked = viewOf(kennen1, input).view;
    expect(runeTiles(unlocked).map((c) => c.label)).toEqual([
      '0 of 9 available',
      '0 of 3 available',
    ]);
  });

  it('SPEC-008 AC 12 (SHARE-006, SHARE-014, SHARE-020) runes not owned block lock in: 2 cards short; owned → lockable', () => {
    const { shared } = viewOf(kennen1, makeInput(catalog, { owned: ownAllNonRunes() }));
    expect(shared.byDeck['k1'].complete).toBe(false);
    const check = canLock(shared, kennen1, false);
    expect(check).toEqual({ ok: false, reason: 'incomplete', cardsShort: 2 });
    expect(lockCheckMessage(check)).toBe('Lock in needs every card available: 2 cards short');
    const after = viewOf(
      kennen1,
      makeInput(catalog, { owned: { ...ownAllNonRunes(), 'Chaos Rune': 9, 'Order Rune': 3 } }),
    ).shared;
    expect(after.byDeck['k1'].complete).toBe(true);
    expect(canLock(after, kennen1, false)).toEqual({ ok: true });
  });

  describe('SPEC-008 AC 17 (SHARE-001, SHARE-006, SHARE-031, SHARE-042, SHARE-043) runes are shared and held', () => {
    const input = makeInput(catalog, {
      owned: { ...ownAllNonRunes(2), 'Chaos Rune': 12, 'Order Rune': 3 },
    });
    const decks = [kennen1, kennen7];

    it('SHARE-042 no locks: both decks 9 of 9 and 3 of 3, "Also in 1 other deck"', () => {
      for (const d of decks) {
        const { view } = viewOf(d, input, decks);
        expect(runeTiles(view).map((c) => [c.label, c.sharedLabel])).toEqual([
          ['9 of 9 available', 'Also in 1 other deck'],
          ['3 of 3 available', 'Also in 1 other deck'],
        ]);
      }
    });

    it('SHARE-031/043 KENNEN_1 locked: KENNEN_7 Chaos Rune 3 of 9, Order Rune 0 of 3, breakdown, 2 cards short', () => {
      const { shared, view } = viewOf(kennen7, input, decks, [lock('k1')]);
      const [chaos, order] = runeTiles(view);
      expect(chaos).toMatchObject({
        label: '3 of 9 available',
        fill: 3 / 9,
        state: 'partial',
        sharedLabel: 'Also in 1 other deck · 1 locked',
        ownedForDecks: 12,
        lockedByOthers: 9,
        available: 3,
        cardRequired: 9,
      });
      expect(chaos.otherUses).toEqual([
        { deckId: 'k1', deckName: 'Kennen: ASC Evansrhim', need: 9, locked: true, hold: 9 },
      ]);
      expect(order).toMatchObject({ label: '0 of 3 available', state: 'none' });
      const check = canLock(shared, kennen7, false);
      expect(lockCheckMessage(check)).toBe('Lock in needs every card available: 2 cards short');
    });
  });

  it('SPEC-008 AC 18 (SHARE-006, SHARE-033; OWN-029) a lock stored before v0.4 with no runes owned: short, stays locked, refills', () => {
    const locks = [lock('k1', '2026-11-20T10:00:00Z')];
    const lockBefore = JSON.stringify(locks);
    const input = makeInput(catalog, { owned: ownAllNonRunes() });
    const { view } = viewOf(kennen1, input, [kennen1], locks);
    expect(JSON.stringify(locks)).toBe(lockBefore);
    expect(view.lock).toMatchObject({ locked: true, short: true });
    expect(runeTiles(view).map((c) => c.label)).toEqual(['0 of 9 locked in', '0 of 3 locked in']);
    expect(summarizeDeck(kennen1, view, null, null)).toMatchObject({
      lockBadge: 'Locked · 2 cards short',
      ownershipFilter: 'partial',
    });
    const refilled = viewOf(
      kennen1,
      makeInput(catalog, { owned: { ...ownAllNonRunes(), 'Chaos Rune': 9, 'Order Rune': 3 } }),
      [kennen1],
      locks,
    ).view;
    expect(summarizeDeck(kennen1, refilled, null, null)).toMatchObject({
      lockBadge: 'Locked',
      ownershipFilter: 'locked',
    });
  });

  it('SPEC-007 AC 25 (COLL-081, COLL-088, COLL-089) imported runes count toward decks; an excluding tag warns first', () => {
    const owned: OwnedSpec = { owned: { ...ownAllNonRunes(), 'Chaos Rune': 9, 'Order Rune': 3 } };
    const input = makeInput(catalog, owned);
    expect(deckOwnership(input, 'chaos rune')).toMatchObject({ owned: 9, ownedForDecks: 9 });
    const locks = [lock('k1')];
    const before = computeSharedPool({ decks: [kennen1], locks, ownership: input });
    expect(before.byCard['chaos rune'].uses).toEqual([
      { deckId: 'k1', deckName: 'Kennen: ASC Evansrhim', need: 9, locked: true, hold: 9 },
    ]);
    // Tag the unassigned Chaos Rune entry "Exclude from decks".
    const tagged = makeInput(catalog, {
      ...owned,
      tags: [makeTag('t_x', 'Binder', true)],
      assignments: { 'u:chaos rune': ['t_x'] },
    });
    expect(deckOwnership(tagged, 'chaos rune')).toMatchObject({ owned: 9, ownedForDecks: 0 });
    const after = computeSharedPool({ decks: [kennen1], locks, ownership: tagged });
    const s = lockedShortfalls(before, after);
    expect(s.map(shortfallWarning)).toEqual([
      "'Kennen: ASC Evansrhim' (locked) will be 1 card short.",
    ]);
  });
});
