import { describe, expect, it } from 'vitest';
import { anchorScrollDelta, captureAnchor } from './view-anchor';

/** H-734 (Brief H-733 S1, check 1): the reader's place across deck detail's Card / List switch. */
describe('H-733 S1 view anchor', () => {
  const LINE = 126;

  it('check 1: at the very top of the page there is no anchor (the page stays at the top)', () => {
    expect(captureAnchor([{ top: 300, bottom: 600 }], LINE, 0)).toBeNull();
    expect(captureAnchor([], LINE, 500)).toBeNull();
  });

  it('check 1: the section whose heading is at or just above the reading line keeps its heading offset', () => {
    const before = [
      { top: -900, bottom: -400 },
      { top: 120, bottom: 1500 },
      { top: 1500, bottom: 2200 },
    ];
    const a = captureAnchor(before, LINE, 2000)!;
    expect(a).toEqual({ index: 1, offset: 120, fraction: null });
    // After the switch the heading landed 300 px lower: scroll down 300 px to put it back.
    expect(anchorScrollDelta(a, { top: 420, bottom: 900 }, LINE)).toBe(300);
    expect(anchorScrollDelta(a, { top: 120, bottom: 900 }, LINE)).toBe(0);
  });

  it('check 1: no heading above the line yet (the page header is in view): the first section is the anchor', () => {
    const a = captureAnchor([{ top: 400, bottom: 900 }, { top: 900, bottom: 1300 }], LINE, 120)!;
    expect(a).toEqual({ index: 0, offset: 400, fraction: null });
  });

  it('check 1: deep in a long section (heading off screen above) the same share of that section stays at the line', () => {
    // Card view: section from -1000 to 3000 (4000 tall); the line is 1126 px into it.
    const a = captureAnchor([{ top: -1000, bottom: 3000 }], LINE, 4000)!;
    expect(a.index).toBe(0);
    expect(a.fraction).toBeCloseTo(1126 / 4000);
    // List view: the same section is 1000 tall. Its line point is then 281.5 px into it.
    const after = { top: 50, bottom: 1050 };
    const dy = anchorScrollDelta(a, after, LINE);
    expect(after.top - dy + (1126 / 4000) * 1000).toBeCloseTo(LINE);
  });
});
