// Production and preview build config (SPEC-010 SYNC-007: the two differ only in `appVersion`; there is no
// sign-in flag, every build is account-only). Front-end config is public: never put secrets or API keys here.
// (A Firebase web `apiKey` is a public project identifier, not a secret; access is enforced by firestore.rules.)
/**
 * SPEC-010 SYNC-012: the per-build `appVersion`, `web-<prod|preview>-<7 hex of the commit>` (or the UTC build
 * time). Set by `scripts/build.mjs` (`npm run build`, `npm run build:preview`) as an `ng build` define, never by hand.
 * A bare `ng build` without the define falls back to `web-dev` like a local build.
 */
declare const APP_VERSION: string;

export const environment = {
  production: true,
  apiBaseUrl: '/api',
  /** Written to `users/{uid}.lastClientVersion` (SYNC-012, ≤ 40 characters); see APP_VERSION above. */
  appVersion: typeof APP_VERSION === 'string' ? APP_VERSION : 'web-dev',
  /**
   * SPEC-010 SYNC-006: sign-in providers shown and allowed, in button order. Only the email link is
   * enabled in Firebase Auth (RJ, 2026-11-23); add 'google' here once it is enabled in the console.
   */
  authProviders: ['email-link'] as ('email-link' | 'google')[],
  /**
   * SPEC-013 TEST-001 / TEST-042: offer "Load test data" on Collection. Public config, not a secret. True in
   * production and preview until real imports can save; the build item that turns real imports on (after H-020)
   * sets it to false (the Remove banner stays for anyone who still has test data, TEST-041).
   */
  testDataEnabled: true,
  firebase: {
    // H-063: RJ fills in the web app config from the Firebase console (Project settings → Your apps).
    apiKey: 'AIzaSyDR1geWEP0jhSLW4pmbBcWDQsLjj-Vtnw8',
    authDomain: 'riftbound-deckbuilder.firebaseapp.com',
    projectId: 'riftbound-deckbuilder',
    appId: '1:252141620918:web:12d5bbb924a37d354ee017',
    useEmulators: false,
  },
};
