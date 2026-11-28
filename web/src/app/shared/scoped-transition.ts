import { routeTransitionRunning } from './route-transition';

/**
 * Brief H-716 (helper for S1, S3, S5): a view transition for one in-page change, styled by `className`.
 *
 * Runs `update` directly (and synchronously) when the browser has no `document.startViewTransition`, under
 * `prefers-reduced-motion: reduce` (no frozen-input window either, §5), while another view transition runs (a route
 * change or another scoped one: the animation is dropped, never the update, §6.3), or while a CDK overlay (a dialog,
 * a menu, a notice) is open (adding or animating an overlay during a view transition crashed Chromium in the H-699
 * e2e, so overlays and view transitions never mix). Otherwise `className` is on <html> for the transition's lifetime
 * (like `vt-instant`), which picks the CSS for that kind of transition, and `update` runs inside it. `update` must
 * leave the DOM in its new state when it returns (render with `ApplicationRef.tick()`).
 *
 * Returns a promise that resolves once `update` has run.
 */
export function startScopedTransition(update: () => void, className: string, doc: Document | undefined = globalThis.document): Promise<void> {
  if (!canAnimate(doc)) {
    update();
    return Promise.resolve();
  }
  const root = doc!.documentElement;
  scoped++;
  root.classList.add(className);
  let ran = false;
  const run = () => {
    if (ran) return;
    ran = true;
    update();
  };
  try {
    const t = doc!.startViewTransition!(run);
    const done = () => {
      scoped--;
      root.classList.remove(className);
    };
    t.finished.then(done, done);
    // A skipped transition (e.g. the tab was hidden) still runs the update; swallow its rejections.
    t.ready.catch(() => undefined);
    return t.updateCallbackDone.then(
      () => undefined,
      () => run(),
    );
  } catch {
    scoped--;
    root.classList.remove(className);
    run();
    return Promise.resolve();
  }
}

/** Scoped transitions that have not finished yet. */
let scoped = 0;

/** Whether a scoped transition may animate now (see `startScopedTransition`). */
export function canAnimate(doc: Document | undefined = globalThis.document): boolean {
  if (!doc || typeof doc.startViewTransition !== 'function') return false;
  if (doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true) return false;
  if (scoped > 0 || routeTransitionRunning()) return false;
  if ((doc as Document & { activeViewTransition?: unknown }).activeViewTransition) return false;
  // Tooltips and notices are overlays too, but they never block: the theme toggle's own tooltip is usually up when it
  // is clicked, and an info notice can stay for minutes. Dialogs, menus and select panels do.
  return !doc.querySelector('.cdk-overlay-pane:not(.mat-mdc-tooltip-panel):not(:has(> .mat-mdc-snack-bar-container))');
}

/** True when reduced motion is asked for (or nothing can say: then nothing moves). */
export function reducedMotion(doc: Document | undefined = globalThis.document): boolean {
  return doc?.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true;
}
