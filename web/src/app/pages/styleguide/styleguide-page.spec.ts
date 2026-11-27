import { Subject } from 'rxjs';
import { provideTestStores } from '../../core/storage/testing/test-stores';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { provideRouter } from '@angular/router';
import { CardData, CatalogResult, DEV_SAMPLE_DECKS_KEY, DEV_SAMPLE_KEY } from '../../core/cards/card-data';
import { BrowserStores, createBrowserStores } from '../../core/storage/browser-stores';
import { MemoryBackend } from '../../core/storage/kv-backend';
import { STORAGE_KEYS } from '../../core/storage/local-stores';
import { generateLargeSample, sampleDeck } from '../../shared/collection/sample-data';
import { StyleguidePage } from './styleguide-page';

/**
 * H-560: why "Load records the deck ids it wrote" failed once in a full `ng test` run.
 *
 * Cause: the 5 s default test timeout. Every test here renders the whole styleguide page (all sections, Material,
 * deck and collection tiles). Alone that takes 0.3 to 1.7 s; beside a heavy process it took 3.1 to 3.5 s for the Load
 * test and 6.3 to 11.4 s for the file's first (cold) render, which then failed with "Test timed out in 5000ms"
 * (reproduced 2026-11-26 with 32 and 64 busy threads). A timed-out test is not stopped: its body keeps running while
 * the next test starts, and these tests shared state across that gap: a module-level `stores` that each `render()`
 * reassigned, the global `window.confirm` spy, and the sample-loader keys in the jsdom localStorage that every spec
 * file shares (`isolate: false`).
 *
 * Fix: the page-rendering suites get a 30 s timeout; each test gets its own stores from `render()`; `beforeEach` and
 * `afterEach` restore mocks and remove the sample-loader keys (the dev keys and the records Clear removes).
 */
const PAGE_TIMEOUT = 30_000;
const SAMPLE_KEYS = [
  DEV_SAMPLE_DECKS_KEY,
  DEV_SAMPLE_KEY,
  STORAGE_KEYS.collection,
  STORAGE_KEYS.locks,
  STORAGE_KEYS.printingCodes,
];

function resetSharedState(): void {
  vi.restoreAllMocks();
  for (const key of SAMPLE_KEYS) localStorage.removeItem(key);
}

async function render(): Promise<{ fixture: ComponentFixture<StyleguidePage>; stores: BrowserStores }> {
  const stores = createBrowserStores(new MemoryBackend(), {
    now: () => Date.now(),
    changed: () => undefined,
    readOnly: () => false,
  });
  const catalog = generateLargeSample(3).catalog;
  const cardData: Partial<CardData> = {
    sourceChanged: new Subject<void>(), // H-679
    reload: async (): Promise<CatalogResult> => ({ status: 'ok', catalog }),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
      provideTestStores(stores),
      { provide: CardData, useValue: cardData },
    ],
  });
  const fixture = TestBed.createComponent(StyleguidePage);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, stores };
}

function button(el: HTMLElement, label: string): HTMLButtonElement {
  return [...el.querySelectorAll('button')].find((b) => b.textContent?.includes(label))!;
}

async function settle(fixture: ComponentFixture<StyleguidePage>) {
  for (let i = 0; i < 5; i++) {
    await new Promise((r) => setTimeout(r, 0));
    await fixture.whenStable();
  }
}

describe('StyleguidePage dev sample loader (H-086 review 1, H-560)', { timeout: PAGE_TIMEOUT }, () => {
  beforeEach(resetSharedState);
  afterEach(resetSharedState);

  it('Clear asks first, naming the collection, decks and locks; cancelling deletes nothing', async () => {
    const { fixture, stores } = await render();
    await stores.raw.decks.put(sampleDeck(1, 'Mine', []));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    button(fixture.nativeElement, 'Clear sample data').click();
    await settle(fixture);
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm.mock.calls[0][0]).toMatch(/collection.*locks.*decks/);
    expect(await stores.raw.decks.list()).toHaveLength(1);
  });

  it('H-560: Load records the deck ids it wrote; Clear deletes only those decks', async () => {
    const { fixture, stores } = await render();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    button(fixture.nativeElement, 'Load fixture sample').click();
    await settle(fixture);
    const written: string[] = JSON.parse(localStorage.getItem(DEV_SAMPLE_DECKS_KEY) ?? '[]');
    expect(written.length).toBeGreaterThan(0);

    const mine = sampleDeck(99, 'Mine', []);
    await stores.raw.decks.put(mine);
    button(fixture.nativeElement, 'Clear sample data').click();
    await settle(fixture);
    expect((await stores.raw.decks.list()).map((d) => d.id)).toEqual([mine.id]);
    expect(localStorage.getItem(DEV_SAMPLE_DECKS_KEY)).toBeNull();
  });
});

describe('StyleguidePage Buttons section (H-102)', { timeout: PAGE_TIMEOUT }, () => {
  beforeEach(resetSharedState);
  afterEach(resetSharedState);

  it('H-102: the Buttons section renders a danger button and a disabled danger button', async () => {
    const { fixture } = await render();
    const el = fixture.nativeElement as HTMLElement;
    const section = el.querySelector<HTMLElement>('section[aria-labelledby="sg-buttons"]')!;
    expect(section.querySelector('h2')!.textContent!.trim()).toBe('Buttons');
    const danger = [...section.querySelectorAll<HTMLButtonElement>('button.danger.mat-mdc-button-base')];
    expect(danger.some((b) => !b.disabled && b.textContent!.includes('Delete account'))).toBe(true);
    expect(danger.some((b) => b.disabled)).toBe(true);
    // Dialog-style row: Cancel (text) then Delete account (filled danger).
    const row = [...section.querySelectorAll('.dialog-actions button')];
    expect(row.map((b) => b.textContent!.trim())).toEqual(['Cancel', 'Delete account']);
    expect(row[1].classList.contains('danger')).toBe(true);
  });
});

describe('StyleguidePage Decks section (H-391)', { timeout: PAGE_TIMEOUT }, () => {
  beforeEach(resetSharedState);
  afterEach(resetSharedState);

  function section(fixture: ComponentFixture<StyleguidePage>): HTMLElement {
    return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('section[aria-labelledby="sg-decks"]')!;
  }

  it('H-391: shows deck tiles for every ownership group, with the engine lines', async () => {
    const el = section((await render()).fixture);
    const tiles = [...el.querySelectorAll<HTMLElement>('app-deck-tile')];
    expect(tiles.length).toBe(10);
    const text = tiles.map((t) => t.textContent!.replace(/\s+/g, ' '));
    expect(text.some((t) => t.includes('Ready to build'))).toBe(true);
    expect(text.some((t) => t.includes('Partly available') && t.includes('1 banned card'))).toBe(true);
    expect(text.some((t) => t.includes('None available'))).toBe(true);
    expect(text.some((t) => /cards? short/.test(t))).toBe(false); // H-665: no "Locked · n cards short" any more
    expect(text.some((t) => t.includes('No cards to count'))).toBe(true);
    expect(text.some((t) => t.includes('Read-only'))).toBe(true);
    expect(text.filter((t) => t.includes('Ownership unavailable')).length).toBe(2);
    expect(el.querySelectorAll('app-deck-tile app-deck-mark').length).toBeGreaterThan(0);
  });

  it('H-391: shows status chips, lock badges, lock actions, card tiles, rows and the panel', async () => {
    const el = section((await render()).fixture);
    const chips = [...el.querySelectorAll('.row-items app-deck-status-chip .chip')].map((c) => c.textContent!.trim());
    // H-400: the chip has no locked / short kinds (the lock is app-lock-badge); locked and unavailable render nothing.
    expect(chips).toEqual(['Ready to build', 'Partly available', 'None available']);
    expect(el.querySelector('.column-items app-lock-badge')!.textContent).not.toContain('Locked in on'); // H-662
    const actions = [...el.querySelectorAll<HTMLButtonElement>('app-lock-actions:not(.variant-icon) button')];
    expect(actions.map((b) => b.textContent!.trim())).toEqual(['Lock in', 'Lock in', 'Unlock', 'Lock in']);
    expect(actions[0].getAttribute('aria-disabled')).not.toBe('true');
    expect(actions[1].getAttribute('aria-disabled')).toBe('true');
    expect(actions[3].getAttribute('aria-disabled')).toBe('true');
    expect(el.textContent).toContain('Locked decks could not be read');
    expect(el.querySelectorAll('app-deck-card-tile').length).toBe(12);
    expect(el.querySelectorAll('app-deck-card-row').length).toBe(11);
    expect(el.querySelector('[role="tablist"]')).not.toBeNull();
    expect(el.querySelector('app-deck-card-content')).not.toBeNull();
    expect(el.textContent).toContain('Card no longer in the card data');
  });

  it('H-662: shows the Deck detail title lock toggle: icon only, named "Lock deck" / "Unlock deck", aria-pressed', async () => {
    const el = section((await render()).fixture);
    const toggles = [...el.querySelectorAll<HTMLButtonElement>('app-lock-actions.variant-icon button.lock-toggle')];
    expect(toggles.map((b) => b.getAttribute('aria-label'))).toEqual(['Lock deck', 'Lock deck', 'Unlock deck']);
    expect(toggles.map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'true']);
    // H-670: the incomplete deck's toggle is operable (it answers with "Can't lock. Missing n cards.").
    expect(toggles.map((b) => b.getAttribute('aria-disabled'))).toEqual([null, null, null]);
    // Closed lock (Material `lock`) when locked, open lock (`lock_open`) when not: the shape, not colour alone.
    const kind = (b: HTMLButtonElement) => (/^M240-80q/.test(b.querySelector('path')!.getAttribute('d')!) ? 'lock' : /^M240-640h360/.test(b.querySelector('path')!.getAttribute('d')!) ? 'lock_open' : '?');
    expect(toggles.map(kind)).toEqual(['lock_open', 'lock_open', 'lock']);
  });

  it('H-391: Lock in on the preview deck flips to Unlock without touching the browser stores', async () => {
    const { fixture, stores } = await render();
    const el = section(fixture);
    const first = el.querySelector<HTMLButtonElement>('app-lock-actions button')!;
    first.click();
    await settle(fixture);
    const confirm = document.querySelector<HTMLButtonElement>('.confirm')!;
    expect(confirm.textContent!.trim()).toBe('Lock in');
    confirm.click();
    await settle(fixture);
    fixture.detectChanges();
    expect(el.querySelector('app-lock-actions button')!.textContent).toContain('Unlock');
    expect(await stores.raw.locks.load()).toBeNull();
  });
});
