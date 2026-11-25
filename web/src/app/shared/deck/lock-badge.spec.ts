import { TestBed } from '@angular/core/testing';
import type { DeckLockState } from '../../core/decks';
import { LockBadge } from './lock-badge';

/** SPEC-008 SHARE-041 / SHARE-030 / SHARE-053 (b): the lock badge on the Deck detail header and on the deck tile. */
function render(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(LockBadge);
  for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

const text = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

function lockState(over: Partial<DeckLockState> = {}): DeckLockState {
  return { deckId: 'd1', locked: true, lockedAt: '2026-11-23T10:00:00.000Z', complete: true, short: false, cardsShort: [], ...over } as DeckLockState;
}

describe('LockBadge', () => {
  it('SHARE-041 header: "Locked" with "Locked in on <date>"', () => {
    const el = render({ lock: lockState(), label: 'Locked' });
    expect(text(el.querySelector('.label'))).toBe('Locked');
    expect(text(el.querySelector('.date'))).toMatch(/^· Locked in on [A-Z][a-z]{2} \d{1,2}, 2026$/);
  });

  it('SHARE-030 an unparseable lockedAt shows the badge without the date', () => {
    const el = render({ lock: lockState({ lockedAt: 'not a date' }), label: 'Locked' });
    expect(text(el.querySelector('.label'))).toBe('Locked');
    expect(el.querySelector('.date')).toBeNull();
  });

  it('SHARE-033 short: warning style and "Locked · 2 cards short"', () => {
    const el = render({ lock: lockState({ complete: false, short: true }), label: 'Locked · 2 cards short' });
    expect(el.querySelector('.badge--short')).not.toBeNull();
    expect(text(el.querySelector('.label'))).toBe('Locked · 2 cards short');
  });

  it('SHARE-041 / SHARE-053 (b) deck tile: the label alone (no lock, showDate false) renders "Locked" without a date', () => {
    const el = render({ label: 'Locked', showDate: false });
    expect(text(el)).toBe('Locked');
    expect(el.querySelector('.date')).toBeNull();
  });

  it('renders nothing without a label, or when the lock says the deck is not locked', () => {
    expect(render({ label: null }).querySelector('.badge')).toBeNull();
    expect(render({ lock: lockState({ locked: false }), label: 'Locked' }).querySelector('.badge')).toBeNull();
  });
});
