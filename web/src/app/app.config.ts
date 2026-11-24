import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  ViewTransitionInfo,
  withComponentInputBinding,
  withViewTransitions,
} from '@angular/router';
import { routes } from './app.routes';

/** The matched path of a route snapshot tree (query params left out), e.g. `collection`. */
function routePath(root: ActivatedRouteSnapshot): string {
  const parts: string[] = [];
  for (let s: ActivatedRouteSnapshot | null = root; s; s = s.firstChild) {
    parts.push(...s.url.map((u) => u.path));
  }
  return parts.join('/');
}

/**
 * Route changes cross-fade with a slight rise of <main> (styles.scss), except on the first load.
 * Nothing is skipped here: skipping makes Angular log an AbortError in dev builds (H-095 fix 1).
 * Under reduced motion the global CSS sets every view-transition animation to none, so the change
 * is instant. A navigation that stays on the same route (only the query changes) gets the
 * `vt-instant` class on <html> for the length of the transition, which does the same.
 */
export function routeViewTransition({ transition, from, to }: ViewTransitionInfo): void {
  if (routePath(from) !== routePath(to)) return;
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
