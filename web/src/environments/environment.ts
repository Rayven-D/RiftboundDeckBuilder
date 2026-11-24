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
  firebase: {
    // H-063: RJ fills in the web app config from the Firebase console (Project settings → Your apps).
    apiKey: '',
    authDomain: 'riftbound-deckbuilder.firebaseapp.com',
    projectId: 'riftbound-deckbuilder',
    appId: '',
    useEmulators: false,
  },
};
