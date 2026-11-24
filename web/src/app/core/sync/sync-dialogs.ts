import { Component, Signal, computed, inject, signal } from '@angular/core';
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
import type { AuthProviderInfo } from '../../shared/sync/sync-types';
import { MESSAGES } from '../../shared/sync/sync-engine';
import { unsyncedWarning } from '../../shared/sync/status-text';

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

/** SYNC-003 / SYNC-006: one button per enabled provider; closes with 'google' to start the Google popup, or nothing. */
@Component({
  selector: 'app-sign-in-dialog',
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButton, MatFormField, MatLabel, MatInput],
  template: `
    <h2 mat-dialog-title>Sign in</h2>
    <mat-dialog-content>
      <p>{{ intro }}</p>
      @if (!data.online) {
        <p class="note" role="status">{{ offline }}</p>
      }
      <div class="providers">
        @for (p of data.providers; track p.id; let first = $first) {
          @if (p.id === 'google') {
            <button
              [matButton]="first ? 'filled' : 'outlined'"
              type="button"
              [disabled]="!data.online"
              [mat-dialog-close]="'google'"
            >
              {{ p.label }}
            </button>
          } @else {
            <button
              [matButton]="first ? 'filled' : 'outlined'"
              type="button"
              [disabled]="!data.online"
              (click)="showEmail.set(true)"
            >
              {{ p.label }}
            </button>
          }
        }
      </div>
      @if (showEmail()) {
        @if (sent()) {
          <p role="status">Check your email for a sign-in link.</p>
        } @else {
          <form class="email" (submit)="send($event)">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Email address</mat-label>
              <input matInput type="email" autocomplete="email" required [value]="email()" (input)="onEmail($event)" />
            </mat-form-field>
            <button matButton="filled" type="submit" [disabled]="!data.online || !email().includes('@') || sending()">
              Send link
            </button>
          </form>
          @if (error()) {
            <p class="note" role="alert">{{ error() }}</p>
          }
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
    .email { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
    .note { color: var(--color-text-muted); }
  `,
})
export class SignInDialog {
  protected readonly data = inject<SignInDialogData>(MAT_DIALOG_DATA);
  protected readonly intro = SIGN_IN_INTRO;
  protected readonly offline = MESSAGES.offline;
  protected readonly showEmail = signal(false);
  protected readonly email = signal('');
  protected readonly sending = signal(false);
  protected readonly sent = signal(false);
  protected readonly error = signal<string | null>(null);

  protected onEmail(e: Event): void {
    this.email.set((e.target as HTMLInputElement).value.trim());
  }

  protected async send(e: Event): Promise<void> {
    e.preventDefault();
    this.sending.set(true);
    this.error.set(null);
    try {
      await this.data.sendEmailLink(this.email());
      this.sent.set(true);
    } catch {
      this.error.set(MESSAGES.signInFailed);
    } finally {
      this.sending.set(false);
    }
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
