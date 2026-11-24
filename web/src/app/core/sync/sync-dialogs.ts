import { Component, inject, signal } from '@angular/core';
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
import type { CombineQuestion } from '../../shared/sync/sync-engine';
import { MESSAGES } from '../../shared/sync/sync-engine';
import { unsyncedWarning } from '../../shared/sync/status-text';

/**
 * SPEC-010 dialogs: sign in (SYNC-003, SYNC-006), Combine (SYNC-049), sign out (SYNC-090), delete
 * account (SYNC-095). Small Angular Material dialogs in the style of the import dialog.
 */

export interface SignInDialogData {
  online: boolean;
  sendEmailLink: (email: string) => Promise<void>;
}

/** SYNC-003 / SYNC-006: closes with 'google' to start the Google popup, or nothing. */
@Component({
  selector: 'app-sign-in-dialog',
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButton, MatFormField, MatLabel, MatInput],
  template: `
    <h2 mat-dialog-title>Sign in</h2>
    <mat-dialog-content>
      <p>
        Sign in to keep your collection and decks in sync across your devices. You don't need an account:
        without one, everything stays on this device.
      </p>
      @if (!data.online) {
        <p class="note" role="status">{{ offline }}</p>
      }
      <div class="providers">
        <button matButton="filled" type="button" [disabled]="!data.online" [mat-dialog-close]="'google'">
          Continue with Google
        </button>
        <button matButton="outlined" type="button" [disabled]="!data.online" (click)="showEmail.set(true)">
          Sign in with an email link
        </button>
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

/** SYNC-049: Combine (primary) and Cancel, and no other choice (RJ decision 5). */
@Component({
  selector: 'app-combine-dialog',
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButton],
  template: `
    <h2 mat-dialog-title>Combine your data?</h2>
    <mat-dialog-content>
      <p>
        This device and your account both have data. Combine them? You'll have the newest version of each
        card count, tag and deck.
      </p>
      <p>
        This device: {{ q.device.cards }} cards, {{ q.device.decks }} decks, {{ q.device.tags }} tags. Account:
        {{ q.account.cards }} cards, {{ q.account.decks }} decks, {{ q.account.tags }} tags.
      </p>
      @if (q.differentAccount) {
        <p>{{ differentAccount }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton type="button" [mat-dialog-close]="'cancel'">Cancel</button>
      <button matButton="filled" type="button" [mat-dialog-close]="'combine'">Combine</button>
    </mat-dialog-actions>
  `,
})
export class CombineDialog {
  protected readonly q = inject<CombineQuestion>(MAT_DIALOG_DATA);
  protected readonly differentAccount = MESSAGES.differentAccount;
}

export interface SignOutDialogData {
  pending: number;
  online: boolean;
}
export type SignOutChoice = 'keep' | 'remove' | 'sync';

/** SYNC-090: Keep a copy on this device is the primary button (RJ decision 6). */
@Component({
  selector: 'app-sign-out-dialog',
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButton],
  template: `
    <h2 mat-dialog-title>Sign out?</h2>
    <mat-dialog-content>
      <p>Your collection and decks stay in your account.</p>
      @if (warning) {
        <p role="alert">{{ warning }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton type="button" mat-dialog-close>Cancel</button>
      @if (warning) {
        <button matButton type="button" [disabled]="!data.online" [mat-dialog-close]="'sync'">Sync now</button>
      }
      <button matButton="outlined" type="button" [mat-dialog-close]="'remove'">Remove from this device</button>
      <button matButton="filled" type="button" [mat-dialog-close]="'keep'" cdkFocusInitial>Keep a copy on this device</button>
    </mat-dialog-actions>
  `,
})
export class SignOutDialog {
  protected readonly data = inject<SignOutDialogData>(MAT_DIALOG_DATA);
  protected readonly warning = unsyncedWarning(this.data.pending);
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
