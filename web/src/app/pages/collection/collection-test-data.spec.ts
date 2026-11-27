/**
 * SPEC-013 Test Data on the Collection page (H-205): the Load test data button and dialog, the banner with Change set
 * and Remove test data, the Add-while-test-data notice and the flag. Real `CardData` (the generated catalog, TEST-024)
 * with `fetch` refusing, so any `/api` call would show "Card data couldn't load".
 */
import { provideTestStores } from '../../core/storage/testing/test-stores';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { BrowserStores, createBrowserStores } from '../../core/storage/browser-stores';
import { MemoryBackend } from '../../core/storage/kv-backend';
import { SignInGate } from '../../core/sync/sign-in-gate';
import { provideOpenGate } from '../../core/sync/testing/open-gate';
import { TEST_DATA_ENABLED } from '../../core/test-data/test-data-flag';
import { loadTestData } from '../../core/test-data/test-data-ops';
import { TEST_DECK_IDS, TEST_TEXT } from '../../shared/collection/test-data';
import type { UserDeck } from '../../shared/storage/records';

let stores: BrowserStores;
let fetchSpy: ReturnType<typeof vi.spyOn>;

const OWN_DECK: UserDeck = {
  schemaVersion: 1,
  id: 'aaaaaaaa-0000-4000-8000-000000000001',
  name: 'My Deck',
  format: 'standard',
  source: { kind: 'user', text: null, url: null },
  sourceFormat: 'manual',
  notes: '',
  createdAt: '2026-11-25T10:00:00.000Z',
  updatedAt: '2026-11-25T10:00:00.000Z',
  catalogVersion: '0.2',
  legend: null,
  champion: null,
  main: [{ cardKey: 'gust', name: 'Gust', qty: 1 }],
  sideboard: [],
  runes: [],
  battlefields: [],
};

interface Opts {
  preload?: 'small' | 'large';
  realCards?: boolean;
  ownDeck?: boolean;
  flag?: boolean;
  signedOut?: boolean;
}

async function setup(o: Opts = {}) {
  stores = createBrowserStores(new MemoryBackend(), {
    now: () => Date.now(),
    changed: () => undefined,
    readOnly: () => false,
  });
  fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('no /api in this test'));
  if (o.ownDeck) {
    await stores.decks.create(OWN_DECK);
    await stores.locks.save({ schemaVersion: 2, updatedAt: '', locks: [{ deckId: OWN_DECK.id, cardKey: 'gust', lockedAt: OWN_DECK.createdAt }] });
  }
  if (o.realCards)
    await stores.collection.save({
      schemaVersion: 1,
      updatedAt: '2026-11-25T10:00:00.000Z',
      catalogVersion: '0.2+2026-11-20T18:04:00Z',
      cards: { 'hextech ray': { quantity: 2, byPrinting: {} } },
    });
  if (o.preload) expect(await loadTestData(stores, o.preload, () => Date.now())).toBe('ok');
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes, withComponentInputBinding()),
      { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
      provideTestStores(stores),
      { provide: TEST_DATA_ENABLED, useValue: o.flag ?? true },
      // Signed out: the real gate, decided from an empty sync log (SYNC-009).
      ...(o.signedOut ? [] : [provideOpenGate()]),
    ],
  });
  if (o.signedOut) expect(TestBed.inject(SignInGate).state()).toBe('signed-out');
  const harness = await RouterTestingHarness.create('/collection');
  await settle(harness);
  return harness;
}

async function settle(h: RouterTestingHarness) {
  for (let i = 0; i < 4; i++) {
    await h.fixture.whenStable();
    h.fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 0));
  }
}

async function until(h: RouterTestingHarness, check: () => unknown) {
  await vi.waitFor(
    async () => {
      h.fixture.detectChanges();
      if (!check()) throw new Error('not yet');
    },
    { timeout: 5000, interval: 20 },
  );
  await settle(h);
}

const page = (h: RouterTestingHarness) => h.routeNativeElement as HTMLElement;
const clean = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();
const buttonsIn = (el: ParentNode | null) =>
  Array.from(el?.querySelectorAll('button') ?? []).map((b) => clean(b.textContent));
const findButton = (el: ParentNode | null, label: string) =>
  Array.from(el?.querySelectorAll<HTMLButtonElement>('button') ?? []).find((b) => clean(b.textContent) === label) ?? null;
const dialogs = () => Array.from(document.querySelectorAll('mat-dialog-container'));
const topDialog = () => dialogs().at(-1) ?? null;
const snack = () => clean(document.querySelector('mat-snack-bar-container')?.textContent);
const banner = (h: RouterTestingHarness) => page(h).querySelector('.banner--test');

async function pick(h: RouterTestingHarness, set: 'small' | 'large') {
  const radio = topDialog()!.querySelector<HTMLInputElement>(`input[type="radio"][value="${set}"]`)!;
  radio.click();
  await settle(h);
}

describe('Collection page: SPEC-013 test data (H-205)', () => {
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((n) => (n.innerHTML = ''));
    vi.restoreAllMocks();
  });

  it('TEST-001 / AC 1 signed out: the sign-in panel; Load test data only as the H-679 guest option inside it', async () => {
    const h = await setup({ signedOut: true });
    const panel = page(h).querySelector('app-sign-in-panel');
    expect(panel).not.toBeNull();
    expect(buttonsIn(panel)).toEqual(['Sign in', TEST_TEXT.loadButton]);
    expect(page(h).querySelector('app-collection-page')).toBeNull();
  });

  it('TEST-001 signed out with the flag off: the sign-in panel and no Load test data', async () => {
    const h = await setup({ signedOut: true, flag: false });
    expect(page(h).textContent).not.toContain(TEST_TEXT.loadButton);
  });

  it('TEST-002 / TEST-003 / AC 2 empty collection: Add and a Load test data text button; the dialog has Small and Large, none chosen, Load disabled until one is', async () => {
    const h = await setup();
    const empty = page(h).querySelector('app-empty-state')!;
    expect(buttonsIn(empty)).toEqual(['Add to your collection', TEST_TEXT.loadButton]);
    expect(banner(h)).toBeNull();
    findButton(empty, TEST_TEXT.loadButton)!.click();
    await settle(h);
    const d = topDialog()!;
    expect(clean(d.querySelector('h2')?.textContent)).toBe(TEST_TEXT.dialogTitle);
    expect(clean(d.textContent)).toContain(TEST_TEXT.dialogText);
    const radios = Array.from(d.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
    expect(radios.map((r) => [r.value, r.checked])).toEqual([
      ['small', false],
      ['large', false],
    ]);
    expect(clean(d.textContent)).toContain('Small: 150 cards, 3 decks');
    expect(clean(d.textContent)).toContain('Large: 5,000 cards, 3 decks (a long list, to test scrolling)');
    expect(buttonsIn(d)).toEqual(['Cancel', 'Load']);
    expect(findButton(d, 'Load')!.getAttribute('aria-disabled')).toBe('true');
    await pick(h, 'large');
    expect(findButton(d, 'Load')!.getAttribute('aria-disabled')).not.toBe('true');
  });

  it('TEST-003 Cancel and Escape write nothing; focus goes back to Load test data', async () => {
    const h = await setup();
    const load = findButton(page(h), TEST_TEXT.loadButton)!;
    load.focus();
    load.click();
    await settle(h);
    await pick(h, 'small');
    findButton(topDialog(), 'Cancel')!.click();
    await until(h, () => dialogs().length === 0);
    expect(await stores.collection.load()).toBeNull();
    expect(document.activeElement).toBe(findButton(page(h), TEST_TEXT.loadButton));
  });

  it('TEST-003 Escape closes the dialog with nothing written', async () => {
    const h = await setup();
    findButton(page(h), TEST_TEXT.loadButton)!.click();
    await settle(h);
    await pick(h, 'small');
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
    await until(h, () => dialogs().length === 0);
    expect(await stores.collection.load()).toBeNull();
    expect(await stores.decks.list()).toEqual([]);
  });

  it('TEST-010 / TEST-020 / TEST-023 / AC 3 Large: the list shows 1,667 cards, the banner with Remove test data, and the notice Test data loaded.', async () => {
    const h = await setup();
    findButton(page(h), TEST_TEXT.loadButton)!.click();
    await settle(h);
    await pick(h, 'large');
    findButton(topDialog(), 'Load')!.click();
    await until(h, () => dialogs().length === 0 && page(h).querySelector('#count-line'));
    expect(clean(page(h).querySelector('#count-line')?.textContent)).toMatch(/^[\d,]+ copies of 1,667 cards$/);
    const b = banner(h)!;
    expect(b.getAttribute('role')).toBe('status');
    expect(clean(b.querySelector('p')?.textContent)).toBe(TEST_TEXT.banner);
    expect(buttonsIn(b)).toEqual([TEST_TEXT.changeSet, TEST_TEXT.removeButton]);
    expect(snack()).toContain(TEST_TEXT.loaded);
    expect((await stores.collection.load())?.catalogVersion).toBe('test-data-5000');
    expect(page(h).querySelector('app-collection-tile')).not.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled(); // TEST-024: no /api for the generated catalog
  });

  it('TEST-010 the banner stays when a search has no results (not dismissible)', async () => {
    const h = await setup({ preload: 'small' });
    const input = page(h).querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = 'zzzz nothing';
    input.dispatchEvent(new Event('input'));
    await new Promise((r) => setTimeout(r, 200));
    await settle(h);
    expect(page(h).textContent).toContain('No cards match');
    expect(banner(h)).not.toBeNull();
    expect(banner(h)!.querySelector('[aria-label="Dismiss"]')).toBeNull();
  });

  it('TEST-022 / AC 7 Change set: Large over Small asks to replace; Cancel writes nothing; Replace loads Large and keeps the own deck', async () => {
    const h = await setup({ preload: 'small', ownDeck: true });
    findButton(banner(h), TEST_TEXT.changeSet)!.click();
    await settle(h);
    await pick(h, 'large');
    findButton(topDialog(), 'Load')!.click();
    await until(h, () => dialogs().length === 2);
    expect(clean(topDialog()!.textContent)).toContain('Replace your test data with the Large set? Your own decks are kept.');
    expect(buttonsIn(topDialog())).toEqual(['Cancel', 'Replace']);
    findButton(topDialog(), 'Cancel')!.click();
    await until(h, () => dialogs().length === 1);
    expect((await stores.collection.load())?.catalogVersion).toBe('test-data-150');
    findButton(topDialog(), 'Load')!.click();
    await until(h, () => dialogs().length === 2);
    findButton(topDialog(), 'Replace')!.click();
    await until(h, () => dialogs().length === 0);
    expect((await stores.collection.load())?.catalogVersion).toBe('test-data-5000');
    const names = (await stores.decks.list()).map((d) => d.name).sort();
    expect(names).toEqual(['Generated Locked A', 'Generated Locked B', 'Generated Open', 'My Deck']);
    expect(clean(page(h).querySelector('#count-line')?.textContent)).toMatch(/of 1,667 cards$/);
  });

  it('TEST-002 / TEST-012 / AC 8 real cards: no Load test data and no banner', async () => {
    const h = await setup({ realCards: true });
    await until(h, () => page(h).querySelector('.banner, #count-line'));
    expect(page(h).textContent).not.toContain(TEST_TEXT.loadButton);
    expect(banner(h)).toBeNull();
  });

  it('TEST-012 / AC 8 real cards that arrive while the dialog is open: Load writes nothing and says why', async () => {
    const h = await setup();
    findButton(page(h), TEST_TEXT.loadButton)!.click();
    await settle(h);
    await pick(h, 'small');
    const real = {
      schemaVersion: 1 as const,
      updatedAt: '2026-11-25T10:00:00.000Z',
      catalogVersion: '0.2',
      cards: { 'hextech ray': { quantity: 1, byPrinting: {} } },
    };
    await stores.raw.collection.save(real); // pulled from another device
    findButton(topDialog(), 'Load')!.click();
    await until(h, () => clean(topDialog()?.textContent).includes(TEST_TEXT.realCards));
    expect(await stores.collection.load()).toEqual(real);
    expect(await stores.decks.list()).toEqual([]);
  });

  it('TEST-004 offline: "You\'re offline." above the buttons and Load aria-disabled', async () => {
    const h = await setup();
    findButton(page(h), TEST_TEXT.loadButton)!.click();
    await settle(h);
    await pick(h, 'small');
    dispatchEvent(new Event('offline'));
    await settle(h);
    expect(clean(topDialog()!.textContent)).toContain(TEST_TEXT.offline);
    expect(findButton(topDialog(), 'Load')!.getAttribute('aria-disabled')).toBe('true');
    findButton(topDialog(), 'Load')!.click();
    await settle(h);
    expect(await stores.collection.load()).toBeNull();
    dispatchEvent(new Event('online'));
    await settle(h);
    expect(findButton(topDialog(), 'Load')!.getAttribute('aria-disabled')).not.toBe('true');
  });

  it('TEST-023 a failed write keeps the dialog open with the error line', async () => {
    const h = await setup();
    vi.spyOn(stores.collection, 'save').mockRejectedValue(new Error('STORAGE_FULL'));
    findButton(page(h), TEST_TEXT.loadButton)!.click();
    await settle(h);
    await pick(h, 'small');
    findButton(topDialog(), 'Load')!.click();
    await until(h, () => clean(topDialog()?.textContent).includes(TEST_TEXT.loadFailed));
    expect(dialogs()).toHaveLength(1);
  });

  it('TEST-050 / TEST-052 / AC 9 / AC 10a Remove: confirm, then the empty state with Load test data, Test data removed., own deck and lock intact', async () => {
    const h = await setup({ preload: 'small', ownDeck: true });
    findButton(banner(h), TEST_TEXT.removeButton)!.click();
    await settle(h);
    const d = topDialog()!;
    expect(clean(d.querySelector('h2')?.textContent)).toBe(TEST_TEXT.removeTitle);
    expect(clean(d.textContent)).toContain(TEST_TEXT.removeText);
    expect(buttonsIn(d)).toEqual(['Cancel', 'Remove']);
    expect(findButton(d, 'Remove')!.classList).toContain('danger');
    findButton(d, 'Remove')!.click();
    await until(h, () => page(h).querySelector('app-empty-state'));
    expect(banner(h)).toBeNull();
    expect(buttonsIn(page(h).querySelector('app-empty-state'))).toEqual(['Add to your collection', TEST_TEXT.loadButton]);
    expect(snack()).toContain(TEST_TEXT.removed);
    const c = await stores.collection.load();
    expect(c?.catalogVersion).toBe('');
    expect(c?.cards).toEqual({});
    expect((await stores.decks.list()).map((x) => x.id)).toEqual([OWN_DECK.id]);
    expect((await stores.locks.load())?.locks.map((l) => l.deckId)).toEqual([OWN_DECK.id]);
    for (const id of TEST_DECK_IDS) expect(await stores.decks.get(id)).toBeNull();
  });

  it('TEST-050 Cancel in the Remove confirmation changes nothing', async () => {
    const h = await setup({ preload: 'small' });
    findButton(banner(h), TEST_TEXT.removeButton)!.click();
    await settle(h);
    findButton(topDialog(), 'Cancel')!.click();
    await until(h, () => dialogs().length === 0);
    expect((await stores.collection.load())?.catalogVersion).toBe('test-data-150');
    expect(banner(h)).not.toBeNull();
  });

  it('TEST-032 / AC 11 Add to your collection with test data asks to remove it first; Cancel keeps it; Remove test data removes it, then opens the import', async () => {
    const h = await setup({ preload: 'small' });
    const fab = () => page(h).querySelector<HTMLButtonElement>('app-page-fab button')!;
    fab().click();
    await settle(h);
    expect(clean(topDialog()!.textContent)).toContain(TEST_TEXT.addBlocked);
    expect(buttonsIn(topDialog())).toEqual(['Cancel', TEST_TEXT.removeButton]);
    findButton(topDialog(), 'Cancel')!.click();
    await until(h, () => dialogs().length === 0);
    expect((await stores.collection.load())?.catalogVersion).toBe('test-data-150');
    fab().click();
    await settle(h);
    findButton(topDialog(), TEST_TEXT.removeButton)!.click();
    await until(h, () => clean(topDialog()?.querySelector('h2')?.textContent) === 'Add to your collection');
    expect((await stores.collection.load())?.catalogVersion).toBe('');
    expect(await stores.decks.list()).toEqual([]);
  });

  it('TEST-040 / TEST-041 / AC 13 flag off: no Load test data on an empty collection', async () => {
    const h = await setup({ flag: false });
    expect(buttonsIn(page(h).querySelector('app-empty-state'))).toEqual(['Add to your collection']);
  });

  it('TEST-041 / AC 13 flag off with test data still present: the banner and Remove test data stay, no Change set', async () => {
    const h = await setup({ flag: false, preload: 'small' });
    expect(buttonsIn(banner(h))).toEqual([TEST_TEXT.removeButton]);
  });
});
