/**
 * The Firebase adapters of SPEC-010 (SYNC-130): `AuthService` over Firebase Auth (Google and email
 * link, SYNC-006) and `RemoteStore` over Cloud Firestore. This folder is the only place in `web/`
 * that imports `firebase` (V-011, H-072), and it is reached only through a dynamic `import()` from
 * `SyncService`, so the package is never in the initial bundle (SYNC-002).
 *
 * Inside the engine every timestamp is milliseconds; this file converts to and from `Timestamp` and
 * writes `syncedAt` as the server timestamp (SYNC-011).
 */
import { initializeApp } from 'firebase/app';
import {
  Auth,
  GoogleAuthProvider,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  connectAuthEmulator,
  deleteUser,
  indexedDBLocalPersistence,
  initializeAuth,
  isSignInWithEmailLink,
  reauthenticateWithPopup,
  reload,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  DocumentData,
  FieldPath,
  Firestore,
  Timestamp,
  WriteBatch,
  collection,
  connectFirestoreEmulator,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  initializeFirestore,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import type {
  AccountCheck,
  AuthProviderId,
  AccountDoc,
  AuthProviderInfo,
  AuthService,
  CloudLock,
  CloudTag,
  CollectionDoc,
  DeckDoc,
  DeleteAllResult,
  LocksDoc,
  Ms,
  PullResult,
  PushChanges,
  PushOutcome,
  RemoteErrorCode,
  RemoteStore,
  StoredSyncLog,
  TagsDoc,
} from '../../../shared/sync/sync-types';
import { PROVIDER_LABELS, RemoteError, enabledProviders, isTagTombstone } from '../../../shared/sync/sync-types';

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  /** Local development: talk to the Auth (9099) and Firestore (8080) emulators. */
  useEmulators: boolean;
}

/** Email kept on this device between "send link" and opening it (Firebase's recommended flow). */
const EMAIL_KEY = 'rift.emailForSignIn';
/** Firestore keeps unacknowledged writes queued while offline; a write this slow counts as offline (SYNC-080). */
const WRITE_TIMEOUT_MS = 20_000;
/** Writes per first-sign-in batch (SYNC-050, SYNC-113 rule-lookup limit). */
const BATCH_CHUNK = 10;
/** Firebase asks for a recent sign-in before deleting a user (SYNC-096 step 1). */
const RECENT_SIGN_IN_MS = 5 * 60_000;

export function createFirebaseAdapters(
  config: FirebaseWebConfig,
  providers: readonly AuthProviderId[],
): { auth: AuthService; remote: RemoteStore } {
  const app = initializeApp({
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    projectId: config.projectId,
    appId: config.appId,
  });
  const auth = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    popupRedirectResolver: browserPopupRedirectResolver,
  });
  // No offline cache: correctness never depends on Firestore's own cache (SYNC-080).
  const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
  if (config.useEmulators) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
  return { auth: new FirebaseAuthService(auth, providers), remote: new FirestoreRemoteStore(db) };
}

// ---------------- Auth ----------------

/** Firebase error code (duck-typed: every Firebase error has a string `code`). */
const code = (e: unknown): string =>
  typeof e === 'object' && e !== null && typeof (e as { code?: unknown }).code === 'string' ? (e as { code: string }).code : '';

/** SYNC-097 mapping of a Firebase Auth error code from `checkAccount()` (see the verified codes there). */
export function mapAccountError(c: string): AccountCheck {
  if (c === 'auth/invalid-refresh-token' || c === 'auth/user-not-found') return 'deleted';
  if (c === 'auth/network-request-failed') return 'offline';
  return 'signed-out';
}

export class FirebaseAuthService implements AuthService {
  /** `enabled`: the configured providers (SYNC-006); a provider not listed is never offered or used. */
  constructor(
    private readonly auth: Auth,
    private readonly enabled: readonly AuthProviderId[] = ['email-link'],
  ) {}

  private isEnabled(id: AuthProviderId): boolean {
    return this.enabled.includes(id);
  }

  currentUid(): string | null {
    return this.auth.currentUser?.uid ?? null;
  }

  async restore(): Promise<string | null> {
    await this.auth.authStateReady();
    return this.currentUid();
  }

  providers(): AuthProviderInfo[] {
    return enabledProviders(this.enabled);
  }

  async signIn(providerId: string, email?: string): Promise<{ uid: string } | 'cancelled'> {
    if (!(providerId in PROVIDER_LABELS) || !this.isEnabled(providerId as AuthProviderId)) {
      // SYNC-006: a provider that is not enabled never opens a popup or calls Firebase.
      throw new Error(`Sign-in provider ${providerId} is not enabled`);
    }
    if (providerId === 'google') {
      try {
        const r = await signInWithPopup(this.auth, new GoogleAuthProvider());
        return { uid: r.user.uid };
      } catch (e) {
        if (['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/user-cancelled'].includes(code(e))) {
          return 'cancelled';
        }
        throw e;
      }
    }
    if (providerId === 'email-link') {
      const link = location.href;
      if (!isSignInWithEmailLink(this.auth, link)) return 'cancelled';
      const address = email ?? localStorage.getItem(EMAIL_KEY);
      if (!address) return 'cancelled';
      const r = await signInWithEmailLink(this.auth, address, link);
      localStorage.removeItem(EMAIL_KEY);
      history.replaceState(null, '', location.pathname); // drop the one-time code from the URL
      return { uid: r.user.uid };
    }
    throw new Error(`Unknown sign-in provider ${providerId}`);
  }

  async sendEmailLink(email: string): Promise<void> {
    await sendSignInLinkToEmail(this.auth, email, { url: `${location.origin}/`, handleCodeInApp: true });
    localStorage.setItem(EMAIL_KEY, email);
  }

  isEmailLinkReturn(): boolean {
    return isSignInWithEmailLink(this.auth, location.href);
  }

  /** True when the email for a returning link is not stored on this device (opened elsewhere). */
  emailLinkNeedsAddress(): boolean {
    return localStorage.getItem(EMAIL_KEY) === null;
  }

  async signOut(): Promise<void> {
    await signOut(this.auth);
  }

  needsRecentSignIn(): boolean {
    const last = this.auth.currentUser?.metadata.lastSignInTime;
    return !last || Date.now() - Date.parse(last) > RECENT_SIGN_IN_MS;
  }

  /**
   * SYNC-096 step 1. Google re-authenticates in a popup, only while Google is an enabled provider and
   * the user has a Google identity. Otherwise (email link) the user cannot re-authenticate inside this
   * dialog (it needs a new link): 'needs-sign-in', and the UI asks them to sign in again first.
   */
  async reauthenticate(): Promise<'ok' | 'cancelled' | 'needs-sign-in'> {
    const user = this.auth.currentUser;
    if (!user) return 'needs-sign-in';
    if (!this.isEnabled('google') || !user.providerData.some((p) => p.providerId === 'google.com')) {
      return 'needs-sign-in';
    }
    try {
      await reauthenticateWithPopup(user, new GoogleAuthProvider());
      return 'ok';
    } catch {
      return 'cancelled';
    }
  }

  /**
   * SYNC-097. Verified against the Auth emulator (firebase-tools 15.37.0, emulator auth, firebase JS
   * 13.4.0; test `web/rules-tests/auth.test.ts`, 2026-11-23):
   * - deleted user: `reload()` fails with `auth/user-token-expired` (NOT `auth/user-not-found`), and a
   *   forced token refresh `getIdToken(true)` fails with `auth/invalid-refresh-token`;
   * - revoked tokens (validSince moved): `reload()` fails with `auth/user-token-expired`, the forced
   *   refresh still succeeds in the emulator;
   * - disabled user: both fail with `auth/user-disabled`.
   * So `reload()` alone cannot tell deleted from revoked. The forced refresh runs first: a refresh token
   * the server rejects as invalid or whose user is not found means `deleted`. Production uses
   * `USER_NOT_FOUND` for a deleted user on the token endpoint (mapped by the SDK to `auth/user-not-found`):
   * both codes map to `deleted`; production behaviour itself stays `unverified`. Everything unclear is
   * `signed-out` (data kept). Note: the SDK signs the user out on these errors.
   */
  async checkAccount(): Promise<AccountCheck> {
    const user = this.auth.currentUser;
    if (!user) return 'signed-out';
    try {
      await user.getIdToken(true);
      await reload(user);
      return 'ok';
    } catch (e) {
      return mapAccountError(code(e));
    }
  }

  async deleteUser(): Promise<'ok' | 'needs-recent-sign-in'> {
    const user = this.auth.currentUser;
    if (!user) return 'ok';
    try {
      await deleteUser(user);
      return 'ok';
    } catch (e) {
      if (code(e) === 'auth/requires-recent-login') return 'needs-recent-sign-in';
      throw e;
    }
  }
}

// ---------------- Firestore ----------------

/** ms (with sub-ms fraction kept for cursors) ↔ Timestamp. */
export const toTs = (ms: Ms): Timestamp => {
  const seconds = Math.floor(ms / 1000);
  const nanos = Math.round((ms - seconds * 1000) * 1e3) * 1e3; // microsecond precision, like Firestore
  return new Timestamp(seconds, Math.min(nanos, 999_999_000));
};
export const fromTs = (t: unknown): Ms => (t instanceof Timestamp ? t.seconds * 1000 + t.nanoseconds / 1e6 : (t as Ms));

export function remoteCode(e: unknown): RemoteErrorCode {
  if (e instanceof RemoteError) return e.code;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline';
  const c = code(e);
  if (c === 'unavailable' || c === 'deadline-exceeded') return 'offline';
  if (c === 'resource-exhausted') return 'quota';
  if (c === 'permission-denied') return 'permission-denied';
  if (c === 'not-found') return 'not-found';
  if (c === 'unauthenticated') return 'unauthenticated';
  if (c === 'invalid-argument' && /size|too large|exceeds/i.test((e as Error).message)) return 'too-large';
  return 'unknown';
}

/**
 * SYNC-096 step 2: runs `count` deletes in order and stops at the first failure. `removedAny` is true
 * when an earlier delete of this attempt succeeded, or when the failing one timed out (`'unconfirmed'`)
 * and so may still land.
 */
export async function deleteInOrder(count: number, del: (i: number) => Promise<void>): Promise<DeleteAllResult> {
  for (let i = 0; i < count; i++) {
    try {
      await del(i);
    } catch (e) {
      const mayHaveLanded = e instanceof RemoteError && e.code === 'unconfirmed';
      return { remaining: count - i, removedAny: i > 0 || mayHaveLanded };
    }
  }
  return 'ok';
}

/**
 * A write not acknowledged in time is `unconfirmed`, not failed: the SDK keeps it queued and may still
 * commit it, so the engine keeps its items pending and lets the next pull confirm them (SYNC-042).
 * The timer is cleared when the write settles.
 */
export function withTimeout<T>(p: Promise<T>, ms = WRITE_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new RemoteError('unconfirmed')), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

function readMeta(d: DocumentData) {
  return { schemaVersion: d['schemaVersion'] as number, updatedAt: fromTs(d['updatedAt']), syncedAt: fromTs(d['syncedAt']) };
}

function readTag(v: DocumentData): CloudTag {
  if (v['deleted'] === true) return { deleted: true, updatedAt: fromTs(v['updatedAt']) };
  return {
    label: v['label'],
    key: v['key'],
    colour: v['colour'],
    excludeFromDecks: v['excludeFromDecks'],
    createdAt: fromTs(v['createdAt']),
    updatedAt: fromTs(v['updatedAt']),
  };
}

function writeTag(t: CloudTag): DocumentData {
  if (isTagTombstone(t)) return { deleted: true, updatedAt: toTs(t.updatedAt) };
  return { ...t, createdAt: toTs(t.createdAt), updatedAt: toTs(t.updatedAt) };
}

const readLock = (v: DocumentData): CloudLock => ({
  lockedAt: v['lockedAt'] === null ? null : fromTs(v['lockedAt']),
  updatedAt: fromTs(v['updatedAt']),
});
const writeLock = (l: CloudLock): DocumentData => ({
  lockedAt: l.lockedAt === null ? null : toTs(l.lockedAt),
  updatedAt: toTs(l.updatedAt),
});

function readDeck(d: DocumentData): DeckDoc {
  const meta = readMeta(d);
  const createdAt = fromTs(d['createdAt']);
  if (d['deletedAt'] !== null && d['deletedAt'] !== undefined) {
    return { ...meta, createdAt, deletedAt: fromTs(d['deletedAt']) };
  }
  return { ...(d as DeckDoc), ...meta, createdAt, deletedAt: null } as DeckDoc;
}

function writeDeck(d: DeckDoc): DocumentData {
  const out: DocumentData = { ...d, createdAt: toTs(d.createdAt), updatedAt: toTs(d.updatedAt), syncedAt: serverTimestamp() };
  out['deletedAt'] = d.deletedAt === null ? null : toTs(d.deletedAt);
  return out;
}

export class FirestoreRemoteStore implements RemoteStore {
  constructor(private readonly db: Firestore) {}

  async getAccount(uid: string): Promise<AccountDoc | null> {
    try {
      const snap = await getDoc(doc(this.db, 'users', uid));
      if (!snap.exists()) return null;
      const d = snap.data();
      return { ...readMeta(d), createdAt: fromTs(d['createdAt']), lastClientVersion: d['lastClientVersion'] };
    } catch (e) {
      throw new RemoteError(remoteCode(e));
    }
  }

  /** SYNC-040 / SYNC-116: the two cursor queries (no cursor = full read), plus the account get. */
  async pull(uid: string, cursors: StoredSyncLog['cursors'] | null, opts: { withAccount?: boolean } = {}): Promise<PullResult> {
    try {
      const result: PullResult = { decks: {}, cursors: { state: cursors?.state ?? 0, decks: cursors?.decks ?? 0 } };
      if (opts.withAccount || cursors === null) result.account = await this.getAccount(uid);
      const stateCol = collection(this.db, 'users', uid, 'state');
      const deckCol = collection(this.db, 'users', uid, 'decks');
      const [state, decks] = await Promise.all([
        getDocs(cursors?.state != null ? query(stateCol, where('syncedAt', '>', toTs(cursors.state))) : stateCol),
        getDocs(cursors?.decks != null ? query(deckCol, where('syncedAt', '>', toTs(cursors.decks))) : deckCol),
      ]);
      for (const s of state.docs) {
        const d = s.data();
        const meta = readMeta(d);
        result.cursors.state = Math.max(result.cursors.state ?? 0, meta.syncedAt);
        if (s.id === 'collection') {
          result.collection = { ...meta, catalogVersion: d['catalogVersion'], cards: d['cards'] ?? {} } as CollectionDoc;
        } else if (s.id === 'tags') {
          const tags: TagsDoc['tags'] = {};
          for (const [k, v] of Object.entries((d['tags'] ?? {}) as Record<string, DocumentData>)) tags[k] = readTag(v);
          result.tags = { ...meta, tags, assignments: d['assignments'] ?? {} };
        } else if (s.id === 'locks') {
          const locks: LocksDoc['locks'] = {};
          for (const [k, v] of Object.entries((d['locks'] ?? {}) as Record<string, DocumentData>)) locks[k] = readLock(v);
          result.locks = { ...meta, locks };
        }
      }
      for (const s of decks.docs) {
        const deck = readDeck(s.data());
        result.decks[s.id] = deck;
        result.cursors.decks = Math.max(result.cursors.decks ?? 0, deck.syncedAt);
      }
      return result;
    } catch (e) {
      throw new RemoteError(remoteCode(e));
    }
  }

  async push(uid: string, ch: PushChanges): Promise<PushOutcome> {
    const ops = this.ops(uid, ch);
    const outcome: PushOutcome = {};
    if (ch.batch) {
      // SYNC-050: first sign-in in batches; the first one creates the account document, so the
      // existsAfter() of every create sees it (SYNC-113). Batches are kept small because Firestore
      // limits rule lookups per batched request (the exact count is `unverified`, SYNC-113). A failed
      // batch fails its documents and every later one; the flow re-runs and links only when all succeed.
      for (let i = 0; i < ops.length; i += BATCH_CHUNK) {
        const chunk = ops.slice(i, i + BATCH_CHUNK);
        const batch = writeBatch(this.db);
        for (const op of chunk) op.batch(batch);
        try {
          await withTimeout(batch.commit());
          for (const op of chunk) outcome[op.ref] = 'ok';
        } catch (e) {
          const c = remoteCode(e);
          for (const op of ops.slice(i)) outcome[op.ref] = c;
          break;
        }
      }
      return outcome;
    }
    for (const op of ops) {
      try {
        await withTimeout(op.run());
        outcome[op.ref] = 'ok';
      } catch (e) {
        outcome[op.ref] = remoteCode(e);
      }
    }
    return outcome;
  }

  /** SYNC-096 step 2: the account document first, then every deck (tombstones included), then the state documents. */
  async deleteAll(uid: string): Promise<DeleteAllResult> {
    const paths: string[][] = [['users', uid]];
    try {
      const decks = await getDocs(collection(this.db, 'users', uid, 'decks'));
      for (const d of decks.docs) paths.push(['users', uid, 'decks', d.id]);
    } catch {
      return { remaining: 4, removedAny: false }; // the list is read before the first delete: nothing removed
    }
    for (const s of ['collection', 'tags', 'locks']) paths.push(['users', uid, 'state', s]);
    return deleteInOrder(paths.length, (i) => {
      const [first, ...rest] = paths[i];
      return withTimeout(deleteDoc(doc(this.db, first, ...rest)));
    });
  }

  /** One operation per document, in push order: decks before locks (SYNC-076). */
  private ops(uid: string, ch: PushChanges): { ref: string; run: () => Promise<void>; batch: (b: WriteBatch) => void }[] {
    const ops: { ref: string; run: () => Promise<void>; batch: (b: WriteBatch) => void }[] = [];
    const meta = (updatedAt: Ms) => ({ schemaVersion: 1, updatedAt: toTs(updatedAt), syncedAt: serverTimestamp() });
    const set = (ref: string, path: string[], data: DocumentData) => {
      const r = doc(this.db, path[0], ...path.slice(1));
      ops.push({ ref, run: () => setDoc(r, data), batch: (b) => void b.set(r, data) });
    };
    const update = (ref: string, path: string[], pairs: unknown[]) => {
      const r = doc(this.db, path[0], ...path.slice(1));
      const [field, value, ...more] = pairs as [FieldPath, unknown, ...unknown[]];
      ops.push({ ref, run: () => updateDoc(r, field, value, ...more), batch: (b) => void b.update(r, field, value, ...more) });
    };
    const mapWrite = (
      ref: string,
      name: string,
      replace: boolean,
      top: DocumentData,
      maps: [string, Record<string, DocumentData>, string[]][],
    ) => {
      const path = ['users', uid, 'state', name];
      if (replace) {
        const data: DocumentData = { ...top };
        for (const [field, values] of maps) data[field] = values;
        set(ref, path, data);
        return;
      }
      // SYNC-014: one FieldPath per item (never a dotted string: keys contain spaces and commas).
      const pairs: unknown[] = [];
      for (const [k, v] of Object.entries(top)) pairs.push(new FieldPath(k), v);
      for (const [field, values, purge] of maps) {
        for (const [k, v] of Object.entries(values)) pairs.push(new FieldPath(field, k), v);
        for (const k of purge) pairs.push(new FieldPath(field, k), deleteField());
      }
      update(ref, path, pairs);
    };

    if (ch.account?.create) {
      set('account', ['users', uid], {
        ...meta(ch.account.updatedAt),
        createdAt: toTs(ch.account.createdAt),
        lastClientVersion: ch.account.lastClientVersion,
      });
    }
    for (const [id, d] of Object.entries(ch.decks ?? {})) set(`deck:${id}`, ['users', uid, 'decks', id], writeDeck(d));
    for (const id of ch.hardDelete ?? []) {
      const r = doc(this.db, 'users', uid, 'decks', id);
      ops.push({ ref: `delete:${id}`, run: () => deleteDoc(r), batch: (b) => void b.delete(r) });
    }
    if (ch.collection) {
      const c = ch.collection;
      mapWrite('collection', 'collection', c.replace, { ...meta(c.updatedAt), catalogVersion: c.catalogVersion }, [
        ['cards', c.cards, c.purge],
      ]);
    }
    if (ch.tags) {
      const t = ch.tags;
      const tags = Object.fromEntries(Object.entries(t.tags).map(([k, v]) => [k, writeTag(v)]));
      mapWrite('tags', 'tags', t.replace, meta(t.updatedAt), [
        ['tags', tags, t.purgeTags],
        ['assignments', t.assignments as Record<string, DocumentData>, t.purgeAssignments],
      ]);
    }
    if (ch.locks) {
      const l = ch.locks;
      const locks = Object.fromEntries(Object.entries(l.locks).map(([k, v]) => [k, writeLock(v)]));
      mapWrite('locks', 'locks', l.replace, meta(l.updatedAt), [['locks', locks, l.purge]]);
    }
    if (ch.account && !ch.account.create) {
      // SYNC-012: updated with update(), never set().
      update('account', ['users', uid], [
        new FieldPath('updatedAt'),
        toTs(ch.account.updatedAt),
        new FieldPath('syncedAt'),
        serverTimestamp(),
        new FieldPath('lastClientVersion'),
        ch.account.lastClientVersion,
      ]);
    }
    return ops;
  }
}
