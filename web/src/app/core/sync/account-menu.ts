import { Component, inject, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { firstValueFrom } from 'rxjs';
import { MESSAGES } from '../../shared/sync/sync-engine';
import {
  DeleteAccountDialog,
  SignInDialog,
  SignInDialogData,
  SignOutChoice,
  SignOutDialog,
  SignOutDialogData,
} from './sync-dialogs';
import { SyncService } from './sync.service';
import { AUTH_PROVIDERS } from './sign-in-flag';
import { enabledProviders } from '../../shared/sync/sync-types';

/**
 * Header account control (SYNC-003): "Sign in" when signed out; an account menu with the sync status
 * (SYNC-084), Sync now, Sign out and Delete account and data when signed in. During this device's
 * unfinished deletion it also offers Try again and, while nothing was removed, Cancel deletion (SYNC-096).
 * Renders nothing while the `signInEnabled` build flag is off (SYNC-007).
 */
@Component({
  selector: 'app-account-menu',
  imports: [MatButton, MatMenu, MatMenuItem, MatMenuTrigger],
  template: `
    @if (sync.enabled) {
      @if (!sync.signedIn()) {
        <button matButton="outlined" type="button" aria-haspopup="dialog" (click)="openSignIn()">Sign in</button>
      } @else {
        <button matButton="outlined" type="button" [matMenuTriggerFor]="menu" aria-label="Account and sync">
          Account
        </button>
        <mat-menu #menu="matMenu">
          <p class="status" role="status" aria-live="polite">{{ sync.statusLine() }}</p>
          @if (sync.deletion(); as deletion) {
            <button mat-menu-item type="button" [disabled]="!sync.online() || busy()" (click)="runDelete()">
              Try again
            </button>
            @if (deletion.canCancel) {
              <button mat-menu-item type="button" [disabled]="busy()" (click)="cancelDeletion()">Cancel deletion</button>
            }
          }
          <button mat-menu-item type="button" [disabled]="!sync.online()" (click)="sync.syncNow()">Sync now</button>
          <button mat-menu-item type="button" [disabled]="!sync.online()" (click)="openSignOut()">Sign out</button>
          <button mat-menu-item type="button" [disabled]="!sync.online()" (click)="openDelete()">
            Delete account and data
          </button>
          @if (!sync.online()) {
            <p class="status">{{ offline }}</p>
          }
        </mat-menu>
      }
    }
  `,
  styles: `
    :host { display: contents; }
    .status { margin: 0; padding: var(--space-2) var(--space-4); max-width: 20rem; color: var(--color-text-muted); }
  `,
})
export class AccountMenu {
  protected readonly sync = inject(SyncService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly providers = inject(AUTH_PROVIDERS);
  protected readonly offline = MESSAGES.offline;
  /** A deletion or Cancel deletion is running (SYNC-096): its menu actions are disabled meanwhile. */
  protected readonly busy = signal(false);

  constructor() {
    // The app shell loads this component (deferred) only while signInEnabled is on; it starts sync,
    // which restores an expected session and otherwise loads no Firebase (SYNC-002).
    this.sync.start();
  }

  protected async openSignIn(): Promise<void> {
    const data: SignInDialogData = {
      online: this.sync.online(),
      providers: enabledProviders(this.providers),
      sendEmailLink: (e) => this.sync.sendEmailLink(e),
    };
    const ref = this.dialog.open(SignInDialog, { data, autoFocus: 'first-tabbable' });
    const choice = await firstValueFrom(ref.afterClosed());
    if (choice === 'google' && this.providers.includes('google')) await this.sync.signInWithGoogle();
  }

  protected async openSignOut(): Promise<void> {
    const data: SignOutDialogData = { pending: this.sync.pendingCount(), online: this.sync.online() };
    const ref = this.dialog.open(SignOutDialog, { data });
    const choice = (await firstValueFrom(ref.afterClosed())) as SignOutChoice | undefined;
    if (choice === 'sync') await this.sync.syncNow();
    else if (choice) await this.sync.signOut(choice);
  }

  /**
   * SYNC-095 / SYNC-096. The engine shows the outcome notice (deleted, not deleted, sign in again first,
   * offline). A deletion that stopped part-way offers Try again, which continues where it stopped.
   */
  protected async openDelete(): Promise<void> {
    const ref = this.dialog.open(DeleteAccountDialog);
    if (!(await firstValueFrom(ref.afterClosed()))) return;
    await this.runDelete();
  }

  /** Also the account menu's Try again (SYNC-096): reruns the deletion without the confirmation dialog. */
  protected async runDelete(): Promise<void> {
    this.busy.set(true);
    const result = await this.sync.deleteAccount().finally(() => this.busy.set(false));
    if (result === 'failed') {
      this.snackBar
        .open(MESSAGES.deleteIncomplete, 'Try again')
        .onAction()
        .subscribe(() => void this.runDelete());
    }
  }

  /** SYNC-096 Cancel deletion: the engine says "Your account wasn't deleted." and resumes syncing. */
  protected async cancelDeletion(): Promise<void> {
    this.busy.set(true);
    this.snackBar.dismiss(); // the failure notice's Try again must not restart a cancelled deletion
    await this.sync.cancelDeletion().finally(() => this.busy.set(false));
  }
}
