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
import { SIGN_IN_ENABLED } from '../../core/sync/sign-in-flag';
import { generateLargeSample, sampleDeck } from '../../shared/collection/sample-data';
import type { SampleData } from '../../shared/collection/sample-data';

interface Setup {
  sample?: Partial<SampleData> | null;
  catalogError?: boolean;
  corruptCollection?: boolean;
  corruptLocks?: boolean;
  decksError?: boolean;
  bans?: BanListFile | null;
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
    reload: async (): Promise<CatalogResult> => ({ status: 'ok', catalog }),
    loadBans: async () => s.bans ?? null,
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes, withComponentInputBinding()),
      { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
      { provide: AppStores, useValue: { stores } },
      { provide: CardData, useValue: cardData },
      // Local-only mode (SPEC-010 SYNC-008): no sign-in gate. The gate is covered in pages/gated-pages.spec.ts.
      { provide: SIGN_IN_ENABLED, useValue: false },
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

  it('COLL-001 S1: an empty collection shows the empty state and no toolbar', async () => {
    const h = await setup('/collection', { sample: null });
    expect(text(h, 'app-empty-state h2')).toBe('Your collection is empty');
    expect(text(h, '.page-lede')).toBe('Every card you own.');
    expect(el(h).querySelector('a.button')?.getAttribute('href')).toBe('/import?type=collection');
    expect(el(h).querySelector('.toolbar')).toBeNull();
  });

  it('COLL-071 SYNC-033 S8: an unreadable collection shows the alert banner with Reload', async () => {
    const h = await setup('/collection', { corruptCollection: true });
    const banner = el(h).querySelector('[role="alert"]');
    expect(banner?.textContent).toContain("Your collection couldn't be read.");
    expect(banner?.textContent).toContain('Reload');
    expect(backend.get(STORAGE_KEYS.collection)).toBe('{not json'); // never overwritten
  });

  it('S10 (pending H-087): card data that fails to load shows the banner with Try again, no grid', async () => {
    const h = await setup('/collection', { catalogError: true });
    expect(el(h).querySelector('[role="alert"]')?.textContent).toContain(
      "Card data couldn't load.",
    );
    expect(el(h).querySelector('app-collection-tile')).toBeNull();
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
});
