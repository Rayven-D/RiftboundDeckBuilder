import {
  CollectionStore,
  CollectionViewStateStore,
  DeckLockStore,
  DeckStore,
  IsoDateTime,
  LIMITS,
  PrintingCodeStore,
  StoredCollection,
  StoredDeckLocks,
  StoredPrintingCodes,
  StoredTags,
  StoredViewState,
  TagStore,
  UserDeck,
  deckCards,
} from '../../shared/storage/records';
import { RandomInt, TagsV2orV3, cryptoRandomInt, migrateTagIds } from '../../shared/storage/tag-id';
import { KEY_PREFIX, KeyValueBackend } from './kv-backend';

/**
 * Browser adapters of the SPEC-003/006/007/008 store interfaces (IMP-053, DECK-090, COLL-070,
 * SHARE-060). Storage only: no business rules beyond the record checks the specs put on the store
 * (schema versions, never overwriting a newer or unreadable record, deck limits and conflicts).
 */

export const STORAGE_KEYS = {
  collection: `${KEY_PREFIX}collection`,
  collectionPrevious: `${KEY_PREFIX}collection.previous`,
  tags: `${KEY_PREFIX}tags`,
  locks: `${KEY_PREFIX}locks`,
  printingCodes: `${KEY_PREFIX}printingCodes`,
  viewState: `${KEY_PREFIX}viewState`,
  syncLog: `${KEY_PREFIX}syncLog`,
  deckPrefix: `${KEY_PREFIX}deck.`,
} as const;

/**
 * A record that is corrupt or has a newer `schemaVersion` than this app knows (COLL-071, DECK-091,
 * SHARE-061). It is never overwritten; callers show it read-only and sync leaves its area alone
 * (SYNC-033).
 */
export class UnreadableRecordError extends Error {
  constructor(
    readonly key: string,
    readonly reason: 'corrupt' | 'newer',
  ) {
    super(`Stored record ${key} could not be read (${reason})`);
    this.name = 'UnreadableRecordError';
  }
}

/** DECK-092 limits and the store-full case (DECK-093). */
export class DeckStoreError extends Error {
  constructor(readonly code: 'DECK_LIMIT' | 'DECK_TOO_LARGE' | 'STORAGE_FULL' | 'NOT_FOUND' | 'EXISTS') {
    super(code);
    this.name = 'DeckStoreError';
  }
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function readJson(backend: KeyValueBackend, key: string): unknown {
  const raw = backend.get(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new UnreadableRecordError(key, 'corrupt');
  }
}

/** Reads a record with `schemaVersion` in `known`; null when absent; throws when newer or corrupt. */
function readVersioned<T>(
  backend: KeyValueBackend,
  key: string,
  known: readonly number[],
  shapeOk: (v: Record<string, unknown>) => boolean,
): T | null {
  const v = readJson(backend, key);
  if (v === null) return null;
  if (!isObject(v) || typeof v['schemaVersion'] !== 'number') throw new UnreadableRecordError(key, 'corrupt');
  const version = v['schemaVersion'];
  if (version > Math.max(...known)) throw new UnreadableRecordError(key, 'newer');
  if (!known.includes(version) || !shapeOk(v)) throw new UnreadableRecordError(key, 'corrupt');
  return v as T;
}

/** Refuses to overwrite a record that is unreadable or newer (COLL-071, DECK-091, SHARE-061). */
function assertOverwritable(check: () => unknown): void {
  check();
}

const collectionShape = (v: Record<string, unknown>) =>
  typeof v['updatedAt'] === 'string' && typeof v['catalogVersion'] === 'string' && isObject(v['cards']);

export class LocalCollectionStore implements CollectionStore {
  constructor(private readonly backend: KeyValueBackend) {}

  async load(): Promise<StoredCollection | null> {
    return readVersioned<StoredCollection>(this.backend, STORAGE_KEYS.collection, [1], collectionShape);
  }

  async loadPrevious(): Promise<StoredCollection | null> {
    try {
      return readVersioned<StoredCollection>(this.backend, STORAGE_KEYS.collectionPrevious, [1], collectionShape);
    } catch {
      return null;
    }
  }

  /**
   * `snapshotPrevious` keeps the record being replaced for the import Undo (IMP-052); a plain edit
   * leaves the Undo snapshot alone.
   */
  async save(c: StoredCollection, opts: { snapshotPrevious?: boolean } = {}): Promise<void> {
    const current = await this.load();
    if (opts.snapshotPrevious && current) {
      this.backend.set(STORAGE_KEYS.collectionPrevious, JSON.stringify(current));
    }
    this.backend.set(STORAGE_KEYS.collection, JSON.stringify(c));
  }
}

const tagsShape = (v: Record<string, unknown>) =>
  typeof v['updatedAt'] === 'string' && Array.isArray(v['tags']) && isObject(v['assignments']);

/**
 * SPEC-007 `TagStore`. On load, a version-2 record (or one with long ids) is migrated to short ids
 * (SYNC-016, `schemaVersion: 3`) and saved together with the rewritten view state.
 */
export class LocalTagStore implements TagStore {
  constructor(
    private readonly backend: KeyValueBackend,
    private readonly viewState: LocalViewStateStore,
    private readonly now: () => number = Date.now,
    /** Ids a new short id must not reuse besides the record's own (tag tombstones, SYNC-016). */
    private readonly takenIds: () => ReadonlySet<string> = () => new Set(),
    private readonly random: RandomInt = cryptoRandomInt,
  ) {}

  async load(): Promise<StoredTags | null> {
    const raw = readVersioned<TagsV2orV3>(this.backend, STORAGE_KEYS.tags, [2, 3], tagsShape);
    if (!raw) return null;
    let view: StoredViewState | null;
    try {
      view = await this.viewState.load();
    } catch {
      view = null; // an unreadable view state is left alone (COLL-071)
    }
    const m = migrateTagIds(raw, view, this.takenIds(), this.random);
    if (!m.changed) return m.tags;
    // The migration is a change of the record, so it gets a new updatedAt: reconcile (SYNC-032) then
    // stamps the new ids and tombstones the old ones.
    const tags: StoredTags = { ...m.tags, updatedAt: new Date(this.now()).toISOString() };
    this.backend.set(STORAGE_KEYS.tags, JSON.stringify(tags));
    if (m.view && m.view !== view) await this.viewState.save(m.view);
    return tags;
  }

  async save(t: StoredTags): Promise<void> {
    assertOverwritable(() => readVersioned(this.backend, STORAGE_KEYS.tags, [2, 3], tagsShape));
    this.backend.set(STORAGE_KEYS.tags, JSON.stringify(t));
  }
}

export class LocalPrintingCodeStore implements PrintingCodeStore {
  constructor(private readonly backend: KeyValueBackend) {}

  async load(): Promise<StoredPrintingCodes | null> {
    return readVersioned(this.backend, STORAGE_KEYS.printingCodes, [1], (v) => isObject(v['codes']));
  }

  async save(c: StoredPrintingCodes): Promise<void> {
    assertOverwritable(() => this.load());
    this.backend.set(STORAGE_KEYS.printingCodes, JSON.stringify(c));
  }
}

export class LocalViewStateStore implements CollectionViewStateStore {
  constructor(private readonly backend: KeyValueBackend) {}

  async load(): Promise<StoredViewState | null> {
    const v = readVersioned<StoredViewState | (Omit<StoredViewState, 'schemaVersion'> & { schemaVersion: 1 })>(
      this.backend,
      STORAGE_KEYS.viewState,
      [1, 2],
      (r) => isObject(r['query']),
    );
    if (!v) return null;
    if (v.schemaVersion === 1) {
      // COLL-071: view 'printings' became 'entries'.
      const fix = (q: StoredViewState['query']) => (q['view'] === 'printings' ? { ...q, view: 'entries' } : q);
      return {
        ...v,
        schemaVersion: 2,
        query: fix(v.query),
        ...(v.savedViews ? { savedViews: v.savedViews.map((s) => ({ ...s, query: fix(s.query) })) } : {}),
      };
    }
    return v;
  }

  async save(s: StoredViewState): Promise<void> {
    this.backend.set(STORAGE_KEYS.viewState, JSON.stringify(s));
  }
}

const deckShape = (v: Record<string, unknown>) =>
  typeof v['id'] === 'string' &&
  typeof v['name'] === 'string' &&
  typeof v['updatedAt'] === 'string' &&
  Array.isArray(v['main']) &&
  Array.isArray(v['sideboard']) &&
  Array.isArray(v['runes']) &&
  Array.isArray(v['battlefields']);

/** DECK-092 size check of one deck. */
export function deckTooLarge(d: UserDeck): boolean {
  const cards = deckCards(d);
  const copies = cards.reduce((s, c) => s + c.qty, 0);
  return cards.length > LIMITS.maxDeckEntries || copies > LIMITS.maxDeckCopies;
}

/** SPEC-006 `DeckStore`: one key per deck, so each write is atomic per deck (DECK-093). */
export class LocalDeckStore implements DeckStore {
  constructor(private readonly backend: KeyValueBackend) {}

  private key(id: string): string {
    return `${STORAGE_KEYS.deckPrefix}${id}`;
  }

  private ids(): string[] {
    return this.backend
      .keys()
      .filter((k) => k.startsWith(STORAGE_KEYS.deckPrefix))
      .map((k) => k.slice(STORAGE_KEYS.deckPrefix.length));
  }

  /** Readable decks. Newer or corrupt records are left out here and listed by `unreadableIds()`. */
  async list(): Promise<UserDeck[]> {
    const out: UserDeck[] = [];
    for (const id of this.ids()) {
      try {
        const d = await this.get(id);
        if (d) out.push(d);
      } catch {
        // shown read-only by the Decks page (DECK-091); never synced (SYNC-033)
      }
    }
    return out;
  }

  async unreadableIds(): Promise<string[]> {
    const out: string[] = [];
    for (const id of this.ids()) {
      try {
        await this.get(id);
      } catch {
        out.push(id);
      }
    }
    return out;
  }

  async get(id: string): Promise<UserDeck | null> {
    return readVersioned<UserDeck>(this.backend, this.key(id), [1], deckShape);
  }

  async create(deck: UserDeck): Promise<void> {
    if (this.backend.get(this.key(deck.id)) !== null) throw new DeckStoreError('EXISTS');
    if (this.ids().length >= LIMITS.maxDecks) throw new DeckStoreError('DECK_LIMIT');
    this.write(deck);
  }

  async update(deck: UserDeck, basedOnUpdatedAt: IsoDateTime): Promise<'ok' | 'conflict'> {
    const stored = await this.get(deck.id); // throws for a newer record: never overwritten
    if (!stored) throw new DeckStoreError('NOT_FOUND');
    if (stored.updatedAt !== basedOnUpdatedAt) return 'conflict'; // DECK-094
    this.write(deck);
    return 'ok';
  }

  async delete(id: string): Promise<UserDeck | null> {
    const stored = await this.get(id);
    if (stored) this.backend.remove(this.key(id));
    return stored;
  }

  /** Sync-engine write (SYNC-041): replaces or creates the record without the conflict check. */
  async put(deck: UserDeck): Promise<void> {
    this.write(deck);
  }

  private write(deck: UserDeck): void {
    if (deckTooLarge(deck)) throw new DeckStoreError('DECK_TOO_LARGE');
    try {
      this.backend.set(this.key(deck.id), JSON.stringify(deck));
    } catch {
      throw new DeckStoreError('STORAGE_FULL');
    }
  }
}

const locksShape = (v: Record<string, unknown>) => typeof v['updatedAt'] === 'string' && Array.isArray(v['locks']);

/** SPEC-008 `DeckLockStore`. A save drops locks whose deck is not in the deck store (SHARE-062). */
export class LocalDeckLockStore implements DeckLockStore {
  constructor(
    private readonly backend: KeyValueBackend,
    private readonly deckIds: () => Promise<ReadonlySet<string>>,
  ) {}

  async load(): Promise<StoredDeckLocks | null> {
    return readVersioned<StoredDeckLocks>(this.backend, STORAGE_KEYS.locks, [1], locksShape);
  }

  async save(l: StoredDeckLocks): Promise<void> {
    assertOverwritable(() => readVersioned(this.backend, STORAGE_KEYS.locks, [1], locksShape));
    const ids = await this.deckIds();
    const seen = new Set<string>();
    const locks = l.locks.filter((x) => ids.has(x.deckId) && !seen.has(x.deckId) && seen.add(x.deckId));
    this.backend.set(STORAGE_KEYS.locks, JSON.stringify({ ...l, locks }));
  }
}

/** Removes every Rift Builder record from this browser (SYNC-091 sign-out, SYNC-096 step 4). */
export function clearLocalData(backend: KeyValueBackend): void {
  for (const k of backend.keys()) if (k.startsWith(KEY_PREFIX)) backend.remove(k);
}
