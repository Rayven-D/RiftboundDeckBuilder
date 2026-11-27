import type { StoredSyncLog, SyncLogStore } from '../../shared/sync/sync-types';
import { deckCards as deckEntries } from '../../shared/storage/records';
import type { StoredDeckLocksV1, UserDeck } from '../../shared/storage/records';
import { migrateLocksV1 } from '../decks/name-locks';
import type { LocalAdapters } from '../../shared/sync/sync-engine';
import {
  SerialQueue,
  TrackedCollectionStore,
  TrackedDeckLockStore,
  TrackedDeckStore,
  TrackedTagStore,
  TrackingContext,
} from '../../shared/sync/tracked-stores';
import { KeyValueBackend } from './kv-backend';
import {
  LocalCollectionStore,
  LocalDeckLockStore,
  LocalDeckStore,
  LocalPrintingCodeStore,
  LocalTagStore,
  LocalViewStateStore,
  STORAGE_KEYS,
  clearLocalData,
} from './local-stores';

/** SYNC-030: the device-local sync log, behind its own store interface. Never synced (SYNC-019). */
export class LocalSyncLogStore implements SyncLogStore {
  constructor(private readonly backend: KeyValueBackend) {}

  load(): Promise<StoredSyncLog | null> {
    return Promise.resolve(this.peek());
  }

  /** Synchronous read, so the sign-in gate is decided at the first frame (SYNC-009). */
  peek(): StoredSyncLog | null {
    const raw = this.backend.get(STORAGE_KEYS.syncLog);
    if (raw === null) return null;
    try {
      const v = JSON.parse(raw) as StoredSyncLog;
      return v && v.schemaVersion === 1 ? v : null;
    } catch {
      return null; // a lost log is rebuilt by reconcile (SYNC-032)
    }
  }

  async save(s: StoredSyncLog): Promise<void> {
    this.backend.set(STORAGE_KEYS.syncLog, JSON.stringify(s));
  }
}

export interface BrowserStores {
  /** What features use (SYNC-130): stamping on every user save (SYNC-031). */
  collection: TrackedCollectionStore;
  tags: TrackedTagStore;
  decks: TrackedDeckStore;
  locks: TrackedDeckLockStore;
  printingCodes: LocalPrintingCodeStore;
  viewState: LocalViewStateStore;
  /** What the sync engine writes (exempt from stamping, SYNC-041). */
  raw: LocalAdapters;
  log: LocalSyncLogStore;
  queue: SerialQueue;
}

export interface BrowserStoreOptions {
  now: () => number;
  changed: () => void;
  readOnly: (area: string) => boolean;
}

/** Wires the browser stores, the sync log and their tracked (stamping) wrappers over one backend. */
export function createBrowserStores(backend: KeyValueBackend, opts: BrowserStoreOptions): BrowserStores {
  const queue = new SerialQueue();
  const log = new LocalSyncLogStore(backend);
  const viewState = new LocalViewStateStore(backend);
  const rawDecks = new LocalDeckStore(backend);
  // SHARE-062: a name lock is an orphan when its deck is not in the store or the name is not in that deck; a read-only
  // (newer) deck still is in the store (DECK-091).
  const allDecks = async (): Promise<UserDeck[]> => [...(await rawDecks.list()), ...(await rawDecks.newerDecks())];
  // SYNC-035 / AC 87: a deck deleted on this device whose 10 s Undo window is still open keeps every name lock (null =
  // keep all names): nothing is dropped or stamped for it until the window ends, and an Undo restores it as it was.
  const heldDeletions = (): string[] => {
    try {
      const raw = backend.get(STORAGE_KEYS.syncLog);
      const log = raw ? (JSON.parse(raw) as StoredSyncLog) : null;
      const now = opts.now();
      return Object.entries(log?.deckTombstones ?? {})
        .filter(([id, t]) => t.pushAfter > now && log!.pending.decks.includes(id))
        .map(([id]) => id);
    } catch {
      return [];
    }
  };
  const deckCardKeys = async () => {
    const m = new Map<string, ReadonlySet<string> | null>(
      (await allDecks()).map((d) => [d.id, new Set(deckEntries(d).map((c) => c.cardKey))] as const),
    );
    for (const id of heldDeletions()) if (!m.has(id)) m.set(id, null);
    return m;
  };
  const takenTagIds = () => {
    // Short ids must not reuse a tag tombstone's id (SYNC-016).
    try {
      const raw = backend.get(STORAGE_KEYS.syncLog);
      return new Set(raw ? Object.keys((JSON.parse(raw) as StoredSyncLog).tags ?? {}) : []);
    } catch {
      return new Set<string>();
    }
  };
  const rawTags = new LocalTagStore(backend, viewState, opts.now, takenTagIds);
  const rawCollection = new LocalCollectionStore(backend);
  // SHARE-092: a v1 record is converted once, on load, from the decks and the collection as stored.
  const migrateLocks = async (v1: StoredDeckLocksV1) => {
    let ownership: Parameters<typeof migrateLocksV1>[2];
    try {
      ownership = { collection: await rawCollection.load(), tags: await rawTags.load() };
    } catch {
      ownership = null; // unreadable: every name of a locked deck stays locked (settled later, SHARE-090)
    }
    return migrateLocksV1(v1.locks, await allDecks(), ownership, new Date(opts.now()).toISOString());
  };
  const rawLocks = new LocalDeckLockStore(backend, deckCardKeys, migrateLocks);
  const ctx: TrackingContext = { log, queue, now: opts.now, changed: opts.changed, readOnly: opts.readOnly };

  return {
    collection: new TrackedCollectionStore(rawCollection, ctx),
    tags: new TrackedTagStore(rawTags, ctx),
    decks: new TrackedDeckStore(rawDecks, ctx),
    locks: new TrackedDeckLockStore(rawLocks, ctx, deckCardKeys),
    printingCodes: new LocalPrintingCodeStore(backend),
    viewState,
    log,
    queue,
    raw: {
      collection: rawCollection,
      tags: rawTags,
      locks: rawLocks,
      decks: rawDecks,
      clearAll: async () => clearLocalData(backend),
    },
  };
}

