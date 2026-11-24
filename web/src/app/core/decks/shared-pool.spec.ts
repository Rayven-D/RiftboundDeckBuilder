import { computeDeckOwnership, summarizeDeck } from './deck-ownership-view';
import {
  lock,
  makeCatalog,
  makeDeck,
  makeInput,
  makeTag,
  OwnedSpec,
  printingIdOf,
} from './engine-fixtures';
import {
  availability,
  canLock,
  computeSharedPool,
  lockCheckMessage,
  lockedShortfalls,
  shortfallNotice,
  shortfallWarning,
} from './shared-pool';
import type { CollectionCatalogView, DeckLock, OwnershipCard, SharedPool, UserDeck } from './types';

// SPEC-008 v0.2 acceptance criteria (engine part). "Deck 1" = Kennen Tempo, "Deck 2" = Kennen
// Control, "Deck 3" = Kennen Aggro; each also has one card of its own, owned in full.
const RAY = 'Hextech Ray';
const TODAY = '2026-11-23';
const catalog = makeCatalog([
  RAY,
  'Tempo Card',
  'Control Card',
  'Aggro Card',
  "Kai'Sa, Survivor",
  'Kennen, Heart of the Tempest',
  'Kennen, Storm of Shuriken',
  'Zaun Warrens',
  { name: 'Chaos Rune', category: 'rune' },
  { name: 'Order Rune', category: 'rune' },
]);
const deck1 = makeDeck('d1', 'Kennen Tempo', {
  main: [
    [RAY, 3],
    ['Tempo Card', 2],
  ],
});
const deck2 = makeDeck('d2', 'Kennen Control', {
  main: [
    [RAY, 3],
    ['Control Card', 2],
  ],
});
const deck3 = makeDeck('d3', 'Kennen Aggro', {
  main: [
    [RAY, 2],
    ['Aggro Card', 2],
  ],
});
const others = { 'Tempo Card': 2, 'Control Card': 2, 'Aggro Card': 2 };

function pool(
  decks: UserDeck[],
  locks: DeckLock[] | null,
  owned: Record<string, number>,
  spec: OwnedSpec = {},
  cat: CollectionCatalogView = catalog,
): SharedPool {
  return computeSharedPool({
    decks,
    locks,
    ownership: makeInput(cat, { ...spec, owned: { ...others, ...owned, ...spec.owned } }),
  });
}

function view(
  deck: UserDeck,
  decks: UserDeck[],
  locks: DeckLock[] | null,
  owned: Record<string, number>,
  spec: OwnedSpec = {},
) {
  const input = makeInput(catalog, { ...spec, owned: { ...others, ...owned, ...spec.owned } });
  const shared = computeSharedPool({ decks, locks, ownership: input });
  return computeDeckOwnership(deck, { status: 'ok', input, shared }, catalog, null, TODAY);
}

function tile(v: ReturnType<typeof view>, zone: string, cardKey: string): OwnershipCard {
  const t = v.sections.find((s) => s.zone === zone)?.cards.find((c) => c.cardKey === cardKey);
  if (!t) throw new Error(`no tile ${zone}/${cardKey}`);
  return t;
}

describe('SPEC-008 Shared Cards and Lock-in (engine)', () => {
  it('AC 1 (SHARE-011, SHARE-012) unlocked decks reserve nothing: both see 2 of 3 available', () => {
    const p = pool([deck1, deck2], [], { [RAY]: 2 });
    expect(availability(p, 'd1', 'hextech ray').available).toBe(2);
    expect(availability(p, 'd2', 'hextech ray').available).toBe(2);
    const check = canLock(p, deck1, false);
    expect(check).toEqual({ ok: false, reason: 'incomplete', cardsShort: 1 });
    expect(lockCheckMessage(check)).toBe('Lock in needs every card available: 1 card short');
  });

  describe('AC 2: 3 owned, Deck 1 locked (SHARE-031, SHARE-040, SHARE-041, SHARE-042, SHARE-043)', () => {
    const decks = [deck1, deck2];
    const locks = [lock('d1')];

    it('SHARE-031 Deck 1 holds 3 and shows "3 of 3 locked in" with "Locked in by this deck: 3"', () => {
      const v = view(deck1, decks, locks, { [RAY]: 3 });
      const t = tile(v, 'main', 'hextech ray');
      expect(t).toMatchObject({
        allocated: 3,
        state: 'full',
        label: '3 of 3 locked in',
        heldByThisDeck: 3,
      });
      expect(v.lock).toMatchObject({ locked: true, short: false, complete: true });
      expect(summarizeDeck(deck1, v, null, null).lockBadge).toBe('Locked');
    });

    it('SHARE-040/042/043 Deck 2 sees 0 of 3 available, "Also in 1 other deck · 1 locked", and the breakdown', () => {
      const v = view(deck2, decks, locks, { [RAY]: 3 });
      const t = tile(v, 'main', 'hextech ray');
      expect(t).toMatchObject({
        allocated: 0,
        state: 'none',
        label: '0 of 3 available',
        sharedLabel: 'Also in 1 other deck · 1 locked',
        ownedForDecks: 3,
        lockedByOthers: 3,
        available: 0,
        cardRequired: 3,
        heldByThisDeck: null,
      });
      expect(t.otherUses).toEqual([
        { deckId: 'd1', deckName: 'Kennen Tempo', need: 3, locked: true, hold: 3 },
      ]);
      expect(v.missing).toEqual([{ zone: 'main', cardKey: 'hextech ray', name: RAY, missing: 3 }]);
      expect(v.missingText).toBe('Main Deck:\n3 Hextech Ray');
    });

    it('SHARE-020 Deck 2 cannot be locked: 1 card short', () => {
      const p = pool(decks, locks, { [RAY]: 3 });
      const check = canLock(p, deck2, false);
      expect(check).toEqual({ ok: false, reason: 'incomplete', cardsShort: 1 });
      expect(lockCheckMessage(check)).toBe('Lock in needs every card available: 1 card short');
      expect(canLock(p, deck1, false)).toEqual({ ok: false, reason: 'already-locked' });
    });
  });

  it('AC 3 (SHARE-011) 4 owned, Deck 1 locked: Deck 2 shows 1 of 3 available, breakdown 4 / 3 / 1 / 3', () => {
    const v = view(deck2, [deck1, deck2], [lock('d1')], { [RAY]: 4 });
    const t = tile(v, 'main', 'hextech ray');
    expect(t).toMatchObject({ allocated: 1, label: '1 of 3 available', state: 'partial' });
    expect(t.fill).toBe(1 / 3);
    expect([t.ownedForDecks, t.lockedByOthers, t.available, t.cardRequired]).toEqual([4, 3, 1, 3]);
  });

  it('AC 4 (SHARE-023) unlocking releases: both decks see 3 of 3 available and Deck 2 can be locked', () => {
    const p = pool([deck1, deck2], [], { [RAY]: 3 });
    expect(availability(p, 'd2', 'hextech ray').available).toBe(3);
    expect(availability(p, 'd2', 'hextech ray').otherUses).toEqual([
      { deckId: 'd1', deckName: 'Kennen Tempo', need: 3, locked: false, hold: 0 },
    ]);
    expect(canLock(p, deck2, false)).toEqual({ ok: true });
  });

  it('AC 5 (SHARE-024) delete releases; Undo restores the deck unlocked behind the newer lock', () => {
    // Deck 1 deleted: only Deck 2 in the store, so its old lock is an orphan and ignored (SHARE-062).
    const afterDelete = pool([deck2], [lock('d1')], { [RAY]: 3 });
    expect(availability(afterDelete, 'd2', 'hextech ray')).toMatchObject({
      available: 3,
      otherUses: [],
    });
    // Deck 2 locked, then Undo restores Deck 1 without a lock.
    const afterUndo = pool([deck1, deck2], [lock('d2', '2026-11-23T12:00:00Z')], { [RAY]: 3 });
    expect(afterUndo.byDeck['d1'].locked).toBe(false);
    expect(availability(afterUndo, 'd1', 'hextech ray').available).toBe(0);
    expect(availability(afterUndo, 'd2', 'hextech ray').heldByThisDeck).toBe(3);
  });

  it('AC 6 (SHARE-002, SHARE-013) Chosen Champion and Main share one pool', () => {
    const kaisa = "Kai'Sa, Survivor";
    const deckA = makeDeck('dA', 'Deck A', { champion: [[kaisa, 1]], main: [[kaisa, 2]] });
    const deckB = makeDeck('dB', 'Deck B', { champion: [[kaisa, 1]], main: [[kaisa, 1]] });
    const decks = [deckA, deckB];
    const p = pool(decks, [lock('dA')], { [kaisa]: 4 });
    expect(availability(p, 'dA', 'kaisa survivor').heldByThisDeck).toBe(3);
    const v = view(deckB, decks, [lock('dA')], { [kaisa]: 4 });
    const champ = tile(v, 'champion', 'kaisa survivor');
    const main = tile(v, 'main', 'kaisa survivor');
    // OWN-033: split across zones, so the label adds the card total.
    expect(champ).toMatchObject({
      allocated: 1,
      state: 'full',
      label: '1 of 1 available · 1 of 2 in this deck',
    });
    expect(main).toMatchObject({
      allocated: 0,
      state: 'none',
      label: '0 of 1 available · 1 of 2 in this deck',
    });
    expect([
      champ.ownedForDecks,
      champ.lockedByOthers,
      champ.available,
      champ.cardRequired,
    ]).toEqual([4, 3, 1, 2]);
  });

  describe('AC 7: Legend (SHARE-001, SHARE-002)', () => {
    const legend = 'Kennen, Heart of the Tempest';
    const champ = 'Kennen, Storm of Shuriken';
    const a = makeDeck('l1', 'Legend One', { legend: [[legend, 1]], champion: [[champ, 1]] });
    const b = makeDeck('l2', 'Legend Two', { legend: [[legend, 1]], champion: [[champ, 1]] });

    it('SHARE-001 1 owned, no locks: both Legend tiles 1 of 1 available, "Also in 1 other deck"', () => {
      for (const d of [a, b]) {
        const t = tile(
          view(d, [a, b], [], { [legend]: 1, [champ]: 2 }),
          'legend',
          'kennen heart of the tempest',
        );
        expect(t).toMatchObject({ label: '1 of 1 available', sharedLabel: 'Also in 1 other deck' });
      }
    });

    it('SHARE-001 Deck 1 locked: Deck 2 Legend 0 of 1 available and not complete; 2 owned → 1 of 1', () => {
      const v = view(b, [a, b], [lock('l1')], { [legend]: 1, [champ]: 2 });
      expect(tile(v, 'legend', 'kennen heart of the tempest')).toMatchObject({
        label: '0 of 1 available',
        state: 'none',
      });
      expect(v.lock?.complete).toBe(false);
      const v2 = view(b, [a, b], [lock('l1')], { [legend]: 2, [champ]: 2 });
      expect(tile(v2, 'legend', 'kennen heart of the tempest').label).toBe('1 of 1 available');
    });

    it('SHARE-002 the Legend never shares a pool with Kennen, Storm of Shuriken', () => {
      const p = pool([a, b], [lock('l1')], { [legend]: 1, [champ]: 5 });
      expect(p.byCard['kennen heart of the tempest'].ownedForDecks).toBe(1);
      expect(p.byCard['kennen storm of shuriken'].ownedForDecks).toBe(5);
      expect(availability(p, 'l2', 'kennen storm of shuriken').available).toBe(4);
    });
  });

  it('AC 8 (SHARE-001) Battlefield: 0 of 1 available, "· 1 locked", locked deck listed "needs 1 · holds 1"', () => {
    const locked = makeDeck('b1', 'Locked Field', { battlefields: [['Zaun Warrens', 1]] });
    const open = makeDeck('b2', 'Open Field', { battlefields: [['Zaun Warrens', 1]] });
    const t = tile(
      view(open, [locked, open], [lock('b1')], { 'Zaun Warrens': 1 }),
      'battlefields',
      'zaun warrens',
    );
    expect(t).toMatchObject({
      label: '0 of 1 available',
      sharedLabel: 'Also in 1 other deck · 1 locked',
    });
    expect(t.otherUses).toEqual([
      { deckId: 'b1', deckName: 'Locked Field', need: 1, locked: true, hold: 1 },
    ]);
  });

  describe('AC 9: shortfall after a collection change; earliest lock wins (SHARE-031…034)', () => {
    const decks = [deck1, deck3];
    const locks = [lock('d1', '2026-11-23T10:00:00Z'), lock('d3', '2026-11-23T11:00:00Z')];

    it('SHARE-034 each − warns about Kennen Aggro only, before the change', () => {
      const p5 = pool(decks, locks, { [RAY]: 5 });
      const p4 = pool(decks, locks, { [RAY]: 4 });
      const p3 = pool(decks, locks, { [RAY]: 3 });
      for (const [before, after] of [
        [p5, p4],
        [p4, p3],
      ]) {
        const s = lockedShortfalls(before, after);
        expect(s).toEqual([{ deckId: 'd3', deckName: 'Kennen Aggro', cardsShort: 1 }]);
        expect(shortfallWarning(s[0])).toBe("'Kennen Aggro' (locked) will be 1 card short.");
      }
    });

    it('SHARE-032/033 after both: Deck 1 holds 3, Deck 3 holds 0, both stay locked, Deck 3 flagged short', () => {
      const v1 = view(deck1, decks, locks, { [RAY]: 3 });
      const v3 = view(deck3, decks, locks, { [RAY]: 3 });
      expect(tile(v1, 'main', 'hextech ray').label).toBe('3 of 3 locked in');
      expect(tile(v3, 'main', 'hextech ray').label).toBe('0 of 2 locked in');
      expect(v1.lock).toMatchObject({ locked: true, short: false });
      expect(v3.lock).toMatchObject({ locked: true, short: true, cardsShort: ['hextech ray'] });
      const s3 = summarizeDeck(deck3, v3, null, null);
      expect(s3.lockBadge).toBe('Locked · 1 card short');
      // AC 15 last sentence: still holds its other cards → partial, and it is locked.
      expect(s3.ownershipFilter).toBe('partial');
    });

    it('SHARE-033 adding 2 copies back refills Deck 3 with no other action', () => {
      const p = pool(decks, locks, { [RAY]: 5 });
      expect(availability(p, 'd3', 'hextech ray').heldByThisDeck).toBe(2);
      expect(p.byDeck['d3']).toMatchObject({ locked: true, short: false, cardsShort: [] });
    });
  });

  it('AC 10 (SHARE-004, SHARE-043) excluded copies never count', () => {
    const foil = 'p-hextech-ray-foil';
    const cat = makeCatalog([{ name: RAY, extraPrintings: [foil] }, 'Tempo Card', 'Control Card']);
    const input = makeInput(cat, {
      owned: { 'Tempo Card': 2, 'Control Card': 2 },
      byPrinting: { [RAY]: { [printingIdOf(RAY)]: 3, [foil]: 1 } },
      tags: [makeTag('t_col', 'Collector', true)],
      assignments: { [`p:${foil}`]: ['t_col'] },
    });
    const shared = computeSharedPool({
      decks: [deck1, deck2],
      locks: [lock('d1')],
      ownership: input,
    });
    const av = availability(shared, 'd2', 'hextech ray');
    expect(av).toMatchObject({
      ownedForDecks: 3,
      ownedExcluded: 1,
      lockedByOthers: 3,
      available: 0,
    });
    const v = computeDeckOwnership(deck2, { status: 'ok', input, shared }, cat, null, TODAY);
    const t = v.sections[2].cards[0];
    expect(t.excludedPrintings).toEqual([
      expect.objectContaining({ printingId: foil, count: 1, excludedByTagNames: ['Collector'] }),
    ]);
    expect(t.printingsOwned).toEqual([
      expect.objectContaining({ printingId: printingIdOf(RAY), count: 3 }),
    ]);
  });

  it('AC 12 (SHARE-014, RUNE-004) runes the user does not own never block lock in', () => {
    const d = makeDeck('r1', 'Rune Deck', {
      main: [['Tempo Card', 2]],
      runes: [
        ['Chaos Rune', 9],
        ['Order Rune', 3],
      ],
    });
    const p = pool([d], [], {});
    expect(p.byDeck['r1'].complete).toBe(true);
    expect(canLock(p, d, false)).toEqual({ ok: true });
  });

  it('AC 13 (SHARE-061) unreadable lock store: counts ignore locks and Lock in is disabled', () => {
    const p = pool([deck1, deck2], null, { [RAY]: 3 });
    expect(p.locksIgnored).toBe(true);
    expect(availability(p, 'd2', 'hextech ray').available).toBe(3);
    expect(canLock(p, deck2, false)).toEqual({ ok: false, reason: 'locks-unreadable' });
  });

  it('AC 14 (SHARE-030, SHARE-035, SHARE-070) same lockedAt: deckId breaks the tie; pure and deterministic', () => {
    const a = makeDeck('a1-deck', 'Zed', { main: [[RAY, 3]] });
    const b = makeDeck('b2-deck', 'Ahri', { main: [[RAY, 3]] });
    const at = '2026-11-23T10:00:00Z';
    const input = makeInput(catalog, { owned: { [RAY]: 4 } });
    const snapshot = JSON.stringify({ a, b, input });
    const storageBefore = localStorage.length;
    // Lock order is independent of input order.
    const p1 = computeSharedPool({
      decks: [b, a],
      locks: [lock('b2-deck', at), lock('a1-deck', at)],
      ownership: input,
    });
    const p2 = computeSharedPool({
      decks: [b, a],
      locks: [lock('b2-deck', at), lock('a1-deck', at)],
      ownership: input,
    });
    expect(p1).toEqual(p2);
    expect(availability(p1, 'a1-deck', 'hextech ray').heldByThisDeck).toBe(3);
    expect(availability(p1, 'b2-deck', 'hextech ray').heldByThisDeck).toBe(1);
    expect(JSON.stringify({ a, b, input })).toBe(snapshot);
    expect(localStorage.length).toBe(storageBefore);
  });

  describe('AC 15: empty and runes-only decks; one ownership group per deck (SHARE-014, SHARE-020, SHARE-050, SHARE-051)', () => {
    const runeTest = makeDeck('rt', 'Rune Test', {
      runes: [
        ['Chaos Rune', 9],
        ['Order Rune', 3],
      ],
    });
    const emptyDraft = makeDeck('ed', 'Empty Draft', {});
    const rayOnly = makeDeck('ro', 'Ray Only', { main: [[RAY, 3]] });
    const decks = [deck1, runeTest, emptyDraft, rayOnly];
    const locks = [lock('d1', '2026-11-23T09:00:00Z'), lock('ro', '2026-11-23T10:00:00Z')];
    const input = makeInput(catalog, { owned: { ...others, [RAY]: 3 } });
    const shared = computeSharedPool({ decks, locks, ownership: input });
    const summary = (d: UserDeck) =>
      summarizeDeck(
        d,
        computeDeckOwnership(d, { status: 'ok', input, shared }, catalog, null, TODAY),
        null,
        null,
      );
    const isLocked = (d: UserDeck) => shared.byDeck[d.id].locked;

    it('SHARE-050 Rune Test and Empty Draft read "No cards to count", no badge, group none', () => {
      for (const d of [runeTest, emptyDraft]) {
        expect(summary(d)).toMatchObject({
          ownershipLine: 'No cards to count',
          lockBadge: null,
          ownershipFilter: 'none',
        });
      }
    });

    it('SHARE-051 Ray Only (locked, holds 0) reads "0 of 3 copies locked in", "Locked · 1 card short", group none', () => {
      expect(summary(rayOnly)).toMatchObject({
        ownershipLine: '0 of 3 copies locked in',
        lockBadge: 'Locked · 1 card short',
        ownershipFilter: 'none',
      });
    });

    it('SHARE-051 own / lock filters: none lists all three, partial and ready none, none+locked only Ray Only', () => {
      const own = (f: string) =>
        [runeTest, emptyDraft, rayOnly].filter((d) => summary(d).ownershipFilter === f);
      expect(own('none').map((d) => d.name)).toEqual(['Rune Test', 'Empty Draft', 'Ray Only']);
      expect(own('partial')).toEqual([]);
      expect(own('ready')).toEqual([]);
      expect(
        own('none')
          .filter(isLocked)
          .map((d) => d.name),
      ).toEqual(['Ray Only']);
      expect(summary(deck1).ownershipFilter).toBe('locked');
      expect(isLocked(deck1)).toBe(true);
    });

    it('SHARE-020 canLock returns no-cards for Rune Test and Empty Draft; rune tiles read "Assumed owned"', () => {
      for (const d of [runeTest, emptyDraft]) {
        const check = canLock(shared, d, false);
        expect(check).toEqual({ ok: false, reason: 'no-cards' });
        expect(lockCheckMessage(check)).toBe('Lock in needs at least one card besides runes');
      }
      const v = computeDeckOwnership(
        runeTest,
        { status: 'ok', input, shared },
        catalog,
        null,
        TODAY,
      );
      expect(v.sections[4].cards.map((c) => c.label)).toEqual(['Assumed owned', 'Assumed owned']);
    });
  });

  describe('AC 16: Replace import warns in its confirmation (SHARE-034, IMP-050)', () => {
    const decks = [deck1];
    const locks = [lock('d1')];

    it('SHARE-034 Replace with 2 Hextech Ray: computed on the parsed import before commit', () => {
      const before = pool(decks, locks, { [RAY]: 3 });
      // Collection as it would be after Replace (parsed lines: 2 Hextech Ray + Deck 1's other card).
      const afterReplace = computeSharedPool({
        decks,
        locks,
        ownership: makeInput(catalog, { owned: { [RAY]: 2, 'Tempo Card': 2 } }),
      });
      const s = lockedShortfalls(before, afterReplace);
      expect(s).toEqual([{ deckId: 'd1', deckName: 'Kennen Tempo', cardsShort: 1 }]);
      expect(shortfallWarning(s[0])).toBe("'Kennen Tempo' (locked) will be 1 card short.");
      // Cancel: nothing was committed, so the current pool is unchanged.
      expect(pool(decks, locks, { [RAY]: 3 })).toEqual(before);
      // Confirm: Deck 1 stays locked, flagged short.
      expect(afterReplace.byDeck['d1']).toMatchObject({ locked: true, short: true });
    });

    it('SHARE-034 the same lines in Add mode never lower a hold: no warning', () => {
      const before = pool(decks, locks, { [RAY]: 3 });
      const afterAdd = pool(decks, locks, { [RAY]: 5, 'Tempo Card': 4 });
      expect(lockedShortfalls(before, afterAdd)).toEqual([]);
    });

    it('SHARE-034 Undo of an Add import: notice "is now 1 card short"', () => {
      const committed = pool(decks, [lock('d1', '2026-11-23T12:00:00Z')], { [RAY]: 3 });
      const undone = pool(decks, [lock('d1', '2026-11-23T12:00:00Z')], { [RAY]: 2 });
      const s = lockedShortfalls(committed, undone);
      expect(s).toEqual([{ deckId: 'd1', deckName: 'Kennen Tempo', cardsShort: 1 }]);
      expect(shortfallNotice(s[0])).toBe("'Kennen Tempo' (locked) is now 1 card short.");
      expect(undone.byDeck['d1']).toMatchObject({ locked: true, short: true });
    });
  });

  describe('SHARE-020 canLock check order', () => {
    const p = pool([deck1], [], { [RAY]: 3 });
    it('SHARE-020 read-only comes before every other failure', () => {
      expect(canLock(p, deck1, true)).toEqual({ ok: false, reason: 'read-only' });
      expect(lockCheckMessage({ ok: false, reason: 'read-only' })).toBe('This deck is read-only');
    });
    it('SHARE-020 a null pool means ownership unavailable', () => {
      expect(canLock(null, deck1, false)).toEqual({ ok: false, reason: 'ownership-unavailable' });
      expect(lockCheckMessage({ ok: false, reason: 'ownership-unavailable' })).toBe(
        'Ownership unavailable',
      );
    });
  });

  it('SHARE-015 other uses: locked decks in lock order, then unlocked by name, then deckId', () => {
    const z = makeDeck('z', 'Zeta', { main: [[RAY, 1]] });
    const al = makeDeck('al', 'alpha', { main: [[RAY, 1]] });
    const late = makeDeck('late', 'Late Lock', { main: [[RAY, 1]] });
    const early = makeDeck('early', 'Early Lock', { main: [[RAY, 1]] });
    const p = pool(
      [z, al, late, early],
      [lock('late', '2026-11-23T12:00:00Z'), lock('early', '2026-11-23T08:00:00Z')],
      { [RAY]: 4 },
    );
    expect(p.byCard['hextech ray'].uses.map((u) => u.deckName)).toEqual([
      'Early Lock',
      'Late Lock',
      'alpha',
      'Zeta',
    ]);
  });

  it('SHARE-030 lock order is total and deterministic over parseable, unparseable and different-offset lockedAt', () => {
    // Expected order: by parsed time (unparseable after all parseable), then raw string, then deckId.
    const locks = [
      lock('e', '2026-11-23T11:00:00+02:00'), // 09:00Z: earliest
      lock('c', '2026-11-23T10:00:00.000Z'), // 10:00Z, raw string sorts before "…00Z"
      lock('a', '2026-11-23T10:00:00Z'), // 10:00Z
      lock('f', 'garbage'), // unparseable: after every parseable value
      lock('b', 'not-a-date'), // unparseable, same raw string as 'd': deckId decides
      lock('d', 'not-a-date'),
    ];
    const expected = ['e', 'c', 'a', 'f', 'b', 'd'];
    const decks = expected.map((id) => makeDeck(id, `Deck ${id}`, { main: [[RAY, 1]] }));
    const input = makeInput(catalog, { owned: { [RAY]: 3 } });
    const order = (ls: DeckLock[]) => {
      const p = computeSharedPool({ decks, locks: ls, ownership: input });
      return p.byCard['hextech ray'].uses.map((u) => u.deckId);
    };
    const perms: DeckLock[][] = [];
    for (let i = 0; i < locks.length; i++) {
      const rotated = [...locks.slice(i), ...locks.slice(0, i)];
      perms.push(rotated, [...rotated].reverse());
    }
    for (const ls of perms) expect(order(ls)).toEqual(expected);
    // Holds follow that order: the first three locked decks get the 3 owned copies.
    const p = computeSharedPool({ decks, locks: perms[5], ownership: input });
    expect(expected.map((id) => availability(p, id, 'hextech ray').heldByThisDeck)).toEqual([
      1, 1, 1, 0, 0, 0,
    ]);
  });

  it('SHARE-020 a null pool cannot see locks: a locked deck gets ownership-unavailable, not already-locked', () => {
    // Pinned behaviour: with ownership unavailable the pool is null, so canLock can't report
    // 'already-locked'. The caller checks the lock store itself and shows Unlock for a locked deck.
    expect(canLock(null, deck1, false)).toEqual({ ok: false, reason: 'ownership-unavailable' });
    expect(canLock(null, deck1, true)).toEqual({ ok: false, reason: 'read-only' });
  });

  it('SHARE-072 200 decks × 150 entries with 100 locks computes in under 100 ms', () => {
    const names = Array.from({ length: 1200 }, (_, i) => `Card ${i}`);
    const cat = makeCatalog(names);
    const owned = Object.fromEntries(names.map((n, i) => [n, i % 7]));
    const decks = Array.from({ length: 200 }, (_, d) =>
      makeDeck(`deck-${d}`, `Deck ${d}`, {
        main: Array.from({ length: 140 }, (_, e): [string, number] => [
          names[(d * 37 + e) % names.length],
          2,
        ]),
        sideboard: Array.from({ length: 10 }, (_, e): [string, number] => [
          names[(d * 37 + 140 + e) % names.length],
          1,
        ]),
      }),
    );
    const locks = decks
      .slice(0, 100)
      .map((d, i) => lock(d.id, `2026-11-23T${String(i % 24).padStart(2, '0')}:00:00Z`));
    computeSharedPool({ decks, locks, ownership: makeInput(cat, { owned }) }); // warm-up (JIT)
    const input = makeInput(cat, { owned }); // a fresh input: nothing cached (OWN-083)
    const start = performance.now();
    const p = computeSharedPool({ decks, locks, ownership: input });
    const ms = performance.now() - start;
    expect(Object.keys(p.byDeck)).toHaveLength(200);
    expect(ms).toBeLessThan(100);
  });
});
