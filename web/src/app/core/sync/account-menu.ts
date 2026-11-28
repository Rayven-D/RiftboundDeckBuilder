import { injectNotices } from '../../shared/notice/notice-snack-bar';
import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  TemplateRef,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatDivider } from '@angular/material/divider';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatSnackBarRef } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { usernameInitial } from '../../shared/account/username';
import { Icon } from '../../shared/icon';
import { MESSAGES } from '../../shared/sync/sync-engine';
import { noticeOptions } from '../../shared/sync/notice';
import { AccountInfoDialog, AccountInfoDialogData, UsernameDialog, UsernameDialogData } from './account-dialogs';
import {
  DeleteAccountDialog,
  DeleteAccountDialogData,
  DeleteAccountDialogResult,
  SignOutDialog,
  SignOutDialogData,
} from './sync-dialogs';
import { AccountTab } from './account-tab';
import { SyncService, refocusAfterDialog } from './sync.service';
import { DIALOG_MOTION } from '../../shared/motion';

/** A gap larger than this is a real layout choice (a push to stay on screen), not the scrollbar-gutter mismatch. */
const MAX_EDGE_CORRECTION = 32;

/**
 * H-189 N3: how far (px) to move the menu right so its right edge meets the trigger's. The CDK places an `xPosition=
 * "before"` menu with `right: clientWidth - x`, but the fixed overlay it is measured in is the full viewport width;
 * with `scrollbar-gutter: stable` on a page that doesn't scroll the two differ by the gutter, so the menu sits that
 * far left of its button. Only a small leftward gap is corrected; anything else returns 0.
 */
export function menuEdgeCorrection(triggerRight: number, paneRight: number): number {
  const gap = triggerRight - paneRight;
  return gap > 0.5 && gap <= MAX_EDGE_CORRECTION ? gap : 0;
}

/** Ids for the menu's aria-describedby (username, identity line, status). */
let accountMenuSeq = 0;

/**
 * SPEC-010 v0.14 header account control (SYNC-150) and account menu (SYNC-151).
 *
 * Signed out (or a lost session): the outlined Sign in button. Signed in: one ghost button with the initial, the
 * username (or "Account" with a person icon) and a chevron, named "Account: {username}". The menu, top to bottom:
 * the username, "Signed in as {email}" (H-141), the status (SYNC-084) / divider / Sync now, or during an unfinished
 * deletion Try deleting again and Cancel deletion (SYNC-096) / divider / Account Information, Privacy notice
 * (SYNC-104 d, H-180), What's new (SPEC-012 LOG-011) / divider / Sign out. No Theme group (v0.17.0: the theme is
 * the header toggle, SYNC-158). Exactly 3 dividers (H-110). Delete account and data lives in the Account
 * Information dialog (SYNC-152); there is no Settings item or `/account` link.
 *
 * H-246 (SYNC-150 g): below 40rem the same control is the tab bar's fourth tab. This one component (one
 * `SyncService.start()`, one menu, one set of dialogs) owns both triggers; the tab's template is handed to the app
 * shell through `AccountTab`. Only one trigger is displayed at any width.
 */
@Component({
  selector: 'app-account-menu',
  imports: [Icon, MatButton, MatDivider, MatMenu, MatMenuItem, MatMenuTrigger, RouterLink],
  template: `
    <!-- Header control (40rem and wider; display: none below, SYNC-150 g). -->
    @if (!sync.signedIn()) {
      <button matButton="outlined" type="button" class="header-account" aria-haspopup="dialog" (click)="openSignIn($event)">
        Sign in
      </button>
    } @else {
      <button
        type="button"
        class="account-trigger"
        [matMenuTriggerFor]="menu"
        #headerButton
        #menuTrigger="matMenuTrigger"
        [class.open]="menuTrigger.menuOpen"
        (menuOpened)="menuOpened(headerButton, false)"
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
    }
    <!-- SYNC-150 (g), H-246: the phone tab (below 40rem), rendered by the app shell in the tab bar's 4th column. It is
         declared here so it shares this component's state and the one menu below. A button, never aria-current;
         the active-tab look only while its menu or the sign-in dialog is open. -->
    <ng-template #accountTab>
      @if (!sync.signedIn()) {
        <button
          type="button"
          class="account-tab"
          [class.open]="signInOpen()"
          aria-haspopup="dialog"
          (click)="openSignInFromTab($event)"
        >
          <span class="tab-icon"><app-icon name="person" /></span>
          <span class="tab-label">Sign in</span>
        </button>
      } @else {
        <!-- RJ 2026-11-25: signed in, only the enlarged letter avatar, no visible label; the name is the label. -->
        <button
          type="button"
          class="account-tab signed-in"
          [matMenuTriggerFor]="menu"
          #tabButton
          #tabTrigger="matMenuTrigger"
          [class.open]="tabTrigger.menuOpen"
          (menuOpened)="menuOpened(tabButton, true)"
          [attr.aria-label]="accessibleName()"
        >
          <span class="avatar avatar--tab" aria-hidden="true">
            @if (initial(); as i) {
              {{ i }}
            } @else {
              <app-icon name="person" />
            }
          </span>
        </button>
      }
    </ng-template>
    <!-- The one menu definition for both triggers. Opens upward from the phone tab (SYNC-150 g).
         H-110 groups: [username, identity, status, offline] / [Sync now] or [deletion actions] /
         [Account Information, Privacy notice, What's new] / [Sign out]. Always 3 dividers, never first or last. -->
    <mat-menu
      #menu="matMenu"
      xPosition="before"
      [yPosition]="phone() ? 'above' : 'below'"
      class="account-menu-panel"
      [aria-describedby]="describedBy()"
    >
      <!-- The items exist only for a signed-in user (both triggers are signed-in only). -->
      @if (sync.signedIn()) {
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
        <!-- SYNC-151 (7) / SYNC-104 (d), then LOG-011: same-tab links, enabled offline and during an unfinished
             deletion (they need no network). -->
        <a mat-menu-item routerLink="/privacy">Privacy notice</a>
        <a mat-menu-item routerLink="/changelog">What's new</a>
        <mat-divider />
        <button mat-menu-item type="button" [disabled]="!sync.online()" (click)="openSignOut()">Sign out</button>
      }
    </mat-menu>
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
    /* SYNC-150 (g): one account trigger at any width. Below 40rem the header control is gone (display: none, so
       it's out of the accessibility tree too) and the tab bar's account tab takes over. */
    @media (max-width: 40rem) {
      .header-account,
      .account-trigger { display: none; }
    }
    /* SYNC-150 (g) / Brief H-246 Part B: the account tab. Same metrics as the app shell's tabs (app.scss .tab-bar a),
       the whole column is the hit area; .open gives the active-tab look while its menu or dialog is open. */
    .account-tab {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      width: 100%;
      min-height: var(--tabbar-height);
      padding: var(--space-1) 2px;
      border: 0;
      background: transparent;
      color: var(--color-text-muted);
      font: inherit;
      cursor: pointer;
      transition: color var(--dur-fast) var(--ease-out);
      -webkit-tap-highlight-color: transparent;
    }
    .account-tab::before {
      content: '';
      position: absolute;
      top: -1px;
      left: 50%;
      width: 2rem;
      height: 2px;
      margin-left: -1rem;
      border-radius: 0 0 2px 2px;
      background: var(--color-accent);
      opacity: 0;
      transform: scaleX(0.4);
      transition:
        opacity var(--dur-med) var(--ease-out),
        transform var(--dur-med) var(--ease-out);
    }
    .account-tab.open { color: var(--color-accent-text); }
    .account-tab.open::before { opacity: 1; transform: none; }
    .account-tab:focus-visible { outline-offset: -4px; }
    .account-tab .tab-icon {
      display: grid;
      place-items: center;
      width: 2.75rem;
      height: 1.75rem;
      border-radius: var(--radius-md);
      font-size: 22px;
      transition: transform 90ms var(--ease-out);
    }
    .account-tab:active .tab-icon,
    .account-tab:active .avatar--tab { transform: scale(0.94); }
    .account-tab .tab-label {
      max-width: 100%;
      overflow: hidden;
      font-size: var(--font-size-xs);
      font-weight: 600;
      line-height: 1.2;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    /* RJ 2026-11-25: signed in, the letter avatar alone, 40px (was 28) in the 64px tab, 12px clear above and below;
       the letter and the person glyph scale with it. */
    .avatar--tab {
      width: 40px;
      height: 40px;
      font-size: var(--font-size-lg);
      transition: transform 90ms var(--ease-out);
    }
    .avatar--tab app-icon { font-size: 28px; }
  `,
})
export class AccountMenu {
  protected readonly sync = inject(SyncService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = injectNotices();
  /** The SYNC-096 "Some data couldn't be deleted." notice while it may be on screen (H-133). */
  private deleteFailedNotice: MatSnackBarRef<unknown> | null = null;
  private readonly injector = inject(Injector);
  protected readonly offline = MESSAGES.offline;
  /** A deletion or Cancel deletion is running (SYNC-096): its menu actions are disabled meanwhile. */
  protected readonly busy = signal(false);
  private readonly seq = ++accountMenuSeq;
  protected readonly usernameId = `account-username-${this.seq}`;
  protected readonly identityId = `account-identity-${this.seq}`;
  protected readonly statusId = `account-status-${this.seq}`;
  /**
   * H-143 / H-122 (Brief decision 8): the Account button (header or phone tab) that opened the menu; dialogs opened
   * from the menu return focus to it. The menu item that opened a dialog is gone by then.
   */
  private openedFrom: HTMLElement | undefined;
  private readonly headerButton = viewChild<ElementRef<HTMLElement>>('headerButton');
  /** SYNC-150 (g): below 40rem (the app shell's phone breakpoint) the menu opens upward from the tab. */
  protected readonly phone = signal(false);
  /** SYNC-150 (g): the tab shows the active-tab look while the sign-in dialog it opened is open. */
  protected readonly signInOpen = signal(false);
  private readonly tabTemplate = viewChild.required<TemplateRef<unknown>>('accountTab');
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
    const media = typeof matchMedia === 'function' ? matchMedia('(max-width: 40rem)') : null;
    this.phone.set(media?.matches ?? false);
    const onMedia = (e: MediaQueryListEvent) => this.phone.set(e.matches);
    media?.addEventListener?.('change', onMedia);
    const tab = inject(AccountTab);
    afterNextRender(() => tab.template.set(this.tabTemplate()));
    inject(DestroyRef).onDestroy(() => {
      media?.removeEventListener?.('change', onMedia);
      if (tab.template() === this.tabTemplate()) tab.template.set(null);
    });
  }

  /** The trigger that opened the menu, else the header control (a dialog opened with no menu, e.g. by a test). */
  private get trigger(): HTMLElement | undefined {
    return this.openedFrom ?? this.headerButton()?.nativeElement;
  }

  /** Remembers which trigger opened the menu (dialogs return focus to it), then aligns the menu. */
  protected menuOpened(trigger: HTMLElement, fromTab: boolean): void {
    this.openedFrom = trigger;
    this.alignMenu(trigger, fromTab);
  }

  /**
   * H-189 N3: after the menu is placed, line its right edge up with the trigger's (see menuEdgeCorrection). The pane
   * is reused between openings, so the previous correction is cleared before measuring. CDK repositioning sets only
   * top/left/right, so the margin survives it.
   */
  private alignMenu(trigger: HTMLElement, fromTab: boolean): void {
    afterNextRender(
      () => {
        const pane = document.querySelector('.account-menu-panel')?.closest<HTMLElement>('.cdk-overlay-pane');
        if (!pane) return;
        pane.style.marginRight = '';
        // SYNC-150 (g): from the phone tab the pane's right edge sits on the content gutter (styles.scss), not on
        // the tab's edge, so no correction.
        if (fromTab) return;
        const shift = menuEdgeCorrection(trigger.getBoundingClientRect().right, pane.getBoundingClientRect().right);
        if (shift) pane.style.marginRight = `${-shift}px`;
      },
      { injector: this.injector },
    );
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

  /** SYNC-150 (g): the phone tab's Sign in; focus returns to the tab, which looks active while the dialog is open. */
  protected async openSignInFromTab(e: Event): Promise<void> {
    this.signInOpen.set(true);
    try {
      await this.sync.openSignIn(e.currentTarget as HTMLElement);
    } finally {
      this.signInOpen.set(false);
    }
  }

  /** SYNC-152: Account Information, a dialog (no route). Focus returns to the account control when it closes. */
  protected openAccountInfo(): void {
    const trigger = this.trigger;
    const data: AccountInfoDialogData = {
      username: this.sync.username,
      online: this.sync.online,
      deletionError: computed(() => (this.sync.deletion() ? MESSAGES.deleteIncomplete : null)),
      editUsername: (opener) => this.editUsername(opener),
      deleteAccount: (opener) => this.openDelete(opener),
    };
    const ref = this.dialog.open<AccountInfoDialog, AccountInfoDialogData>(AccountInfoDialog, {
      ...DIALOG_MOTION,
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
      ...DIALOG_MOTION,
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
    const trigger = this.trigger;
    const data: SignOutDialogData = {
      pending: () => this.sync.pendingCount(),
      online: this.sync.online,
      syncNow: () => this.sync.syncNow(),
    };
    const ref = this.dialog.open(SignOutDialog, { ...DIALOG_MOTION, data, autoFocus: 'first-tabbable', restoreFocus: trigger ?? true });
    const signOut = (await firstValueFrom(ref.afterClosed())) === true;
    refocusAfterDialog(trigger);
    if (!signOut) return;
    // H-133: a deletion failure notice from before must not offer Try again on the signed-out device.
    if ((await this.sync.signOut()) === 'ok') this.dismissDeleteFailedNotice();
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
      { ...DIALOG_MOTION, data, autoFocus: 'first-tabbable', restoreFocus: opener },
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
      // H-671: at the top like every notice (the old chained call slipped past notice-position.spec.ts).
      const notice = this.snackBar.open(MESSAGES.deleteIncomplete, 'Try again', noticeOptions('error'));
      this.deleteFailedNotice = notice;
      notice.onAction().subscribe(() => void this.runDelete());
    } else if (result === 'signed-out') {
      // H-133: signed out mid-deletion; this device is cleared, so no failure notice and no Try again.
      this.dismissDeleteFailedNotice();
    }
    return result;
  }

  /** Closes the SYNC-096 failure notice if it is still on screen (other notices are left alone). */
  private dismissDeleteFailedNotice(): void {
    this.deleteFailedNotice?.dismiss();
    this.deleteFailedNotice = null;
  }

  /** SYNC-096 Cancel deletion: the engine says "Your account wasn't deleted." and resumes syncing. */
  protected async cancelDeletion(): Promise<void> {
    this.busy.set(true);
    this.snackBar.dismiss(); // the failure notice's Try again must not restart a cancelled deletion
    await this.sync.cancelDeletion().finally(() => this.busy.set(false));
  }
}

