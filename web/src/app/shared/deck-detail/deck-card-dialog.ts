import { Component, computed, effect, inject, signal } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import type { OwnershipCard } from '../../core/decks';
import { Icon } from '../icon';
import { DeckCardContent } from './deck-card-content';

/** What the page gives the dialog. The functions read the page's signals, so the dialog follows store changes (OWN-070). */
export interface DeckCardDialogData {
  readonly cardId: string;
  card(id: string): OwnershipCard | null;
  fullUrl(card: OwnershipCard): string | null;
  /** The previous / next card in section order (OWN-113 SHOULD), or null at the ends. */
  neighbour(id: string, step: -1 | 1): string | null;
  locked(): boolean;
  ownershipAvailable(): boolean;
}

/** Closed result: the card to return focus to, and whether it left the deck while open. */
export interface DeckCardDialogResult {
  readonly cardId: string;
  readonly gone: boolean;
}

export const DECK_CARD_DIALOG_TITLE_ID = 'deck-card-dialog-title';

/**
 * The card dialog below 64rem (SPEC-005 OWN-113; Decks Components §12): the OWN-112 content with the card name as the
 * title, Previous / Next through the deck in section order (also `[` / `]`), Escape or Close returns focus to the
 * pressed tile (the page does that from the result). Closes by itself, reporting `gone`, when the card leaves the deck.
 * The shell (sizes, phone full screen) is Collection's `card-dialog-panel`.
 */
@Component({
  selector: 'app-deck-card-dialog',
  imports: [DeckCardContent, Icon, MatIconButton],
  host: { '(keydown)': 'onKey($event)' },
  template: `
    @if (card(); as c) {
      <div class="head">
        <h2 class="title" [id]="titleId">{{ c.name }}</h2>
        <div class="head-actions">
          <button matIconButton type="button" aria-label="Previous card" [disabled]="!prev()" (click)="step(-1)">
            <app-icon name="chevron_left" />
          </button>
          <button matIconButton type="button" aria-label="Next card" [disabled]="!next()" (click)="step(1)">
            <app-icon name="chevron_right" />
          </button>
          <button matIconButton type="button" class="close-button" aria-label="Close" (click)="close()">
            <app-icon name="close" />
          </button>
        </div>
      </div>
      <app-deck-card-content
        [card]="c"
        [locked]="data.locked()"
        [ownershipAvailable]="data.ownershipAvailable()"
        [fullUrl]="data.fullUrl(c)"
        [headingLevel]="0"
        [wide]="true"
        (navigated)="close()"
      />
    }
  `,
  styles: `
    :host {
      display: block;
      padding: var(--space-5);
      background: var(--color-surface);
      color: var(--color-text);
    }
    @media (max-width: 39.99rem) {
      :host {
        min-height: 100%;
        padding: var(--space-4) var(--space-4) calc(var(--space-4) + env(safe-area-inset-bottom));
      }
    }
    .head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-3);
      margin-bottom: var(--space-4);
    }
    @media (max-width: 39.99rem) {
      .head {
        position: sticky;
        top: calc(-1 * var(--space-4));
        z-index: 2;
        margin: calc(-1 * var(--space-4)) calc(-1 * var(--space-4)) var(--space-4);
        padding: var(--space-4) var(--space-4) var(--space-2);
        background: var(--color-surface);
      }
    }
    .title {
      margin: 0;
      font-size: var(--font-size-xl);
      line-height: 1.15;
    }
    @media (max-width: 39.99rem) {
      .title {
        font-size: var(--font-size-lg);
      }
    }
    .head-actions {
      display: flex;
      flex: none;
      gap: var(--space-1);
    }
    .head-actions button {
      width: 44px;
      height: 44px;
      padding: 10px;
      font-size: 24px;
    }
  `,
})
export class DeckCardDialog {
  protected readonly data = inject<DeckCardDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<DeckCardDialog, DeckCardDialogResult>>(MatDialogRef);
  protected readonly titleId = DECK_CARD_DIALOG_TITLE_ID;
  readonly cardId = signal(this.data.cardId);
  protected readonly card = computed(() => this.data.card(this.cardId()));
  protected readonly prev = computed(() => this.data.neighbour(this.cardId(), -1));
  protected readonly next = computed(() => this.data.neighbour(this.cardId(), 1));

  constructor() {
    // OWN-113: the card left the deck (another tab) → close; the page shows "This card is no longer in this deck."
    effect(() => {
      if (!this.card()) this.ref.close({ cardId: this.cardId(), gone: true });
    });
    this.ref.disableClose = true; // Escape and backdrop go through close() to report the card
    this.ref.backdropClick().subscribe(() => this.close());
  }

  protected close(): void {
    this.ref.close({ cardId: this.cardId(), gone: false });
  }

  protected step(dir: -1 | 1): void {
    const id = dir === -1 ? this.prev() : this.next();
    if (id) this.cardId.set(id);
  }

  protected onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
    } else if (e.key === '[' || e.key === ']') {
      e.preventDefault();
      this.step(e.key === '[' ? -1 : 1);
    }
  }
}
