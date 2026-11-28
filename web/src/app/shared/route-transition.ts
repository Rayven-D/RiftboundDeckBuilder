/**
 * The route change's view transition (app.config.ts `routeViewTransition`), so code can wait for it to finish.
 * H-699: a card dialog reopened from history (Back) must not open while the transition still runs: an overlay
 * added to the DOM mid-transition crashed Chromium's renderer in the browser tests.
 */
let current: Promise<void> = Promise.resolve();

export function trackRouteTransition(finished: Promise<unknown>): void {
  current = finished.then(
    () => undefined,
    () => undefined,
  );
}

/** Resolves once the latest route view transition has finished (at once when none ran). */
export function routeTransitionDone(): Promise<void> {
  return current;
}
