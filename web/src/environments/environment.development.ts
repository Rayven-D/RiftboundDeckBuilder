// Local development config (used by `ng serve`). Never put secrets or API keys here.
// `/api` is proxied to the services server (http://localhost:3000) by proxy.conf.json, so dev and prod build identical paths.
export const environment = {
  production: false,
  apiBaseUrl: '/api',
  appVersion: 'web-dev',
  /** SYNC-006: as environment.ts (email link only until Google is enabled in the console). */
  authProviders: ['email-link'] as ('email-link' | 'google')[],
  /** SPEC-013 TEST-001: as environment.ts. */
  testDataEnabled: true,
  firebase: {
    apiKey: 'demo-api-key', // the Auth emulator accepts any key
    authDomain: 'localhost',
    projectId: 'riftbound-deckbuilder',
    appId: 'demo-app',
    useEmulators: true,
  },
};
