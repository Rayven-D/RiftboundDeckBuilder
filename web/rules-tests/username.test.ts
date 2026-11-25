/**
 * SPEC-010 v0.14 SYNC-155 / SYNC-156 (H-176): `FirestoreRemoteStore.setUsername()` and the username in
 * `getAccount()`, against the Firestore emulator with the real rules (`npm run test:rules`). AC 22, AC 74, AC 76.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { RulesTestEnvironment, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { Firestore, Timestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FirestoreRemoteStore } from '../src/app/core/sync/adapters/firebase-adapters';
import { checkUsername } from '../src/app/shared/account/username';

const T = Timestamp.fromDate(new Date('2026-11-23T12:00:00Z'));
/** 👨🏽‍👩🏽‍👧🏽‍👦🏽 */
const FAMILY = '\u{1F468}\u{1F3FD}\u{200D}\u{1F469}\u{1F3FD}\u{200D}\u{1F467}\u{1F3FD}\u{200D}\u{1F466}\u{1F3FD}';

let env: RulesTestEnvironment;
const db = (uid: string): Firestore => env.authenticatedContext(uid).firestore() as unknown as Firestore;

async function stored(): Promise<Record<string, unknown> | undefined> {
  let data: Record<string, unknown> | undefined;
  await env.withSecurityRulesDisabled(async (ctx) => {
    data = (await getDoc(doc(ctx.firestore() as unknown as Firestore, 'users/uA'))).data();
  });
  return data;
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-rift-builder',
    firestore: { rules: readFileSync(fileURLToPath(new URL('../../firestore.rules', import.meta.url)), 'utf8') },
  });
});
afterAll(async () => env?.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore() as unknown as Firestore, 'users/uA'), {
      schemaVersion: 1,
      createdAt: T,
      updatedAt: T,
      syncedAt: T,
      lastClientVersion: 'web-dev',
    });
  });
});

describe('SYNC-155 / SYNC-156 FirestoreRemoteStore.setUsername against the emulator', () => {
  it('AC 76 one update() of users/uA sets username, updatedAt and syncedAt (server time), keeps createdAt; getAccount reads it', async () => {
    const remote = new FirestoreRemoteStore(db('uA'));
    expect((await remote.getAccount('uA'))?.username).toBeUndefined();
    expect(await remote.setUsername('uA', 'RJ Smith')).toBe('ok');
    const d = await stored();
    expect(d?.['username']).toBe('RJ Smith');
    expect((d?.['createdAt'] as Timestamp).isEqual(T)).toBe(true);
    expect((d?.['syncedAt'] as Timestamp).toMillis()).toBeGreaterThan(T.toMillis());
    expect(Object.keys(d ?? {}).sort()).toEqual(['createdAt', 'lastClientVersion', 'schemaVersion', 'syncedAt', 'updatedAt', 'username']);
    expect((await remote.getAccount('uA'))?.username).toBe('RJ Smith');
  });

  it('AC 22 / AC 74 the worst name the client accepts (24 × the skin-tone family emoji) is written', async () => {
    const name = FAMILY.repeat(24);
    expect(checkUsername(name).ok).toBe(true);
    expect(await new FirestoreRemoteStore(db('uA')).setUsername('uA', name)).toBe('ok');
    expect((await stored())?.['username']).toBe(name);
  });

  it('SYNC-155 a missing account document is not recreated (update, never set): not-found', async () => {
    await env.clearFirestore();
    expect(await new FirestoreRemoteStore(db('uA')).setUsername('uA', 'RJ Smith')).not.toBe('ok');
    expect(await stored()).toBeUndefined();
  });

  it('SYNC-110 another user cannot set uA’s username: permission-denied', async () => {
    expect(await new FirestoreRemoteStore(db('uB')).setUsername('uA', 'Mallory')).toBe('permission-denied');
    expect((await stored())?.['username']).toBeUndefined();
  });
});
