import type { StoredSyncLog, SyncLogStore } from '../../shared/sync/sync-types';
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

  async load(): Promise<StoredSyncLog | null> {
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
  const deckIds = async () => new Set((await rawDecks.list()).map((d) => d.id));
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
  const rawLocks = new LocalDeckLockStore(backend, deckIds);
  const ctx: TrackingContext = { log, queue, now: opts.now, changed: opts.changed, readOnly: opts.readOnly };

  const synced: string[] = [STORAGE_KEYS.collection, STORAGE_KEYS.collectionPrevious, STORAGE_KEYS.tags, STORAGE_KEYS.locks];
  return {
    collection: new TrackedCollectionStore(rawCollection, ctx),
    tags: new TrackedTagStore(rawTags, ctx),
    decks: new TrackedDeckStore(rawDecks, ctx),
    locks: new TrackedDeckLockStore(rawLocks, ctx, deckIds),
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
      clearSynced: async () => {
        for (const k of backend.keys()) {
          if (synced.includes(k) || k.startsWith(STORAGE_KEYS.deckPrefix)) backend.remove(k);
        }
      },
    },
  };
}

