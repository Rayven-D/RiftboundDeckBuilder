/**
 * SPEC-010 SYNC-110…114 security-rules tests against the Firestore emulator (AC 22, AC 28, AC 29).
 * Run: `cd web; npm run test:rules` (needs firebase-tools and a Java runtime the emulator accepts).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  Firestore,
  Timestamp,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  FieldPath,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const DECK = '0b7c0000-0000-4000-8000-000000000001';
const ts = (iso: string) => Timestamp.fromDate(new Date(iso));
const T = ts('2026-11-23T12:00:00Z');

const meta = () => ({ schemaVersion: 1, updatedAt: T, syncedAt: serverTimestamp() });
const account = () => ({ ...meta(), createdAt: T, lastClientVersion: 'web-0.0.0' });
const collectionDoc = () => ({
  ...meta(),
  catalogVersion: '0.2+2026-11-20T18:04:00Z',
  cards: { 'hextech ray': { q: 3, t: 1, p: { 'OGN-001a': 1 } } },
});
const tagsDoc = () => ({
  ...meta(),
  tags: {
    t_a1B2c3: { label: 'Trade Binder', key: 'trade binder', colour: null, excludeFromDecks: false, createdAt: T, updatedAt: T },
    t_Z9y8x7: { deleted: true, updatedAt: T },
  },
  assignments: { 'p:OGN-001a': { a: ['t_a1B2c3'], t: 1 }, 'u:lightning rush': { a: [], t: 2 } },
});
const locksDoc = () => ({
  ...meta(),
  locks: { [DECK]: { lockedAt: T, updatedAt: T }, '0b7c0000-0000-4000-8000-000000000002': { lockedAt: null, updatedAt: T } },
});
const card = (n: number) => ({ cardKey: `card ${n}`, name: `Card ${n}`, qty: 1 });
const liveDeck = (over: Record<string, unknown> = {}) => ({
  ...meta(),
  createdAt: T,
  deletedAt: null,
  name: 'Kennen Tempo',
  format: 'standard',
  source: { kind: 'user', text: null, url: null },
  sourceFormat: 'riot-text',
  notes: '',
  catalogVersion: '0.2+2026-11-20T18:04:00Z',
  legend: { cardKey: 'kennen', name: 'Kennen, Heart of the Tempest', qty: 1 },
  champion: null,
  main: [{ cardKey: 'hextech ray', name: 'Hextech Ray', qty: 3 }],
  sideboard: [],
  runes: [],
  battlefields: [],
  ...over,
});
const deckTombstone = () => ({ schemaVersion: 1, createdAt: T, updatedAt: T, deletedAt: T, syncedAt: serverTimestamp() });

const PATHS = ['users/uA', 'users/uA/state/collection', 'users/uA/state/tags', 'users/uA/state/locks', `users/uA/decks/${DECK}`];
const VALID: Record<string, () => Record<string, unknown>> = {
  'users/uA': account,
  'users/uA/state/collection': collectionDoc,
  'users/uA/state/tags': tagsDoc,
  'users/uA/state/locks': locksDoc,
  [`users/uA/decks/${DECK}`]: liveDeck,
};

let env: RulesTestEnvironment;
const db = (uid: string | null): Firestore =>
  (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore() as unknown as Firestore;
const ref = (f: Firestore, path: string) => doc(f, path);

async function seed(): Promise<void> {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const f = ctx.firestore() as unknown as Firestore;
    for (const p of PATHS) await setDoc(ref(f, p), { ...VALID[p](), syncedAt: T });
  });
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
  await seed();
});

describe('SYNC-110 owner only', () => {
  it('SYNC-110 user B cannot get, list, create, update or delete any of user A’s documents (AC 22)', async () => {
    const b = db('uB');
    for (const p of PATHS) {
      await assertFails(getDoc(ref(b, p)));
      await assertFails(setDoc(ref(b, p), VALID[p]()));
      await assertFails(updateDoc(ref(b, p), { updatedAt: T, syncedAt: serverTimestamp() }));
      await assertFails(deleteDoc(ref(b, p)));
    }
    await assertFails(getDocs(collection(b, 'users/uA/state')));
    await assertFails(getDocs(collection(b, 'users/uA/decks')));
    await assertFails(getDocs(collection(b, 'users')));
  });

  it('SYNC-110 an unauthenticated request is denied on every path', async () => {
    const anon = db(null);
    for (const p of PATHS) {
      await assertFails(getDoc(ref(anon, p)));
      await assertFails(setDoc(ref(anon, p), VALID[p]()));
      await assertFails(deleteDoc(ref(anon, p)));
    }
    await assertFails(getDocs(collection(anon, 'users/uA/decks')));
  });

  it('SYNC-110 / SYNC-116 the owner can get every document and run both cursor queries', async () => {
    const a = db('uA');
    for (const p of PATHS) await assertSucceeds(getDoc(ref(a, p)));
    await assertSucceeds(getDocs(query(collection(a, 'users/uA/state'), where('syncedAt', '>', ts('2026-01-01T00:00:00Z')))));
    await assertSucceeds(getDocs(query(collection(a, 'users/uA/decks'), where('syncedAt', '>', ts('2026-01-01T00:00:00Z')))));
  });
});

describe('SYNC-111 known paths only', () => {
  it('SYNC-111 unknown paths are denied for the owner', async () => {
    const a = db('uA');
    await assertFails(setDoc(ref(a, 'users/uA/other/x'), { ...meta() }));
    await assertFails(getDoc(ref(a, 'users/uA/other/x')));
    await assertFails(setDoc(ref(a, 'users/uA/state/views'), { ...meta(), query: {} }));
    await assertFails(getDoc(ref(a, 'users/uA/state/views')));
    await assertFails(setDoc(ref(a, 'users/uA/decks/NOT-A-UUID'), liveDeck()));
    await assertFails(setDoc(ref(a, 'users/uA/decks/0B7C0000-0000-4000-8000-000000000001'), liveDeck()));
    await assertFails(setDoc(ref(a, 'other/x'), { a: 1 }));
  });
});

describe('SYNC-112 field validation', () => {
  it('SYNC-112 each valid document shape, including both tombstone forms, is allowed for its owner', async () => {
    const a = db('uA');
    for (const p of PATHS) await assertSucceeds(setDoc(ref(a, p), VALID[p]()));
    await assertSucceeds(setDoc(ref(a, `users/uA/decks/${DECK}`), deckTombstone()));
    await assertSucceeds(
      setDoc(
        ref(a, `users/uA/decks/${DECK}`),
        liveDeck({ duplicatedFrom: '0b7c0000-0000-4000-8000-000000000009', importRemovedLines: ['x'] }),
      ),
    );
  });

  it('SYNC-112 an extra key, a wrong schemaVersion or a client-set syncedAt is denied (AC 22)', async () => {
    const a = db('uA');
    await assertFails(setDoc(ref(a, 'users/uA'), { ...account(), email: 'rj@example.com' }));
    await assertFails(setDoc(ref(a, 'users/uA/state/collection'), { ...collectionDoc(), schemaVersion: 2 }));
    await assertFails(setDoc(ref(a, 'users/uA/state/collection'), { ...collectionDoc(), syncedAt: Timestamp.now() }));
    await assertFails(setDoc(ref(a, 'users/uA/state/tags'), { ...tagsDoc(), extra: true }));
    await assertFails(setDoc(ref(a, `users/uA/decks/${DECK}`), { ...deckTombstone(), name: 'leftover' }));
    await assertFails(setDoc(ref(a, `users/uA/decks/${DECK}`), liveDeck({ deletedAt: T })));
  });

  it('SYNC-112 deck limits: 151 main entries, a 0- or 81-character name, an unknown format are denied', async () => {
    const a = db('uA');
    await assertFails(setDoc(ref(a, `users/uA/decks/${DECK}`), liveDeck({ main: Array.from({ length: 151 }, (_, i) => card(i)) })));
    await assertSucceeds(setDoc(ref(a, `users/uA/decks/${DECK}`), liveDeck({ main: Array.from({ length: 150 }, (_, i) => card(i)) })));
    await assertFails(setDoc(ref(a, `users/uA/decks/${DECK}`), liveDeck({ name: '' })));
    await assertFails(setDoc(ref(a, `users/uA/decks/${DECK}`), liveDeck({ name: 'x'.repeat(81) })));
    await assertFails(setDoc(ref(a, `users/uA/decks/${DECK}`), liveDeck({ format: 'eternal' })));
    await assertFails(setDoc(ref(a, `users/uA/decks/${DECK}`), liveDeck({ notes: 'x'.repeat(4001) })));
  });

  it('SYNC-112 / AC 29 a large importRemovedLines list is accepted (no cap)', async () => {
    const lines = Array.from({ length: 2000 }, (_, i) => `${i} Some removed line text here`);
    await assertSucceeds(setDoc(ref(db('uA'), `users/uA/decks/${DECK}`), liveDeck({ importRemovedLines: lines })));
  });

  it('SYNC-112 map caps: 400 tags pass, 401 fail; lastClientVersion over 40 characters fails', async () => {
    const a = db('uA');
    const tags = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`t_${String(i).padStart(6, '0')}`, { deleted: true, updatedAt: T }]));
    await assertSucceeds(setDoc(ref(a, 'users/uA/state/tags'), { ...tagsDoc(), tags: tags(400) }));
    await assertFails(setDoc(ref(a, 'users/uA/state/tags'), { ...tagsDoc(), tags: tags(401) }));
    await assertFails(updateDoc(ref(a, 'users/uA'), { lastClientVersion: 'x'.repeat(41), updatedAt: T, syncedAt: serverTimestamp() }));
  });

  it('SYNC-014 / SYNC-034 a FieldPath update with deleteField() is allowed', async () => {
    const a = db('uA');
    await assertSucceeds(
      updateDoc(
        ref(a, 'users/uA/state/collection'),
        new FieldPath('cards', "kai'sa, survivor"),
        { q: 1, t: 5, p: {} },
        new FieldPath('cards', 'hextech ray'),
        deleteField(),
        'updatedAt',
        T,
        'syncedAt',
        serverTimestamp(),
      ),
    );
  });

  it('SYNC-012 the account document keeps its createdAt on update', async () => {
    const a = db('uA');
    await assertSucceeds(updateDoc(ref(a, 'users/uA'), { lastClientVersion: 'web-0.0.1', updatedAt: T, syncedAt: serverTimestamp() }));
    await assertFails(updateDoc(ref(a, 'users/uA'), { createdAt: Timestamp.now(), updatedAt: T, syncedAt: serverTimestamp() }));
  });
});

describe('SYNC-113 creates need the account document', () => {
  beforeEach(async () => {
    await env.clearFirestore();
  });

  it('SYNC-113 creating a deck or state document while users/A does not exist is denied (AC 28)', async () => {
    const a = db('uA');
    await assertFails(setDoc(ref(a, `users/uA/decks/${DECK}`), liveDeck()));
    await assertFails(setDoc(ref(a, 'users/uA/state/collection'), collectionDoc()));
  });

  it('SYNC-110 user B cannot create any of user A documents on an empty path (true creates)', async () => {
    const b = db('uB');
    for (const p of PATHS) await assertFails(setDoc(ref(b, p), VALID[p]()));
    // B cannot create them even inside a batch that also creates users/uA
    const batch = writeBatch(b);
    batch.set(ref(b, 'users/uA'), account());
    batch.set(ref(b, `users/uA/decks/${DECK}`), liveDeck());
    await assertFails(batch.commit());
  });

  it('SYNC-112 a deck tombstone can be created (a deck deleted before its first push) once the account exists', async () => {
    const a = db('uA');
    await assertSucceeds(setDoc(ref(a, 'users/uA'), account()));
    await assertSucceeds(setDoc(ref(a, `users/uA/decks/${DECK}`), deckTombstone()));
    await assertFails(
      setDoc(ref(a, 'users/uA/decks/0b7c0000-0000-4000-8000-000000000002'), { ...deckTombstone(), updatedAt: ts('2026-11-23T11:00:00Z') }),
    );
  });

  it('SYNC-113 the same creates are allowed in a batch that also creates users/A (first sign-in, SYNC-050)', async () => {
    const a = db('uA');
    const batch = writeBatch(a);
    batch.set(ref(a, 'users/uA'), account());
    batch.set(ref(a, 'users/uA/state/collection'), collectionDoc());
    batch.set(ref(a, 'users/uA/state/tags'), tagsDoc());
    batch.set(ref(a, 'users/uA/state/locks'), locksDoc());
    batch.set(ref(a, `users/uA/decks/${DECK}`), liveDeck());
    await assertSucceeds(batch.commit());
  });

  it('SYNC-098 after deletion the owner can delete everything, and an update of a missing document fails', async () => {
    await seed();
    const a = db('uA');
    for (const p of PATHS) await assertSucceeds(deleteDoc(ref(a, p)));
    await assertFails(updateDoc(ref(a, 'users/uA/state/collection'), { updatedAt: T, syncedAt: serverTimestamp() }));
    let left = -1;
    await env.withSecurityRulesDisabled(async (ctx) => {
      left = (await getDocs(collection(ctx.firestore() as unknown as Firestore, 'users/uA/decks'))).size;
    });
    expect(left).toBe(0);
  });
});
