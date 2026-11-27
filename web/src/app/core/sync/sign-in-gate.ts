import { Injectable, computed, inject, signal } from '@angular/core';
import { GateState, gateState } from '../../shared/sync/gate';
import { AppStores } from '../storage/app-stores';

/** What the sync side provides to the gate (registered by `SyncService`). */
export interface GateActions {
  /** Opens the SYNC-003 Sign in dialog; `trigger` gets focus back when it closes (H-125). */
  signIn(trigger?: HTMLElement): void;
  /** Reruns the first-sign-in flow (SYNC-009 Try again, as Sync now). */
  retry(): void;
}

/**
 * SPEC-010 SYNC-009 sign-in gate for Decks, deck detail, Collection, Import and Tournaments' deck controls
 * (always on, SYNC-001). Small on purpose: pages inject it without pulling in the sync engine or `firebase`.
 *
 * Decided at construction from the sync log (synchronous, no Firebase), so a reload shows the right state
 * from the first frame, also offline (SYNC-080, SYNC-144); then kept current by `SyncService`.
 */
@Injectable({ providedIn: 'root' })
export class SignInGate {
  private readonly app = inject(AppStores);
  private readonly current = signal<GateState>(gateState(this.app.account.log.peek()));
  private actions: GateActions | null = null;

  readonly state = this.current.asReadonly();
  /** Gated pages show their content (SYNC-009). */
  readonly open = computed(() => this.state() === 'open');
  /** Tournaments shows Add to your decks / In your decks / Add another copy only while the gate is open (SYNC-009). */
  readonly deckControls = this.open;
  /**
   * H-679: Collection, Decks and deck detail show their content: signed in (the gate is open) or, signed out, with
   * guest test data loaded (memory only). Imports, deck saves and Tournaments' deck controls follow `open` only.
   */
  readonly content = computed(() => this.open() || (this.app.guest() && this.state() === 'signed-out'));
  /** Called by `SyncService` whenever the engine's gate may have changed. */
  set(state: GateState): void {
    this.current.set(state);
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
