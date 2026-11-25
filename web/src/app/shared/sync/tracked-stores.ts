import type {
  CollectionStore,
  DeckLockStore,
  DeckStore,
  IsoDateTime,
  StoredCollection,
  StoredDeckLocks,
  StoredTags,
  TagStore,
  UserDeck,
} from '../storage/records';
import {
  cancelDeckDelete,
  reconcileCollection,
  reconcileDecks,
  reconcileLocks,
  reconcileTags,
  stampCollection,
  stampDeckDelete,
  stampDeckSave,
  stampLocks,
  stampTags,
} from './stamp';
import { emptySyncLog } from './sync-log';
import type { Ms, StoredSyncLog, SyncLogStore } from './sync-types';

/** Runs async jobs one at a time, so a save and its stamps are never interleaved with another. */
export class SerialQueue {
  private tail: Promise<unknown> = Promise.resolve();

  run<T>(job: () => Promise<T>): Promise<T> {
    const next = this.tail.then(job, job);
    this.tail = next.catch(() => undefined);
    return next;
  }
}

/** Raw (untracked) stores: what the tracked stores wrap and what the sync engine writes (SYNC-041). */
export interface RawCollectionStore {
  load(): Promise<StoredCollection | null>;
  save(c: StoredCollection, opts?: { snapshotPrevious?: boolean }): Promise<void>;
  loadPrevious(): Promise<StoredCollection | null>;
  clearPrevious(): Promise<void>;
}
export interface RawDeckStore extends DeckStore {
  put(deck: UserDeck): Promise<void>;
  unreadableIds(): Promise<string[]>;
}

/** SYNC-046: an area whose cloud document is newer than this app cannot be changed on this device. */
export class ReadOnlyAreaError extends Error {
  static readonly MESSAGE =
    'Update Rift Builder to change this: your account data was saved by a newer version. Reload the page.';
  constructor(readonly area: string) {
    super(ReadOnlyAreaError.MESSAGE);
    this.name = 'ReadOnlyAreaError';
  }
}

export interface TrackingContext {
  log: SyncLogStore;
  queue: SerialQueue;
  now: () => Ms;
  /** Called after every user save (the engine schedules a debounced push, SYNC-121). */
  changed: () => void;
  /** SYNC-046 read-only areas: 'collection' | 'tags' | 'locks' | 'deck:<id>'. */
  readOnly: (area: string) => boolean;
}

async function withLog(ctx: TrackingContext, fn: (log: StoredSyncLog) => Promise<StoredSyncLog | null>): Promise<void> {
  const log = (await ctx.log.load()) ?? emptySyncLog();
  const next = await fn(log);
  if (next && next !== log) await ctx.log.save(next);
}

/**
 * The stores features use (SYNC-130: same `CollectionStore` / `TagStore` / `DeckStore` /
 * `DeckLockStore` interfaces). Each user save stamps changed items in the sync log, signed in or not
 * (SYNC-031): the record is written first, then the log; a lost log write is repaired by reconcile
 * on the next load (SYNC-032).
 */
export class TrackedCollectionStore implements CollectionStore {
  constructor(
    private readonly inner: RawCollectionStore,
    private readonly ctx: TrackingContext,
  ) {}

  load(): Promise<StoredCollection | null> {
    return this.ctx.queue.run(async () => {
      const rec = await this.inner.load();
      await withLog(this.ctx, async (log) => reconcileCollection(log, rec));
      return rec;
    });
  }

  loadPrevious(): Promise<StoredCollection | null> {
    return this.inner.loadPrevious();
  }

  /** IMP-075 (b): spends the Undo snapshot. The snapshot is a local cache record, not a synced item, so nothing is stamped. */
  clearPrevious(): Promise<void> {
    return this.ctx.queue.run(() => this.inner.clearPrevious());
  }

  /** `replace` marks an Owned Cards Import in Replace mode: one `set()` of the whole document (SYNC-014). */
  async save(c: StoredCollection, opts: { snapshotPrevious?: boolean; replace?: boolean } = {}): Promise<void> {
    if (this.ctx.readOnly('collection')) throw new ReadOnlyAreaError('collection');
    await this.ctx.queue.run(() =>
      withLog(this.ctx, async (log) => {
        const next = stampCollection(log, c, this.ctx.now());
        if (opts.replace) next.pending.collectionReplace = true;
        await this.inner.save(c, { snapshotPrevious: opts.snapshotPrevious });
        return next;
      }),
    );
    this.ctx.changed();
  }
}

export class TrackedTagStore implements TagStore {
  constructor(
    private readonly inner: TagStore,
    private readonly ctx: TrackingContext,
  ) {}

  load(): Promise<StoredTags | null> {
    return this.ctx.queue.run(async () => {
      const rec = await this.inner.load();
      await withLog(this.ctx, async (log) => reconcileTags(log, rec));
      return rec;
    });
  }

  async save(t: StoredTags): Promise<void> {
    if (this.ctx.readOnly('tags')) throw new ReadOnlyAreaError('tags');
    await this.ctx.queue.run(() =>
      withLog(this.ctx, async (log) => {
        const next = stampTags(log, t, this.ctx.now());
        await this.inner.save(t);
        return next;
      }),
    );
    this.ctx.changed();
  }
}

export class TrackedDeckLockStore implements DeckLockStore {
  constructor(
    private readonly inner: DeckLockStore,
    private readonly ctx: TrackingContext,
    private readonly deckIds: () => Promise<ReadonlySet<string>>,
  ) {}

  load(): Promise<StoredDeckLocks | null> {
    return this.ctx.queue.run(async () => {
      const rec = await this.inner.load();
      await withLog(this.ctx, async (log) => reconcileLocks(log, rec));
      return rec;
    });
  }

  async save(l: StoredDeckLocks): Promise<void> {
    if (this.ctx.readOnly('locks')) throw new ReadOnlyAreaError('locks');
    await this.ctx.queue.run(() =>
      withLog(this.ctx, async (log) => {
        // Stamp what is actually stored: the store drops orphan locks (SHARE-062).
        const ids = await this.deckIds();
        const stored = { ...l, locks: l.locks.filter((x) => ids.has(x.deckId)) };
        const next = stampLocks(log, stored, this.ctx.now());
        await this.inner.save(l);
        return next;
      }),
    );
    this.ctx.changed();
  }
}

/**
 * SPEC-006 `DeckStore` with SYNC-031 stamping: `updatedAt` is made monotonic on every save (so the
 * stored `updatedAt` may be later than the one passed in; read it back with `get()`), a delete leaves
 * a tombstone pushed after the 10 s Undo window, and an Undo (`create()` of the returned record within
 * the window) cancels it (SYNC-035).
 */
export class TrackedDeckStore implements DeckStore {
  constructor(
    private readonly inner: RawDeckStore,
    private readonly ctx: TrackingContext,
  ) {}

  list(): Promise<UserDeck[]> {
    return this.ctx.queue.run(async () => {
      const decks = await this.inner.list();
      const unreadable = await this.inner.unreadableIds();
      await withLog(this.ctx, async (log) => reconcileDecks(log, decks, unreadable, this.ctx.now()));
      return decks;
    });
  }

  get(id: string): Promise<UserDeck | null> {
    return this.inner.get(id);
  }

  async create(deck: UserDeck): Promise<void> {
    await this.ctx.queue.run(() =>
      withLog(this.ctx, async (log) => {
        const undone = cancelDeckDelete(log, deck, this.ctx.now());
        if (undone) {
          await this.inner.create(deck);
          return undone;
        }
        const s = stampDeckSave(log, deck, null, this.ctx.now());
        await this.inner.create(s.deck);
        return s.log;
      }),
    );
    this.ctx.changed();
  }

  async update(deck: UserDeck, basedOnUpdatedAt: IsoDateTime): Promise<'ok' | 'conflict'> {
    if (this.ctx.readOnly(`deck:${deck.id}`)) throw new ReadOnlyAreaError(`deck:${deck.id}`);
    let result: 'ok' | 'conflict' = 'ok';
    await this.ctx.queue.run(() =>
      withLog(this.ctx, async (log) => {
        const previous = await this.inner.get(deck.id);
        const s = stampDeckSave(log, deck, previous, this.ctx.now());
        result = await this.inner.update(s.deck, basedOnUpdatedAt);
        return result === 'ok' ? s.log : null;
      }),
    );
    if (result === 'ok') this.ctx.changed();
    return result;
  }

  async delete(id: string): Promise<UserDeck | null> {
    if (this.ctx.readOnly(`deck:${id}`)) throw new ReadOnlyAreaError(`deck:${id}`);
    let removed: UserDeck | null = null;
    await this.ctx.queue.run(() =>
      withLog(this.ctx, async (log) => {
        removed = await this.inner.delete(id);
        return removed ? stampDeckDelete(log, removed, this.ctx.now()) : null;
      }),
    );
    if (removed) this.ctx.changed();
    return removed;
  }
}
