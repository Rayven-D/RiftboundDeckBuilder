import { reflectComponentType } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { OwnershipFilter } from '../../core/decks';
import { DeckStatusChip } from './deck-status-chip';

/** SPEC-005 OWN-102 ownership chip (H-400: only ready / partial / none; the lock is the separate app-lock-badge). */
function render(filter: OwnershipFilter) {
  const fixture = TestBed.createComponent(DeckStatusChip);
  fixture.componentRef.setInput('filter', filter);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

const text = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

describe('DeckStatusChip', () => {
  it('OWN-102: Ready to build / Partly available / None available, icon + text', () => {
    expect(['ready', 'partial', 'none'].map((f) => text(render(f as OwnershipFilter).querySelector('.chip')))).toEqual([
      'Ready to build',
      'Partly available',
      'None available',
    ]);
    expect(render('partial').querySelector('.chip--partial app-icon')).not.toBeNull();
  });

  it('H-400 / OWN-065: locked and unavailable render no chip, and there is no lockBadge input or locked / short kind', () => {
    for (const f of ['locked', 'unavailable'] as OwnershipFilter[]) expect(render(f).querySelector('.chip')).toBeNull();
    expect(reflectComponentType(DeckStatusChip)!.inputs.map((i) => i.propName)).toEqual(['filter']);
    expect(document.querySelector('.chip--locked, .chip--short')).toBeNull();
  });
});
