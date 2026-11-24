// Preview-channel build (`ng build --configuration preview`): the production config with sign-in shown,
// for RJ's testing only (SYNC-007). Preview URLs are public to anyone with the link: share them privately.
// Keep in step with environment.ts (this file replaces it, so it cannot import it).
export const environment = {
  production: true,
  apiBaseUrl: '/api',
  signInEnabled: true,
  appVersion: 'web-0.0.0-preview',
  firebase: {
    apiKey: 'AIzaSyDR1geWEP0jhSLW4pmbBcWDQsLjj-Vtnw8', // same web app config as environment.ts
    authDomain: 'riftbound-deckbuilder.firebaseapp.com',
    projectId: 'riftbound-deckbuilder',
    appId: '1:252141620918:web:12d5bbb924a37d354ee017',
    useEmulators: false,
  },
};
