/**
 * SPEC-010 SYNC-110…114 and SYNC-160 security-rules tests against the Firestore emulator (AC 22, AC 28, AC 29).
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
import { ALLOWED_USERNAMES, BOLD_A, DENIED_USERNAMES } from '../src/app/shared/account/username-cases';
import { checkUsername, normalizeUsername } from '../src/app/shared/account/username';

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
  // SYNC-017 v0.18: one entry per deck and card name, key `<deckId>|<cardKey>`.
  locks: {
    [`${DECK}|hextech ray`]: { lockedAt: T, updatedAt: T },
    '0b7c0000-0000-4000-8000-000000000002|gust': { lockedAt: null, updatedAt: T },
  },
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

  it('SYNC-112 a deck whose duplicatedFrom has 37 characters is denied; 36 is allowed (AC 22)', async () => {
    const a = db('uA');
    await assertFails(setDoc(ref(a, `users/uA/decks/${DECK}`), liveDeck({ duplicatedFrom: 'x'.repeat(37) })));
    await assertSucceeds(setDoc(ref(a, `users/uA/decks/${DECK}`), liveDeck({ duplicatedFrom: 'x'.repeat(36) })));
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

  it('SYNC-112 v0.18 (H-665) locks map cap: 6000 name-lock entries pass, 6001 fail', async () => {
    const a = db('uA');
    const locks = (n: number) =>
      Object.fromEntries(
        Array.from({ length: n }, (_, i) => [
          `0b7c0000-0000-4000-8000-${String(Math.floor(i / 60)).padStart(12, '0')}|card name ${i % 60}`,
          { lockedAt: T, updatedAt: T },
        ]),
      );
    await assertSucceeds(setDoc(ref(a, 'users/uA/state/locks'), { ...locksDoc(), locks: locks(6000) }));
    await assertFails(setDoc(ref(a, 'users/uA/state/locks'), { ...locksDoc(), locks: locks(6001) }));
  });

  it("SYNC-017 v0.18 (H-665) a FieldPath update of name-lock keys (spaces, an apostrophe) with the deleteField() of an old per-deck key is allowed", async () => {
    const a = db('uA');
    await assertSucceeds(setDoc(ref(a, 'users/uA/state/locks'), { ...locksDoc(), locks: { [DECK]: { lockedAt: T, updatedAt: T } } }));
    await assertSucceeds(
      updateDoc(
        ref(a, 'users/uA/state/locks'),
        new FieldPath('locks', `${DECK}|kai'sa, survivor`),
        { lockedAt: T, updatedAt: T },
        new FieldPath('locks', `${DECK}|hextech ray`),
        { lockedAt: T, updatedAt: T },
        new FieldPath('locks', DECK),
        deleteField(),
        new FieldPath('updatedAt'),
        T,
        new FieldPath('syncedAt'),
        serverTimestamp(),
      ),
    );
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

describe('SYNC-112 / SYNC-156 / SYNC-160 account username (v0.16, H-212 / H-213; AC 22, AC 74, AC 76)', () => {
  const upd = (f: Firestore, username: unknown) =>
    updateDoc(ref(f, 'users/uA'), { username, updatedAt: T, syncedAt: serverTimestamp() });
  /** 👨🏽\u{200D}👩🏽\u{200D}👧🏽\u{200D}👦🏽: a v0.14 client accepted 24 of them (456 UTF-16 units). */
  const FAMILY = '\u{1F468}\u{1F3FD}\u{200D}\u{1F469}\u{1F3FD}\u{200D}\u{1F467}\u{1F3FD}\u{200D}\u{1F466}\u{1F3FD}';
  /** Did the rules allow this update? (a fresh name each time: the unchanged-name shortcut never applies) */
  const verdict = async (username: string): Promise<boolean> => {
    await env.clearFirestore();
    await seed();
    try {
      await assertSucceeds(upd(db('uA'), username));
      return true;
    } catch {
      return false;
    }
  };

  it("AC 22 / SYNC-112 an update with username 'RJ Smith' (createdAt kept) is allowed", async () => {
    await assertSucceeds(upd(db('uA'), 'RJ Smith'));
  });

  it('AC 22 / SYNC-156 a username on the create of users/uA is denied, even a valid one (never set at creation)', async () => {
    await env.clearFirestore();
    await assertFails(setDoc(ref(db('uA'), 'users/uA'), { ...account(), username: 'RJ Smith' }));
    await assertSucceeds(setDoc(ref(db('uA'), 'users/uA'), account()));
  });

  it('AC 22 / SYNC-160 (b) an empty username or a numeric one is denied', async () => {
    const a = db('uA');
    await assertFails(upd(a, ''));
    await assertFails(upd(a, 42));
  });

  for (const c of ALLOWED_USERNAMES) {
    it(`AC 22 / SYNC-160 allowed: ${c.label}`, async () => {
      await assertSucceeds(upd(db('uA'), c.value));
    });
  }

  for (const c of DENIED_USERNAMES) {
    it(`AC 22 / SYNC-160 denied: ${c.label}`, async () => {
      await assertFails(upd(db('uA'), c.value));
    });
  }

  describe('SYNC-160 (g) the four proofs (a failure stops the build, SYNC-160 (h); never loosened)', () => {
    it('SYNC-160 (g) 20 × U+1D400 allowed and 21 × U+1D400 denied: \\p{L} outside the BMP, {0,19} counts code points', async () => {
      const twenty = BOLD_A.repeat(20);
      expect([...twenty].length).toBe(20);
      expect(twenty.length).toBe(40);
      expect(new TextEncoder().encode(twenty).length).toBe(80);
      expect(await verdict(twenty)).toBe(true);
      expect(await verdict(BOLD_A.repeat(21))).toBe(false);
    });

    it('SYNC-160 (g) नमस्ते allowed: \\p{Mn} and \\p{Mc}', async () => {
      expect(await verdict('नमस्ते')).toBe(true);
    });

    it('SYNC-160 (g) O’Neil (U+2019) allowed: the non-ASCII apostrophe in the rules source', async () => {
      expect(await verdict('O’Neil')).toBe(true);
    });

    it('SYNC-160 (g) a + U+FE0F denied: the variation-selector exclusion (the class alone admits it)', async () => {
      expect(await verdict('a️')).toBe(false);
      // control: the same name without the selector is allowed
      expect(await verdict('a')).toBe(true);
    });
  });

  it('SYNC-160 (f) the invariant: every AC 22 name the client normalization leaves unchanged gets the same verdict from username.ts and the rules', async () => {
    const shared = [...ALLOWED_USERNAMES, ...DENIED_USERNAMES].filter((c) => normalizeUsername(c.value) === c.value);
    // the filter keeps most of the list (only the trimmed, collapsed or NFD ones are rules-only)
    expect(shared.length).toBeGreaterThanOrEqual(20);
    const mismatches: string[] = [];
    for (const c of shared) {
      const client = checkUsername(c.value).ok;
      const rules = await verdict(c.value);
      if (client !== rules) mismatches.push(`${c.label}: client ${client}, rules ${rules}`);
    }
    expect(mismatches).toEqual([]);
  });

  it('AC 22 / SYNC-160 (a) an unchanged legacy username (24 × the skin-tone family emoji, saved under v0.14) does not block a lastClientVersion update; a new 😀 or 81 × a is denied; Zoé (NFC) is allowed', async () => {
    const legacy = FAMILY.repeat(24);
    expect(legacy.length).toBe(456);
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(ref(ctx.firestore() as unknown as Firestore, 'users/uA'), { username: legacy });
    });
    const a = db('uA');
    await assertSucceeds(updateDoc(ref(a, 'users/uA'), { lastClientVersion: 'web-prod-abc1234', updatedAt: T, syncedAt: serverTimestamp() }));
    // the same name written back unchanged is not re-checked either
    await assertSucceeds(upd(a, legacy));
    await assertFails(upd(a, '\u{1F600}'));
    await assertFails(upd(a, 'a'.repeat(81)));
    await assertSucceeds(upd(a, 'Zoé'));
  });

  it('AC 76 / SYNC-155 the username write is one update() of username, updatedAt and syncedAt; a client syncedAt is denied', async () => {
    const a = db('uA');
    await assertSucceeds(upd(a, 'RJ Smith'));
    await assertFails(updateDoc(ref(a, 'users/uA'), { username: 'RJ', updatedAt: T, syncedAt: T }));
    // another user cannot set uA's name
    await assertFails(upd(db('uB'), 'Mallory'));
  });

  it('H-183 which unit string.size() counts: probed on lastClientVersion (≤ 40) with 😀 × 15 and × 25 (code points 15 / 25, UTF-16 30 / 50, UTF-8 60 / 100)', async () => {
    // Since v0.16 no name the username pattern allows can exceed 80 in any unit, so the probe moved to the 40 cap.
    const probe = async (n: number) => {
      try {
        await assertSucceeds(
          updateDoc(ref(db('uA'), 'users/uA'), { lastClientVersion: '\u{1F600}'.repeat(n), updatedAt: T, syncedAt: serverTimestamp() }),
        );
        return true;
      } catch {
        return false;
      }
    };
    const r15 = await probe(15);
    const r25 = await probe(25);
    const unit = r25 ? 'code points' : r15 ? 'UTF-16 units' : 'UTF-8 bytes';
    console.log(`[H-183] Firestore rules string.size() counts ${unit} (15 emoji: ${r15}, 25 emoji: ${r25})`);
    expect(unit).toBe(SIZE_UNIT);
  });
});

/** Recorded by the H-183 probe above against the Firestore emulator (H-176, 2026-11-25; re-run on lastClientVersion in H-213): UTF-16 units. Production is unverified. */
const SIZE_UNIT = 'UTF-16 units';

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
