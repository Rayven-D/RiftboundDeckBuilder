import { Component, ElementRef, Injector, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatDivider } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { firstValueFrom } from 'rxjs';
import { Icon } from '../../shared/icon';
import { MESSAGES } from '../../shared/sync/sync-engine';
import {
  DeleteAccountDialog,
  DeleteAccountDialogData,
  DeleteAccountDialogResult,
  SignOutDialog,
  SignOutDialogData,
} from './sync-dialogs';
import { SyncService, refocusAfterDialog } from './sync.service';

/** Ids for the menu's aria-describedby (identity line, status). */
let accountMenuSeq = 0;

/**
 * Header account control (SYNC-003): "Sign in" when signed out; when signed in, an account menu with the
 * identity line "Signed in as {email}" (H-141, read from Auth as it renders), the sync status (SYNC-084),
 * Sync now, Sign out and Delete account and data. During this device's unfinished deletion it offers Try
 * deleting again and, while nothing was removed, Cancel deletion, instead of Sync now (SYNC-096, H-142).
 */
@Component({
  selector: 'app-account-menu',
  imports: [Icon, MatButton, MatDivider, MatMenu, MatMenuItem, MatMenuTrigger],
  template: `
    @if (!sync.signedIn()) {
      <button matButton="outlined" type="button" class="header-account" aria-haspopup="dialog" (click)="openSignIn($event)">
        Sign in
      </button>
    } @else {
      <button matButton="outlined" type="button" class="header-account" [matMenuTriggerFor]="menu" aria-label="Account and sync">
        Account
      </button>
      <!-- H-110 groups (Brief H-141 H-142 H-110): [identity, status, offline] / [deletion actions] or [Sync now] /
           [Sign out] / [Delete]. The middle groups never show together: always 3 dividers, never first or last. -->
      <mat-menu #menu="matMenu" [aria-describedby]="describedBy()">
        @if (sync.currentEmail(); as email) {
          <p class="menu-text identity" [id]="identityId">Signed in as <span class="address">{{ email }}</span></p>
        }
        <p class="menu-text" [class.error]="sync.status().kind === 'error'" [id]="statusId" role="status" aria-live="polite">
          @if (sync.status().kind === 'error') {
            <app-icon name="error" />
          }
          <span>{{ sync.statusLine() }}</span>
        </p>
        @if (!sync.online()) {
          <p class="menu-text">{{ offline }}</p>
        }
        <mat-divider />
        @if (sync.deletion(); as deletion) {
          <!-- SYNC-096 (H-142): no Sync now while pull and push are blocked; the notice keeps "Try again". -->
          <button mat-menu-item type="button" [disabled]="!sync.online() || busy()" (click)="runDelete()">
            Try deleting again
          </button>
          @if (deletion.canCancel) {
            <button mat-menu-item type="button" [disabled]="busy()" (click)="cancelDeletion()">Cancel deletion</button>
          }
        } @else {
          <button mat-menu-item type="button" [disabled]="!sync.online()" (click)="sync.syncNow()">Sync now</button>
        }
        <mat-divider />
        <button mat-menu-item type="button" [disabled]="!sync.online()" (click)="openSignOut()">Sign out</button>
        <!-- H-102: the destructive item is set apart. -->
        <mat-divider />
        <button mat-menu-item type="button" class="danger" [disabled]="!sync.online()" (click)="openDelete()">
          Delete account and data
        </button>
      </mat-menu>
    }
  `,
  styles: `
    :host { display: contents; }
    /* H-123 (Brief H-113 H-116 H-123 H-126): the header trigger matches the 44px tabs and Import, and its edge is the
       control-edge token (header bg 3.95 dark / 3.28 light; scrolled 3.54 / 3.52). Header only: the global outlined
       border is unchanged. */
    .header-account {
      --mat-button-outlined-container-height: 44px;
      --mat-button-outlined-outline-color: var(--color-border-strong);
    }
    /* Text lines of the first group: 12px inline = Material's item leading spacing, so they line up with the labels. */
    .menu-text {
      margin: 0;
      padding: var(--space-1) var(--space-3);
      max-width: 20rem;
      font-size: var(--font-size-sm);
      line-height: 1.4;
      font-weight: 400; /* Material's menu label weight (500) is for the items only */
      color: var(--color-text-muted);
    }
    .menu-text:first-child { padding-top: var(--space-2); }
    .menu-text:last-of-type { padding-bottom: var(--space-2); }
    .identity .address { color: var(--color-text); overflow-wrap: anywhere; }
    /* Error status: icon + text, not colour alone (as the dialogs' .error, H-106). */
    .menu-text.error { display: flex; gap: var(--space-1); align-items: flex-start; color: var(--color-danger); }
    .menu-text.error app-icon { flex: none; margin-top: 0.2em; }
  `,
})
export class AccountMenu {
  protected readonly sync = inject(SyncService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly injector = inject(Injector);
  protected readonly offline = MESSAGES.offline;
  /** A deletion or Cancel deletion is running (SYNC-096): its menu actions are disabled meanwhile. */
  protected readonly busy = signal(false);
  private readonly seq = ++accountMenuSeq;
  protected readonly identityId = `account-identity-${this.seq}`;
  protected readonly statusId = `account-status-${this.seq}`;
  /** H-143 / H-122 (Brief decision 8): the Account button. The menu item that opened a dialog is gone by then. */
  private readonly trigger = viewChild(MatMenuTrigger, { read: ElementRef<HTMLElement> });

  constructor() {
    // The app shell loads this component (deferred) in every build; it starts sync, which restores an
    // expected session and otherwise loads no Firebase (SYNC-002).
    this.sync.start();
  }

  /** Brief H-141: opening the menu reads who is signed in (when known) and the status before the first item. */
  protected describedBy(): string {
    return this.sync.currentEmail() ? `${this.identityId} ${this.statusId}` : this.statusId;
  }

  /** H-125: the header button is passed on, so focus returns to it when the dialog closes. */
  protected openSignIn(e: Event): Promise<void> {
    return this.sync.openSignIn(e.currentTarget as HTMLElement);
  }

  /**
   * SYNC-090: the dialog stays open during Sync now; Sign out (or Sign out anyway) clears this device. Focus
   * returns to the Account button (H-125 pattern); after a real sign-out that button is gone, so the same
   * fallback puts it on #main.
   */
  protected async openSignOut(): Promise<void> {
    const trigger = this.trigger()?.nativeElement;
    const data: SignOutDialogData = {
      pending: () => this.sync.pendingCount(),
      online: this.sync.online,
      syncNow: () => this.sync.syncNow(),
    };
    const ref = this.dialog.open(SignOutDialog, { data, autoFocus: 'first-tabbable', restoreFocus: trigger ?? true });
    const signOut = (await firstValueFrom(ref.afterClosed())) === true;
    refocusAfterDialog(trigger);
    if (!signOut) return;
    await this.sync.signOut();
    // The Account button leaves the DOM only on the next render (it becomes Sign in); then the fallback runs.
    afterNextRender(() => refocusAfterDialog(trigger), { injector: this.injector });
  }

  /**
   * SYNC-095 / SYNC-096. The state is decided once, at open (H-143): when a fresh sign-in is needed and no
   * Google popup is possible, the sign-in-first state, whose Sign out hands off to the SYNC-090 dialog (opened
   * only after this one closed, so they never stack). The engine shows the outcome notice (deleted, not deleted,
   * sign in again first, offline). A deletion that stopped part-way offers Try again, which continues where it
   * stopped.
   */
  protected async openDelete(): Promise<void> {
    const trigger = this.trigger()?.nativeElement;
    const data: DeleteAccountDialogData = {
      signInFirst: this.sync.needsRecentSignIn() && !this.sync.canReauthenticate(),
    };
    const ref = this.dialog.open<DeleteAccountDialog, DeleteAccountDialogData, DeleteAccountDialogResult>(
      DeleteAccountDialog,
      { data, autoFocus: 'first-tabbable', restoreFocus: trigger ?? true },
    );
    const result = await firstValueFrom(ref.afterClosed());
    refocusAfterDialog(trigger);
    if (result === 'sign-out') return this.openSignOut();
    if (result !== true) return;
    await this.runDelete();
  }

  /** Also the account menu's Try deleting again (SYNC-096): reruns the deletion without the confirmation dialog. */
  protected async runDelete(): Promise<void> {
    this.busy.set(true);
    const result = await this.sync.deleteAccount().finally(() => this.busy.set(false));
    if (result === 'failed') {
      // H-116: an error notice, so assertive, and it stays until Try again or dismissed (no duration).
      this.snackBar
        .open(MESSAGES.deleteIncomplete, 'Try again', { politeness: 'assertive' })
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
