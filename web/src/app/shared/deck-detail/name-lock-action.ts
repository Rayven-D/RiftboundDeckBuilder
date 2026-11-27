import { Component, computed, inject, input, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { deckNeeds, nameLockCheckMessage, type OwnershipCard, type SharedPool, type UserDeck } from '../../core/decks';
import { Icon } from '../icon';
import { noticeOptions } from '../sync/notice';
import { LOCK_TEXT, lockedInNotice, nameLockCheck, noLongerFullyLockedNotice } from '../deck/deck-locks';
import { DeckLocks } from '../deck/deck-locks.service';

/** What the per-name control needs besides the card: the deck and its lock facts (from the Deck detail page). */
export interface NameLockContext {
  readonly deck: UserDeck;
  /** The shared pool (SHARE-081 needs it); null while ownership is unavailable. */
  readonly pool: SharedPool | null;
  readonly readOnly: boolean;
  readonly locksUnreadable: boolean;
}

let nextId = 0;

/**
 * SPEC-008 SHARE-094 (a) / SPEC-005 OWN-121 (b) (H-665): the per-card-name **Lock / Unlock** control. It lives only in
 * the card dialog or panel (`app-deck-card-content`, under "This deck"), never on a tile, row or the Decks list.
 * - "Lock these copies" (proposal wording) stores one `NameLock` at once, no confirmation (SHARE-082). Disabled
 *   (`aria-disabled`, focusable) with the SHARE-081 reason as visible text tied by `aria-describedby`: read-only,
 *   locks unreadable, ownership unavailable, or "Lock needs every copy available: a of q". Locking the last open name
 *   locks the deck (SHARE-083) and shows "<deck> is locked in." (SHARE-029 (a)); otherwise no snack bar.
 * - "Unlock these copies" removes that one lock at once (SHARE-082). In a locked deck the deck stops being locked and
 *   its other names stay locked (SHARE-085): "<deck> is no longer fully locked." (proposal wording).
 * A failed save shows "Couldn't save the lock. Try again." and changes nothing (SHARE-063). Each change is a SYNC-126
 * major action (through `DeckLocks`). The page recomputes on `DeckLocks.changed`, so the label flips in place.
 */
@Component({
  selector: 'app-name-lock-action',
  imports: [MatButton, Icon],
  template: `
    <button
      matButton="outlined"
      type="button"
      class="name-lock-action"
      [disabled]="disabled()"
      [disabledInteractive]="true"
      [attr.aria-describedby]="reason() ? reasonId : null"
      (click)="toggle()"
    >
      <app-icon [name]="locked() ? 'lock_open' : 'lock'" />{{ locked() ? text.unlockName : text.lockName }}
    </button>
    @if (reason(); as r) {
      <p class="reason" [id]="reasonId"><app-icon name="help" /><span>{{ r }}</span></p>
    }
  `,
  styles: `
    :host {
      display: block;
      margin-top: var(--space-2);
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
  `,
})
export class NameLockAction {
  readonly card = input.required<OwnershipCard>();
  readonly context = input.required<NameLockContext>();

  private readonly locks = inject(DeckLocks);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly text = LOCK_TEXT;
  protected readonly reasonId = `name-lock-reason-${++nextId}`;
  protected readonly saving = signal(false);

  protected readonly locked = computed(() => !this.context().locksUnreadable && this.card().nameLocked);
  readonly check = computed(() => {
    const c = this.context();
    return nameLockCheck({
      pool: c.pool,
      deck: c.deck,
      cardKey: this.card().cardKey,
      readOnly: c.readOnly,
      nameLocked: this.card().nameLocked,
      locksUnreadable: c.locksUnreadable,
    });
  });
  /** Visible reason line (SHARE-081); for Unlock only while the deck is read-only. */
  protected readonly reason = computed(() => {
    if (this.locked()) return this.context().readOnly ? nameLockCheckMessage({ ok: false, reason: 'read-only' }) : null;
    return nameLockCheckMessage(this.check());
  });
  protected readonly disabled = computed(() => this.saving() || (this.locked() ? this.context().readOnly : !this.check().ok));

  protected async toggle(): Promise<void> {
    if (this.disabled()) return;
    const { deck, pool } = this.context();
    const cardKey = this.card().cardKey;
    const lockedNames = pool?.byDeck[deck.id]?.lockedNames ?? [];
    const names = deckNeeds(deck).size;
    this.saving.set(true);
    try {
      if (this.locked()) {
        const wasLocked = pool?.byDeck[deck.id]?.locked ?? false;
        await this.locks.unlockName(deck.id, cardKey);
        if (wasLocked) this.snackBar.open(noLongerFullyLockedNotice(deck.name), undefined, noticeOptions('success'));
      } else {
        await this.locks.lockName(deck.id, cardKey);
        // SHARE-083: the last open name locks the deck.
        if (!lockedNames.includes(cardKey) && lockedNames.length + 1 === names) {
          this.snackBar.open(lockedInNotice(deck.name), undefined, noticeOptions('success'));
        }
      }
    } catch {
      this.snackBar.open(LOCK_TEXT.saveFailed, 'OK', noticeOptions('error'));
    } finally {
      this.saving.set(false);
    }
  }
}
