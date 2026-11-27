/**
 * SPEC-006 Deck Import save (H-253): `DeckImport`, the `ImportCommitter` of "Import deck" (H-158 seam, H-273).
 * Real tracked browser stores over a memory backend, so the sync log stamps are the ones the app writes.
 */
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { Router } from '@angular/router';
import { CardData, CatalogResult } from '../cards/card-data';
import { makeCatalog, makeDeck } from '../decks/engine-fixtures';
import { AppStores } from '../storage/app-stores';
import { BrowserStores, createBrowserStores } from '../storage/browser-stores';
import { MemoryBackend } from '../storage/kv-backend';
import { SignInGate } from '../sync/sign-in-gate';
import { provideOpenGate } from '../sync/testing/open-gate';
import { EMPTY_REVIEW_STATE, type PreparedDeck, reviewDeck } from '../../shared/import/deck-import';
import { parseCardText } from '../../shared/import/parse-card-list';
import { LIMITS, type UserDeck } from '../../shared/storage/records';
import { SUCCESS_NOTICE_MS } from '../../shared/sync/notice';
import { DECK_SAVE_TEXT, DeckImport, NEW_DECK_ID } from './deck-import';

const CATALOG = makeCatalog([
  { name: 'Kennen, Heart of the Tempest', category: 'legend' },
  { name: 'Kennen, Storm of Shuriken', category: 'champion' },
  { name: 'Lightning Rush', category: 'spell' },
  { name: 'Gust', category: 'spell' },
  { name: 'Chaos Rune', category: 'rune' },
]);

const KENNEN = 'Legend:\n1 Kennen, Heart of the Tempest\nChampion:\n1 Kennen, Storm of Shuriken\nMain Deck:\n3 Lightning Rush\n2 Gust\nRune Pool:\n9 Chaos Rune';

let backend: MemoryBackend;
let stores: BrowserStores;
let clock: number;
let ids: number;
let navigate: ReturnType<typeof vi.fn>;

function setup(opts: { catalogError?: boolean } = {}): DeckImport {
  backend = new MemoryBackend();
  clock = Date.parse('2026-11-25T12:00:00.000Z');
  ids = 0;
  stores = createBrowserStores(backend, { now: () => clock, changed: () => undefined, readOnly: () => false });
  const cardData: Partial<CardData> = {
    loadCatalog: async (): Promise<CatalogResult> =>
      opts.catalogError ? { status: 'error' } : { status: 'ok', catalog: CATALOG },
    reload: async (): Promise<CatalogResult> => ({ status: 'error' }),
  };
  navigate = vi.fn().mockResolvedValue(true);
  TestBed.configureTestingModule({
    providers: [
      { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
      { provide: AppStores, useValue: { stores, majorAction: () => undefined } },
      { provide: CardData, useValue: cardData },
      { provide: Router, useValue: { navigate } },
      { provide: NEW_DECK_ID, useValue: () => `00000000-0000-4000-8000-${String(++ids).padStart(12, '0')}` },
      provideOpenGate(),
    ],
  });
  return TestBed.inject(DeckImport);
}

async function flush(): Promise<void> {
  const app = TestBed.inject(ApplicationRef);
  for (let i = 0; i < 4; i++) {
    app.tick();
    await new Promise((r) => setTimeout(r, 0));
  }
}

const snack = () => document.querySelector('mat-snack-bar-container');
const snackText = () => snack()?.querySelector('.mat-mdc-simple-snack-bar > :first-child')?.textContent?.trim() ?? null;
const snackAction = () => snack()?.querySelector<HTMLButtonElement>('button') ?? null;

async function prepared(importer: DeckImport, text = KENNEN): Promise<PreparedDeck> {
  const p = await importer.prepare(parseCardText(text), text);
  if (p.status !== 'ok') throw new Error('not prepared');
  return p;
}

const draftOf = (p: PreparedDeck) => reviewDeck(p, EMPTY_REVIEW_STATE, new Date(2026, 10, 25)).draft;

async function save(importer: DeckImport, text = KENNEN) {
  const p = await prepared(importer, text);
  return importer.commit(p, { draft: draftOf(p) });
}

describe('SPEC-006 Deck Import save (DeckImport, H-253)', () => {
  afterEach(() => document.querySelectorAll('mat-snack-bar-container').forEach((e) => e.remove()));

  it('DECK-003 / AC 17: Continue (prepare) writes nothing', async () => {
    const importer = setup();
    const keysBefore = [...backend.data.keys()];
    const p = await prepared(importer);
    expect(p.lines).toHaveLength(5);
    expect([...backend.data.keys()]).toEqual(keysBefore);
    expect(await stores.decks.list()).toEqual([]);
  });

  it('DECK-015: with no card data, Continue reports it and writes nothing', async () => {
    const importer = setup({ catalogError: true });
    expect(await importer.prepare(parseCardText(KENNEN), KENNEN)).toEqual({
      status: 'error',
      message: DECK_SAVE_TEXT.catalogError,
    });
    expect(backend.data.size).toBe(0);
  });

  it('DECK-002 / DECK-090 / DECK-074: Save writes exactly one deck to stores.decks, stamped for sync; the collection is untouched', async () => {
    const importer = setup();
    expect(await save(importer)).toEqual({ status: 'written' });
    const decks = await stores.decks.list();
    expect(decks).toHaveLength(1);
    const d = decks[0];
    expect(d.id).toBe('00000000-0000-4000-8000-000000000001');
    expect(d.name).toBe('Kennen, Heart of the Tempest');
    // ISO 8601 UTC with milliseconds; `updatedAt` is the tracked store's monotonic stamp (SYNC-031, max(now, prev + 1)).
    expect(d.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(d.updatedAt).toBe('2026-11-25T12:00:00.000Z');
    expect(d).toMatchObject({ schemaVersion: 1, format: 'standard', notes: '', sourceFormat: 'riot-text', catalogVersion: '0.3+test' });
    expect(await stores.collection.load()).toBeNull();
    // DECK-090 / SYNC-031: queued for the account (pushed by sync).
    const log = await stores.log.load();
    expect(log?.pending.decks).toEqual([d.id]);
  });

  it('DECK-070 / AC 26: two imports of the same list are two decks with the same name, no suffix', async () => {
    const importer = setup();
    await save(importer);
    await save(importer);
    const names = (await stores.decks.list()).map((d) => d.name);
    expect(names).toEqual(['Kennen, Heart of the Tempest', 'Kennen, Heart of the Tempest']);
  });

  it('AC 1 / AC 24: the saved deck survives a reload (a fresh set of stores over the same storage)', async () => {
    const importer = setup();
    await save(importer);
    const reloaded = createBrowserStores(backend, { now: () => clock, changed: () => undefined, readOnly: () => false });
    const decks = await reloaded.decks.list();
    expect(decks.map((d) => d.name)).toEqual(['Kennen, Heart of the Tempest']);
    expect(decks[0].main.map((c) => [c.name, c.qty])).toEqual([
      ['Lightning Rush', 3],
      ['Gust', 2],
    ]);
  });

  it('DECK-098 / AC 29: after Save the snack bar reads "Deck saved." with View deck, polite, and View deck opens /decks/<id>', async () => {
    const importer = setup();
    const saved: UserDeck[] = [];
    importer.saved.subscribe((d) => saved.push(d));
    await save(importer);
    await flush();
    expect(snackText()).toBe('Deck saved.');
    expect(snackAction()?.textContent?.trim()).toBe('View deck');
    expect(snack()?.getAttribute('aria-live') ?? snack()?.querySelector('[aria-live]')?.getAttribute('aria-live')).toBe('polite');
    expect(saved.map((d) => d.id)).toEqual(['00000000-0000-4000-8000-000000000001']);
    snackAction()!.click();
    await flush();
    expect(navigate).toHaveBeenCalledWith(['/decks', '00000000-0000-4000-8000-000000000001']);
  });

  it('DECK-098: "Deck saved." clears itself (success notice timing)', async () => {
    const importer = setup();
    const open = vi.spyOn((importer as unknown as { snackBar: { open: (...a: unknown[]) => unknown } }).snackBar, 'open');
    await save(importer);
    expect(open).toHaveBeenCalledWith('Deck saved.', 'View deck', { duration: SUCCESS_NOTICE_MS, politeness: 'polite' });
  });

  it('DECK-092 / AC 15 / AC 29: with 200 decks stored, Save gives DECK_LIMIT, writes nothing and shows no "Deck saved."', async () => {
    const importer = setup();
    for (let i = 0; i < LIMITS.maxDecks; i++) {
      await stores.raw.decks.put(makeDeck(`00000000-0000-4000-9000-${String(i).padStart(12, '0')}`, `D${i}`, {}));
    }
    const before = backend.data.size;
    expect(await save(importer)).toEqual({ status: 'error', message: DECK_SAVE_TEXT.limit });
    expect(backend.data.size).toBe(before);
    await flush();
    expect(snackText()).toBeNull();
  });

  it('DECK-092 / AC 15: a deck of more than 300 copies gives DECK_TOO_LARGE and writes nothing', async () => {
    const importer = setup();
    const big = 'Legend: 1 Kennen, Heart of the Tempest\nChampion: 1 Kennen, Storm of Shuriken\nMain Deck:\n299 Gust';
    expect(await save(importer, big)).toEqual({ status: 'error', message: DECK_SAVE_TEXT.tooLarge });
    expect(await stores.decks.list()).toEqual([]);
  });

  it('DECK-093: a full storage gives STORAGE_FULL; nothing is written and no notice', async () => {
    const importer = setup();
    const p = await prepared(importer);
    backend.full = true;
    expect(await importer.commit(p, { draft: draftOf(p) })).toEqual({ status: 'error', message: DECK_SAVE_TEXT.storageFull });
    backend.full = false;
    expect(await stores.decks.list()).toEqual([]);
    expect((await stores.log.load())?.pending.decks ?? []).toEqual([]);
  });

  it('DECK-097: with the sign-in gate closed nothing can be saved', async () => {
    const importer = setup();
    const p = await prepared(importer);
    TestBed.inject(SignInGate).set('session-lost');
    expect(await importer.commit(p, { draft: draftOf(p) })).toEqual({ status: 'error', message: DECK_SAVE_TEXT.signedOut });
    expect(await stores.decks.list()).toEqual([]);
  });

  it('DECK-042 / AC 9: removed lines are stored in importRemovedLines as written', async () => {
    const importer = setup();
    const text = `${KENNEN}\nSideboard:\n2 Totally Fake Card`;
    const p = await prepared(importer, text);
    const bad = p.lines.find((l) => l.attention)!;
    const draft = reviewDeck(p, { ...EMPTY_REVIEW_STATE, removed: new Set([bad.id]) }, new Date()).draft;
    await importer.commit(p, { draft });
    expect((await stores.decks.list())[0].importRemovedLines).toEqual(['2 Totally Fake Card']);
  });
});
