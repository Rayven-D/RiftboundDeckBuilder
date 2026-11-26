import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { provideRouter } from '@angular/router';
import { CardData, CatalogResult, DEV_SAMPLE_DECKS_KEY } from '../../core/cards/card-data';
import { AppStores } from '../../core/storage/app-stores';
import { BrowserStores, createBrowserStores } from '../../core/storage/browser-stores';
import { MemoryBackend } from '../../core/storage/kv-backend';
import { generateLargeSample, sampleDeck } from '../../shared/collection/sample-data';
import { StyleguidePage } from './styleguide-page';

let stores: BrowserStores;

async function render() {
  stores = createBrowserStores(new MemoryBackend(), {
    now: () => Date.now(),
    changed: () => undefined,
    readOnly: () => false,
  });
  const catalog = generateLargeSample(3).catalog;
  const cardData: Partial<CardData> = {
    reload: async (): Promise<CatalogResult> => ({ status: 'ok', catalog }),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
      { provide: AppStores, useValue: { stores } },
      { provide: CardData, useValue: cardData },
    ],
  });
  const fixture = TestBed.createComponent(StyleguidePage);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

function button(el: HTMLElement, label: string): HTMLButtonElement {
  return [...el.querySelectorAll('button')].find((b) => b.textContent?.includes(label))!;
}

async function settle(fixture: Awaited<ReturnType<typeof render>>) {
  for (let i = 0; i < 5; i++) {
    await new Promise((r) => setTimeout(r, 0));
    await fixture.whenStable();
  }
}

describe('StyleguidePage dev sample loader (H-086 review 1)', () => {
  afterEach(() => {
    localStorage.removeItem(DEV_SAMPLE_DECKS_KEY);
    vi.restoreAllMocks();
  });

  it('Clear asks first, naming the collection, decks and locks; cancelling deletes nothing', async () => {
    const fixture = await render();
    await stores.raw.decks.put(sampleDeck(1, 'Mine', []));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    button(fixture.nativeElement, 'Clear sample data').click();
    await settle(fixture);
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm.mock.calls[0][0]).toMatch(/collection.*locks.*decks/);
    expect(await stores.raw.decks.list()).toHaveLength(1);
  });

  it('Load records the deck ids it wrote; Clear deletes only those decks', async () => {
    const fixture = await render();
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

describe('StyleguidePage Buttons section (H-102)', () => {
  it('H-102: the Buttons section renders a danger button and a disabled danger button', async () => {
    const fixture = await render();
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

describe('StyleguidePage Decks section (H-391)', () => {
  function section(fixture: Awaited<ReturnType<typeof render>>): HTMLElement {
    return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('section[aria-labelledby="sg-decks"]')!;
  }

  it('H-391: shows deck tiles for every ownership group, with the engine lines', async () => {
    const el = section(await render());
    const tiles = [...el.querySelectorAll<HTMLElement>('app-deck-tile')];
    expect(tiles.length).toBe(10);
    const text = tiles.map((t) => t.textContent!.replace(/\s+/g, ' '));
    expect(text.some((t) => t.includes('Ready to build'))).toBe(true);
    expect(text.some((t) => t.includes('Partly available') && t.includes('1 banned card'))).toBe(true);
    expect(text.some((t) => t.includes('None available'))).toBe(true);
    expect(text.some((t) => /Locked · \d+ cards? short/.test(t))).toBe(true);
    expect(text.some((t) => t.includes('No cards to count'))).toBe(true);
    expect(text.some((t) => t.includes('Read-only'))).toBe(true);
    expect(text.filter((t) => t.includes('Ownership unavailable')).length).toBe(2);
    expect(el.querySelectorAll('app-deck-tile app-deck-mark').length).toBeGreaterThan(0);
  });

  it('H-391: shows status chips, lock badges, lock actions, card tiles, rows and the panel', async () => {
    const el = section(await render());
    const chips = [...el.querySelectorAll('.row-items app-deck-status-chip .chip')].map((c) => c.textContent!.trim());
    // H-400: the chip has no locked / short kinds (the lock is app-lock-badge); locked and unavailable render nothing.
    expect(chips).toEqual(['Ready to build', 'Partly available', 'None available']);
    expect(el.querySelector('.column-items app-lock-badge')!.textContent).toContain('Locked in on');
    const actions = [...el.querySelectorAll<HTMLButtonElement>('app-lock-actions button')];
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

  it('H-391: Lock in on the preview deck flips to Unlock without touching the browser stores', async () => {
    const fixture = await render();
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
