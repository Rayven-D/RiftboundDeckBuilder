import { computeDeckOwnership, computeSharedPool } from '../../core/decks';
import { lock, makeCatalog, makeDeck, makeInput, makeTag, printingIdOf } from '../../core/decks/engine-fixtures';
import type { BanListFile, DeckOwnershipView, TournamentDeckSource, UserDeck } from '../../core/decks';
import { deckSource } from '../import/deck-import';
import { DETAIL_ALL_OWNED, DETAIL_CATALOG, DETAIL_OWNED, detailDeck, detailView } from './detail-fixtures';
import {
  allocationLine,
  applyRename,
  banText,
  breakdownLines,
  cardAccessibleName,
  cardFacts,
  cardsLine,
  copiesLine,
  deckCards,
  duplicateDeck,
  excludedLine,
  exportDeckText,
  exportFileName,
  findCard,
  firstCardId,
  headerSummary,
  labelParts,
  mergedMissingText,
  missingCopies,
  missingGroups,
  navLabel,
  neighbourId,
  newerDeckRecord,
  otherUseText,
  parseViewMode,
  printingRowLabel,
  printingRowText,
  ruleCheckContent,
  sectionCounts,
  sourceParts,
} from './detail-view';

const TOURNAMENT: TournamentDeckSource = {
  kind: 'tournament',
  eventId: 'rc-eu',
  eventName: 'Riftbound Regional Championship: Europe',
  eventStartDate: '2026-11-06',
  eventEndDate: '2026-11-08',
  region: 'eu',
  decklistId: 'd1',
  publishedRank: 1,
  placingLabel: '1st',
  pilot: 'ASC Evansrhim',
  sourceUrl: 'https://example.test/decklist/1',
  addedAt: '2026-11-24T10:00:00.000Z',
};

/** A view with a chosen A and R (the header reads `completionPercent` as the engine gives it). */
function withSummary(v: DeckOwnershipView, a: number, r: number, percent: number | null): DeckOwnershipView {
  return { ...v, summary: { ...v.summary, copiesAvailable: a, copiesRequired: r, completionPercent: percent } };
}

describe('Deck detail view (SPEC-005 section L, H-254)', () => {
  const deck = detailDeck();
  const view = detailView(deck);
  const card = (zone: string, key: string) => findCard(view, `${zone}:${key}`)!;

  describe('header (OWN-010, OWN-101)', () => {
    it('OWN-010 (f) / AC 33: "12 of 23 copies available" with the engine percentage 52 and "2 of 8 cards fully available"', () => {
      expect(view.summary.completionPercent).toBe(52);
      expect(headerSummary(view)).toEqual({ copies: '12 of 23 copies available', percent: 52, cards: '2 of 8 cards fully available' });
    });

    it('OWN-101 (d) / AC 33: the header percentage is view.summary.completionPercent, never recomputed (34 of 66 → 51, 299 of 300 → 99, 1 of 300 → 1, 0 of 66 → 0)', () => {
      expect(headerSummary(withSummary(view, 34, 66, 51)).percent).toBe(51);
      expect(headerSummary(withSummary(view, 299, 300, 99)).percent).toBe(99);
      expect(headerSummary(withSummary(view, 1, 300, 1)).percent).toBe(1);
      expect(headerSummary(withSummary(view, 0, 66, 0))).toMatchObject({ copies: '0 of 66 copies available', percent: 0 });
      // Whatever the engine says is shown as it is: the page does not compute it again.
      expect(headerSummary(withSummary(view, 34, 66, 7)).percent).toBe(7);
    });

    it('OWN-010 (f) / AC 33: a locked complete deck reads "23 of 23 copies locked in" with 100', () => {
      const v = detailView(deck, { owned: DETAIL_ALL_OWNED }, { locks: [lock(deck.id)] });
      expect(headerSummary(v)).toEqual({ copies: '23 of 23 copies locked in', percent: 100, cards: '8 of 8 cards fully available' });
    });

    it('OWN-101 (c) / AC 33: R = 0 → "No cards to count" and no percentage', () => {
      const empty = makeDeck('e', 'Empty', {});
      expect(headerSummary(detailView(empty))).toEqual({ copies: 'No cards to count', percent: null, cards: null });
    });

    it('OWN-101 (c) / OWN-065 / AC 33: ownership unavailable → "Ownership unavailable" and no percentage', () => {
      const v = computeDeckOwnership(deck, { status: 'unavailable', locks: [] }, DETAIL_CATALOG, null, '2026-11-25');
      expect(headerSummary(v)).toEqual({ copies: 'Ownership unavailable', percent: null, cards: null });
    });

    it('H-466 (1) / OWN-050: "1 of 1 card fully available" (singular when the total is 1); plural otherwise', () => {
      const one = detailView(makeDeck('o', 'One', { main: [['Lightning Rush', 1]] }), { owned: { 'Lightning Rush': 1 } });
      expect(cardsLine(one)).toBe('1 of 1 card fully available');
      expect(headerSummary(one).cards).toBe('1 of 1 card fully available');
      const none = detailView(makeDeck('n', 'None', { main: [['Lightning Rush', 1]] }), { owned: {} });
      expect(cardsLine(none)).toBe('0 of 1 card fully available');
      expect(cardsLine(view)).toBe('2 of 8 cards fully available');
    });

    it('H-521 / OWN-050: "1 of 1 copy available" / "1 of 1 copy locked in" when R is 1; plural otherwise', () => {
      const deck1 = makeDeck('o', 'One', { main: [['Lightning Rush', 1]] });
      const one = detailView(deck1, { owned: { 'Lightning Rush': 1 } });
      expect(copiesLine(one)).toBe('1 of 1 copy available');
      expect(headerSummary(one).copies).toBe('1 of 1 copy available');
      expect(copiesLine(detailView(deck1, { owned: {} }))).toBe('0 of 1 copy available');
      const locked = detailView(deck1, { owned: { 'Lightning Rush': 1 } }, { locks: [lock(deck1.id)] });
      expect(copiesLine(locked)).toBe('1 of 1 copy locked in');
      expect(copiesLine(view)).toBe('12 of 23 copies available');
    });

    it('OWN-050: "1 copy excluded from decks" only when an excluded copy would fill a gap', () => {
      expect(excludedLine(view)).toBeNull();
      expect(excludedLine({ ...view, summary: { ...view.summary, copiesExcludedRelevant: 1 } })).toBe('1 copy excluded from decks');
      expect(excludedLine({ ...view, summary: { ...view.summary, copiesExcludedRelevant: 3 } })).toBe('3 copies excluded from decks');
    });

    it('OWN-010 (d) / OWN-104: a tournament deck shows its player and a plain Source link; an imported deck neither', () => {
      expect(sourceParts({ ...deck, source: TOURNAMENT })).toEqual({ pilot: 'ASC Evansrhim', sourceUrl: 'https://example.test/decklist/1' });
      expect(sourceParts({ ...deck, source: { kind: 'user', text: null, url: 'https://x.test' } })).toEqual({ pilot: null, sourceUrl: null });
    });
  });

  describe('sections (OWN-011, OWN-110)', () => {
    it('OWN-011 / AC 8: six sections in Riot order with counts; Runes like any section (AC 17)', () => {
      expect(view.sections.map((s) => s.zone)).toEqual(['legend', 'champion', 'main', 'battlefields', 'runes', 'sideboard']);
      expect(view.sections.map((s) => sectionCounts(s, view))).toEqual([
        '· 1 card · 1 available',
        '· 1 card · 0 available',
        '· 6 cards · 4 available',
        '· 1 card · 0 available',
        '· 12 cards · 6 available',
        '· 2 cards · 1 available',
      ]);
    });

    it('OWN-011: "… locked in" in a locked deck; only the card count while ownership is unavailable', () => {
      const locked = detailView(deck, { owned: DETAIL_ALL_OWNED }, { locks: [lock(deck.id)] });
      expect(sectionCounts(locked.sections[4], locked)).toBe('· 12 cards · 12 locked in');
      const v = computeDeckOwnership(deck, { status: 'unavailable', locks: [] }, DETAIL_CATALOG, null, '2026-11-25');
      expect(sectionCounts(v.sections[2], v)).toBe('· 6 cards');
    });

    it('H-466 (3): an empty section reads "· 0 cards" with no "· 0 available" (also in a locked deck)', () => {
      const noLegend = { ...deck, legend: null };
      const v = detailView(noLegend);
      expect(sectionCounts(v.sections[0], v)).toBe('· 0 cards');
      expect(sectionCounts(v.sections[1], v)).toBe('· 1 card · 0 available');
      const locked = detailView(noLegend, { owned: DETAIL_ALL_OWNED }, { locks: [lock(deck.id)] });
      expect(sectionCounts(locked.sections[0], locked)).toBe('· 0 cards');
    });

    it('H-482 / OWN-110 v0.11 / AC 34: empty Legend and Champion slots read "Legend 0" / "Champion 0"; other zones always count, 0 included', () => {
      const v = detailView({ ...deck, legend: null, champion: null, battlefields: [] });
      expect(v.sections.map(navLabel)).toEqual(['Legend 0', 'Champion 0', 'Main 6', 'Battlefields 0', 'Runes 12', 'Sideboard 2']);
      const noChampion = detailView({ ...deck, champion: null });
      expect(noChampion.sections.map(navLabel).slice(0, 2)).toEqual(['Legend', 'Champion 0']);
    });

    it('OWN-110: the section bar reads Legend, Champion, Main 6, Battlefields 1, Runes 12, Sideboard 2', () => {
      expect(view.sections.map(navLabel)).toEqual(['Legend', 'Champion', 'Main 6', 'Battlefields 1', 'Runes 12', 'Sideboard 2']);
    });
  });

  describe('selection and cards (OWN-033, OWN-111…115)', () => {
    it('OWN-111 (b) / AC 27: the first card is the Legend; with no Legend the first card of the next section; none in an empty deck', () => {
      expect(firstCardId(view)).toBe('legend:kennen heart of the tempest');
      const noLegend = detailView({ ...deck, legend: null });
      expect(firstCardId(noLegend)).toBe('champion:kennen storm of shuriken');
      expect(firstCardId(detailView(makeDeck('e', 'E', {})))).toBeNull();
    });

    it('OWN-113: previous / next step through the deck in section order', () => {
      expect(deckCards(view)).toHaveLength(10);
      expect(neighbourId(view, 'legend:kennen heart of the tempest', -1)).toBeNull();
      expect(neighbourId(view, 'legend:kennen heart of the tempest', 1)).toBe('champion:kennen storm of shuriken');
      expect(neighbourId(view, 'sideboard:the empyrean', 1)).toBeNull();
    });

    it('OWN-033 v0.9 / AC 4: a split card label has a count part and a deck-total part; OWN-042 per-zone allocation', () => {
      const main = card('main', 'the empyrean');
      const side = card('sideboard', 'the empyrean');
      expect(main.label).toBe('2 of 2 available · 2 of 3 in this deck');
      expect(labelParts(main.label)).toEqual({ count: '2 of 2 available', total: '2 of 3 in this deck' });
      expect(labelParts(side.label)).toEqual({ count: '0 of 1 available', total: '2 of 3 in this deck' });
      expect(allocationLine(main)).toBe('Main Deck 2 of 2 · Sideboard 0 of 1');
      expect(labelParts('1 of 3 available')).toEqual({ count: '1 of 3 available', total: null });
      expect(allocationLine(card('main', 'lightning rush'))).toBeNull();
    });

    it('OWN-033 / AC 17: accessible names, e.g. "Chaos Rune, Runes, 6 of 9 available"', () => {
      expect(cardAccessibleName(card('runes', 'chaos rune'))).toBe('Chaos Rune, Runes, 6 of 9 available, ban status unknown');
      const banned: BanListFile = {
        schemaVersion: 1,
        dataVersion: 'x',
        lastVerified: '2026-11-23',
        lists: [
          {
            format: 'standard',
            region: 'global',
            status: 'verified',
            waves: [
              { id: 'w', name: 'W', announced: '2026-11-20', effective: '2026-11-23', sourceUrl: 'x', add: [{ name: 'Lightning Rush', kind: 'card' }], remove: [] },
            ],
          },
        ],
      };
      const other = { ...detailDeck('other', 'Jinx Aggro') };
      const v = detailView(deck, { owned: DETAIL_OWNED }, { decks: [deck, other], locks: [lock('other')], bans: banned });
      const lr = findCard(v, 'main:lightning rush')!;
      expect(cardAccessibleName(lr)).toBe('Lightning Rush, Main Deck, 0 of 3 available, also in 1 other deck, 1 locked, banned since Nov 23, 2026');
    });

    it('OWN-061: an unknown card says "card no longer in the card data" after the zone', () => {
      const d = makeDeck('u', 'U', { battlefields: [['Zaun Warrens', 1]], main: [['Gone Card', 2]] });
      const v = detailView(d);
      expect(cardAccessibleName(findCard(v, 'main:gone card')!)).toBe('Gone Card, Main Deck, card no longer in the card data, 0 of 2 available, ban status unknown');
    });

    it('OWN-015: ban texts; unknown reads "Ban status unknown"', () => {
      expect(banText({ status: 'banned', waveId: 'w', waveName: 'W', bannedSince: '2026-11-23' })).toBe('Banned since Nov 23, 2026');
      expect(banText({ status: 'upcoming', waveId: 'w', waveName: 'W', announced: '2026-11-20', effective: '2026-12-15' })).toBe('Banned from Dec 15, 2026');
      expect(banText({ status: 'unknown' })).toBe('Ban status unknown');
      expect(banText({ status: 'not-banned' })).toBeNull();
    });

    it('OWN-112 (g) / OWN-060: card facts; null domains read "Domains: Unknown", no stats omitted', () => {
      expect(cardFacts(card('main', 'lightning rush'))).toEqual({ typeLine: 'Spell · Spell', domains: 'Domains: Unknown', stats: null, text: '' });
      const c = card('main', 'lightning rush');
      const facts = cardFacts({ ...c, card: { ...c.card!, domains: [], stats: { energy: 2, might: null, cost: null, power: 1 } } });
      expect(facts).toMatchObject({ domains: 'No domain', stats: 'Energy 2 · Power 1' });
    });
  });

  describe('card breakdown and printings (OWN-041…043, SHARE-043)', () => {
    it('AC 2 (OWN-041, OWN-042): excluded foil → printing groups and the breakdown, word for word', () => {
      const foil = 'p-lr-foil';
      const cat = makeCatalog([{ name: 'Lightning Rush', extraPrintings: [foil] }]);
      const d = makeDeck('d', 'D', { main: [['Lightning Rush', 3]] });
      const input = makeInput(cat, {
        byPrinting: { 'Lightning Rush': { [printingIdOf('Lightning Rush')]: 2, [foil]: 1 } },
        tags: [makeTag('t_col', 'Collector', true)],
        assignments: { [`p:${foil}`]: ['t_col'] },
      });
      const shared = computeSharedPool({ decks: [d], locks: [], ownership: input });
      const v = computeDeckOwnership(d, { status: 'ok', input, shared }, cat, null, '2026-11-25');
      const lr = v.sections[2].cards[0];
      expect(lr.printingsOwned.map(printingRowText)).toEqual(['OGN-001 ×2']);
      expect(lr.excludedPrintings.map(printingRowText)).toEqual(['OGN-002 Foil ×1 · Collector']);
      expect(printingRowLabel(lr.printingsOwned[0])).toBe('Show in Collection: OGN-001, 2 copies');
      expect(breakdownLines(lr, false)).toEqual([
        'Owned for decks: 2 (1 more excluded from decks)',
        'Locked by other decks: 0',
        'Available to this deck: 2',
        'This deck needs: 3',
      ]);
      expect(excludedLine(v)).toBe('1 copy excluded from decks');
    });

    it('AC 6 (OWN-024): extra copies show "(1 extra)" after the available line; a locked deck adds "Locked in by this deck"', () => {
      const v = detailView(deck, { owned: { ...DETAIL_ALL_OWNED, 'Kennen, Storm of Shuriken': 2 } }, { locks: [lock(deck.id)] });
      expect(breakdownLines(findCard(v, 'champion:kennen storm of shuriken')!, true)).toEqual([
        'Owned for decks: 2',
        'Locked by other decks: 0',
        'Available to this deck: 2 (1 extra)',
        'This deck needs: 1',
        'Locked in by this deck: 1',
      ]);
    });

    it('OWN-041: unassigned and missing-printing rows', () => {
      const base = { printingId: null, printingCode: null, variantLabel: null, count: 2, excludedByTagIds: [], excludedByTagNames: [] };
      expect(printingRowText({ ...base, kind: 'unassigned' })).toBe('Printing not specified ×2');
      expect(printingRowText({ ...base, kind: 'missing-printing', printingCode: 'OGN-005', count: 1 })).toBe('Printing no longer found (OGN-005) ×1');
    });

    it('SHARE-043: other-deck rows read "<name> · needs n · Locked, holds h" / "· Not locked"', () => {
      expect(otherUseText({ deckId: 'a', deckName: 'Jinx Aggro', need: 2, locked: true, hold: 2 })).toBe('Jinx Aggro · needs 2 · Locked, holds 2');
      expect(otherUseText({ deckId: 'b', deckName: 'Draven Midrange', need: 3, locked: false, hold: 0 })).toBe('Draven Midrange · needs 3 · Not locked');
    });
  });

  describe('missing list (OWN-051…053)', () => {
    it('OWN-051 / AC 8: grouped by section in Riot order; 11 copies missing', () => {
      expect(missingGroups(view).map((g) => [g.label, g.lines.map((l) => `${l.missing} ${l.name}`)])).toEqual([
        ['Chosen Champion', ['1 Kennen, Storm of Shuriken']],
        ['Main Deck', ['2 Lightning Rush']],
        ['Battlefields', ['1 Zaun Warrens']],
        ['Runes', ['3 Chaos Rune', '3 Order Rune']],
        ['Sideboard', ['1 The Empyrean']],
      ]);
      expect(missingCopies(view)).toBe(11);
    });

    it('OWN-052 / AC 7: the copy text is DECK-085 layout with a Rune Pool section', () => {
      expect(view.missingText).toBe(
        'Champion:\n1 Kennen, Storm of Shuriken\n\nMain Deck:\n2 Lightning Rush\n\nBattlefields:\n1 Zaun Warrens\n\nRune Pool:\n3 Chaos Rune\n3 Order Rune\n\nSideboard:\n1 The Empyrean',
      );
    });

    it('OWN-053: "Copy as one list" merges per card in deck order of first appearance', () => {
      const v = detailView(deck, { owned: {} });
      expect(mergedMissingText(v.missing).split('\n')).toEqual([
        '1 Kennen, Heart of the Tempest',
        '1 Kennen, Storm of Shuriken',
        '3 Lightning Rush',
        '2 Fizz, Trickster',
        '3 The Empyrean',
        '1 Zaun Warrens',
        '9 Chaos Rune',
        '3 Order Rune',
      ]);
    });
  });

  describe('export, duplicate, rename (DECK-081, 084, 085; OWN-118)', () => {
    it('DECK-085: Riot-style export with canonical names, empty zones omitted; a safe file name', () => {
      const d = { ...deck, sideboard: [], main: [{ cardKey: 'lightning rush', name: 'lightning rush (typo)', qty: 3 }] };
      expect(exportDeckText(d, DETAIL_CATALOG)).toBe(
        'Legend:\n1 Kennen, Heart of the Tempest\n\nChampion:\n1 Kennen, Storm of Shuriken\n\nMain Deck:\n3 Lightning Rush\n\nBattlefields:\n1 Zaun Warrens\n\nRune Pool:\n9 Chaos Rune\n3 Order Rune',
      );
      expect(exportFileName('Kennen: ASC/1st?')).toBe('Kennen_ ASC_1st_.txt');
    });

    it('DECK-084 / SHARE-026: "<name> (copy)" within 80 characters, new id and timestamps, duplicatedFrom, same zones and notes', () => {
      const d = { ...deck, notes: 'Budget list' };
      const copy = duplicateDeck(d, 'new-id', '2026-11-25T12:00:00.000Z');
      expect(copy).toMatchObject({ id: 'new-id', name: 'Kennen Tempo (copy)', notes: 'Budget list', duplicatedFrom: deck.id, createdAt: '2026-11-25T12:00:00.000Z' });
      expect(copy.main).toEqual(d.main);
      expect(copy.main).not.toBe(d.main);
      const long = duplicateDeck({ ...d, name: 'x'.repeat(80) }, 'n', 't');
      expect(long.name).toHaveLength(80);
      expect(long.name.endsWith(' (copy)')).toBe(true);
    });

    it('OWN-118 / DECK-081 / SPEC-005 AC 31: renaming a tournament deck changes name and notes only; the source is untouched', () => {
      const t: UserDeck = { ...deck, source: TOURNAMENT };
      const r = applyRename(t, { name: '  Kennen budget ', description: 'Budget list', sourceText: 'ignored', sourceUrl: 'https://ignored.test' }, deckSource);
      expect(r).toMatchObject({ ok: true, nameChanged: true, changed: true });
      if (!r.ok) throw new Error('refused');
      expect(r.deck.name).toBe('Kennen budget');
      expect(r.deck.notes).toBe('Budget list');
      expect(JSON.stringify(r.deck.source)).toBe(JSON.stringify(TOURNAMENT));
      expect(r.deck.main).toBe(t.main);
    });

    it('OWN-118 (c) / DECK-081 (c) / AC 31: an empty name is refused', () => {
      expect(applyRename(deck, { name: '   ', description: '', sourceText: '', sourceUrl: '' }, deckSource)).toEqual({
        ok: false,
        errors: { name: 'Give the deck a name.' },
      });
    });

    it('DECK-073 / SPEC-006 AC 27: the description is `notes`; 4,001 characters are refused; clearing it stores ""', () => {
      const d = { ...deck, notes: 'old' };
      expect(applyRename(d, { name: d.name, description: 'x'.repeat(4001), sourceText: '', sourceUrl: '' }, deckSource)).toMatchObject({
        ok: false,
        errors: { description: 'Use at most 4,000 characters.' },
      });
      const cleared = applyRename(d, { name: d.name, description: '', sourceText: '', sourceUrl: '' }, deckSource);
      expect(cleared).toMatchObject({ ok: true, nameChanged: false, changed: true, deck: { notes: '', schemaVersion: 1 } });
    });

    it('DECK-071 / SPEC-006 AC 28: an imported deck edits its source; javascript: is kept as text with SOURCE_URL_INVALID', () => {
      const r = applyRename(deck, { name: deck.name, description: '', sourceText: 'Discord', sourceUrl: 'javascript:alert(1)' }, deckSource);
      expect(r).toMatchObject({ ok: true, urlInvalid: true, deck: { source: { kind: 'user', text: 'Discord javascript:alert(1)', url: null } } });
      const ok = applyRename(deck, { name: deck.name, description: '', sourceText: '', sourceUrl: 'https://x.test/list' }, deckSource);
      expect(ok).toMatchObject({ ok: true, urlInvalid: false, deck: { source: { kind: 'user', text: null, url: 'https://x.test/list' } } });
    });

    it('OWN-118: nothing changed → no write needed', () => {
      expect(applyRename(deck, { name: deck.name, description: '', sourceText: '', sourceUrl: '' }, deckSource)).toMatchObject({ ok: true, changed: false });
    });

    it('DECK-091 / OWN-119 (c): a newer record with the deck fields is read for display; anything else is not', () => {
      const raw = JSON.stringify({ ...deck, schemaVersion: 2, extra: true });
      expect(newerDeckRecord(raw, deck.id)).toMatchObject({ id: deck.id, name: 'Kennen Tempo', schemaVersion: 2 });
      expect(newerDeckRecord(JSON.stringify({ ...deck, schemaVersion: 1 }), deck.id)).toBeNull();
      expect(newerDeckRecord(JSON.stringify({ ...deck, schemaVersion: 2, main: 'x' }), deck.id)).toBeNull();
      expect(newerDeckRecord('{not json', deck.id)).toBeNull();
      expect(newerDeckRecord(raw, 'other')).toBeNull();
    });
  });

  describe('rule check (OWN-117) and the device setting (OWN-114)', () => {
    it('OWN-117: Not fully checked lists why, and every banned card with its zone', () => {
      const c = ruleCheckContent(view, 'Not fully checked', 'incomplete');
      expect(c.notChecked).toEqual([
        "The deck rules aren't checked in this version of Rift Builder yet.",
        "The ban list couldn't load, so banned cards can't be checked.",
      ]);
      expect(c.banned).toEqual([]);
    });

    it('OWN-114: the stored view mode is Card view unless it is "list"', () => {
      expect(parseViewMode(null)).toBe('card');
      expect(parseViewMode('list')).toBe('list');
      expect(parseViewMode('grid')).toBe('card');
    });
  });
});
