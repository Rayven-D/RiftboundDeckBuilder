/**
 * `/decks` list page (H-060): SPEC-005 OWN-002…008, OWN-084, OWN-100…105 (ACs 16, 20, 23…26, 32), SPEC-008
 * SHARE-050…053, SHARE-061 (ACs 13, 15, 19) and the list states L1…L13 of [[Decks]] §10, over real tracked stores
 * (MemoryBackend) and a stubbed card catalog. Gate open; the gate itself (L1) is pages/gated-pages.spec.ts.
 */
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { Location } from '@angular/common';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { CardData, CatalogResult } from '../../core/cards/card-data';
import { nameKey } from '../../core/cards/name-key';
import type { BanListFile, UserDeck } from '../../core/decks';
import { lock, makeCatalog, makeDeck } from '../../core/decks/engine-fixtures';
import { AppStores } from '../../core/storage/app-stores';
import { BrowserStores, createBrowserStores } from '../../core/storage/browser-stores';
import { MemoryBackend } from '../../core/storage/kv-backend';
import { STORAGE_KEYS } from '../../core/storage/local-stores';
import { provideOpenGate } from '../../core/sync/testing/open-gate';
import { cssRules, targets } from '../../shared/testing/css-rules';
import { DECKS_TEXT } from './decks-page';

const LEGEND = 'Kennen, Heart of the Tempest';
const CATALOG = makeCatalog([
  { name: LEGEND, category: 'legend' },
  'Lightning Rush',
  'Gust',
  'Hextech Ray',
  'Nocturne, Horrifying',
]);

const id = (n: number) => `00000000-0000-4000-9000-${String(n).padStart(12, '0')}`;
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

/** 66 copies: Legend 1 + Lightning Rush 3 + Gust 62 (A follows the owned Gust count). */
function kennen(n: number, name = 'Kennen Tempo', extra: Partial<UserDeck> = {}): UserDeck {
  return {
    ...makeDeck(id(n), name, { legend: [[LEGEND, 1]], main: [['Lightning Rush', 3], ['Gust', 62]] }),
    ...extra,
  };
}

interface Setup {
  decks?: UserDeck[];
  owned?: Record<string, number>;
  locks?: ReturnType<typeof lock>[] | 'newer';
  collection?: 'newer';
  catalog?: 'error';
  bans?: BanListFile | null;
  url?: string;
  /** L2: the deck read waits for this promise (the page stays in its loading state until it settles). */
  hold?: Promise<void>;
}

let backend: MemoryBackend;
let stores: BrowserStores;

async function setup(s: Setup = {}) {
  backend = new MemoryBackend();
  stores = createBrowserStores(backend, { now: () => Date.now(), changed: () => undefined, readOnly: () => false });
  if (s.hold) {
    const hold = s.hold;
    const list = stores.decks.list.bind(stores.decks);
    vi.spyOn(stores.decks, 'list').mockImplementation(async () => {
      await hold;
      return list();
    });
  }
  for (const d of s.decks ?? [kennen(1)]) backend.set(`${STORAGE_KEYS.deckPrefix}${d.id}`, JSON.stringify(d));
  const cards: Record<string, { quantity: number; byPrinting: Record<string, number> }> = {};
  for (const [name, n] of Object.entries(s.owned ?? {})) cards[nameKey(name)] = { quantity: n, byPrinting: {} };
  backend.set(
    STORAGE_KEYS.collection,
    JSON.stringify({ schemaVersion: s.collection === 'newer' ? 9 : 1, updatedAt: '2026-11-23T00:00:00Z', catalogVersion: '0.3+test', cards }),
  );
  if (s.locks === 'newer') backend.set(STORAGE_KEYS.locks, JSON.stringify({ schemaVersion: 2, updatedAt: 'x', locks: [] }));
  else if (s.locks) backend.set(STORAGE_KEYS.locks, JSON.stringify({ schemaVersion: 1, updatedAt: 'x', locks: s.locks }));
  let failing = s.catalog === 'error';
  const result = (): CatalogResult => (failing ? { status: 'error' } : { status: 'ok', catalog: CATALOG });
  const cardData: Partial<CardData> = {
    loadCatalog: async () => result(),
    reload: async () => {
      failing = false;
      return result();
    },
    loadBans: async () => s.bans ?? null,
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes, withComponentInputBinding()),
      provideOpenGate(),
      { provide: AppStores, useValue: { stores } },
      { provide: CardData, useValue: cardData },
      { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
    ],
  });
  const harness = await RouterTestingHarness.create(s.url ?? '/decks');
  await settle(harness);
  const el = harness.routeNativeElement as HTMLElement;
  return { harness, el, tiles: () => Array.from(el.querySelectorAll('app-deck-tile')) };
}

async function settle(harness: RouterTestingHarness): Promise<void> {
  for (let i = 0; i < 6; i++) {
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 0));
  }
}

const tileOf = (el: HTMLElement, name: string) =>
  Array.from(el.querySelectorAll('app-deck-tile')).find((t) => text(t.querySelector('.name-text')) === name)!;
const artFill = (tile: Element) => (tile.querySelector('app-card-art .art') as HTMLElement | null)?.style.getPropertyValue('--fill');

const BANS: BanListFile = {
  schemaVersion: 1,
  dataVersion: 'test',
  lastVerified: '2026-11-23',
  lists: [
    {
      format: 'standard',
      region: 'global',
      status: 'verified',
      waves: [
        {
          id: 'w1',
          name: 'Wave 1',
          announced: '2000-01-01',
          effective: '2000-01-02',
          sourceUrl: 'https://example.test',
          add: [{ name: 'Nocturne, Horrifying', kind: 'card' }],
          remove: [],
        },
        {
          id: 'w2',
          name: 'Wave 2',
          announced: '2000-01-01',
          effective: '2999-12-15',
          sourceUrl: 'https://example.test',
          add: [{ name: 'Hextech Ray', kind: 'card' }],
          remove: [],
        },
      ],
    },
  ],
};

describe('DecksPage list tiles (SPEC-005 OWN-002, OWN-100…104)', { timeout: 20_000 }, () => { // H-420: busy-machine headroom
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((n) => (n.innerHTML = ''));
    document.documentElement.classList.remove('has-fab');
  });

  it('SPEC-005 AC 23 A = 34 of 66: Legend art filled 34/66, "51%" (51 percent of copies available), copies line, Partly available', async () => {
    const { tiles } = await setup({ owned: { [LEGEND]: 1, 'Lightning Rush': 3, Gust: 30 } });
    const tile = tiles()[0];
    expect(Number(artFill(tile))).toBeCloseTo(34 / 66, 10);
    expect(tile.querySelector('app-card-art .art')!.className).toContain('art--partial');
    expect(tile.querySelector('.percent')!.getAttribute('aria-hidden')).toBe('true');
    expect(text(tile.querySelector('.percent'))).toBe('51%');
    expect(text(tile.querySelector('.details .percent-text'))).toBe('51 percent of copies available');
    expect(text(tile.querySelector('.copies'))).toBe('34 of 66 copies available');
    expect(text(tile.querySelector('app-deck-status-chip'))).toBe('Partly available');
    // OWN-082: the Legend is the only card image on the tile (the darkened layer is the same image).
    const srcs = new Set(Array.from(tile.querySelectorAll('img')).map((i) => i.getAttribute('src')));
    expect([...srcs]).toEqual(['https://example.test/p-kennen-heart-of-the-tempest.png']);
    expect(tile.querySelector('img')!.getAttribute('alt')).toBe('');
    expect(tile.querySelector('img')!.getAttribute('loading')).toBe('eager');
  });

  it('SPEC-005 AC 23 A = 66: full colour, "100%", Ready to build; empty collection: darkened, "0%", None available', async () => {
    const full = await setup({ owned: { [LEGEND]: 1, 'Lightning Rush': 3, Gust: 62 } });
    let tile = full.tiles()[0];
    expect(tile.querySelector('app-card-art .art')!.className).toContain('art--full');
    expect(text(tile.querySelector('.percent'))).toBe('100%');
    expect(text(tile.querySelector('.copies'))).toBe('66 of 66 copies available');
    expect(text(tile.querySelector('app-deck-status-chip'))).toBe('Ready to build');
    TestBed.resetTestingModule();
    const none = await setup({ owned: {} });
    tile = none.tiles()[0];
    expect(tile.querySelector('app-card-art .art')!.className).toContain('art--none');
    expect(text(tile.querySelector('.percent'))).toBe('0%');
    expect(text(tile.querySelector('.copies'))).toBe('0 of 66 copies available');
    expect(text(tile.querySelector('app-deck-status-chip'))).toBe('None available');
  });

  it('SPEC-005 AC 23 / OWN-070 an import in another tab raises A to 66 without reload (storage event)', async () => {
    const { harness, tiles } = await setup({ owned: { [LEGEND]: 1, 'Lightning Rush': 3, Gust: 30 } });
    const cards = { [nameKey(LEGEND)]: { quantity: 1, byPrinting: {} }, 'lightning rush': { quantity: 3, byPrinting: {} }, gust: { quantity: 62, byPrinting: {} } };
    backend.set(STORAGE_KEYS.collection, JSON.stringify({ schemaVersion: 1, updatedAt: '2026-11-24T00:00:00Z', catalogVersion: '0.3+test', cards }));
    dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEYS.collection }));
    await vi.waitFor(async () => {
      await settle(harness);
      expect(text(tiles()[0].querySelector('.percent'))).toBe('100%');
    });
    expect(text(tiles()[0].querySelector('app-deck-status-chip'))).toBe('Ready to build');
  });

  it('SPEC-005 AC 24 empty deck: no percentage, no fill, "No cards to count", the deck mark; no Legend with 20 of 40: mark + "50%"', async () => {
    const empty = { ...makeDeck(id(2), 'Empty Draft', {}), updatedAt: '2026-11-24T10:00:00Z' };
    const noLegend = makeDeck(id(3), 'No Legend', { main: [['Gust', 40]] });
    const { el } = await setup({ decks: [empty, noLegend], owned: { Gust: 20 } });
    const e = tileOf(el, 'Empty Draft');
    expect(e.querySelector('.percent')).toBeNull();
    expect(e.querySelector('app-deck-mark')).not.toBeNull();
    expect(e.querySelector('img')).toBeNull();
    expect(text(e.querySelector('.copies'))).toBe('No cards to count');
    const n = tileOf(el, 'No Legend');
    expect(n.querySelector('app-deck-mark')).not.toBeNull();
    expect(text(n.querySelector('.percent'))).toBe('50%');
  });

  it('SPEC-005 AC 24 / AC 13 / L6 ownership unavailable: no %, full-colour Legend, "Ownership unavailable", banner, chips disabled', async () => {
    const { el, tiles } = await setup({ collection: 'newer', locks: [lock(id(1))] });
    const tile = tiles()[0];
    expect(tile.querySelector('.percent')).toBeNull();
    expect(tile.querySelector('app-card-art .art')!.className).toContain('art--full');
    expect(text(tile.querySelector('.copies'))).toBe('Ownership unavailable');
    // OWN-065 (b) / SHARE-053 (b): no ownership chip, but the locked deck keeps its "Locked" badge, never "short".
    expect(text(tile.querySelector('app-deck-status-chip'))).toBe('');
    expect(text(tile.querySelector('app-lock-badge'))).toBe('Locked');
    const banner = Array.from(el.querySelectorAll('.banner[role="alert"]')).map(text);
    expect(banner).toContain(DECKS_TEXT.ownershipUnavailable);
    const chips = Array.from(el.querySelectorAll('.own-chip'));
    expect(chips.every((c) => c.getAttribute('aria-disabled') === 'true')).toBe(true);
    expect(text(el.querySelector('#own-hint'))).toBe('Not available while ownership is unavailable');
  });

  it('SPEC-005 AC 25 / SHARE-041 locked complete deck of 54: "100%", "54 of 54 copies locked in", badge Locked; 4 short in 2 cards: "92%", badge "Locked · 2 cards short" next to the chip', async () => {
    const deck54 = { ...makeDeck(id(4), 'Locked 54', { legend: [[LEGEND, 1]], main: [['Lightning Rush', 3], ['Gust', 50]] }) };
    const ok = await setup({ decks: [deck54], owned: { [LEGEND]: 1, 'Lightning Rush': 3, Gust: 50 }, locks: [lock(id(4))] });
    let tile = ok.tiles()[0];
    expect(tile.querySelector('app-card-art .art')!.className).toContain('art--full');
    expect(text(tile.querySelector('.percent'))).toBe('100%');
    expect(text(tile.querySelector('.details .percent-text'))).toBe('100 percent of copies locked in');
    expect(text(tile.querySelector('.copies'))).toBe('54 of 54 copies locked in');
    // RJ 2026-11-25: the lock is its own badge; a locked complete deck (group `locked`) has no ownership chip.
    expect(text(tile.querySelector('app-deck-status-chip'))).toBe('');
    expect(text(tile.querySelector('.ownership app-lock-badge'))).toBe('Locked');
    // The tile badge has no "Locked in on <date>" (the header's, SHARE-041).
    expect(tile.querySelector('app-lock-badge .date')).toBeNull();
    TestBed.resetTestingModule();
    const short = await setup({ decks: [deck54], owned: { [LEGEND]: 1, 'Lightning Rush': 1, Gust: 48 }, locks: [lock(id(4))] });
    tile = short.tiles()[0];
    expect(Number(artFill(tile))).toBeCloseTo(50 / 54, 10);
    expect(text(tile.querySelector('.percent'))).toBe('92%');
    expect(text(tile.querySelector('.copies'))).toBe('50 of 54 copies locked in');
    expect(text(tile.querySelector('app-deck-status-chip'))).toBe('Partly available');
    expect(text(tile.querySelector('.ownership app-lock-badge'))).toBe('Locked · 2 cards short');
    expect(tile.querySelector('app-lock-badge .badge--short')).not.toBeNull();
    // Chip first, then the badge (the badge sits next to the ownership chip).
    const own = Array.from(tile.querySelector('.ownership')!.children).map((c) => c.tagName.toLowerCase());
    expect(own.slice(0, 2)).toEqual(['app-deck-status-chip', 'app-lock-badge']);
  });

  it('SPEC-005 AC 26 tournament tile: source line, player, legality, ban flags, Updated date; the whole tile is one link', async () => {
    const t: UserDeck = {
      ...makeDeck(id(5), 'Kennen: ASC Evansrhim (1st, Regional Championship: Europe)', {
        legend: [[LEGEND, 1]],
        main: [['Nocturne, Horrifying', 3], ['Hextech Ray', 3]],
      }),
      updatedAt: '2026-11-20T12:00:00Z',
      source: {
        kind: 'tournament',
        eventId: 'rc-eu',
        eventName: 'Regional Championship: Europe',
        eventStartDate: '2026-11-06',
        eventEndDate: '2026-11-08',
        region: 'europe',
        decklistId: 'k1',
        publishedRank: 1,
        placingLabel: '1st',
        pilot: 'ASC Evansrhim',
        sourceUrl: 'https://example.test/k1',
        addedAt: '2026-11-20T12:00:00Z',
      },
    };
    const imported = { ...makeDeck(id(6), 'Imported deck', { main: [['Gust', 1]] }), updatedAt: '2026-11-19T12:00:00Z' };
    const { el, harness } = await setup({ decks: [t, imported], bans: BANS });
    const tile = tileOf(el, t.name);
    expect(text(tile.querySelector('.source'))).toBe('1st, Regional Championship: Europe · Nov 6, 2026 – Nov 8, 2026');
    expect(text(tile.querySelector('.pilot'))).toBe('ASC Evansrhim');
    // No SPEC-002 legality engine in web/ yet: OWN-004 "Not fully checked" (never a legal colour or icon).
    expect(text(tile.querySelector('.legality'))).toBe('Not fully checked');
    expect(Array.from(tile.querySelectorAll('.ban')).map(text)).toEqual(['1 banned card', '1 card banned from Dec 15, 2999']);
    expect(text(tile.querySelector('.updated'))).toBe('Updated Nov 20, 2026');
    expect(tileOf(el, 'Imported deck').querySelector('.pilot')).toBeNull();
    expect(text(tileOf(el, 'Imported deck').querySelector('.source'))).toBe('Imported');
    expect(el.querySelectorAll('.notice')).toHaveLength(0);
    const links = tile.querySelectorAll('a');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe(`/decks/${id(5)}`);
    expect(links[0].getAttribute('aria-labelledby')).toBe(tile.querySelector('h3')!.id);
    (tile.querySelector('.copies') as HTMLElement).click();
    await vi.waitFor(async () => {
      await settle(harness);
      expect(TestBed.inject(Router).url).toBe(`/decks/${id(5)}`);
    });
  });

  it('SPEC-005 AC 26 / L9 / OWN-015 ban data not loaded: no ban flag on any tile, one notice', async () => {
    const { el } = await setup({ decks: [makeDeck(id(1), 'A', { legend: [[LEGEND, 1]], main: [['Nocturne, Horrifying', 3]] })] });
    expect(el.querySelectorAll('.ban')).toHaveLength(0);
    expect(Array.from(el.querySelectorAll('.notice')).map(text)).toEqual([DECKS_TEXT.banUnknown]);
  });

  it('L10 / DECK-091 / OWN-064 a newer-schema deck is listed with a "Read-only" tag and its ownership', async () => {
    const newer = { ...kennen(7, 'From the future'), schemaVersion: 2 } as unknown as UserDeck;
    const { el } = await setup({ decks: [kennen(1), newer], owned: { Gust: 62 } });
    const tile = tileOf(el, 'From the future');
    expect(text(tile.querySelector('.tag'))).toBe('Read-only');
    expect(text(tile.querySelector('.copies'))).toBe('62 of 66 copies available');
    expect(tileOf(el, 'Kennen Tempo').querySelector('.tag')).toBeNull();
  });
});

describe('DecksPage toolbar and states (SPEC-005 OWN-005, OWN-006, OWN-084, OWN-105; SPEC-008 SHARE-051, SHARE-061)', () => {
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((n) => (n.innerHTML = ''));
    document.documentElement.classList.remove('has-fab');
  });

  const three = () => [
    { ...kennen(1, 'Kennen Tempo'), updatedAt: '2026-11-22T10:00:00Z' },
    { ...makeDeck(id(2), 'Ray Deck', { main: [['Hextech Ray', 3]] }), updatedAt: '2026-11-21T10:00:00Z' },
    { ...makeDeck(id(3), 'Gust Deck', { main: [['Gust', 2]] }), updatedAt: '2026-11-23T10:00:00Z' },
  ];

  it('SPEC-005 AC 20 / OWN-084 / OWN-005: every deck at once in default order, nothing reads Page / Next / Previous', async () => {
    const { el, tiles } = await setup({ decks: three(), owned: { Gust: 2 } });
    expect(tiles().map((t) => text(t.querySelector('.name-text')))).toEqual(['Gust Deck', 'Kennen Tempo', 'Ray Deck']);
    expect(text(el)).not.toMatch(/\bPage\b|\bNext\b|\bPrevious\b/);
    expect(el.querySelector('ul.deck-grid')!.getAttribute('aria-label')).toBe('Your decks');
    expect(text(el.querySelector('#count-line'))).toBe('3 decks');
    expect(text(el.querySelector('.page-lede'))).toBe('Decks you want to build. Cards you own are shown in full color.');
  });

  it('OWN-102 / OWN-105 (a) ownership chips with counts; choosing one filters, "Showing x of y decks", an active chip, URL own=', async () => {
    const { el, harness, tiles } = await setup({ decks: three(), owned: { Gust: 2 } });
    const chips = Array.from(el.querySelectorAll<HTMLButtonElement>('.own-chip'));
    expect(chips.map((c) => c.getAttribute('aria-label'))).toEqual([
      'All, 3 decks',
      'Ready to build, 1 deck',
      'Partly available, 1 deck',
      'None available, 1 deck',
    ]);
    expect(el.querySelector('.own-chips')!.getAttribute('role')).toBe('radiogroup');
    chips[1].click();
    await settle(harness);
    expect(tiles().map((t) => text(t.querySelector('.name-text')))).toEqual(['Gust Deck']);
    expect(text(el.querySelector('#count-line'))).toBe('Showing 1 of 3 decks');
    expect(Array.from(el.querySelectorAll('.filter-chip')).map((c) => c.getAttribute('aria-label'))).toEqual([
      'Remove filter: Ready to build',
    ]);
    expect(TestBed.inject(Location).path()).toBe('/decks?own=ready');
    // Arrow keys move and select inside the group (one Tab stop).
    el.querySelector('.own-chip[aria-checked="true"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await settle(harness);
    expect(TestBed.inject(Location).path()).toBe('/decks?own=partial');
    expect(Array.from(el.querySelectorAll('.own-chip')).filter((c) => c.getAttribute('tabindex') === '0')).toHaveLength(1);
    (el.querySelector('.filter-chip') as HTMLButtonElement).click();
    await settle(harness);
    expect(tiles()).toHaveLength(3);
    expect(TestBed.inject(Location).path()).toBe('/decks');
  });

  it('H-465 (2) / OWN-101: the link description starts with the source line and carries "N percent of copies available" after the copies line', async () => {
    const { el } = await setup({ decks: three(), owned: { [LEGEND]: 1, 'Lightning Rush': 3, Gust: 30 } });
    const link = tileOf(el, 'Kennen Tempo').querySelector('a.deck-tile')!;
    const described = document.getElementById(link.getAttribute('aria-describedby')!)!;
    const desc = text(described);
    expect(desc.startsWith('Imported')).toBe(true);
    const copies = desc.indexOf('34 of 66 copies available');
    expect(copies).toBeGreaterThan(0);
    expect(desc.indexOf('51 percent of copies available')).toBeGreaterThan(copies);
    // The visible % stays out of the tree (no double reading); its words are inside the description.
    expect(link.querySelector('.percent')!.getAttribute('aria-hidden')).toBe('true');
    expect(described.querySelector('.percent-text')).not.toBeNull();
  });

  it('H-465 (1) (WCAG 1.3.1 / 4.1.2): the desktop Filters menu has two groups, named Legality and Source, each holding its own options', async () => {
    const { el, harness } = await setup({ decks: three() });
    (el.querySelector('.menu-control') as HTMLButtonElement).click();
    await settle(harness);
    const groups = Array.from(document.querySelectorAll<HTMLElement>('.deck-filters-menu [role="group"]'));
    const names = groups.map((g) => text(document.getElementById(g.getAttribute('aria-labelledby')!)));
    expect(names).toEqual(['Legality', 'Source']);
    const items = (g: Element) => Array.from(g.querySelectorAll('[role="menuitemradio"]')).map((b) => text(b).replace('✓', ''));
    expect(items(groups[0])).toEqual(['Any', 'Legal in Standard', 'Not legal in Standard today', 'Not fully checked']);
    expect(items(groups[1])).toEqual(['Any', 'Imported', 'From Tournaments']);
    // The headings are heard once, as the group names, not again as loose text in the menu.
    expect(document.querySelectorAll('.deck-filters-menu p.menu-group[aria-hidden="true"]')).toHaveLength(2);
    expect(document.querySelector('.deck-filters-menu [role="presentation"]')).toBeNull();
  });

  it('H-463 one-row toolbar at 1440: Lock / Sort fixed to their longest option, 14px values with a gap before the arrow; search alone flexes', async () => {
    const { el } = await setup({ decks: three(), url: '/decks?lock=unlocked&legality=incomplete&source=user&q=gen' });
    expect(el.querySelectorAll('.filter-chip')).toHaveLength(3);
    const one = (cls: string) => cssRules((s) => targets(s, cls)).find((r) => r.media === null)!.style;
    expect(one('lock-select').getPropertyValue('width')).toBe('7.25rem');
    expect(one('sort-select').getPropertyValue('width')).toBe('8rem');
    expect(one('select').getPropertyValue('--mat-select-trigger-text-size').trim()).toBe('var(--font-size-sm)');
    expect(one('control').getPropertyValue('flex')).toMatch(/^none|0 0 auto$/);
    const arrow = cssRules((s) => /\.select\s+\.mat-mdc-select-arrow-wrapper/.test(s));
    expect(arrow.map((r) => r.style.getPropertyValue('margin-left'))).toContain('var(--space-2)');
    expect(one('search').getPropertyValue('flex')).toBe('1 1 10rem');
    // Active filter chips are 14px like the toolbar.
    expect(one('filter-chip').getPropertyValue('font-size')).toBe('var(--font-size-sm)');
  });

  it('H-468 (8) / H-478: on phones the copies line is its own line in every state, so "66 of 66 copies locked in" never clips', async () => {
    await setup({ decks: three(), locks: [lock(id(2))], owned: { 'Hextech Ray': 3 } });
    const phone = cssRules((s) => targets(s, 'copies')).filter((r) => r.media?.includes('max-width: 40rem'));
    expect(phone.map((r) => r.style.getPropertyValue('flex-basis'))).toContain('100%');
    const base = cssRules((s) => targets(s, 'copies')).find((r) => r.media === null)!.style;
    expect(base.getPropertyValue('min-width')).toMatch(/^0(px)?$/);
    expect(base.getPropertyValue('overflow-wrap')).toBe('anywhere');
  });

  it('RJ 2026-11-26 (H-392 (c), H-481): the tile % is 16px 600 like the deck name, not louder', async () => {
    await setup({ decks: three() });
    const pct = cssRules((s) => targets(s, 'percent'));
    expect(pct.every((r) => !r.style.getPropertyValue('font-size') || r.style.getPropertyValue('font-size') === 'var(--font-size-md)')).toBe(true);
    const base = pct.find((r) => r.media === null)!.style;
    expect(base.getPropertyValue('font-size')).toBe('var(--font-size-md)');
    expect(base.getPropertyValue('font-weight')).toBe('600');
    const name = cssRules((s) => targets(s, 'name')).find((r) => r.media === null)!.style;
    expect([name.getPropertyValue('font-size'), name.getPropertyValue('font-weight')]).toEqual(['var(--font-size-md)', '600']);
  });

  it('H-468 (9) / OWN-105 (d): "Ready to build" with no match and locked decks hidden offers Show locked decks inside the empty state too', async () => {
    const { el, harness, tiles } = await setup({ decks: three(), owned: { 'Hextech Ray': 3 }, locks: [lock(id(2))], url: '/decks?own=ready' });
    expect(tiles()).toHaveLength(0);
    expect(text(el.querySelector('app-empty-state h2'))).toBe('No decks match these filters');
    const buttons = Array.from(el.querySelectorAll<HTMLButtonElement>('app-empty-state button'));
    expect(buttons.map(text)).toEqual(['Clear filters', 'Show locked decks']);
    buttons[1].click();
    await settle(harness);
    expect(TestBed.inject(Location).path()).toBe('/decks?lock=locked');
    expect(tiles().map((t) => text(t.querySelector('.name-text')))).toEqual(['Ray Deck']);
    expect(document.activeElement).toBe(el.querySelector('input[type="search"]'));
    TestBed.resetTestingModule();
    // No locked deck hidden: only Clear filters.
    const plain = await setup({ decks: three(), url: '/decks?own=ready' });
    expect(Array.from(plain.el.querySelectorAll('app-empty-state button')).map(text)).toEqual(['Clear filters']);
  });

  it('H-460 (WCAG 2.4.7): the tile focus ring is drawn inside the link, so the li paint containment (OWN-084) cannot clip it', async () => {
    const { tiles } = await setup({ decks: three() });
    expect(tiles()).toHaveLength(3);
    const ring = cssRules((s) => targets(s, 'deck-tile', ':focus-visible'));
    expect(ring).toHaveLength(1);
    expect(ring[0].style.getPropertyValue('outline')).toContain('var(--color-focus)');
    expect(ring[0].style.getPropertyValue('outline-offset')).toBe('-2px');
    // The OWN-084 rendering win stays on the grid items.
    const li = cssRules((s) => /\.deck-grid\s*>\s*li$/.test(s.trim()));
    expect(li.map((r) => r.style.getPropertyValue('content-visibility'))).toContain('auto');
  });

  it('H-461 (A13): the "Remove filter" chips are 44px tall on phones (≤ 40rem) and on touch, 32px otherwise', async () => {
    const { el } = await setup({ decks: three(), url: '/decks?own=ready' });
    expect(el.querySelectorAll('.filter-chip')).toHaveLength(1);
    const rules = cssRules((s) => targets(s, 'filter-chip'));
    expect(rules.find((r) => r.media === null)!.style.getPropertyValue('min-height')).toBe('32px');
    const phone = rules.find((r) => r.media?.includes('max-width: 40rem'));
    expect(phone?.media).toContain('pointer: coarse');
    expect(phone!.style.getPropertyValue('min-height')).toBe('44px');
  });

  it('L5 / OWN-008 no match: "No decks match these filters" with Clear filters; count "Showing 0 of 3 decks"', async () => {
    const { el, harness, tiles } = await setup({ decks: three(), url: '/decks?q=zzz' });
    expect(tiles()).toHaveLength(0);
    expect(text(el.querySelector('app-empty-state h2'))).toBe('No decks match these filters');
    expect(text(el.querySelector('#count-line'))).toBe('Showing 0 of 3 decks');
    Array.from(el.querySelectorAll<HTMLButtonElement>('app-empty-state button')).find((b) => text(b) === 'Clear filters')!.click();
    await settle(harness);
    expect(tiles()).toHaveLength(3);
    expect(document.activeElement).toBe(el.querySelector('input[type="search"]'));
  });

  it('OWN-006 search: accent-insensitive substring, debounced; Escape clears', async () => {
    const decks = [...three(), { ...makeDeck(id(9), 'Éclair', { main: [['Gust', 1]] }) }];
    const { el, harness, tiles } = await setup({ decks });
    const input = el.querySelector<HTMLInputElement>('input[type="search"]')!;
    expect(input.getAttribute('aria-label')).toBe('Search decks by name');
    input.value = 'eclair';
    input.dispatchEvent(new Event('input'));
    await vi.waitFor(async () => {
      await settle(harness);
      expect(tiles().map((t) => text(t.querySelector('.name-text')))).toEqual(['Éclair']);
    });
    expect(TestBed.inject(Location).path()).toBe('/decks?q=eclair');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await settle(harness);
    expect(tiles()).toHaveLength(4);
  });

  it('L13 / OWN-105 (e) unknown URL values are ignored with "1 filter value not found and was ignored"', async () => {
    const { el } = await setup({ decks: three(), url: '/decks?own=best&sort=name' });
    expect(Array.from(el.querySelectorAll('.notice')).map(text)).toContain('1 filter value not found and was ignored');
    expect(TestBed.inject(Location).path()).toBe('/decks?sort=name');
  });

  it('SPEC-005 AC 32 / OWN-006 sort: only Last updated, Name A–Z, Date added; ?sort=name orders by name', async () => {
    const { el, harness, tiles } = await setup({ decks: three(), url: '/decks?sort=name' });
    expect(tiles().map((t) => text(t.querySelector('.name-text')))).toEqual(['Gust Deck', 'Kennen Tempo', 'Ray Deck']);
    (el.querySelector('.sort-select .mat-mdc-select-trigger') as HTMLElement).click();
    await settle(harness);
    expect(Array.from(document.querySelectorAll('mat-option')).map(text)).toEqual(['Last updated', 'Name A–Z', 'Date added']);
    expect(text(el)).not.toMatch(/rank|score|tier|win rate|meta/i);
  });

  it('SPEC-008 AC 15 / OWN-105 (d) locked complete deck under Ready to build: the hint and "Show locked decks" (lock=locked, own cleared)', async () => {
    const { el, harness, tiles } = await setup({ decks: three(), owned: { Gust: 2, 'Hextech Ray': 3 }, locks: [lock(id(2))], url: '/decks?own=ready' });
    expect(tiles().map((t) => text(t.querySelector('.name-text')))).toEqual(['Gust Deck']);
    expect(text(el.querySelector('.locked-hint span'))).toBe('Locked decks are under Locked.');
    (el.querySelector('.locked-hint button') as HTMLButtonElement).click();
    await settle(harness);
    expect(TestBed.inject(Location).path()).toBe('/decks?lock=locked');
    expect(tiles().map((t) => text(t.querySelector('.name-text')))).toEqual(['Ray Deck']);
    expect(text(tiles()[0].querySelector('app-lock-badge'))).toBe('Locked');
    expect(el.querySelector('.locked-hint')).toBeNull();
  });

  it('SPEC-008 AC 13 / L8 lock store unreadable: banner, counts ignore locks, no lock badges, Lock filter disabled, record unchanged', async () => {
    const { el, tiles } = await setup({ decks: three(), owned: { 'Hextech Ray': 3 }, locks: 'newer' });
    expect(Array.from(el.querySelectorAll('.banner[role="alert"]')).map(text)).toContain(
      'Locked decks could not be read; counts ignore locks.',
    );
    expect(text(tileOf(el, 'Ray Deck').querySelector('.copies'))).toBe('3 of 3 copies available');
    expect(tiles().some((t) => text(t.querySelector('app-lock-badge')) !== '')).toBe(false);
    expect(el.querySelector('.lock-select')!.getAttribute('aria-disabled')).toBe('true');
    expect(JSON.parse(backend.get(STORAGE_KEYS.locks)!).schemaVersion).toBe(2);
  });

  it('L7 / OWN-063 card data not loaded: "Card data not loaded" with Try again; tiles "Ownership unavailable", deck mark', async () => {
    const { el, harness, tiles } = await setup({ catalog: 'error', owned: { Gust: 62 } });
    const banner = Array.from(el.querySelectorAll('.banner')).find((b) => text(b).startsWith('Card data not loaded'))!;
    expect(banner.getAttribute('role')).toBe('alert');
    expect(text(tiles()[0].querySelector('.copies'))).toBe('Ownership unavailable');
    expect(tiles()[0].querySelector('app-deck-mark')).not.toBeNull();
    (banner.querySelector('button') as HTMLButtonElement).click();
    await vi.waitFor(async () => {
      await settle(harness);
      expect(text(tiles()[0].querySelector('.copies'))).toBe('62 of 66 copies available');
    });
  });

  it('SPEC-005 AC 13 second Given / SPEC-008 AC 19 lock=locked lists the locked deck while ownership is unavailable', async () => {
    const { tiles } = await setup({ decks: three(), collection: 'newer', locks: [lock(id(2))], url: '/decks?lock=locked' });
    expect(tiles().map((t) => text(t.querySelector('.name-text')))).toEqual(['Ray Deck']);
    // SHARE-053 (b): the badge reads "Locked", never "… cards short", and no ownership chip (OWN-065).
    expect(text(tiles()[0].querySelector('app-lock-badge'))).toBe('Locked');
    expect(text(tiles()[0].querySelector('app-deck-status-chip'))).toBe('');
    TestBed.resetTestingModule();
    const none = await setup({ decks: three(), collection: 'newer', locks: [lock(id(2))], url: '/decks?own=none' });
    expect(none.tiles()).toHaveLength(0);
  });

  it('OWN-105 (a) Filters menu holds Legality and Source; choosing Source filters and shows a chip; Clear filters resets', async () => {
    const t = { ...kennen(8, 'Tourney'), source: { ...makeTournamentSource() } };
    const { el, harness, tiles } = await setup({ decks: [...three(), t] });
    (el.querySelector('.menu-control') as HTMLButtonElement).click();
    await settle(harness);
    const items = Array.from(document.querySelectorAll('.deck-filters-menu [role="menuitemradio"]')).map(text);
    expect(items).toEqual(['✓Any', 'Legal in Standard', 'Not legal in Standard today', 'Not fully checked', '✓Any', 'Imported', 'From Tournaments']);
    (Array.from(document.querySelectorAll<HTMLElement>('.deck-filters-menu [role="menuitemradio"]')).find((b) => text(b) === 'From Tournaments'))!.click();
    await settle(harness);
    expect(tiles().map((x) => text(x.querySelector('.name-text')))).toEqual(['Tourney']);
    expect(text(el.querySelector('.menu-control .badge'))).toBe('1');
    expect(TestBed.inject(Location).path()).toBe('/decks?source=tournament');
    Array.from(el.querySelectorAll<HTMLButtonElement>('.active-filters button')).find((b) => text(b) === 'Clear filters')!.click();
    await settle(harness);
    expect(tiles()).toHaveLength(4);
  });
});

function makeTournamentSource(): UserDeck['source'] {
  return {
    kind: 'tournament',
    eventId: 'rc-eu',
    eventName: 'Regional Championship: Europe',
    eventStartDate: '2026-11-06',
    eventEndDate: '2026-11-08',
    region: 'europe',
    decklistId: 'k1',
    publishedRank: 1,
    placingLabel: '1st',
    pilot: 'ASC Evansrhim',
    sourceUrl: 'https://example.test/k1',
    addedAt: '2026-11-20T12:00:00Z',
  };
}

describe('DecksPage loading and in-place recompute ([[Decks]] §10 L2, L11; SPEC-005 OWN-070, OWN-071)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.querySelectorAll('.cdk-overlay-container').forEach((n) => (n.innerHTML = ''));
    document.documentElement.classList.remove('has-fab');
  });

  const nameOf = (t: Element) => text(t.querySelector('.name-text'));

  it('L2 loading under 200ms shows no skeleton; past 200ms: count placeholder, toolbar disabled, 6 skeleton tiles, aria-busy, "Loading your decks…"', async () => {
    let release!: () => void;
    const hold = new Promise<void>((r) => (release = r));
    // The 200ms skeleton delay is held here and fired by hand, so the test doesn't depend on machine speed.
    const delayed: (() => void)[] = [];
    const realSetTimeout = globalThis.setTimeout;
    vi.spyOn(globalThis, 'setTimeout').mockImplementation(((fn: () => void, ms?: number, ...args: unknown[]) => {
      if (ms === 200) {
        delayed.push(fn);
        return 0;
      }
      return realSetTimeout(fn, ms, ...args);
    }) as typeof setTimeout);
    const { harness, el, tiles } = await setup({ hold });
    // Before the 200ms delay nothing flashes.
    expect(el.querySelector('.skeleton')).toBeNull();
    expect(el.querySelector('.count-placeholder')).toBeNull();
    expect(delayed.length).toBe(1);
    delayed[0]();
    harness.fixture.detectChanges();
    const grid = el.querySelector('.deck-grid.skeleton')!;
    expect(grid).not.toBeNull();
    expect(grid.getAttribute('aria-busy')).toBe('true');
    expect(grid.querySelectorAll('.skeleton-tile').length).toBe(6);
    for (const t of Array.from(grid.querySelectorAll('.skeleton-tile'))) {
      expect(t.querySelector('.skeleton-art')).not.toBeNull();
      expect(t.querySelectorAll('.skeleton-lines span').length).toBe(3);
    }
    expect(text(grid.querySelector('.visually-hidden'))).toBe(DECKS_TEXT.loading);
    expect(DECKS_TEXT.loading).toBe('Loading your decks…');
    expect(el.querySelector('.count-line .count-placeholder')!.getAttribute('aria-hidden')).toBe('true');
    expect(el.querySelector('#count-line')).toBeNull();
    expect(el.querySelector<HTMLInputElement>('.deck-toolbar input[type="search"]')!.disabled).toBe(true);
    const controls = Array.from(el.querySelectorAll<HTMLElement>('.deck-toolbar button, .deck-toolbar mat-select'));
    expect(controls.length).toBeGreaterThan(0);
    for (const c of controls) {
      const disabled = c instanceof HTMLButtonElement ? c.disabled : c.getAttribute('aria-disabled') === 'true';
      expect(disabled, c.outerHTML.slice(0, 80)).toBe(true);
    }
    expect(tiles().length).toBe(0);
    expect(el.querySelector('app-page-fab')).toBeNull();

    release();
    await vi.waitFor(async () => {
      await settle(harness);
      expect(tiles().length).toBe(1);
    });
    expect(el.querySelector('.skeleton')).toBeNull();
    expect(el.querySelector('[aria-busy]')).toBeNull();
    expect(el.querySelector('.count-placeholder')).toBeNull();
    expect(text(el.querySelector('#count-line'))).toBe('1 deck');
    expect(el.querySelector<HTMLInputElement>('.deck-toolbar input[type="search"]')!.disabled).toBe(false);
  });

  it('L11 / OWN-071 another tab changes the collection: tiles recompute in place, same DOM nodes, focus and scroll kept, no loading state', async () => {
    const decks = [
      { ...kennen(1, 'Kennen Tempo'), updatedAt: '2026-11-23T10:00:00Z' },
      { ...kennen(2, 'Kennen Control'), updatedAt: '2026-11-22T10:00:00Z' },
      { ...kennen(3, 'Kennen Aggro'), updatedAt: '2026-11-21T10:00:00Z' },
    ];
    const { harness, el, tiles } = await setup({ decks, owned: { [LEGEND]: 1, 'Lightning Rush': 3, Gust: 30 } });
    const before = tiles();
    expect(before.map(nameOf)).toEqual(['Kennen Tempo', 'Kennen Control', 'Kennen Aggro']);
    const items = Array.from(el.querySelectorAll('ul.deck-grid > li'));
    const grid = el.querySelector('ul.deck-grid')!;
    const link = before[1].querySelector<HTMLAnchorElement>('a')!;
    link.focus();
    expect(document.activeElement).toBe(link);

    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const scrollY = window.scrollY;
    const added: string[] = [];
    const observer = new MutationObserver((records) => {
      for (const r of records)
        for (const n of Array.from(r.addedNodes))
          if (n instanceof Element && (n.matches('.skeleton, app-deck-tile, li') || n.querySelector('.skeleton, app-deck-tile')))
            added.push(n.tagName);
    });
    observer.observe(el, { childList: true, subtree: true });

    const cards = { [nameKey(LEGEND)]: { quantity: 1, byPrinting: {} }, 'lightning rush': { quantity: 3, byPrinting: {} }, gust: { quantity: 62, byPrinting: {} } };
    backend.set(STORAGE_KEYS.collection, JSON.stringify({ schemaVersion: 1, updatedAt: '2026-11-24T00:00:00Z', catalogVersion: '0.3+test', cards }));
    dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEYS.collection }));
    await vi.waitFor(async () => {
      await settle(harness);
      expect(tiles().map((t) => text(t.querySelector('.percent')))).toEqual(['100%', '100%', '100%']);
    });
    observer.disconnect();

    // Recomputed in place: the same list, items and tiles (tracked by deck id), nothing re-rendered or skeleton shown.
    expect(el.querySelector('ul.deck-grid')).toBe(grid);
    expect(Array.from(el.querySelectorAll('ul.deck-grid > li'))).toEqual(items);
    tiles().forEach((t, i) => expect(t).toBe(before[i]));
    expect(added).toEqual([]);
    expect(el.querySelector('.skeleton')).toBeNull();
    // Focus kept on the same element.
    expect(link.isConnected).toBe(true);
    expect(document.activeElement).toBe(link);
    // Scroll kept: the page never scrolls on a recompute.
    expect(scrollTo).not.toHaveBeenCalled();
    expect(window.scrollY).toBe(scrollY);
  });

  it('L11 / OWN-070 a lock change in this tab recomputes in place with focus kept', async () => {
    const decks = [
      { ...kennen(1, 'Kennen Tempo'), updatedAt: '2026-11-23T10:00:00Z' },
      { ...kennen(2, 'Kennen Control'), updatedAt: '2026-11-22T10:00:00Z' },
    ];
    const { harness, el, tiles } = await setup({ decks, owned: { [LEGEND]: 1, 'Lightning Rush': 3, Gust: 62 } });
    const before = tiles();
    const link = before[1].querySelector<HTMLAnchorElement>('a')!;
    link.focus();
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    backend.set(STORAGE_KEYS.locks, JSON.stringify({ schemaVersion: 1, updatedAt: 'x', locks: [lock(id(1), '2026-11-24T10:00:00Z')] }));
    dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEYS.locks }));
    await vi.waitFor(async () => {
      await settle(harness);
      expect(text(tileOf(el, 'Kennen Tempo').querySelector('app-lock-badge'))).toBe('Locked');
    });
    // Deck 1 holds every copy now, so deck 2 drops; its tile is the same node.
    expect(text(tileOf(el, 'Kennen Control').querySelector('app-deck-status-chip'))).not.toBe('Ready to build');
    tiles().forEach((t, i) => expect(t).toBe(before[i]));
    expect(document.activeElement).toBe(link);
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
