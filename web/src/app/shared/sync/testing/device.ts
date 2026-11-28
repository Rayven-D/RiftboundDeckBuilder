/**
 * Test-only: one simulated browser ("laptop", "phone") with its own storage, clock, timers, engine
 * and connection to a shared `FakeFirestore`.
 */
import { MemoryBackend } from '../../../core/storage/kv-backend';
import { BrowserStores, createBrowserStores } from '../../../core/storage/browser-stores';
import { deckCards } from '../../storage/records';
import type { DeckCard, NameLock, StoredCollection, StoredDeckLocks, StoredTags, UserDeck } from '../../storage/records';
import { emptySyncLog } from '../sync-log';
import { SyncEngine } from '../sync-engine';
import type { NoticeKind } from '../notice';
import type { StoredSyncLog, SyncStatus } from '../sync-types';
import { FakeAuth, FakeFirestore, FakeRemote } from './fakes';

export const T0 = Date.UTC(2026, 10, 23, 12);
export const at = (hhmm: string, day = 23, month = 10): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return Date.UTC(2026, month, day, h, m);
};

let deckSeq = 0;
export const deckId = (n?: number): string =>
  `00000000-0000-4000-8000-${String(n ?? ++deckSeq).padStart(12, '0')}`;

export class Device {
  readonly backend = new MemoryBackend();
  readonly remote: FakeRemote;
  readonly auth = new FakeAuth();
  readonly stores: BrowserStores;
  readonly engine: SyncEngine;
  readonly notices: string[] = [];
  /** H-116: each notice with the kind the engine sent it as (same order as `notices`). */
  readonly noticeKinds: { message: string; kind: NoticeKind }[] = [];
  online = true;
  now: number;
  adaptersLoaded = 0;
  status: SyncStatus = { kind: 'signed-out' };
  /** H-145: each `leaveSignInLink` call, with the Firestore reads and notices that had happened by then. */
  readonly linkLeaves: { reads: number; notices: number }[] = [];
  /** H-145: what `leaveSignInLink` does (the app navigates; a test may make it fail). */
  onLeaveLink: () => Promise<void> = async () => undefined;
  /** H-145: set to make the lazy adapter load fail (the `firebase` chunk didn't load). */
  adapterError: unknown = null;
  /** SYNC-154 (H-176): how often the engine asked for the username prompt: a first sign-in that created the account. */
  accountCreated = 0;
  /** SYNC-123: developer warnings the engine logged (instead of the console). */
  readonly warnings: string[] = [];
  private timers: { fn: () => void; at: number; id: number }[] = [];
  private timerSeq = 0;

  constructor(
    readonly db: FakeFirestore,
    opts: { now?: number; appVersion?: string } = {},
  ) {
    this.now = opts.now ?? T0;
    this.remote = new FakeRemote(db);
    let engine: SyncEngine | null = null;
    this.stores = createBrowserStores(this.backend, {
      now: () => this.now,
      changed: () => engine?.scheduleChange(),
      readOnly: (area) => engine?.isReadOnly(area) ?? false,
    });
    engine = new SyncEngine({
      local: this.stores.raw,
      log: this.stores.log,
      queue: this.stores.queue,
      adapters: async () => {
        if (this.adapterError) throw this.adapterError;
        this.adaptersLoaded++;
        return { auth: this.auth, remote: this.remote };
      },
      now: () => this.now,
      appVersion: opts.appVersion ?? 'test-1',
      isOnline: () => this.online,
      notify: (message, kind) => {
        this.notices.push(message);
        this.noticeKinds.push({ message, kind });
      },
      onStatus: (s) => (this.status = s),
      onAccountCreated: () => this.accountCreated++,
      warn: (m) => this.warnings.push(m),
      leaveSignInLink: () => {
        this.linkLeaves.push({ reads: this.db.reads, notices: this.notices.length });
        return this.onLeaveLink();
      },
      setTimer: (fn, ms) => {
        const id = ++this.timerSeq;
        this.timers.push({ fn, at: this.now + ms, id });
        return id;
      },
      clearTimer: (h) => (this.timers = this.timers.filter((t) => t.id !== h)),
    });
    this.engine = engine;
  }

  /** Moves the clock and runs due timers (debounced pushes), then waits for sync to finish. */
  async advance(ms: number): Promise<void> {
    const target = this.now + ms;
    for (;;) {
      const due = this.timers.filter((t) => t.at <= target).sort((a, b) => a.at - b.at)[0];
      if (!due) break;
      this.timers = this.timers.filter((t) => t !== due);
      this.now = Math.max(this.now, due.at);
      due.fn();
      await this.settle();
    }
    this.now = target;
  }

  async settle(): Promise<void> {
    for (let i = 0; i < 5; i++) {
      await this.engine.idle();
      await this.stores.queue.run(async () => undefined);
    }
  }

  /** A fresh page load on this device: same storage, new engine (SYNC-082). */
  reload(opts: { appVersion?: string } = {}): Device {
    const d = new Device(this.db, { now: this.now, appVersion: opts.appVersion });
    for (const [k, v] of this.backend.data) d.backend.data.set(k, v);
    d.auth.uid = this.auth.uid;
    d.auth.nextSignIn = this.auth.nextSignIn;
    d.remote.offline = this.remote.offline;
    return d;
  }

  async log(): Promise<StoredSyncLog> {
    return (await this.stores.log.load()) ?? emptySyncLog();
  }

  // ---- user actions through the tracked (feature) stores ----
  async collection(): Promise<StoredCollection> {
    return (
      (await this.stores.collection.load()) ?? {
        schemaVersion: 1,
        updatedAt: new Date(this.now).toISOString(),
        catalogVersion: '0.2+2026-11-20T18:04:00Z',
        cards: {},
      }
    );
  }

  async setCard(cardKey: string, quantity: number, byPrinting: Record<string, number> = {}): Promise<void> {
    const c = await this.collection();
    const cards = { ...c.cards };
    if (quantity === 0) delete cards[cardKey];
    else cards[cardKey] = { quantity, byPrinting };
    await this.stores.collection.save({ ...c, updatedAt: new Date(this.now).toISOString(), cards });
  }

  async replaceCollection(cards: StoredCollection['cards']): Promise<void> {
    const c = await this.collection();
    await this.stores.collection.save(
      { ...c, updatedAt: new Date(this.now).toISOString(), cards },
      { snapshotPrevious: true, replace: true },
    );
  }

  async quantity(cardKey: string): Promise<number> {
    return (await this.stores.collection.load())?.cards[cardKey]?.quantity ?? 0;
  }

  async tags(): Promise<StoredTags> {
    return (
      (await this.stores.tags.load()) ?? {
        schemaVersion: 3,
        updatedAt: new Date(this.now).toISOString(),
        tags: [],
        assignments: {},
      }
    );
  }

  async addTag(id: string, label: string, opts: { excludeFromDecks?: boolean } = {}): Promise<void> {
    const t = await this.tags();
    await this.stores.tags.save({
      ...t,
      updatedAt: new Date(this.now).toISOString(),
      tags: [
        ...t.tags,
        {
          id,
          label,
          key: label.toLowerCase(),
          colour: null,
          excludeFromDecks: !!opts.excludeFromDecks,
          createdAt: new Date(this.now).toISOString(),
        },
      ],
    });
  }

  async deleteTag(id: string): Promise<void> {
    const t = await this.tags();
    const assignments = Object.fromEntries(
      Object.entries(t.assignments).map(([k, ids]) => [k, ids.filter((x) => x !== id)]),
    );
    await this.stores.tags.save({
      ...t,
      updatedAt: new Date(this.now).toISOString(),
      tags: t.tags.filter((x) => x.id !== id),
      assignments,
    });
  }

  async assign(target: string, ids: string[]): Promise<void> {
    const t = await this.tags();
    const assignments = { ...t.assignments, [target]: ids };
    if (!ids.length) delete assignments[target];
    await this.stores.tags.save({ ...t, updatedAt: new Date(this.now).toISOString(), assignments });
  }

  async createDeck(name: string, main: DeckCard[] = [], id = deckId()): Promise<UserDeck> {
    const iso = new Date(this.now).toISOString();
    const deck: UserDeck = {
      schemaVersion: 1,
      id,
      name,
      format: 'standard',
      source: { kind: 'user', text: null, url: null },
      sourceFormat: 'plain-text',
      notes: '',
      createdAt: iso,
      updatedAt: iso,
      catalogVersion: '0.2+2026-11-20T18:04:00Z',
      legend: null,
      champion: null,
      main,
      sideboard: [],
      runes: [],
      battlefields: [],
    };
    await this.stores.decks.create(deck);
    return (await this.stores.decks.get(id))!;
  }

  async editDeck(id: string, change: Partial<UserDeck>): Promise<void> {
    const d = (await this.stores.decks.get(id))!;
    const r = await this.stores.decks.update({ ...d, ...change }, d.updatedAt);
    if (r !== 'ok') throw new Error('conflict');
  }

  private async locksRecord(): Promise<StoredDeckLocks> {
    return (await this.stores.locks.load()) ?? { schemaVersion: 2, updatedAt: '', locks: [] };
  }

  private async saveLocks(locks: NameLock[]): Promise<void> {
    await this.stores.locks.save({ schemaVersion: 2, updatedAt: new Date(this.now).toISOString(), locks });
  }

  /** The deck toggle (SHARE-084): a name lock on every counted name of the deck not locked yet, one `lockedAt`. */
  async lock(deckId: string): Promise<void> {
    const deck = await this.stores.decks.get(deckId);
    const l = await this.locksRecord();
    const at = new Date(this.now).toISOString();
    const have = new Set(l.locks.filter((x) => x.deckId === deckId).map((x) => x.cardKey));
    const names = [...new Set(deck ? deckCards(deck).map((c) => c.cardKey) : [])].filter((k) => !have.has(k));
    await this.saveLocks([...l.locks, ...names.map((cardKey) => ({ deckId, cardKey, lockedAt: at }))]);
  }

  /** One name (SHARE-082). */
  async lockName(deckId: string, cardKey: string): Promise<void> {
    const l = await this.locksRecord();
    const rest = l.locks.filter((x) => !(x.deckId === deckId && x.cardKey === cardKey));
    await this.saveLocks([...rest, { deckId, cardKey, lockedAt: new Date(this.now).toISOString() }]);
  }

  /** Unlock the deck (SHARE-084): every name lock of that deck. */
  async unlock(deckId: string): Promise<void> {
    const l = await this.locksRecord();
    await this.saveLocks(l.locks.filter((x) => x.deckId !== deckId));
  }

  /** Decks with at least one name lock, in stored order. */
  async lockedIds(): Promise<string[]> {
    return [...new Set(((await this.stores.locks.load())?.locks ?? []).map((l) => l.deckId))];
  }

  /** `<deckId>|<cardKey>` of every stored name lock. */
  async lockKeys(): Promise<string[]> {
    return ((await this.stores.locks.load())?.locks ?? []).map((l) => `${l.deckId}|${l.cardKey}`).sort();
  }

  async deckNames(): Promise<string[]> {
    return (await this.stores.decks.list()).map((d) => d.name).sort();
  }
}

export const card = (cardKey: string, qty: number): DeckCard => ({ cardKey, name: cardKey, qty });
