/**
 * `/decks` "Import deck" (SPEC-005 OWN-008, OWN-094; SPEC-006 DECK-001; SPEC-010 SYNC-159; H-176). Gate open; the
 * gate itself is covered in pages/gated-pages.spec.ts.
 */
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { CardData, CatalogResult } from '../../core/cards/card-data';
import { makeCatalog, makeDeck } from '../../core/decks/engine-fixtures';
import { AppStores } from '../../core/storage/app-stores';
import { createBrowserStores } from '../../core/storage/browser-stores';
import { MemoryBackend } from '../../core/storage/kv-backend';
import { provideOpenGate } from '../../core/sync/testing/open-gate';

const CATALOG = makeCatalog(['Gust']);

const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const dialogTitle = () => text(document.querySelector('mat-dialog-container h2')) || null;

async function setup(url: string, decks = 0) {
  const backend = new MemoryBackend();
  const stores = createBrowserStores(backend, { now: () => Date.now(), changed: () => undefined, readOnly: () => false });
  for (let i = 0; i < decks; i++) {
    await stores.raw.decks.put(makeDeck(`00000000-0000-4000-9000-${String(i).padStart(12, '0')}`, `Deck ${i}`, { main: [['Gust', 1]] }));
  }
  const cardData: Partial<CardData> = {
    loadCatalog: async (): Promise<CatalogResult> => ({ status: 'ok', catalog: CATALOG }),
    reload: async (): Promise<CatalogResult> => ({ status: 'ok', catalog: CATALOG }),
    loadBans: async () => null,
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: CardData, useValue: cardData },
      provideRouter(routes, withComponentInputBinding()),
      provideOpenGate(),
      { provide: AppStores, useValue: { stores } },
      { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
    ],
  });
  const harness = await RouterTestingHarness.create(url);
  await settle(harness);
  return { harness, el: harness.routeNativeElement as HTMLElement };
}

async function settle(harness: RouterTestingHarness): Promise<void> {
  for (let i = 0; i < 4; i++) {
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 0));
  }
}

describe('DecksPage Import deck (OWN-008, OWN-094, DECK-001, SYNC-159)', () => {
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((n) => (n.innerHTML = ''));
    document.documentElement.classList.remove('has-fab');
    vi.restoreAllMocks();
  });

  it('OWN-008 / DECK-001 no decks: "No decks yet", its line, an Import deck button and a Tournaments link; no floating button', async () => {
    const { el, harness } = await setup('/decks');
    expect(text(el.querySelector('app-empty-state h2'))).toBe('No decks yet');
    expect(text(el.querySelector('app-empty-state p'))).toBe('Import a deck list to see which of its cards you own.');
    const button = Array.from(el.querySelectorAll('app-empty-state button')).find((b) => text(b) === 'Import deck') as HTMLButtonElement;
    expect(button.getAttribute('aria-haspopup')).toBe('dialog');
    // OWN-008 / H-189 finding 3: one filled main action; Tournaments is the shared outlined (link) variant.
    expect(el.querySelector('app-empty-state a[href="/tournaments"]')!.classList).toContain('button--outlined');
    expect(button.classList).not.toContain('button--outlined');
    expect(el.querySelector('app-page-fab')).toBeNull();
    expect(el.querySelector('a[href^="/import"]')).toBeNull();
    button.click();
    await settle(harness);
    expect(dialogTitle()).toBe('Import deck');
  });

  it('OWN-094 with decks: the floating Import deck button (upload icon, has popup dialog) right after the header; it opens the dialog and the page stays on /decks', async () => {
    const { el, harness } = await setup('/decks', 2);
    const fab = el.querySelector<HTMLButtonElement>('app-page-fab button')!;
    expect(text(fab)).toBe('Import deck');
    expect(fab.getAttribute('aria-haspopup')).toBe('dialog');
    expect(el.querySelector('header.page-header')!.compareDocumentPosition(fab) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(el.querySelector('app-empty-state')).toBeNull();
    fab.click();
    await settle(harness);
    expect(dialogTitle()).toBe('Import deck');
    expect(TestBed.inject(Router).url).toBe('/decks');
  });

  it('SYNC-159 (c) / AC 80 /decks?import=1 opens Import deck once and the address becomes /decks', async () => {
    const { harness } = await setup('/decks?import=1');
    await vi.waitFor(async () => {
      await settle(harness);
      expect(dialogTitle()).toBe('Import deck');
    });
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/decks'));
    expect(document.querySelectorAll('mat-dialog-container')).toHaveLength(1);
  });

  it('SYNC-159 (c) / AC 80 / H-189 /decks?import=1 then close: focus returns to the floating Import deck, not <body>', async () => {
    const { harness, el } = await setup('/decks?import=1', 2);
    await vi.waitFor(async () => {
      await settle(harness);
      expect(dialogTitle()).toBe('Import deck');
    });
    TestBed.inject(MatDialog).closeAll();
    await vi.waitFor(async () => {
      await settle(harness);
      expect(document.activeElement).toBe(el.querySelector('app-page-fab button'));
    });
  });

  it('SYNC-159 (c) / H-189 /decks?import=1 with no decks then close: focus goes to the empty state Import deck', async () => {
    const { harness, el } = await setup('/decks?import=1');
    await vi.waitFor(async () => {
      await settle(harness);
      expect(dialogTitle()).toBe('Import deck');
    });
    TestBed.inject(MatDialog).closeAll();
    await vi.waitFor(async () => {
      await settle(harness);
      expect(document.activeElement).toBe(el.querySelector('app-empty-state button'));
    });
  });

  it('OWN-105 (b) (H-060 replaces the "N decks saved." placeholder): the count line reads "N decks" / "1 deck"', async () => {
    const two = await setup('/decks', 2);
    expect(text(two.el.querySelector('.count-line'))).toBe('2 decks');
    TestBed.resetTestingModule();
    const one = await setup('/decks', 1);
    expect(text(one.el.querySelector('.count-line'))).toBe('1 deck');
  });

  it('SYNC-159 (c) /decks?import=yes is ignored and left alone', async () => {
    const { harness } = await setup('/decks?import=yes');
    await settle(harness);
    expect(document.querySelector('mat-dialog-container')).toBeNull();
    expect(TestBed.inject(Router).url).toBe('/decks?import=yes');
  });
});
