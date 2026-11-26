/**
 * `/decks` "Import deck" end to end (SPEC-006 DECK-001, DECK-003, DECK-041, DECK-070, DECK-092, DECK-098; ACs 24,
 * 26, 29; H-253): paste → Continue → review → Save, over real tracked stores and a fixed card catalog.
 */
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { CardData, CatalogResult } from '../../core/cards/card-data';
import { makeCatalog, makeDeck } from '../../core/decks/engine-fixtures';
import { DECK_SAVE_TEXT } from '../../core/import/deck-import';
import { AppStores } from '../../core/storage/app-stores';
import { BrowserStores, createBrowserStores } from '../../core/storage/browser-stores';
import { MemoryBackend } from '../../core/storage/kv-backend';
import { provideOpenGate } from '../../core/sync/testing/open-gate';
import { LIMITS } from '../../shared/storage/records';

const CATALOG = makeCatalog([
  { name: 'Kennen, Heart of the Tempest', category: 'legend' },
  { name: 'Kennen, Storm of Shuriken', category: 'champion' },
  { name: 'Lightning Rush', category: 'spell' },
  { name: 'Gust', category: 'spell' },
]);
const KENNEN = 'Legend:\n1 Kennen, Heart of the Tempest\nChampion:\n1 Kennen, Storm of Shuriken\nMain Deck:\n3 Lightning Rush\n2 Gust';

const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const dialog = () => document.querySelector('mat-dialog-container');
const snackText = () => text(document.querySelector('mat-snack-bar-container .mat-mdc-simple-snack-bar > :first-child')) || null;

let stores: BrowserStores;
let backend: MemoryBackend;

async function setup(url: string, seed = 0) {
  backend = new MemoryBackend();
  stores = createBrowserStores(backend, { now: () => Date.now(), changed: () => undefined, readOnly: () => false });
  for (let i = 0; i < seed; i++) {
    await stores.raw.decks.put(makeDeck(`00000000-0000-4000-9000-${String(i).padStart(12, '0')}`, `Old ${i}`, {}));
  }
  const cardData: Partial<CardData> = {
    loadCatalog: async (): Promise<CatalogResult> => ({ status: 'ok', catalog: CATALOG }),
    reload: async (): Promise<CatalogResult> => ({ status: 'ok', catalog: CATALOG }),
    loadBans: async () => null,
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
  const harness = await RouterTestingHarness.create(url);
  await settle(harness);
  return { harness, el: harness.routeNativeElement as HTMLElement };
}

async function settle(harness: RouterTestingHarness): Promise<void> {
  for (let i = 0; i < 6; i++) {
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 0));
  }
}

function button(label: string): HTMLButtonElement {
  const b = Array.from(dialog()!.querySelectorAll<HTMLButtonElement>('button')).find((x) => text(x) === label);
  if (!b) throw new Error(`no ${label} button`);
  return b;
}

async function openAndContinue(harness: RouterTestingHarness, el: HTMLElement, list: string): Promise<void> {
  const opener = el.querySelector<HTMLButtonElement>('app-page-fab button') ?? el.querySelector<HTMLButtonElement>('app-empty-state button')!;
  opener.click();
  await settle(harness);
  const box = dialog()!.querySelector('textarea')!;
  box.value = list;
  box.dispatchEvent(new InputEvent('input', { inputType: 'insertFromPaste' }));
  await settle(harness);
  button('Continue').click();
  await settle(harness);
}

describe('DecksPage Import deck save (H-253)', { timeout: 20_000 }, () => { // H-420 H-430: busy-machine headroom
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((n) => (n.innerHTML = ''));
    document.documentElement.classList.remove('has-fab');
    vi.restoreAllMocks();
  });

  it('DECK-003 / DECK-070 / AC 26: Continue shows the review with the Legend as the name and writes nothing', async () => {
    const { harness, el } = await setup('/decks');
    await openAndContinue(harness, el, KENNEN);
    expect(dialog()!.querySelector<HTMLInputElement>('input.deck-name')!.value).toBe('Kennen, Heart of the Tempest');
    expect(Array.from(dialog()!.querySelectorAll('.zone-counts span')).map(text)).toEqual(['Legend 1', 'Chosen Champion 1', 'Main Deck 5']);
    expect(await stores.decks.list()).toEqual([]);
  });

  it('DECK-098 / AC 24 / AC 29: Save closes the dialog, stays on /decks, the deck counts, and "Deck saved." offers View deck', async () => {
    const { harness, el } = await setup('/decks', 1);
    await openAndContinue(harness, el, KENNEN);
    button('Save deck').click();
    await vi.waitFor(async () => {
      await settle(harness);
      expect(dialog()).toBeNull();
    });
    expect(TestBed.inject(Router).url).toBe('/decks');
    expect(text(el.querySelector('.count-line'))).toBe('2 decks');
    // H-060: the new deck's tile is first in the list (OWN-005), named after its Legend (DECK-070).
    expect(text(el.querySelector('app-deck-tile .name-text'))).toBe('Kennen, Heart of the Tempest');
    expect(snackText()).toBe('Deck saved.');
    const decks = await stores.decks.list();
    const saved = decks.find((d) => d.name === 'Kennen, Heart of the Tempest')!;
    // DECK-098: first under the default order (newest updatedAt, OWN-005).
    expect([...decks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0].id).toBe(saved.id);
    const view = Array.from(document.querySelectorAll<HTMLButtonElement>('mat-snack-bar-container button')).find(
      (b) => text(b) === 'View deck',
    )!;
    view.click();
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe(`/decks/${saved.id}`));
  });

  it('DECK-001 / DECK-098: the first deck replaces the empty state with the count line', async () => {
    const { harness, el } = await setup('/decks');
    expect(el.querySelector('app-empty-state')).not.toBeNull();
    await openAndContinue(harness, el, KENNEN);
    button('Save deck').click();
    await vi.waitFor(async () => {
      await settle(harness);
      expect(text(el.querySelector('.count-line'))).toBe('1 deck');
    });
  });

  it('DECK-092 / AC 29: with 200 decks the dialog stays open with the DECK_LIMIT error and nothing is written', async () => {
    const { harness, el } = await setup('/decks', LIMITS.maxDecks);
    await openAndContinue(harness, el, KENNEN);
    const before = backend.data.size;
    button('Save deck').click();
    await settle(harness);
    expect(dialog()).not.toBeNull();
    expect(text(dialog()!.querySelector('.commit-error'))).toBe(DECK_SAVE_TEXT.limit);
    expect(backend.data.size).toBe(before);
    expect(snackText()).toBeNull();
  });

  it('DECK-041 / AC 8: an unknown name blocks Save until the line is removed', async () => {
    const { harness, el } = await setup('/decks');
    await openAndContinue(harness, el, `${KENNEN}\n3 Lightnig Rush`);
    expect(text(dialog()!.querySelector('.blockers'))).toBe('1 card needs attention');
    const save = button('Save deck');
    expect(save.getAttribute('aria-disabled')).toBe('true');
    save.click();
    await settle(harness);
    expect(dialog()).not.toBeNull();
    expect(await stores.decks.list()).toEqual([]);
    const remove = button('Remove line');
    expect(remove.getAttribute('aria-label')).toBe('Remove line 8');
    remove.click();
    await settle(harness);
    // H-451: the status region stays and reads "Ready to save.".
    expect(text(dialog()!.querySelector('.blockers'))).toBe('Ready to save.');
    expect(button('Save deck').getAttribute('aria-disabled')).not.toBe('true');
    button('Save deck').click();
    await vi.waitFor(async () => {
      await settle(harness);
      expect(dialog()).toBeNull();
    });
    expect((await stores.decks.list())[0].importRemovedLines).toEqual(['3 Lightnig Rush']);
  });

  it('DECK-070: a typed name is saved as typed (trimmed)', async () => {
    const { harness, el } = await setup('/decks');
    await openAndContinue(harness, el, KENNEN);
    const name = dialog()!.querySelector<HTMLInputElement>('input.deck-name')!;
    name.value = '  Kennen tempo ';
    name.dispatchEvent(new Event('input'));
    await settle(harness);
    button('Save deck').click();
    await vi.waitFor(async () => {
      await settle(harness);
      expect(dialog()).toBeNull();
    });
    expect((await stores.decks.list()).map((d) => d.name)).toEqual(['Kennen tempo']);
  });

  it('Back returns to the list with the text kept', async () => {
    const { harness, el } = await setup('/decks');
    await openAndContinue(harness, el, KENNEN);
    button('Back').click();
    await settle(harness);
    expect(dialog()!.querySelector('textarea')!.value).toBe(KENNEN);
  });
});
