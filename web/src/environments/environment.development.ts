// Local development config (used by `ng serve`). Never put secrets or API keys here.
// `/api` is proxied to the services server (http://localhost:3000) by proxy.conf.json, so dev and prod build identical paths.
export const environment = {
  production: false,
  apiBaseUrl: '/api',
  /** SYNC-007: on in local builds, against the Firebase emulators (`firebase emulators:start --only auth,firestore`). */
  signInEnabled: true,
  appVersion: 'web-dev',
  firebase: {
    apiKey: 'demo-api-key', // the Auth emulator accepts any key
    authDomain: 'localhost',
    projectId: 'riftbound-deckbuilder',
    appId: 'demo-app',
    useEmulators: true,
  },
};
