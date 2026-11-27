/**
 * H-676 (RJ 2026-11-26), SPEC-002 LEGAL-R09 (b), SPEC-006 DECK-107 / AC 42, SPEC-005 OWN-117 / AC 47: a reason that
 * lists cards is one count line "<label> {n} cards" with the names behind "Show cards" / "Hide cards".
 */
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import type { NotEvaluatedItem } from '../../core/legality/types';
import { openRuleCheck } from './deck-dialogs';
import { NotCheckedList, notCheckedLines } from './not-checked-list';

const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const item = (label: string, cardNames: string[]): NotEvaluatedItem => ({ text: `${label}: ${cardNames.join(', ')}`, label, cardNames });
const names31 = Array.from({ length: 31 }, (_, i) => `Card ${i + 1}`);

async function render(items: NotEvaluatedItem[]) {
  TestBed.configureTestingModule({ imports: [NotCheckedList] });
  const f = TestBed.createComponent(NotCheckedList);
  f.componentRef.setInput('items', items);
  f.detectChanges();
  await f.whenStable();
  const el = f.nativeElement as HTMLElement;
  const toggles = () => [...el.querySelectorAll<HTMLButtonElement>('button.toggle')];
  const click = async (i = 0) => {
    toggles()[i].click();
    f.detectChanges();
    await f.whenStable();
  };
  return { el, toggles, click };
}

describe('H-676 / DECK-107 count lines', () => {
  it('H-676 AC 42 count: 31 names read "Missing champion data for 31 cards"', () => {
    const [line] = notCheckedLines([item('Missing champion data for', names31)]);
    expect(line.text).toBe('Missing champion data for 31 cards');
    expect(line.names).toEqual(names31);
  });

  it('H-676 AC 42 singular: "Missing champion data for 1 card", "1 unknown card not checked"', () => {
    expect(notCheckedLines([item('Missing champion data for', ['Kennen'])])[0].text).toBe('Missing champion data for 1 card');
    expect(notCheckedLines([item('Unknown cards not checked', ['Foo'])])[0].text).toBe('1 unknown card not checked');
  });

  it('H-676 AC 42 the other list reasons: Set status, Printing type, Unknown cards', () => {
    expect(notCheckedLines([item('Set status unknown for', ['A', 'B'])])[0].text).toBe('Set status unknown for 2 cards');
    expect(notCheckedLines([item('Printing type unknown for', ['A', 'B', 'C'])])[0].text).toBe('Printing type unknown for 3 cards');
    expect(notCheckedLines([item('Unknown cards not checked', ['A', 'B'])])[0].text).toBe('2 unknown cards not checked');
  });

  it('H-676 AC 42 a name with a comma is one card (the count comes from cardNames, not the text)', () => {
    expect(notCheckedLines([item('Missing domain data for', ['Fizz, Trickster', 'Gust'])])[0].text).toBe('Missing domain data for 2 cards');
  });

  it('H-676 AC 42 a reason with no card list shows its text', () => {
    const text = "There is no Legend with domain data, so the deck's domains can't be checked.";
    expect(notCheckedLines([{ text }])).toEqual([{ text, names: null }]);
  });
});

describe('H-676 / DECK-107 disclosure', () => {
  it('H-676 AC 42 / AC 47 hidden by default: count line and "Show cards" (aria-expanded false), no names', async () => {
    const { el, toggles } = await render([item('Missing champion data for', names31)]);
    expect(text(el.querySelector('li'))).toContain('Missing champion data for 31 cards');
    expect(text(el)).not.toContain('Card 1');
    expect(text(el)).not.toContain(':');
    expect(text(toggles()[0])).toBe('Show cards');
    expect(toggles()[0].getAttribute('aria-expanded')).toBe('false');
  });

  it('H-676 AC 42 expand and collapse: the names show in order, "Hide cards", then hidden again', async () => {
    const { el, toggles, click } = await render([item('Missing champion data for', names31)]);
    await click();
    expect(toggles()[0].getAttribute('aria-expanded')).toBe('true');
    expect(text(toggles()[0])).toBe('Hide cards');
    expect([...el.querySelectorAll('ul.names li')].map((li) => text(li))).toEqual(names31);
    expect(toggles()[0].getAttribute('aria-controls')).toBe(el.querySelector('ul.names')!.id);
    await click();
    expect(toggles()[0].getAttribute('aria-expanded')).toBe('false');
    expect(text(toggles()[0])).toBe('Show cards');
    expect(el.querySelector('ul.names')).toBeNull();
  });

  it('H-676 AC 42 two reasons: two count lines that expand independently', async () => {
    const { el, toggles, click } = await render([item('Missing champion data for', ['A', 'B']), item('Missing domain data for', ['C'])]);
    expect(toggles()).toHaveLength(2);
    await click(1);
    expect(toggles()[0].getAttribute('aria-expanded')).toBe('false');
    expect(toggles()[1].getAttribute('aria-expanded')).toBe('true');
    expect(el.querySelectorAll('ul.names')).toHaveLength(1);
  });

  it('H-676 AC 42 a reason with no card list has no button', async () => {
    const { el } = await render([{ text: "There is no Legend with domain data, so the deck's domains can't be checked." }]);
    expect(el.querySelector('button')).toBeNull();
  });
});

describe('H-676 AC 47 / OWN-117 Rule check dialog', () => {
  it('H-676 AC 47: the dialog shows "Missing champion data for 31 cards" with "Show cards", and reopening starts collapsed', async () => {
    TestBed.configureTestingModule({ providers: [{ provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } }] });
    const dialog = TestBed.inject(MatDialog);
    const data = {
      label: 'Not fully checked',
      verdict: 'incomplete' as const,
      failed: [],
      notChecked: [],
      notCheckedItems: [item('Missing champion data for', names31)],
      banned: [],
    };
    const open = async () => {
      const ref = openRuleCheck(dialog, data);
      await new Promise((r) => setTimeout(r, 20));
      TestBed.inject(ApplicationRef).tick();
      return ref;
    };
    let ref = await open();
    const el = () => document.querySelector('mat-dialog-container')!;
    expect(text(el().querySelector('li'))).toContain('Missing champion data for 31 cards');
    const btn = () => el().querySelector<HTMLButtonElement>('button.toggle')!;
    expect(btn().getAttribute('aria-expanded')).toBe('false');
    expect(el().querySelector('ul.names')).toBeNull();
    btn().click();
    await new Promise((r) => setTimeout(r, 20));
    TestBed.inject(ApplicationRef).tick();
    expect(el().querySelectorAll('ul.names li')).toHaveLength(31);
    expect(text(btn())).toBe('Hide cards');
    ref.close();
    await new Promise((r) => setTimeout(r, 50));
    ref = await open();
    expect(btn().getAttribute('aria-expanded')).toBe('false');
    ref.close();
  });
});
