import { ApplicationConfig, inject, provideBrowserGlobalErrorListeners } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  ViewTransitionInfo,
  withComponentInputBinding,
  withViewTransitions,
} from '@angular/router';
import { routes } from './app.routes';
import { dialogReopenPending } from './shared/dialog-history';
import { trackRouteTransition } from './shared/route-transition';

/** The matched path of a route snapshot tree (query params left out), e.g. `collection`. */
function routePath(root: ActivatedRouteSnapshot): string {
  const parts: string[] = [];
  for (let s: ActivatedRouteSnapshot | null = root; s; s = s.firstChild) {
    parts.push(...s.url.map((u) => u.path));
  }
  return parts.join('/');
}

/** The router, when called in an injection context (the router calls `onViewTransitionCreated` in one). */
function currentRouter(): Router | null {
  try {
    return inject(Router);
  } catch {
    return null;
  }
}

/**
 * Route changes cross-fade with a slight rise of <main> (styles.scss), except on the first load.
 * Nothing is skipped here: skipping makes Angular log an AbortError in dev builds (H-095 fix 1).
 * Under reduced motion the global CSS sets every view-transition animation to none, so the change
 * is instant. A navigation that stays on the same route (only the query changes) gets the
 * `vt-instant` class on <html> for the length of the transition, which does the same.
 * Brief H-716 S2: so does a Back / Forward to an entry whose card dialog opens again (the page is under the dialog,
 * so animating it is wasted motion; the dialog fades in place once the transition is over).
 */
export function routeViewTransition({ transition, from, to }: ViewTransitionInfo): void {
  trackRouteTransition(transition.finished);
  const router = currentRouter();
  const instant = routePath(from) === routePath(to) || (router !== null && dialogReopenPending(router));
  if (!instant) return;
  const root = globalThis.document?.documentElement;
  if (!root) return;
  root.classList.add('vt-instant');
  transition.finished.finally(() => root.classList.remove('vt-instant')).catch(() => undefined);
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withViewTransitions({
        skipInitialTransition: true,
        onViewTransitionCreated: routeViewTransition,
      }),
    ),
  ],
};
