import { computeDeckOwnership, summarizeDeck } from './deck-ownership-view';
import {
  lockAll,
  makeCatalog,
  nameLock,
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
  canLockName,
  lockCheckMessage,
  lockLosses,
  nameLockCheckMessage,
  settleLocks,
  storedLockState,
} from './shared-pool';
import { migrateLocksV1 } from './name-locks';
import type { CollectionCatalogView, NameLock, OwnershipCard, SharedPool, UserDeck } from './types';

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
  'Gust',
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
/** SPEC-008 v0.6: a deck lock = a name lock on every counted name (SHARE-083, SHARE-084). */
const lock = (deck: UserDeck, at?: string) => lockAll(deck, at);
const use = (deckId: string, deckName: string, need: number, locked: boolean, hold: number, lockedAt: string | null = null) => ({
  deckId,
  deckName,
  need,
  locked,
  hold,
  lockedAt,
});

function pool(
  decks: UserDeck[],
  locks: NameLock[] | null,
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
  locks: NameLock[] | null,
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
    const check = canLock(p, deck1, false, false);
    expect(check).toEqual({ ok: false, reason: 'incomplete', cardsShort: 1 });
    expect(lockCheckMessage(check)).toBe('Lock in needs every card available: 1 card short');
  });

  describe('AC 2: 3 owned, Deck 1 locked (SHARE-031, SHARE-040, SHARE-041, SHARE-042, SHARE-043)', () => {
    const decks = [deck1, deck2];
    const locks = lock(deck1);

    it('SHARE-031 Deck 1 holds 3 and shows "3 of 3 locked in" with "Locked in by this deck: 3"', () => {
      const v = view(deck1, decks, locks, { [RAY]: 3 });
      const t = tile(v, 'main', 'hextech ray');
      expect(t).toMatchObject({
        allocated: 3,
        state: 'full',
        label: '3 of 3 locked in',
        heldByThisDeck: 3,
      });
      expect(v.lock).toMatchObject({ locked: true, complete: true, lockedNames: ['hextech ray', 'tempo card'] });
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
      expect(t.otherUses).toEqual([use('d1', 'Kennen Tempo', 3, true, 3, '2026-11-23T10:00:00Z')]);
      expect(v.missing).toEqual([{ zone: 'main', cardKey: 'hextech ray', name: RAY, missing: 3 }]);
      expect(v.missingText).toBe('Main Deck:\n3 Hextech Ray');
    });

    it('SHARE-020 Deck 2 cannot be locked: 1 card short', () => {
      const p = pool(decks, locks, { [RAY]: 3 });
      const check = canLock(p, deck2, false, false);
      expect(check).toEqual({ ok: false, reason: 'incomplete', cardsShort: 1 });
      expect(lockCheckMessage(check)).toBe('Lock in needs every card available: 1 card short');
      expect(canLock(p, deck1, false, true)).toEqual({ ok: false, reason: 'already-locked' });
    });
  });

  it('AC 3 (SHARE-011) 4 owned, Deck 1 locked: Deck 2 shows 1 of 3 available, breakdown 4 / 3 / 1 / 3', () => {
    const v = view(deck2, [deck1, deck2], lock(deck1), { [RAY]: 4 });
    const t = tile(v, 'main', 'hextech ray');
    expect(t).toMatchObject({ allocated: 1, label: '1 of 3 available', state: 'partial' });
    expect(t.fill).toBe(1 / 3);
    expect([t.ownedForDecks, t.lockedByOthers, t.available, t.cardRequired]).toEqual([4, 3, 1, 3]);
  });

  it('AC 4 (SHARE-023) unlocking releases: both decks see 3 of 3 available and Deck 2 can be locked', () => {
    const p = pool([deck1, deck2], [], { [RAY]: 3 });
    expect(availability(p, 'd2', 'hextech ray').available).toBe(3);
    expect(availability(p, 'd2', 'hextech ray').otherUses).toEqual([use('d1', 'Kennen Tempo', 3, false, 0)]);
    expect(canLock(p, deck2, false, false)).toEqual({ ok: true });
  });

  it('AC 5 (SHARE-024) delete releases; Undo restores the deck unlocked behind the newer lock', () => {
    // Deck 1 deleted: only Deck 2 in the store, so its old lock is an orphan and ignored (SHARE-062).
    const afterDelete = pool([deck2], lock(deck1), { [RAY]: 3 });
    expect(availability(afterDelete, 'd2', 'hextech ray')).toMatchObject({
      available: 3,
      otherUses: [],
    });
    // Deck 2 locked, then Undo restores Deck 1 without a lock.
    const afterUndo = pool([deck1, deck2], lock(deck2, '2026-11-23T12:00:00Z'), { [RAY]: 3 });
    expect(afterUndo.byDeck['d1'].locked).toBe(false);
    expect(availability(afterUndo, 'd1', 'hextech ray').available).toBe(0);
    expect(availability(afterUndo, 'd2', 'hextech ray').heldByThisDeck).toBe(3);
  });

  it('AC 6 (SHARE-002, SHARE-013) Chosen Champion and Main share one pool', () => {
    const kaisa = "Kai'Sa, Survivor";
    const deckA = makeDeck('dA', 'Deck A', { champion: [[kaisa, 1]], main: [[kaisa, 2]] });
    const deckB = makeDeck('dB', 'Deck B', { champion: [[kaisa, 1]], main: [[kaisa, 1]] });
    const decks = [deckA, deckB];
    const p = pool(decks, lock(deckA), { [kaisa]: 4 });
    expect(availability(p, 'dA', 'kaisa survivor').heldByThisDeck).toBe(3);
    const v = view(deckB, decks, lock(deckA), { [kaisa]: 4 });
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
      const v = view(b, [a, b], lock(a), { [legend]: 1, [champ]: 2 });
      expect(tile(v, 'legend', 'kennen heart of the tempest')).toMatchObject({
        label: '0 of 1 available',
        state: 'none',
      });
      expect(v.lock?.complete).toBe(false);
      const v2 = view(b, [a, b], lock(a), { [legend]: 2, [champ]: 2 });
      expect(tile(v2, 'legend', 'kennen heart of the tempest').label).toBe('1 of 1 available');
    });

    it('SHARE-002 the Legend never shares a pool with Kennen, Storm of Shuriken', () => {
      const p = pool([a, b], lock(a), { [legend]: 1, [champ]: 5 });
      expect(p.byCard['kennen heart of the tempest'].ownedForDecks).toBe(1);
      expect(p.byCard['kennen storm of shuriken'].ownedForDecks).toBe(5);
      expect(availability(p, 'l2', 'kennen storm of shuriken').available).toBe(4);
    });
  });

  it('AC 8 (SHARE-001) Battlefield: 0 of 1 available, "· 1 locked", locked deck listed "needs 1 · holds 1"', () => {
    const locked = makeDeck('b1', 'Locked Field', { battlefields: [['Zaun Warrens', 1]] });
    const open = makeDeck('b2', 'Open Field', { battlefields: [['Zaun Warrens', 1]] });
    const t = tile(
      view(open, [locked, open], lock(locked), { 'Zaun Warrens': 1 }),
      'battlefields',
      'zaun warrens',
    );
    expect(t).toMatchObject({
      label: '0 of 1 available',
      sharedLabel: 'Also in 1 other deck · 1 locked',
    });
    expect(t.otherUses).toEqual([use('b1', 'Locked Field', 1, true, 1, '2026-11-23T10:00:00Z')]);
  });

  it('AC 9 superseded / AC 33 (SHARE-032, SHARE-090) a conflict keeps the earlier lock whole; the later holds 0 and is not locked', () => {
    const decks = [deck1, deck3];
    const locks = [nameLock('d1', 'hextech ray', '2026-11-23T10:00:00Z'), nameLock('d3', 'hextech ray', '2026-11-23T11:00:00Z')];
    const p = pool(decks, locks, { [RAY]: 4 });
    expect(availability(p, 'd1', 'hextech ray')).toMatchObject({ heldByThisDeck: 3, nameLocked: true });
    expect(availability(p, 'd3', 'hextech ray')).toMatchObject({ heldByThisDeck: null, nameLocked: false, available: 1 });
    expect(p.byCard['hextech ray']).toMatchObject({ heldTotal: 3, free: 1 });
    // A locked name is never short: no "Locked · n cards short" exists (SHARE-033 withdrawn).
    const v3 = view(deck3, decks, locks, { [RAY]: 4 });
    expect(tile(v3, 'main', 'hextech ray').label).toBe('1 of 2 available');
    expect(summarizeDeck(deck3, v3, null, null).lockBadge).toBeNull();
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
      locks: lock(deck1),
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

  it('AC 12 (SHARE-006, SHARE-014, SHARE-020) runes the user does not own block lock in like any card', () => {
    const d = makeDeck('r1', 'Rune Deck', {
      main: [['Tempo Card', 2]],
      runes: [
        ['Chaos Rune', 9],
        ['Order Rune', 3],
      ],
    });
    const p = pool([d], [], {});
    expect(p.byDeck['r1'].complete).toBe(false);
    const check = canLock(p, d, false, false);
    expect(check).toEqual({ ok: false, reason: 'incomplete', cardsShort: 2 });
    expect(lockCheckMessage(check)).toBe('Lock in needs every card available: 2 cards short');
    // After an Add import of 9 Chaos Rune and 3 Order Rune: complete, Lock in enabled.
    const after = pool([d], [], { 'Chaos Rune': 9, 'Order Rune': 3 });
    expect(after.byDeck['r1'].complete).toBe(true);
    expect(canLock(after, d, false, false)).toEqual({ ok: true });
  });

  it('AC 13 (SHARE-061) unreadable lock store: counts ignore locks and Lock in is disabled', () => {
    const p = pool([deck1, deck2], null, { [RAY]: 3 });
    expect(p.locksIgnored).toBe(true);
    expect(availability(p, 'd2', 'hextech ray').available).toBe(3);
    expect(canLock(p, deck2, false, false)).toEqual({ ok: false, reason: 'locks-unreadable' });
  });

  it('AC 14 (SHARE-030, SHARE-035, SHARE-070; v0.6) same lockedAt: settleLocks and computeSharedPool keep a1, drop b2; pure and deterministic', () => {
    const a = makeDeck('a1-deck', 'Zed', { main: [[RAY, 3]] });
    const b = makeDeck('b2-deck', 'Ahri', { main: [[RAY, 3]] });
    const at = '2026-11-23T10:00:00Z';
    const input = makeInput(catalog, { owned: { [RAY]: 4 } });
    const locks = [nameLock('b2-deck', 'hextech ray', at), nameLock('a1-deck', 'hextech ray', at)];
    const snapshot = JSON.stringify({ a, b, input, locks });
    const storageBefore = localStorage.length;
    const owned = () => 4;
    expect(settleLocks(locks, owned, [b, a])).toEqual(settleLocks(locks, owned, [b, a]));
    expect(settleLocks(locks, owned, [b, a])).toEqual([nameLock('a1-deck', 'hextech ray', at)]);
    const p1 = computeSharedPool({ decks: [b, a], locks, ownership: input });
    const p2 = computeSharedPool({ decks: [b, a], locks, ownership: input });
    expect(p1).toEqual(p2);
    expect(availability(p1, 'a1-deck', 'hextech ray').heldByThisDeck).toBe(3);
    expect(availability(p1, 'b2-deck', 'hextech ray')).toMatchObject({ heldByThisDeck: null, nameLocked: false });
    expect(JSON.stringify({ a, b, input, locks })).toBe(snapshot);
    expect(localStorage.length).toBe(storageBefore);
  });

  describe('AC 15: empty and runes-only decks; one ownership group per deck (SHARE-006, SHARE-014, SHARE-020, SHARE-050, SHARE-051)', () => {
    const runeTest = makeDeck('rt', 'Rune Test', {
      runes: [
        ['Chaos Rune', 9],
        ['Order Rune', 3],
      ],
    });
    const emptyDraft = makeDeck('ed', 'Empty Draft', {});
    const rayOnly = makeDeck('ro', 'Ray Only', { main: [[RAY, 3]] });
    const decks = [deck1, runeTest, emptyDraft, rayOnly];
    // v0.6: Ray Only is not locked (Deck 1, locked earlier, holds all 3; a lock on Ray Only would not fit).
    const locks = lock(deck1, '2026-11-23T09:00:00Z');
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

    it('SHARE-050 Rune Test reads "0 of 12 copies available", Empty Draft "No cards to count"; no badge, group none', () => {
      expect(summary(runeTest)).toMatchObject({
        ownershipLine: '0 of 12 copies available',
        lockBadge: null,
        ownershipFilter: 'none',
      });
      expect(summary(emptyDraft)).toMatchObject({
        ownershipLine: 'No cards to count',
        lockBadge: null,
        ownershipFilter: 'none',
      });
    });

    it('SHARE-051 v0.6 Ray Only (unlocked, 0 available) reads "0 of 3 copies available", no badge, group none', () => {
      expect(summary(rayOnly)).toMatchObject({
        ownershipLine: '0 of 3 copies available',
        lockBadge: null,
        ownershipFilter: 'none',
      });
    });

    it('SHARE-051 own / lock filters: none lists all three, partial and ready none, none+locked none; Deck 1 is locked', () => {
      const own = (f: string) =>
        [runeTest, emptyDraft, rayOnly].filter((d) => summary(d).ownershipFilter === f);
      expect(own('none').map((d) => d.name)).toEqual(['Rune Test', 'Empty Draft', 'Ray Only']);
      expect(own('partial')).toEqual([]);
      expect(own('ready')).toEqual([]);
      expect(own('none').filter(isLocked)).toEqual([]);
      expect(summary(deck1).ownershipFilter).toBe('locked');
      expect(isLocked(deck1)).toBe(true);
    });

    it('SHARE-020 Rune Test is incomplete (2 cards short) with darkened 0-of rune tiles; Empty Draft is no-cards', () => {
      const runeCheck = canLock(shared, runeTest, false, false);
      expect(runeCheck).toEqual({ ok: false, reason: 'incomplete', cardsShort: 2 });
      expect(lockCheckMessage(runeCheck)).toBe('Lock in needs every card available: 2 cards short');
      const v = computeDeckOwnership(
        runeTest,
        { status: 'ok', input, shared },
        catalog,
        null,
        TODAY,
      );
      expect(v.sections[4].cards.map((c) => [c.label, c.state])).toEqual([
        ['0 of 9 available', 'none'],
        ['0 of 3 available', 'none'],
      ]);
      const emptyCheck = canLock(shared, emptyDraft, false, false);
      expect(emptyCheck).toEqual({ ok: false, reason: 'no-cards' });
      expect(lockCheckMessage(emptyCheck)).toBe('Lock in needs at least one card');
    });

    it('SHARE-006 owning Chaos Rune ×9 and Order Rune ×3 makes Rune Test ready and lockable', () => {
      const owned = makeInput(catalog, {
        owned: { ...others, [RAY]: 3, 'Chaos Rune': 9, 'Order Rune': 3 },
      });
      const p = computeSharedPool({ decks, locks, ownership: owned });
      const v = computeDeckOwnership(
        runeTest,
        { status: 'ok', input: owned, shared: p },
        catalog,
        null,
        TODAY,
      );
      expect(summarizeDeck(runeTest, v, null, null).ownershipFilter).toBe('ready');
      expect(canLock(p, runeTest, false, false)).toEqual({ ok: true });
    });
  });

  describe('ACs 25 to 35 (v0.6, H-665): card-name locks (SHARE-080…094)', () => {
    // Tempo needs Hextech Ray ×3 and Gust ×2; Control Hextech Ray ×3; Aggro Hextech Ray ×2 and Gust ×2.
    const tempo = makeDeck('d1', 'Kennen Tempo', { main: [[RAY, 3], ['Gust', 2]] });
    const control = makeDeck('d2', 'Kennen Control', { main: [[RAY, 3]] });
    const aggro = makeDeck('d3', 'Kennen Aggro', { main: [[RAY, 2], ['Gust', 2]] });
    const decks = [tempo, control, aggro];
    const p = (locks: NameLock[], owned: Record<string, number> = { [RAY]: 3, Gust: 2 }) =>
      computeSharedPool({ decks, locks, ownership: makeInput(catalog, { owned }) });
    const v = (d: UserDeck, locks: NameLock[], owned: Record<string, number> = { [RAY]: 3, Gust: 2 }) => {
      const input = makeInput(catalog, { owned });
      return computeDeckOwnership(d, { status: 'ok', input, shared: computeSharedPool({ decks, locks, ownership: input }) }, catalog, null, TODAY);
    };
    const rayLock = nameLock('d1', 'hextech ray', '2026-11-26T10:00:00Z');
    const gustLock = nameLock('d1', 'gust', '2026-11-26T10:05:00Z');

    it('AC 25 (SHARE-080, SHARE-082, SHARE-094) one name locked: "3 of 3 locked in" with the lock flag; the deck is not locked; Control sees 0 of 3', () => {
      const t = tile(v(tempo, [rayLock]), 'main', 'hextech ray');
      expect(t).toMatchObject({ label: '3 of 3 locked in', nameLocked: true, heldByThisDeck: 3, state: 'full' });
      expect(tile(v(tempo, [rayLock]), 'main', 'gust')).toMatchObject({ label: '2 of 2 available', nameLocked: false });
      const vt = v(tempo, [rayLock]);
      expect(vt.lock).toMatchObject({ locked: false, lockedNames: ['hextech ray'], lockedAt: null });
      expect(summarizeDeck(tempo, vt, null, null)).toMatchObject({ lockBadge: null, ownershipFilter: 'ready' });
      const c = tile(v(control, [rayLock]), 'main', 'hextech ray');
      expect(c).toMatchObject({ label: '0 of 3 available', lockedByOthers: 3 });
      expect(canLockName(p([rayLock]), tempo, 'hextech ray', false, true)).toEqual({ ok: false, reason: 'already-locked' });
    });

    it('AC 26 (SHARE-081) a name is lockable only when fully available: "Lock needs every copy available: 0 of 3" / "2 of 3"', () => {
      const check = canLockName(p([rayLock]), control, 'hextech ray', false, false);
      expect(check).toEqual({ ok: false, reason: 'not-full', available: 0, need: 3 });
      expect(nameLockCheckMessage(check)).toBe('Lock needs every copy available: 0 of 3');
      for (const d of [tempo, control]) {
        const c2 = canLockName(p([], { [RAY]: 2, Gust: 2 }), d, 'hextech ray', false, false);
        expect(nameLockCheckMessage(c2)).toBe('Lock needs every copy available: 2 of 3');
      }
      expect(canLockName(p([]), tempo, 'hextech ray', false, false)).toEqual({ ok: true });
      expect(canLockName(p([]), tempo, 'hextech ray', true, false)).toEqual({ ok: false, reason: 'read-only' });
      expect(canLockName(null, tempo, 'hextech ray', false, false)).toEqual({ ok: false, reason: 'ownership-unavailable' });
      expect(canLockName(computeSharedPool({ decks, locks: null, ownership: makeInput(catalog, {}) }), tempo, 'gust', false, false)).toEqual({
        ok: false,
        reason: 'locks-unreadable',
      });
      expect(canLockName(p([]), tempo, 'zaun warrens', false, false)).toEqual({ ok: false, reason: 'not-in-deck' });
    });

    it('AC 27 (SHARE-083) the last name locks the deck: locked, "Locked" badge, group locked, latest lockedAt', () => {
      const vt = v(tempo, [rayLock, gustLock]);
      expect(vt.lock).toMatchObject({ locked: true, lockedAt: gustLock.lockedAt, lockedNames: ['hextech ray', 'gust'] });
      expect(summarizeDeck(tempo, vt, null, null)).toMatchObject({ lockBadge: 'Locked', ownershipFilter: 'locked', ownershipLine: '5 of 5 copies locked in' });
      expect(canLock(p([rayLock, gustLock]), tempo, false, true)).toEqual({ ok: false, reason: 'already-locked' });
    });

    it('AC 28 (SHARE-084) unlocking Tempo leaves Aggro\'s Hextech Ray lock; Control sees 3 of 3', () => {
      const owned = { [RAY]: 5, Gust: 2 };
      const aggroRay = nameLock('d3', 'hextech ray', '2026-11-26T09:00:00Z');
      const locked = p([rayLock, gustLock, aggroRay], owned);
      expect(Object.values(locked.byCard).find((c) => c.cardKey === 'hextech ray')?.heldTotal).toBe(5);
      const after = p([aggroRay], owned); // Tempo's names removed, Aggro's kept
      expect(after.byCard['hextech ray'].heldTotal).toBe(2);
      expect(availability(after, 'd2', 'hextech ray').available).toBe(3);
      expect(availability(after, 'd3', 'hextech ray').nameLocked).toBe(true);
    });

    it('AC 29 (SHARE-085) unlocking Gust in a locked deck: not locked, Hextech Ray stays "3 of 3 locked in", Gust "2 of 2 available"', () => {
      const vt = v(tempo, [rayLock]);
      expect(vt.lock?.locked).toBe(false);
      expect(tile(vt, 'main', 'hextech ray').label).toBe('3 of 3 locked in');
      expect(tile(vt, 'main', 'gust')).toMatchObject({ label: '2 of 2 available', nameLocked: false });
    });

    it('AC 30 (SHARE-087) a removal covered by free copies loses no lock', () => {
      const before = p([rayLock], { [RAY]: 5, Gust: 2 });
      expect(before.byCard['hextech ray'].free).toBe(2);
      expect(lockLosses(before, p([rayLock], { [RAY]: 3, Gust: 2 }))).toEqual([]);
      // Undo of an Add (5 → 3): the same.
      expect(lockLosses(p([rayLock], { [RAY]: 5, Gust: 2 }), p([rayLock], { [RAY]: 3, Gust: 2 }))).toEqual([]);
    });

    it('AC 31 / AC 21 (SHARE-087…090) a Replace leaving 2 Hextech Ray loses Tempo\'s Hextech Ray lock (3 copies) and its locked status', () => {
      const before = p([rayLock, gustLock]);
      const after = p([rayLock, gustLock], { [RAY]: 2, Gust: 2 });
      expect(lockLosses(before, after)).toEqual([
        { deckId: 'd1', deckName: 'Kennen Tempo', cardKey: 'hextech ray', cardName: RAY, copies: 3, deckUnlocks: true },
      ]);
      // AC 21: 2 Hextech Ray and 3 Gust → only Hextech Ray is listed although Σ owned is unchanged.
      expect(lockLosses(before, p([rayLock, gustLock], { [RAY]: 2, Gust: 3 })).map((l) => l.cardKey)).toEqual(['hextech ray']);
      // AC 21: 3 Hextech Ray and 2 Gust → no lock affected.
      expect(lockLosses(before, p([rayLock, gustLock], { [RAY]: 3, Gust: 2 }))).toEqual([]);
      // After confirming (the lock dropped): Gust stays locked, Hextech Ray reads 2 of 3 available.
      const vt = v(tempo, [gustLock], { [RAY]: 2, Gust: 2 });
      expect(vt.lock?.locked).toBe(false);
      expect(tile(vt, 'main', 'gust').nameLocked).toBe(true);
      expect(tile(vt, 'main', 'hextech ray').label).toBe('2 of 3 available');
    });

    it('SHARE-090 two decks hold one name and copies run short: the newest lock drops first, whole; losses list it first', () => {
      const ctrl = nameLock('d2', 'hextech ray', '2026-11-26T11:00:00Z');
      const before = p([rayLock, ctrl], { [RAY]: 6, Gust: 2 });
      expect(lockLosses(before, p([rayLock, ctrl], { [RAY]: 4, Gust: 2 }))).toEqual([
        { deckId: 'd2', deckName: 'Kennen Control', cardKey: 'hextech ray', cardName: RAY, copies: 3, deckUnlocks: true },
      ]);
      expect(lockLosses(before, p([rayLock, ctrl], { [RAY]: 2, Gust: 2 })).map((l) => l.deckId)).toEqual(['d2', 'd1']);
    });

    it('SHARE-062 a name lock for a name not in the deck, or a deck not in the store, is ignored', () => {
      const pool1 = p([nameLock('d2', 'gust'), nameLock('gone', 'hextech ray')]);
      expect(pool1.byCard['gust'].heldTotal).toBe(0);
      expect(pool1.byCard['hextech ray'].heldTotal).toBe(0);
    });

    it('AC 34 (SHARE-092) migrateLocksV1: a v1 deck lock becomes a lock on every name with its lockedAt; orphans dropped; a short name gets none', () => {
      const at = '2026-11-23T10:00:00Z';
      const records = (owned: Record<string, number>) => ({
        collection: makeInput(catalog, { owned }).collection,
        tags: null,
      });
      const m = migrateLocksV1([{ deckId: 'd1', lockedAt: at }, { deckId: 'gone', lockedAt: at }], decks, records({ [RAY]: 3, Gust: 2 }), 'NOW');
      expect(m).toEqual({
        schemaVersion: 2,
        updatedAt: 'NOW',
        locks: [nameLock('d1', 'hextech ray', at), nameLock('d1', 'gust', at)],
      });
      // Tempo is locked exactly as before; Control still sees 0 of 3.
      const pm = p(m.locks);
      expect(pm.byDeck['d1'].locked).toBe(true);
      expect(availability(pm, 'd2', 'hextech ray').available).toBe(0);
      // Short on Gust (1 owned): Hextech Ray locked, Gust not; partly locked.
      const short = migrateLocksV1([{ deckId: 'd1', lockedAt: at }], decks, records({ [RAY]: 3, Gust: 1 }), 'NOW');
      expect(short.locks).toEqual([nameLock('d1', 'hextech ray', at)]);
      // Unreadable collection: every name keeps its lock.
      expect(migrateLocksV1([{ deckId: 'd1', lockedAt: at }], decks, null, 'NOW').locks).toHaveLength(2);
    });
  });

  describe('SHARE-020 canLock check order', () => {
    const p = pool([deck1], [], { [RAY]: 3 });
    it('SHARE-020 read-only comes before every other failure', () => {
      expect(canLock(p, deck1, true, false)).toEqual({ ok: false, reason: 'read-only' });
      expect(lockCheckMessage({ ok: false, reason: 'read-only' })).toBe('This deck is read-only');
    });
    it('SHARE-020 a null pool means ownership unavailable', () => {
      expect(canLock(null, deck1, false, false)).toEqual({ ok: false, reason: 'ownership-unavailable' });
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
      [...lock(late, '2026-11-23T12:00:00Z'), ...lock(early, '2026-11-23T08:00:00Z')],
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
    const k = 'hextech ray';
    const locks = [
      nameLock('e', k, '2026-11-23T11:00:00+02:00'), // 09:00Z: earliest
      nameLock('c', k, '2026-11-23T10:00:00.000Z'), // 10:00Z, raw string sorts before "…00Z"
      nameLock('a', k, '2026-11-23T10:00:00Z'), // 10:00Z
      nameLock('f', k, 'garbage'), // unparseable: after every parseable value
      nameLock('b', k, 'not-a-date'), // unparseable, same raw string as 'd': deckId decides
      nameLock('d', k, 'not-a-date'),
    ];
    const expected = ['e', 'c', 'a', 'f', 'b', 'd'];
    const decks = expected.map((id) => makeDeck(id, `Deck ${id}`, { main: [[RAY, 1]] }));
    const input = makeInput(catalog, { owned: { [RAY]: 6 } });
    const order = (ls: NameLock[]) => {
      const p = computeSharedPool({ decks, locks: ls, ownership: input });
      return p.byCard['hextech ray'].uses.map((u) => u.deckId);
    };
    const perms: NameLock[][] = [];
    for (let i = 0; i < locks.length; i++) {
      const rotated = [...locks.slice(i), ...locks.slice(0, i)];
      perms.push(rotated, [...rotated].reverse());
    }
    for (const ls of perms) expect(order(ls)).toEqual(expected);
    // v0.6 (SHARE-090): with 3 owned the first three locks in that order keep their copies, the later ones drop whole.
    const p = computeSharedPool({ decks, locks: perms[5], ownership: makeInput(catalog, { owned: { [RAY]: 3 } }) });
    expect(expected.map((id) => availability(p, id, 'hextech ray').heldByThisDeck)).toEqual([1, 1, 1, null, null, null]);
  });

  describe('SPEC-008 AC 19: ownership unavailable, locked deck (SHARE-020, SHARE-051, SHARE-053)', () => {
    const locks = lock(deck1, '2026-11-23T10:00:00Z');
    const unavailable = { status: 'unavailable' as const, locks };

    it('SHARE-053 (a)/(b)/(d) Kennen Tempo: stored lock state, "Locked", line and group unavailable', () => {
      const v = computeDeckOwnership(deck1, unavailable, catalog, null, TODAY);
      expect(v.lock).toEqual({
        deckId: 'd1',
        locked: true,
        lockedAt: '2026-11-23T10:00:00Z',
        lockedNames: ['hextech ray', 'tempo card'],
        complete: false,
      });
      expect(summarizeDeck(deck1, v, null, null)).toMatchObject({
        lockBadge: 'Locked',
        ownershipLine: 'Ownership unavailable',
        ownershipFilter: 'unavailable',
      });
    });

    it('SHARE-020 / SHARE-053 (c) canLock(null, deck1, false, true) is already-locked; Unlock stays', () => {
      expect(canLock(null, deck1, false, true)).toEqual({ ok: false, reason: 'already-locked' });
      expect(lockCheckMessage({ ok: false, reason: 'already-locked' })).toBeNull();
      // already-locked comes before every other check, read-only included.
      expect(canLock(null, deck1, true, true)).toEqual({ ok: false, reason: 'already-locked' });
    });

    it('SHARE-020 / SHARE-053 Kennen Control: lock null, same line and group, ownership-unavailable', () => {
      const v = computeDeckOwnership(deck2, unavailable, catalog, null, TODAY);
      expect(v.lock).toBeNull();
      expect(summarizeDeck(deck2, v, null, null)).toMatchObject({
        lockBadge: null,
        ownershipLine: 'Ownership unavailable',
        ownershipFilter: 'unavailable',
      });
      const check = canLock(null, deck2, false, false);
      expect(check).toEqual({ ok: false, reason: 'ownership-unavailable' });
      expect(lockCheckMessage(check)).toBe('Ownership unavailable');
    });

    it('SHARE-053 (a) / SHARE-061 lock store also unreadable: both decks have lock null', () => {
      for (const d of [deck1, deck2]) {
        const v = computeDeckOwnership(d, { status: 'unavailable', locks: null }, catalog, null, TODAY);
        expect(v.lock).toBeNull();
      }
    });

    it('SHARE-053 (a) v0.6 stored state: locked only when every name has a stored lock; lockedAt = the latest; a partly locked deck is null', () => {
      expect(
        storedLockState([nameLock('d1', 'hextech ray', '2026-11-24T10:00:00Z'), nameLock('d1', 'tempo card', '2026-11-23T10:00:00Z')], deck1)
          ?.lockedAt,
      ).toBe('2026-11-24T10:00:00Z');
      expect(storedLockState([nameLock('d1', 'hextech ray')], deck1)).toBeNull();
      expect(storedLockState(lock(deck1), deck2)).toBeNull();
      // OWN-121 (a): the tile still shows the lock icon of a stored name lock while ownership is unavailable.
      const v = computeDeckOwnership(deck1, { status: 'unavailable', locks: [nameLock('d1', 'hextech ray')] }, catalog, null, TODAY);
      expect(tile(v, 'main', 'hextech ray').nameLocked).toBe(true);
      expect(v.lock).toBeNull();
    });
  });

  it('SHARE-030 / SPEC-008 AC 20: unparseable lockedAt sorts after every parseable one, then by raw string', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const decks = ids.map((id) => makeDeck(id, `Deck ${id}`, { main: [[RAY, 1]] }));
    const locks = [
      nameLock('a', 'hextech ray', '2026-11-23T10:00:00Z'),
      nameLock('b', 'hextech ray', 'yesterday'),
      nameLock('c', 'hextech ray', '2026-11-23T09:00:00Z'),
      nameLock('d', 'hextech ray', 'soon'),
    ];
    const p = pool(decks, locks, { [RAY]: 4 });
    expect(p.byCard['hextech ray'].uses.map((u) => u.deckId)).toEqual(['c', 'a', 'd', 'b']);
    // b is still locked and not short: its tile badge is "Locked" (the date text is SHARE-041, UI).
    const vb = computeDeckOwnership(
      decks[1],
      { status: 'ok', input: makeInput(catalog, { owned: { [RAY]: 4 } }), shared: p },
      catalog,
      null,
      TODAY,
    );
    expect(vb.lock).toMatchObject({ locked: true, lockedAt: 'yesterday' });
    expect(summarizeDeck(decks[1], vb, null, null).lockBadge).toBe('Locked');
  });

  it('SHARE-072 200 decks × 150 entries with 100 fully locked decks (15,000 name locks) computes in under 100 ms', () => {
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
      .flatMap((d, i) => lockAll(d, `2026-11-23T${String(i % 24).padStart(2, '0')}:00:00Z`));
    // H-420: the hard check counts work, not wall-clock time (which fails when the machine is busy).
    // One deckOwnership per distinct counted cardKey (each reads collection.cards once) and a bounded
    // number of catalog lookups per card, whatever the number of decks and locks.
    const keys = new Set(decks.flatMap((d) => [...d.main, ...d.sideboard].map((e) => e.cardKey))).size;
    let collectionReads = 0;
    let catalogReads = 0;
    const counting = <T extends object>(t: T, bump: () => void) =>
      new Proxy(t, { get: (o, p, r) => (bump(), Reflect.get(o, p, r)) });
    const plain = makeInput({ ...cat, cards: counting(cat.cards, () => catalogReads++) }, { owned });
    const counted = {
      ...plain,
      collection: { ...plain.collection, cards: counting(plain.collection.cards, () => collectionReads++) },
    };
    const p = computeSharedPool({ decks, locks, ownership: counted });
    expect(Object.keys(p.byDeck)).toHaveLength(200);
    expect(Object.keys(p.byCard)).toHaveLength(keys);
    expect(collectionReads).toBeLessThanOrEqual(keys);
    expect(catalogReads).toBeLessThanOrEqual(3 * keys); // 2 per card today; 200 decks × 1,200 would be 240,000
    // Gross-regression guard only: best of 3 runs against 3× the 100 ms laptop budget, so CPU load from
    // other processes can't fail it while a real slowdown (e.g. quadratic work) still does.
    computeSharedPool({ decks, locks, ownership: makeInput(cat, { owned }) }); // warm-up (JIT)
    let best = Infinity;
    for (let i = 0; i < 3; i++) {
      const input = makeInput(cat, { owned }); // a fresh input: nothing cached (OWN-083)
      const start = performance.now();
      computeSharedPool({ decks, locks, ownership: input });
      best = Math.min(best, performance.now() - start);
    }
    expect(best).toBeLessThan(300);
  }, 30_000);
});
