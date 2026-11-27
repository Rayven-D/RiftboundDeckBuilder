/**
 * H-679 (RJ, 2026-11-26): signed-out ("guest") test data. The SPEC-013 sets go into memory-only stores: nothing reaches
 * `localStorage`, the sync engine's hooks never run, a sign-in or Remove drops it, imports stay sign-in only. Also the
 * catalog regression: a cold start whose sync pull brings the test collection shows cards without a reload.
 */
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { CardData } from '../../core/cards/card-data';
import { ACCOUNT_STORES, AppStores } from '../../core/storage/app-stores';
import { BrowserStores, createBrowserStores } from '../../core/storage/browser-stores';
import { KEY_PREFIX, LocalStorageBackend, MemoryBackend } from '../../core/storage/kv-backend';
import { SignInGate } from '../../core/sync/sign-in-gate';
import { provideOpenGate } from '../../core/sync/testing/open-gate';
import { GuestTestData } from '../../core/test-data/guest-test-data';
import { TEST_DATA_ENABLED } from '../../core/test-data/test-data-flag';
import { generateLargeSample } from '../../shared/collection/sample-data';
import { TEST_DECK_IDS, TEST_TEXT, planTestLoad } from '../../shared/collection/test-data';
import { DeckLocks } from '../../shared/deck/deck-locks.service';

let account: BrowserStores;
let hooks: { changed: ReturnType<typeof vi.fn<() => void>>; major: ReturnType<typeof vi.fn<() => void>> };

const riftKeys = () => Object.keys(localStorage).filter((k) => k.startsWith(KEY_PREFIX));

/** Signed out over the real `localStorage` (so the isolation is proven against it), or signed in over memory. */
async function setup(
  o: { url?: string; signedIn?: boolean; flag?: boolean; before?: (s: BrowserStores) => Promise<unknown> } = {},
) {
  localStorage.clear();
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('no /api in this test'));
  account = createBrowserStores(o.signedIn ? new MemoryBackend() : new LocalStorageBackend(), {
    now: () => Date.now(),
    changed: () => undefined,
    readOnly: () => false,
  });
  await o.before?.(account);
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes, withComponentInputBinding()),
      { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
      { provide: ACCOUNT_STORES, useValue: account },
      { provide: TEST_DATA_ENABLED, useValue: o.flag ?? true },
      ...(o.signedIn ? [provideOpenGate()] : []),
    ],
  });
  hooks = { changed: vi.fn<() => void>(), major: vi.fn<() => void>() };
  TestBed.inject(AppStores).connect(hooks.changed, () => false, hooks.major);
  const h = await RouterTestingHarness.create(o.url ?? '/collection');
  await settle(h);
  return h;
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
const findButton = (el: ParentNode | null, label: string) =>
  Array.from(el?.querySelectorAll<HTMLButtonElement>('button') ?? []).find((b) => clean(b.textContent) === label) ?? null;
const dialogs = () => Array.from(document.querySelectorAll('mat-dialog-container'));
const topDialog = () => dialogs().at(-1) ?? null;

async function guestLoad(h: RouterTestingHarness, set: 'small' | 'large' = 'small') {
  findButton(page(h).querySelector('app-sign-in-panel'), TEST_TEXT.loadButton)!.click();
  await settle(h);
  topDialog()!.querySelector<HTMLInputElement>(`input[type="radio"][value="${set}"]`)!.click();
  await settle(h);
  findButton(topDialog(), 'Load')!.click();
  await until(h, () => dialogs().length === 0 && page(h).querySelector('app-collection-tile'));
}

describe('H-679 guest test data (signed out, memory only)', () => {
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((n) => (n.innerHTML = ''));
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('H-679 signed out: Collection offers Load test data under Sign in; the dialog says nothing is saved', async () => {
    const h = await setup();
    expect(TestBed.inject(SignInGate).state()).toBe('signed-out');
    const panel = page(h).querySelector('app-sign-in-panel')!;
    expect(findButton(panel, 'Sign in')).not.toBeNull();
    findButton(panel, TEST_TEXT.loadButton)!.click();
    await settle(h);
    expect(clean(topDialog()!.textContent)).toContain(TEST_TEXT.guestDialogText);
    expect(clean(topDialog()!.textContent)).not.toContain(TEST_TEXT.dialogText);
  });

  it('H-679 the flag off hides the guest Load test data', async () => {
    const h = await setup({ flag: false });
    expect(findButton(page(h), TEST_TEXT.loadButton)).toBeNull();
  });

  it('H-679 Small loads into memory: cards, the guest banner, no import; localStorage and the sync hooks are untouched', async () => {
    const h = await setup();
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    await guestLoad(h);
    expect(clean(page(h).querySelector('#count-line')?.textContent)).toMatch(/copies of 50 cards$/);
    const b = page(h).querySelector('.banner--test')!;
    expect(clean(b.querySelector('p')?.textContent)).toBe(TEST_TEXT.guestBanner);
    expect(findButton(b, TEST_TEXT.removeButton)).not.toBeNull();
    expect(page(h).querySelector('app-page-fab')).toBeNull(); // imports stay sign-in only
    expect(TestBed.inject(SignInGate).open()).toBe(false); // still signed out
    expect(riftKeys()).toEqual([]);
    expect(setItem.mock.calls.filter(([k]) => k.startsWith(KEY_PREFIX))).toEqual([]);
    expect(hooks.changed).not.toHaveBeenCalled();
    expect(hooks.major).not.toHaveBeenCalled();
    expect(await account.collection.load()).toBeNull();
    expect(await account.decks.list()).toEqual([]);
  });

  it('H-679 a lock and an unlock with guest data write nothing to localStorage and start no sync', async () => {
    const h = await setup();
    await guestLoad(h);
    const locks = TestBed.inject(DeckLocks);
    const app = TestBed.inject(AppStores);
    const open = (await app.stores.decks.get(TEST_DECK_IDS[2]))!;
    await locks.lockDeck(open);
    expect((await locks.load())!.some((l) => l.deckId === open.id)).toBe(true);
    await locks.unlockDeck(open.id);
    expect((await locks.load())!.some((l) => l.deckId === open.id)).toBe(false);
    expect(riftKeys()).toEqual([]);
    expect(hooks.changed).not.toHaveBeenCalled();
    expect(hooks.major).not.toHaveBeenCalled();
    expect(await account.locks.load()).toBeNull();
  });

  it('H-679 Decks and deck detail show the guest decks with the banner and no Import deck', async () => {
    const h = await setup({ url: '/decks' });
    expect(findButton(page(h).querySelector('app-sign-in-panel'), TEST_TEXT.loadButton)).not.toBeNull();
    expect(await TestBed.inject(GuestTestData).load('small')).toBe('ok');
    await until(h, () => page(h).querySelectorAll('app-deck-tile').length === 3);
    expect(clean(page(h).querySelector('.banner--test p')?.textContent)).toBe(TEST_TEXT.guestBanner);
    expect(page(h).querySelector('app-page-fab')).toBeNull();
    expect(clean(page(h).textContent)).not.toContain('Card data not loaded');
    await h.navigateByUrl(`/decks/${TEST_DECK_IDS[0]}`);
    await until(h, () => page(h).querySelector('h1.deck-name'));
    expect(clean(page(h).textContent)).toContain(TEST_TEXT.guestBanner);
    expect(clean(page(h).textContent)).not.toContain('Card data not loaded');
    expect(riftKeys()).toEqual([]);
  });

  it('H-679 Remove test data drops the guest data: the signed-out panel with Load test data comes back', async () => {
    const h = await setup();
    await guestLoad(h);
    findButton(page(h).querySelector('.banner--test'), TEST_TEXT.removeButton)!.click();
    await settle(h);
    expect(clean(topDialog()!.textContent)).toContain(TEST_TEXT.guestRemoveText);
    findButton(topDialog(), 'Remove')!.click();
    await until(h, () => page(h).querySelector('app-sign-in-panel'));
    expect(TestBed.inject(AppStores).guest()).toBe(false);
    expect(findButton(page(h), TEST_TEXT.loadButton)).not.toBeNull();
    expect(riftKeys()).toEqual([]);
  });

  it('H-679 a sign-in discards the guest data first: the account cache gets none of it', async () => {
    const h = await setup();
    await guestLoad(h);
    const app = TestBed.inject(AppStores);
    // What SyncService does on the first non-signed-out status (the first sync starting).
    app.leaveGuest();
    TestBed.inject(SignInGate).set('first-sync');
    await until(h, () => page(h).querySelector('app-sign-in-panel'));
    expect(app.guest()).toBe(false);
    expect(app.stores.collection).toBe(account.collection);
    expect(await account.collection.load()).toBeNull();
    expect(await account.decks.list()).toEqual([]);
    expect(findButton(page(h), TEST_TEXT.loadButton)).toBeNull(); // not offered while signing in
    expect(riftKeys()).toEqual([]);
  });

  it('H-679 TEST-064 (b) Change set as a guest: the short question, then Large replaces Small in memory', async () => {
    const h = await setup();
    await guestLoad(h);
    findButton(page(h).querySelector('.banner--test'), TEST_TEXT.changeSet)!.click();
    await settle(h);
    topDialog()!.querySelector<HTMLInputElement>('input[type="radio"][value="large"]')!.click();
    await settle(h);
    findButton(topDialog(), 'Load')!.click();
    await until(h, () => clean(topDialog()?.textContent).includes(TEST_TEXT.guestReplaceQuestion('large')));
    expect(clean(topDialog()!.textContent)).not.toContain('Your own decks are kept');
    findButton(topDialog(), 'Replace')!.click();
    await until(
      h,
      () => dialogs().length === 0 && clean(page(h).querySelector('#count-line')?.textContent).endsWith('of 1,667 cards'),
    );
    expect(riftKeys()).toEqual([]);
  });

  it('H-679 TEST-062 ?add=1 and ?import=1 open no import with guest data', async () => {
    const h = await setup();
    await guestLoad(h);
    await h.navigateByUrl('/collection?add=1');
    await settle(h);
    expect(dialogs()).toHaveLength(0);
    await h.navigateByUrl('/decks?import=1');
    await until(h, () => page(h).querySelectorAll('app-deck-tile').length === 3);
    expect(dialogs()).toHaveLength(0);
    expect(findButton(page(h), 'Import deck')).toBeNull();
  });

  it('H-679 TEST-060 a signed-out deck URL with no guest data shows the panel with Load test data', async () => {
    const h = await setup({ url: `/decks/${TEST_DECK_IDS[0]}` });
    expect(findButton(page(h).querySelector('app-sign-in-panel'), TEST_TEXT.loadButton)).not.toBeNull();
  });

  it('H-679 the guest load is refused once a session is expected (not signed out)', async () => {
    await setup({ signedIn: true });
    expect(await TestBed.inject(GuestTestData).load('small')).toBe('error');
    expect(TestBed.inject(AppStores).guest()).toBe(false);
  });
});

describe('H-679 catalog follows the test marker (cold start, first sync pull)', () => {
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((n) => (n.innerHTML = ''));
    vi.restoreAllMocks();
  });

  /** What the sync engine's merge writes (raw, exempt from stamping), then the status it reports. */
  async function pullTestSet() {
    const plan = planTestLoad(generateLargeSample(150), 150, null, '2026-11-26T12:00:00.000Z');
    for (const d of plan.decks) await account.raw.decks.put(d);
    await account.raw.collection.save(plan.collection);
    await account.raw.locks.save(plan.locks);
    TestBed.inject(AppStores).externalWrite();
    return plan;
  }

  it('H-679 Collection: empty at a cold start, then the pull brings the test collection: cards show without a reload', async () => {
    const h = await setup({ signedIn: true });
    expect(page(h).querySelector('app-empty-state')).not.toBeNull();
    await pullTestSet();
    await until(h, () => page(h).querySelector('app-collection-tile'));
    expect(clean(page(h).textContent)).not.toContain("Card data couldn't load");
    expect(page(h).querySelector('.banner--test')).not.toBeNull();
  });

  it('H-679 Decks: read mid-pull (decks before the collection) shows Card data not loaded, then clears on its own', async () => {
    const plan = planTestLoad(generateLargeSample(150), 150, null, '2026-11-26T12:00:00.000Z');
    const h = await setup({
      signedIn: true,
      url: '/decks',
      before: async (s) => {
        for (const d of plan.decks) await s.raw.decks.put(d);
      },
    });
    await until(h, () => clean(page(h).textContent).includes('Card data not loaded'));
    await account.raw.collection.save(plan.collection);
    TestBed.inject(AppStores).externalWrite();
    await until(h, () => !clean(page(h).textContent).includes('Card data not loaded'));
    expect(page(h).querySelectorAll('app-deck-tile').length).toBe(3);
  });

  it('H-679 a failed /api catalog is not kept once the source moves to test data and back', async () => {
    await setup({ signedIn: true });
    const data = TestBed.inject(CardData);
    const fetchSpy = vi.mocked(globalThis.fetch);
    expect((await data.loadCatalog()).status).toBe('error');
    const calls = fetchSpy.mock.calls.length;
    expect((await data.loadCatalog()).status).toBe('error');
    expect(fetchSpy.mock.calls.length).toBe(calls); // cached while the source stays /api
    const changed = vi.fn();
    data.sourceChanged.subscribe(changed);
    const plan = planTestLoad(generateLargeSample(150), 150, null, '2026-11-26T12:00:00.000Z');
    await account.raw.collection.save(plan.collection);
    await data.checkSource();
    expect(changed).toHaveBeenCalledTimes(1);
    expect((await data.loadCatalog()).status).toBe('ok');
    await account.raw.collection.save({ ...plan.collection, catalogVersion: '', cards: {} });
    await data.checkSource();
    expect(changed).toHaveBeenCalledTimes(2);
    await data.loadCatalog();
    expect(fetchSpy.mock.calls.length).toBeGreaterThan(calls); // fetched again, not the old failure
  });
});
