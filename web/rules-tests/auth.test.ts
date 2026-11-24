/**
 * SPEC-010 SYNC-097: the `checkAccount()` mapping of the Firebase Auth adapter, verified against the
 * Auth emulator (`npm run test:rules` starts it on 127.0.0.1:9099). Also the adapter's write timeout.
 *
 * Verified codes (firebase-tools 15.37.0, firebase JS 13.4.0, 2026-11-23):
 * - deleted user: reload() → auth/user-token-expired; forced refresh getIdToken(true) → auth/invalid-refresh-token
 * - revoked tokens (validSince moved): reload() with the old token → auth/user-token-expired; the
 *   forced refresh succeeds in the emulator (it does not enforce revocation on refresh)
 * - disabled user: reload() and forced refresh → auth/user-disabled
 */
import { initializeApp } from 'firebase/app';
import { Auth, connectAuthEmulator, createUserWithEmailAndPassword, getAuth, reload } from 'firebase/auth';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FirebaseAuthService, mapAccountError, withTimeout } from '../src/app/core/sync/adapters/firebase-adapters';
import { RemoteError } from '../src/app/shared/sync/sync-types';

const PROJECT = 'demo-rift-builder';
const EMULATOR = 'http://127.0.0.1:9099';
let n = 0;

function freshAuth(): Auth {
  const app = initializeApp({ apiKey: 'demo-key', projectId: PROJECT }, `auth-test-${++n}`);
  const auth = getAuth(app);
  connectAuthEmulator(auth, EMULATOR, { disableWarnings: true });
  return auth;
}

async function admin(op: 'delete' | 'update', body: Record<string, unknown>): Promise<void> {
  const r = await fetch(`${EMULATOR}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:${op}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify(body),
  });
  expect(r.status).toBe(200);
}

async function signedInUser(auth: Auth) {
  const { user } = await createUserWithEmailAndPassword(auth, `u${n}-${Date.now()}@example.com`, 'secret123');
  return user;
}

const codeOf = async (p: Promise<unknown>) =>
  p.then(
    () => 'ok',
    (e: { code?: string }) => e.code ?? String(e),
  );

describe('SYNC-097 checkAccount against the Auth emulator', () => {
  it('SYNC-097 a live user is ok', async () => {
    const auth = freshAuth();
    await signedInUser(auth);
    expect(await new FirebaseAuthService(auth).checkAccount()).toBe('ok');
  });

  it('SYNC-097 a deleted user is deleted (the emulator reports it as an invalid refresh token)', async () => {
    const auth = freshAuth();
    const user = await signedInUser(auth);
    await admin('delete', { localId: user.uid });
    expect(await new FirebaseAuthService(auth).checkAccount()).toBe('deleted');
  });

  it('SYNC-097 the raw codes for a deleted user: reload() alone says user-token-expired, the forced refresh says invalid-refresh-token', async () => {
    const a1 = freshAuth();
    const u1 = await signedInUser(a1);
    await admin('delete', { localId: u1.uid });
    expect(await codeOf(reload(u1))).toBe('auth/user-token-expired');
    const a2 = freshAuth();
    const u2 = await signedInUser(a2);
    await admin('delete', { localId: u2.uid });
    expect(await codeOf(u2.getIdToken(true))).toBe('auth/invalid-refresh-token');
  });

  it('SYNC-097 revoked tokens are never deleted (data kept, SYNC-086)', async () => {
    const auth = freshAuth();
    const user = await signedInUser(auth);
    await new Promise((r) => setTimeout(r, 1100)); // validSince has 1 s resolution
    await admin('update', { localId: user.uid, validSince: String(Math.floor(Date.now() / 1000)) });
    // The emulator still refreshes a revoked session, so checkAccount() is 'ok' here (production refuses
    // the refresh with auth/user-token-expired, which maps to 'signed-out'). Either way: never 'deleted'.
    expect(['ok', 'signed-out']).toContain(await new FirebaseAuthService(auth).checkAccount());
    expect(await codeOf(reload(user))).not.toBe('auth/invalid-refresh-token');
  });

  it('SYNC-097 a disabled user is signed-out (data kept)', async () => {
    const auth = freshAuth();
    const user = await signedInUser(auth);
    await admin('update', { localId: user.uid, disableUser: true });
    expect(await new FirebaseAuthService(auth).checkAccount()).toBe('signed-out');
  });

  it('SYNC-097 no current user is signed-out; the code mapping is as verified', async () => {
    expect(await new FirebaseAuthService(freshAuth()).checkAccount()).toBe('signed-out');
    expect(mapAccountError('auth/invalid-refresh-token')).toBe('deleted');
    expect(mapAccountError('auth/user-not-found')).toBe('deleted');
    expect(mapAccountError('auth/user-token-expired')).toBe('signed-out');
    expect(mapAccountError('auth/user-disabled')).toBe('signed-out');
    expect(mapAccountError('auth/network-request-failed')).toBe('offline');
    expect(mapAccountError('auth/something-new')).toBe('signed-out');
  });
});

describe('adapter write timeout (SYNC-042, SYNC-080)', () => {
  afterEach(() => vi.useRealTimers());

  it('SYNC-042 a write slower than the timeout is unconfirmed, not offline', async () => {
    await expect(withTimeout(new Promise(() => undefined), 10)).rejects.toEqual(new RemoteError('unconfirmed'));
  });

  it('SYNC-042 the timer is cleared when the write settles', async () => {
    vi.useFakeTimers();
    const p = withTimeout(Promise.resolve('done'), 20_000);
    await expect(p).resolves.toBe('done');
    expect(vi.getTimerCount()).toBe(0);
  });
});
