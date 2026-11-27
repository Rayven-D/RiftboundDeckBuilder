import { Injectable, inject } from '@angular/core';
import { Subject } from 'rxjs';
import type { CardKey, DeckLockStore, LockLoss, NameLock, StoredDeckLocks, UserDeck } from '../../core/decks';
import { AppStores } from '../../core/storage/app-stores';
import {
  readLocks,
  saveLocks,
  withDeckLocked,
  withDeckUnlocked,
  withNameLocked,
  withNameUnlocked,
  withoutLosses,
} from './deck-locks';

/**
 * The browser `DeckLockStore` as pages use it (SPEC-008 SHARE-060…064, v0.6 card-name locks; H-060, H-254, H-665).
 * Backed by the account's browser cache through the tracked store (`AppStores.stores.locks`: schema 2, a newer or
 * unreadable record is never overwritten, orphan name locks are dropped on save, every save is stamped for sync).
 * `changed` emits after every lock change this tab wrote, so an open list or deck view recomputes (SHARE-064; other
 * tabs arrive as storage events). Every lock or unlock is a SYNC-126 major action (SHARE-064 v0.6): after the local
 * save an immediate sync starts when signed in (never awaited). Every method throws when the change can't be saved
 * (SHARE-063: nothing changed).
 */
@Injectable({ providedIn: 'root' })
export class DeckLocks {
  private readonly app = inject(AppStores);
  /** Read on each use: guest test data (H-679) switches `stores` to memory-only stores. */
  private get store(): DeckLockStore {
    return this.app.stores.locks;
  }
  /** Clock seam for tests. */
  now: () => string = () => new Date().toISOString();

  readonly changed = new Subject<void>();

  /** The stored name locks; `[]` when none; null when the record is unreadable or newer (SHARE-061). */
  load(): Promise<readonly NameLock[] | null> {
    return readLocks(this.store);
  }

  /** The deck toggle on an unlocked deck (SHARE-021, SHARE-084): every name not locked yet, one `lockedAt`. */
  lockDeck(deck: UserDeck): Promise<void> {
    return this.write((s, now) => withDeckLocked(s, deck, now));
  }

  /**
   * The deck toggle on a locked deck (SHARE-023, SHARE-084): every name lock of that deck, none of another. Also used
   * by Delete (SHARE-024) with `{ sync: false }`: the deletion itself syncs when its Undo window ends (SYNC-126 (a) 4).
   */
  unlockDeck(deckId: string, opts: { sync?: boolean } = {}): Promise<void> {
    return this.write((s, now) => withDeckUnlocked(s, deckId, now), opts.sync ?? true);
  }

  /** "Lock these copies" in the card dialog (SHARE-082). */
  lockName(deckId: string, cardKey: CardKey): Promise<void> {
    return this.write((s, now) => withNameLocked(s, deckId, cardKey, now));
  }

  /** "Unlock these copies" in the card dialog (SHARE-082, SHARE-085). */
  unlockName(deckId: string, cardKey: CardKey): Promise<void> {
    return this.write((s, now) => withNameUnlocked(s, deckId, cardKey, now));
  }

  /** SHARE-088 Confirm: drops exactly the listed name locks (a collection removal that took locked copies). */
  dropLosses(losses: readonly LockLoss[], opts: { sync?: boolean } = {}): Promise<void> {
    if (losses.length === 0) return Promise.resolve();
    return this.write((s, now) => withoutLosses(s, losses, now), opts.sync ?? true);
  }

  private async write(change: (stored: StoredDeckLocks | null, now: string) => StoredDeckLocks, sync = true): Promise<void> {
    const now = this.now();
    await saveLocks(this.store, (s) => change(s, now));
    this.changed.next();
    if (sync) this.app.majorAction(); // SYNC-126 (a) 6
  }
}
