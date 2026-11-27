import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { BrowserStores, createBrowserStores } from './browser-stores';
import { LocalStorageBackend, MemoryBackend } from './kv-backend';

/**
 * The account's browser cache, injectable so unit tests can put it over a `MemoryBackend` (`provideTestStores`).
 * Created with no-op hooks then: the app's default factory wires them to `AppStores.connect`.
 */
export const ACCOUNT_STORES = new InjectionToken<BrowserStores>('ACCOUNT_STORES');

/**
 * The browser stores every feature uses (SYNC-130).
 *
 * - `account`: the signed-in account's cache (SPEC-010 SYNC-141) over `localStorage`. They stamp changes for sync on
 *   every user save (SYNC-031); user saves happen only while the sign-in gate is open (SYNC-009), so every stamped
 *   change belongs to the signed-in account. The sync engine is given these and only these.
 * - **Guest test data (H-679):** signed out, Load test data fills a separate set of stores over a fresh
 *   `MemoryBackend`. Nothing of it reaches `localStorage`, IndexedDB or the network, and the sync engine never sees it
 *   (its hooks are not connected: no change is scheduled and no major action runs). A reload, `leaveGuest()` or a
 *   sign-in drops it.
 * - `stores`: what features read and write: the guest stores while guest mode is on, else `account`. A stable object
 *   whose members resolve on each access, so services that keep `stores` follow the switch.
 */
@Injectable({ providedIn: 'root' })
export class AppStores {
  private changedHook: () => void = () => undefined;
  private readOnlyHook: (area: string) => boolean = () => false;
  private majorHook: () => void = () => undefined;
  private guestStores: BrowserStores | null = null;
  private readonly guestOn = signal(false);

  /** H-679: guest test data is loaded (signed out, memory only). */
  readonly guest = this.guestOn.asReadonly();

  /**
   * Emits after something may have changed the stored collection outside a page's own write: guest mode switched,
   * a user save, or (through `externalWrite()`) the sync engine. `CardData` re-resolves its catalog source on it.
   */
  readonly written = new Subject<void>();

  readonly account: BrowserStores =
    inject(ACCOUNT_STORES, { optional: true }) ??
    createBrowserStores(new LocalStorageBackend(), {
      now: () => Date.now(),
      changed: () => {
        this.changedHook();
        this.written.next();
      },
      readOnly: (area) => this.readOnlyHook(area),
    });

  readonly stores: BrowserStores = this.facade();

  connect(changed: () => void, readOnly: (area: string) => boolean, major: () => void = () => undefined): void {
    this.changedHook = changed;
    this.readOnlyHook = readOnly;
    this.majorHook = major;
  }

  /**
   * SPEC-010 SYNC-126 (H-667): call right after a **major action** has been saved locally (a deck import saved, a
   * collection import committed or undone, a deck duplicated, any lock or unlock). Signed in and online it starts one
   * immediate sync (pull, then push); otherwise the change stays pending. Never awaited: the action never waits for
   * the network (SYNC-085). A deck deletion is a major action once its Undo window ends; the sync engine does that.
   * Guest mode: nothing (no sync, H-679).
   */
  majorAction(): void {
    if (this.guestStores) return;
    this.majorHook();
  }

  /** Called by `SyncService` whenever the engine reports a status (a pull, a first sync, a sign-out may have written). */
  externalWrite(): void {
    this.written.next();
  }

  /** H-679: fresh, empty memory-only stores for guest test data. Not used until `enterGuest()`. */
  createGuestStores(): BrowserStores {
    return createBrowserStores(new MemoryBackend(), {
      now: () => Date.now(),
      changed: () => this.written.next(),
      readOnly: () => false,
    });
  }

  /** H-679: features now read and write `guest` (memory only). */
  enterGuest(guest: BrowserStores): void {
    this.guestStores = guest;
    this.guestOn.set(true);
    this.written.next();
  }

  /** H-679: drops the guest data (never uploaded or merged); features are back on the account cache. */
  leaveGuest(): void {
    if (!this.guestStores) return;
    this.guestStores = null;
    this.guestOn.set(false);
    this.written.next();
  }

  private facade(): BrowserStores {
    const cur = (): BrowserStores => this.guestStores ?? this.account;
    return {
      get collection() {
        return cur().collection;
      },
      get tags() {
        return cur().tags;
      },
      get decks() {
        return cur().decks;
      },
      get locks() {
        return cur().locks;
      },
      get printingCodes() {
        return cur().printingCodes;
      },
      get viewState() {
        return cur().viewState;
      },
      get raw() {
        return cur().raw;
      },
      get log() {
        return cur().log;
      },
      get queue() {
        return cur().queue;
      },
    };
  }
}
