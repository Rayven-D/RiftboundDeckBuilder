/** Gap kept between the docked floating button and the footer's top border (Brief H-245 D1: `--space-4`). */
export const FAB_DOCK_GAP = 16;

/**
 * SPEC-007 COLL-094 / SPEC-005 OWN-094 (Brief H-245 D1): how far the floating button moves up so its bottom edge
 * stays `gap` px above the footer. `restBottom` is the button's bottom edge at rest and `footerTop` the footer's top
 * edge, both in viewport px. 0 while the footer is far enough below; then it grows 1:1 as the footer rises.
 */
export function fabDock(restBottom: number, footerTop: number, gap = FAB_DOCK_GAP): number {
  const dock = restBottom - (footerTop - gap);
  return dock > 0 ? dock : 0;
}
