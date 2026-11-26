/**
 * Deck detail `/decks/:id` end to end over real tracked stores and a fixed catalog (SPEC-005 OWN-010, OWN-011,
 * OWN-050…053, OWN-110…119; ACs 7, 8, 17, 27…31, 33; SPEC-006 DECK-081…085, ACs 27…29; SPEC-008 SHARE-025, AC 22).
 */
import { BreakpointObserver } from '@angular/cdk/layout';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { routes } from '../../app.routes';
import { CardData, CatalogResult } from '../../core/cards/card-data';
import { lock, makeDeck, makeInput } from '../../core/decks/engine-fixtures';
import type { TournamentDeckSource, UserDeck } from '../../core/decks';
import { NEW_DECK_ID } from '../../core/import/deck-import';
import { AppStores } from '../../core/storage/app-stores';
import { BrowserStores, createBrowserStores } from '../../core/storage/browser-stores';
import { MemoryBackend } from '../../core/storage/kv-backend';
import { STORAGE_KEYS } from '../../core/storage/local-stores';
import { provideOpenGate } from '../../core/sync/testing/open-gate';
import { DETAIL_ALL_OWNED, DETAIL_CATALOG, DETAIL_DECK_ID, DETAIL_OWNED, detailDeck } from '../../shared/deck-detail/detail-fixtures';
import { DECK_VIEW_KEY } from '../../shared/deck-detail/detail-view';
import { cssRules, targets } from '../../shared/testing/css-rules';
import { DEVICE_STORAGE, RAW_DECK_RECORD } from './deck-detail';

type Width = 'desktop' | 'tablet' | 'phone';
interface Setup {
  decks?: UserDeck[];
  owned?: Record<string, number> | null;
  locks?: string[];
  width?: Width;
  corruptCollection?: boolean;
  catalogError?: boolean;
  device?: Record<string, string>;
  raw?: Record<string, string>;
}

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

let backend: MemoryBackend;
let stores: BrowserStores;
let device: Record<string, string>;
let clipboard: string[];

function breakpoints(width: Width) {
  // desktop ≥ 64rem: only the min-width query matches; tablet: none; phone: the max-width query.
  const matches = (q: string) => (width === 'desktop' ? q.includes('min-width') : width === 'phone' ? q.includes('max-width') : false);
  return { observe: (q: string) => of({ matches: matches(q), breakpoints: {} }), isMatched: matches };
}

async function setup(url: string, s: Setup = {}) {
  backend = new MemoryBackend();
  stores = createBrowserStores(backend, { now: () => Date.now(), changed: () => undefined, readOnly: () => false });
  for (const d of s.decks ?? [detailDeck()]) await stores.raw.decks.put(d);
  if (s.owned !== null) await stores.raw.collection.save(makeInput(DETAIL_CATALOG, { owned: s.owned ?? DETAIL_OWNED }).collection);
  if (s.locks) await stores.raw.locks.save({ schemaVersion: 1, updatedAt: '', locks: s.locks.map((id) => lock(id)) });
  if (s.corruptCollection) backend.set(STORAGE_KEYS.collection, '{not json');
  for (const [k, v] of Object.entries(s.raw ?? {})) backend.set(k, v);
  device = { ...(s.device ?? {}) };
  clipboard = [];
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: async (t: string) => void clipboard.push(t) },
  });
  const cardData: Partial<CardData> = {
    loadCatalog: async (): Promise<CatalogResult> => (s.catalogError ? { status: 'error' } : { status: 'ok', catalog: DETAIL_CATALOG }),
    reload: async (): Promise<CatalogResult> => ({ status: 'ok', catalog: DETAIL_CATALOG }),
    loadBans: async () => null,
  };
  let n = 0;
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes, withComponentInputBinding()),
      provideOpenGate(),
      { provide: AppStores, useValue: { stores } },
      { provide: CardData, useValue: cardData },
      { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
      { provide: BreakpointObserver, useValue: breakpoints(s.width ?? 'desktop') },
      { provide: DEVICE_STORAGE, useValue: { getItem: (k: string) => device[k] ?? null, setItem: (k: string, v: string) => (device[k] = v) } },
      { provide: RAW_DECK_RECORD, useValue: (id: string) => backend.get(`${STORAGE_KEYS.deckPrefix}${id}`) },
      { provide: NEW_DECK_ID, useValue: () => `0b7c0000-0000-4000-8000-0000000000b${++n}` },
    ],
  });
  const harness = await RouterTestingHarness.create(url);
  await settle(harness);
  return harness;
}

async function settle(harness: RouterTestingHarness, rounds = 6): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 0));
  }
}

const URL_ = `/decks/${DETAIL_DECK_ID}`;
const text = (e: Element | null | undefined) => (e?.textContent ?? '').replace(/\s+/g, ' ').trim();
const root = (h: RouterTestingHarness) => h.routeNativeElement as HTMLElement;
const q = (h: RouterTestingHarness, sel: string) => root(h).querySelector<HTMLElement>(sel);
const qa = (h: RouterTestingHarness, sel: string) => Array.from(root(h).querySelectorAll<HTMLElement>(sel));
const tile = (h: RouterTestingHarness, id: string) => q(h, `[data-card="${id}"]`)!;
const snack = () => text(document.querySelector('mat-snack-bar-container .mat-mdc-simple-snack-bar > :first-child')) || null;
const snackAction = () => document.querySelector<HTMLButtonElement>('mat-snack-bar-container button');
const dialogEl = () => document.querySelector('mat-dialog-container');
const menuItems = () => Array.from(document.querySelectorAll<HTMLButtonElement>('.mat-mdc-menu-panel [mat-menu-item]'));
const menuItem = (label: string) => menuItems().find((b) => text(b) === label)!;

async function openMore(h: RouterTestingHarness): Promise<void> {
  q(h, 'button[aria-label="More actions"]')!.click();
  await settle(h);
}

describe('Deck detail (H-254)', () => {
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((n) => (n.innerHTML = ''));
  });

  describe('header (OWN-010, OWN-101)', () => {
    it('OWN-010 / SPEC-005 AC 28: back link, name, description, source line, legality with Rule check, summary, Copy missing list and More (no Edit cards)', async () => {
      const deck = { ...detailDeck(), notes: 'Budget list, swap the sideboard later.' };
      const h = await setup(URL_, { decks: [deck] });
      expect(q(h, 'a.back')!.getAttribute('href')).toBe('/decks');
      expect(text(q(h, 'h1'))).toBe('Kennen Tempo');
      expect(text(q(h, '.description-text'))).toBe('Budget list, swap the sideboard later.');
      expect(text(q(h, '.source'))).toBe('Imported');
      expect(text(q(h, '.legality'))).toBe('Not fully checked');
      expect(text(q(h, '.meta button'))).toBe('Rule check');
      expect(text(q(h, '.cards'))).toBe('2 of 8 cards fully available');
      expect(text(q(h, '.split-main'))).toBe('Copy missing list');
      await openMore(h);
      expect(menuItems().map(text)).toEqual(['Copy deck list', 'Download .txt', 'Duplicate', 'Rename', 'Delete']);
      expect(root(h).textContent).not.toMatch(/Edit cards/);
      expect(document.title).toBe('Kennen Tempo · Rift Builder');
    });

    it('OWN-010 (f) / OWN-101 (d) / AC 33: "12 of 23 copies available · 52%", accessible text "52 percent"; the cards line has no percentage', async () => {
      const h = await setup(URL_);
      const copies = q(h, '.copies')!;
      expect(text(copies)).toBe('12 of 23 copies available · 52%, 52 percent');
      expect(text(copies.querySelector('[aria-hidden="true"]'))).toBe('· 52%');
      expect(text(copies.querySelector('.visually-hidden'))).toBe(', 52 percent');
      expect(text(q(h, '.cards'))).not.toMatch(/%|percent/);
    });

    it('OWN-010 (c) / AC 28: an empty description shows nothing (no placeholder)', async () => {
      const h = await setup(URL_);
      expect(q(h, '.description')).toBeNull();
    });

    it('OWN-010 (d) / OWN-104: a tournament deck shows the source line, the player and a plain Source link', async () => {
      const h = await setup(URL_, { decks: [{ ...detailDeck(), source: TOURNAMENT }] });
      expect(text(q(h, '.source'))).toBe('1st, Riftbound Regional Championship: Europe · Nov 6, 2026 – Nov 8, 2026 · ASC Evansrhim · Source (opens in a new tab)');
      const link = q(h, '.source-link')!;
      expect(link.getAttribute('href')).toBe('https://example.test/decklist/1');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer nofollow');
    });

    it('OWN-010 (f) / AC 33: a locked complete deck reads "23 of 23 copies locked in · 100%"', async () => {
      const h = await setup(URL_, { owned: DETAIL_ALL_OWNED, locks: [DETAIL_DECK_ID] });
      expect(text(q(h, '.copies'))).toBe('23 of 23 copies locked in · 100%, 100 percent');
      expect(text(q(h, '#zone-runes'))).toBe('Runes · 12 cards · 12 locked in');
    });

    it('OWN-101 (c) / AC 33: an empty deck reads "No cards to count" with no " · " and no percentage', async () => {
      const h = await setup(URL_, { decks: [makeDeck(DETAIL_DECK_ID, 'Empty', {})] });
      expect(text(q(h, '.copies'))).toBe('No cards to count');
      expect(q(h, '.cards')).toBeNull();
      expect(qa(h, '.empty-zone').map(text)).toEqual(Array(6).fill('No cards in this zone'));
      expect(text(q(h, '.tabpanel'))).toBe('This deck has no cards.');
    });

    it('OWN-062 / OWN-101 (c) / AC 33: ownership unavailable → banner, no percentage, tiles full colour without labels', async () => {
      const h = await setup(URL_, { corruptCollection: true });
      expect(text(q(h, '.banner[role="alert"]'))).toBe('Ownership unavailable: your collection could not be read.');
      expect(text(q(h, '.copies'))).toBe('Ownership unavailable');
      expect(root(h).textContent).not.toMatch(/%/);
      expect(qa(h, 'app-ownership-chip')).toHaveLength(0);
      expect(text(q(h, '#zone-main'))).toBe('Main Deck · 6 cards');
      expect(q(h, '.split-main')).toBeNull(); // OWN-116: Copy missing list hidden
    });

    it('OWN-063: card data not loaded → banner with Try again; stored names shown', async () => {
      const h = await setup(URL_, { catalogError: true });
      expect(text(q(h, '.banner[role="alert"] p'))).toBe('Card data not loaded');
      expect(q(h, '.copies')!.textContent).not.toMatch(/%/);
    });

    it('OWN-015: ban data not loaded → one page notice; no ban label on the tiles; "Ban status unknown" in the Card tab', async () => {
      const h = await setup(URL_);
      expect(text(q(h, '.notice span'))).toBe("The ban list couldn't load, so ban status is unknown.");
      expect(q(h, '.grid app-status-label')).toBeNull();
      expect(text(q(h, '.tabpanel app-status-label'))).toBe('Ban status unknown');
    });

    it('AC 33 / OWN-119 (d): an import in another tab raises A to 23 → "23 of 23 copies available · 100%" without reload', async () => {
      const h = await setup(URL_);
      await stores.raw.collection.save(makeInput(DETAIL_CATALOG, { owned: DETAIL_ALL_OWNED }).collection);
      dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEYS.collection }));
      await new Promise((r) => setTimeout(r, 50));
      await settle(h);
      expect(text(q(h, '.copies'))).toBe('23 of 23 copies available · 100%, 100 percent');
    });
  });

  describe('sections, panel and views (OWN-011, OWN-110…115)', () => {
    it('OWN-011 / AC 8 / AC 17: six sections in Riot order with their counts', async () => {
      const h = await setup(URL_);
      expect(qa(h, '.zone-title').map(text)).toEqual([
        'Legend · 1 card · 1 available',
        'Chosen Champion · 1 card · 0 available',
        'Main Deck · 6 cards · 4 available',
        'Battlefields · 1 card · 0 available',
        'Runes · 12 cards · 6 available',
        'Sideboard · 2 cards · 1 available',
      ]);
      expect(text(q(h, '[data-card="runes:chaos rune"]'))).toContain('6 of 9 available');
      expect(tile(h, 'runes:chaos rune').getAttribute('aria-label')).toBe('Chaos Rune, Runes, 6 of 9 available, ban status unknown');
    });

    it('OWN-110: a section bar with six in-page links; the first is the current location', async () => {
      const h = await setup(URL_);
      const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
      const links = qa(h, '.section-nav a');
      expect(q(h, 'nav.section-nav')!.getAttribute('aria-label')).toBe('Deck sections');
      expect(links.map(text)).toEqual(['Legend', 'Champion', 'Main 6', 'Battlefields 1', 'Runes 12', 'Sideboard 2']);
      expect(links[0].getAttribute('aria-current')).toBe('location');
      links[2].click();
      await settle(h);
      expect(links[2].getAttribute('aria-current')).toBe('location');
      expect(document.activeElement?.id).toBe('zone-main');
      scrollTo.mockRestore();
    });

    it('OWN-110 / H-390: a jump scrolls only the page, lands the heading under the bars, and keeps its target current while in flight and after', async () => {
      const h = await setup(URL_);
      const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
      const linkScroll = vi.fn();
      const links = qa(h, '.section-nav a');
      links.forEach((a) => (a.scrollIntoView = linkScroll));
      const runes = q(h, '#zone-runes')!;
      const rect = (top: number) => ({ top, bottom: top + 30, left: 0, right: 0, width: 0, height: 30, x: 0, y: top, toJSON: () => ({}) });
      vi.spyOn(runes, 'getBoundingClientRect').mockReturnValue(rect(900) as DOMRect);
      vi.spyOn(q(h, '#zone-sideboard')!, 'getBoundingClientRect').mockReturnValue(rect(1500) as DOMRect);
      const current = () => links.filter((a) => a.getAttribute('aria-current') === 'location').map(text);

      links[4].click();
      await settle(h, 2);
      // jsdom: no site header (64 px fallback), the bar measures 0; landing gap 12 → 900 − 64 − 12.
      expect(scrollTo).toHaveBeenCalledWith({ top: 824, behavior: 'auto' });
      expect(current()).toEqual(['Runes 12']);
      expect(document.activeElement).toBe(runes);

      // In flight: scroll events (Legend…Battlefields sit at 0, so Battlefields would be current) leave the target alone,
      // and the page is never scrolled through a nav link.
      dispatchEvent(new Event('scroll'));
      await settle(h, 2);
      expect(current()).toEqual(['Runes 12']);
      expect(linkScroll).not.toHaveBeenCalled();

      // Ended (scrollend): pinned while the page stays where the jump left it.
      dispatchEvent(new Event('scrollend'));
      dispatchEvent(new Event('scroll'));
      await settle(h, 2);
      expect(current()).toEqual(['Runes 12']);

      // The user scrolls on: the normal test takes over (the last heading at or above the landing line).
      Object.defineProperty(window, 'scrollY', { configurable: true, value: 500 });
      dispatchEvent(new Event('scroll'));
      await settle(h, 2);
      expect(current()).toEqual(['Battlefields 1']); // Runes (900) and Sideboard (1500) are below the line
      Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
      scrollTo.mockRestore();
    });

    it('OWN-110: without scrollend the jump ends after a quiet moment', async () => {
      const h = await setup(URL_);
      const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
      const links = qa(h, '.section-nav a');
      links[1].click();
      await new Promise((r) => setTimeout(r, 200));
      Object.defineProperty(window, 'scrollY', { configurable: true, value: 300 });
      dispatchEvent(new Event('scroll'));
      await settle(h, 2);
      expect(links.filter((a) => a.getAttribute('aria-current') === 'location').map(text)).toEqual(['Sideboard 2']);
      Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
      scrollTo.mockRestore();
    });

    it('OWN-111 / AC 27: on desktop the panel opens on the Card tab with the Legend selected; a press selects another card; Missing shows counts without %', async () => {
      const h = await setup(URL_);
      const panel = q(h, 'aside.panel')!;
      expect(qa(h, '[role="tab"]').map(text)).toEqual(['Card', 'Missing']);
      expect(q(h, '#deck-tab-card')!.getAttribute('aria-selected')).toBe('true');
      expect(text(panel.querySelector('h2'))).toBe('Kennen, Heart of the Tempest');
      expect(tile(h, 'legend:kennen heart of the tempest').getAttribute('aria-current')).toBe('true');
      expect(text(panel)).toContain('This deck');
      expect(text(panel)).not.toMatch(/%|percent/);

      tile(h, 'main:lightning rush').click();
      await settle(h);
      expect(text(panel.querySelector('h2'))).toBe('Lightning Rush');
      expect(tile(h, 'legend:kennen heart of the tempest').getAttribute('aria-current')).toBeNull();
      expect(tile(h, 'main:lightning rush').getAttribute('aria-current')).toBe('true');
      expect(tile(h, 'main:lightning rush').getAttribute('aria-haspopup')).toBeNull();

      q(h, '#deck-tab-missing')!.click();
      await settle(h);
      const missing = text(q(h, '.tabpanel'));
      expect(missing).toContain('12 of 23 copies available');
      expect(missing).toContain('2 of 8 cards fully available');
      expect(missing).toContain('Missing · 11 copies');
      expect(missing).toContain('Copy missing list');
      expect(missing).not.toMatch(/%|percent/);

      tile(h, 'main:fizz trickster').click();
      await settle(h);
      expect(q(h, '#deck-tab-card')!.getAttribute('aria-selected')).toBe('true');
      expect(text(q(h, '.tabpanel h2'))).toBe('Fizz, Trickster');
    });

    it('OWN-111 (c): the tab list moves with the arrow keys', async () => {
      const h = await setup(URL_);
      q(h, '[role="tab"][aria-selected="true"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await settle(h);
      expect(q(h, '#deck-tab-missing')!.getAttribute('aria-selected')).toBe('true');
      q(h, '[role="tab"][aria-selected="true"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
      await settle(h);
      expect(q(h, '#deck-tab-card')!.getAttribute('aria-selected')).toBe('true');
    });

    it('OWN-111 (b) / AC 27: with an empty Legend section the Chosen Champion is selected', async () => {
      const h = await setup(URL_, { decks: [{ ...detailDeck(), legend: null }] });
      expect(text(q(h, '.tabpanel h2'))).toBe('Kennen, Storm of Shuriken');
    });

    it('OWN-111 (b): a selected card that leaves the deck (another tab) is replaced by the first card with a polite status', async () => {
      const h = await setup(URL_);
      tile(h, 'main:lightning rush').click();
      await settle(h);
      const deck = detailDeck();
      await stores.raw.decks.put({ ...deck, main: deck.main.filter((c) => c.cardKey !== 'lightning rush') });
      dispatchEvent(new StorageEvent('storage', { key: `${STORAGE_KEYS.deckPrefix}${DETAIL_DECK_ID}` }));
      await new Promise((r) => setTimeout(r, 50));
      await settle(h);
      expect(text(q(h, '.tabpanel h2'))).toBe('Kennen, Heart of the Tempest');
      expect(text(q(h, 'p[role="status"].visually-hidden'))).toBe('That card is no longer in this deck.');
    });

    it('OWN-038: each section grid is one Tab stop with arrow-key roving', async () => {
      const h = await setup(URL_);
      const main = qa(h, '#section-main [data-card]');
      expect(main.map((b) => b.tabIndex)).toEqual([0, -1, -1]);
      main[0].focus();
      main[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await settle(h);
      expect(document.activeElement).toBe(qa(h, '#section-main [data-card]')[1]);
      expect(qa(h, '#section-main [data-card]').map((b) => b.tabIndex)).toEqual([-1, 0, -1]);
    });

    it('OWN-115 / OWN-040: the tile face has ×N from 2, the count chip, the deck-total line for a split card and the shared line', async () => {
      const other = detailDeck('0b7c0000-0000-4000-8000-0000000000a2', 'Jinx Aggro');
      const h = await setup(URL_, { decks: [detailDeck(), other] });
      const lr = tile(h, 'main:lightning rush');
      expect(text(lr.querySelector('.badge'))).toBe('×3');
      expect(text(tile(h, 'main:fizz trickster').querySelector('.badge'))).toBe('');
      expect(text(lr.querySelector('app-ownership-chip'))).toBe('1 of 3 available');
      const emp = tile(h, 'sideboard:the empyrean');
      expect(text(emp.querySelector('app-ownership-chip'))).toBe('0 of 1 available');
      expect(text(emp.querySelector('.split'))).toBe('2 of 3 in this deck');
      expect(text(lr.querySelector('.shared'))).toBe('Also in 1 other deck');
    });

    it('OWN-114 / AC 30: List view rows "3× Lightning Rush" with the label; "1×" shown; Fizz in Main and Sideboard; remembered on this device', async () => {
      const h = await setup(URL_);
      const toggle = qa(h, '.view-toggle button');
      expect(toggle.map((b) => [text(b), b.getAttribute('aria-pressed')])).toEqual([
        ['Card view', 'true'],
        ['List view', 'false'],
      ]);
      toggle[1].click();
      await settle(h);
      expect(qa(h, 'app-deck-card-tile')).toHaveLength(0);
      const row = tile(h, 'main:lightning rush');
      expect(text(row.querySelector('.title'))).toBe('3× Lightning Rush');
      expect(text(row.querySelector('app-ownership-chip'))).toBe('1 of 3 available');
      expect(text(tile(h, 'main:fizz trickster').querySelector('.title'))).toBe('1× Fizz, Trickster');
      expect(q(h, '[data-card="sideboard:fizz trickster"]')).not.toBeNull();
      expect(device[DECK_VIEW_KEY]).toBe('list');
      row.click();
      await settle(h);
      expect(text(q(h, '.tabpanel h2'))).toBe('Lightning Rush');
    });

    it('OWN-114 / AC 30: List view stays on after a reload on this device', async () => {
      const h = await setup(URL_, { device: { [DECK_VIEW_KEY]: 'list' } });
      expect(qa(h, 'app-deck-card-row').length).toBe(10);
      expect(q(h, '.view-toggle button[aria-pressed="true"]')!.textContent).toContain('List view');
    });

    it('OWN-111 (d) / OWN-113 / AC 29: below 64rem no panel; the missing list sits under the header; a press opens the dialog and Escape returns focus', async () => {
      for (const width of ['phone', 'tablet'] as const) {
        const h = await setup(URL_, { width });
        expect(q(h, 'aside.panel')).toBeNull();
        expect(text(q(h, '.missing-flow'))).toContain('Missing · 11 copies');
        expect(q(h, '.missing-flow')!.textContent).not.toMatch(/copies available|%/);
        const lr = tile(h, 'main:lightning rush');
        expect(lr.getAttribute('aria-haspopup')).toBe('dialog');
        lr.click();
        await settle(h);
        expect(text(dialogEl()?.querySelector('h2'))).toBe('Lightning Rush');
        expect(text(dialogEl())).toContain('Available to this deck: 1');
        expect(text(dialogEl())).not.toMatch(/%|percent/);
        dialogEl()!.querySelector('app-deck-card-dialog')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        await settle(h);
        expect(dialogEl()).toBeNull();
        expect(document.activeElement).toBe(tile(h, 'main:lightning rush'));
        TestBed.resetTestingModule();
        document.querySelectorAll('.cdk-overlay-container').forEach((n) => (n.innerHTML = ''));
      }
    });

    it('OWN-051: below 64rem a missing list over 10 lines shows 10 and "Show all n lines"; exactly 10 shows all', async () => {
      const h = await setup(URL_, { width: 'tablet', owned: {} });
      expect(q(h, '.missing-flow')!.querySelectorAll('li')).toHaveLength(10);
      expect(Array.from(q(h, '.missing-flow')!.querySelectorAll('button')).some((b) => /Show all/.test(text(b)))).toBe(false);
      TestBed.resetTestingModule();
      const eleven = makeDeck(DETAIL_DECK_ID, 'Eleven', { main: Array.from({ length: 11 }, (_, i) => [`Gone Card ${i + 1}`, 1] as [string, number]) });
      const h2 = await setup(URL_, { width: 'tablet', decks: [eleven] });
      const flow = q(h2, '.missing-flow')!;
      expect(flow.querySelectorAll('li')).toHaveLength(10);
      const more = Array.from(flow.querySelectorAll('button')).find((b) => /Show all/.test(text(b)))!;
      expect(text(more)).toBe('Show all 11 lines');
      more.click();
      await settle(h2);
      expect(flow.querySelectorAll('li')).toHaveLength(11);
      expect(more.getAttribute('aria-expanded')).toBe('true');
    });

    it('H-475: the header actions come after the title and status in the DOM; from 40rem they sit beside them (wrapping flex row) with the reason line under the whole row', async () => {
      const h = await setup(URL_);
      const header = q(h, 'header.deck-header')!;
      const main = header.querySelector('.header-top > .header-main')!;
      const actions = header.querySelector('.header-top > .actions')!;
      expect(main.nextElementSibling).toBe(actions);
      for (const sel of ['.deck-name', '.meta', '.summary']) expect(main.querySelector(sel)).not.toBeNull();
      // Focus order (DOM order of the header's controls): status → Lock in → Copy missing list → chevron → More.
      const controls = Array.from(header.querySelectorAll<HTMLElement>('a, button')).map((b) => b.getAttribute('aria-label') ?? text(b));
      expect(controls).toEqual(['Decks', 'Rule check', 'Lock in', 'Copy missing list', 'More copy options', 'More actions']);
      expect(q(h, 'app-lock-actions')!.classList).toContain('in-row');
      // The ban-list and other notices stay below the header.
      expect(header.nextElementSibling!.classList).toContain('notices');

      const DESKTOP = (m: string | null) => m === '(min-width: 40rem)';
      const desktop = (cls: string) => cssRules((s) => targets(s, cls)).filter((r) => DESKTOP(r.media));
      expect(desktop('header-top')[0].style.getPropertyValue('display')).toBe('flex');
      expect(desktop('header-top')[0].style.getPropertyValue('flex-wrap')).toBe('wrap');
      expect(desktop('header-main')[0].style.getPropertyValue('min-width')).toBe('0px');
      const side = cssRules((s) => s.trim() === '.header-top > .actions').find((r) => DESKTOP(r.media))!;
      expect(side.style.getPropertyValue('flex')).toMatch(/^0 0 auto$/);
      // Phones keep the one-column header (no flex row outside the desktop query).
      expect(cssRules((s) => targets(s, 'header-top')).filter((r) => r.media === null).map((r) => r.style.getPropertyValue('display'))).toEqual(['grid']);
      // app-lock-actions joins the row and puts its reason under it, desktop only.
      const inRow = cssRules((s) => s.includes('in-row') && s.includes('.reason'));
      expect(inRow.map((r) => r.media)).toEqual(['(min-width: 40rem)']);
      expect(inRow[0].style.getPropertyValue('flex-basis') || inRow[0].style.getPropertyValue('flex')).toContain('100%');
    });

    it('H-461 (A13): both halves of Copy missing list are 44px tall on phones / touch (header split and the Missing copy), 40px on desktop', async () => {
      const phone = await setup(URL_, { width: 'phone' });
      expect(q(phone, '.split-main')).toBeNull(); // the phone shows the copy button under the Missing list
      expect(q(phone, 'app-deck-missing .copy-main')).not.toBeNull();
      const PHONE_OR_TOUCH = (m: string | null) => !!m && m.includes('pointer: coarse') && m.includes('max-width: 39.99rem');
      for (const [main, more] of [['split-main', 'split-more'], ['copy-main', 'copy-more']]) {
        const height = (cls: string, prop: string) =>
          cssRules((s) => targets(s, cls))
            .filter((r) => PHONE_OR_TOUCH(r.media))
            .map((r) => r.style.getPropertyValue(prop).trim())
            .find((v) => v !== '');
        expect(height(main, '--mat-button-outlined-container-height')).toBe('44px');
        expect(height(more, 'height')).toBe('44px');
        // Desktop / fine pointer: no top-level height override on the main half (Material's 40px).
        expect(cssRules((s) => targets(s, main)).filter((r) => r.media === null && r.style.getPropertyValue('--mat-button-outlined-container-height'))).toHaveLength(0);
      }
    });

    it('OWN-113: the dialog follows the deck and closes with "This card is no longer in this deck." when its card leaves', async () => {
      const h = await setup(URL_, { width: 'phone' });
      tile(h, 'main:lightning rush').click();
      await settle(h);
      const deck = detailDeck();
      await stores.raw.decks.put({ ...deck, main: deck.main.filter((c) => c.cardKey !== 'lightning rush') });
      dispatchEvent(new StorageEvent('storage', { key: `${STORAGE_KEYS.deckPrefix}${DETAIL_DECK_ID}` }));
      await new Promise((r) => setTimeout(r, 50));
      await settle(h);
      expect(dialogEl()).toBeNull();
      expect(snack()).toBe('This card is no longer in this deck.');
    });

    it('OWN-061: an unknown card is a placeholder flagged "Card no longer in the card data", 0 available, in the missing list', async () => {
      const deck = makeDeck(DETAIL_DECK_ID, 'U', { main: [['Gone Card', 2]] });
      const h = await setup(URL_, { decks: [deck] });
      const t = tile(h, 'main:gone card');
      expect(text(t.querySelector('.type'))).toBe('Card no longer in the card data');
      expect(text(t.querySelector('app-ownership-chip'))).toBe('0 of 2 available');
      expect(text(q(h, '.tabpanel'))).toContain('Card no longer in the card data');
    });
  });

  describe('actions (OWN-052, OWN-053, OWN-118; DECK-082…085)', () => {
    it('OWN-052 / OWN-053 / AC 7: Copy missing list writes the DECK-085 text; "Copy as one list" the merged list; "Missing list copied"', async () => {
      const h = await setup(URL_);
      q(h, '.split-main')!.click();
      await settle(h);
      expect(clipboard[0]).toContain('Rune Pool:\n3 Chaos Rune\n3 Order Rune');
      expect(snack()).toBe('Missing list copied');
      q(h, '.split-more')!.click();
      await settle(h);
      menuItem('Copy as one list').click();
      await settle(h);
      expect(clipboard[1].split('\n')).toEqual(['1 Kennen, Storm of Shuriken', '2 Lightning Rush', '1 Zaun Warrens', '3 Chaos Rune', '3 Order Rune', '1 The Empyrean']);
    });

    it('OWN-116: Copy missing list is hidden when nothing is missing', async () => {
      const h = await setup(URL_, { owned: DETAIL_ALL_OWNED });
      expect(q(h, '.split-main')).toBeNull();
      q(h, '#deck-tab-missing')!.click();
      await settle(h);
      expect(text(q(h, '.tabpanel'))).toContain('All cards available');
    });

    it('DECK-085: More → Copy deck list puts the Riot-style list on the clipboard', async () => {
      const h = await setup(URL_);
      await openMore(h);
      menuItem('Copy deck list').click();
      await settle(h);
      expect(clipboard[0].startsWith('Legend:\n1 Kennen, Heart of the Tempest\n\nChampion:')).toBe(true);
      expect(snack()).toBe('Deck list copied');
    });

    it('OWN-118 / SPEC-005 AC 31 / SPEC-006 AC 28 / SPEC-008 AC 22: Rename a locked tournament deck: name and description change, lock and source stay, updatedAt newer, "Deck renamed."', async () => {
      const deck = { ...detailDeck(), source: TOURNAMENT, name: 'Kennen: ASC Evansrhim (1st, Riftbound Regional Championship: Europe)' };
      const h = await setup(URL_, { decks: [deck], owned: DETAIL_ALL_OWNED, locks: [DETAIL_DECK_ID] });
      await openMore(h);
      menuItem('Rename').click();
      await settle(h);
      const d = dialogEl()!;
      expect(text(d)).toContain('Decks from Tournaments keep their source.');
      const name = d.querySelector<HTMLInputElement>('input')!;
      name.value = '';
      name.dispatchEvent(new Event('input'));
      Array.from(d.querySelectorAll('button')).find((b) => text(b) === 'Save')!.click();
      await settle(h);
      expect(text(d.querySelector('#rename-name-error'))).toBe('Give the deck a name.');
      expect((await stores.decks.get(DETAIL_DECK_ID))!.name).toBe(deck.name);

      name.value = 'Kennen budget';
      name.dispatchEvent(new Event('input'));
      const desc = d.querySelector('textarea')!;
      desc.value = 'Budget list';
      desc.dispatchEvent(new Event('input'));
      Array.from(d.querySelectorAll('button')).find((b) => text(b) === 'Save')!.click();
      await settle(h, 10);
      const stored = (await stores.decks.get(DETAIL_DECK_ID))!;
      expect(stored).toMatchObject({ name: 'Kennen budget', notes: 'Budget list', schemaVersion: 1 });
      expect(JSON.stringify(stored.source)).toBe(JSON.stringify(TOURNAMENT));
      expect(stored.updatedAt > deck.updatedAt).toBe(true);
      expect((await stores.locks.load())!.locks).toEqual([lock(DETAIL_DECK_ID)]);
      expect(text(q(h, 'h1'))).toBe('Kennen budget');
      expect(text(q(h, '.description-text'))).toBe('Budget list');
      expect(text(q(h, '.copies'))).toBe('23 of 23 copies locked in · 100%, 100 percent');
      expect(snack()).toBe('Deck renamed.');
    });

    it('OWN-119 (c) / OWN-064 / AC 31: a read-only deck (schemaVersion 2) shows the banner and ownership; Rename, Duplicate and Delete are disabled; Copy and Export work', async () => {
      const deck = detailDeck();
      const raw = { [`${STORAGE_KEYS.deckPrefix}${DETAIL_DECK_ID}`]: JSON.stringify({ ...deck, schemaVersion: 2 }) };
      const h = await setup(URL_, { decks: [], raw });
      expect(text(q(h, '.banner--info p'))).toBe('This deck was saved by a newer version of Rift Builder. You can view it, but not change it.');
      expect(text(q(h, '.copies'))).toBe('12 of 23 copies available · 52%, 52 percent');
      await openMore(h);
      expect(menuItems().map((b) => [text(b), b.disabled])).toEqual([
        ['Copy deck list', false],
        ['Download .txt', false],
        ['Duplicate', true],
        ['Rename', true],
        ['Delete', true],
      ]);
      expect(q(h, '.split-main')).not.toBeNull();
    });

    it('DECK-084 / SPEC-006 AC 29: Duplicate stays on the page and offers Open; the copy is unlocked', async () => {
      const h = await setup(URL_, { owned: DETAIL_ALL_OWNED, locks: [DETAIL_DECK_ID] });
      await openMore(h);
      menuItem('Duplicate').click();
      await settle(h, 10);
      expect(TestBed.inject(Router).url).toBe(URL_);
      expect(snack()).toBe('Deck duplicated.');
      expect(text(snackAction())).toBe('Open');
      const copy = (await stores.decks.list()).find((d) => d.name === 'Kennen Tempo (copy)')!;
      expect(copy.duplicatedFrom).toBe(DETAIL_DECK_ID);
      expect((await stores.locks.load())!.locks.map((l) => l.deckId)).toEqual([DETAIL_DECK_ID]);
      snackAction()!.click();
      await settle(h);
      expect(TestBed.inject(Router).url).toBe(`/decks/${copy.id}`);
      expect(text(q(h, 'h1'))).toBe('Kennen Tempo (copy)');
    });

    it('DECK-082 / DECK-083 / SHARE-024 / SPEC-006 AC 29: Delete asks without "can\'t be undone", removes deck and lock, goes to Decks, Undo restores it unlocked', async () => {
      const h = await setup(URL_, { owned: DETAIL_ALL_OWNED, locks: [DETAIL_DECK_ID] });
      await openMore(h);
      menuItem('Delete').click();
      await settle(h);
      const d = dialogEl()!;
      expect(text(d.querySelector('h2'))).toBe("Delete 'Kennen Tempo'?");
      expect(text(d)).toContain('Its locked cards will count toward your other decks again.');
      expect(text(d)).not.toMatch(/can't be undone/);
      Array.from(d.querySelectorAll('button')).find((b) => text(b) === 'Delete')!.click();
      await settle(h, 10);
      expect(TestBed.inject(Router).url).toBe('/decks');
      expect(await stores.decks.get(DETAIL_DECK_ID)).toBeNull();
      expect((await stores.locks.load())!.locks).toEqual([]);
      expect(snack()).toBe('Deck deleted.');
      expect(text(snackAction())).toBe('Undo');
      snackAction()!.click();
      await settle(h, 10);
      expect((await stores.decks.get(DETAIL_DECK_ID))!.name).toBe('Kennen Tempo');
      expect((await stores.locks.load())!.locks).toEqual([]);
    });

    it('OWN-117: Rule check opens a dialog listing what was not checked', async () => {
      const h = await setup(URL_);
      q(h, '.meta button')!.click();
      await settle(h);
      expect(text(dialogEl()?.querySelector('h2'))).toBe('Rule check');
      expect(text(dialogEl())).toContain("The deck rules aren't checked in this version of Rift Builder yet.");
    });
  });

  describe('states (OWN-119)', () => {
    it('OWN-119 (b) / D3: an unknown id shows "This deck isn\'t in your decks" with Back to Decks', async () => {
      const h = await setup('/decks/0b7c0000-0000-4000-8000-0000000000ff');
      expect(text(q(h, 'app-empty-state h1'))).toBe("This deck isn't in your decks");
      expect(text(q(h, 'app-empty-state p'))).toBe('It may have been deleted on another device.');
      expect(q(h, 'app-empty-state a')!.getAttribute('href')).toBe('/decks');
    });

    it('OWN-119 (b) / D17: the open deck deleted in another tab → not found with a polite status', async () => {
      const h = await setup(URL_);
      backend.remove(`${STORAGE_KEYS.deckPrefix}${DETAIL_DECK_ID}`);
      dispatchEvent(new StorageEvent('storage', { key: `${STORAGE_KEYS.deckPrefix}${DETAIL_DECK_ID}` }));
      await new Promise((r) => setTimeout(r, 50));
      await settle(h);
      expect(text(q(h, 'app-empty-state h1'))).toBe("This deck isn't in your decks");
      expect(text(q(h, 'p[role="status"].visually-hidden'))).toBe('This deck is no longer in your decks.');
    });
  });

  describe('lock in and unlock (SPEC-008 SHARE-020…029, SHARE-033, SHARE-041; SPEC-005 OWN-116; H-060 pieces)', () => {
    const lockButton = (h: RouterTestingHarness) => root(h).querySelector<HTMLButtonElement>('app-lock-actions button')!;
    const confirmLock = async (h: RouterTestingHarness) => {
      dialogEl()!.querySelector<HTMLButtonElement>('button.confirm')!.click();
      await settle(h, 10);
      await new Promise((r) => setTimeout(r, 50));
      await settle(h);
    };

    it('SHARE-041 / D7: a locked deck shows the badge "Locked · Locked in on Nov 23, 2026" and Unlock', async () => {
      const h = await setup(URL_, { owned: DETAIL_ALL_OWNED, locks: [DETAIL_DECK_ID] });
      expect(text(q(h, '.meta app-lock-badge'))).toBe('Locked · Locked in on Nov 23, 2026');
      expect(text(lockButton(h))).toBe('Unlock');
      expect(text(q(h, '.copies'))).toBe('23 of 23 copies locked in · 100%, 100 percent');
    });

    it('SHARE-033 / OWN-102 / D8: a locked deck that is short shows the warning badge "Locked · 6 cards short" and stays locked', async () => {
      const h = await setup(URL_, { locks: [DETAIL_DECK_ID] });
      const badge = q(h, '.meta app-lock-badge')!;
      expect(text(badge)).toBe('Locked · 6 cards short · Locked in on Nov 23, 2026');
      expect(badge.querySelector('.badge--short')).not.toBeNull();
      expect(text(q(h, '.copies'))).toBe('12 of 23 copies locked in · 52%, 52 percent');
      expect(text(lockButton(h))).toBe('Unlock');
    });

    it('SPEC-008 AC 23 / SHARE-021 / SHARE-029 (a): Lock in confirms, then the badge shows, the copies read "locked in" and the snack says "Kennen Tempo is locked in." (same tab, no storage event)', async () => {
      const h = await setup(URL_, { owned: DETAIL_ALL_OWNED });
      expect(q(h, '.meta app-lock-badge .badge')).toBeNull();
      expect(text(lockButton(h))).toBe('Lock in');
      lockButton(h).click();
      await settle(h);
      expect(text(dialogEl()?.querySelector('h2'))).toBe("Lock in 'Kennen Tempo'?");
      await confirmLock(h);
      expect((await stores.locks.load())!.locks.map((l) => l.deckId)).toEqual([DETAIL_DECK_ID]);
      expect(snack()).toBe('Kennen Tempo is locked in.');
      expect(snackAction()).toBeNull();
      expect(text(q(h, '.meta app-lock-badge .badge'))).toBe('Locked');
      expect(text(q(h, '.copies'))).toBe('23 of 23 copies locked in · 100%, 100 percent');
      expect(text(q(h, '#zone-main'))).toBe('Main Deck · 6 cards · 6 locked in');
      expect(text(lockButton(h))).toBe('Unlock');
    });

    it('SPEC-008 AC 23 / SHARE-023 / SHARE-029 (b): Unlock goes at once, the snack has no Undo, the badge goes and the copies read "available"', async () => {
      const h = await setup(URL_, { owned: DETAIL_ALL_OWNED, locks: [DETAIL_DECK_ID] });
      lockButton(h).click();
      await settle(h, 10);
      await new Promise((r) => setTimeout(r, 50));
      await settle(h);
      expect(dialogEl()).toBeNull();
      expect((await stores.locks.load())!.locks).toEqual([]);
      expect(snack()).toBe('Kennen Tempo is unlocked. Its cards count toward your other decks again.');
      expect(snackAction()).toBeNull();
      expect(q(h, '.meta app-lock-badge .badge')).toBeNull();
      expect(text(q(h, '.copies'))).toBe('23 of 23 copies available · 100%, 100 percent');
      expect(text(lockButton(h))).toBe('Lock in');
      expect(document.activeElement).toBe(lockButton(h)); // Decks Components §7: focus moves to the new button
    });

    it('SPEC-008 AC 23 / SHARE-020 / OWN-116: an incomplete deck: Lock in is aria-disabled, focusable, and the reason line is visible and its aria-describedby', async () => {
      const h = await setup(URL_);
      const btn = lockButton(h);
      expect(btn.getAttribute('aria-disabled')).toBe('true');
      expect(btn.disabled).toBe(false);
      const reason = q(h, 'app-lock-actions .reason')!;
      expect(text(reason)).toBe('Lock in needs every card available: 6 cards short');
      expect(btn.getAttribute('aria-describedby')).toBe(reason.id);
      btn.click();
      await settle(h);
      expect(dialogEl()).toBeNull();
    });

    it("SPEC-008 AC 23 / SHARE-063: a failed lock save shows \"Couldn't save the lock. Try again.\" and nothing changes", async () => {
      const h = await setup(URL_, { owned: DETAIL_ALL_OWNED });
      vi.spyOn(stores.locks, 'save').mockRejectedValue(new Error('quota'));
      lockButton(h).click();
      await settle(h);
      await confirmLock(h);
      expect(snack()).toBe("Couldn't save the lock. Try again.");
      expect(await stores.locks.load()).toBeNull();
      expect(text(q(h, '.copies'))).toBe('23 of 23 copies available · 100%, 100 percent');
      expect(text(lockButton(h))).toBe('Lock in');
    });

    it('DECK-091 / SHARE-020: a read-only deck cannot be locked (aria-disabled with its reason)', async () => {
      const raw = { [`${STORAGE_KEYS.deckPrefix}${DETAIL_DECK_ID}`]: JSON.stringify({ ...detailDeck(), schemaVersion: 2 }) };
      const h = await setup(URL_, { decks: [], raw, owned: DETAIL_ALL_OWNED });
      expect(lockButton(h).getAttribute('aria-disabled')).toBe('true');
      expect(text(q(h, 'app-lock-actions .reason'))).not.toBe('');
    });

    it('SPEC-008 AC 22 / SHARE-025: renaming locked Deck 1 keeps its lock, lockedAt and holds; Deck 2 still reads "0 of 3 available" and its other-deck row names "Kennen budget"', async () => {
      const deck2Id = '0b7c0000-0000-4000-8000-0000000000a2';
      const h = await setup(URL_, { decks: [detailDeck(), detailDeck(deck2Id, 'Jinx Aggro')], owned: DETAIL_ALL_OWNED, locks: [DETAIL_DECK_ID] });
      await openMore(h);
      menuItem('Rename').click();
      await settle(h);
      const name = dialogEl()!.querySelector<HTMLInputElement>('input')!;
      name.value = 'Kennen budget';
      name.dispatchEvent(new Event('input'));
      const desc = dialogEl()!.querySelector('textarea')!;
      desc.value = 'Budget list';
      desc.dispatchEvent(new Event('input'));
      Array.from(dialogEl()!.querySelectorAll('button')).find((b) => text(b) === 'Save')!.click();
      await settle(h, 10);
      expect((await stores.locks.load())!.locks).toEqual([lock(DETAIL_DECK_ID)]);
      expect(text(q(h, '.meta app-lock-badge'))).toBe('Locked · Locked in on Nov 23, 2026');

      await h.navigateByUrl(`/decks/${deck2Id}`);
      await settle(h, 10);
      expect(text(q(h, 'h1'))).toBe('Jinx Aggro');
      expect(text(tile(h, 'main:lightning rush').querySelector('app-ownership-chip'))).toBe('0 of 3 available');
      tile(h, 'main:lightning rush').click();
      await settle(h);
      expect(text(q(h, '.tabpanel'))).toContain('Kennen budget · needs 3 · Locked, holds 3');
    });

    it('SHARE-024: deleting a locked deck removes its lock through DeckLocks and the page leaves for /decks', async () => {
      const h = await setup(URL_, { owned: DETAIL_ALL_OWNED, locks: [DETAIL_DECK_ID] });
      await openMore(h);
      menuItem('Delete').click();
      await settle(h);
      Array.from(dialogEl()!.querySelectorAll('button')).find((b) => text(b) === 'Delete')!.click();
      await settle(h, 10);
      expect((await stores.locks.load())!.locks).toEqual([]);
      expect(TestBed.inject(Router).url).toBe('/decks');
      expect(root(h).querySelector('app-deck-detail')).toBeNull();
    });
  });

  describe('Decks Review fixes (H-462, H-464, H-466, H-467, H-468)', () => {
    const moreButton = (h: RouterTestingHarness) => q(h, 'button[aria-label="More actions"]')!;
    const dialogButton = (label: string) => Array.from(dialogEl()!.querySelectorAll('button')).find((b) => text(b) === label)!;
    const STACKS_PATH = 'M480-410 41-645';

    it('H-462 (1): after Rename → Cancel and Rename → Save, focus is back on the More actions button', async () => {
      const h = await setup(URL_);
      await openMore(h);
      menuItem('Rename').click();
      await settle(h);
      dialogButton('Cancel').click();
      await settle(h, 10);
      expect(document.activeElement).toBe(moreButton(h));

      await openMore(h);
      menuItem('Rename').click();
      await settle(h);
      const name = dialogEl()!.querySelector<HTMLInputElement>('input')!;
      name.value = 'Kennen budget';
      name.dispatchEvent(new Event('input'));
      dialogButton('Save').click();
      await settle(h, 10);
      expect(text(q(h, 'h1'))).toBe('Kennen budget');
      expect(document.activeElement).toBe(moreButton(h));
    });

    it('H-462 (1): after Delete → Cancel focus is back on More actions', async () => {
      const h = await setup(URL_);
      await openMore(h);
      menuItem('Delete').click();
      await settle(h);
      dialogButton('Cancel').click();
      await settle(h, 10);
      expect(document.activeElement).toBe(moreButton(h));
    });

    it('H-462 (2) / (3): Delete → focus on the first deck tile link on /decks; Undo → focus on the restored deck\'s tile', async () => {
      const other = detailDeck('0b7c0000-0000-4000-8000-0000000000a2', 'Jinx Aggro');
      const h = await setup(URL_, { decks: [detailDeck(), other] });
      await openMore(h);
      menuItem('Delete').click();
      await settle(h);
      dialogButton('Delete').click();
      await settle(h, 10);
      expect(TestBed.inject(Router).url).toBe('/decks');
      const first = q(h, 'a.deck-tile')!;
      expect(first.getAttribute('href')).toBe(`/decks/${other.id}`);
      expect(document.activeElement).toBe(first);

      snackAction()!.click();
      await settle(h, 10);
      await new Promise((r) => setTimeout(r, 50));
      await settle(h);
      expect(qa(h, 'a.deck-tile')).toHaveLength(2);
      expect((document.activeElement as HTMLElement).getAttribute('href')).toBe(URL_);
    });

    it('H-462 (2): deleting the last deck puts focus on the empty state\'s Import deck', async () => {
      const h = await setup(URL_);
      await openMore(h);
      menuItem('Delete').click();
      await settle(h);
      dialogButton('Delete').click();
      await settle(h, 10);
      expect(text(document.activeElement)).toBe('Import deck');
      expect(document.activeElement!.closest('app-empty-state')).not.toBeNull();
    });

    it('H-464: the section bar is opaque (no translucent mix, no blur) and sits on the content edges; the back link is only as wide as its content', async () => {
      await setup(URL_);
      const bar = cssRules((s) => targets(s, 'deck-bar')).filter((r) => r.media === null);
      expect(bar.map((r) => r.style.getPropertyValue('background').trim())).toContain('var(--color-bg)');
      expect(bar.some((r) => /color-mix|transparent/.test(r.style.getPropertyValue('background')))).toBe(false);
      expect(bar.some((r) => r.style.getPropertyValue('backdrop-filter'))).toBe(false);
      expect(bar.some((r) => /content-gutter/.test(r.style.getPropertyValue('margin') + r.style.getPropertyValue('padding')))).toBe(false);
      const back = cssRules((s) => targets(s, 'back')).filter((r) => r.media === null);
      expect(back.map((r) => r.style.getPropertyValue('justify-self'))).toContain('start');
    });

    it('H-466 (1): a deck with one card reads "1 of 1 card fully available" in the header and the Missing tab', async () => {
      const one = makeDeck(DETAIL_DECK_ID, 'One card', { main: [['Lightning Rush', 1]] });
      const h = await setup(URL_, { decks: [one], owned: { 'Lightning Rush': 1 } });
      expect(text(q(h, '.deck-header .cards'))).toBe('1 of 1 card fully available');
      q(h, '#deck-tab-missing')!.click();
      await settle(h);
      expect(text(q(h, '.tabpanel .cards'))).toBe('1 of 1 card fully available');
    });

    it('H-521: a deck whose required total is 1 reads "1 of 1 copy available" in the header and the Missing tab, "1 of 1 copy locked in" when locked', async () => {
      const one = makeDeck(DETAIL_DECK_ID, 'One card', { main: [['Lightning Rush', 1]] });
      let h = await setup(URL_, { decks: [one], owned: { 'Lightning Rush': 1 } });
      expect(text(q(h, '.deck-header .copies'))).toMatch(/^1 of 1 copy available ·/);
      q(h, '#deck-tab-missing')!.click();
      await settle(h);
      expect(text(q(h, '.tabpanel .copies'))).toMatch(/^1 of 1 copy available/);
      TestBed.resetTestingModule();
      h = await setup(URL_, { decks: [one], owned: { 'Lightning Rush': 1 }, locks: [DETAIL_DECK_ID] });
      expect(text(q(h, '.deck-header .copies'))).toMatch(/^1 of 1 copy locked in ·/);
      q(h, '#deck-tab-missing')!.click();
      await settle(h);
      expect(text(q(h, '.tabpanel .copies'))).toMatch(/^1 of 1 copy locked in/);
    });

    it('H-466 (2): with nothing missing the Missing tab shows a plain "Missing" heading and "All cards available", no "0 copies"', async () => {
      const h = await setup(URL_, { owned: DETAIL_ALL_OWNED });
      q(h, '#deck-tab-missing')!.click();
      await settle(h);
      expect(text(q(h, '.tabpanel .missing-title'))).toBe('Missing');
      expect(text(q(h, '.tabpanel .all'))).toBe('All cards available');
      expect(text(q(h, '.tabpanel'))).not.toMatch(/0 copies/);
    });

    it('H-466 (3): an empty section heading reads "Legend · 0 cards" without "· 0 available"', async () => {
      const h = await setup(URL_, { decks: [{ ...detailDeck(), legend: null }] });
      expect(text(q(h, '#zone-legend'))).toBe('Legend · 0 cards');
      expect(text(q(h, '#zone-champion'))).toBe('Chosen Champion · 1 card · 0 available');
    });

    it('H-467 (1): the not-found state uses the populated header\'s back link (.back with arrow_back icon, 44px on phones), no placeholder eyebrow', async () => {
      const h = await setup('/decks/0b7c0000-0000-4000-8000-0000000000ff');
      const back = q(h, 'header.deck-header > a.back')!;
      expect(back.getAttribute('href')).toBe('/decks');
      expect(text(back)).toBe('Decks');
      expect(back.querySelector('app-icon')).not.toBeNull();
      expect(q(h, '.page-eyebrow')).toBeNull();
      expect(q(h, 'header.deck-header h1')).toBeNull(); // H-482: the empty state carries the only H1
      const phone = cssRules((s) => targets(s, 'back')).filter((r) => r.media === '(max-width: 39.99rem)');
      expect(phone.map((r) => r.style.getPropertyValue('min-height'))).toContain('44px');
    });

    it('H-467 (2): in the header row the Lock in button is 40px with a fine pointer from 40rem, like Copy missing list and More', async () => {
      await setup(URL_);
      const rule = cssRules((s) => s.includes('in-row') && /button$/.test(s.trim())).find((r) => r.media === '(min-width: 40rem) and (pointer: fine)');
      expect(rule?.style.getPropertyValue('height')).toBe('40px');
      expect(rule?.style.getPropertyValue('min-height')).toBe('40px');
      // More and the chevron are 40px at rest and 44px on phones / touch.
      const more = cssRules((s) => targets(s, 'more'));
      expect(more.find((r) => r.media === null)?.style.getPropertyValue('height')).toBe('40px');
      expect(more.find((r) => r.media?.includes('pointer: coarse'))?.style.getPropertyValue('height')).toBe('44px');
    });

    it('H-468 (4) / (5): More menu icons sit in the menu item\'s icon slot (centred with the text); Duplicate has its own icon, not stacks', async () => {
      const h = await setup(URL_);
      await openMore(h);
      for (const item of menuItems()) {
        const icon = item.querySelector('app-icon')!;
        expect(icon.hasAttribute('matmenuitemicon')).toBe(true);
        expect(icon.closest('.mat-mdc-menu-item-text')).toBeNull();
      }
      const d = menuItem('Duplicate').querySelector('path')!.getAttribute('d')!;
      expect(d.startsWith(STACKS_PATH)).toBe(false);
      const others = menuItems().filter((b) => text(b) !== 'Duplicate').map((b) => b.querySelector('path')!.getAttribute('d'));
      expect(others).not.toContain(d);
    });

    it('H-468 (10): at 64rem and wider, selecting a card announces "Showing <card name>" in the polite status', async () => {
      const h = await setup(URL_);
      const status = q(h, 'p[role="status"].visually-hidden')!;
      expect(status.getAttribute('aria-live')).toBe('polite');
      tile(h, 'main:lightning rush').click();
      await settle(h);
      expect(text(status)).toBe('Showing Lightning Rush');
      tile(h, 'main:fizz trickster').click();
      await settle(h);
      expect(text(status)).toBe('Showing Fizz, Trickster');
    });

    it('H-482 / OWN-110 / SPEC-005 AC 34: the section bar reads "Legend" and "Champion" when full; "Legend 0" / "Champion 0" (still muted) when empty', async () => {
      const bar = (h: RouterTestingHarness) => qa(h, '.section-nav a').map(text);
      const full = await setup(URL_);
      expect(bar(full)).toEqual(['Legend', 'Champion', 'Main 6', 'Battlefields 1', 'Runes 12', 'Sideboard 2']);
      TestBed.resetTestingModule();

      const h = await setup(URL_, { decks: [{ ...detailDeck(), legend: null, champion: null, battlefields: [] }] });
      expect(bar(h)).toEqual(['Legend 0', 'Champion 0', 'Main 6', 'Battlefields 0', 'Runes 12', 'Sideboard 2']);
      expect(qa(h, '.section-nav a.empty').map(text)).toEqual(['Legend 0', 'Champion 0', 'Battlefields 0']);

      // AC 34: the slot's card added in another tab → "Legend 0" becomes "Legend" without a reload.
      await stores.raw.decks.put({ ...detailDeck(), champion: null, battlefields: [], updatedAt: '2026-11-26T12:00:00.000Z' });
      dispatchEvent(new StorageEvent('storage', { key: `${STORAGE_KEYS.deckPrefix}${DETAIL_DECK_ID}` }));
      await new Promise((r) => setTimeout(r, 50));
      await settle(h);
      expect(bar(h).slice(0, 2)).toEqual(['Legend', 'Champion 0']);
    });

    it('H-482 / OWN-119 (b) / SPEC-005 AC 35: not found has one H1 "This deck isn\'t in your decks", no "Deck detail" text, the message and Back to Decks', async () => {
      const h = await setup('/decks/does-not-exist');
      const h1s = qa(h, 'h1');
      expect(h1s.map(text)).toEqual(["This deck isn't in your decks"]);
      expect(text(root(h))).not.toContain('Deck detail');
      expect(text(q(h, 'app-empty-state p'))).toBe('It may have been deleted on another device.');
      const back = Array.from(root(h).querySelectorAll('app-empty-state a')).find((a) => text(a) === 'Back to Decks')!;
      expect(back.getAttribute('href')).toBe('/decks');
      // Open question 19: the document title stays as built.
      expect(document.title).toBe('Deck detail · Rift Builder');
    });

    it('H-520: from 40rem the Lock in reason line is start-aligned and exactly the row\'s width (basis 100%, no grow, negative margin on the end side); phones unchanged', async () => {
      await setup(URL_);
      const reason = cssRules((s) => s.includes('in-row') && s.includes('.reason')).find((r) => r.media === '(min-width: 40rem)')!;
      const st = reason.style;
      expect(st.getPropertyValue('text-align')).toBe('start');
      expect(st.getPropertyValue('justify-content')).toBe('flex-start');
      expect(st.getPropertyValue('flex-grow')).toBe('0');
      expect(st.getPropertyValue('flex-basis')).toBe('100%');
      // jsdom keeps the shorthand: start 0, end minus the column gap.
      expect(st.getPropertyValue('margin-inline').replace(/\s+/g, ' ').trim()).toBe('0 calc(-1 * var(--space-2))');
      expect(st.getPropertyValue('contain')).toBe('inline-size');
      // The header row starts its lines (the reason's line is the only one with free space), so it sits under Lock in.
      const row = cssRules((s) => s.trim() === '.header-top > .actions').find((r) => r.media === '(min-width: 40rem)')!;
      expect(row.style.getPropertyValue('justify-content')).toBe('flex-start');
      // Phones: no in-row rule outside the 40rem query.
      expect(cssRules((s) => s.includes('in-row') && s.includes('.reason')).filter((r) => r.media === null)).toHaveLength(0);
    });

    it('H-468 (10): below 64rem a press opens the dialog and sets no "Showing" status', async () => {
      const h = await setup(URL_, { width: 'tablet' });
      tile(h, 'main:lightning rush').click();
      await settle(h);
      expect(dialogEl()).not.toBeNull();
      expect(text(q(h, 'p[role="status"].visually-hidden'))).toBe('');
    });
  });
});
