// Preview-channel build (`ng build --configuration preview`): the production config with sign-in shown,
// for RJ's testing only (SYNC-007). Preview URLs are public to anyone with the link: share them privately.
// Keep in step with environment.ts (this file replaces it, so it cannot import it).
/**
 * SPEC-010 SYNC-012: the per-build `appVersion`, `web-<prod|preview>-<7 hex of the commit>` (or the UTC build
 * time). Set by `scripts/build.mjs` (`npm run build`, `npm run build:preview`) as an `ng build` define, never by hand.
 * A bare `ng build` without the define falls back to `web-dev` like a local build.
 */
declare const APP_VERSION: string;

export const environment = {
  production: true,
  apiBaseUrl: '/api',
  signInEnabled: true,
  /** Written to `users/{uid}.lastClientVersion` (SYNC-012, ≤ 40 characters); see APP_VERSION above. */
  appVersion: typeof APP_VERSION === 'string' ? APP_VERSION : 'web-dev',
  /** SYNC-006: as environment.ts (email link only until Google is enabled in the console). */
  authProviders: ['email-link'] as ('email-link' | 'google')[],
  firebase: {
    apiKey: 'AIzaSyDR1geWEP0jhSLW4pmbBcWDQsLjj-Vtnw8', // same web app config as environment.ts
    authDomain: 'riftbound-deckbuilder.firebaseapp.com',
    projectId: 'riftbound-deckbuilder',
    appId: '1:252141620918:web:12d5bbb924a37d354ee017',
    useEmulators: false,
  },
};
