import { Injectable } from '@angular/core';
import { BrowserStores, createBrowserStores } from './browser-stores';
import { LocalStorageBackend } from './kv-backend';

/**
 * The browser stores every feature uses (SYNC-130): the signed-in account's cache (SPEC-010 SYNC-141).
 * They stamp changes for sync on every user save (SYNC-031); user saves happen only while the sign-in gate
 * is open (SYNC-009), so every stamped change belongs to the signed-in account.
 */
@Injectable({ providedIn: 'root' })
export class AppStores {
  private changedHook: () => void = () => undefined;
  private readOnlyHook: (area: string) => boolean = () => false;
  private majorHook: () => void = () => undefined;

  readonly stores: BrowserStores = createBrowserStores(new LocalStorageBackend(), {
    now: () => Date.now(),
    changed: () => this.changedHook(),
    readOnly: (area) => this.readOnlyHook(area),
  });

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
   */
  majorAction(): void {
    this.majorHook();
  }
}
