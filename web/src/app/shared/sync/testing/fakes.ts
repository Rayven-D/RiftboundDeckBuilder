/**
 * In-memory fakes of the SPEC-010 adapters for unit tests (SYNC-131): a Firestore-like server with
 * billed read / write counts, server-time `syncedAt`, cursor queries, the SYNC-113 create rule, and
 * failure injection; and an `AuthService` fake. Test-only: nothing in the app imports this file.
 */
import {
  AccountCheck,
  AccountDoc,
  AuthProviderId,
  AuthProviderInfo,
  AuthService,
  CollectionDoc,
  DeckDoc,
  DeleteAllResult,
  LocksDoc,
  Ms,
  PullResult,
  PushChanges,
  PushOutcome,
  RemoteError,
  RemoteErrorCode,
  RemoteStore,
  StoredSyncLog,
  TagsDoc,
  enabledProviders,
} from '../sync-types';

// Test documents are loosely typed so specs can read any field.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = Record<string, any> & { syncedAt: Ms };

export class FakeFirestore {
  /** path → document */
  readonly docs = new Map<string, Doc>();
  reads = 0;
  writes = 0;
  deletes = 0;
  /** Every write in order, for assertions: [path, kind]. */
  readonly writeLog: [string, 'set' | 'update' | 'delete'][] = [];
  /** Every `push()` call's changes as sent (a clone), for assertions on the payload shape (SYNC-050). */
  readonly pushLog: PushChanges[] = [];
  serverTime: Ms = Date.UTC(2026, 10, 23, 12);
  private lastSynced = 0;

  tick(): Ms {
    this.lastSynced = Math.max(this.serverTime, this.lastSynced + 1);
    return this.lastSynced;
  }

  /** Loosely typed on purpose: specs read any field of a stored document. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(path: string): any {
    return this.docs.get(path);
  }

  resetCounts(): void {
    this.reads = 0;
    this.writes = 0;
    this.deletes = 0;
    this.writeLog.length = 0;
    this.pushLog.length = 0;
  }
}

export interface FailRule {
  /** Document ref ('account' | 'collection' | 'tags' | 'locks' | 'deck:<id>'), or '*' for all. */
  ref: string;
  code: RemoteErrorCode;
  /** Only creates (document does not exist yet). */
  createsOnly?: boolean;
  once?: boolean;
}

/** One device's connection to the shared `FakeFirestore`. */
export class FakeRemote implements RemoteStore {
  offline = false;
  quota = false;
  failRules: FailRule[] = [];
  /** Every pull and account get fails with this code. */
  pullError: RemoteErrorCode | null = null;
  /** SYNC-096 retry tests: fail deletion after this many deletes (once). */
  failDeleteAfter: number | null = null;
  /** SYNC-096: the code of that failed delete; `'unconfirmed'` may have landed, so it counts as removed. */
  failDeleteCode: RemoteErrorCode = 'unknown';
  /** SYNC-096: the deck-list read before the first delete fails (once), so nothing is deleted. */
  failDeckList = false;

  constructor(readonly db: FakeFirestore) {}

  async getAccount(uid: string): Promise<AccountDoc | null> {
    this.checkUp();
    this.db.reads += 1;
    return (this.db.get(`users/${uid}`) as unknown as AccountDoc) ?? null;
  }

  async pull(
    uid: string,
    cursors: StoredSyncLog['cursors'] | null,
    opts: { withAccount?: boolean } = {},
  ): Promise<PullResult> {
    this.checkUp();
    const result: PullResult = { decks: {}, cursors: { state: cursors?.state ?? null, decks: cursors?.decks ?? null } };
    if (opts.withAccount || cursors === null) {
      this.db.reads += 1;
      result.account = (structuredClone(this.db.get(`users/${uid}`)) as unknown as AccountDoc) ?? null;
    }
    const query = (prefix: string, cursor: Ms | null) => {
      const hits = [...this.db.docs.entries()].filter(
        ([p, d]) => p.startsWith(prefix) && !p.slice(prefix.length).includes('/') && (cursor === null || d.syncedAt > cursor),
      );
      this.db.reads += Math.max(1, hits.length);
      return hits.map(([p, d]) => [p.slice(prefix.length), structuredClone(d)] as const);
    };
    for (const [name, d] of query(`users/${uid}/state/`, cursors?.state ?? null)) {
      if (name === 'collection') result.collection = d as unknown as CollectionDoc;
      if (name === 'tags') result.tags = d as unknown as TagsDoc;
      if (name === 'locks') result.locks = d as unknown as LocksDoc;
      result.cursors.state = Math.max(result.cursors.state ?? 0, d.syncedAt);
    }
    for (const [id, d] of query(`users/${uid}/decks/`, cursors?.decks ?? null)) {
      result.decks[id] = d as unknown as DeckDoc;
      result.cursors.decks = Math.max(result.cursors.decks ?? 0, d.syncedAt);
    }
    if (cursors === null) {
      result.cursors.state ??= 0;
      result.cursors.decks ??= 0;
    }
    return result;
  }

  async push(uid: string, ch: PushChanges): Promise<PushOutcome> {
    this.checkUp();
    this.db.pushLog.push(structuredClone(ch));
    const ops: { ref: string; path: string; apply: () => void; create: boolean }[] = [];
    const base = `users/${uid}`;
    const exists = (p: string) => this.db.docs.has(p);
    const meta = (updatedAt: Ms) => ({ schemaVersion: 1, updatedAt, syncedAt: 0 });

    if (ch.account) {
      const a = ch.account;
      const path = base;
      ops.push({
        ref: 'account',
        path,
        create: a.create,
        apply: () => {
          if (a.create) this.set(path, { ...meta(a.updatedAt), createdAt: a.createdAt, lastClientVersion: a.lastClientVersion });
          else this.update(path, { updatedAt: a.updatedAt, lastClientVersion: a.lastClientVersion });
        },
      });
    }
    for (const [id, d] of Object.entries(ch.decks ?? {})) {
      const path = `${base}/decks/${id}`;
      ops.push({ ref: `deck:${id}`, path, create: !exists(path), apply: () => this.set(path, { ...d }) });
    }
    const mapDoc = (name: 'collection' | 'tags' | 'locks', replace: boolean, full: Record<string, unknown>, maps: Record<string, [Record<string, unknown>, string[]]>) => {
      const path = `${base}/state/${name}`;
      ops.push({
        ref: name,
        path,
        create: replace && !exists(path), // update() never creates: a missing document is not-found
        apply: () => {
          if (replace) {
            const doc: Record<string, unknown> = { ...full };
            for (const [field, [values]] of Object.entries(maps)) doc[field] = { ...values };
            this.set(path, doc);
            return;
          }
          const cur = this.db.get(path);
          if (!cur) throw new RemoteError('not-found');
          const next = structuredClone(cur) as Record<string, unknown>;
          Object.assign(next, full);
          for (const [field, [values, purge]] of Object.entries(maps)) {
            const m = { ...((next[field] as Record<string, unknown>) ?? {}) };
            for (const [k, v] of Object.entries(values)) m[k] = v; // FieldPath: replaced whole
            for (const k of purge) delete m[k]; // deleteField()
            next[field] = m;
          }
          this.update(path, next, true);
        },
      });
    };
    if (ch.collection) {
      const c = ch.collection;
      mapDoc('collection', c.replace, { ...meta(c.updatedAt), catalogVersion: c.catalogVersion }, { cards: [c.cards, c.purge] });
    }
    if (ch.tags) {
      const t = ch.tags;
      mapDoc('tags', t.replace, meta(t.updatedAt), {
        tags: [t.tags, t.purgeTags],
        assignments: [t.assignments, t.purgeAssignments],
      });
    }
    if (ch.locks) {
      const l = ch.locks;
      mapDoc('locks', l.replace, meta(l.updatedAt), { locks: [l.locks, l.purge] });
    }
    for (const id of ch.hardDelete ?? []) {
      const path = `${base}/decks/${id}`;
      ops.push({ ref: `delete:${id}`, path, create: false, apply: () => this.del(path) });
    }

    const outcome: PushOutcome = {};
    const check = (o: (typeof ops)[number]): RemoteErrorCode | null => {
      for (const r of this.failRules) {
        if ((r.ref === '*' || r.ref === o.ref) && (!r.createsOnly || o.create)) {
          if (r.once) this.failRules = this.failRules.filter((x) => x !== r);
          return r.code;
        }
      }
      // SYNC-113: creating a state or decks document needs the account document after the write. Writes
      // are applied one by one in order (no batches, SYNC-050), so an account created earlier in this push counts.
      if (o.create && o.ref !== 'account' && !o.ref.startsWith('delete:') && !exists(base)) return 'permission-denied';
      return null;
    };
    for (const o of ops) {
      const code = check(o);
      if (code) {
        outcome[o.ref] = code;
        continue;
      }
      try {
        o.apply();
        outcome[o.ref] = 'ok';
      } catch (e) {
        outcome[o.ref] = e instanceof RemoteError ? e.code : 'unknown';
      }
    }
    return outcome;
  }

  /** SYNC-155: one update() of users/{uid}; a missing account is not-found (never a set()). Fail rules use ref 'username'. */
  async setUsername(uid: string, username: string): Promise<'ok' | RemoteErrorCode> {
    if (this.offline) return 'offline';
    if (this.quota) return 'quota';
    for (const r of this.failRules) {
      if (r.ref === '*' || r.ref === 'username') {
        if (r.once) this.failRules = this.failRules.filter((x) => x !== r);
        return r.code;
      }
    }
    try {
      this.update(`users/${uid}`, { username, updatedAt: this.db.serverTime });
      return 'ok';
    } catch (e) {
      return e instanceof RemoteError ? e.code : 'unknown';
    }
  }

  async deleteAll(uid: string): Promise<DeleteAllResult> {
    this.checkUp();
    if (this.failDeckList) {
      this.failDeckList = false;
      return { remaining: 4, removedAny: false };
    }
    const base = `users/${uid}`;
    const order = [
      base,
      ...[...this.db.docs.keys()].filter((p) => p.startsWith(`${base}/decks/`)).sort(),
      `${base}/state/collection`,
      `${base}/state/tags`,
      `${base}/state/locks`,
    ];
    this.db.reads += 1; // the decks listing
    for (let i = 0; i < order.length; i++) {
      if (this.failDeleteAfter !== null && this.db.deletes >= this.failDeleteAfter) {
        this.failDeleteAfter = null;
        return { remaining: order.length - i, removedAny: i > 0 || this.failDeleteCode === 'unconfirmed' };
      }
      this.del(order[i]);
    }
    return 'ok';
  }

  private checkUp(): void {
    if (this.pullError) throw new RemoteError(this.pullError);
    if (this.offline) throw new RemoteError('offline');
    if (this.quota) throw new RemoteError('quota');
  }

  private set(path: string, data: Record<string, unknown>): void {
    this.db.writes += 1;
    this.db.writeLog.push([path, 'set']);
    this.db.docs.set(path, { ...structuredClone(data), syncedAt: this.db.tick() });
  }

  private update(path: string, data: Record<string, unknown>, whole = false): void {
    const cur = this.db.get(path);
    if (!cur) throw new RemoteError('not-found');
    this.db.writes += 1;
    this.db.writeLog.push([path, 'update']);
    const next = whole ? data : { ...cur, ...data };
    this.db.docs.set(path, { ...structuredClone(next), syncedAt: this.db.tick() });
  }

  private del(path: string): void {
    if (!this.db.docs.has(path)) return;
    this.db.deletes += 1;
    this.db.writeLog.push([path, 'delete']);
    this.db.docs.delete(path);
  }
}

export class FakeAuth implements AuthService {
  uid: string | null = null;
  /** The uid the next sign-in returns, or 'cancelled' / 'error'. */
  nextSignIn: string | 'cancelled' | 'error' = 'uA';
  account: AccountCheck = 'ok';
  recentSignIn = true;
  reauthResult: 'ok' | 'cancelled' | 'needs-sign-in' = 'ok';
  deleteResults: ('ok' | 'needs-recent-sign-in')[] = [];
  signOuts = 0;
  deletedUser = false;
  emailLinksSent: string[] = [];
  /** H-145: what `signIn()` throws when `nextSignIn` is 'error' (e.g. `{ code: 'auth/expired-action-code' }`). */
  signInError: unknown = undefined;
  /** What `currentEmail()` reports (SYNC-003, H-141); null = Auth has no address for the user. */
  email: string | null = null;
  /** Order of calls, for SYNC-096 ordering checks. */
  readonly calls: string[] = [];

  currentUid(): string | null {
    return this.uid;
  }
  async restore(): Promise<string | null> {
    return this.uid;
  }
  enabled: AuthProviderId[] = ['email-link'];
  providers(): AuthProviderInfo[] {
    return enabledProviders(this.enabled);
  }
  async signIn(): Promise<{ uid: string } | 'cancelled'> {
    if (this.nextSignIn === 'cancelled') return 'cancelled';
    if (this.nextSignIn === 'error') throw this.signInError ?? new Error('popup blocked');
    this.uid = this.nextSignIn;
    return { uid: this.uid };
  }
  /** H-145: the `returnTo` of each send, in order (undefined when the caller passed none). */
  emailLinkReturns: (string | undefined)[] = [];
  async sendEmailLink(email: string, returnTo?: string): Promise<void> {
    this.emailLinksSent.push(email);
    this.emailLinkReturns.push(returnTo);
  }
  isEmailLinkReturn(): boolean {
    return false;
  }
  currentEmail(): string | null {
    return this.uid ? this.email : null;
  }
  async signOut(): Promise<void> {
    this.signOuts++;
    this.uid = null;
  }
  needsRecentSignIn(): boolean {
    return !this.recentSignIn;
  }
  /** SYNC-095 (H-143): as the adapter, Google enabled and a Google identity (`googleIdentity`). */
  googleIdentity = false;
  canReauthenticate(): boolean {
    return this.uid !== null && this.enabled.includes('google') && this.googleIdentity;
  }
  async reauthenticate(): Promise<'ok' | 'cancelled' | 'needs-sign-in'> {
    this.calls.push('reauthenticate');
    if (this.reauthResult === 'ok') this.recentSignIn = true;
    return this.reauthResult;
  }
  async checkAccount(): Promise<AccountCheck> {
    this.calls.push('checkAccount');
    return this.account;
  }
  async deleteUser(): Promise<'ok' | 'needs-recent-sign-in'> {
    this.calls.push('deleteUser');
    const r = this.deleteResults.shift() ?? (this.recentSignIn ? 'ok' : 'needs-recent-sign-in');
    if (r === 'ok') {
      this.deletedUser = true;
      this.uid = null;
    }
    return r;
  }
}
