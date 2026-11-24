import { Injectable } from '@angular/core';
import { BrowserStores, createBrowserStores } from './browser-stores';
import { LocalStorageBackend } from './kv-backend';

/**
 * The browser stores every feature uses (SYNC-130). They stamp changes for sync on every save, signed
 * in or not (SYNC-031); sync itself only runs when signed in.
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
