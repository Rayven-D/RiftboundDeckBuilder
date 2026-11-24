import type { Auth } from 'firebase/auth';
import { FirebaseAuthService } from './firebase-adapters';

/**
 * SPEC-010 SYNC-006 / SYNC-096: providers and re-authentication follow the build config. A stub `Auth`
 * is enough: a disabled provider must never reach Firebase.
 */
const stubAuth = (providerIds: string[]): Auth =>
  ({
    currentUser: {
      uid: 'uA',
      providerData: providerIds.map((providerId) => ({ providerId })),
      metadata: { lastSignInTime: new Date(0).toUTCString() },
    },
  }) as unknown as Auth;

describe('FirebaseAuthService provider config (SPEC-010 SYNC-006)', () => {
  it('SYNC-006 providers() lists only the configured providers (default: email link)', () => {
    expect(new FirebaseAuthService(stubAuth([])).providers()).toEqual([{ id: 'email-link', label: 'Sign in with an email link' }]);
    expect(new FirebaseAuthService(stubAuth([]), ['email-link', 'google']).providers().map((p) => p.id)).toEqual([
      'email-link',
      'google',
    ]);
  });

  it('SYNC-006 signIn(google) while Google is not enabled fails without a popup', async () => {
    await expect(new FirebaseAuthService(stubAuth([]), ['email-link']).signIn('google')).rejects.toThrow(/not enabled/);
    await expect(new FirebaseAuthService(stubAuth([]), ['email-link']).signIn('apple')).rejects.toThrow(/not enabled/);
  });

  it('SYNC-096 with Google off, even a Google identity re-authenticates by signing in again (no popup)', async () => {
    const svc = new FirebaseAuthService(stubAuth(['google.com']), ['email-link']);
    expect(svc.needsRecentSignIn()).toBe(true);
    expect(await svc.reauthenticate()).toBe('needs-sign-in');
  });

  it('SYNC-096 an email-link user always gets needs-sign-in, whatever the config', async () => {
    expect(await new FirebaseAuthService(stubAuth(['password']), ['email-link', 'google']).reauthenticate()).toBe('needs-sign-in');
  });

  it('SYNC-096 with Google on, a Google identity takes the popup path (the stub makes the popup fail: cancelled)', async () => {
    const svc = new FirebaseAuthService(stubAuth(['google.com']), ['email-link', 'google']);
    expect(await svc.reauthenticate()).toBe('cancelled');
  });
});
