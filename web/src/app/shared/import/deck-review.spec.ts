/**
 * H-450 (critique H-341 findings 1 and 2): the Deck Import review keeps each zone question's own select, and focus
 * never falls to <body> when the control the user pressed leaves the page. Input is the critique's Variant A shape:
 * no sections at the top, two Legends, unknown-type cards, lines not in the card data, Battlefields under Main Deck.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatSelect } from '@angular/material/select';
import { makeCatalog } from '../../core/decks/engine-fixtures';
import { type PreparedDeck, prepareDeckImport } from './deck-import';
import { DeckReview } from './deck-review';
import { parseCardText, sourceLines } from './parse-card-list';

const CATALOG = makeCatalog([
  { name: 'Varrow, Ember Warden', category: 'legend' },
  { name: 'Sorrel, Tide Reader', category: 'legend' },
  { name: 'Varrow, Ashen Blade', category: 'unknown' },
  { name: 'Ember Volley', category: 'unknown' },
  { name: 'Flashfire', category: 'unknown' },
  { name: 'Quiet Harbor', category: 'battlefield' },
  { name: 'Gallows Market', category: 'battlefield' },
  { name: 'Gust', category: 'spell' },
]);

const VARIANT_A = [
  '1 Varrow, Ember Warden',
  '1 Sorrel, Tide Reader',
  '3 Varrow, Ashen Blade',
  '3 Ember Volley',
  '2 Flashfire',
  '2 Nothing Like It',
  '1 Not A Card',
  'Main Deck:',
  '1 Quiet Harbor',
  '1 Gallows Market',
  '3 Gust',
].join('\n');

const prep = (text: string): PreparedDeck => prepareDeckImport(parseCardText(text), sourceLines(text), CATALOG);

type Fixture = ComponentFixture<DeckReview>;

async function settle(f: Fixture): Promise<void> {
  for (let i = 0; i < 4; i++) {
    await f.whenStable();
    f.detectChanges();
    await new Promise((r) => setTimeout(r, 0));
  }
}

async function setup(text = VARIANT_A): Promise<Fixture> {
  TestBed.configureTestingModule({ imports: [DeckReview] });
  const f = TestBed.createComponent(DeckReview);
  f.componentRef.setInput('prepared', prep(text));
  await settle(f);
  return f;
}

const el = (f: Fixture): HTMLElement => f.nativeElement;
const zoneSelects = (f: Fixture) =>
  f.debugElement.queryAll(By.css('mat-select.pick-zone')).map((d) => d.injector.get(MatSelect));
const promptOf = (s: MatSelect) =>
  (s._elementRef.nativeElement as HTMLElement).closest('.question')!.querySelector('p')!.textContent!.trim();
const active = () => document.activeElement as HTMLElement | null;

async function chooseZone(f: Fixture, index: number, label: string): Promise<void> {
  const host = el(f).querySelectorAll<HTMLElement>('mat-select.pick-zone')[index];
  host.querySelector<HTMLElement>('.mat-mdc-select-trigger')!.click();
  await settle(f);
  const option = Array.from(document.querySelectorAll<HTMLElement>('mat-option')).find(
    (o) => o.textContent?.trim() === label,
  )!;
  option.click();
  await settle(f);
}

function clickButton(f: Fixture, selector: string, index = 0): void {
  el(f).querySelectorAll<HTMLButtonElement>(selector)[index].click();
}

describe('DeckReview stable questions (H-450, critique H-341 finding 1)', () => {
  it('H-450 / DECK-035: answering the first PICK_ZONE with Champion leaves every other Section select empty', async () => {
    const f = await setup();
    expect(zoneSelects(f).map(promptOf)).toEqual([
      "Line 3: Varrow, Ashen Blade. Its card type isn't known, so pick its section.",
      "Line 4: Ember Volley. Its card type isn't known, so pick its section.",
      "Line 5: Flashfire. Its card type isn't known, so pick its section.",
    ]);
    await chooseZone(f, 0, 'Champion');
    const left = zoneSelects(f);
    expect(left.map(promptOf)).toEqual([
      "Line 4: Ember Volley. Its card type isn't known, so pick its section.",
      "Line 5: Flashfire. Its card type isn't known, so pick its section.",
    ]);
    // The placeholder shows, not the old question's answer.
    for (const s of left) {
      expect(s.value).toBeNull();
      expect(s.empty).toBe(true);
      expect((s._elementRef.nativeElement as HTMLElement).querySelector('.mat-mdc-select-value-text')).toBeNull();
    }
  });

  it('H-450 / DECK-035: each question keeps its own select instance when an earlier one leaves (stable track)', async () => {
    const f = await setup();
    const [, second, third] = zoneSelects(f);
    await chooseZone(f, 0, 'Main Deck');
    expect(zoneSelects(f)).toEqual([second, third]);
  });

  it('H-450 / DECK-033: the PICK_LEGEND select shows its answer once picked', async () => {
    const f = await setup();
    const legend = f.debugElement.query(By.css('mat-select.pick-legend')).injector.get(MatSelect);
    expect(legend.value).toBeNull();
    legend.open();
    await settle(f);
    Array.from(document.querySelectorAll<HTMLElement>('mat-option'))
      .find((o) => o.textContent?.trim() === 'Sorrel, Tide Reader')!
      .click();
    await settle(f);
    expect(legend.value).toBe('sorrel tide reader');
    expect(el(f).querySelector('.deck-name')).toHaveProperty('value', 'Sorrel, Tide Reader');
  });
});

describe('DeckReview focus moves (H-450, critique H-341 finding 2, WCAG 2.4.3)', () => {
  it('H-450: the review opens with the "Check the deck" heading, focusable by script', async () => {
    const f = await setup();
    const heading = el(f).querySelector<HTMLElement>('h3')!;
    expect(heading.textContent!.trim()).toBe('Check the deck');
    expect(heading.getAttribute('tabindex')).toBe('-1');
    f.componentInstance.focusStart();
    await settle(f);
    expect(active()).toBe(heading);
  });

  it('H-450 / DECK-041: Remove line focuses the next line\'s Remove line, then "Lines to fix", then "Check the deck"', async () => {
    const f = await setup();
    const removes = () => Array.from(el(f).querySelectorAll<HTMLElement>('ul.attention button.remove'));
    expect(removes().map((b) => b.getAttribute('aria-label'))).toEqual(['Remove line 6', 'Remove line 7']);
    removes()[0].focus();
    clickButton(f, 'ul.attention button.remove', 0);
    await settle(f);
    expect(active()?.getAttribute('aria-label')).toBe('Remove line 7');

    // Last line removed: the list (and its heading) is gone, so focus goes to the top heading.
    clickButton(f, 'ul.attention button.remove', 0);
    await settle(f);
    expect(el(f).querySelector('ul.attention')).toBeNull();
    expect(active()?.textContent?.trim()).toBe('Check the deck');
  });

  it('H-450 / DECK-041: removing the last of several lines focuses the "Lines to fix" heading', async () => {
    const f = await setup();
    clickButton(f, 'ul.attention button.remove', 1);
    await settle(f);
    expect(active()?.textContent?.trim()).toBe('Lines to fix');
    expect(active()?.getAttribute('tabindex')).toBe('-1');
  });

  it('H-450 / DECK-023: Move to focuses the next Move to, then "Check the deck"', async () => {
    const f = await setup();
    const moves = () => Array.from(el(f).querySelectorAll<HTMLElement>('button.move')).map((b) => b.textContent!.trim());
    expect(moves()).toEqual(['Move to Battlefields', 'Move to Battlefields']);
    const second = el(f).querySelectorAll<HTMLElement>('button.move')[1];
    clickButton(f, 'button.move', 0);
    await settle(f);
    expect(moves()).toHaveLength(1);
    expect(active()).toBe(second);
    clickButton(f, 'button.move', 0);
    await settle(f);
    expect(moves()).toHaveLength(0);
    expect(active()?.textContent?.trim()).toBe('Check the deck');
  });

  it('H-450 / DECK-035: an answered PICK_ZONE focuses the next question\'s select, the last one "Check the deck"', async () => {
    const f = await setup();
    await chooseZone(f, 0, 'Main Deck');
    const [next] = zoneSelects(f);
    expect(active()).toBe(next._elementRef.nativeElement);
    expect(promptOf(next)).toContain('Line 4: Ember Volley.');

    await chooseZone(f, 0, 'Main Deck');
    await chooseZone(f, 0, 'Main Deck');
    expect(zoneSelects(f)).toHaveLength(0);
    expect(document.activeElement).not.toBe(document.body);
    expect(active()?.textContent?.trim()).toBe('Check the deck');
  });

  it('H-450 / DECK-035: Put all in Main Deck answers every PICK_ZONE and focuses "Check the deck"', async () => {
    const f = await setup();
    clickButton(f, 'button.all-main');
    await settle(f);
    expect(zoneSelects(f)).toHaveLength(0);
    expect(el(f).querySelector('button.all-main')).toBeNull();
    expect(active()?.textContent?.trim()).toBe('Check the deck');
  });
});
