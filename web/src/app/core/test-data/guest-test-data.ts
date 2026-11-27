import { Injectable, inject } from '@angular/core';
import { Subject } from 'rxjs';
import type { TestSetId } from '../../shared/collection/test-data';
import { AppStores } from '../storage/app-stores';
import { SignInGate } from '../sync/sign-in-gate';
import { loadTestData } from './test-data-ops';

/**
 * H-679 (RJ, 2026-11-26): signed-out ("guest") test data. The SPEC-013 sets are written by the same `loadTestData`,
 * but into fresh memory-only stores (`AppStores.createGuestStores`), which then replace the account cache for the
 * pages until a reload, a Remove, a sign-in or `discard()`. Nothing is written to `localStorage`, IndexedDB or
 * Firestore, and the sync engine never sees the data.
 */
@Injectable({ providedIn: 'root' })
export class GuestTestData {
  private readonly app = inject(AppStores);
  private readonly gate = inject(SignInGate);

  /** Emits after a guest Load or Change set wrote (the pages read again; the catalog source may be the same). */
  readonly changed = new Subject<void>();

  /** Signed out with no session expected (not a lost session) and no guest data yet: Load test data is offered. */
  canOffer(): boolean {
    return this.gate.state() === 'signed-out' && !this.app.guest();
  }

  /**
   * TEST-060: loads a set into new memory stores and switches the pages to them only once it is all written.
   * TEST-064 (b) Change set: with guest data loaded, the set replaces it in the same memory stores (the three test
   * decks and their locks are overwritten; a duplicated deck stays, as signed in).
   */
  async load(set: TestSetId, now: () => number = Date.now): Promise<'ok' | 'error'> {
    if (this.gate.state() !== 'signed-out') return 'error';
    if (this.app.guest()) {
      const r = await loadTestData(this.app.stores, set, now);
      if (r === 'ok') this.changed.next();
      return r === 'ok' ? 'ok' : 'error';
    }
    const stores = this.app.createGuestStores();
    // Empty memory stores: never 'real-cards'.
    if ((await loadTestData(stores, set, now)) !== 'ok') return 'error';
    if (this.gate.state() !== 'signed-out') return 'error'; // signed in meanwhile: drop it
    this.app.enterGuest(stores);
    this.changed.next();
    return 'ok';
  }

  /** Drops the guest data; the pages go back to the signed-out panel. */
  discard(): void {
    this.app.leaveGuest();
  }
}
