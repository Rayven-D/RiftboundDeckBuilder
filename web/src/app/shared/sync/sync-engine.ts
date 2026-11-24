import type { StoredCollection, StoredDeckLocks, StoredTags, TagStore, UserDeck } from '../storage/records';
import { LocalSnapshot, MergeResult, cloudCounts, liveCounts, mergePulled } from './merge';
import { PushPlan, applyPushSuccess, planPush } from './push-plan';
import { reconcileCollection, reconcileDecks, reconcileLocks, reconcileTags } from './stamp';
import { DAY_MS, cloneLog, emptySyncLog, itemRef, pendingCount } from './sync-log';
import {
  AccountDoc,
  AuthService,
  Ms,
  PullResult,
  PushOutcome,
  RemoteError,
  RemoteErrorCode,
  RemoteStore,
  StoredSyncLog,
  SyncLogStore,
  SyncStatus,
} from './sync-types';
import { RawCollectionStore, RawDeckStore, SerialQueue } from './tracked-stores';

/**
 * SPEC-010 sync engine: pull / merge / push, first sign-in, sign-out, account deletion and the
 * account checks. No Angular and no Firebase here: it talks to `AuthService` and `RemoteStore`
 * (SYNC-130) and to the raw local stores; the merge and push planning are pure (SYNC-131).
 */

export const MESSAGES = {
  uploaded: 'Your collection and decks are now saved to your account.',
  signInFailed: "Sign-in didn't complete. Your data on this device is unchanged.",
  offline: "You're offline.",
  sessionLost: "You've been signed out. Sign in again to sync.",
  accountDeleted: 'This account was deleted. Its data has been removed from this device.',
  halfDeleted:
    "This account is being deleted, so you've been signed out. Your collection and decks are still on this device.",
  deletedOwn: 'Your account and its data were deleted.',
  deleteIncomplete: "Some data couldn't be deleted. Try again.",
  deleteNotDone: "Your account wasn't deleted.",
  reauthNeeded:
    'To delete your account, sign out, sign in again, then choose Delete account and data within 5 minutes.',
  unreadable: "Some data on this device could not be read, so it isn't being synced.",
  invalid: "Some account data couldn't be read.",
  writeFailed: "Couldn't sync. Your changes are saved on this device. Try again.",
  tooLarge: 'This data is too large to sync.',
  paused: 'Sync paused. Your changes are saved on this device.',
  differentAccount: "This device's data was last synced with a different account.",
} as const;

/** SYNC-121 */
export const PUSH_DEBOUNCE_MS = 2000;
/** SYNC-043 */
export const PULL_BEFORE_PUSH_MS = 60_000;
/** SYNC-045 */
export const FULL_READ_AFTER_MS = 30 * DAY_MS;
/** SYNC-063 */
export const CLOCK_WARN_MS = 5 * 60_000;

export interface Counts {
  cards: number;
  decks: number;
  tags: number;
}
export interface CombineQuestion {
  device: Counts;
  account: Counts;
  differentAccount: boolean;
}

export interface LocalAdapters {
  collection: RawCollectionStore;
  tags: TagStore;
  locks: { load(): Promise<StoredDeckLocks | null>; save(l: StoredDeckLocks): Promise<void> };
  decks: RawDeckStore;
  /** SYNC-091 "Remove" / SYNC-096 step 4: every local store, including the sync log. */
  clearAll(): Promise<void>;
  /** SYNC-097 `deleted`: the synced data (collection, tags, decks, locks). */
  clearSynced(): Promise<void>;
}

export interface EngineDeps {
  local: LocalAdapters;
  log: SyncLogStore;
  queue: SerialQueue;
  /** Lazy-loads the Firebase adapters (SYNC-002). Called only on sign-in or an expected session. */
  adapters: () => Promise<{ auth: AuthService; remote: RemoteStore }>;
  now: () => Ms;
  appVersion: string;
  isOnline: () => boolean;
  confirmCombine: (q: CombineQuestion) => Promise<'combine' | 'cancel'>;
  notify: (message: string) => void;
  onStatus?: (s: SyncStatus) => void;
  /** SPEC-008 `lockedShortfalls(before, after)` (SYNC-068, SYNC-074); optional until H-059 builds it. */
  shortfalls?: (before: LocalSnapshot, after: LocalSnapshot) => { deckName: string; cardsShort: number }[];
  /** SYNC-051: run the job while holding the one-syncing-tab lock (default: run it). */
  withTabLock?: <T>(job: () => Promise<T>) => Promise<T>;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (h: unknown) => void;
}

type Problem = 'unreadable' | 'invalid' | 'write' | 'too-large' | 'rejected' | 'read-denied';

export class SyncEngine {
  private auth: AuthService | null = null;
  private remote: RemoteStore | null = null;
  private uid: string | null = null;
  private accountChecked = false;
  private stopped = false;
  private deleting = false;
  /** Mirrors `StoredSyncLog.deletingUid` for this session (SYNC-096). */
  private deletionPending = false;
  private offline = false;
  private paused = false;
  private syncing = false;
  private problem: { kind: Problem; message: string } | null = null;
  private lastPullAt: Ms | null = null;
  private pushTimer: unknown = null;
  private lastLog: StoredSyncLog = emptySyncLog();
  private readonly readOnlyAreas = new Set<string>();
  /** SYNC-063: client time of this session's writes, by document ref. */
  private readonly writeTimes = new Map<string, Ms>();

  constructor(private readonly deps: EngineDeps) {}

  // ---------- public API ----------

  get signedInUid(): string | null {
    return this.uid;
  }

  isReadOnly(area: string): boolean {
    return this.readOnlyAreas.has(area);
  }

  pendingCount(): number {
    return pendingCount(this.lastLog);
  }

  status(): SyncStatus {
    const pending = pendingCount(this.lastLog);
    if (!this.uid || this.stopped) return { kind: 'signed-out' };
    if (this.offline) return { kind: 'offline', pendingCount: pending };
    if (this.paused) return { kind: 'paused', pendingCount: pending };
    if (this.problem) return { kind: 'error', message: this.problem.message, pendingCount: pending };
    if (this.syncing) return { kind: 'syncing', pendingCount: pending };
    return { kind: 'synced', at: this.lastLog.lastSyncAt ?? this.deps.now(), pendingCount: pending };
  }

  /** Start-up (SYNC-002, SYNC-004): loads Firebase only when a session is expected. */
  async start(): Promise<void> {
    const log = await this.loadLog();
    this.lastLog = log;
    if (!log.sessionExpected) return this.emit();
    await this.ensureAdapters();
    const uid = await this.auth!.restore();
    if (!uid) return this.sessionProblem();
    await this.openSession(uid);
  }

  /** SYNC-003 / SYNC-005 / SYNC-006. `email-link` completes a link the user opened. */
  async signIn(providerId: string, email?: string): Promise<'ok' | 'cancelled' | 'failed' | 'offline'> {
    if (!this.deps.isOnline()) {
      this.deps.notify(MESSAGES.offline);
      return 'offline';
    }
    let uid: string;
    try {
      await this.ensureAdapters();
      const r = await this.auth!.signIn(providerId, email);
      if (r === 'cancelled') return 'cancelled';
      uid = r.uid;
    } catch {
      this.deps.notify(MESSAGES.signInFailed);
      return 'failed';
    }
    await this.updateLog((log) => {
      log.sessionExpected = true;
    });
    this.stopped = false;
    await this.openSession(uid);
    return 'ok';
  }

  /** SYNC-006: sends the email sign-in link. */
  async sendEmailLink(email: string): Promise<void> {
    await this.ensureAdapters();
    await this.auth!.sendEmailLink(email);
  }

  /** Sync now (SYNC-040, SYNC-043): pull, merge, push. */
  async syncNow(): Promise<void> {
    if (!this.uid || this.stopped || this.deleting || this.deletionPending) return;
    await this.guard(async () => {
      if (await this.firstSyncIncomplete()) return this.firstSignIn(this.uid!);
      const ok = await this.pullAndMerge();
      if (ok) await this.pushPending();
    });
  }

  /** After a user save (SYNC-121): one push about 2 s after the last change. */
  scheduleChange(): void {
    this.deps.log.load().then((l) => {
      if (l) this.lastLog = l;
      this.emit();
    });
    if (!this.uid || this.stopped || this.deleting || this.deletionPending) return;
    this.schedulePush(PUSH_DEBOUNCE_MS);
  }

  /** Push now (tab hidden, SYNC-043), preceded by a pull when the last one is older than 60 s. */
  async flush(): Promise<void> {
    if (!this.uid || this.stopped || this.deleting || this.deletionPending) return;
    if (this.pushTimer !== null) {
      this.deps.clearTimer?.(this.pushTimer);
      this.pushTimer = null;
    }
    await this.guard(async () => {
      if (await this.firstSyncIncomplete()) return this.firstSignIn(this.uid!);
      if (this.lastPullAt === null || this.deps.now() - this.lastPullAt > PULL_BEFORE_PUSH_MS) {
        if (!(await this.pullAndMerge())) return;
      }
      await this.pushPending();
    });
  }

  /** SYNC-090 / SYNC-091 / SYNC-092. */
  async signOut(mode: 'keep' | 'remove'): Promise<void> {
    this.cancelTimer();
    if (this.auth) await this.auth.signOut().catch(() => undefined);
    this.endSession();
    if (mode === 'remove') {
      await this.deps.queue.run(() => this.deps.local.clearAll());
      this.lastLog = emptySyncLog();
    } else {
      await this.updateLog((log) => {
        log.sessionExpected = false;
      });
    }
    this.emit();
  }

  /**
   * SYNC-095 / SYNC-096. Retry continues from where it stopped (deleting is idempotent). Once the cloud
   * deletion has started, `deletingUid` in the sync log stops every pull and push on this device (so it
   * never mistakes its own unfinished deletion for SYNC-097's half-deleted account) until a retry completes.
   */
  async deleteAccount(): Promise<'ok' | 'cancelled' | 'needs-sign-in' | 'failed' | 'offline'> {
    if (!this.uid || !this.auth || !this.remote) return 'failed';
    if (!this.deps.isOnline()) {
      this.deps.notify(MESSAGES.offline);
      return 'offline';
    }
    const uid = this.uid;
    this.deleting = true;
    this.cancelTimer();
    const reauth = async (): Promise<'ok' | 'cancelled' | 'needs-sign-in'> => {
      const r = await this.auth!.reauthenticate();
      if (r === 'needs-sign-in') this.deps.notify(MESSAGES.reauthNeeded);
      else if (r === 'cancelled') this.deps.notify(MESSAGES.deleteNotDone);
      return r;
    };
    try {
      // (1) a recent sign-in first, before anything is deleted
      if (this.auth.needsRecentSignIn()) {
        const r = await reauth();
        if (r !== 'ok') return r;
      }
      await this.updateLog((l) => {
        l.deletingUid = uid;
      });
      this.deletionPending = true;
      // (2) account document first, then every deck and the three state documents
      const r = await this.remote.deleteAll(uid);
      if (r !== 'ok') {
        this.deps.notify(MESSAGES.deleteIncomplete);
        return 'failed';
      }
      // (3) the Auth user, only after every document is gone
      let d = await this.auth.deleteUser();
      if (d === 'needs-recent-sign-in') {
        const again = await reauth();
        if (again !== 'ok') return again;
        d = await this.auth.deleteUser();
        if (d !== 'ok') {
          this.deps.notify(MESSAGES.deleteIncomplete);
          return 'failed';
        }
      }
      // (4) clear this device (the sync log too, so nothing stays pending), (5) tell the user
      this.cancelTimer();
      await this.deps.queue.run(() => this.deps.local.clearAll());
      this.lastLog = emptySyncLog();
      this.deletionPending = false;
      this.endSession();
      this.deps.notify(MESSAGES.deletedOwn);
      return 'ok';
    } catch {
      this.deps.notify(MESSAGES.deleteIncomplete);
      return 'failed';
    } finally {
      this.deleting = false;
      if (this.deletionPending) this.setProblem('write', MESSAGES.deleteIncomplete);
      this.emit();
    }
  }

  // ---------- session ----------

  private async openSession(uid: string): Promise<void> {
    this.uid = uid;
    this.accountChecked = false;
    this.stopped = false;
    this.problem = null;
    const log = await this.loadLog();
    this.deletionPending = log.deletingUid === uid;
    if (this.deletionPending) {
      // SYNC-096: this device's own deletion is unfinished: no sync until Delete is retried.
      this.setProblem('write', MESSAGES.deleteIncomplete);
      return this.emit();
    }
    await this.syncNow(); // runs the first-sign-in flow while the first sync is incomplete
  }

  /** The first sync with this uid has not completed (SYNC-048): a retry runs the first-sign-in flow again. */
  private async firstSyncIncomplete(): Promise<boolean> {
    const log = await this.loadLog();
    return log.uid !== this.uid || log.lastFullSyncAt === null;
  }

  /** SYNC-048 / SYNC-049 / SYNC-050. */
  private async firstSignIn(uid: string): Promise<void> {
    const pulled = await this.pull(uid, null, true);
    if (!pulled) return;
    const account = pulled.account ?? null;
    const hasCloudDocs = !!(pulled.collection || pulled.tags || pulled.locks || Object.keys(pulled.decks).length);
    if (!account && hasCloudDocs) return this.halfDeleted(); // (f)

    const before = await this.snapshot();
    const device = liveCounts(before.local);
    const cloud = cloudCounts({ ...pulled, fullRead: true });
    const deviceHas = device.cards + device.decks + device.tags + device.locks > 0;
    const cloudHas = !!account && cloud.cards + cloud.decks + cloud.tags + cloud.locks > 0;
    // A retry of this device's own interrupted upload into this account (part of it may already be
    // written) resumes as case (b) without asking; latest change wins per item as usual (SYNC-048).
    const resuming = !!account && before.log.uploadingUid === uid;

    let mode: 'regular' | 'combine' = 'regular';
    if (deviceHas && cloudHas && !resuming) {
      const choice = await this.deps.confirmCombine({
        device: { cards: device.cards, decks: device.decks, tags: device.tags },
        account: { cards: cloud.cards, decks: cloud.decks, tags: cloud.tags },
        differentAccount: before.log.uid !== null && before.log.uid !== uid,
      });
      if (choice === 'cancel') {
        // SYNC-049: sign out, change nothing, link nothing.
        await this.auth?.signOut().catch(() => undefined);
        this.endSession();
        await this.updateLog((log) => {
          log.sessionExpected = false;
        });
        return;
      }
      mode = 'combine';
    }

    const now = this.deps.now();
    const merged = await this.deps.queue.run(async () => {
      const snap = await this.snapshot();
      let log = snap.log;
      if (cloudHas && !deviceHas) log = forgetItems(log); // (c): download everything
      else log = markAllPending(log, snap.local); // (b), (d): upload what the cloud lacks or is older
      if (deviceHas) log.uploadingUid = uid;
      const result = mergePulled({
        local: snap.local,
        log,
        pulled: { ...pulled, fullRead: true },
        mode,
        absentMeansDeleted: false,
        now,
      });
      await this.applyMerge(result);
      return { result, snap };
    });
    this.afterMerge(merged.result, merged.snap.local);

    const accountChange: NonNullable<Parameters<typeof planPush>[2]['account']> | undefined = account
      ? account.lastClientVersion !== this.deps.appVersion
        ? { create: false, createdAt: account.createdAt, updatedAt: now, lastClientVersion: this.deps.appVersion }
        : undefined
      : { create: true, createdAt: now, updatedAt: now, lastClientVersion: this.deps.appVersion };
    const pushed = await this.pushPending({ account: accountChange, batch: true });
    if (!pushed) return; // SYNC-048: interrupted → runs again on the next attempt

    await this.updateLog((log) => {
      log.uid = uid;
      log.lastFullSyncAt = now;
      log.lastSyncAt = now;
      log.cursors = pulled.cursors;
      log.uploadingUid = null;
      log.lastBuild = this.deps.appVersion;
    });
    this.accountChecked = true;
    this.lastPullAt = now;
    if (mode === 'combine') {
      const after = liveCounts((await this.snapshot()).local);
      this.deps.notify(`Combined. You now have ${after.cards} cards, ${after.decks} decks and ${after.tags} tags.`);
    } else if (deviceHas && (!cloudHas || resuming)) {
      this.deps.notify(MESSAGES.uploaded);
    }
  }

  /** Pull (SYNC-040): account check on the first pull of a session (SYNC-053), full read when due (SYNC-045). */
  private async pullAndMerge(): Promise<boolean> {
    const uid = this.uid!;
    const log = await this.loadLog();
    const now = this.deps.now();
    const full =
      log.cursors.state === null ||
      log.cursors.decks === null ||
      log.lastSyncAt === null ||
      now - log.lastSyncAt > FULL_READ_AFTER_MS;
    const pulled = await this.pull(uid, full ? null : log.cursors, !this.accountChecked);
    if (!pulled) return false;
    if (!this.accountChecked) {
      if (pulled.account === null) {
        await this.accountGone();
        return false;
      }
      this.accountChecked = true;
      const acct = pulled.account as AccountDoc;
      if ((log.lastBuild ?? null) !== this.deps.appVersion) {
        // This device's build changed: retry rejected items (SYNC-118) and record the build in the
        // account once (SYNC-012), unless another device already wrote this same build.
        await this.updateLog((l) => {
          l.rejected = [];
          l.pending.account = acct.lastClientVersion !== this.deps.appVersion;
          l.lastBuild = this.deps.appVersion;
        });
      }
    }
    this.clockCheck(pulled);
    const merged = await this.deps.queue.run(async () => {
      const snap = await this.snapshot();
      const result = mergePulled({
        local: snap.local,
        log: snap.log,
        pulled: { ...pulled, fullRead: full },
        mode: 'regular',
        absentMeansDeleted: snap.log.uid === uid && snap.log.lastFullSyncAt !== null,
        now,
      });
      result.log.cursors = {
        state: maxCursor(snap.log.cursors.state, pulled.cursors.state),
        decks: maxCursor(snap.log.cursors.decks, pulled.cursors.decks),
      };
      result.log.lastSyncAt = now;
      if (full) result.log.lastFullSyncAt = now;
      await this.applyMerge(result);
      return { result, snap };
    });
    this.lastPullAt = now;
    this.afterMerge(merged.result, merged.snap.local);
    return true;
  }

  /** Push (SYNC-043). Returns true when every planned document was written. */
  private async pushPending(extra: { account?: Parameters<typeof planPush>[2]['account']; batch?: boolean } = {}): Promise<boolean> {
    if (this.deletionPending) return false;
    const uid = this.uid!;
    const now = this.deps.now();
    const plan = await this.deps.queue.run(async () => {
      const snap = await this.snapshot();
      const log = snap.log;
      const account =
        extra.account ??
        (log.pending.account
          ? { create: false, createdAt: 0, updatedAt: now, lastClientVersion: this.deps.appVersion }
          : undefined);
      return planPush(snap.local, log, { now, readOnly: [...this.readOnlyAreas], account, batch: extra.batch });
    });
    this.scheduleUndoWindow();
    if (plan.tooLarge.length) this.setProblem('too-large', MESSAGES.tooLarge);
    if (plan.empty) {
      this.emit();
      return plan.tooLarge.length === 0;
    }
    let outcome: PushOutcome;
    try {
      outcome = await this.remote!.push(uid, plan.changes);
    } catch (e) {
      await this.handleRemoteError(e);
      return false;
    }
    for (const [ref, r] of Object.entries(outcome)) if (r === 'ok') this.writeTimes.set(ref, now);
    await this.deps.queue.run(async () => {
      const log = await this.loadLog();
      await this.saveLog(applyPushSuccess(log, plan, outcome));
    });
    return this.handleFailures(plan, outcome);
  }

  private async handleFailures(plan: PushPlan, outcome: PushOutcome): Promise<boolean> {
    const failed = Object.entries(outcome).filter(([, r]) => r !== 'ok') as [string, RemoteErrorCode][];
    if (!failed.length) {
      if (this.problem?.kind === 'write' || this.problem?.kind === 'rejected') this.problem = null;
      this.emit();
      return true;
    }
    const codes = new Set(failed.map(([, c]) => c));
    if (codes.has('unconfirmed')) {
      // The write may still land: keep it pending and let the next pull confirm it (SYNC-042).
      this.lastPullAt = null;
      this.schedulePush(PULL_BEFORE_PUSH_MS);
    }
    if (codes.has('offline')) this.offline = true;
    if (codes.has('quota')) this.paused = true;
    if (codes.has('unauthenticated')) {
      await this.sessionProblem();
      return false;
    }
    const log = await this.loadLog();
    const toReject: string[] = [];
    let recheck = codes.has('not-found');
    for (const [ref, code] of failed) {
      if (code === 'permission-denied' && isCreate(log, ref, plan)) recheck = true;
    }
    if (recheck) {
      // SYNC-053: an update that found no document, or a create the rules denied → account check again.
      let account: AccountDoc | null;
      try {
        account = await this.remote!.getAccount(this.uid!);
      } catch (e) {
        await this.handleRemoteError(e);
        return false;
      }
      if (account === null) {
        await this.accountGone();
        return false;
      }
      // The account is there: a not-found document is simply gone, so the next write creates it.
      const gone = failed.filter(([, c]) => c === 'not-found').map(([ref]) => ref);
      if (gone.length) {
        await this.updateLog((l) => {
          l.cloudDocs = l.cloudDocs.filter((r) => !gone.includes(r));
        });
      }
    }
    for (const [ref, code] of failed) {
      if (code === 'permission-denied' || code === 'too-large') toReject.push(ref);
    }
    if (toReject.length) {
      await this.updateLog((l) => {
        for (const ref of toReject) {
          for (const item of plan.items[ref] ?? []) {
            const r = itemRef(item.list, item.key);
            if (!l.rejected.includes(r)) l.rejected.push(r);
          }
        }
      });
      if (failed.some(([, c]) => c === 'too-large')) this.setProblem('too-large', MESSAGES.tooLarge);
      else this.setProblem('rejected', `Some data couldn't be synced: ${await this.areaLabel(toReject)}.`);
    } else if (codes.has('unknown')) {
      this.setProblem('write', MESSAGES.writeFailed);
    }
    this.emit();
    return false;
  }

  // ---------- account checks and lost sessions ----------

  /** SYNC-097: the account document is missing on a linked device (or a write said so). */
  private async accountGone(): Promise<void> {
    this.cancelTimer();
    const check = await this.auth!.checkAccount();
    if (check === 'deleted') {
      await this.deps.queue.run(async () => {
        await this.deps.local.clearSynced();
        const fresh = emptySyncLog();
        await this.deps.log.save(fresh);
        this.lastLog = fresh;
      });
      await this.auth!.signOut().catch(() => undefined);
      this.endSession();
      this.deps.notify(MESSAGES.accountDeleted);
    } else if (check === 'ok') {
      await this.halfDeleted();
    } else if (check === 'signed-out') {
      await this.sessionLost();
    } else {
      this.offline = true;
    }
    this.emit();
  }

  /** SYNC-097 `ok` with the account document missing, and SYNC-048 (f): sign out, keep the data. */
  private async halfDeleted(): Promise<void> {
    await this.auth?.signOut().catch(() => undefined);
    this.endSession();
    await this.updateLog((log) => {
      log.sessionExpected = false;
      log.uid = null;
      log.lastFullSyncAt = null;
      log.cursors = { state: null, decks: null };
      log.cloudDocs = [];
      log.rejected = [];
      log.pending = { account: false, cards: [], tags: [], assignments: [], locks: [], decks: [] };
    });
    this.deps.notify(MESSAGES.halfDeleted);
    this.emit();
  }

  /**
   * Session could not be restored or ended (SYNC-086 via SYNC-097). For a denied read, `ok` means the
   * session is fine and the rules refused the request: an Error status, not "signed out" (SYNC-118).
   */
  private async sessionProblem(okMeans: 'signed-out' | 'rejected' = 'signed-out'): Promise<void> {
    const check = this.auth ? await this.auth.checkAccount() : 'signed-out';
    if (check === 'deleted') {
      await this.deps.queue.run(async () => {
        await this.deps.local.clearSynced();
        await this.deps.log.save(emptySyncLog());
        this.lastLog = emptySyncLog();
      });
      this.endSession();
      this.deps.notify(MESSAGES.accountDeleted);
      return this.emit();
    }
    if (check === 'offline') {
      this.offline = true;
      return this.emit();
    }
    if (check === 'ok' && okMeans === 'rejected') {
      this.setProblem('read-denied', MESSAGES.writeFailed);
      return this.emit();
    }
    await this.sessionLost();
  }

  /** SYNC-086: stop syncing, keep local data, pending items and `sessionExpected`. */
  private async sessionLost(): Promise<void> {
    this.cancelTimer();
    this.uid = null;
    this.stopped = true;
    this.deps.notify(MESSAGES.sessionLost);
    this.emit();
  }

  private endSession(): void {
    this.uid = null;
    this.accountChecked = false;
    this.offline = false;
    this.paused = false;
    this.problem = null;
    this.lastPullAt = null;
    this.deletionPending = false;
    this.readOnlyAreas.clear();
  }

  // ---------- helpers ----------

  private async pull(
    uid: string,
    cursors: StoredSyncLog['cursors'] | null,
    withAccount: boolean,
  ): Promise<PullResult | null> {
    try {
      this.syncing = true;
      this.emit();
      const r = await this.remote!.pull(uid, cursors, { withAccount });
      this.offline = false;
      this.paused = false;
      if (this.problem?.kind === 'read-denied') this.problem = null;
      return r;
    } catch (e) {
      await this.handleRemoteError(e);
      return null;
    } finally {
      this.syncing = false;
    }
  }

  private async handleRemoteError(e: unknown): Promise<void> {
    const code: RemoteErrorCode = e instanceof RemoteError ? e.code : 'unknown';
    if (code === 'offline') this.offline = true;
    else if (code === 'quota') this.paused = true;
    else if (code === 'unauthenticated') await this.sessionProblem();
    else if (code === 'permission-denied') await this.sessionProblem('rejected');
    else if (code === 'unconfirmed') this.schedulePush(PULL_BEFORE_PUSH_MS);
    else this.setProblem('write', MESSAGES.writeFailed);
    this.emit();
  }

  /** Reads every local area and reconciles the log (SYNC-032, SYNC-033). Call inside the queue. */
  private async snapshot(): Promise<{ local: LocalSnapshot; log: StoredSyncLog }> {
    const read = async <T>(load: () => Promise<T | null>): Promise<T | null | 'unreadable'> => {
      try {
        return await load();
      } catch {
        return 'unreadable';
      }
    };
    const collection = await read<StoredCollection>(() => this.deps.local.collection.load());
    const tags = await read<StoredTags>(() => this.deps.local.tags.load());
    const locks = await read<StoredDeckLocks>(() => this.deps.local.locks.load());
    const decks: UserDeck[] = await this.deps.local.decks.list();
    const unreadableDecks = await this.deps.local.decks.unreadableIds();
    let log = await this.loadLog();
    const before = log;
    if (collection !== 'unreadable') log = reconcileCollection(log, collection);
    if (tags !== 'unreadable') log = reconcileTags(log, tags);
    if (locks !== 'unreadable') log = reconcileLocks(log, locks);
    log = reconcileDecks(log, decks, unreadableDecks, this.deps.now());
    if (log !== before) await this.saveLog(log);
    const anyUnreadable = collection === 'unreadable' || tags === 'unreadable' || locks === 'unreadable' || unreadableDecks.length > 0;
    if (anyUnreadable) this.setProblem('unreadable', MESSAGES.unreadable);
    else if (this.problem?.kind === 'unreadable') this.problem = null;
    return { local: { collection, tags, locks, decks, unreadableDecks }, log };
  }

  /** Writes the merge result locally (exempt from stamping, SYNC-041) and its log. Call inside the queue. */
  private async applyMerge(r: MergeResult): Promise<void> {
    for (const d of r.decksPut) await this.deps.local.decks.put(d);
    for (const id of r.decksDelete) await this.deps.local.decks.delete(id);
    if (r.collection) await this.deps.local.collection.save(r.collection);
    if (r.tags) await this.deps.local.tags.save(r.tags);
    if (r.locks) await this.deps.local.locks.save(r.locks);
    await this.saveLog(r.log);
  }

  private afterMerge(r: MergeResult, before: LocalSnapshot): void {
    for (const area of r.newerSchema) this.readOnlyAreas.add(area);
    if (r.invalid) this.setProblem('invalid', MESSAGES.invalid);
    for (const n of r.notices) this.deps.notify(n);
    if (this.deps.shortfalls) {
      void this.deps.queue.run(async () => {
        const after = (await this.snapshot()).local;
        for (const s of this.deps.shortfalls!(before, after)) {
          this.deps.notify(`'${s.deckName}' (locked) is now ${s.cardsShort} ${s.cardsShort === 1 ? 'card' : 'cards'} short.`);
        }
      });
    }
    this.emit();
  }

  /** SYNC-063: compare the server time of this device's own writes with their client time. */
  private clockCheck(p: PullResult): void {
    const docs: [string, { syncedAt: Ms } | undefined][] = [
      ['collection', p.collection],
      ['tags', p.tags],
      ['locks', p.locks],
      ...Object.entries(p.decks).map(([id, d]) => [`deck:${id}`, d] as [string, { syncedAt: Ms }]),
    ];
    for (const [ref, doc] of docs) {
      const t = this.writeTimes.get(ref);
      if (!doc || t === undefined) continue;
      this.writeTimes.delete(ref);
      const offset = doc.syncedAt - t;
      if (Math.abs(offset) > CLOCK_WARN_MS) {
        void this.updateLog((l) => {
          l.clockOffsetMs = offset;
        });
        this.deps.notify(
          `Your device clock is off by about ${Math.round(Math.abs(offset) / 60_000)} minutes. If you edit on several devices, the wrong change may win.`,
        );
      }
      return;
    }
  }

  private async areaLabel(refs: string[]): Promise<string> {
    const labels: string[] = [];
    for (const ref of refs) {
      if (ref.startsWith('deck:')) {
        const deck = await this.deps.local.decks.get(ref.slice(5)).catch(() => null);
        labels.push(`decks (${deck?.name ?? 'a deck'})`);
      } else labels.push(ref === 'locks' ? 'locked decks' : ref);
    }
    return [...new Set(labels)].join(', ');
  }

  private schedulePush(ms: number): void {
    if (!this.deps.setTimer) return;
    this.cancelTimer();
    this.pushTimer = this.deps.setTimer(() => {
      this.pushTimer = null;
      void this.flush();
    }, ms);
  }

  /** A deck deletion is pushed after the Undo window (SYNC-035). */
  private scheduleUndoWindow(): void {
    const now = this.deps.now();
    const waits = Object.values(this.lastLog.deckTombstones)
      .filter((t) => t.pushAfter > now)
      .map((t) => t.pushAfter - now);
    if (waits.length && this.pushTimer === null) this.schedulePush(Math.min(...waits) + 50);
  }

  private cancelTimer(): void {
    if (this.pushTimer !== null) this.deps.clearTimer?.(this.pushTimer);
    this.pushTimer = null;
  }

  private setProblem(kind: Problem, message: string): void {
    this.problem = { kind, message };
  }

  private running: Promise<void> = Promise.resolve();

  /** Resolves when the sync work started so far has finished (tests, sign-out dialog). */
  idle(): Promise<void> {
    return this.running;
  }

  private async guard(job: () => Promise<void>): Promise<void> {
    const run = this.deps.withTabLock ?? ((j) => j());
    const p = run(job).finally(() => this.emit());
    this.running = this.running.then(() => p).catch(() => undefined);
    await p;
  }

  private async ensureAdapters(): Promise<void> {
    if (this.auth && this.remote) return;
    const a = await this.deps.adapters();
    this.auth = a.auth;
    this.remote = a.remote;
  }

  private async loadLog(): Promise<StoredSyncLog> {
    const l = (await this.deps.log.load()) ?? emptySyncLog();
    this.lastLog = l;
    return l;
  }

  private async saveLog(l: StoredSyncLog): Promise<void> {
    await this.deps.log.save(l);
    this.lastLog = l;
  }

  private updateLog(fn: (l: StoredSyncLog) => void): Promise<void> {
    return this.deps.queue.run(async () => {
      const l = cloneLog(await this.loadLog());
      fn(l);
      await this.saveLog(l);
    });
  }

  private emit(): void {
    this.deps.onStatus?.(this.status());
  }
}

const maxCursor = (a: Ms | null, b: Ms | null): Ms | null => (a === null ? b : b === null ? a : Math.max(a, b));

/** SYNC-053: a write is a create when this device has no record of the document existing in the cloud. */
function isCreate(log: StoredSyncLog, ref: string, plan: PushPlan): boolean {
  if (ref === 'account') return !!plan.changes.account?.create;
  return !log.cloudDocs.includes(ref);
}

/** First sign-in (b)/(d): every local item and tombstone is offered for upload; the merge drops what the cloud already has. */
function markAllPending(log: StoredSyncLog, local: LocalSnapshot): StoredSyncLog {
  const next = cloneLog(log);
  next.cloudDocs = [];
  next.rejected = [];
  next.pending.cards = Object.keys(next.cards);
  next.pending.tags = Object.keys(next.tags);
  next.pending.assignments = Object.keys(next.assignments);
  next.pending.locks = Object.keys(next.locks);
  next.pending.decks = [...new Set([...local.decks.map((d) => d.id), ...Object.keys(next.deckTombstones)])];
  return next;
}

/** First sign-in (c): the device has nothing live, so the cloud wins everything. */
function forgetItems(log: StoredSyncLog): StoredSyncLog {
  const next = cloneLog(log);
  next.cards = {};
  next.tags = {};
  next.assignments = {};
  next.locks = {};
  next.deckTombstones = {};
  next.knownDecks = {};
  next.cloudDocs = [];
  next.rejected = [];
  next.pending = { account: false, cards: [], tags: [], assignments: [], locks: [], decks: [] };
  return next;
}

