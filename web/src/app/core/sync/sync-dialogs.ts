import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  Signal,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import type { ErrorStateMatcher } from '@angular/material/core';
import type { AuthProviderInfo } from '../../shared/sync/sync-types';
import { MESSAGES } from '../../shared/sync/sync-engine';
import { unsyncedWarning } from '../../shared/sync/status-text';
import { Icon } from '../../shared/icon';

/**
 * SPEC-010 dialogs: sign in (SYNC-003, SYNC-006), sign out (SYNC-090), delete account (SYNC-095). There is
 * no Combine dialog (SYNC-049, v0.8). Small Angular Material dialogs in the style of the import dialog.
 */

export interface SignInDialogData {
  online: boolean;
  /** SYNC-006: enabled providers, in button order (build config `authProviders`). */
  providers: AuthProviderInfo[];
  sendEmailLink: (email: string) => Promise<void>;
}

/** SYNC-003 (v0.8): no warning about legacy local data; the first sign-in clears it silently (SYNC-048). */
export const SIGN_IN_INTRO =
  "Sign in to import your cards and decks. They're saved to your account, so you'll see them on any device you sign in on.";

/** Per-instance id for the send-failure line (aria-describedby target). */
let signInDialogSeq = 0;

/**
 * SYNC-006 (v0.10, H-105): a failed Send link shows this under the field, never the SYNC-005 sign-in text
 * (`MESSAGES.signInFailed`). Kept beside the dialog: the engine never shows it (the send rejects to the caller).
 */
export const SEND_LINK_FAILED = "Couldn't send the link. Check the address and your connection, then try again.";

/**
 * SYNC-003 / SYNC-006 (v0.10, brain/04-UI/Brief H-104 H-106 H-124.md). (a) Email link as the only provider:
 * no provider button, the email form shows at once and `autoFocus: 'first-tabbable'` puts focus in the field.
 * (b) Two or more providers: one outlined button each; "Sign in with an email link" reveals the form and moves
 * focus into the field, so Send link is the only filled button. Closes with 'google' to start the Google popup,
 * or nothing.
 */
@Component({
  selector: 'app-sign-in-dialog',
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatButton,
    MatFormField,
    MatLabel,
    MatInput,
    Icon,
  ],
  template: `
    <h2 mat-dialog-title>Sign in</h2>
    <mat-dialog-content>
      <p>{{ intro }}</p>
      @if (!data.online) {
        <p class="note" role="status">{{ offline }}</p>
      }
      @if (!emailOnly) {
        <div class="providers">
          @for (p of data.providers; track p.id) {
            @if (p.id === 'google') {
              <button matButton="outlined" type="button" [disabled]="!data.online" [mat-dialog-close]="'google'">
                {{ p.label }}
              </button>
            } @else {
              <button matButton="outlined" type="button" [disabled]="!data.online" (click)="reveal()">
                {{ p.label }}
              </button>
            }
          }
        </div>
      }
      @if (showEmail()) {
        @if (sent()) {
          <p role="status">Check your email for a sign-in link.</p>
        } @else {
          <!-- novalidate: Send link uses disabledInteractive, so the browser's own validation bubble must not
               pop on a click or Enter; canSend() and the dialog's own text are the only feedback. -->
          <form class="email" novalidate (submit)="send($event)">
            <mat-form-field
              appearance="outline"
              subscriptSizing="dynamic"
              hideRequiredMarker
              [class.send-failed]="!!error()"
            >
              <mat-label>Email address</mat-label>
              <input
                #emailInput
                matInput
                type="email"
                autocomplete="email"
                required
                [value]="email()"
                [errorStateMatcher]="sendFailedMatcher"
                [aria-describedby]="error() ? errorId : ''"
                (input)="onEmail($event)"
              />
            </mat-form-field>
            <button matButton="filled" type="submit" class="send" [disabled]="!canSend()" disabledInteractive>
              {{ sending() ? 'Sending…' : 'Send link' }}
            </button>
            @if (error(); as err) {
              <p class="error" [id]="errorId"><app-icon name="error" />{{ err }}</p>
            }
          </form>
        }
      }
      <!-- SYNC-101: the privacy notice link goes here once the notice exists (BLOCKED, H-069). -->
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton type="button" mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: `
    .providers { display: flex; flex-wrap: wrap; gap: var(--space-2); margin: var(--space-3) 0; }
    /* H-139: room below Send link (48px touch target on a 40px button) so its focus ring is not clipped. */
    .email { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); padding-bottom: var(--space-1); }
    .email mat-form-field { flex: 1 1 16rem; }
    /* The label swaps to "Sending…": a min-width keeps the button the same width on desktop (H-106). */
    .send { min-width: 7.5rem; }
    /* H-106: icon + danger text, the import dialog's pattern; flex-start keeps the icon on line 1 when it wraps. */
    .error {
      flex-basis: 100%;
      display: flex;
      align-items: flex-start;
      gap: var(--space-1);
      margin: var(--space-2) 0 0;
      color: var(--color-danger);
      font-size: var(--font-size-sm);
    }
    .error app-icon { flex: none; }
    .note { color: var(--color-text-muted); }
    /* H-124: phones get a full-width field with a full-width Send link below it. */
    @media (max-width: 40rem) {
      .email { flex-direction: column; align-items: stretch; gap: var(--space-3); }
      .email mat-form-field { flex: none; }
      .error { margin: 0; }
    }
  `,
})
export class SignInDialog {
  protected readonly data = inject<SignInDialogData>(MAT_DIALOG_DATA);
  private readonly injector = inject(Injector);
  /** A send can settle after the dialog closed: then nothing is updated or focused. */
  private destroyed = false;
  protected readonly intro = SIGN_IN_INTRO;
  protected readonly offline = MESSAGES.offline;
  protected readonly errorId = `send-error-${++signInDialogSeq}`;
  /**
   * H-106: the field is invalid while the send-failure line shows. MatInput owns `aria-invalid` (its host
   * binding), so the dialog drives MatInput's error state instead of writing the attribute itself: "true"
   * with the failure, Material's "false" on a filled field without one, absent while empty.
   */
  protected readonly sendFailedMatcher: ErrorStateMatcher = { isErrorState: () => this.error() !== null };
  /** SYNC-006 (a): email link is the only provider, so there is no provider button and the form shows at once. */
  protected readonly emailOnly = this.data.providers.length === 1 && this.data.providers[0].id === 'email-link';
  protected readonly showEmail = signal(this.emailOnly);
  protected readonly email = signal('');
  protected readonly sending = signal(false);
  protected readonly sent = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly canSend = computed(() => this.data.online && this.email().includes('@') && !this.sending());
  private readonly emailInput = viewChild<ElementRef<HTMLInputElement>>('emailInput');
  private readonly matInput = viewChild(MatInput);

  constructor() {
    inject(DestroyRef).onDestroy(() => (this.destroyed = true));
  }

  /** SYNC-006 (b): reveals the email form (not a toggle) and moves focus into the field once it has rendered. */
  protected reveal(): void {
    this.showEmail.set(true);
    this.focusEmail();
  }

  protected onEmail(e: Event): void {
    this.email.set((e.target as HTMLInputElement).value.trim());
    this.setError(null); // H-106: the failure clears on the first edit
  }

  protected async send(e: Event): Promise<void> {
    e.preventDefault();
    if (!this.canSend()) return; // disabledInteractive keeps the button focusable, so guard here too
    this.sending.set(true);
    this.setError(null);
    try {
      await this.data.sendEmailLink(this.email());
      if (this.destroyed) return;
      this.sent.set(true);
    } catch {
      if (this.destroyed) return; // closed while sending: no view left to mark or focus
      // SYNC-005 v0.10: a failed send is not a failed sign-in. Focus goes to the field, which reads as invalid
      // with the message as its description, so a screen reader announces it once (no role="alert").
      this.setError(SEND_LINK_FAILED);
      this.focusEmail();
    } finally {
      if (!this.destroyed) this.sending.set(false);
    }
  }

  private setError(message: string | null): void {
    this.error.set(message);
    this.matInput()?.updateErrorState(); // no NgControl, so MatInput only re-reads the matcher when asked
  }

  private focusEmail(): void {
    if (this.destroyed) return;
    afterNextRender(() => this.emailInput()?.nativeElement.focus(), { injector: this.injector });
  }
}

export interface SignOutDialogData {
  /** Pending (and rejected) changes right now (SYNC-084, SYNC-118). */
  pending: () => number;
  /** Live connection state (SYNC-081): the dialog reacts when it drops or returns. */
  online: Signal<boolean>;
  /** Sync now with the dialog open (SYNC-040, SYNC-043). */
  syncNow: () => Promise<void>;
}

export const SIGN_OUT_TEXT =
  'Your collection and decks stay in your account and are removed from this device. Sign in again to get them back.';

/**
 * SYNC-090 (v0.8): one choice, Sign out, which clears this device (SYNC-091); no Keep a copy. With unsynced
 * changes it first warns, with Sync now (primary), Sign out anyway and Cancel. Offline (SYNC-081) every button
 * that syncs or signs out is disabled and only Cancel works. Closes with `true` to sign out.
 */
@Component({
  selector: 'app-sign-out-dialog',
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButton],
  template: `
    <h2 mat-dialog-title>Sign out?</h2>
    <mat-dialog-content>
      @if (warning(); as w) {
        <p role="alert">{{ w }}</p>
      } @else {
        <p>{{ text }}</p>
      }
      @if (!data.online()) {
        <p class="note" role="status">{{ offline }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton type="button" mat-dialog-close>Cancel</button>
      @if (warning()) {
        <button matButton="outlined" type="button" [disabled]="disabled()" [mat-dialog-close]="true">Sign out anyway</button>
        <button matButton="filled" type="button" [disabled]="disabled()" (click)="syncNow()">Sync now</button>
      } @else {
        <button matButton="filled" type="button" [disabled]="disabled()" [mat-dialog-close]="true">Sign out</button>
      }
    </mat-dialog-actions>
  `,
  styles: `
    .note { color: var(--color-text-muted); }
  `,
})
export class SignOutDialog {
  protected readonly data = inject<SignOutDialogData>(MAT_DIALOG_DATA);
  protected readonly text = SIGN_OUT_TEXT;
  protected readonly offline = MESSAGES.offline;
  private readonly pending = signal(this.data.pending());
  protected readonly syncing = signal(false);
  protected readonly warning = computed(() => unsyncedWarning(this.pending()));
  protected readonly disabled = computed(() => !this.data.online() || this.syncing());

  /** Runs a sync with the dialog open, then shows the plain question or the warning with the new count. */
  protected async syncNow(): Promise<void> {
    this.syncing.set(true);
    try {
      await this.data.syncNow();
    } catch {
      // The engine reports sync failures itself (status line, notices); the dialog only re-reads the count.
    } finally {
      this.pending.set(this.data.pending());
      this.syncing.set(false);
    }
  }
}

/** SYNC-095: type `delete` to enable Delete account; no keep-a-copy option (RJ decision 7). */
@Component({
  selector: 'app-delete-account-dialog',
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButton, MatFormField, MatLabel, MatInput],
  template: `
    <h2 mat-dialog-title>Delete your Rift Builder account?</h2>
    <mat-dialog-content>
      <p>
        This deletes your account and the collection, tags, decks and locks saved in it, including the copy on
        this device and on every other device that syncs it. This can't be undone.
      </p>
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Type delete to confirm</mat-label>
        <input matInput autocomplete="off" [value]="typed()" (input)="onType($event)" />
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton type="button" mat-dialog-close>Cancel</button>
      <button matButton="filled" type="button" class="danger" [disabled]="typed() !== 'delete'" (click)="confirm()">
        Delete account
      </button>
    </mat-dialog-actions>
  `,
})
export class DeleteAccountDialog {
  private readonly ref = inject(MatDialogRef<DeleteAccountDialog, boolean>);
  protected readonly typed = signal('');

  protected onType(e: Event): void {
    this.typed.set((e.target as HTMLInputElement).value.trim());
  }

  protected confirm(): void {
    if (this.typed() === 'delete') this.ref.close(true);
  }
}
