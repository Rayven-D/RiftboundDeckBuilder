/**
 * H-680 (RJ, 2026-11-26): swipe a notice left or right to dismiss it (touch). Pure, so the thresholds are testable.
 */

/** Movement before a drag is decided horizontal (a swipe) or vertical (a scroll, left to the browser). */
export const SWIPE_SLOP_PX = 8;
/** Past this share of the notice's width a release dismisses it. */
export const SWIPE_DISMISS_RATIO = 0.3;
/** A fast flick dismisses below the distance threshold: px per ms, over at least `SWIPE_FLICK_MIN_PX`. */
export const SWIPE_FLICK_SPEED = 0.5;
export const SWIPE_FLICK_MIN_PX = 24;

/** `pending` until the drag left the slop; then `swipe` (horizontal) or `scroll` (vertical, never taken over). */
export type SwipeAxis = 'pending' | 'swipe' | 'scroll';

export function swipeAxis(dx: number, dy: number): SwipeAxis {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax < SWIPE_SLOP_PX && ay < SWIPE_SLOP_PX) return 'pending';
  return ax > ay * 1.5 ? 'swipe' : 'scroll';
}

/** On release: dismiss past 30 % of the width or on a fast flick; otherwise snap back. */
export function swipeRelease(dx: number, width: number, ms: number): 'dismiss' | 'snap' {
  const ax = Math.abs(dx);
  if (width > 0 && ax >= width * SWIPE_DISMISS_RATIO) return 'dismiss';
  if (ax >= SWIPE_FLICK_MIN_PX && ax / Math.max(ms, 1) >= SWIPE_FLICK_SPEED) return 'dismiss';
  return 'snap';
}
