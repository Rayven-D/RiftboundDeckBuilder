import { Component, ElementRef, Injector, afterNextRender, computed, effect, inject, signal, viewChild } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import type { OwnershipCard } from '../../core/decks';
import { Icon } from '../icon';
import { CardSheet } from '../card-sheet/card-sheet';
import { playEnter } from '../motion';
import { DeckCardContent } from './deck-card-content';
import type { NameLockContext } from './name-lock-action';

/** What the page gives the dialog. The functions read the page's signals, so the dialog follows store changes (OWN-070). */
export interface DeckCardDialogData {
  readonly cardId: string;
  card(id: string): OwnershipCard | null;
  fullUrl(card: OwnershipCard): string | null;
  /** The previous / next card in section order (OWN-113 SHOULD), or null at the ends. */
  neighbour(id: string, step: -1 | 1): string | null;
  locked(): boolean;
  ownershipAvailable(): boolean;
  /** H-665: the per-name lock control's context (SHARE-094 (a)); null = none. Optional for older callers. */
  lockContext?(): NameLockContext | null;
  /** Reopened from its history entry (Back from a page a link led to): that entry's token (dialog-history). */
  readonly historyToken?: string | null;
}

/** Closed result: the card to return focus to, and whether it left the deck while open. */
export interface DeckCardDialogResult {
  readonly cardId: string;
  readonly gone: boolean;
  /** H-699: closed because a link in it was followed; the page is leaving, so focus and scroll are left alone. */
  readonly navigated?: boolean;
}

export const DECK_CARD_DIALOG_TITLE_ID = 'deck-card-dialog-title';

/** The dialog's kind in a history entry's reopen record (dialog-history). */
export const DECK_CARD_DIALOG_KIND = 'deck-card';

/**
 * The card dialog below 64rem (SPEC-005 OWN-113; Decks Components §12): the OWN-112 content with the card name as the
 * title, Previous / Next through the deck in section order (also `[` / `]`), Escape or Close returns focus to the
 * pressed tile (the page does that from the result). Closes by itself, reporting `gone`, when the card leaves the deck.
 * The shell (sizes) is Collection's `card-dialog-panel`; on phones both are the bottom sheet of Brief H-698 (H-699).
 */
@Component({
  selector: 'app-deck-card-dialog',
  imports: [DeckCardContent, Icon, MatButton, MatIconButton],
  template: `
    @if (card(); as c) {
      <div
        class="head"
        [class.head--scrolled]="sheet.scrolled()"
        (pointerdown)="sheet.onPointerDown($event)"
      >
        <div class="sheet-handle" aria-hidden="true"></div>
        <div class="head-row">
          <h2 #title class="title" [id]="titleId">{{ c.name }}</h2>
          <div class="head-actions">
            <button matIconButton type="button" class="head-step" aria-label="Previous card" [disabled]="!prev()" (click)="step(-1)">
              <app-icon name="chevron_left" />
            </button>
            <button matIconButton type="button" class="head-step" aria-label="Next card" [disabled]="!next()" (click)="step(1)">
              <app-icon name="chevron_right" />
            </button>
            <button matIconButton type="button" class="close-button" aria-label="Close" (click)="closeClicked()">
              <app-icon name="close" />
            </button>
          </div>
        </div>
      </div>
      <div #sheetBody class="sheet-body" (scroll)="sheet.onBodyScroll($event)">
        <app-deck-card-content
          #content
          [card]="c"
          [locked]="data.locked()"
          [ownershipAvailable]="data.ownershipAvailable()"
          [lockContext]="data.lockContext?.() ?? null"
          [fullUrl]="data.fullUrl(c)"
          [headingLevel]="0"
          [wide]="true"
          (navigated)="leave()"
        />
      </div>
      <!-- Brief H-698 S5: on phones Previous / Next live in a bar at the bottom of the sheet (last in tab order). -->
      <div class="step-bar">
        <button matButton type="button" aria-label="Previous card" [disabled]="!prev()" (click)="step(-1)">
          <span class="step-label"><app-icon name="chevron_left" />Previous</span>
        </button>
        <button matButton type="button" class="step-next" aria-label="Next card" [disabled]="!next()" (click)="step(1)">
          <span class="step-label">Next<app-icon name="chevron_right" /></span>
        </button>
      </div>
    }
  `,
  styleUrl: './deck-card-dialog.scss',
})
export class DeckCardDialog {
  protected readonly data = inject<DeckCardDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<DeckCardDialog, DeckCardDialogResult>>(MatDialogRef);
  protected readonly titleId = DECK_CARD_DIALOG_TITLE_ID;
  readonly cardId = signal(this.data.cardId);
  protected readonly card = computed(() => this.data.card(this.cardId()));
  protected readonly prev = computed(() => this.data.neighbour(this.cardId(), -1));
  protected readonly next = computed(() => this.data.neighbour(this.cardId(), 1));
  private readonly sheetBody = viewChild<ElementRef<HTMLElement>>('sheetBody');
  private readonly content = viewChild('content', { read: ElementRef });
  private readonly title = viewChild<ElementRef<HTMLElement>>('title');
  private readonly injector = inject(Injector);
  /** H-699 (Brief H-698): the phone bottom sheet (animated close, swipe down, head divider) and Back closing it. */
  protected readonly sheet = new CardSheet(this.ref, () => this.report(), {
    reopen: () => ({ kind: DECK_CARD_DIALOG_KIND, id: this.cardId() }),
    adopt: this.data.historyToken,
  });

  constructor() {
    // OWN-113: the card left the deck (another tab) → close; the page shows "This card is no longer in this deck."
    effect(() => {
      if (!this.card()) this.ref.close({ cardId: this.cardId(), gone: true });
    });
    this.ref.disableClose = true; // Escape and backdrop go through close() to report the card
    this.ref.backdropClick().subscribe(() => this.close());
    // Keys from anywhere in the dialog, the container included (phones focus the container on open, Brief H-698).
    this.ref.keydownEvents().subscribe((e) => this.onKey(e));
  }

  /** Close, Escape, backdrop, swipe and Back: on phones the sheet slides away first (Brief H-698 Motion). */
  protected close(): void {
    this.sheet.dismiss();
  }

  protected closeClicked(): void {
    if (!this.sheet.swallowClick()) this.close();
  }

  /**
   * A link in the content was followed (OWN-113): close at once, the router is already on its way. The dialog's
   * history entry stays, so Back from the linked page reopens it (RJ 2026-11-28). Brief H-733 S2's fade-out with the
   * old page is not built: keeping the dialog in the route transition's picture crashed Chromium's renderer (H-734).
   */
  protected leave(): void {
    this.ref.close({ cardId: this.cardId(), gone: false, navigated: true });
  }

  private report(): void {
    this.ref.close({ cardId: this.cardId(), gone: false });
  }

  /**
   * OWN-113 Previous / Next; the card swaps in place and the body starts at its top (Brief H-698 S5). Brief H-733 S6:
   * the content enters from the side you moved to (12 px, --dur-med), the title fades (--dur-fast).
   */
  protected step(dir: -1 | 1): void {
    const id = dir === -1 ? this.prev() : this.next();
    if (!id) return;
    this.cardId.set(id);
    this.sheetBody()?.nativeElement.scrollTo?.({ top: 0 });
    afterNextRender(
      () => {
        playEnter(this.content()?.nativeElement, { axis: 'x', shift: '--move-shift', sign: dir });
        playEnter(this.title()?.nativeElement, { dur: '--dur-fast' });
      },
      { injector: this.injector },
    );
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
