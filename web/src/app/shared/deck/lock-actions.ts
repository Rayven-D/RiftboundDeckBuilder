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
import { MatTooltip } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';
import {
  type DeckOwnershipView,
  type SharedPool,
  type UserDeck,
  lockCheckMessage,
} from '../../core/decks';
import { Icon } from '../icon';
import { noticeOptions } from '../sync/notice';
import { LOCK_TEXT, cantLockDeckNotice, deckLockCheck, lockedInNotice, otherDecksLine, unlockedNotice } from './deck-locks';
import { DeckLocks } from './deck-locks.service';
import { LockInDialog, LockInDialogData } from './lock-in-dialog';

let nextId = 0;

/**
 * SPEC-008 SHARE-020…023, SHARE-029 / SPEC-005 OWN-116 Lock in / Unlock ([[Decks Components]] §7), built in H-060
 * for the Deck detail header (H-254) to drop in. It saves through `DeckLocks` and shows its own confirmation and
 * snack bars; the page recomputes on `DeckLocks.changed` (or the `changed` output).
 *
 * SPEC-008 v0.6 (H-665): this is the **deck-level** control. Lock in creates a name lock on every counted name not
 * locked yet (SHARE-084; a partly locked deck counts as not locked, so it shows Lock in and needs to be complete);
 * Unlock removes only this deck's name locks. "Locked" = every name locked (SHARE-083).
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
 * `locksUnreadable` (the lock store couldn't be read, SHARE-061), `variant`. Output: `changed` after a saved lock change.
 *
 * H-662 (RJ 2026-11-26), `variant="icon"`: the Deck detail title row's toggle. One native button with only an icon
 * (`lock` when locked, `lock_open` when not), `aria-label` and tooltip "Lock deck" / "Unlock deck", `aria-pressed`
 * = locked, 44 x 44. It calls the same lockIn() / unlock() with the same guards, confirmation and snack bars; it is
 * `aria-disabled` (focusable) exactly when the text button would be disabled, and the reason line still shows.
 */
@Component({
  selector: 'app-lock-actions',
  imports: [MatButton, MatTooltip, Icon],
  host: { '[class.variant-icon]': "variant() === 'icon'" },
  template: `
    @if (variant() === 'icon') {
      <!-- H-662 (RJ 2026-11-26): one icon-only toggle; the same element in both states, so focus stays on it. -->
      <button
        #action
        type="button"
        class="lock-toggle"
        [class.lock-toggle--locked]="locked()"
        [attr.aria-label]="iconLabel()"
        [attr.aria-pressed]="locked()"
        [attr.aria-disabled]="iconDisabled() ? 'true' : null"
        [attr.aria-describedby]="reason() ? reasonId : null"
        [attr.aria-haspopup]="locked() ? null : 'dialog'"
        [matTooltip]="iconLabel()"
        matTooltipPosition="below"
        [matTooltipShowDelay]="300"
        (click)="locked() ? unlock() : missingCards() !== null ? cantLock() : lockIn()"
      >
        @switch (locked()) {
          @case (true) {
            <app-icon name="lock" />
          }
          @default {
            <app-icon name="lock_open" />
          }
        }
      </button>
    } @else {
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
    }
    @if (reason(); as r) {
      @if (variant() === 'icon') {
        <!-- H-670 (RJ 2026-11-26 "Remove it to save space"): no visible reason line under the title; the reason stays
             the toggle's description for screen readers (aria-describedby), and a missing-cards press gives a notice. -->
        <span class="visually-hidden" [id]="reasonId">{{ r }}</span>
      } @else {
        <p class="reason" [id]="reasonId"><app-icon name="help" /><span>{{ r }}</span></p>
      }
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
    /* H-662 (variant "icon", the Deck detail title row): the host joins the parent's wrapping flex row, so the toggle
       sits right after the deck name and the SHARE-020 reason line goes under the whole row. 44 x 44 hit area on
       every width, icon centred, no border (the theme toggle's pattern, H-246). The state is the icon's shape
       (closed vs open lock, not colour alone); locked also takes the accent colour. aria-disabled is dimmed but
       stays focusable (OWN-116). The global :focus-visible ring applies (native button). */
    :host(.variant-icon) {
      display: contents;
    }
    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
    :host(.variant-icon) .reason {
      order: 1;
      flex: 0 0 100%;
      margin-top: 0;
    }
    .lock-toggle {
      display: inline-grid;
      flex: none;
      place-items: center;
      width: 44px;
      height: 44px;
      padding: 0;
      border: 0;
      border-radius: var(--radius-md);
      background: transparent;
      color: var(--color-text-muted);
      font-size: 24px;
      cursor: pointer;
      transition:
        color var(--dur-fast) var(--ease-out),
        background-color var(--dur-fast) var(--ease-out);
    }
    .lock-toggle app-icon {
      margin: 0;
      font-size: 24px;
    }
    .lock-toggle--locked {
      color: var(--color-accent-text);
    }
    .lock-toggle:hover {
      background: var(--color-surface-raised);
    }
    .lock-toggle:not(.lock-toggle--locked):hover {
      color: var(--color-text);
    }
    .lock-toggle[aria-disabled='true'] {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .lock-toggle[aria-disabled='true']:hover {
      background: transparent;
    }
    @media (forced-colors: active) {
      .lock-toggle {
        color: ButtonText;
      }
      .lock-toggle[aria-disabled='true'] {
        color: GrayText;
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
  /** 'button' (default): Lock in / Unlock with text. 'icon' (H-662, Deck detail title row): one icon-only toggle. */
  readonly variant = input<'button' | 'icon'>('button');
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
  /** H-662: the icon toggle's name and tooltip ("Lock deck" / "Unlock deck"). */
  protected readonly iconLabel = computed(() => (this.locked() ? LOCK_TEXT.unlockDeck : LOCK_TEXT.lockDeck));
  /**
   * H-670: the deck's missing copies when the toggle can't lock only because cards are missing (`incomplete`); null
   * otherwise. Then the toggle is operable and pressing it shows "Can't lock. Missing n cards." (no lock happens).
   */
  protected readonly missingCards = computed(() => {
    const c = this.check();
    if (this.locked() || c.ok || c.reason !== 'incomplete') return null;
    return this.view().missing.reduce((n, m) => n + m.missing, 0);
  });
  /** H-662: the same disabled state as the text buttons (Unlock: never while locked() holds, as `locked()` is false
   *  while the lock store is unreadable; Lock in: whenever there is a reason), and while saving. H-670: not for the
   *  missing-cards case, which is operable and answers with a notice. */
  protected readonly iconDisabled = computed(
    () => this.saving() || (!this.locked() && !!this.reason() && this.missingCards() === null),
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
    await this.save(() => this.locks.lockDeck(deck), lockedInNotice(deck.name));
  }

  /** H-670: the toggle on a deck missing cards: an info notice, nothing is locked; aria-pressed stays false. */
  protected cantLock(): void {
    if (this.saving()) return;
    this.snackBar.open(cantLockDeckNotice(this.missingCards() ?? 0), undefined, noticeOptions('info'));
  }

  protected async unlock(): Promise<void> {
    if (this.saving() || this.locksUnreadable()) return;
    const deck = this.deck();
    await this.save(() => this.locks.unlockDeck(deck.id), unlockedNotice(deck.name));
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
