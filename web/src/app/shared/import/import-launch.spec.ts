/** SPEC-010 SYNC-159 (c) launch rule and the H-189 focus return after an import dialog. */
import { dialogOpener, importFocusTarget, launchDecision } from './import-launch';

describe('SYNC-159 (c) launchDecision', () => {
  it('SYNC-159 only the value 1 counts; waits, opens or drops by page state', () => {
    expect(launchDecision(null, 'ready')).toBe('none');
    expect(launchDecision('yes', 'ready')).toBe('none');
    expect(launchDecision('1', 'waiting')).toBe('wait');
    expect(launchDecision('1', 'ready')).toBe('open');
    expect(launchDecision('1', 'cannot')).toBe('drop');
  });
});

describe('H-189 importFocusTarget (SYNC-159, OWN-094, COLL-094 g: focus returns to the button)', () => {
  const attached = () => document.body.appendChild(document.createElement('button'));
  afterEach(() => (document.body.innerHTML = ''));

  it('SYNC-159 the floating button first, then the opener, then the empty state button', () => {
    const fab = attached();
    const opener = attached();
    const empty = attached();
    expect(importFocusTarget({ fab, opener, emptyButton: empty })).toBe(fab);
    expect(importFocusTarget({ fab: null, opener, emptyButton: empty })).toBe(opener);
    expect(importFocusTarget({ opener: null, emptyButton: empty })).toBe(empty);
  });

  it('SYNC-159 elements no longer on the page are skipped; none left gives undefined (the caller falls back to #main)', () => {
    const gone = document.createElement('button');
    const empty = attached();
    expect(importFocusTarget({ fab: gone, opener: gone, emptyButton: empty })).toBe(empty);
    expect(importFocusTarget({ fab: gone, opener: null, emptyButton: undefined })).toBeUndefined();
  });

  it('SYNC-159 dialogOpener: the focused control, or null when focus is on <body> (a launch from the address)', () => {
    const b = attached();
    expect(dialogOpener(document)).toBeNull();
    b.focus();
    expect(dialogOpener(document)).toBe(b);
  });
});
