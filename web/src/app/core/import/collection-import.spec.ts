import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CardData, CatalogResult } from '../cards/card-data';
import { lock, makeCatalog, makeDeck } from '../decks/engine-fixtures';
import { AppStores } from '../storage/app-stores';
import { BrowserStores, createBrowserStores } from '../storage/browser-stores';
import { MemoryBackend, StorageFullError } from '../storage/kv-backend';
import { STORAGE_KEYS } from '../storage/local-stores';
import { parseCardText } from '../../shared/import/parse-card-list';
import type { PreparedOk } from '../../shared/import/collection-commit';
import type { StoredCollection } from '../../shared/storage/records';
import { COMMIT_NOTICE_MS, COMMIT_TEXT, CollectionImport } from './collection-import';
import { TEST_DECK_IDS, TEST_SETS, isTestCollection } from '../../shared/collection/test-data';
import { generateLargeSample } from '../../shared/collection/sample-data';
import { loadTestData } from '../test-data/test-data-ops';

const CATALOG = makeCatalog(['Lightning Rush', 'Gust', 'Kennen, Heart of the Tempest']);

let backend: MemoryBackend;
let stores: BrowserStores;
let clock: number;

function setup(catalogError = false): CollectionImport {
  backend = new MemoryBackend();
  clock = Date.parse('2026-11-25T12:00:00.000Z');
  stores = createBrowserStores(backend, { now: () => clock, changed: () => undefined, readOnly: () => false });
  const result = (): CatalogResult => (catalogError ? { status: 'error' } : { status: 'ok', catalog: CATALOG });
  const cardData: Partial<CardData> = {
    // While test data is stored the app's catalog is the generated one (TEST-024); imports read the /api one.
    loadCatalog: async (): Promise<CatalogResult> =>
      isTestCollection(await stores.raw.collection.load())
        ? { status: 'ok', catalog: generateLargeSample(TEST_SETS.small).catalog }
        : result(),
    loadApiCatalog: async (): Promise<CatalogResult> => result(),
    reload: async (): Promise<CatalogResult> => ({ status: 'error' }),
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
      { provide: AppStores, useValue: { stores } },
      { provide: CardData, useValue: cardData },
    ],
  });
  return TestBed.inject(CollectionImport);
}

async function flush(): Promise<void> {
  const app = TestBed.inject(ApplicationRef);
  for (let i = 0; i < 4; i++) {
    app.tick();
    await new Promise((r) => setTimeout(r, 0));
  }
}

const snack = () => document.querySelector('mat-snack-bar-container');
const snackText = () => snack()?.querySelector('[matsnackbarlabel], .mat-mdc-simple-snack-bar > :first-child')?.textContent?.trim() ?? null;
const snackAction = () => snack()?.querySelector<HTMLButtonElement>('button') ?? null;
const dialog = () => document.querySelector('mat-dialog-container');
function dialogButton(label: string): HTMLButtonElement {
  const b = Array.from(dialog()!.querySelectorAll<HTMLButtonElement>('button')).find(
    (x) => x.textContent?.trim() === label,
  );
  if (!b) throw new Error(`no ${label} button`);
  return b;
}

async function store(cards: Record<string, number>, updatedAt = '2026-11-24T00:00:00.000Z'): Promise<void> {
  const c: StoredCollection = { schemaVersion: 1, updatedAt, catalogVersion: '0.3+test', cards: {} };
  for (const [k, q] of Object.entries(cards)) c.cards[k] = { quantity: q, byPrinting: {} };
  await stores.raw.collection.save(c);
}

const quantities = async () =>
  Object.fromEntries(Object.entries((await stores.collection.load())?.cards ?? {}).map(([k, c]) => [k, c.quantity]));

async function prepared(importer: CollectionImport, text: string): Promise<PreparedOk> {
  const p = await importer.prepare(parseCardText(text));
  if (p.status !== 'ok') throw new Error('prepare failed');
  return p;
}

/** Runs `commit` while answering the Replace confirmation with `answer`. */
async function commitWith(
  importer: CollectionImport,
  p: PreparedOk,
  mode: 'add' | 'replace',
  answer?: 'Replace' | 'Cancel',
) {
  const out = importer.commit(p, mode);
  if (answer) {
    await flush();
    dialogButton(answer).click();
  }
  const r = await out;
  await flush();
  return r;
}

describe('CollectionImport commit and Undo (SPEC-003 IMP-049…052, IMP-072…075; H-158)', () => {
  afterEach(() => {
    TestBed.inject(MatSnackBar).dismiss();
    document.querySelectorAll('.cdk-overlay-container').forEach((n) => (n.innerHTML = ''));
  });

  it('AC 43 / IMP-049 / IMP-073 / IMP-074: Add writes, keeps the snapshot and shows "Added 5 copies of 2 cards." with Undo for 10 s', async () => {
    const importer = setup();
    const open = vi.spyOn(TestBed.inject(MatSnackBar), 'open');
    const written = vi.fn();
    importer.written.subscribe(written);
    const out = await commitWith(importer, await prepared(importer, '3 Lightning Rush\n2 Gust'), 'add');
    expect(out).toEqual({ status: 'written' });
    expect(await quantities()).toEqual({ 'lightning rush': 3, gust: 2 });
    expect(await stores.collection.loadPrevious()).toMatchObject({ cards: {} }); // IMP-052: the empty snapshot
    expect(snackText()).toBe('Added 5 copies of 2 cards.');
    expect(snackAction()?.textContent?.trim()).toBe('Undo');
    expect(open).toHaveBeenCalledWith('Added 5 copies of 2 cards.', 'Undo', {
      duration: COMMIT_NOTICE_MS,
      politeness: 'polite',
    });
    expect(COMMIT_NOTICE_MS).toBe(10_000);
    expect(written).toHaveBeenCalledTimes(1); // COLL-091: Collection refreshes in place
  });

  it('AC 43 / IMP-072 / COLL-072: a failed write returns the error, shows no notice, and leaves the stored record alone', async () => {
    const importer = setup();
    await store({ gust: 1 });
    const set = backend.set.bind(backend);
    vi.spyOn(backend, 'set').mockImplementation((k, v) => {
      if (k === STORAGE_KEYS.collection) throw new StorageFullError();
      set(k, v);
    });
    const out = await commitWith(importer, await prepared(importer, '2 Gust'), 'add');
    expect(out).toEqual({ status: 'error', message: COMMIT_TEXT.storageFull });
    expect(snack()).toBeNull();
    expect(await quantities()).toEqual({ gust: 1 });
  });

  it('IMP-066: without card data nothing can be resolved; prepare reports it', async () => {
    const importer = setup(true);
    expect(await importer.prepare(parseCardText('1 Gust'))).toEqual({
      status: 'error',
      message: COMMIT_TEXT.catalogError,
    });
  });

  it('AC 44 / IMP-050 / IMP-075: Replace confirms, Undo with no later change restores at once, once', async () => {
    const importer = setup();
    await store({ 'lightning rush': 3, gust: 2 });
    await stores.tags.save({
      schemaVersion: 3,
      updatedAt: '2026-11-24T00:00:00.000Z',
      tags: [],
      assignments: {},
    });
    const tagsBefore = backend.get(STORAGE_KEYS.tags);
    const p = await prepared(importer, '1 Kennen, Heart of the Tempest');
    const out = importer.commit(p, 'replace');
    await flush();
    expect(dialog()?.querySelector('h2')?.textContent?.trim()).toBe('Replace your collection?');
    expect(dialog()?.textContent).toContain('2 names removed (Gust, Lightning Rush).');
    dialogButton('Replace').click();
    expect(await out).toEqual({ status: 'written' });
    await flush();
    expect(await quantities()).toEqual({ 'kennen heart of the tempest': 1 });
    expect(snackText()).toBe('Collection replaced: 1 card.');

    snackAction()!.click();
    await flush();
    await flush();
    expect(dialog()).toBeNull(); // no confirmation
    expect(await quantities()).toEqual({ 'lightning rush': 3, gust: 2 });
    expect(backend.get(STORAGE_KEYS.tags)).toBe(tagsBefore);
    expect(snackText()).toBe('Import undone.');
    expect(snackAction()).toBeNull();
    expect(await stores.collection.loadPrevious()).toBeNull(); // spent

    await importer.undo();
    await flush();
    expect(snackText()).toBe('Nothing to undo.');
    expect(await quantities()).toEqual({ 'lightning rush': 3, gust: 2 });
  });

  it('AC 44 / IMP-050: a Replace cancelled at its confirmation writes nothing and shows no notice', async () => {
    const importer = setup();
    await store({ 'lightning rush': 3, gust: 2 });
    const before = backend.get(STORAGE_KEYS.collection);
    const out = await commitWith(importer, await prepared(importer, '1 Gust'), 'replace', 'Cancel');
    expect(out).toEqual({ status: 'cancelled' });
    expect(backend.get(STORAGE_KEYS.collection)).toBe(before);
    expect(backend.get(STORAGE_KEYS.collectionPrevious)).toBeNull();
    expect(snack()).toBeNull();
  });

  it('AC 45 / IMP-075 (a) (c) / COLL-058: a change after the commit (another tab) asks first; Cancel re-shows the notice; confirm restores', async () => {
    const importer = setup();
    await commitWith(importer, await prepared(importer, '3 Lightning Rush\n2 Gust'), 'add');
    // another tab sets gust to 9 after the commit
    const rec = JSON.parse(backend.get(STORAGE_KEYS.collection)!) as StoredCollection;
    rec.cards['gust'].quantity = 9;
    rec.updatedAt = '2026-11-25T12:00:05.000Z';
    backend.set(STORAGE_KEYS.collection, JSON.stringify(rec));
    const open = vi.spyOn(TestBed.inject(MatSnackBar), 'open');

    snackAction()!.click();
    await flush();
    expect(dialog()?.textContent).toContain('Your collection changed after this import.');
    dialogButton('Cancel').click();
    await flush();
    await flush();
    expect(await quantities()).toEqual({ 'lightning rush': 3, gust: 9 });
    expect(snackText()).toBe('Added 5 copies of 2 cards.');
    expect(open).toHaveBeenLastCalledWith('Added 5 copies of 2 cards.', 'Undo', expect.objectContaining({ duration: 10_000 }));

    snackAction()!.click();
    await flush();
    dialogButton('Undo import').click();
    await flush();
    await flush();
    expect(await quantities()).toEqual({});
    expect(snackText()).toBe('Import undone.');
  });

  it('AC 45 / IMP-050a (b) / COLL-088: an Undo that leaves a locked deck short asks with the warning, then notifies', async () => {
    const importer = setup();
    await store({ 'lightning rush': 2 });
    await stores.raw.decks.put(makeDeck('d1', 'Kennen Tempo', { main: [['Lightning Rush', 3]] }));
    await stores.raw.locks.save({ schemaVersion: 1, updatedAt: '', locks: [lock('d1')] });
    await commitWith(importer, await prepared(importer, '1 Lightning Rush'), 'add');
    expect(await quantities()).toEqual({ 'lightning rush': 3 });

    snackAction()!.click();
    await flush();
    expect(dialog()?.textContent).toContain("'Kennen Tempo' (locked) will be 1 card short. It stays locked.");
    dialogButton('Undo import').click();
    await flush();
    await flush();
    expect(await quantities()).toEqual({ 'lightning rush': 2 });
    expect(snackText()).toBe("Import undone. 'Kennen Tempo' (locked) is now 1 card short.");
  });

  describe('SPEC-013 TEST-033 / AC 12: Replace import over test data (H-233)', () => {
    async function withTestData(): Promise<void> {
      expect(await loadTestData(stores, 'small', () => clock)).toBe('ok');
      // An own locked deck next to the test decks: it must stay (TEST-050 scope).
      await stores.decks.create(makeDeck('00000000-0000-4000-8000-0000000000aa', 'Own Deck', { main: [['Gust', 1]] }));
      const locks = (await stores.locks.load())!;
      await stores.locks.save({ ...locks, locks: [...locks.locks, lock('00000000-0000-4000-8000-0000000000aa')] });
      expect(isTestCollection(await stores.collection.load())).toBe(true);
    }

    it('TEST-033 AC 12 a Replace over test data writes the real catalogVersion and removes the test decks and their locks in the same commit; the banner marker is gone', async () => {
      const importer = setup();
      await withTestData();
      const testLocks = (await stores.locks.load())!.locks.filter((l) => TEST_DECK_IDS.includes(l.deckId));
      expect(testLocks.length).toBeGreaterThan(0);

      const out = await commitWith(importer, await prepared(importer, '2 Gust\n1 Lightning Rush'), 'replace', 'Replace');
      expect(out).toEqual({ status: 'written' });

      const collection = await stores.collection.load();
      expect(collection!.catalogVersion).toBe(CATALOG.catalogVersion); // the real /api catalog, not "generated"
      expect(isTestCollection(collection)).toBe(false); // TEST-030: no marker, so no TEST-010 banner
      expect(await quantities()).toEqual({ gust: 2, 'lightning rush': 1 });
      const deckIds = (await stores.decks.list()).map((d) => d.id);
      expect(deckIds.filter((id) => TEST_DECK_IDS.includes(id))).toEqual([]);
      expect(deckIds).toContain('00000000-0000-4000-8000-0000000000aa');
      expect((await stores.locks.load())!.locks.map((l) => l.deckId)).toEqual(['00000000-0000-4000-8000-0000000000aa']);
      expect(snackText()).toBe('Collection replaced: 2 cards.');
    });

    it('TEST-033 the Replace confirmation does not warn about test decks, which go in the same commit', async () => {
      const importer = setup();
      await withTestData();
      const out = importer.commit(await prepared(importer, '1 Gust'), 'replace');
      await flush();
      expect(dialog()?.textContent).not.toContain('(locked) will be');
      dialogButton('Cancel').click();
      expect(await out).toEqual({ status: 'cancelled' });
      // Cancel writes nothing: test data, decks and locks all stay.
      expect(isTestCollection(await stores.collection.load())).toBe(true);
      expect((await stores.decks.list()).filter((d) => TEST_DECK_IDS.includes(d.id))).toHaveLength(3);
    });

    it('TEST-033 an Add import never removes test decks (Add is blocked by TEST-032 before it gets here)', async () => {
      const importer = setup();
      await store({ gust: 1 });
      await stores.decks.create(makeDeck('00000000-0000-4000-8000-0000000000aa', 'Own Deck', { main: [['Gust', 1]] }));
      await commitWith(importer, await prepared(importer, '1 Gust'), 'add');
      expect((await stores.decks.list()).map((d) => d.id)).toEqual(['00000000-0000-4000-8000-0000000000aa']);
    });
  });

  it('IMP-050a (a): the Replace confirmation carries the locked-deck warning', async () => {
    const importer = setup();
    await store({ 'lightning rush': 3 });
    await stores.raw.decks.put(makeDeck('d1', 'Kennen Tempo', { main: [['Lightning Rush', 3]] }));
    await stores.raw.locks.save({ schemaVersion: 1, updatedAt: '', locks: [lock('d1')] });
    const out = importer.commit(await prepared(importer, '2 Lightning Rush'), 'replace');
    await flush();
    expect(dialog()?.textContent).toContain('1 changed (Lightning Rush 3 → 2).');
    expect(dialog()?.textContent).toContain("'Kennen Tempo' (locked) will be 1 card short. It stays locked.");
    dialogButton('Cancel').click();
    expect(await out).toEqual({ status: 'cancelled' });
  });

  it('IMP-075 (b): a failed snapshot clear after a written restore still reports "Import undone." and spends the Undo', async () => {
    const importer = setup();
    await store({ gust: 1 });
    await commitWith(importer, await prepared(importer, '2 Gust'), 'add');
    vi.spyOn(stores.collection, 'clearPrevious').mockRejectedValue(new Error('storage'));
    snackAction()!.click();
    await flush();
    await flush();
    expect(await quantities()).toEqual({ gust: 1 });
    expect(snackText()).toBe('Import undone.');
    await importer.undo();
    await flush();
    expect(snackText()).toBe('Nothing to undo.');
    expect(await quantities()).toEqual({ gust: 1 });
  });

  it('AC 45 / IMP-074: the notice is gone after 10 seconds and no Undo is offered', async () => {
    const importer = setup();
    vi.useFakeTimers();
    try {
      const app = TestBed.inject(ApplicationRef);
      const tick = async (ms: number) => {
        app.tick();
        await vi.advanceTimersByTimeAsync(ms);
        app.tick();
      };
      const p = importer.prepare(parseCardText('1 Gust'));
      await tick(0);
      const ready = await p;
      if (ready.status !== 'ok') throw new Error('prepare failed');
      const out = importer.commit(ready, 'add');
      for (let i = 0; i < 5; i++) await tick(0);
      expect(await out).toEqual({ status: 'written' });
      await tick(0);
      expect(snackText()).toBe('Added 1 copy of 1 card.');
      await tick(9_900);
      expect(snackText()).toBe('Added 1 copy of 1 card.');
      await tick(200);
      await tick(500); // exit
      expect(snack()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('IMP-075 (d): with the snapshot gone (sign-out / first sign-in) Undo writes nothing and says "Nothing to undo."', async () => {
    const importer = setup();
    await commitWith(importer, await prepared(importer, '1 Gust'), 'add');
    backend.remove(STORAGE_KEYS.collectionPrevious);
    const before = backend.get(STORAGE_KEYS.collection);
    snackAction()!.click();
    await flush();
    await flush();
    expect(snackText()).toBe('Nothing to undo.');
    expect(backend.get(STORAGE_KEYS.collection)).toBe(before);
  });

  it('IMP-075 (d) / IMP-052: a later commit replaces the snapshot, so the older notice can no longer undo', async () => {
    const importer = setup();
    await commitWith(importer, await prepared(importer, '1 Gust'), 'add');
    const first = snackAction()!;
    // a newer commit in another tab keeps its own snapshot (our written record)
    backend.set(STORAGE_KEYS.collectionPrevious, backend.get(STORAGE_KEYS.collection)!);
    first.click();
    await flush();
    await flush();
    expect(snackText()).toBe('Nothing to undo.');
    expect(await quantities()).toEqual({ gust: 1 });
  });
});
