/**
 * Brief H-733 S1: keep the reader's place when deck detail switches between Card view and List view (OWN-114).
 * Pure: the page passes the section boxes (viewport coordinates) before and after the switch.
 */

/** One deck section in viewport coordinates: its heading's top and the section's bottom edge. */
export interface SectionBox {
  readonly top: number;
  readonly bottom: number;
}

/** Where the reader was: the section, its heading's offset from the viewport top, and (when its heading has scrolled
 * out above the viewport) how far into the section the reading line was, as a share of its height. */
export interface ViewAnchor {
  readonly index: number;
  readonly offset: number;
  readonly fraction: number | null;
}

/**
 * The anchor before the switch: the section whose heading is at or just above the reading line (the sticky section
 * bar's bottom edge), else the first section. Null at the very top of the page (the page then stays at the top).
 */
export function captureAnchor(sections: readonly SectionBox[], line: number, scrollY: number): ViewAnchor | null {
  if (scrollY <= 0 || sections.length === 0) return null;
  let index = 0;
  sections.forEach((s, i) => {
    if (s.top <= line) index = i;
  });
  const s = sections[index];
  // Heading still on screen: keep it exactly where it is (check 1: within 4 px).
  if (s.top >= 0 || s.top > line) return { index, offset: s.top, fraction: null };
  // Heading scrolled away above: the same share of the section stays at the reading line, because the two views
  // differ in height and the heading's old offset could land in another section.
  const height = Math.max(1, s.bottom - s.top);
  return { index, offset: s.top, fraction: Math.min(1, (line - s.top) / height) };
}

/** How far to scroll (px, positive = down) after the switch so the anchor is back in place. */
export function anchorScrollDelta(anchor: ViewAnchor, after: SectionBox, line: number): number {
  if (anchor.fraction === null) return after.top - anchor.offset;
  const target = line - anchor.fraction * Math.max(1, after.bottom - after.top);
  return after.top - target;
}
