import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
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
