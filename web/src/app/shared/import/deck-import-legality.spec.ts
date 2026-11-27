/**
 * SPEC-006 Deck Import, section F (DECK-050…056, H-344): the review step shows SPEC-002 legality (H-194 engine and the
 * shipped `data/banlist.json` / `data/formats.json`), as of the user's local today, and never blocks Save. Card
 * attributes in the "complete data" catalog are invented test data (SPEC-001 does not provide them yet).
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import banlistJson from '../../../../../data/banlist.json';
import formatsJson from '../../../../../data/formats.json';
import { makeCard } from '../../core/decks/engine-fixtures';
import type { CollectionCatalogView } from '../../core/decks/types';
import { KENNEN_1, fixtureCards } from '../../core/legality/legality-fixtures';
import type { BanListFile, DeckInput, FormatsFile, LegalityData } from '../../core/legality/types';
import { RULE_CHECK_TEXT } from '../deck-detail/detail-view';
import { DECK_REVIEW_TEXT, type DeckReviewState, EMPTY_REVIEW_STATE, type PreparedDeck, prepareDeckImport, reviewDeck } from './deck-import';
import { DeckReview } from './deck-review';
import { parseCardText, sourceLines } from './parse-card-list';

const DATA: LegalityData = { bans: banlistJson as BanListFile, formats: formatsJson as FormatsFile };
const NOV_23 = new Date(2026, 10, 23);

/**
 * The SPEC-002 fixture cards as a browser catalog; `incomplete` drops every attribute SPEC-001 can't give yet from all
 * cards but the Legends (so the deck's domains are known and the other cards' missing domains are what is reported).
 */
function catalogView(incomplete = false): CollectionCatalogView {
  const view: CollectionCatalogView = { catalogVersion: '0.3+test', sets: [], cards: {}, printings: {} };
  for (const c of fixtureCards()) {
    const { card, printings } = makeCard({ name: c.name, category: c.category });
    view.cards[card.cardKey] = incomplete && c.category !== 'legend'
      ? card
      : { ...card, type: c.type, domains: c.domains, isChampionUnit: c.isChampionUnit, isSignature: c.isSignature, championTag: c.championTag };
    for (const p of printings) view.printings[p.printingId] = p;
  }
  return view;
}

function riotText(d: DeckInput, extraMain: string[] = []): string {
  const lines = (xs: DeckInput['main']) => xs.map((x) => `${x.qty} ${x.name}`);
  return [
    'Legend:',
    `1 ${d.legend}`,
    'Champion:',
    `1 ${d.chosenChampion}`,
    'Main Deck:',
    ...lines(d.main),
    ...extraMain,
    'Battlefields:',
    ...lines(d.battlefields),
    'Rune Pool:',
    ...lines(d.runes),
    'Sideboard:',
    ...lines(d.sideboard),
  ].join('\n');
}

const COMPLETE = catalogView();
const prep = (text: string, data: LegalityData | null = DATA, catalog = COMPLETE): PreparedDeck =>
  prepareDeckImport(parseCardText(text), sourceLines(text), catalog, data);
const review = (p: PreparedDeck, today = NOV_23, s: Partial<DeckReviewState> = {}) => reviewDeck(p, { ...EMPTY_REVIEW_STATE, ...s }, today);

describe('SPEC-006 Deck Import: legality in the review (DECK-050…056, H-344)', () => {
  it('DECK-050 / DECK-051 / AC 1: KENNEN_1 on Nov 23, 2026 is "Not legal in Standard today", with LEGAL-016 messages and each ban "banned since"', () => {
    const r = review(prep(riotText(KENNEN_1)));
    const lg = r.legality!;
    expect(lg.result?.format).toBe('standard');
    expect(lg.result?.region).toBe('global');
    expect(lg.result?.asOf).toBe('2026-11-23');
    expect(lg.verdict).toBe('illegal');
    expect(lg.label).toBe('Not legal in Standard today');
    expect(lg.failed).toEqual([
      'Nocturne, Horrifying is banned in Standard as of Nov 23, 2026 (Radiance ban list update, effective Nov 23, 2026).',
      'Rhasa the Sunderer is banned in Standard as of Nov 23, 2026 (Radiance ban list update, effective Nov 23, 2026).',
    ]);
    expect(lg.banned).toEqual([
      { text: 'Nocturne, Horrifying, banned since Nov 23, 2026', zone: 'Main Deck', waveName: 'Radiance ban list update', upcoming: false },
      { text: 'Rhasa the Sunderer, banned since Nov 23, 2026', zone: 'Main Deck', waveName: 'Radiance ban list update', upcoming: false },
    ]);
    for (const id of ['LEGAL-003', 'LEGAL-005', 'LEGAL-008', 'LEGAL-010', 'LEGAL-011', 'LEGAL-013']) {
      expect(lg.result!.rules.find((x) => x.ruleId === id)?.status, id).toBe('pass');
    }
    expect(r.canSave).toBe(true);
  });

  it('DECK-051: a deck legal as of today reads "Legal in Standard as of Nov 8, 2026"', () => {
    const lg = review(prep(riotText(KENNEN_1)), new Date(2026, 10, 8)).legality!;
    expect(lg.verdict).toBe('legal');
    expect(lg.label).toBe('Legal in Standard as of Nov 8, 2026');
    expect(lg.failed).toEqual([]);
    expect(lg.banned).toEqual([]);
  });

  it('DECK-050 / DECK-055 / AC 2: bans never block Save and the draft stores no verdict', () => {
    const r = review(prep(riotText(KENNEN_1)));
    expect(r.legality?.verdict).toBe('illegal');
    expect(r.canSave).toBe(true);
    expect(JSON.stringify(r.draft)).not.toMatch(/verdict|legality|banned/i);
  });

  it('DECK-055: the verdict is computed when shown, as of the day passed in (Nov 22 vs Nov 23)', () => {
    const p = prep(riotText(KENNEN_1));
    expect(review(p, new Date(2026, 10, 22)).legality?.verdict).toBe('legal');
    expect(review(p, NOV_23).legality?.verdict).toBe('illegal');
  });

  it('DECK-052 / AC 18: cards without domain data read "Not fully checked" with the reasons, never "Legal"', () => {
    const lg = review(prep(riotText(KENNEN_1), DATA, catalogView(true)), new Date(2026, 10, 8)).legality!;
    expect(lg.verdict).toBe('incomplete');
    expect(lg.label).toBe('Not fully checked');
    expect(lg.notChecked.some((n) => n.startsWith('Missing domain data for: '))).toBe(true);
    expect(lg.label).not.toMatch(/^Legal/);
  });

  it('DECK-052: without ban and format data the review reads "Not fully checked" and says the ban list could not load', () => {
    const r = review(prep(riotText(KENNEN_1), null));
    expect(r.legality).toMatchObject({ verdict: 'incomplete', label: 'Not fully checked', notChecked: [RULE_CHECK_TEXT.noBans], result: null });
    expect(r.canSave).toBe(true);
  });

  it('DECK-053: upcoming bans are info, "will be banned from Nov 23, 2026", and not failures', () => {
    const lg = review(prep(riotText(KENNEN_1)), new Date(2026, 10, 15)).legality!;
    expect(lg.banned).toEqual([
      { text: 'Nocturne, Horrifying, will be banned from Nov 23, 2026', zone: 'Main Deck', waveName: 'Radiance ban list update', upcoming: true },
      { text: 'Rhasa the Sunderer, will be banned from Nov 23, 2026', zone: 'Main Deck', waveName: 'Radiance ban list update', upcoming: true },
    ]);
    expect(lg.failed).toEqual([]);
    expect(lg.verdict).toBe('legal');
  });

  it('DECK-054: legality re-runs on every edit in review (removing a line changes it)', () => {
    const p = prep(riotText(KENNEN_1));
    const nocturne = p.lines.find((l) => l.card?.name === 'Nocturne, Horrifying')!.id;
    const before = review(p).legality!;
    const after = review(p, NOV_23, { removed: new Set([nocturne]) }).legality!;
    expect(before.banned.map((b) => b.text)).toContain('Nocturne, Horrifying, banned since Nov 23, 2026');
    expect(after.banned.map((b) => b.text)).not.toContain('Nocturne, Horrifying, banned since Nov 23, 2026');
    expect(after.result!.counts.main).toBe(37);
  });

  it('DECK-056: unresolved lines are left out of the check and counted ("1 unresolved card not checked")', () => {
    const one = review(prep(riotText(KENNEN_1, ['2 Lightning Rsh'])));
    expect(one.legality?.unresolved).toBe('1 unresolved card not checked');
    expect(one.legality?.result?.rules.find((x) => x.ruleId === 'LEGAL-019')?.status).toBe('pass');
    expect(one.legality?.failed.join(' ')).not.toContain('Lightning Rsh');
    expect(one.canSave).toBe(false);
    const two = review(prep(riotText(KENNEN_1, ['2 Lightning Rsh', '1 Not A Card'])));
    expect(two.legality?.unresolved).toBe(DECK_REVIEW_TEXT.unresolvedNotChecked(2));
    expect(two.legality?.unresolved).toBe('2 unresolved cards not checked');
  });

  it('DECK-050: nothing resolved yet → no legality block (SPEC-006 `legality: null`)', () => {
    expect(review(prep('3 Not A Card')).legality).toBeNull();
  });

  describe('DECK-051 review step display', () => {
    async function render(today: Date): Promise<HTMLElement> {
      TestBed.configureTestingModule({ imports: [DeckReview] });
      const f: ComponentFixture<DeckReview> = TestBed.createComponent(DeckReview);
      f.componentRef.setInput('prepared', prep(riotText(KENNEN_1)));
      f.componentRef.setInput('today', () => today);
      f.detectChanges();
      await f.whenStable();
      f.detectChanges();
      return f.nativeElement as HTMLElement;
    }

    it('DECK-051: shows Rule check with the verdict, the failed rules and the banned cards with zone and wave', async () => {
      const root = await render(NOV_23);
      const block = root.querySelector<HTMLElement>('section.legality-check')!;
      expect(block.getAttribute('aria-labelledby')).toBe('deck-review-legality');
      expect(block.querySelector('h3')?.textContent?.trim()).toBe('Rule check');
      expect(block.querySelector('.verdict')?.textContent?.trim()).toBe('Not legal in Standard today');
      const subs = [...block.querySelectorAll('h4')].map((h) => h.textContent?.trim());
      expect(subs).toContain('Rules not met');
      expect(subs).toContain('Banned cards');
      const banned = [...block.querySelectorAll('ul.banned li')].map((li) => li.textContent?.replace(/\s+/g, ' ').trim());
      expect(banned).toEqual([
        'Nocturne, Horrifying, banned since Nov 23, 2026 · Main Deck · Radiance ban list update',
        'Rhasa the Sunderer, banned since Nov 23, 2026 · Main Deck · Radiance ban list update',
      ]);
      expect(root.querySelector('.blockers')?.textContent?.trim()).toBe('Ready to save.');
    });

    it('H-676 AC 42 / DECK-107: the review Rule check shows "Missing domain data for n cards" with the names behind "Show cards"', async () => {
      TestBed.configureTestingModule({ imports: [DeckReview] });
      const f: ComponentFixture<DeckReview> = TestBed.createComponent(DeckReview);
      f.componentRef.setInput('prepared', prep(riotText(KENNEN_1), DATA, catalogView(true)));
      f.componentRef.setInput('today', () => new Date(2026, 10, 8));
      f.detectChanges();
      await f.whenStable();
      f.detectChanges();
      const root = f.nativeElement as HTMLElement;
      const line = root.querySelector<HTMLElement>('section.legality-check ul.not-checked li')!;
      expect(line.textContent?.replace(/\s+/g, ' ').trim()).toMatch(/^Missing domain data for \d+ cards? Show cards$/);
      expect(line.textContent).not.toContain(':');
      const toggle = line.querySelector<HTMLButtonElement>('button')!;
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      toggle.click();
      f.detectChanges();
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      expect(line.querySelectorAll('ul.names li').length).toBeGreaterThan(0);
    });

    it('DECK-053: an upcoming ban is listed with "will be banned from"', async () => {
      const root = await render(new Date(2026, 10, 15));
      expect(root.querySelector('.verdict')?.textContent?.trim()).toBe('Legal in Standard as of Nov 15, 2026');
      expect(root.querySelector('ul.banned li.upcoming')?.textContent).toContain('Nocturne, Horrifying, will be banned from Nov 23, 2026');
    });
  });
});
