/**
 * SPEC-013 Test Data AC 14 (TEST-030, H-205): a test-data load (the Large set: `test-data-5000`, 1,667 cards, the
 * three reserved deck ids, two locks) and its Remove are accepted by the unchanged `firestore.rules` for the owner,
 * and refused for anyone else. The documents are built from the same generator and plan the app uses, shaped as
 * the Firestore adapter writes them (`planPush` card values, `deckToDoc` + `writeDeck` timestamps).
 * Run: `cd web; npm run test:rules`.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { RulesTestEnvironment, assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { FieldPath, Firestore, Timestamp, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { generateLargeSample } from '../src/app/shared/collection/sample-data';
import { TEST_DECK_IDS, planTestLoad } from '../src/app/shared/collection/test-data';
import { deckToDoc } from '../src/app/shared/sync/merge';

const UID = 'Q3x9LmP0aZ7tR2vK8sN4bW6yJ1cD';
const NOW = '2026-11-25T12:00:00.000Z';
const T = Timestamp.fromDate(new Date(NOW));
const MS = Date.parse(NOW);
const plan = planTestLoad(generateLargeSample(5000), 5000, null, NOW);

const meta = () => ({ schemaVersion: 1, updatedAt: T, syncedAt: serverTimestamp() });
const collectionDoc = () => ({
  ...meta(),
  catalogVersion: plan.collection.catalogVersion,
  cards: Object.fromEntries(
    Object.entries(plan.collection.cards).map(([k, c]) => [k, { q: c.quantity, t: MS, p: { ...c.byPrinting } }]),
  ),
});
const deckDoc = (i: number) => {
  const d = deckToDoc(plan.decks[i]);
  return { ...d, createdAt: Timestamp.fromMillis(d.createdAt), updatedAt: Timestamp.fromMillis(d.updatedAt), syncedAt: serverTimestamp() };
};
const locksDoc = () => ({
  ...meta(),
  locks: Object.fromEntries(plan.locks.locks.map((l) => [l.deckId, { lockedAt: Timestamp.fromDate(new Date(l.lockedAt)), updatedAt: T }])),
});

let env: RulesTestEnvironment;
const db = (uid: string): Firestore => env.authenticatedContext(uid).firestore() as unknown as Firestore;

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
    await setDoc(doc(f, `users/${UID}`), { schemaVersion: 1, updatedAt: T, syncedAt: T, createdAt: T, lastClientVersion: 'web-0.0.0' });
  });
});

describe('SPEC-013 AC 14 test data under the unchanged rules (H-205)', () => {
  it('TEST-030 / AC 14 the Large load (test-data-5000, 1,667 cards, reserved deck ids, 2 locks) is accepted for the owner', async () => {
    expect(Object.keys(collectionDoc().cards)).toHaveLength(1667);
    expect(plan.decks.map((d) => d.id)).toEqual([...TEST_DECK_IDS]);
    const f = db(UID);
    for (let i = 0; i < 3; i++) await assertSucceeds(setDoc(doc(f, `users/${UID}/decks/${TEST_DECK_IDS[i]}`), deckDoc(i)));
    await assertSucceeds(setDoc(doc(f, `users/${UID}/state/collection`), collectionDoc()));
    await assertSucceeds(setDoc(doc(f, `users/${UID}/state/locks`), locksDoc()));
  });

  it('TEST-030 / AC 14 another user cannot write the test data into the account', async () => {
    const f = db('someoneElse');
    await assertFails(setDoc(doc(f, `users/${UID}/state/collection`), collectionDoc()));
    await assertFails(setDoc(doc(f, `users/${UID}/decks/${TEST_DECK_IDS[0]}`), deckDoc(0)));
  });

  it('TEST-050 / TEST-051 Remove is accepted: one update() with catalogVersion "" and a tombstone per card, the locks update and the 3 deck tombstones', async () => {
    const f = db(UID);
    for (let i = 0; i < 3; i++) await setDoc(doc(f, `users/${UID}/decks/${TEST_DECK_IDS[i]}`), deckDoc(i));
    await setDoc(doc(f, `users/${UID}/state/collection`), collectionDoc());
    await setDoc(doc(f, `users/${UID}/state/locks`), locksDoc());
    // as the adapter's mapWrite: FieldPath pairs (keys contain spaces)
    const pairs: unknown[] = [new FieldPath('updatedAt'), T, new FieldPath('syncedAt'), serverTimestamp(), new FieldPath('catalogVersion'), ''];
    for (const k of Object.keys(plan.collection.cards)) pairs.push(new FieldPath('cards', k), { q: 0, t: MS + 1, p: {} });
    const [field, value, ...more] = pairs as [FieldPath, unknown, ...unknown[]];
    await assertSucceeds(updateDoc(doc(f, `users/${UID}/state/collection`), field, value, ...more));
    await assertSucceeds(
      updateDoc(
        doc(f, `users/${UID}/state/locks`),
        new FieldPath('updatedAt'), T, new FieldPath('syncedAt'), serverTimestamp(),
        new FieldPath('locks', TEST_DECK_IDS[0]), { lockedAt: null, updatedAt: T },
        new FieldPath('locks', TEST_DECK_IDS[1]), { lockedAt: null, updatedAt: T },
      ),
    );
    for (const id of TEST_DECK_IDS)
      await assertSucceeds(
        setDoc(doc(f, `users/${UID}/decks/${id}`), { schemaVersion: 1, createdAt: T, updatedAt: T, deletedAt: T, syncedAt: serverTimestamp() }),
      );
  });
});
