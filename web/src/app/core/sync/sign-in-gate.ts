import { Injectable, computed, inject, signal } from '@angular/core';
import { GateState, gateState } from '../../shared/sync/gate';
import { AppStores } from '../storage/app-stores';
import { SIGN_IN_ENABLED } from './sign-in-flag';

/** What the sync side provides to the gate (registered by `SyncService` when sign-in is enabled). */
export interface GateActions {
  /** Opens the SYNC-003 Sign in dialog; `trigger` gets focus back when it closes (H-125). */
  signIn(trigger?: HTMLElement): void;
  /** Reruns the first-sign-in flow (SYNC-009 Try again, as Sync now). */
  retry(): void;
}

/**
 * SPEC-010 SYNC-008 / SYNC-009 sign-in gate for Decks, deck detail, Collection, Import and Tournaments' deck
 * controls. Small on purpose: pages inject it without pulling in the sync engine or `firebase`.
 *
 * Local-only mode (`signInEnabled` false): always `open`; it reads nothing and changes nothing.
 * Account-required mode: decided at construction from the sync log (synchronous, no Firebase), so a reload
 * shows the right state from the first frame, also offline; then kept current by `SyncService`.
 */
@Injectable({ providedIn: 'root' })
export class SignInGate {
  readonly enabled = inject(SIGN_IN_ENABLED);
  private readonly app = this.enabled ? inject(AppStores) : null;
  private readonly current = signal<GateState>(gateState(this.enabled, this.app?.stores.log.peek() ?? null));
  private actions: GateActions | null = null;

  readonly state = this.current.asReadonly();
  /** Gated pages show their content (SYNC-009). */
  readonly open = computed(() => this.state() === 'open');
  /** Tournaments shows Add to your decks / In your decks / Add another copy only while the gate is open (SYNC-009). */
  readonly deckControls = this.open;
  /**
   * SYNC-052: Collection offers Delete all local data (COLL-074) only in local-only mode; in account-required
   * mode Sign out clears the device instead.
   */
  readonly offerDeleteLocalData = !this.enabled;

  /** Called by `SyncService` whenever the engine's gate may have changed. Ignored in local-only mode. */
  set(state: GateState): void {
    if (this.enabled) this.current.set(state);
  }

  connect(actions: GateActions): void {
    this.actions = actions;
  }

  signIn(trigger?: HTMLElement): void {
    this.actions?.signIn(trigger);
  }

  retry(): void {
    this.actions?.retry();
  }
}
