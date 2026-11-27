import { TestBed } from '@angular/core/testing';
import type { DeckLockState } from '../../core/decks';
import { LockBadge } from './lock-badge';

/** SPEC-008 SHARE-041 / SHARE-033 / SHARE-053 (b): the lock badge on the deck tile (H-662: no lock date anywhere). */
function render(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(LockBadge);
  for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

const text = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

function lockState(over: Partial<DeckLockState> = {}): DeckLockState {
  return { deckId: 'd1', locked: true, lockedAt: '2026-11-23T10:00:00.000Z', lockedNames: [], complete: true, ...over } as DeckLockState;
}

describe('LockBadge', () => {
  it('H-662: "Locked" with no "Locked in on <date>", even when the lock has a lockedAt', () => {
    const el = render({ lock: lockState(), label: 'Locked' });
    expect(text(el)).toBe('Locked');
    expect(el.textContent).not.toContain('Locked in on');
  });

  it('SHARE-041 v0.6 (H-665): one badge style only; no "cards short" variant exists', () => {
    const el = render({ lock: lockState(), label: 'Locked' });
    expect(el.querySelector('.badge--short')).toBeNull();

  });

  it('SHARE-041 / SHARE-053 (b) deck tile: the label alone (no lock) renders "Locked"', () => {
    expect(text(render({ label: 'Locked' }))).toBe('Locked');
  });

  it('renders nothing without a label, or when the lock says the deck is not locked', () => {
    expect(render({ label: null }).querySelector('.badge')).toBeNull();
    expect(render({ lock: lockState({ locked: false }), label: 'Locked' }).querySelector('.badge')).toBeNull();
  });
});
