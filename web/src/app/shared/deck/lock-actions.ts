import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import {
  type DeckOwnershipView,
  type SharedPool,
  type UserDeck,
  lockCheckMessage,
} from '../../core/decks';
import { Icon } from '../icon';
import { noticeOptions } from '../sync/notice';
import { LOCK_TEXT, deckLockCheck, lockedInNotice, otherDecksLine, unlockedNotice } from './deck-locks';
import { DeckLocks } from './deck-locks.service';
import { LockInDialog, LockInDialogData } from './lock-in-dialog';

let nextId = 0;

/**
 * SPEC-008 SHARE-020…023, SHARE-029 / SPEC-005 OWN-116 Lock in / Unlock ([[Decks Components]] §7), built in H-060
 * for the Deck detail header (H-254) to drop in. It saves through `DeckLocks` and shows its own confirmation and
 * snack bars; the page recomputes on `DeckLocks.changed` (or the `changed` output).
 *
 * - **Lock in** (unlocked deck): filled, `lock` icon. Enabled only when `canLock()` is ok. Otherwise it stays
 *   focusable (`aria-disabled`, `disabledInteractive`) and the SHARE-020 reason is visible text under the actions,
 *   tied with `aria-describedby` (OWN-116). Pressed: the SHARE-021 confirmation (focus on Lock in, Escape cancels);
 *   while saving it reads "Locking in…" and stays `aria-disabled`; then the snack bar "<name> is locked in."; a
 *   failed save shows "Couldn't save the lock. Try again." and changes nothing (SHARE-029, SHARE-063).
 * - **Unlock** (locked deck, also while ownership is unavailable, SHARE-053 (c)): outlined, `lock_open`, no
 *   confirmation (SHARE-023); snack bar "<name> is unlocked. Its cards count toward your other decks again."; no Undo.
 *   Disabled (interactive) only while the lock store is unreadable (SHARE-061).
 *
 * Inputs: `deck` (the `UserDeck`), `view` (its `DeckOwnershipView`: lock state and the other decks for the
 * confirmation), `pool` (the `SharedPool`, null while ownership is unavailable), `readOnly` (DECK-091),
 * `locksUnreadable` (the lock store couldn't be read, SHARE-061). Output: `changed` after a saved lock change.
 */
@Component({
  selector: 'app-lock-actions',
  imports: [MatButton, Icon],
  template: `
    <div class="actions">
      @if (locked()) {
        <button
          #action
          matButton="outlined"
          type="button"
          class="unlock"
          [disabled]="locksUnreadable() || saving()"
          [disabledInteractive]="true"
          [attr.aria-describedby]="locksUnreadable() ? reasonId : null"
          (click)="unlock()"
        >
          <app-icon name="lock_open" />{{ saving() ? text.unlocking : text.unlock }}
        </button>
      } @else {
        <button
          #action
          matButton="filled"
          type="button"
          class="lock-in"
          [disabled]="!!reason() || saving()"
          [disabledInteractive]="true"
          [attr.aria-describedby]="reason() ? reasonId : null"
          aria-haspopup="dialog"
          (click)="lockIn()"
        >
          <app-icon name="lock" />{{ saving() ? text.lockingIn : text.lockIn }}
        </button>
      }
    </div>
    @if (reason(); as r) {
      <p class="reason" [id]="reasonId"><app-icon name="help" /><span>{{ r }}</span></p>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }
    button {
      min-height: 44px;
    }
    button app-icon {
      margin-inline-end: var(--space-2);
      font-size: 18px;
    }
    .reason {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      margin: var(--space-2) 0 0;
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
    }
    .reason app-icon {
      flex: none;
      font-size: 16px;
    }
    @media (max-width: 40rem) {
      .actions button {
        flex: 1 1 auto;
      }
    }
  `,
})
export class LockActions {
  readonly deck = input.required<UserDeck>();
  readonly view = input.required<DeckOwnershipView>();
  readonly pool = input<SharedPool | null>(null);
  readonly readOnly = input(false);
  readonly locksUnreadable = input(false);
  readonly changed = output<void>();

  private readonly locks = inject(DeckLocks);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly action = viewChild('action', { read: ElementRef<HTMLButtonElement> });
  private readonly injector = inject(Injector);
  /** After a saved change the other button replaces this one once the page recomputes: focus it then (§7). */
  private refocus = false;

  protected readonly text = LOCK_TEXT;
  protected readonly reasonId = `lock-reason-${++nextId}`;
  protected readonly saving = signal(false);

  protected readonly locked = computed(() => !this.locksUnreadable() && (this.view().lock?.locked ?? false));
  /** The LockCheck behind Lock in (SHARE-020). */
  readonly check = computed(() =>
    deckLockCheck({
      pool: this.pool(),
      deck: this.deck(),
      readOnly: this.readOnly(),
      lock: this.view().lock,
      locksUnreadable: this.locksUnreadable(),
    }),
  );
  /** Visible reason line: SHARE-020 for Lock in; SHARE-061 for Unlock while the lock store is unreadable. */
  protected readonly reason = computed(() => {
    if (this.locked()) return null;
    if (this.locksUnreadable() && this.view().lock?.locked) return lockCheckMessage({ ok: false, reason: 'locks-unreadable' });
    return lockCheckMessage(this.check());
  });

  constructor() {
    effect(() => {
      this.locked();
      if (!untracked(() => this.refocus)) return;
      this.refocus = false;
      afterNextRender(() => this.action()?.nativeElement.focus(), { injector: this.injector });
    });
  }

  protected async lockIn(): Promise<void> {
    if (this.saving() || !this.check().ok) return;
    const deck = this.deck();
    const ref = this.dialog.open<LockInDialog, LockInDialogData, boolean>(LockInDialog, {
      data: { deckName: deck.name, others: otherDecksLine(this.view()) },
      width: 'min(28rem, calc(100vw - 2 * var(--content-gutter)))',
      maxWidth: '100vw',
      autoFocus: '.confirm',
    });
    const ok = (await firstValueFrom(ref.afterClosed())) === true;
    if (!ok) return;
    await this.save(() => this.locks.lockIn(deck.id), lockedInNotice(deck.name));
  }

  protected async unlock(): Promise<void> {
    if (this.saving() || this.locksUnreadable()) return;
    const deck = this.deck();
    await this.save(() => this.locks.unlock(deck.id), unlockedNotice(deck.name));
  }

  private async save(run: () => Promise<void>, done: string): Promise<void> {
    this.saving.set(true);
    try {
      await run();
    } catch {
      this.snackBar.open(LOCK_TEXT.saveFailed, 'OK', noticeOptions('error'));
      return;
    } finally {
      this.saving.set(false);
    }
    this.refocus = true;
    this.snackBar.open(done, undefined, noticeOptions('success'));
    this.changed.emit();
  }
}
