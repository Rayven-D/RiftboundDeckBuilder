import { Component, ElementRef, Injector, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatDivider } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { firstValueFrom } from 'rxjs';
import { usernameInitial } from '../../shared/account/username';
import { Icon } from '../../shared/icon';
import { MESSAGES } from '../../shared/sync/sync-engine';
import { THEME_CHOICES } from '../../shared/theme/theme';
import { ThemeService } from '../theme/theme.service';
import { AccountInfoDialog, AccountInfoDialogData, UsernameDialog, UsernameDialogData } from './account-dialogs';
import {
  DeleteAccountDialog,
  DeleteAccountDialogData,
  DeleteAccountDialogResult,
  SignOutDialog,
  SignOutDialogData,
} from './sync-dialogs';
import { SyncService, refocusAfterDialog } from './sync.service';

/** Ids for the menu's aria-describedby (username, identity line, status) and the Theme group label. */
let accountMenuSeq = 0;

/**
 * SPEC-010 v0.14 header account control (SYNC-150) and account menu (SYNC-151).
 *
 * Signed out (or a lost session): the outlined Sign in button. Signed in: one ghost button with the initial, the
 * username (or "Account" with a person icon) and a chevron, named "Account: {username}". The menu, top to bottom:
 * the username, "Signed in as {email}" (H-141), the status (SYNC-084) / divider / Sync now, or during an unfinished
 * deletion Try deleting again and Cancel deletion (SYNC-096) / divider / Account Information, the Theme radio group
 * (and Privacy notice there, SYNC-104 d, built by H-180) / divider / Sign out. Exactly 3 dividers (H-110). Delete
 * account and data lives in the Account Information dialog (SYNC-152); there is no Settings item or `/account` link.
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
      <button
        type="button"
        class="account-trigger"
        [matMenuTriggerFor]="menu"
        #menuTrigger="matMenuTrigger"
        [class.open]="menuTrigger.menuOpen"
        [attr.aria-label]="accessibleName()"
      >
        <span class="avatar" aria-hidden="true">
          @if (initial(); as i) {
            {{ i }}
          } @else {
            <app-icon name="person" />
          }
        </span>
        <span class="name">{{ sync.username() ?? 'Account' }}</span>
        <app-icon class="chevron" name="expand_more" />
      </button>
      <!-- H-110 groups: [username, identity, status, offline] / [Sync now] or [deletion actions] /
           [Account Information, Theme, (Privacy notice, H-180)] / [Sign out]. Always 3 dividers, never first or last. -->
      <mat-menu #menu="matMenu" xPosition="before" [aria-describedby]="describedBy()">
        @if (sync.username(); as name) {
          <p class="menu-text username" [id]="usernameId">{{ name }}</p>
        }
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
        <!-- SYNC-151 (5): enabled offline (it needs no network). -->
        <button mat-menu-item type="button" aria-haspopup="dialog" (click)="openAccountInfo()">Account Information</button>
        <!-- SYNC-151 (6): three radio items, exactly one checked (a check mark, not colour alone); choosing one applies
             it at once and closes the menu (SYNC-157). -->
        <div role="group" class="theme-group" [attr.aria-labelledby]="themeLabelId">
          <p class="menu-text group-label" [id]="themeLabelId">Theme</p>
          @for (c of themeChoices; track c.value) {
            <button
              mat-menu-item
              type="button"
              role="menuitemradio"
              class="theme-item"
              [attr.aria-checked]="theme.choice() === c.value"
              (click)="theme.set(c.value)"
            >
              <span class="check" aria-hidden="true">
                @if (theme.choice() === c.value) {
                  <app-icon name="check" />
                }
              </span>
              {{ c.label }}
            </button>
          }
        </div>
        <mat-divider />
        <button mat-menu-item type="button" [disabled]="!sync.online()" (click)="openSignOut()">Sign out</button>
      </mat-menu>
    }
  `,
  styles: `
    :host { display: contents; }
    /* H-123: the header Sign in matches the 44px tabs, and its edge is the control-edge token. */
    .header-account {
      --mat-button-outlined-container-height: 44px;
      --mat-button-outlined-outline-color: var(--color-border-strong);
    }
    /* SYNC-150 (b) / Brief H-175 H1, H2: a ghost button (no fill, no border), 44px; the name gives way first
       (at most 14rem wide); the initial and the chevron never shrink. */
    .account-trigger {
      display: inline-flex;
      flex: 0 1 auto;
      align-items: center;
      gap: var(--space-2);
      min-width: 0;
      height: 44px;
      padding: 0 var(--space-2) 0 var(--space-1);
      border: 0;
      border-radius: var(--radius-md);
      background: transparent;
      color: var(--color-text);
      font: inherit;
      font-size: var(--font-size-md);
      font-weight: 600;
      cursor: pointer;
      transition: background-color var(--dur-fast) var(--ease-out);
    }
    .account-trigger:hover,
    .account-trigger.open { background: var(--color-surface-raised); }
    .avatar {
      display: inline-grid;
      flex: none;
      place-items: center;
      width: 28px;
      height: 28px;
      overflow: hidden;
      border-radius: 50%;
      background: var(--color-accent);
      color: var(--color-accent-contrast);
      font-size: var(--font-size-sm);
      font-weight: 700;
      line-height: 1;
    }
    .avatar app-icon { font-size: 20px; }
    .name { min-width: 0; max-width: 14rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .chevron { flex: none; font-size: 20px; transition: transform var(--dur-fast) var(--ease-out); }
    .account-trigger.open .chevron { transform: rotate(180deg); }
    @media (prefers-reduced-motion: reduce) {
      .chevron { transition: none; }
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
    /* SYNC-151 (1): the full name, plain text, wraps. */
    .menu-text.username { color: var(--color-text); font-weight: 600; font-size: var(--font-size-md); overflow-wrap: anywhere; }
    .identity .address { color: var(--color-text); overflow-wrap: anywhere; }
    /* Error status: icon + text, not colour alone (as the dialogs' .error, H-106). */
    .menu-text.error { display: flex; gap: var(--space-1); align-items: flex-start; color: var(--color-danger); }
    .menu-text.error app-icon { flex: none; margin-top: 0.2em; }
    .menu-text.group-label { padding-top: var(--space-2); padding-bottom: 0; font-size: var(--font-size-xs); font-weight: 600; }
    /* H-189 finding 8: a fixed 20 x 20 box (the label's line height) on every row, empty on the unselected ones, so
       the three labels share one baseline and x-position and the check is centred on its label. */
    .check {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      margin-inline-end: var(--space-2);
      vertical-align: top;
      font-size: 20px;
      line-height: 1;
    }
  `,
})
export class AccountMenu {
  protected readonly sync = inject(SyncService);
  protected readonly theme = inject(ThemeService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly injector = inject(Injector);
  protected readonly offline = MESSAGES.offline;
  protected readonly themeChoices = THEME_CHOICES;
  /** A deletion or Cancel deletion is running (SYNC-096): its menu actions are disabled meanwhile. */
  protected readonly busy = signal(false);
  private readonly seq = ++accountMenuSeq;
  protected readonly usernameId = `account-username-${this.seq}`;
  protected readonly identityId = `account-identity-${this.seq}`;
  protected readonly statusId = `account-status-${this.seq}`;
  protected readonly themeLabelId = `account-theme-${this.seq}`;
  /** H-143 / H-122 (Brief decision 8): the Account button. The menu item that opened a dialog is gone by then. */
  private readonly trigger = viewChild(MatMenuTrigger, { read: ElementRef<HTMLElement> });
  /** SYNC-152: the open Account Information dialog, closed by the delete dialog's Sign out and by a deletion. */
  private infoRef: MatDialogRef<AccountInfoDialog> | null = null;

  /** SYNC-150 (b): first grapheme, upper-cased where the script has case; '' = the person icon. */
  protected readonly initial = computed(() => usernameInitial(this.sync.username()));
  /** SYNC-150 (d): contains the visible text and the full name, also when the visible name is cut. */
  protected readonly accessibleName = computed(() => {
    const name = this.sync.username();
    return name ? `Account: ${name}` : 'Account';
  });

  constructor() {
    // The app shell loads this component (deferred) in every build; it starts sync, which restores an
    // expected session and otherwise loads no Firebase (SYNC-002).
    this.sync.start();
  }

  /** Brief H-141 / H-175 M1: opening the menu reads the name, who is signed in (when known) and the status. */
  protected describedBy(): string {
    const ids: string[] = [];
    if (this.sync.username()) ids.push(this.usernameId);
    if (this.sync.currentEmail()) ids.push(this.identityId);
    ids.push(this.statusId);
    return ids.join(' ');
  }

  /** H-125: the header button is passed on, so focus returns to it when the dialog closes. */
  protected openSignIn(e: Event): Promise<void> {
    return this.sync.openSignIn(e.currentTarget as HTMLElement);
  }

  /** SYNC-152: Account Information, a dialog (no route). Focus returns to the account control when it closes. */
  protected openAccountInfo(): void {
    const trigger = this.trigger()?.nativeElement;
    const data: AccountInfoDialogData = {
      username: this.sync.username,
      online: this.sync.online,
      deletionError: computed(() => (this.sync.deletion() ? MESSAGES.deleteIncomplete : null)),
      editUsername: (opener) => this.editUsername(opener),
      deleteAccount: (opener) => this.openDelete(opener),
    };
    const ref = this.dialog.open<AccountInfoDialog, AccountInfoDialogData>(AccountInfoDialog, {
      data,
      autoFocus: 'first-tabbable',
      restoreFocus: trigger ?? true,
      width: '30rem',
    });
    this.infoRef = ref;
    ref.afterClosed().subscribe(() => {
      if (this.infoRef === ref) this.infoRef = null;
      refocusAfterDialog(trigger);
    });
  }

  /** SYNC-155: Change username / Add username on top of Account Information; focus returns to the opener. */
  private async editUsername(opener: HTMLElement): Promise<void> {
    const current = this.sync.username();
    const data: UsernameDialogData = {
      mode: current ? 'change' : 'add',
      current,
      online: this.sync.online,
      ready: this.sync.accountReady,
      save: (v) => this.sync.saveUsername(v),
    };
    const ref = this.dialog.open<UsernameDialog, UsernameDialogData, string>(UsernameDialog, {
      data,
      autoFocus: false,
      restoreFocus: opener,
      width: '28rem',
    });
    await firstValueFrom(ref.afterClosed());
    refocusAfterDialog(opener);
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
   * SYNC-095 / SYNC-096, opened from Account Information (SYNC-152) on top of it. The state is decided once, at open
   * (H-143): when a fresh sign-in is needed and no Google popup is possible, the sign-in-first state, whose Sign out
   * closes both dialogs and then opens the SYNC-090 dialog. Cancel returns focus to `opener`. A completed deletion
   * closes every dialog (SYNC-152). The engine shows the outcome notice.
   */
  private async openDelete(opener: HTMLElement): Promise<void> {
    const data: DeleteAccountDialogData = {
      signInFirst: this.sync.needsRecentSignIn() && !this.sync.canReauthenticate(),
    };
    const ref = this.dialog.open<DeleteAccountDialog, DeleteAccountDialogData, DeleteAccountDialogResult>(
      DeleteAccountDialog,
      { data, autoFocus: 'first-tabbable', restoreFocus: opener },
    );
    const result = await firstValueFrom(ref.afterClosed());
    if (result === 'sign-out') {
      await this.closeAccountInfo();
      return this.openSignOut();
    }
    refocusAfterDialog(opener);
    if (result !== true) return;
    const outcome = await this.runDelete();
    if (outcome === 'ok') {
      this.dialog.closeAll();
      afterNextRender(() => refocusAfterDialog(undefined), { injector: this.injector });
    }
  }

  private async closeAccountInfo(): Promise<void> {
    const ref = this.infoRef;
    if (!ref) return;
    ref.close();
    await firstValueFrom(ref.afterClosed());
  }

  /** Also the account menu's Try deleting again (SYNC-096): reruns the deletion without the confirmation dialog. */
  protected async runDelete(): Promise<string> {
    this.busy.set(true);
    const result = await this.sync.deleteAccount().finally(() => this.busy.set(false));
    if (result === 'failed') {
      // H-116: an error notice, so assertive, and it stays until Try again or dismissed (no duration).
      this.snackBar
        .open(MESSAGES.deleteIncomplete, 'Try again', { politeness: 'assertive' })
        .onAction()
        .subscribe(() => void this.runDelete());
    }
    return result;
  }

  /** SYNC-096 Cancel deletion: the engine says "Your account wasn't deleted." and resumes syncing. */
  protected async cancelDeletion(): Promise<void> {
    this.busy.set(true);
    this.snackBar.dismiss(); // the failure notice's Try again must not restart a cancelled deletion
    await this.sync.cancelDeletion().finally(() => this.busy.set(false));
  }
}

