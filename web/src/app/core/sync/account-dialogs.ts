import { LiveAnnouncer } from '@angular/cdk/a11y';
import {
  Component,
  ElementRef,
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
import type { ErrorStateMatcher } from '@angular/material/core';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import {
  USERNAME_MAX_GRAPHEMES,
  USERNAME_TEXT,
  checkUsername,
  normalizeUsername,
  usernameErrorText,
  usernameLength,
} from '../../shared/account/username';
import { Icon } from '../../shared/icon';
import { MESSAGES } from '../../shared/sync/sync-engine';

/**
 * SPEC-010 v0.14 account dialogs: the username dialog (SYNC-154 prompt, SYNC-155 change / add) and Account
 * Information (SYNC-152). There is no Settings page and no `/account` route (RJ, H-178 decision 2).
 */

export type UsernameSaveResult = 'ok' | 'offline' | 'not-ready' | 'failed';

export interface UsernameDialogData {
  /** 'choose' = the one-time prompt after a new account (SYNC-154); 'change' / 'add' from Account Information. */
  mode: 'choose' | 'change' | 'add';
  /** The current name ('change' fills and selects it). */
  current: string | null;
  online: Signal<boolean>;
  /** The first sync of this device has completed (the gate is open): Save works (SYNC-154). */
  ready: Signal<boolean>;
  /** One update() of users/{uid} (SYNC-155). Gets the normalized, valid value. */
  save: (value: string) => Promise<UsernameSaveResult>;
}

/** SYNC-154 / SYNC-155 strings. */
export const USERNAME_DIALOG_TEXT = {
  chooseTitle: 'Choose a username',
  changeTitle: 'Change username',
  addTitle: 'Add username',
  chooseLine:
    "It's shown at the top right of every page. Only you can see it, and you can change it any time in Account Information.",
  changeLine: 'Only you can see it.',
} as const;

let usernameDialogSeq = 0;

/**
 * SYNC-153…155. Save stays pressable: an invalid value shows its error under the field (icon, `aria-invalid`,
 * `aria-describedby`, focus kept in the field). Save is `aria-disabled` (focus kept) while offline or while the
 * first sync runs, with the reason above the buttons. Escape closes with no name; a backdrop click does nothing
 * (`disableClose`, Escape handled here). Closes with the saved name, or nothing.
 */
@Component({
  selector: 'app-username-dialog',
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
    <h2 mat-dialog-title>{{ title }}</h2>
    <form novalidate (submit)="submit($event)">
      <mat-dialog-content>
        <p>{{ line }}</p>
        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="field">
          <mat-label>Username</mat-label>
          <input
            #field
            matInput
            type="text"
            autocomplete="nickname"
            autocapitalize="words"
            spellcheck="false"
            enterkeyhint="done"
            [value]="value()"
            [errorStateMatcher]="errorMatcher"
            [aria-describedby]="describedBy()"
            (input)="onInput($event)"
          />
        </mat-form-field>
        <!-- H-189 N1: not a mat-hint. Material's subscript wrapper is aria-live, so a hint counter was read on every
             keystroke; here it is plain text, read with the field through aria-describedby. -->
        <p class="counter" [id]="counterId">{{ count() }} / {{ max }}</p>
        @if (error(); as err) {
          <p class="error" [id]="errorId"><app-icon name="error" />{{ err }}</p>
        }
        @if (blocker(); as b) {
          <p class="note" role="status" [id]="blockerId">{{ b }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button matButton type="button" mat-dialog-close>{{ data.mode === 'choose' ? 'Not now' : 'Cancel' }}</button>
        <button
          matButton="filled"
          type="submit"
          [disabled]="!!blocker() || saving()"
          disabledInteractive
          [attr.aria-describedby]="blocker() ? blockerId : null"
        >
          Save
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .field { width: 100%; }
    .counter {
      margin: var(--space-1) 0 0;
      padding-inline: 16px; /* the outline field's text inset, as Material's hint */
      text-align: end;
      color: var(--color-text-muted);
      font-size: var(--font-size-xs);
    }
    .error {
      display: flex;
      align-items: flex-start;
      gap: var(--space-1);
      margin: var(--space-2) 0 0;
      color: var(--color-danger);
      font-size: var(--font-size-sm);
    }
    .error app-icon { flex: none; margin-top: 0.15em; }
    .note { margin: var(--space-3) 0 0; color: var(--color-text-muted); }
  `,
})
export class UsernameDialog {
  protected readonly data = inject<UsernameDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<UsernameDialog, string>>(MatDialogRef);
  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');
  private readonly matInput = viewChild.required(MatInput);
  private readonly announcer = inject(LiveAnnouncer);
  private readonly seq = ++usernameDialogSeq;
  protected readonly errorId = `username-error-${this.seq}`;
  protected readonly counterId = `username-count-${this.seq}`;
  protected readonly blockerId = `username-blocker-${this.seq}`;
  protected readonly max = USERNAME_MAX_GRAPHEMES;
  protected readonly title =
    this.data.mode === 'choose'
      ? USERNAME_DIALOG_TEXT.chooseTitle
      : this.data.mode === 'add'
        ? USERNAME_DIALOG_TEXT.addTitle
        : USERNAME_DIALOG_TEXT.changeTitle;
  protected readonly line =
    this.data.mode === 'choose' ? USERNAME_DIALOG_TEXT.chooseLine : USERNAME_DIALOG_TEXT.changeLine;

  protected readonly value = signal(this.data.mode === 'change' ? (this.data.current ?? '') : '');
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly count = computed(() => usernameLength(this.value()));
  /** Why Save does nothing right now (shown above the buttons): offline first, then the running first sync. */
  protected readonly blocker = computed(() =>
    !this.data.online() ? MESSAGES.offline : !this.data.ready() ? USERNAME_TEXT.preparing : null,
  );
  /** Error first, then the counter; each id once (finding 7). The counter is outside Material's live subscript (N1). */
  protected readonly describedBy = computed(() =>
    this.error() ? `${this.errorId} ${this.counterId}` : this.counterId,
  );
  /**
   * H-189 finding 5: the field reads as invalid (outline, label, `aria-invalid`) while an error shows. MatInput owns
   * `aria-invalid` and only re-reads the matcher when asked (no NgControl), see setError().
   */
  protected readonly errorMatcher: ErrorStateMatcher = { isErrorState: () => this.error() !== null };

  constructor() {
    this.ref.disableClose = true; // SYNC-154: a backdrop click does nothing
    this.ref.keydownEvents().subscribe((e) => {
      if (e.key === 'Escape') this.ref.close();
    });
    afterNextRender(() => {
      const input = this.field().nativeElement;
      input.focus();
      if (this.data.mode === 'change') input.select();
    });
  }

  protected onInput(e: Event): void {
    this.value.set((e.target as HTMLInputElement).value);
    this.setError(null);
  }

  protected async submit(e: Event): Promise<void> {
    e.preventDefault();
    if (this.blocker() || this.saving()) return; // disabledInteractive still sends the press
    const check = checkUsername(this.value());
    if (!check.ok) return this.fail(usernameErrorText(check.error));
    // SYNC-155: saving the unchanged value just closes.
    if (this.data.current !== null && check.value === normalizeUsername(this.data.current)) {
      this.ref.close();
      return;
    }
    this.saving.set(true);
    const r = await this.data.save(check.value).catch(() => 'failed' as const);
    this.saving.set(false);
    if (r === 'ok') return this.ref.close(check.value);
    // 'offline' and 'not-ready' show their line above the buttons through the signals; a failure stays here.
    if (r === 'failed') this.fail(USERNAME_TEXT.saveFailed);
  }

  /**
   * Focus goes back to the field, which then reads its error through `aria-describedby`. When focus is already
   * there (Enter in the field), focusing does nothing, so the error is announced once, politely (H-189 finding 6).
   */
  private fail(message: string): void {
    this.setError(message);
    const input = this.field().nativeElement;
    if (input.ownerDocument.activeElement === input) void this.announcer.announce(message, 'polite');
    else input.focus();
  }

  private setError(message: string | null): void {
    if (this.error() === message) return;
    this.error.set(message);
    this.matInput().updateErrorState();
  }
}

export interface AccountInfoDialogData {
  username: Signal<string | null>;
  online: Signal<boolean>;
  /** SYNC-096: during this device's unfinished deletion, the Error status text shown above Delete. */
  deletionError: Signal<string | null>;
  /** Opens the SYNC-155 dialog on top; focus comes back to `opener` when it closes. */
  editUsername: (opener: HTMLElement) => Promise<void>;
  /**
   * Opens the SYNC-095 dialog on top. Its sign-in-first Sign out closes both dialogs and opens SYNC-090; focus comes
   * back to `opener` on Cancel.
   */
  deleteAccount: (opener: HTMLElement) => Promise<void>;
}

/** SYNC-152 strings. */
export const ACCOUNT_INFO_TEXT = {
  title: 'Account Information',
  noUsername: 'No username yet.',
  usernameHint: 'Shown at the top right. Only you can see it.',
  deleteLine: "Deletes your account and everything saved in it, on every device. This can't be undone.",
} as const;

let accountInfoSeq = 0;

/**
 * SYNC-152 Account Information: the username row (Change / Add username) and, below a rule, Delete account and data
 * (danger style; `aria-disabled` offline with "You're offline." under it), and Close. No route, no Sign out button.
 */
@Component({
  selector: 'app-account-info-dialog',
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButton, Icon],
  template: `
    <h2 mat-dialog-title>{{ text.title }}</h2>
    <mat-dialog-content>
      <section class="row" [attr.aria-labelledby]="usernameHeadingId">
        <h3 class="label" [id]="usernameHeadingId">Username</h3>
        <div class="username-line">
          <!-- One button for both labels, so focus can return to it after the name was added (SYNC-152 a). -->
          @if (data.username(); as name) {
            <p class="name">{{ name }}</p>
          } @else {
            <p class="name muted">{{ text.noUsername }}</p>
          }
          <button
            matButton
            type="button"
            class="edit"
            aria-haspopup="dialog"
            [attr.aria-label]="data.username() ? 'Change username' : null"
            (click)="edit($event)"
          >
            {{ data.username() ? 'Change' : 'Add username' }}
          </button>
        </div>
        <p class="hint">{{ text.usernameHint }}</p>
      </section>
      <hr class="rule" />
      <section class="row">
        @if (data.deletionError(); as err) {
          <p class="error" role="status"><app-icon name="error" />{{ err }}</p>
        }
        <button
          matButton="filled"
          type="button"
          class="danger"
          aria-haspopup="dialog"
          [disabled]="!data.online()"
          disabledInteractive
          [attr.aria-describedby]="data.online() ? deleteLineId : deleteLineId + ' ' + offlineId"
          (click)="remove($event)"
        >
          Delete account and data
        </button>
        <p class="hint" [id]="deleteLineId">{{ text.deleteLine }}</p>
        @if (!data.online()) {
          <p class="hint" role="status" [id]="offlineId">{{ offline }}</p>
        }
      </section>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton type="button" mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: `
    .row { display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-2); }
    .label { margin: 0; font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-muted); }
    .username-line { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); width: 100%; }
    .name { flex: 1 1 10rem; min-width: 0; margin: 0; font-weight: 600; color: var(--color-text); overflow-wrap: anywhere; }
    .name.muted { font-weight: 400; color: var(--color-text-muted); }
    .hint { margin: 0; color: var(--color-text-muted); font-size: var(--font-size-sm); }
    .rule { width: 100%; margin: var(--space-5) 0; border: 0; border-top: 1px solid var(--color-border); }
    .error {
      display: flex;
      align-items: flex-start;
      gap: var(--space-1);
      margin: 0;
      color: var(--color-danger);
      font-size: var(--font-size-sm);
    }
    .error app-icon { flex: none; margin-top: 0.15em; }
  `,
})
export class AccountInfoDialog {
  protected readonly data = inject<AccountInfoDialogData>(MAT_DIALOG_DATA);
  protected readonly text = ACCOUNT_INFO_TEXT;
  protected readonly offline = MESSAGES.offline;
  private readonly seq = ++accountInfoSeq;
  protected readonly usernameHeadingId = `account-info-username-${this.seq}`;
  protected readonly deleteLineId = `account-info-delete-${this.seq}`;
  protected readonly offlineId = `account-info-offline-${this.seq}`;

  protected edit(e: Event): void {
    void this.data.editUsername(e.currentTarget as HTMLElement);
  }

  protected remove(e: Event): void {
    if (!this.data.online()) return; // disabledInteractive still sends the press (SYNC-081)
    void this.data.deleteAccount(e.currentTarget as HTMLElement);
  }
}
