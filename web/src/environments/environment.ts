// Production build config. Front-end config is public: never put secrets or API keys here.
// (A Firebase web `apiKey` is a public project identifier, not a secret; access is enforced by firestore.rules.)
export const environment = {
  production: true,
  apiBaseUrl: '/api',
  /**
   * SPEC-010 SYNC-007: sign-in and sync stay hidden (and `firebase` is never loaded) until RJ approves
   * the privacy notice (SYNC-101). Turn on only by RJ's decision.
   */
  signInEnabled: false,
  /** Written to `users/{uid}.lastClientVersion` (SYNC-012, ≤ 40 characters). */
  appVersion: 'web-0.0.0',
  /**
   * SPEC-010 SYNC-006: sign-in providers shown and allowed, in button order. Only the email link is
   * enabled in Firebase Auth (RJ, 2026-11-23); add 'google' here once it is enabled in the console.
   */
  authProviders: ['email-link'] as ('email-link' | 'google')[],
  firebase: {
    // H-063: RJ fills in the web app config from the Firebase console (Project settings → Your apps).
    apiKey: 'AIzaSyDR1geWEP0jhSLW4pmbBcWDQsLjj-Vtnw8',
    authDomain: 'riftbound-deckbuilder.firebaseapp.com',
    projectId: 'riftbound-deckbuilder',
    appId: '1:252141620918:web:12d5bbb924a37d354ee017',
    useEmulators: false,
  },
};
