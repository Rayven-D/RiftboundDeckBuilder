/**
 * SPEC-010 data contract (Accounts and Sync), as used by the pure sync functions and the engine.
 *
 * Timestamps: the spec's Firestore `Timestamp` is an adapter type. Inside the engine every timestamp is
 * `Ms` (milliseconds since the Unix epoch); the Firebase adapter converts to and from `Timestamp` and
 * writes `syncedAt` as the server timestamp (SYNC-011).
 */
import type {
  CardKey,
  DeckCard,
  DeckSource,
  DeckSourceFormat,
  FormatId,
  PrintingId,
  TagColour,
  TagId,
  TagTarget,
} from '../storage/records';

export type Ms = number;

/** Every document type is at `schemaVersion: 1` (SPEC-010 SYNC-011). */
export const KNOWN_DOC_SCHEMA = 1;

// ---- Firestore documents (SYNC-010..018), engine form ----
export interface DocMeta {
  schemaVersion: number;
  updatedAt: Ms;
  syncedAt: Ms;
}
export interface AccountDoc extends DocMeta {
  createdAt: Ms;
  lastClientVersion: string;
  /**
   * v0.14 (SYNC-156): absent until the user chooses one; never set at creation. Normalized (SYNC-153, v0.15): NFC,
   * 1-20 code points, no emoji (allowed set in SYNC-153 (4)); the rules allow `size()` 1-80 on update only, checked
   * only when the request changes it (SYNC-112, H-206). A name saved under v0.14 may break the v0.15 client rules.
   */
  username?: string;
}
export interface CloudCard {
  q: number;
  t: Ms;
  p: Record<PrintingId, number>;
}
export interface CollectionDoc extends DocMeta {
  catalogVersion: string;
  cards: Record<CardKey, CloudCard>;
}
export interface CloudTagLive {
  label: string;
  key: string;
  colour: TagColour | null;
  excludeFromDecks: boolean;
  createdAt: Ms;
  updatedAt: Ms;
}
export interface CloudTagTombstone {
  deleted: true;
  updatedAt: Ms;
}
export type CloudTag = CloudTagLive | CloudTagTombstone;
export interface CloudAssignment {
  a: TagId[];
  t: Ms;
}
export interface TagsDoc extends DocMeta {
  tags: Record<TagId, CloudTag>;
  assignments: Record<TagTarget, CloudAssignment>;
}
export interface CloudLock {
  lockedAt: Ms | null;
  updatedAt: Ms;
}
export interface LocksDoc extends DocMeta {
  locks: Record<string, CloudLock>;
}
export interface DeckDocLive extends DocMeta {
  createdAt: Ms;
  deletedAt: null;
  name: string;
  format: FormatId;
  source: DeckSource;
  sourceFormat: DeckSourceFormat;
  notes: string;
  catalogVersion: string;
  duplicatedFrom?: string;
  importRemovedLines?: string[];
  legend: DeckCard | null;
  champion: DeckCard | null;
  main: DeckCard[];
  sideboard: DeckCard[];
  runes: DeckCard[];
  battlefields: DeckCard[];
}
export interface DeckDocTombstone extends DocMeta {
  createdAt: Ms;
  deletedAt: Ms;
}
export type DeckDoc = DeckDocLive | DeckDocTombstone;

export const isDeckTombstone = (d: DeckDoc): d is DeckDocTombstone => d.deletedAt !== null;
export const isTagTombstone = (t: CloudTag): t is CloudTagTombstone => 'deleted' in t;

// ---- Device-local sync log (SYNC-030..035) ----
export interface ItemStamp {
  t: Ms;
  deleted: boolean;
  /** Value hash (SYNC-032); '' for a tombstone. */
  h: string;
}
export interface LockStamp {
  t: Ms;
  unlocked: boolean;
  /** `lockedAt` of the live lock ('' when unlocked): lets reconcile see a re-lock (SYNC-032). */
  h: string;
}
export interface DeckTombstoneEntry {
  deletedAt: Ms;
  /** delete + 10 s, the SPEC-006 Undo window (SYNC-035). 0 for a tombstone pulled from the cloud. */
  pushAfter: Ms;
  /** The deck's `createdAt`, needed by the tombstone document (SYNC-018). */
  createdAt: Ms;
  /** Whether the deck was pending before the delete, so an Undo restores that (SYNC-035). */
  wasPending: boolean;
}
export type StateDocName = 'collection' | 'tags' | 'locks';
export interface StoredSyncLog {
  schemaVersion: 1;
  uid: string | null;
  sessionExpected: boolean;
  recordUpdatedAt: { collection: string | null; tags: string | null; locks: string | null };
  knownDecks: Record<string, Ms>;
  rejected: string[];
  cursors: { state: Ms | null; decks: Ms | null };
  lastFullSyncAt: Ms | null;
  lastSyncAt: Ms | null;
  clockOffsetMs: number | null;
  cards: Record<CardKey, ItemStamp>;
  tags: Record<TagId, ItemStamp>;
  assignments: Record<TagTarget, ItemStamp>;
  locks: Record<string, LockStamp>;
  deckTombstones: Record<string, DeckTombstoneEntry>;
  pending: {
    account: boolean;
    cards: CardKey[];
    tags: TagId[];
    assignments: TagTarget[];
    locks: string[];
    decks: string[];
    /** The next collection write is a Replace import: one `set()` of the whole map (SYNC-014). */
    collectionReplace?: boolean;
  };
  /**
   * Documents this device knows exist in the cloud: 'collection' | 'tags' | 'locks' | 'deck:<id>'.
   * Decides `set()` vs `update()` and whether a denied write was a create (SYNC-053).
   */
  cloudDocs: string[];
  /** deckId → the deck's `createdAt`, so a reconciled tombstone carries it (SYNC-018). */
  deckCreated?: Record<string, Ms>;
  /** This device's app build when it last synced: a change retries rejected items (SYNC-118) and updates the account once (SYNC-012). */
  lastBuild?: string | null;
  /**
   * v0.7 only: an interrupted first-sign-in upload. v0.8 never writes it (the first sign-in never uploads,
   * SYNC-048); a value left by an older build is ignored and dropped by the first-sign-in clear (SYNC-030).
   */
  uploadingUid?: string | null;
  /** Account deletion of this uid started on this device and is not finished (SYNC-096): sync is stopped, Delete can be retried. */
  deletingUid?: string | null;
  /**
   * SYNC-096: false when `deletingUid` is first recorded; true, and never back to false, once an attempt
   * removed (or may have removed, `'unconfirmed'`) a document. While false the account menu offers
   * Cancel deletion. Cleared with `deletingUid`.
   */
  deletingRemovedAny?: boolean;
  /**
   * SYNC-086 / SYNC-009: the linked uid when a lost session was detected. While it equals `uid` the sign-in
   * gate is closed, also at start-up. Cleared by a successful sign-in, by a restore of the linked uid that
   * passes the account check, and by every clear of the log.
   */
  sessionLostUid?: string | null;
  /**
   * v0.14 (SYNC-156): cache of `users/{uid}.username` for the header (SYNC-150), so it shows at once and offline.
   * Read with the account check and the full read, written after a username save (SYNC-155); cleared with the log.
   * `null` (or absent) = no username.
   */
  username?: string | null;
}

export interface SyncLogStore {
  load(): Promise<StoredSyncLog | null>;
  save(s: StoredSyncLog): Promise<void>;
}

// ---- Adapters (SYNC-130) ----
export type AccountCheck = 'ok' | 'deleted' | 'signed-out' | 'offline';

export type AuthProviderId = 'email-link' | 'google';

export interface AuthProviderInfo {
  id: AuthProviderId;
  label: string;
}

/** SYNC-006 button labels. */
export const PROVIDER_LABELS: Readonly<Record<AuthProviderId, string>> = {
  'email-link': 'Sign in with an email link',
  google: 'Continue with Google',
};

/** SYNC-006: the configured providers, known ids only, no duplicates, in configured order. */
export function enabledProviders(configured: readonly string[]): AuthProviderInfo[] {
  const ids = [...new Set(configured)].filter((id): id is AuthProviderId => id in PROVIDER_LABELS);
  return ids.map((id) => ({ id, label: PROVIDER_LABELS[id] }));
}

export interface AuthService {
  currentUid(): string | null;
  /** Waits for the persisted session to be restored at start-up (SYNC-004); null when there is none. */
  restore(): Promise<string | null>;
  providers(): AuthProviderInfo[];
  /**
   * Google: popup. Email link: completes a link already in the URL (see `sendEmailLink`); `email` is
   * needed only when the link is opened on a device that did not send it.
   */
  signIn(providerId: string, email?: string): Promise<{ uid: string } | 'cancelled'>;
  /**
   * SYNC-006 email link: sends the link; the sign-in completes when the user opens it. `returnTo` (H-145) is the
   * app path and query of the page sign-in started from (e.g. `/decks?import=1`, SYNC-159), sent as the continue URL;
   * anything that isn't an app path becomes `/` (`safeReturnPath`). Default `/`.
   */
  sendEmailLink(email: string, returnTo?: string): Promise<void>;
  /** True when the current URL is an email sign-in link waiting to be completed. */
  isEmailLinkReturn(): boolean;
  /**
   * SYNC-003 / SYNC-100 (H-141): the signed-in user's address exactly as Auth reports it on this device, for the
   * account menu's "Signed in as {email}"; null when there is none. Read at render time, never stored anywhere.
   */
  currentEmail(): string | null;
  signOut(): Promise<void>;
  /** SYNC-096 step 1. */
  needsRecentSignIn(): boolean;
  /**
   * SYNC-095 (H-143): true only when Google is enabled (SYNC-006) and the user has a Google identity, so
   * `reauthenticate()` can use a popup; false = a fresh sign-in is needed (the delete dialog's sign-in-first state).
   */
  canReauthenticate(): boolean;
  /** 'needs-sign-in': the provider cannot re-authenticate here (email link); the user signs out and in again. */
  reauthenticate(): Promise<'ok' | 'cancelled' | 'needs-sign-in'>;
  checkAccount(): Promise<AccountCheck>;
  deleteUser(): Promise<'ok' | 'needs-recent-sign-in'>;
}

export type RemoteErrorCode =
  | 'offline'
  | 'quota'
  | 'permission-denied'
  | 'not-found'
  | 'too-large'
  | 'unauthenticated'
  | 'unknown'
  /** The write was sent but not confirmed in time; it may still land. Kept pending and confirmed by the next pull. */
  | 'unconfirmed';

export class RemoteError extends Error {
  constructor(
    readonly code: RemoteErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'RemoteError';
  }
}

export interface PullResult {
  /** Present only when requested (account check) or on a full read; null = the document is missing. */
  account?: AccountDoc | null;
  collection?: CollectionDoc;
  tags?: TagsDoc;
  locks?: LocksDoc;
  decks: Record<string, DeckDoc>;
  cursors: StoredSyncLog['cursors'];
}

/** Firestore writes of one push (SYNC-043). Timestamps in ms; the adapter adds `syncedAt`. */
export interface PushChanges {
  account?: { create: boolean; createdAt: Ms; updatedAt: Ms; lastClientVersion: string };
  collection?: {
    /** `set()` of the whole document (Replace import or first write), else `update()` by FieldPath. */
    replace: boolean;
    updatedAt: Ms;
    cards: CollectionDoc['cards'];
    purge: CardKey[];
    catalogVersion: string;
  };
  tags?: {
    replace: boolean;
    updatedAt: Ms;
    tags: TagsDoc['tags'];
    assignments: TagsDoc['assignments'];
    purgeTags: string[];
    purgeAssignments: string[];
  };
  locks?: { replace: boolean; updatedAt: Ms; locks: LocksDoc['locks']; purge: string[] };
  /** One `set()` each, without merge (SYNC-018). */
  decks?: Record<string, DeckDoc>;
  hardDelete?: string[];
}

/** Outcome per document ref: 'account' | 'collection' | 'tags' | 'locks' | 'deck:<id>' | 'delete:<id>'. */
export type PushOutcome = Record<string, 'ok' | RemoteErrorCode>;

/**
 * SYNC-096 step 2 result. On failure, `removedAny` says whether this attempt removed (or may have
 * removed: a delete that timed out, `'unconfirmed'`) any document. A failed deck-list read deletes
 * nothing, so it reports `removedAny: false`.
 */
export type DeleteAllResult = 'ok' | { remaining: number; removedAny: boolean };

export interface RemoteStore {
  /**
   * `cursors` null = full read (SYNC-045). `withAccount` adds the account `get` (SYNC-053). Throws
   * `RemoteError` when the reads fail.
   */
  pull(uid: string, cursors: StoredSyncLog['cursors'] | null, opts?: { withAccount?: boolean }): Promise<PullResult>;
  /** The account check alone (`get users/{uid}`, 1 read, SYNC-053). Throws `RemoteError`. */
  getAccount(uid: string): Promise<AccountDoc | null>;
  /**
   * v0.14 (SYNC-155): one `update()` of `users/{uid}` setting `username`, `updatedAt` and `syncedAt` (server time);
   * never a `set()`. Needs the network: not a pending item. Never throws: failures come back as a code.
   */
  setUsername(uid: string, username: string): Promise<'ok' | RemoteErrorCode>;
  /** Never throws for a single document: each document's result is in the outcome (SYNC-043, SYNC-118). */
  push(uid: string, changes: PushChanges): Promise<PushOutcome>;
  /** SYNC-096 step 2: account document first, then every deck, then the three state documents. */
  deleteAll(uid: string): Promise<DeleteAllResult>;
}

// ---- Status (SYNC-084) ----
export type SyncStatus =
  | { kind: 'signed-out' }
  | { kind: 'synced'; at: Ms; pendingCount: number }
  | { kind: 'syncing'; pendingCount: number }
  | { kind: 'offline'; pendingCount: number }
  | { kind: 'paused'; pendingCount: number }
  | { kind: 'error'; message: string; pendingCount: number };
