import { FAB_DOCK_GAP, fabDock } from './fab-dock';

describe('fabDock (SPEC-007 COLL-094 / SPEC-005 OWN-094, Brief H-245 D1, Accept 7)', () => {
  // A 900px window with the button at rest 24px from the bottom: its bottom edge is at 876.
  const restBottom = 876;

  it('H-245 Accept 7: the footer far below the window keeps the button at rest (0)', () => {
    expect(fabDock(restBottom, 5000)).toBe(0);
    expect(fabDock(restBottom, 900)).toBe(0);
  });

  it('H-245 Accept 7: footer top exactly 16px below the rest bottom is still 0 (the gap is kept, no move yet)', () => {
    expect(fabDock(restBottom, restBottom + FAB_DOCK_GAP)).toBe(0);
  });

  it('H-245 Accept 7: footer top at the rest bottom docks by the 16px gap', () => {
    expect(FAB_DOCK_GAP).toBe(16);
    expect(fabDock(restBottom, restBottom)).toBe(16);
  });

  it('H-245 Accept 7: as the footer rises the dock grows 1:1, so the button bottom stays 16px above the footer', () => {
    for (const footerTop of [860, 800, 700, 512.5, 100]) {
      const dock = fabDock(restBottom, footerTop);
      expect(dock).toBe(restBottom - footerTop + 16);
      expect(restBottom - dock).toBe(footerTop - 16);
    }
    expect(fabDock(restBottom, 700) - fabDock(restBottom, 710)).toBe(10);
  });
});
