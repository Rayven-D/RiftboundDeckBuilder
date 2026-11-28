/**
 * The route change's view transition (app.config.ts `routeViewTransition`), so code can wait for it to finish.
 * H-699: a card dialog reopened from history (Back) must not open while the transition still runs: an overlay
 * added to the DOM mid-transition crashed Chromium's renderer in the browser tests.
 */
let current: Promise<void> = Promise.resolve();
/** Route view transitions that have not finished yet (Brief H-733: a scoped transition never starts on top of one). */
let running = 0;

export function trackRouteTransition(finished: Promise<unknown>): void {
  running++;
  current = finished.then(
    () => undefined,
    () => undefined,
  );
  void current.then(() => running--);
}

/** Resolves once the latest route view transition has finished (at once when none ran). */
export function routeTransitionDone(): Promise<void> {
  return current;
}

/** True while a route view transition is still running. */
export function routeTransitionRunning(): boolean {
  return running > 0;
}
