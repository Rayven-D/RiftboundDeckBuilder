/**
 * SPEC-010 SYNC-096 step 2: `FirestoreRemoteStore.deleteAll()` and its `removedAny` report (H-127),
 * against the Firestore emulator with the real rules (`npm run test:rules`), plus the ordered-delete
 * helper it uses for the cases the emulator cannot produce on demand (a failed or timed-out delete).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { RulesTestEnvironment, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { Firestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FirestoreRemoteStore, deleteInOrder } from '../src/app/core/sync/adapters/firebase-adapters';
import { RemoteError } from '../src/app/shared/sync/sync-types';

const DECK = '0b7c0000-0000-4000-8000-000000000001';
const PATHS = [
  'users/uA',
  `users/uA/decks/${DECK}`,
  'users/uA/state/collection',
  'users/uA/state/tags',
  'users/uA/state/locks',
];

let env: RulesTestEnvironment;
const db = (uid: string): Firestore => env.authenticatedContext(uid).firestore() as unknown as Firestore;

async function existing(): Promise<string[]> {
  const found: string[] = [];
  await env.withSecurityRulesDisabled(async (ctx) => {
    const f = ctx.firestore() as unknown as Firestore;
    for (const p of PATHS) if ((await getDoc(doc(f, p))).exists()) found.push(p);
  });
  return found;
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
    const f = ctx.firestore() as unknown as Firestore;
    for (const p of PATHS) await setDoc(doc(f, p), { schemaVersion: 1 });
  });
});

describe('SYNC-096 FirestoreRemoteStore.deleteAll against the emulator', () => {
  it('SYNC-096 deletes the account, every deck and the three state documents', async () => {
    expect(await new FirestoreRemoteStore(db('uA')).deleteAll('uA')).toBe('ok');
    expect(await existing()).toEqual([]);
  });

  it('SYNC-096 a failed deck-list read deletes nothing and reports removedAny false', async () => {
    // uB may not list uA's decks (SYNC-110), so the read before the first delete fails.
    expect(await new FirestoreRemoteStore(db('uB')).deleteAll('uA')).toEqual({ remaining: 4, removedAny: false });
    expect(await existing()).toEqual(PATHS);
  });
});

describe('SYNC-096 deleteInOrder removedAny', () => {
  const failAt = (n: number, error: unknown) => {
    const done: number[] = [];
    const del = async (i: number) => {
      if (i === n) throw error;
      done.push(i);
    };
    return { done, del };
  };

  it('SYNC-096 every delete succeeds: ok', async () => {
    const { done, del } = failAt(-1, null);
    expect(await deleteInOrder(5, del)).toBe('ok');
    expect(done).toEqual([0, 1, 2, 3, 4]);
  });

  it('SYNC-096 the first delete (the account document) fails: nothing removed, removedAny false', async () => {
    const { done, del } = failAt(0, new RemoteError('permission-denied'));
    expect(await deleteInOrder(5, del)).toEqual({ remaining: 5, removedAny: false });
    expect(done).toEqual([]);
  });

  it('SYNC-096 a later delete fails: the account document is gone, removedAny true, the rest stops', async () => {
    const { done, del } = failAt(2, new Error('network'));
    expect(await deleteInOrder(5, del)).toEqual({ remaining: 3, removedAny: true });
    expect(done).toEqual([0, 1]);
  });

  it("SYNC-096 the first delete timed out ('unconfirmed'): it may have landed, removedAny true", async () => {
    const { del } = failAt(0, new RemoteError('unconfirmed'));
    expect(await deleteInOrder(5, del)).toEqual({ remaining: 5, removedAny: true });
  });
});
