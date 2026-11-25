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

  readonly stores: BrowserStores = createBrowserStores(new LocalStorageBackend(), {
    now: () => Date.now(),
    changed: () => this.changedHook(),
    readOnly: (area) => this.readOnlyHook(area),
  });

  connect(changed: () => void, readOnly: (area: string) => boolean): void {
    this.changedHook = changed;
    this.readOnlyHook = readOnly;
  }
}
