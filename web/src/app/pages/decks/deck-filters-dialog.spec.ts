/**
 * Phone Filters dialog (OWN-105 (a), [[Decks Components]] §4): H-468 (7) Ownership counts like the desktop chips.
 */
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DeckListQuery } from '../../shared/deck/deck-list';
import { DeckFiltersDialog, DeckFiltersDialogData } from './deck-filters-dialog';

const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

const QUERY: DeckListQuery = { text: '', own: null, lock: null, legality: null, source: null, sort: 'updated' };

function render(data: Partial<DeckFiltersDialogData> = {}) {
  const calls: DeckListQuery[] = [];
  const full: DeckFiltersDialogData = {
    query: QUERY,
    formatName: 'Standard',
    count: () => 3,
    ownCounts: (q) => {
      calls.push(q);
      // Counts follow the draft's other filters, as the desktop chips do (here: Lock "Locked" → only 1 deck).
      return q.lock === 'locked' ? { all: 1, ready: 0, partial: 1, none: 0 } : { all: 3, ready: 1, partial: 1, none: 1 };
    },
    ownershipDisabled: false,
    lockDisabled: false,
    ...data,
  };
  TestBed.configureTestingModule({
    imports: [DeckFiltersDialog],
    providers: [
      { provide: MAT_DIALOG_DATA, useValue: full },
      { provide: MatDialogRef, useValue: { close: vi.fn() } },
    ],
  });
  const fixture = TestBed.createComponent(DeckFiltersDialog);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const ownLabels = () => Array.from(el.querySelectorAll('fieldset')[0].querySelectorAll('label'));
  return { fixture, el, ownLabels, calls };
}

describe('DeckFiltersDialog (phone, OWN-105 (a))', () => {
  it('H-468 (7) / OWN-102: the Ownership options show their deck counts, heard as "Ready to build, 1 deck"', () => {
    const { ownLabels } = render();
    const labels = ownLabels();
    expect(labels.map((l) => text(l.querySelector('.n')))).toEqual([', 3 decks', ', 1 deck', ', 1 deck', ', 1 deck']);
    // Visible: the label then the number (the comma and "deck(s)" are for screen readers only).
    const visible = (l: Element) => {
      const c = l.cloneNode(true) as Element;
      c.querySelectorAll('.visually-hidden').forEach((n) => n.remove());
      return text(c);
    };
    expect(labels.map(visible)).toEqual(['All 3', 'Ready to build 1', 'Partly available 1', 'None available 1']);
  });

  it('H-468 (7): the counts follow the draft (choosing Lock "Locked" recounts before Show)', () => {
    const { el, fixture, ownLabels } = render();
    const locked = Array.from(el.querySelectorAll<HTMLInputElement>('input[name="lock"]'))[1];
    locked.checked = true;
    locked.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(ownLabels().map((l) => text(l.querySelector('.n')))).toEqual([', 1 deck', ', 0 decks', ', 1 deck', ', 0 decks']);
  });
});
