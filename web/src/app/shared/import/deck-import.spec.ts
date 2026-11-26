/**
 * SPEC-006 Deck Import review and draft (H-253): pure logic, named by requirement and acceptance criterion.
 * Card data is a small hand-made catalog with the SPEC-001 attributes the ACs assume (Deck Import, "Acceptance
 * criteria" preamble): categories, `isChampionUnit`, `championTag`, `isSignature`.
 */
import { makeCard } from '../../core/decks/engine-fixtures';
import type { CardCategory, CollectionCatalogView, PlayableCard, Printing } from '../../core/decks/types';
import {
  DECK_REVIEW_TEXT,
  type DeckReviewState,
  EMPTY_REVIEW_STATE,
  type PreparedDeck,
  deckSource,
  displayDate,
  prepareDeckImport,
  reviewDeck,
} from './deck-import';
import { parseCardText, sourceLines } from './parse-card-list';

const TODAY = new Date(2026, 10, 23); // local Nov 23, 2026

function card(name: string, category: CardCategory, extra: Partial<PlayableCard> = {}) {
  const { card: c, printings } = makeCard({ name, category });
  return { card: { ...c, ...extra }, printings };
}

const LONG_LEGEND = 'Kennen, Heart of the Tempest and the Very Long Name That Goes On and On Beyond Eighty Chars';

function makeTestCatalog(): CollectionCatalogView {
  const kennen = { championTag: 'Kennen' };
  const riven = { championTag: 'Riven' };
  const entries = [
    card('Kennen, Heart of the Tempest', 'legend', kennen),
    card('Kennen, Storm of Shuriken', 'unit', { ...kennen, isChampionUnit: true, isSignature: false }),
    card('Kennen, Second Form', 'champion', { ...kennen, isSignature: false }),
    card('Riven, The Exile', 'legend', riven),
    card('Riven, Broken Blade', 'champion', { ...riven, isSignature: false }),
    card(LONG_LEGEND, 'legend'),
    card('Lightning Rush', 'spell'),
    card('Gust', 'spell'),
    card('Hextech Ray', 'spell'),
    card("An Offer You Can't Refuse", 'spell'),
    card('Decree of Unity', 'spell'),
    card('Nocturne, Horrifying', 'unit', { isChampionUnit: false }),
    card('Rhasa the Sunderer', 'unit', { isChampionUnit: false }),
    card('Chaos Rune', 'rune'),
    card('Order Rune', 'rune'),
    card('Calm Rune', 'rune'),
    card('Minefield', 'battlefield'),
    card('Veiled Temple', 'battlefield'),
    card('Zaun Warrens', 'battlefield'),
    card('Spark Token', 'token'),
    card('Mystery Card', 'unknown'),
  ];
  const catalog: CollectionCatalogView = { catalogVersion: '0.3+test', sets: [], cards: {}, printings: {} };
  for (const e of entries) {
    catalog.cards[e.card.cardKey] = e.card;
    for (const p of e.printings) catalog.printings[p.printingId] = p;
  }
  // SPEC-003 fixture F1-style codes (hypothetical collector numbers).
  const add = (printingId: string, cardKey: string, setCode: string, collectorNumber: string) =>
    (catalog.printings[printingId] = {
      printingId,
      cardKey,
      setCode,
      collectorNumber,
      publicCode: null,
      rarity: null,
      variant: { kind: 'unknown', label: null, evidence: null },
      art: { thumbnailUrl: null, fullUrl: null, artist: null },
    } satisfies Printing);
  add('rad-001', 'lightning rush', 'RAD', '001');
  add('rad-001a', 'lightning rush', 'RAD', '001a');
  add('ogn-299', 'kennen heart of the tempest', 'OGN', '299');
  return catalog;
}

const CATALOG = makeTestCatalog();

const prep = (text: string, catalog = CATALOG): PreparedDeck =>
  prepareDeckImport(parseCardText(text), sourceLines(text), catalog);
const review = (p: PreparedDeck, s: Partial<DeckReviewState> = {}, today = TODAY) =>
  reviewDeck(p, { ...EMPTY_REVIEW_STATE, ...s }, today);
const qtyOf = (list: { cardKey: string; qty: number }[], key: string) => list.find((c) => c.cardKey === key)?.qty;

const KENNEN_RIOT = [
  'Legend:',
  '1 Kennen, Heart of the Tempest',
  'Champion:',
  '1 Kennen, Storm of Shuriken',
  'Main Deck:',
  "1 An Offer You Can't Refuse",
  '3 Lightning Rush',
  '3 Nocturne, Horrifying',
  '3 Rhasa the Sunderer',
  'Battlefields:',
  '1 Minefield',
  '1 Veiled Temple',
  '1 Zaun Warrens',
  'Rune Pool:',
  '9 Chaos Rune',
  '3 Order Rune',
  'Sideboard:',
  "1 An Offer You Can't Refuse",
  '2 Gust',
].join('\n');

describe('SPEC-006 Deck Import review (H-253)', () => {
  describe('C. Sections to deck zones', () => {
    it('DECK-020 / DECK-021 / AC 1: Riot sections map to zones, merged within a zone and separate across zones', () => {
      const p = prep(KENNEN_RIOT);
      const r = review(p);
      expect(p.sourceFormat).toBe('riot-text');
      expect(r.lines.every((l) => l.zoneMethod === 'section')).toBe(true);
      expect(r.byZone).toEqual({ legend: 1, champion: 1, main: 10, battlefields: 3, runes: 12, sideboard: 3 });
      expect(qtyOf(r.draft.main, "an offer you cant refuse")).toBe(1);
      expect(qtyOf(r.draft.sideboard, "an offer you cant refuse")).toBe(1);
      expect(r.questions).toEqual([]);
      expect(r.canSave).toBe(true);
      expect(r.name).toBe('Kennen, Heart of the Tempest');
      expect(r.draft.legend).toEqual({ cardKey: 'kennen heart of the tempest', name: 'Kennen, Heart of the Tempest', qty: 1 });
      expect(r.draft.champion).toEqual({ cardKey: 'kennen storm of shuriken', name: 'Kennen, Storm of Shuriken', qty: 1 });
    });

    it('DECK-021: the same card twice in one zone is merged, quantities summed', () => {
      const r = review(prep('Legend: 1 Kennen, Heart of the Tempest\nMain Deck:\n2 Gust\n1 gust'));
      expect(r.draft.main).toEqual([{ cardKey: 'gust', name: 'Gust', qty: 3 }]);
    });

    it('DECK-024: a section label that appears twice appends to the same zone', () => {
      const r = review(prep('Legend: 1 Kennen, Heart of the Tempest\nSideboard:\n1 Gust\nMain Deck:\n3 Lightning Rush\nSideboard:\n2 Hextech Ray'));
      expect(r.draft.sideboard.map((c) => [c.name, c.qty])).toEqual([
        ['Gust', 1],
        ['Hextech Ray', 2],
      ]);
    });

    it('DECK-022 / DECK-023 / AC 7: a section beats card data, with ZONE_CATEGORY_MISMATCH and a Move to action', () => {
      const p = prep('Legend: 1 Kennen, Heart of the Tempest\nChampion: 1 Kennen, Storm of Shuriken\nMain Deck:\n1 Zaun Warrens');
      const r = review(p);
      expect(qtyOf(r.draft.main, 'zaun warrens')).toBe(1);
      expect(r.issues).toContainEqual({
        code: 'ZONE_CATEGORY_MISMATCH',
        severity: 'warning',
        message: 'Zaun Warrens is a Battlefield',
        line: 4,
      });
      const line = r.lines.find((l) => l.name === 'Zaun Warrens')!;
      expect(line.mismatch?.moveTo).toBe('battlefields');
      expect(r.canSave).toBe(true); // saving is allowed without moving it
      // Nothing moves without the click; the click moves it.
      const moved = review(p, { zones: new Map([[line.id, 'battlefields']]) });
      expect(moved.draft.main).toEqual([]);
      expect(qtyOf(moved.draft.battlefields, 'zaun warrens')).toBe(1);
      expect(moved.issues.some((i) => i.code === 'ZONE_CATEGORY_MISMATCH')).toBe(false);
    });

    it('DECK-022: unknown category never warns; a known non-Champion under Champion does', () => {
      const r = review(prep('Legend: 1 Kennen, Heart of the Tempest\nMain Deck:\n1 Mystery Card\nChampion:\n1 Gust'));
      expect(r.issues.filter((i) => i.code === 'ZONE_CATEGORY_MISMATCH').map((i) => i.message)).toEqual(['Gust is a Spell']);
    });

    it('DECK-025: the champion under Champion and again in Main Deck is kept as written', () => {
      const r = review(prep('Legend: 1 Kennen, Heart of the Tempest\nChampion:\n1 Kennen, Storm of Shuriken\nMain Deck:\n1 Kennen, Storm of Shuriken'));
      expect(r.draft.champion?.qty).toBe(1);
      expect(qtyOf(r.draft.main, 'kennen storm of shuriken')).toBe(1);
    });

    describe('DECK-034: several cards under Champion: (H-253 follow-up, Deck Construction Rules #1, #4)', () => {
      // Precon style: 4 "Champion Unit Options" next to a 36-card main deck.
      const PRECON = [
        'Legend:',
        '1 Kennen, Heart of the Tempest',
        'Champion:',
        '1 Kennen, Storm of Shuriken',
        '1 Kennen, Second Form',
        '2 Riven, Broken Blade',
        'Main Deck:',
        '12 Lightning Rush',
        '12 Gust',
        '12 Hextech Ray',
      ].join('\n');
      const mainPlusChampion = (r: ReturnType<typeof review>) => r.byZone.main + r.byZone.champion;

      it('DECK-034: several cards under Champion: ask PICK_CHAMPION and block Save until answered', () => {
        const r = review(prep(PRECON));
        const q = r.questions.find((x) => x.kind === 'PICK_CHAMPION')!;
        expect(q.answer).toBeNull();
        expect(q.kind === 'PICK_CHAMPION' && q.candidates.map((c) => c.name)).toEqual([
          'Kennen, Storm of Shuriken',
          'Kennen, Second Form',
          'Riven, Broken Blade',
        ]);
        expect(r.draft.champion).toBeNull();
        expect(r.byZone.main).toBe(36);
        expect(r.canSave).toBe(false);
      });

      it('DECK-034: unpicked cards under Champion: stay in the Main Deck (precon: 4 options + 36 main = 40)', () => {
        const r = review(prep(PRECON), { champion: 'kennen second form' });
        expect(r.draft.champion).toEqual({ cardKey: 'kennen second form', name: 'Kennen, Second Form', qty: 1 });
        expect(qtyOf(r.draft.main, 'kennen second form')).toBeUndefined();
        expect(qtyOf(r.draft.main, 'kennen storm of shuriken')).toBe(1);
        expect(qtyOf(r.draft.main, 'riven broken blade')).toBe(2);
        expect(r.byZone).toMatchObject({ legend: 1, champion: 1, main: 39 });
        expect(mainPlusChampion(r)).toBe(40);
        expect(r.draft.importRemovedLines).toBeUndefined();
        const lines = Object.fromEntries(r.lines.map((l) => [l.name, [l.zone, l.zoneMethod, l.zoneReason]]));
        expect(lines['Kennen, Second Form']).toEqual(['champion', 'user', null]);
        expect(lines['Kennen, Storm of Shuriken']).toEqual(['main', 'user', DECK_REVIEW_TEXT.championNotPicked]);
        expect(lines['Riven, Broken Blade']).toEqual(['main', 'user', DECK_REVIEW_TEXT.championNotPicked]);
        expect(r.slots.champion).toEqual({ name: 'Kennen, Second Form', method: 'user', reason: null });
        expect(r.canSave).toBe(true);
      });

      it('DECK-034: the picked line with quantity > 1 gives one copy to champion and the extra copies to main', () => {
        const r = review(prep(PRECON), { champion: 'riven broken blade' });
        expect(r.draft.champion).toEqual({ cardKey: 'riven broken blade', name: 'Riven, Broken Blade', qty: 1 });
        expect(qtyOf(r.draft.main, 'riven broken blade')).toBe(1);
        expect(qtyOf(r.draft.main, 'kennen storm of shuriken')).toBe(1);
        expect(qtyOf(r.draft.main, 'kennen second form')).toBe(1);
        expect(mainPlusChampion(r)).toBe(40);
        const riven = r.lines.find((l) => l.name === 'Riven, Broken Blade')!;
        expect([riven.zone, riven.zoneReason]).toEqual(['main', DECK_REVIEW_TEXT.championExtraToMain]);
      });

      it('DECK-034 / DECK-036: "Leave empty" on PICK_CHAMPION puts every card under Champion: in the Main Deck', () => {
        const r = review(prep(PRECON), { champion: 'empty' });
        expect(r.questions.find((x) => x.kind === 'PICK_CHAMPION')?.answer).toBe('empty');
        expect(r.draft.champion).toBeNull();
        expect(r.byZone).toMatchObject({ champion: 0, main: 40 });
        expect(r.draft.importRemovedLines).toBeUndefined();
        expect(r.lines.filter((l) => l.line >= 4 && l.line <= 6).every((l) => l.zone === 'main')).toBe(true);
        expect(r.canSave).toBe(true);
      });

      it('DECK-034 / DECK-022: a known non-Champion under Champion: that is not picked goes to main without a warning', () => {
        const r = review(prep('Legend: 1 Kennen, Heart of the Tempest\nChampion:\n1 Kennen, Storm of Shuriken\n1 Gust'), {
          champion: 'kennen storm of shuriken',
        });
        expect(qtyOf(r.draft.main, 'gust')).toBe(1);
        expect(r.issues.filter((i) => i.code === 'ZONE_CATEGORY_MISMATCH')).toEqual([]);
      });

      it('DECK-033: unpicked Legends are still left out of the deck (Legends are never Main Deck cards)', () => {
        const r = review(prep('Legend:\n1 Kennen, Heart of the Tempest\n1 Riven, The Exile\nMain Deck:\n3 Gust'), {
          legend: 'kennen heart of the tempest',
          champion: 'empty',
        });
        expect(r.draft.legend?.name).toBe('Kennen, Heart of the Tempest');
        expect(r.draft.importRemovedLines).toEqual(['1 Riven, The Exile']);
        expect(qtyOf(r.draft.main, 'riven the exile')).toBeUndefined();
      });
    });

    it('DECK-026 / AC 20: a token is rejected with TOKEN_NOT_DECK_CARD, kept in importRemovedLines, and does not block', () => {
      const r = review(prep('3 Lightning Rush\n1 Spark Token'), { legend: 'empty' });
      expect(r.issues).toContainEqual({
        code: 'TOKEN_NOT_DECK_CARD',
        severity: 'warning',
        message: "Spark Token is a token and can't be put in a deck",
        line: 2,
      });
      expect(r.draft.main.map((c) => c.name)).toEqual(['Lightning Rush']);
      expect(r.draft.importRemovedLines).toEqual(['1 Spark Token']);
      expect(r.canSave).toBe(true);
    });

    it('AC 25 / DECK-020: bold Riot labels are labels, all zones from sections', () => {
      const r = review(
        prep('**Legend:**\n1 Kennen, Heart of the Tempest\n**Main Deck:**\n3 Gust\n**Rune Pool:**\n9 Chaos Rune\n**Sideboard:**\n2 Decree of Unity'),
      );
      expect(r.lines.map((l) => [l.name, l.zone, l.zoneMethod])).toEqual([
        ['Kennen, Heart of the Tempest', 'legend', 'section'],
        ['Gust', 'main', 'section'],
        ['Chaos Rune', 'runes', 'section'],
        ['Decree of Unity', 'sideboard', 'section'],
      ]);
    });
  });

  describe('D. Reconstructing missing zones', () => {
    const PLAIN = [
      '1 Kennen, Heart of the Tempest',
      '1 Kennen, Storm of Shuriken',
      '3 Lightning Rush',
      '2 Gust',
      '9 Chaos Rune',
      '3 Order Rune',
      '1 Minefield',
      '1 Veiled Temple',
      '1 Zaun Warrens',
    ].join('\n');

    it('DECK-030 / DECK-032 / DECK-033 / DECK-034 / AC 4: a plain list is rebuilt from card data, each with its reason', () => {
      const r = review(prep(PLAIN));
      expect(r.questions).toEqual([]);
      expect(r.slots.legend).toEqual({ name: 'Kennen, Heart of the Tempest', method: 'inferred', reason: 'Card type is Legend' });
      expect(r.slots.champion).toEqual({
        name: 'Kennen, Storm of Shuriken',
        method: 'inferred',
        reason: 'Only Champion Unit matching the Legend',
      });
      expect(r.draft.main.map((c) => [c.name, c.qty])).toEqual([
        ['Lightning Rush', 3],
        ['Gust', 2],
      ]);
      expect(r.byZone).toEqual({ legend: 1, champion: 1, main: 5, battlefields: 3, runes: 12, sideboard: 0 });
      const reasons = Object.fromEntries(r.lines.map((l) => [l.name, [l.zone, l.zoneMethod, l.zoneReason]]));
      expect(reasons['Chaos Rune']).toEqual(['runes', 'inferred', 'Card type is Rune']);
      expect(reasons['Minefield']).toEqual(['battlefields', 'inferred', 'Card type is Battlefield']);
      expect(reasons['Gust']).toEqual(['main', 'inferred', 'Card type is Spell']);
      expect(r.canSave).toBe(true);
    });

    it('DECK-030: an inferred zone can be changed before saving', () => {
      const p = prep(PLAIN);
      const gust = review(p).lines.find((l) => l.name === 'Gust')!;
      const r = review(p, { zones: new Map([[gust.id, 'sideboard']]) });
      expect(r.draft.sideboard).toEqual([{ cardKey: 'gust', name: 'Gust', qty: 2 }]);
      expect(r.lines.find((l) => l.id === gust.id)?.zoneMethod).toBe('user');
    });

    it('DECK-033: two unsectioned Legends ask PICK_LEGEND; the one not picked is left out and listed', () => {
      const p = prep('1 Kennen, Heart of the Tempest\n1 Riven, The Exile\n3 Gust');
      const open = review(p);
      expect(open.questions[0]).toMatchObject({ kind: 'PICK_LEGEND', answer: null });
      expect(open.questions[0].kind === 'PICK_LEGEND' && open.questions[0].candidates.map((c) => c.name)).toEqual([
        'Kennen, Heart of the Tempest',
        'Riven, The Exile',
      ]);
      expect(open.canSave).toBe(false);
      const r = review(p, { legend: 'riven the exile', champion: 'empty' });
      expect(r.draft.legend?.name).toBe('Riven, The Exile');
      expect(r.draft.importRemovedLines).toEqual(['1 Kennen, Heart of the Tempest']);
    });

    it('DECK-033: one unsectioned Legend with quantity 2 is asked, not inferred', () => {
      const r = review(prep('2 Kennen, Heart of the Tempest\n3 Gust'));
      expect(r.questions.map((q) => q.kind)).toEqual(['PICK_LEGEND']);
    });

    it('DECK-034 / AC 21: several champion candidates ask PICK_CHAMPION; one copy of the pick moves, the rest stays in main', () => {
      const p = prep('1 Kennen, Heart of the Tempest\n3 Kennen, Storm of Shuriken\n2 Kennen, Second Form\n3 Gust');
      const open = review(p);
      const q = open.questions.find((x) => x.kind === 'PICK_CHAMPION')!;
      expect(q.kind === 'PICK_CHAMPION' && q.candidates.map((c) => c.name)).toEqual([
        'Kennen, Storm of Shuriken',
        'Kennen, Second Form',
      ]);
      expect(open.draft.champion).toBeNull(); // nothing goes to champion silently
      const r = review(p, { champion: 'kennen second form' });
      expect(r.draft.champion).toEqual({ cardKey: 'kennen second form', name: 'Kennen, Second Form', qty: 1 });
      expect(r.slots.champion?.method).toBe('user');
      expect(qtyOf(r.draft.main, 'kennen second form')).toBe(1);
      expect(qtyOf(r.draft.main, 'kennen storm of shuriken')).toBe(3);
      expect(r.canSave).toBe(true);
    });

    it('DECK-034: a candidate whose championTag differs from the Legend is not offered', () => {
      const r = review(prep('1 Kennen, Heart of the Tempest\n1 Riven, Broken Blade\n3 Gust'));
      const q = r.questions.find((x) => x.kind === 'PICK_CHAMPION')!;
      expect(q.kind === 'PICK_CHAMPION' && q.candidates).toEqual([]);
      expect(qtyOf(r.draft.main, 'riven broken blade')).toBe(1);
    });

    it('DECK-035 / AC 6: an unknown category asks PICK_ZONE; "Put all in Main Deck" answers with zoneMethod user', () => {
      // Unsectioned: before the first label (a later line keeps the label in effect, IMP-018).
      const p = prep('2 Mystery Card\nLegend: 1 Kennen, Heart of the Tempest\nChampion: 1 Kennen, Storm of Shuriken');
      const open = review(p);
      expect(open.questions).toEqual([{ kind: 'PICK_ZONE', lineIds: [0], answer: null }]);
      expect(open.canSave).toBe(false);
      expect(open.blockers.openQuestions).toBe(1);
      const r = review(p, { zones: new Map([[0, 'main']]) });
      expect(r.lines.find((l) => l.id === 0)).toMatchObject({ zone: 'main', zoneMethod: 'user' });
      expect(r.canSave).toBe(true);
    });

    it('DECK-036 / DECK-038 / AC 3: no Legend asks PICK_LEGEND (catalog), then PICK_CHAMPION; answering enables Save', () => {
      const body = '## Main deck\n3 Gust\n## Runes\n6 Calm Rune\n6 Chaos Rune\n## Battlefields\n1 Minefield\n## Sideboard\n2 Hextech Ray';
      const p = prep(body);
      const open = review(p);
      expect(open.questions).toEqual([{ kind: 'PICK_LEGEND', lineIds: [], candidates: [], answer: null }]);
      expect(open.byZone).toMatchObject({ main: 3, runes: 12, battlefields: 1, sideboard: 2 });
      expect(open.canSave).toBe(false);
      expect(DECK_REVIEW_TEXT.questions(open.blockers.openQuestions)).toBe('1 question to answer');
      expect(p.legends.map((c) => c.name)).toContain('Riven, The Exile');

      const legendPicked = review(p, { legend: 'riven the exile' });
      expect(legendPicked.questions.map((q) => [q.kind, q.answer])).toEqual([
        ['PICK_LEGEND', 'riven the exile'],
        ['PICK_CHAMPION', null],
      ]);
      expect(legendPicked.canSave).toBe(false);

      const r = review(p, { legend: 'riven the exile', champion: 'riven broken blade' });
      expect(r.draft.legend?.name).toBe('Riven, The Exile');
      expect(r.draft.champion).toEqual({ cardKey: 'riven broken blade', name: 'Riven, Broken Blade', qty: 1 });
      expect(r.canSave).toBe(true);
      expect(r.name).toBe('Riven, The Exile');
    });

    it('DECK-036 / DECK-038: "Leave empty" is an answer; the deck saves without a Legend', () => {
      const r = review(prep('3 Gust'), { legend: 'empty' });
      expect(r.draft.legend).toBeNull();
      expect(r.questions).toEqual([{ kind: 'PICK_LEGEND', lineIds: [], candidates: [], answer: 'empty' }]);
      expect(r.canSave).toBe(true);
    });

    it('DECK-037 / AC 5: no Sideboard section puts everything in main with NO_SIDEBOARD_SECTION', () => {
      const lines = ['1 Kennen, Heart of the Tempest', '1 Kennen, Storm of Shuriken', "1 An Offer You Can't Refuse"];
      for (let i = 0; i < 13; i++) lines.push('3 Lightning Rush');
      lines.push("1 An Offer You Can't Refuse");
      const r = review(prep(lines.join('\n')));
      expect(qtyOf(r.draft.main, 'an offer you cant refuse')).toBe(2);
      expect(r.draft.sideboard).toEqual([]);
      expect(r.issues).toContainEqual({ code: 'NO_SIDEBOARD_SECTION', severity: 'info', message: DECK_REVIEW_TEXT.noSideboard });
    });

    it('DECK-037: no info while the Main Deck is 39 or fewer', () => {
      const r = review(prep('1 Kennen, Heart of the Tempest\n3 Gust'));
      expect(r.issues.some((i) => i.code === 'NO_SIDEBOARD_SECTION')).toBe(false);
    });
  });

  describe('B / E. Names, printing codes and unresolved lines', () => {
    it('DECK-041 / AC 8: a name not in the card data blocks Save with "1 card needs attention"', () => {
      const r = review(prep('Legend: 1 Kennen, Heart of the Tempest\nMain Deck:\n3 Lightnig Rush'));
      expect(r.attention.map((l) => l.attention)).toEqual([
        { code: 'UNKNOWN_CARD', message: 'No card named "Lightnig Rush" in the card data.' },
      ]);
      expect(r.blockers.unresolvedLines).toBe(1);
      expect(DECK_REVIEW_TEXT.needAttention(r.blockers.unresolvedLines)).toBe('1 card needs attention');
      expect(r.canSave).toBe(false);
    });

    it('DECK-041 / DECK-042 / AC 9: removing the line enables Save and keeps its text in importRemovedLines', () => {
      const text =
        'Legend: 1 Kennen, Heart of the Tempest\nChampion: 1 Kennen, Storm of Shuriken\nMain Deck:\n3 Gust\nSideboard:\n2 Totally Fake Card';
      const p = prep(text);
      const bad = review(p).attention[0];
      expect(bad.line).toBe(6);
      const r = review(p, { removed: new Set([bad.id]) });
      expect(r.canSave).toBe(true);
      expect(r.draft.importRemovedLines).toEqual(['2 Totally Fake Card']);
      expect(r.draft.sideboard).toEqual([]);
    });

    it('DECK-015 / DECK-096 / AC 23: printing codes resolve the cardKey only; a code-name mismatch needs a pick', () => {
      const text = [
        'Legend: 1 Kennen, Heart of the Tempest (OGN 299/298)',
        'Main Deck:',
        'Lightning Rush x3 RAD 001 /167',
        'x2 Hextech Ray',
        '2 RAD 001a',
        '1 Hextech Ray RAD 001',
      ].join('\n');
      const p = prep(text);
      const open = review(p);
      expect(open.draft.legend?.name).toBe('Kennen, Heart of the Tempest');
      expect(qtyOf(open.draft.main, 'lightning rush')).toBe(5);
      expect(qtyOf(open.draft.main, 'hextech ray')).toBe(2);
      expect(open.attention).toHaveLength(1);
      expect(open.attention[0]).toMatchObject({ line: 6, attention: { code: 'PRINTING_NAME_MISMATCH' } });
      expect(open.attention[0].choices.map((c) => c.name)).toEqual(['Lightning Rush', 'Hextech Ray']);
      expect(open.canSave).toBe(false);

      // No Champion section and a known Legend: DECK-034 also asks PICK_CHAMPION (not part of AC 23).
      const r = review(p, { picks: new Map([[open.attention[0].id, 'hextech ray']]), champion: 'empty' });
      expect(qtyOf(r.draft.main, 'hextech ray')).toBe(3);
      expect(r.canSave).toBe(true);
      for (const c of [r.draft.legend!, ...r.draft.main]) expect(Object.keys(c).sort()).toEqual(['cardKey', 'name', 'qty']);
    });

    it('DECK-015 / AC 23: an unknown code with a known name falls back to the name and does not block', () => {
      const r = review(prep('Legend: 1 Kennen, Heart of the Tempest\nMain Deck:\n3 Lightning Rush RAD 999'), { champion: 'empty' });
      expect(qtyOf(r.draft.main, 'lightning rush')).toBe(3);
      expect(r.notes).toEqual([{ line: 3, message: "RAD 999 isn't in the card data, so the card name was used." }]);
      expect(r.canSave).toBe(true);
    });

    it('DECK-015: a code-only line with an unknown code blocks Save', () => {
      const r = review(prep('Legend: 1 Kennen, Heart of the Tempest\nMain Deck:\n3 RAD 999'));
      expect(r.attention[0].attention?.code).toBe('UNKNOWN_PRINTING');
      expect(r.canSave).toBe(false);
    });

    describe('DECK-040: optional leading article (CARD-034, IMP-025, H-343)', () => {
      /** The test catalog plus hypothetical names from SPEC-001 AC 6 and AC 21 and the real-name case. */
      function articleCatalog(...names: string[]): CollectionCatalogView {
        const c = makeTestCatalog();
        for (const n of names) {
          const e = card(n, 'spell');
          c.cards[e.card.cardKey] = e.card;
        }
        return c;
      }
      const ARTICLES = articleCatalog('The Dreaming Tree', 'A Pit', 'The Pit', 'The Echo', 'Echo');
      const deck = (main: string) => `Legend: 1 Kennen, Heart of the Tempest\nMain Deck:\n${main}`;

      it('DECK-040 / CARD-034: Dreaming Tree resolves to The Dreaming Tree with no review, and Save is not blocked', () => {
        const r = review(prep(deck('3 Dreaming Tree'), ARTICLES), { champion: 'empty' });
        expect(r.attention).toEqual([]);
        expect(r.notes).toEqual([]);
        expect(r.draft.main).toEqual([{ cardKey: 'the dreaming tree', name: 'The Dreaming Tree', qty: 3 }]);
        expect(r.canSave).toBe(true);
      });

      it('DECK-040 / CARD-034: The Dreaming Tree finds a card named Dreaming Tree', () => {
        const r = review(prep(deck('2 The Dreaming Tree'), articleCatalog('Dreaming Tree')), { champion: 'empty' });
        expect(r.attention).toEqual([]);
        expect(r.draft.main).toEqual([{ cardKey: 'dreaming tree', name: 'Dreaming Tree', qty: 2 }]);
      });

      it('DECK-040 / CARD-034: Pit with A Pit and The Pit is AMBIGUOUS_NAME; picking one enables Save', () => {
        const p = prep(deck('2 Pit'), ARTICLES);
        const open = review(p, { champion: 'empty' });
        expect(open.attention).toHaveLength(1);
        expect(open.attention[0].attention).toEqual({
          code: 'AMBIGUOUS_NAME',
          message: '"Pit" matches more than one card. Pick one.',
        });
        expect(open.attention[0].choices.map((c) => c.name)).toEqual(['A Pit', 'The Pit']);
        expect(open.canSave).toBe(false);
        const r = review(p, { picks: new Map([[open.attention[0].id, 'the pit']]), champion: 'empty' });
        expect(r.draft.main).toEqual([{ cardKey: 'the pit', name: 'The Pit', qty: 2 }]);
        expect(r.canSave).toBe(true);
      });

      it('DECK-040 / CARD-034: an exact name wins over the article rule (Echo with The Echo and Echo)', () => {
        const r = review(prep(deck('1 Echo\n2 The Echo\n1 A Pit'), ARTICLES), { champion: 'empty' });
        expect(r.attention).toEqual([]);
        expect(r.draft.main).toEqual([
          { cardKey: 'echo', name: 'Echo', qty: 1 },
          { cardKey: 'the echo', name: 'The Echo', qty: 2 },
          { cardKey: 'a pit', name: 'A Pit', qty: 1 },
        ]);
      });

      it('DECK-040 / CARD-034: a bare "The" is UNKNOWN_CARD', () => {
        const r = review(prep(deck('1 The'), ARTICLES), { champion: 'empty' });
        expect(r.attention.map((l) => l.attention)).toEqual([
          { code: 'UNKNOWN_CARD', message: 'No card named "The" in the card data.' },
        ]);
      });

      it('DECK-040 / IMP-069 (a): an unknown code falls back to the name through the article rule', () => {
        const r = review(prep(deck('1 Dreaming Tree RAD 999\n1 Pit RAD 998'), ARTICLES), { champion: 'empty' });
        expect(qtyOf(r.draft.main, 'the dreaming tree')).toBe(1);
        expect(r.notes).toEqual([{ line: 3, message: "RAD 999 isn't in the card data, so the card name was used." }]);
        expect(r.attention.map((l) => l.attention?.code)).toEqual(['AMBIGUOUS_NAME']);
      });
    });

    it('AC 16a / DECK-001: a line without a quantity is left out by the parser; the rest goes on', () => {
      const r = review(prep('Legend: 1 Kennen, Heart of the Tempest\nMain Deck:\nLightning Rush\n3 Hextech Ray'));
      expect(r.draft.main).toEqual([{ cardKey: 'hextech ray', name: 'Hextech Ray', qty: 3 }]);
    });
  });

  describe('G. Deck metadata', () => {
    it('DECK-070 / AC 26: the default name is the Legend and follows it until the user types', () => {
      const p = prep('3 Gust');
      expect(review(p, { legend: 'riven the exile', champion: 'empty' }).name).toBe('Riven, The Exile');
      const typed = review(p, { typedName: 'My Riven', legend: 'riven the exile', champion: 'empty' });
      expect(typed.name).toBe('My Riven');
      expect(typed.draft.name).toBe('My Riven');
    });

    it('DECK-070 / AC 26: no Legend ("Leave empty") gives "Imported deck Nov 23, 2026"', () => {
      const r = review(prep('3 Gust'), { legend: 'empty' });
      expect(r.name).toBe('Imported deck Nov 23, 2026');
      expect(r.draft.name).toBe('Imported deck Nov 23, 2026');
      expect(displayDate(new Date(2026, 0, 5))).toBe('Jan 5, 2026');
    });

    it('DECK-070 / AC 26: a Legend name over 80 characters is trimmed to 80', () => {
      expect(LONG_LEGEND.length).toBeGreaterThan(80);
      const r = review(prep(`Legend: 1 ${LONG_LEGEND}\nMain Deck:\n3 Gust`), { champion: 'empty' });
      expect(r.name).toBe(LONG_LEGEND.slice(0, 80));
      expect(r.draft.name.length).toBe(80);
    });

    it('DECK-070: an empty name blocks Save; a typed name is trimmed', () => {
      const p = prep(KENNEN_RIOT);
      const empty = review(p, { typedName: '   ' });
      expect(empty.nameError).toBe('Give the deck a name.');
      expect(empty.canSave).toBe(false);
      expect(review(p, { typedName: '  Kennen tempo  ' }).draft.name).toBe('Kennen tempo');
    });

    it('DECK-071 / AC 12: an http(s) link is kept as a URL; javascript: gives SOURCE_URL_INVALID and is kept as text', () => {
      expect(deckSource('Forum post', 'https://example.com/kennen-list')).toEqual({
        text: 'Forum post',
        url: 'https://example.com/kennen-list',
        urlInvalid: false,
        error: null,
      });
      expect(deckSource('', 'javascript:alert(1)')).toEqual({ text: 'javascript:alert(1)', url: null, urlInvalid: true, error: null });
      const r = review(prep(KENNEN_RIOT), { sourceUrl: 'javascript:alert(1)' });
      expect(r.issues.map((i) => i.code)).toContain('SOURCE_URL_INVALID');
      expect(r.draft.source).toEqual({ kind: 'user', text: 'javascript:alert(1)', url: null });
      expect(review(prep(KENNEN_RIOT)).draft.source).toEqual({ kind: 'user', text: null, url: null });
    });

    it('DECK-071: source text over 200 characters blocks Save', () => {
      const r = review(prep(KENNEN_RIOT), { sourceText: 'x'.repeat(201) });
      expect(r.sourceError).toBe(DECK_REVIEW_TEXT.sourceTooLong);
      expect(r.canSave).toBe(false);
    });

    it('DECK-073 / DECK-075 / DECK-076 / DECK-091 / AC 27: notes start empty, format standard, catalogVersion and sourceFormat recorded, schemaVersion 1', () => {
      const r = review(prep(KENNEN_RIOT));
      expect(r.draft).toMatchObject({
        schemaVersion: 1,
        format: 'standard',
        notes: '',
        catalogVersion: '0.3+test',
        sourceFormat: 'riot-text',
      });
      expect(Object.keys(r.draft).sort()).toEqual(
        ['battlefields', 'catalogVersion', 'champion', 'format', 'legend', 'main', 'name', 'notes', 'runes', 'schemaVersion', 'sideboard', 'source', 'sourceFormat'],
      );
      expect(review(prep('3 Gust'), { legend: 'empty' }).draft.sourceFormat).toBe('plain-text');
    });

    it('DECK-011 / DECK-076 / AC 16: an uploaded CSV keeps its sections and records sourceFormat csv', () => {
      const text = 'Legend:\n1 Kennen, Heart of the Tempest\nMainDeck\n3 Lightning Rush\n2x Hextech Ray\nRune Pool:\n9 Chaos Rune';
      const parse = parseCardText(text, { upload: { fileName: 'deck.csv', fileType: 'csv' } });
      const p = prepareDeckImport(parse, sourceLines(text), CATALOG);
      const r = reviewDeck(p, { ...EMPTY_REVIEW_STATE, champion: 'empty' }, TODAY);
      expect(r.draft.sourceFormat).toBe('csv');
      expect(r.lines.every((l) => l.zoneMethod === 'section')).toBe(true);
      expect(r.byZone).toMatchObject({ legend: 1, main: 5, runes: 9 });
    });
  });

  describe('J. Storage shape', () => {
    it('DECK-096 / DECK-095: deck entries hold only cardKey, name and qty', () => {
      const r = review(prep(KENNEN_RIOT));
      const all = [r.draft.legend!, r.draft.champion!, ...r.draft.main, ...r.draft.sideboard, ...r.draft.runes, ...r.draft.battlefields];
      for (const c of all) expect(Object.keys(c).sort()).toEqual(['cardKey', 'name', 'qty']);
    });

    it('DECK-003: building the review writes nothing (pure; the draft has no id or timestamps)', () => {
      const r = review(prep(KENNEN_RIOT));
      expect('id' in r.draft || 'createdAt' in r.draft || 'updatedAt' in r.draft).toBe(false);
    });
  });
});
