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
  it('H-450 / DECK-035: answering the first PICK_ZONE with Chosen Champion leaves every other Section select empty', async () => {
    const f = await setup();
    expect(zoneSelects(f).map(promptOf)).toEqual([
      "Line 3: Varrow, Ashen Blade. Its card type isn't known, so pick its section.",
      "Line 4: Ember Volley. Its card type isn't known, so pick its section.",
      "Line 5: Flashfire. Its card type isn't known, so pick its section.",
    ]);
    await chooseZone(f, 0, 'Chosen Champion');
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

describe('DeckReview status and screen-reader structure (H-451, critique H-341 findings 6, 11, 12, 17)', () => {
  const status = (f: Fixture) => el(f).querySelector<HTMLElement>('[role="status"]#deck-review-status');
  const CLEAN = 'Legend:\n1 Varrow, Ember Warden\nChampion:\n1 Varrow, Ashen Blade\nMain Deck:\n3 Gust';

  it('H-451 / DECK-038 / DECK-041: one status region is always present: blockers while blocked, "Ready to save." when not', async () => {
    const f = await setup();
    expect(el(f).querySelectorAll('[role="status"]')).toHaveLength(1);
    expect(status(f)!.textContent).toContain('2 cards need attention');
    expect(status(f)!.textContent).toContain('questions to answer');
  });

  it('H-451 / DECK-038: with nothing blocking, the status reads "Ready to save."', async () => {
    const clean = await setup(CLEAN);
    expect(status(clean)!.textContent!.trim()).toBe('Ready to save.');
    expect(status(clean)!.classList).toContain('ready');
  });

  it('H-451 / DECK-070: an empty name is in the status, the field is required and aria-invalid="true"', async () => {
    const f = await setup(CLEAN);
    const name = el(f).querySelector<HTMLInputElement>('input.deck-name')!;
    expect(name.required).toBe(true);
    name.value = '';
    name.dispatchEvent(new Event('input'));
    await settle(f);
    expect(status(f)!.textContent!.trim()).toBe('Give the deck a name.');
    expect(name.getAttribute('aria-invalid')).toBe('true');
    expect(el(f).querySelector('mat-form-field.name-field')!.classList).toContain('mat-form-field-invalid');
    name.value = 'Mine';
    name.dispatchEvent(new Event('input'));
    await settle(f);
    expect(name.getAttribute('aria-invalid')).toBe('false');
    expect(status(f)!.textContent!.trim()).toBe('Ready to save.');
  });

  it('H-451 / DECK-035: each zone question is a group named by its prompt; selects name their card and line', async () => {
    const f = await setup();
    const zones = Array.from(el(f).querySelectorAll<HTMLElement>('mat-select.pick-zone'));
    expect(zones.map((z) => z.getAttribute('aria-label'))).toEqual([
      'Section for Varrow, Ashen Blade (line 3)',
      'Section for Ember Volley (line 4)',
      'Section for Flashfire (line 5)',
    ]);
    for (const q of Array.from(el(f).querySelectorAll<HTMLElement>('.question'))) {
      expect(q.getAttribute('role')).toBe('group');
      const prompt = document.getElementById(q.getAttribute('aria-labelledby')!);
      expect(prompt?.tagName).toBe('P');
      expect(q.contains(prompt)).toBe(true);
      expect(q.querySelector('mat-select')!.getAttribute('aria-describedby')).toContain(prompt!.id);
    }
  });

  it('H-451 / DECK-033: open questions show "Needs an answer" in text; answered ones do not', async () => {
    const f = await setup();
    const tagged = () =>
      Array.from(el(f).querySelectorAll<HTMLElement>('.question')).map((q) => q.querySelector('.needs-answer')?.textContent?.trim() ?? null);
    expect(tagged().every((t) => t === 'Needs an answer')).toBe(true);
    const legend = f.debugElement.query(By.css('mat-select.pick-legend')).injector.get(MatSelect);
    legend.open();
    await settle(f);
    Array.from(document.querySelectorAll<HTMLElement>('mat-option'))
      .find((o) => o.textContent?.trim() === 'Varrow, Ember Warden')!
      .click();
    await settle(f);
    const legendQ = el(f).querySelector('mat-select.pick-legend')!.closest('.question')!;
    expect(legendQ.querySelector('.needs-answer')).toBeNull();
  });

  it('H-451: h3 "Check the deck" opens the review and h3 "Check these" heads the warnings list', async () => {
    const f = await setup();
    const headings = Array.from(el(f).querySelectorAll('h3')).map((h) => h.textContent!.trim());
    expect(headings[0]).toBe('Check the deck');
    expect(headings).toContain('Check these');
    const checks = el(f).querySelector('h3.checks-heading')!;
    expect(checks.nextElementSibling?.matches('ul.checks')).toBe(true);
  });

  it('H-451 / DECK-071: the Link warning shows under the field only after blur, and is its description', async () => {
    const f = await setup(CLEAN);
    const link = el(f).querySelector<HTMLInputElement>('input.source-url')!;
    link.value = 'h';
    link.dispatchEvent(new Event('input'));
    await settle(f);
    expect(el(f).querySelector('.field-warn')).toBeNull();
    expect(el(f).textContent).not.toContain("This link isn't an http or https address");
    link.dispatchEvent(new Event('blur'));
    await settle(f);
    const warn = el(f).querySelector<HTMLElement>('.field-warn')!;
    expect(warn.textContent).toContain("This link isn't an http or https address, so it is kept as text.");
    expect(link.getAttribute('aria-describedby')).toContain(warn.id);
    // Not repeated in the warnings list above.
    expect(el(f).querySelector('ul.checks')).toBeNull();
    link.value = 'https://example.com/deck';
    link.dispatchEvent(new Event('input'));
    link.dispatchEvent(new Event('blur'));
    await settle(f);
    expect(el(f).querySelector('.field-warn')).toBeNull();
  });

  it('H-451: focusFirstOpen goes to the first line to fix first', async () => {
    const f = await setup();
    f.componentInstance.focusFirstOpen();
    await settle(f);
    expect(active()?.closest('ul.attention')).not.toBeNull();
  });

  it('H-451: with no line to fix, focusFirstOpen goes to the first open question', async () => {
    const q = await setup('3 Flashfire\nMain Deck:\n3 Gust');
    q.componentInstance.focusFirstOpen();
    await settle(q);
    expect(active()?.closest('.question.open')).not.toBeNull();
  });

  it('H-451: with only an empty name, focusFirstOpen goes to the name field', async () => {
    const n = await setup(CLEAN);
    const name = el(n).querySelector<HTMLInputElement>('input.deck-name')!;
    name.value = '';
    name.dispatchEvent(new Event('input'));
    await settle(n);
    (document.activeElement as HTMLElement | null)?.blur();
    n.componentInstance.focusFirstOpen();
    await settle(n);
    expect(active()).toBe(name);
  });
});

describe('DeckReview champion and placement wording (H-452, critique H-341 §4)', () => {
  const pickOption = async (f: Fixture, selector: string, label: string) => {
    f.debugElement.query(By.css(selector)).injector.get(MatSelect).open();
    await settle(f);
    Array.from(document.querySelectorAll<HTMLElement>('mat-option'))
      .find((o) => o.textContent?.trim() === label)!
      .click();
    await settle(f);
  };
  const VARIANT_B = [
    'Legend:',
    '1 Varrow, Ember Warden',
    'Champion:',
    '2 Varrow, Ashen Blade',
    '1 Ember Volley',
    '1 Flashfire',
    'Main Deck:',
    '3 Gust',
  ].join('\n');

  it('H-452 / DECK-034 (b): the Champion: prompt says the other cards go in the Main Deck', async () => {
    const f = await setup(VARIANT_B);
    const prompt = el(f).querySelector('mat-select.pick-champion')!.closest('.question')!.querySelector('p')!;
    expect(prompt.textContent!.trim()).toBe("Pick the deck's Chosen Champion. The other Champion cards go in the Main Deck.");
    expect(el(f).querySelector('.moved')).toBeNull();
  });

  it('H-452 / DECK-034 (b) / AC 31: after the pick, "Also in the Main Deck:" lists the 3 moved copies with their reasons', async () => {
    const f = await setup(VARIANT_B);
    await pickOption(f, 'mat-select.pick-champion', 'Varrow, Ashen Blade');
    const q = el(f).querySelector('mat-select.pick-champion')!.closest('.question')!;
    expect(q.querySelector('.also-main-heading')!.textContent!.trim()).toBe('Also in the Main Deck:');
    const rows = Array.from(q.querySelectorAll('ul.moved li')).map((li) => li.textContent!.replace(/\s+/g, ' ').trim());
    expect(rows).toEqual([
      '1 Varrow, Ashen Blade 1 copy is the Chosen Champion; the other copy moves to the Main Deck',
      '1 Ember Volley Not picked as Chosen Champion, so it moves to the Main Deck',
      '1 Flashfire Not picked as Chosen Champion, so it moves to the Main Deck',
    ]);
  });

  it('H-452 / DECK-027 / AC 32: one champion line with 2 copies lists the extra copy with no question', async () => {
    const f = await setup('Legend:\n1 Varrow, Ember Warden\nChampion:\n2 Varrow, Ashen Blade\nMain Deck:\n3 Gust');
    expect(el(f).querySelector('.question')).toBeNull();
    const block = el(f).querySelector('.also-main-block')!;
    expect(block.querySelector('.also-main-heading')!.textContent!.trim()).toBe('Also in the Main Deck:');
    expect(block.querySelector('ul.moved li')!.textContent!.replace(/\s+/g, ' ').trim()).toBe(
      '1 Varrow, Ashen Blade 1 copy is the Chosen Champion; the other copy moves to the Main Deck',
    );
  });

  it('DECK-104 / AC 39: a Legend line in Lines to fix holds PICK_LEGEND with no prompt; removing it asks "no Legend"', async () => {
    const f = await setup('Legend:\n1 Varrow, Ember Wardn\nChampion:\n1 Varrow, Ashen Blade\nMain Deck:\n3 Gust');
    f.componentRef.setInput('today', () => new Date(2026, 10, 23));
    await settle(f);
    const status = () => document.getElementById('deck-review-status')!.textContent!.replace(/\s+/g, ' ').trim();
    const fix = Array.from(el(f).querySelectorAll('ul.attention li')).map((li) => li.textContent!.replace(/\s+/g, ' ').trim());
    expect(fix).toEqual(['Line 2: No card named "Varrow, Ember Wardn" in the card data. Remove line']);
    expect(status()).toBe('1 card needs attention');
    expect(el(f).querySelector('.question')).toBeNull();
    expect(el(f).querySelector('mat-select.pick-legend')).toBeNull();
    expect(el(f).textContent).not.toContain('This list has no Legend.');
    expect(el(f).textContent).not.toMatch(/to answer|Legend on line/);
    expect(el(f).querySelector<HTMLInputElement>('input.deck-name')!.value).toBe('Imported deck Nov 23, 2026');

    clickButton(f, 'ul.attention button.remove');
    await settle(f);
    const prompt = el(f).querySelector('mat-select.pick-legend')!.closest('.question')!.querySelector('p')!;
    expect(prompt.textContent!.trim()).toBe('This list has no Legend. Pick one, or leave it empty.');
    expect(status()).toBe('1 question to answer');
    expect(el(f).querySelector('.removed-note')!.textContent).toContain('line 2 (1 Varrow, Ember Wardn)');
  });

  it('H-452 / DECK-036: with no Legend line at all the prompt stays "This list has no Legend."', async () => {
    const f = await setup('Main Deck:\n3 Gust\n1 Not A Card');
    const prompt = el(f).querySelector('mat-select.pick-legend')!.closest('.question')!.querySelector('p')!;
    expect(prompt.textContent!.trim()).toBe('This list has no Legend. Pick one, or leave it empty.');
  });

  it('H-452 / DECK-030: "Lines without a section" with the new note; user-placed lines say "You picked this section"', async () => {
    const f = await setup('1 Quiet Harbor\n2 Flashfire\nLegend: 1 Varrow, Ember Warden\nChampion: 1 Varrow, Ashen Blade');
    await chooseZone(f, 0, 'Main Deck');
    const headings = Array.from(el(f).querySelectorAll('h3')).map((h) => h.textContent!.trim());
    expect(headings).toContain('Lines without a section');
    expect(headings).not.toContain('Placed by card type');
    expect(el(f).textContent).toContain(
      'These lines had no section label, so they were placed by card type or by your answers. Change any that are wrong.',
    );
    const reasons = Array.from(el(f).querySelectorAll('ul.inferred li')).map((li) => li.querySelector('.reason')!.textContent!.trim());
    expect(reasons).toEqual(['Card type is Battlefield', 'You picked this section']);
  });

  it('H-452 / DECK-042: the left-out note names the lines (Variant A: the unpicked Legend and removed lines)', async () => {
    const f = await setup();
    await pickOption(f, 'mat-select.pick-legend', 'Varrow, Ember Warden');
    clickButton(f, 'ul.attention button.remove', 0);
    await settle(f);
    expect(el(f).querySelector('.removed-note')!.textContent!.trim()).toBe(
      "2 lines are left out of the deck: line 6 (2 Nothing Like It), line 2 (Sorrel, Tide Reader). They will be listed on the deck's page.",
    );
    clickButton(f, 'ul.attention button.remove', 0);
    await settle(f);
    expect(el(f).querySelector('.removed-note')!.textContent).toContain('3 lines are left out of the deck: line 6');
  });

  it('H-452 / DECK-015: a code-used warning has a Remove line that leaves the line out', async () => {
    const catalogWithCode = makeCatalog([
      { name: 'Varrow, Ember Warden', category: 'legend' },
      { name: 'Gust', category: 'spell' },
    ]);
    // Every fixture printing is OGN 001; give Gust its own number so the code resolves.
    const gust = Object.values(catalogWithCode.printings).find((x) => x.cardKey === 'gust')!;
    catalogWithCode.printings[gust.printingId] = { ...gust, collectorNumber: '012' };
    const text = 'Legend: 1 Varrow, Ember Warden\nMain Deck:\n3 Noxus Hopeful (OGN-012)';
    TestBed.configureTestingModule({ imports: [DeckReview] });
    const f = TestBed.createComponent(DeckReview);
    f.componentRef.setInput('prepared', prepareDeckImport(parseCardText(text), sourceLines(text), catalogWithCode));
    await settle(f);
    const remove = el(f).querySelector<HTMLButtonElement>('button.remove-used')!;
    expect(remove.closest('li')!.textContent).toContain('so that card was used.');
    expect(remove.getAttribute('aria-label')).toBe('Remove line 3');
    remove.click();
    await settle(f);
    expect(el(f).querySelector('button.remove-used')).toBeNull();
    expect(f.componentInstance.view().draft.main).toEqual([]);
    expect(el(f).querySelector('.removed-note')!.textContent).toContain('line 3 (Gust)');
    expect(active()?.textContent?.trim()).toBe('Check the deck');
  });
});

describe('DeckReview layout labels (H-453, critique H-341 finding 16)', () => {
  it('H-453 / DECK-034: the counts line says "Chosen Champion 1"', async () => {
    const f = await setup('Legend:\n1 Varrow, Ember Warden\nChampion:\n1 Varrow, Ashen Blade\nMain Deck:\n3 Gust');
    const counts = Array.from(el(f).querySelectorAll('.zone-counts span')).map((s) => s.textContent!.trim());
    expect(counts).toEqual(['Legend 1', 'Chosen Champion 1', 'Main Deck 3']);
  });

  it('H-453: Section select options say "Chosen Champion", never "Champion"', async () => {
    const f = await setup();
    el(f).querySelector<HTMLElement>('mat-select.pick-zone .mat-mdc-select-trigger')!.click();
    await settle(f);
    const options = Array.from(document.querySelectorAll('mat-option')).map((o) => o.textContent!.trim());
    expect(options).toEqual(['Legend', 'Chosen Champion', 'Main Deck', 'Battlefields', 'Rune Pool', 'Sideboard']);
  });
});
