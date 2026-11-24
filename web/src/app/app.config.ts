import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import {
  provideRouter,
  ViewTransitionInfo,
  withComponentInputBinding,
  withViewTransitions,
} from '@angular/router';
import { routes } from './app.routes';

/**
 * Route changes cross-fade with a slight rise of <main> (styles.scss). Skipped entirely when the
 * user asks for reduced motion, and on the first load.
 */
export function skipTransitionForReducedMotion({ transition }: ViewTransitionInfo): void {
  if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    transition.skipTransition();
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withViewTransitions({
        skipInitialTransition: true,
        onViewTransitionCreated: skipTransitionForReducedMotion,
      }),
    ),
  ],
};
