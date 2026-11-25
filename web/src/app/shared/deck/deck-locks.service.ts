import { Injectable, inject } from '@angular/core';
import { Subject } from 'rxjs';
import type { DeckLock, DeckLockStore } from '../../core/decks';
import { AppStores } from '../../core/storage/app-stores';
import { readLocks, saveLock, saveUnlock } from './deck-locks';

/**
 * The browser `DeckLockStore` as pages use it (SPEC-008 SHARE-060…064; H-060, shared with H-254 Deck detail).
 * Backed by the account's browser cache through the tracked store (`AppStores.stores.locks`: schema 1, a newer or
 * unreadable record is never overwritten, orphan locks are dropped on save, every save is stamped for sync).
 * `changed` emits after every lock change this tab wrote, so an open list or deck view recomputes (SHARE-064; other
 * tabs arrive as storage events).
 */
@Injectable({ providedIn: 'root' })
export class DeckLocks {
  private readonly store: DeckLockStore = inject(AppStores).stores.locks;
  /** Clock seam for tests. */
  now: () => string = () => new Date().toISOString();

  readonly changed = new Subject<void>();

  /** The stored locks; `[]` when none; null when the record is unreadable or newer (SHARE-061). */
  load(): Promise<readonly DeckLock[] | null> {
    return readLocks(this.store);
  }

  /** SHARE-021: stores `{ deckId, lockedAt: now }`. Throws when it can't be saved (SHARE-063: nothing changed). */
  async lockIn(deckId: string): Promise<void> {
    await saveLock(this.store, deckId, this.now());
    this.changed.next();
  }

  /** SHARE-023: removes the deck's lock at once. Throws when it can't be saved (SHARE-063). */
  async unlock(deckId: string): Promise<void> {
    await saveUnlock(this.store, deckId, this.now());
    this.changed.next();
  }
}
