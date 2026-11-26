import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { Location } from '@angular/common';
import { NavigationStart, Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { CardData, CatalogResult } from '../../core/cards/card-data';
import type { BanListFile } from '../../core/decks';
import { AppStores } from '../../core/storage/app-stores';
import { BrowserStores, createBrowserStores } from '../../core/storage/browser-stores';
import { MemoryBackend } from '../../core/storage/kv-backend';
import { STORAGE_KEYS } from '../../core/storage/local-stores';
import { provideOpenGate } from '../../core/sync/testing/open-gate';
import { BreakpointObserver } from '@angular/cdk/layout';
import { of } from 'rxjs';
import { generateLargeSample, sampleDeck } from '../../shared/collection/sample-data';
import type { SampleData } from '../../shared/collection/sample-data';
import { makeCatalog } from '../../core/decks/engine-fixtures';
import { StorageFullError } from '../../core/storage/kv-backend';
import { MatSnackBar } from '@angular/material/snack-bar';

interface Setup {
  sample?: Partial<SampleData> | null;
  catalogError?: boolean;
  corruptCollection?: boolean;
  corruptLocks?: boolean;
  decksError?: boolean;
  bans?: BanListFile | null;
  /** Phone width (below 40rem): the BreakpointObserver reports the phone query as matching. */
  phone?: boolean;
}

let backend: MemoryBackend;
let stores: BrowserStores;

async function setup(url: string, s: Setup = {}) {
  backend = new MemoryBackend();
  stores = createBrowserStores(backend, {
    now: () => Date.now(),
    changed: () => undefined,
    readOnly: () => false,
  });
  const sample = s.sample === undefined ? generateLargeSample(30) : s.sample;
  if (sample?.collection) await stores.raw.collection.save(sample.collection);
  for (const d of sample?.decks ?? []) await stores.raw.decks.put(d);
  if (sample?.locks)
    await stores.raw.locks.save({ schemaVersion: 1, updatedAt: '', locks: sample.locks });
  if (s.corruptCollection) backend.set(STORAGE_KEYS.collection, '{not json');
  if (s.corruptLocks)
    backend.set(
      STORAGE_KEYS.locks,
      JSON.stringify({ schemaVersion: 99, updatedAt: '', locks: [] }),
    );
  if (s.decksError) vi.spyOn(stores.decks, 'list').mockRejectedValue(new Error('unreadable'));
  const catalog = sample?.catalog ?? generateLargeSample(30).catalog;
  const cardData: Partial<CardData> = {
    loadCatalog: async (): Promise<CatalogResult> =>
      s.catalogError ? { status: 'error' } : { status: 'ok', catalog },
    // H-233: the Owned Cards Import resolves against the /api catalog (the same one here).
    loadApiCatalog: async (): Promise<CatalogResult> =>
      s.catalogError ? { status: 'error' } : { status: 'ok', catalog },
    reload: async (): Promise<CatalogResult> => ({ status: 'ok', catalog }),
    loadBans: async () => s.bans ?? null,
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes, withComponentInputBinding()),
      { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
      { provide: AppStores, useValue: { stores } },
      { provide: CardData, useValue: cardData },
      // Signed in and synced: the gate is open (SPEC-010 SYNC-009). The gate is covered in pages/gated-pages.spec.ts.
      provideOpenGate(),
      ...(s.phone
        ? [
            {
              provide: BreakpointObserver,
              useValue: {
                observe: (q: string) => of({ matches: q.includes('max-width'), breakpoints: {} }),
                isMatched: (q: string) => q.includes('max-width'),
              },
            },
          ]
        : []),
    ],
  });
  const harness = await RouterTestingHarness.create(url);
  await settle(harness);
  return harness;
}

async function settle(harness: RouterTestingHarness, ms = 0) {
  if (ms) await new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 3; i++) {
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 0));
  }
}

const el = (h: RouterTestingHarness) => h.routeNativeElement as HTMLElement;
const text = (h: RouterTestingHarness, sel: string) =>
  el(h).querySelector(sel)?.textContent?.trim() ?? null;

describe('CollectionPage (H-086)', () => {
  afterEach(() =>
    document.querySelectorAll('.cdk-overlay-container').forEach((n) => (n.innerHTML = '')),
  );

  it('COLL-001 S1 / COLL-094 (g): an empty collection shows the empty state with its own Add to your collection button, no toolbar and no floating button', async () => {
    const h = await setup('/collection', { sample: null });
    expect(text(h, 'app-empty-state h2')).toBe('Your collection is empty');
    expect(text(h, 'app-empty-state p')).toBe("Add the cards you own and they'll show up here.");
    expect(text(h, '.page-lede')).toBe('Every card you own.');
    const add = el(h).querySelector<HTMLButtonElement>('app-empty-state button')!;
    expect(add.textContent?.trim()).toBe('Add to your collection');
    expect(add.getAttribute('aria-haspopup')).toBe('dialog');
    expect(el(h).querySelector('a[href^="/import"]')).toBeNull();
    expect(el(h).querySelector('app-page-fab')).toBeNull();
    expect(el(h).querySelector('.toolbar')).toBeNull();
    add.click();
    await settle(h);
    expect(document.querySelector('mat-dialog-container h2')?.textContent?.trim()).toBe('Add to your collection');
  });

  it('COLL-071 SYNC-033 S8: an unreadable collection shows the alert banner with Reload', async () => {
    const h = await setup('/collection', { corruptCollection: true });
    const banner = el(h).querySelector('[role="alert"]');
    expect(banner?.textContent).toContain("Your collection couldn't be read.");
    expect(banner?.textContent).toContain('Reload');
    expect(backend.get(STORAGE_KEYS.collection)).toBe('{not json'); // never overwritten
  });

  it('SPEC-007 AC 26 / COLL-090 (a) (b) (c): card data that fails to load shows only the banner; nothing else of the list, nothing written', async () => {
    const sample = generateLargeSample(30);
    sample.collection.cards['not in the catalog'] = { quantity: 1, byPrinting: {} }; // would be "Unresolved cards"
    const h = await setup('/collection', { catalogError: true, sample });
    const before = new Map(backend.keys().map((k) => [k, backend.get(k)]));
    const alert = el(h).querySelector('[role="alert"]')!;
    expect(alert.querySelector('p')?.textContent?.trim()).toBe(
      "Card data couldn't load. Your cards are safe. Names and images will show once it loads.",
    );
    expect(alert.querySelector('button')?.textContent?.trim()).toBe('Try again');
    // (b) no tiles, skeleton, count line, search, sort, Export CSV or Unresolved cards section
    expect(el(h).querySelector('app-collection-tile')).toBeNull();
    expect(el(h).querySelector('.count-line')).toBeNull();
    expect(el(h).querySelector('.count-placeholder')).toBeNull();
    expect(el(h).querySelector('input[type="search"], .toolbar')).toBeNull();
    expect(el(h).querySelector('mat-select')).toBeNull();
    expect(el(h).textContent).not.toContain('Export CSV');
    expect(el(h).querySelector('[aria-label="Export CSV"]')).toBeNull();
    expect(el(h).textContent).not.toContain('Unresolved');
    // (c) byte-for-byte unchanged
    await settle(h, 20);
    expect(new Map(backend.keys().map((k) => [k, backend.get(k)]))).toEqual(before);
  });

  describe('SPEC-007 AC 26 / COLL-090 (d)', () => {
    /** Lightning Rush at OGN 001, Gust at OGN 002, so the default order (set, collector number) is Lightning Rush first. */
    function ac26Sample(): Partial<SampleData> {
      const catalog = makeCatalog(['Lightning Rush', 'Gust']);
      catalog.sets = [{ code: 'OGN', name: 'Origins', setOrder: 0, releaseStatus: null, printingCount: 2 }];
      catalog.printings['p-gust'].collectorNumber = '002';
      return {
        catalog,
        collection: {
          schemaVersion: 1,
          updatedAt: '2026-11-24T00:00:00.000Z',
          catalogVersion: '0.3+test',
          cards: {
            'lightning rush': { quantity: 3, byPrinting: { 'p-lightning-rush': 3 } },
            gust: { quantity: 2, byPrinting: { 'p-gust': 2 } },
          },
        },
      };
    }
    const banner = (h: RouterTestingHarness) =>
      Array.from(el(h).querySelectorAll('[role="alert"]')).find((a) =>
        a.textContent?.includes("Card data couldn't load."),
      );
    const tryAgain = (h: RouterTestingHarness) => banner(h)!.querySelector<HTMLButtonElement>('button')!;
    const tileNames = (h: RouterTestingHarness) =>
      Array.from(el(h).querySelectorAll('[data-entry]')).map((t) => t.getAttribute('aria-label')!.split(', ')[0]);

    it('Try again with the catalog now loading shows the loading state, then the grid in default order with "5 copies of 2 cards"', async () => {
      const sample = ac26Sample();
      const h = await setup('/collection', { catalogError: true, sample });
      expect(banner(h)).toBeDefined();
      const cardData = TestBed.inject(CardData);
      let release!: (r: CatalogResult) => void;
      const pending = new Promise<CatalogResult>((r) => (release = r));
      vi.spyOn(cardData, 'reload').mockReturnValue(pending);
      vi.spyOn(cardData, 'loadCatalog').mockReturnValue(pending);
      tryAgain(h).click();
      await settle(h);
      // (d) the page's loading state again: no banner, no grid, the count line slot
      expect(banner(h)).toBeUndefined();
      expect(el(h).querySelector('[data-entry]')).toBeNull();
      expect(el(h).querySelector('.count-line')).not.toBeNull();
      expect(text(h, '.count-line')).toBe('');
      release({ status: 'ok', catalog: sample.catalog! });
      await vi.waitFor(async () => {
        await settle(h);
        expect(text(h, '#count-line')).toBe('5 copies of 2 cards');
      });
      expect(banner(h)).toBeUndefined();
      expect(tileNames(h)).toEqual(['Lightning Rush', 'Gust']);
      vi.restoreAllMocks();
    });

    it('Try again with the catalog still failing brings the same banner back', async () => {
      const h = await setup('/collection', { catalogError: true, sample: ac26Sample() });
      const cardData = TestBed.inject(CardData);
      const reload = vi.spyOn(cardData, 'reload').mockResolvedValue({ status: 'error' });
      const before = banner(h)!.querySelector('p')!.textContent!.trim();
      tryAgain(h).click();
      await settle(h, 20);
      expect(reload).toHaveBeenCalledTimes(1);
      expect(banner(h)!.querySelector('p')!.textContent!.trim()).toBe(before);
      expect(banner(h)!.querySelector('button')!.textContent!.trim()).toBe('Try again');
      expect(el(h).querySelector('[data-entry]')).toBeNull();
      expect(el(h).querySelector('.count-line')).toBeNull();
      vi.restoreAllMocks();
    });
  });

  it('SPEC-007 AC 26 / COLL-090 (e): an empty collection with the same failure shows the empty state, not the banner', async () => {
    const h = await setup('/collection', { catalogError: true, sample: null });
    expect(text(h, 'app-empty-state h2')).toBe('Your collection is empty');
    expect(el(h).textContent).not.toContain("Card data couldn't load.");
  });

  it('COLL-001 COLL-010 COLL-016 S3 (A1, A2): tiles render image-only with ×N badges from 2 copies and the count line', async () => {
    const h = await setup('/collection');
    const s = generateLargeSample(30);
    const copies = Object.values(s.collection.cards).reduce((n, c) => n + c.quantity, 0);
    expect(text(h, '#count-line')).toBe(
      `${copies} copies of ${Object.keys(s.collection.cards).length} cards`,
    );
    const tiles = [...el(h).querySelectorAll('app-collection-tile')];
    expect(tiles.length).toBeGreaterThan(0);
    for (const t of tiles) {
      const label = t.querySelector('button')!.getAttribute('aria-label')!;
      const n = Number(/, (\d+) cop/.exec(label)![1]);
      const badge = t.querySelector('.badge');
      expect(badge?.textContent ?? null).toBe(n >= 2 ? `×${n}` : null);
      expect(t.querySelector('.art--full')).not.toBeNull();
    }
    expect(el(h).querySelectorAll('.art--partial, .art--none')).toHaveLength(0);
  });

  it('SHARE-033 S5 (A3): every printing tile of a locked card shows the card-level band', async () => {
    const h = await setup('/collection');
    const bands = [...el(h).querySelectorAll('app-collection-tile .band')].map((b) =>
      b.textContent?.trim(),
    );
    expect(bands.length).toBeGreaterThan(0);
    expect(bands.every((b) => /^\d+ of this card locked in /.test(b ?? ''))).toBe(true);
  });

  it('SHARE-061 S7 and COLL-008 S9: unreadable locks and missing ban data show their notices', async () => {
    const h = await setup('/collection', { corruptLocks: true });
    const notices = [...el(h).querySelectorAll('.notice')].map((n) => n.textContent ?? '');
    expect(
      notices.some((n) =>
        n.includes("Locked decks couldn't be read, so locked copies aren't shown."),
      ),
    ).toBe(true);
    expect(
      notices.some((n) => n.includes("The ban list couldn't load, so ban status is unknown.")),
    ).toBe(true);
    expect(el(h).querySelector('app-collection-tile .band')).toBeNull();
  });

  it('COLL-040 S4 (A8): search filters after the debounce, shows "Showing X of Y", mirrors q in the URL, and an empty result offers Clear search', async () => {
    const h = await setup('/collection');
    const input = el(h).querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = 'ashen';
    input.dispatchEvent(new Event('input'));
    await settle(h, 200);
    expect(text(h, '#count-line')).toMatch(/^Showing \d+ of 30$/);
    expect(TestBed.inject(Location).path()).toBe('/collection?q=ashen');
    input.value = 'zhonya';
    input.dispatchEvent(new Event('input'));
    await settle(h, 200);
    expect(text(h, 'app-empty-state h2')).toBe('No cards match “zhonya”.');
    const clear = [...el(h).querySelectorAll('app-empty-state button')].find((b) =>
      b.textContent?.includes('Clear search'),
    ) as HTMLButtonElement;
    clear.click();
    await settle(h);
    expect(text(h, '#count-line')).toMatch(/copies of/);
  });

  it('COLL-061 COLL-062 S15 (A8): ?sort=cost is ignored with the verbatim notice', async () => {
    const h = await setup('/collection?sort=cost');
    const notices = [...el(h).querySelectorAll('.notice')].map((n) => n.textContent ?? '');
    expect(notices.some((n) => n.includes('1 filter value not found and was ignored'))).toBe(true);
  });

  it('COLL-063: ?q= from the URL is applied on load', async () => {
    const h = await setup('/collection?q=ashen&sort=name');
    expect(text(h, '#count-line')).toMatch(/^Showing \d+ of 30$/);
    expect(el(h).querySelector<HTMLInputElement>('input[type="search"]')!.value).toBe('ashen');
  });

  it('A5 A12: Enter opens the dialog on the clicked printing; Escape closes it', async () => {
    const h = await setup('/collection');
    const button = el(h).querySelector<HTMLButtonElement>('app-collection-tile button')!;
    const name = button.getAttribute('aria-label')!.split(', ')[0];
    button.click();
    await settle(h);
    const dialog = document.querySelector('mat-dialog-container')!;
    expect(dialog.querySelector('h2')?.textContent?.trim()).toBe(name);
    expect(dialog.querySelector('.printing')?.textContent).toMatch(/· \d+ cop(y|ies)$/);
    expect(dialog.textContent).toContain('Could fit in');
    dialog
      .querySelector('app-card-dialog')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await settle(h);
    expect(document.querySelector('mat-dialog-container')).toBeNull();
  });

  it('A6 H-095 fix 7: a card no deck uses reads "None of your decks use this card."', async () => {
    const s = generateLargeSample(3);
    const h = await setup('/collection', { sample: { ...s, decks: [], locks: [] } });
    el(h).querySelector<HTMLButtonElement>('app-collection-tile button')!.click();
    await settle(h);
    expect(document.querySelector('mat-dialog-container')?.textContent).toContain(
      'None of your decks use this card.',
    );
  });

  it('H-095 fix 9: rows in the first screen load their images eagerly, rows below it lazily', async () => {
    // A short window, so the rendered rows (viewport + buffer) reach below the first screen.
    const height = innerHeight;
    Object.defineProperty(window, 'innerHeight', { value: 300, configurable: true });
    const h = await setup('/collection', { sample: generateLargeSample(300) }).finally(() =>
      Object.defineProperty(window, 'innerHeight', { value: height, configurable: true }),
    );
    const rows = [...el(h).querySelectorAll<HTMLElement>('.grid-row')];
    const rowHeight = Number.parseFloat(rows[0].style.height);
    const firstScreen = Math.ceil(300 / rowHeight);
    const loading = (row: Element) =>
      new Set(
        [...row.querySelectorAll('img.card-image:not(.dimmed)')].map((i) =>
          i.getAttribute('loading'),
        ),
      );
    expect(rows.length).toBeGreaterThan(firstScreen);
    expect(loading(rows[0])).toEqual(new Set(['eager']));
    expect(loading(rows[firstScreen - 1])).toEqual(new Set(['eager']));
    expect(loading(rows[firstScreen])).toEqual(new Set(['lazy']));
  });

  it('H-095 fix 1: search and sort update the URL without a router navigation', async () => {
    const h = await setup('/collection');
    const router = TestBed.inject(Router);
    let navigations = 0;
    const sub = router.events.subscribe((e) => {
      if (e instanceof NavigationStart) navigations++;
    });
    const input = el(h).querySelector<HTMLInputElement>('input[type="search"]')!;
    for (const q of ['ash', 'ashen', 'ashen w']) {
      input.value = q;
      input.dispatchEvent(new Event('input'));
      await settle(h, 200);
    }
    sub.unsubscribe();
    expect(navigations).toBe(0);
    expect(TestBed.inject(Location).path()).toBe('/collection?q=ashen%20w');
  });

  it('A12: the grid is one Tab stop; arrow keys move the roving focus', async () => {
    const h = await setup('/collection');
    const buttons = () => [
      ...el(h).querySelectorAll<HTMLButtonElement>('app-collection-tile button'),
    ];
    expect(buttons().filter((b) => b.tabIndex === 0)).toHaveLength(1);
    buttons()[0].focus();
    buttons()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await settle(h);
    expect(buttons()[1].tabIndex).toBe(0);
    expect(document.activeElement).toBe(buttons()[1]);
  });

  it('A12: "/" focuses the search field', async () => {
    const h = await setup('/collection');
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }));
    await settle(h);
    expect(document.activeElement).toBe(el(h).querySelector('input[type="search"]'));
  });

  it('COLL-065 COLL-067 SPEC-007 AC 18 (A11): with 5,000 entries only rows near the viewport are in the DOM, and images only for them', async () => {
    const h = await setup('/collection', { sample: generateLargeSample(5000) });
    const tiles = el(h).querySelectorAll('app-collection-tile');
    expect(tiles.length).toBeGreaterThan(0);
    expect(tiles.length).toBeLessThan(300);
    expect(el(h).querySelectorAll('img').length).toBeLessThanOrEqual(tiles.length * 2);
    const first = tiles[0];
    expect(first.getAttribute('aria-setsize')).toBe('5000');
    expect(first.getAttribute('aria-posinset')).toBe('1');
  });

  it('COLL-073 S13: a change in another tab refreshes the page in place', async () => {
    const h = await setup('/collection', {
      sample: { ...generateLargeSample(3), decks: [sampleDeck(9, 'x', [])], locks: [] },
    });
    expect(text(h, '#count-line')).toMatch(/of 1 card$/);
    const more = generateLargeSample(6);
    await stores.raw.collection.save(more.collection);
    dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEYS.collection }));
    await settle(h, 50);
    expect(text(h, '#count-line')).toMatch(/of 2 cards$/);
  });

  it('COLL-073 H-086 review 2: a burst of storage events from another tab rebuilds the view once', async () => {
    const h = await setup('/collection');
    const load = vi.spyOn(stores.collection, 'load');
    for (const key of [STORAGE_KEYS.collection, STORAGE_KEYS.locks, STORAGE_KEYS.tags]) {
      dispatchEvent(new StorageEvent('storage', { key }));
    }
    await settle(h, 50);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('COLL-073 H-086 review 2: a slower earlier reload never overwrites a newer one', async () => {
    const h = await setup('/collection', {
      sample: { ...generateLargeSample(3), decks: [], locks: [] },
    });
    expect(text(h, '#count-line')).toMatch(/of 1 card$/);
    const stale = await stores.collection.load();
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    vi.spyOn(stores.collection, 'load').mockImplementationOnce(async () => {
      await gate;
      return stale;
    });
    dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEYS.collection }));
    await settle(h, 50); // the first reload now waits on `gate`
    await stores.raw.collection.save(generateLargeSample(6).collection);
    dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEYS.collection }));
    await settle(h, 50);
    expect(text(h, '#count-line')).toMatch(/of 2 cards$/);
    release();
    await settle(h, 50);
    expect(text(h, '#count-line')).toMatch(/of 2 cards$/);
  });

  it('H-086 review 3: unreadable decks show a notice, and the dialog says why Could fit in is missing', async () => {
    const h = await setup('/collection', { decksError: true });
    const notices = [...el(h).querySelectorAll('.notice')].map((n) => n.textContent ?? '');
    expect(
      notices.some((n) => n.includes("Your decks couldn't be read, so Could fit in isn't shown.")),
    ).toBe(true);
    el(h).querySelector<HTMLButtonElement>('app-collection-tile button')!.click();
    await settle(h);
    const dialog = document.querySelector('mat-dialog-container')!;
    expect(dialog.textContent).toContain("Your decks couldn't be read, so Could fit in isn't shown.");
    expect(dialog.textContent).not.toContain('use this card.');
  });

  it('COLL-063 H-086 review 4: overlapping query saves land in order, so the last query is remembered', async () => {
    const h = await setup('/collection');
    const real = stores.viewState.load.bind(stores.viewState);
    vi.spyOn(stores.viewState, 'load').mockImplementationOnce(async () => {
      await new Promise((r) => setTimeout(r, 300)); // the first save's read is slow
      return real();
    });
    const input = el(h).querySelector<HTMLInputElement>('input[type="search"]')!;
    for (const q of ['ash', 'ashen']) {
      input.value = q;
      input.dispatchEvent(new Event('input'));
      await settle(h, 200);
    }
    await settle(h, 400);
    expect((await real())?.query['text']).toBe('ashen');
  });

  describe('SPEC-010 AC 31: no delete-all-local action (SPEC-007 COLL-074 withdrawn)', () => {
    it('AC 31 desktop: Export CSV in the header, no More menu, no delete action', async () => {
      const h = await setup('/collection');
      expect(text(h, 'button.button--outlined')).toContain('Export CSV');
      expect(el(h).querySelector('button[aria-label="More"]')).toBeNull();
      expect(el(h).textContent).not.toMatch(/Delete all local|local collection data/i);
    });

    it('AC 31 / COLL-094 (j) phone: one Export CSV icon button replaces the More menu, and no delete action', async () => {
      const h = await setup('/collection', { phone: true });
      expect(el(h).querySelector('button[aria-label="More"]')).toBeNull();
      const exportButton = el(h).querySelector<HTMLButtonElement>('.title-row button[aria-label="Export CSV"]');
      expect(exportButton).not.toBeNull();
      expect(el(h).textContent).not.toMatch(/Delete all local|local collection data/i);
    });

    it('AC 31 empty collection: no More menu and no delete action', async () => {
      const h = await setup('/collection', { sample: null });
      expect(el(h).querySelector('button[aria-label="More"]')).toBeNull();
      expect(el(h).textContent).not.toMatch(/Delete all local|local collection data/i);
    });
  });

  describe('COLL-093 smooth scrolling, no pagination (SPEC-010 SYNC-145)', () => {
    it('COLL-093 a / f / SPEC-007 AC 28: 3,000 entries, no page controls or Load more, the total is visible, virtual rows only', async () => {
      const h = await setup('/collection', {
        sample: { ...generateLargeSample(3000), decks: [], locks: [] },
      });
      expect(text(h, '#count-line')).toMatch(/\d/); // the summary total (COLL-010)
      expect(el(h).textContent).not.toMatch(/\bPage\b|\bNext\b|\bPrevious\b|Load more|Show more|per page/i);
      expect(el(h).querySelector('cdk-virtual-scroll-viewport')).not.toBeNull();
      // Only the rows near the viewport are rendered (COLL-066); each tile still states its position and the total.
      const tiles = el(h).querySelectorAll('app-collection-tile');
      expect(tiles.length).toBeGreaterThan(0);
      expect(tiles.length).toBeLessThan(3000);
      expect(tiles[0].getAttribute('aria-posinset')).toBe('1');
      expect(tiles[0].getAttribute('aria-setsize')).toBe('3000');
    });

    it('COLL-093 d: a sort or search change shows the result from the top of the list', async () => {
      const h = await setup('/collection', {
        sample: { ...generateLargeSample(300), decks: [], locks: [] },
      });
      const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
      const scrolled = vi.spyOn(window, 'scrollY', 'get').mockReturnValue(5000);
      try {
        await TestBed.inject(Router).navigateByUrl('/collection?sort=name');
        await settle(h, 50);
        expect(scrollTo).toHaveBeenCalled();
        const top = (scrollTo.mock.calls.at(-1)![0] as ScrollToOptions).top!;
        expect(top).toBeLessThan(5000);
        scrollTo.mockClear();
        const input = el(h).querySelector<HTMLInputElement>('input[type="search"]')!;
        input.value = 'ash';
        input.dispatchEvent(new Event('input'));
        await settle(h, 400);
        expect(scrollTo).toHaveBeenCalled();
      } finally {
        scrolled.mockRestore();
        scrollTo.mockRestore();
      }
    });
  });
});

describe('CollectionPage "Add to your collection" (SPEC-007 COLL-094, SPEC-003 IMP-060, SPEC-010 SYNC-159, H-176)', () => {
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((n) => (n.innerHTML = ''));
    document.documentElement.classList.remove('has-fab');
  });
  const dialogTitle = () => document.querySelector('mat-dialog-container h2')?.textContent?.trim() ?? null;

  it('COLL-094 (a), (f), (g) / IMP-060: with the list shown, one floating button "Add to your collection" right after the header, before the toolbar; it opens the dialog', async () => {
    const h = await setup('/collection');
    const fab = el(h).querySelector<HTMLButtonElement>('app-page-fab button')!;
    expect(fab).not.toBeNull();
    expect(fab.textContent?.trim()).toBe('Add to your collection');
    expect(fab.getAttribute('aria-haspopup')).toBe('dialog');
    expect(fab.querySelector('app-icon')?.getAttribute('aria-hidden')).toBe('true');
    expect(document.documentElement.classList.contains('has-fab')).toBe(true); // page-end clearance (COLL-094 d, e)
    const header = el(h).querySelector('header.page-header')!;
    const toolbar = el(h).querySelector('.toolbar')!;
    expect(header.compareDocumentPosition(fab) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(fab.compareDocumentPosition(toolbar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fab.click();
    await settle(h);
    expect(dialogTitle()).toBe('Add to your collection');
    expect(TestBed.inject(Router).url).toBe('/collection'); // stays on Collection (IMP-072)
  });

  it('COLL-094 (e) / H-245 Accept 6: an arrow key that moves focus below the window scrolls the row clear of the floating button (the page bottom padding counts)', async () => {
    const h = await setup('/collection', { sample: { ...generateLargeSample(300), decks: [], locks: [] } });
    const rowH = parseFloat(el(h).querySelector<HTMLElement>('.grid-row')?.style.height ?? '') || 0;
    expect(rowH).toBeGreaterThan(0);
    // Two rows plus 50px fit in the window; the FAB clearance (92px) does not leave room for the second row.
    const realStyle = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((e: Element, p?: string | null) =>
      e === document.documentElement
        ? new Proxy(realStyle(e, p), { get: (t, k) => (k === 'scrollPaddingBottom' ? '92px' : Reflect.get(t, k)) })
        : realStyle(e, p),
    );
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(2 * rowH + 50);
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(0);
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    try {
      const first = el(h).querySelector<HTMLElement>('[data-entry]')!;
      first.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await settle(h);
      expect(scrollTo).toHaveBeenCalled();
      const top = (scrollTo.mock.calls.at(-1)![0] as ScrollToOptions).top!;
      // grid top (0 in jsdom) + row 1 + one row height - window height + clearance
      expect(top).toBe(2 * rowH - (2 * rowH + 50) + 92);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('COLL-094 (b): no floating button on the unreadable banner or the card-data banner', async () => {
    let h = await setup('/collection', { corruptCollection: true });
    expect(el(h).querySelector('app-page-fab')).toBeNull();
    TestBed.resetTestingModule();
    h = await setup('/collection', { catalogError: true });
    expect(el(h).querySelector('app-page-fab')).toBeNull();
  });

  it('SYNC-159 (c) / AC 80: /collection?add=1 opens the dialog once and the address becomes /collection with no history entry', async () => {
    const h = await setup('/collection?add=1');
    await vi.waitFor(async () => {
      await settle(h);
      expect(dialogTitle()).toBe('Add to your collection');
    });
    expect(document.querySelectorAll('mat-dialog-container')).toHaveLength(1);
    expect(TestBed.inject(Location).path()).toBe('/collection');
  });

  it('SYNC-159 (c) / AC 80: /collection?add=1 on an empty collection opens the dialog too (the page can import)', async () => {
    const h = await setup('/collection?add=1', { sample: null });
    await vi.waitFor(async () => {
      await settle(h);
      expect(dialogTitle()).toBe('Add to your collection');
    });
  });

  it('SYNC-159 (c) / AC 80: /collection?add=2 opens nothing and the address is left alone', async () => {
    const h = await setup('/collection?add=2');
    await settle(h, 20);
    expect(document.querySelector('mat-dialog-container')).toBeNull();
    expect(TestBed.inject(Location).path()).toContain('add=2');
  });

  it('SYNC-159 (c) / AC 80: card data unavailable with ?add=1: no dialog, and the parameter is removed', async () => {
    const h = await setup('/collection?add=1', { catalogError: true });
    await settle(h, 20);
    expect(document.querySelector('mat-dialog-container')).toBeNull();
    expect(TestBed.inject(Location).path()).not.toContain('add=');
  });
});

describe('Add to your collection: commit landing and Undo (SPEC-003 IMP-072…075, SPEC-007 COLL-091; H-158)', () => {
  const catalog = makeCatalog(['Lightning Rush', 'Gust', 'Kennen, Heart of the Tempest']);

  afterEach(() => {
    TestBed.inject(MatSnackBar).dismiss();
    document.querySelectorAll('.cdk-overlay-container').forEach((n) => (n.innerHTML = ''));
  });

  const dlg = () => document.querySelector('mat-dialog-container');
  const snackText = () =>
    document
      .querySelector('mat-snack-bar-container [matsnackbarlabel], mat-snack-bar-container .mat-mdc-simple-snack-bar > :first-child')
      ?.textContent?.trim() ?? null;
  const snackAction = () => document.querySelector<HTMLButtonElement>('mat-snack-bar-container button');
  function button(root: Element | null, label: string): HTMLButtonElement {
    const b = Array.from(root?.querySelectorAll<HTMLButtonElement>('button') ?? []).find(
      (x) => x.textContent?.trim() === label,
    );
    if (!b) throw new Error(`no "${label}" button`);
    return b;
  }

  /** Opens the dialog with `opener`, types the list, Continue, then the commit button. */
  async function importList(h: RouterTestingHarness, opener: HTMLElement, list: string, replace = false) {
    opener.click();
    await settle(h);
    const box = dlg()!.querySelector('textarea')!;
    box.value = list;
    box.dispatchEvent(new InputEvent('input'));
    await settle(h);
    button(dlg(), 'Continue').click();
    await settle(h);
    if (replace) {
      dlg()!.querySelectorAll<HTMLInputElement>('input[type="radio"]')[1].click();
      await settle(h);
    }
    button(dlg(), replace ? 'Replace collection' : 'Add cards').click();
    await settle(h);
  }

  const navigations = () => {
    const starts: string[] = [];
    TestBed.inject(Router).events.subscribe((e) => e instanceof NavigationStart && starts.push(e.url));
    return starts;
  };

  it('AC 43 / SPEC-007 AC 27 / IMP-072 / COLL-091: Add over an empty collection stays on /collection, the grid shows the cards, the notice reads "Added 5 copies of 2 cards." with Undo; Undo brings the empty state back', async () => {
    const h = await setup('/collection', { sample: { catalog } });
    const starts = navigations();
    await importList(h, el(h).querySelector<HTMLElement>('app-empty-state button')!, '3 Lightning Rush\n2 Gust');
    await vi.waitFor(async () => {
      await settle(h);
      expect(dlg()).toBeNull();
      expect(text(h, '#count-line')).toBe('5 copies of 2 cards');
    });
    expect(TestBed.inject(Location).path()).toBe('/collection');
    expect(starts).toEqual([]);
    expect(snackText()).toBe('Added 5 copies of 2 cards.');
    expect(snackAction()?.textContent?.trim()).toBe('Undo');
    expect(el(h).querySelector('.banner')).toBeNull(); // no other banner
    expect(el(h).querySelectorAll('app-collection-tile').length).toBe(2);
    // IMP-072: focus goes to the floating button (the empty state's button was replaced by the grid)
    await vi.waitFor(() => expect(document.activeElement?.closest('app-page-fab')).not.toBeNull());

    snackAction()!.click();
    await vi.waitFor(async () => {
      await settle(h);
      expect(text(h, 'app-empty-state h2')).toBe('Your collection is empty');
    });
    expect(snackText()).toBe('Import undone.');
  });

  it('AC 43 / IMP-072: a failed write keeps the dialog open with the error, no notice, the address unchanged', async () => {
    const h = await setup('/collection', { sample: { catalog } });
    const set = backend.set.bind(backend);
    vi.spyOn(backend, 'set').mockImplementation((k, v) => {
      if (k === STORAGE_KEYS.collection) throw new StorageFullError();
      set(k, v);
    });
    await importList(h, el(h).querySelector<HTMLElement>('app-empty-state button')!, '1 Gust');
    await settle(h);
    expect(dlg()).not.toBeNull();
    expect(dlg()!.querySelector('.commit-error')?.textContent).toContain("this device's storage is full");
    expect(document.querySelector('mat-snack-bar-container')).toBeNull();
    expect(TestBed.inject(Location).path()).toBe('/collection');
    vi.restoreAllMocks();
  });

  it('AC 44 / IMP-050: Replace cancelled at its confirmation stays in the dialog, writes nothing, no notice', async () => {
    const h = await setup('/collection', { sample: { catalog } });
    await importList(h, el(h).querySelector<HTMLElement>('app-empty-state button')!, '3 Lightning Rush\n2 Gust');
    await vi.waitFor(async () => {
      await settle(h);
      expect(el(h).querySelector('app-page-fab')).not.toBeNull();
    });
    TestBed.inject(MatSnackBar).dismiss();
    await settle(h);
    const before = backend.get(STORAGE_KEYS.collection);
    await importList(h, el(h).querySelector<HTMLElement>('app-page-fab button')!, '1 Kennen, Heart of the Tempest', true);
    const confirm = document.querySelectorAll('mat-dialog-container')[1];
    expect(confirm?.textContent).toContain('2 names removed (Gust, Lightning Rush).');
    button(confirm, 'Cancel').click();
    await settle(h);
    expect(document.querySelectorAll('mat-dialog-container')).toHaveLength(1);
    expect(backend.get(STORAGE_KEYS.collection)).toBe(before);
    await settle(h, 20);
    expect(document.querySelector('mat-snack-bar-container')).toBeNull();
  });

  it('AC 45 / IMP-074: the notice survives opening Decks, and Undo works from there', async () => {
    const h = await setup('/collection', { sample: { catalog } });
    await importList(h, el(h).querySelector<HTMLElement>('app-empty-state button')!, '1 Gust');
    await vi.waitFor(async () => {
      await settle(h);
      expect(snackText()).toBe('Added 1 copy of 1 card.');
    });
    await h.navigateByUrl('/decks');
    await settle(h);
    expect(TestBed.inject(Location).path()).toBe('/decks');
    expect(snackText()).toBe('Added 1 copy of 1 card.');
    snackAction()!.click();
    await vi.waitFor(async () => {
      await settle(h);
      expect(snackText()).toBe('Import undone.');
    });
    expect(Object.keys((await stores.collection.load())!.cards)).toEqual([]);
    expect(TestBed.inject(Location).path()).toBe('/decks');
  });
});
