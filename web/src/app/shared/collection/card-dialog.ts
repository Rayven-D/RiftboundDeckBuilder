import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CardArt } from '../deck/card-art';
import { OwnershipChip } from '../deck/ownership-chip';
import { Icon } from '../icon';
import { StatusLabel } from '../status-label';
import { cardKeywords } from '../../core/cards/keywords';
import { CardDetail, DECKS_UNREADABLE, landscapeFor } from './collection-view';
import { KEYWORD_INDEX, KeywordList } from './keyword-list';
import { CardSheet } from '../card-sheet/card-sheet';
import { playEnter } from '../motion';

/** What the page gives the dialog. `detail` reads the page's signals, so the dialog stays in sync (S13). */
export interface CardDialogData {
  readonly entryId: string;
  detail(entryId: string): CardDetail | null;
  /** The previous / next tile in the current results, or null at the ends. */
  neighbour(entryId: string, step: -1 | 1): string | null;
  /** Desktop only: Previous / Next buttons and the `[` / `]` keys (brief §5.6). */
  readonly stepping: boolean;
  /** Reopened from its history entry (Back from a page a link led to): that entry's token (dialog-history). */
  readonly historyToken?: string | null;
}

/** Closed result: the tile to return focus to, and whether the card left the collection. */
export interface CardDialogResult {
  readonly entryId: string;
  readonly gone: boolean;
}

/** The dialog's title id; the page passes it as `ariaLabelledBy` (one card dialog at a time). */
export const CARD_DIALOG_TITLE_ID = 'card-dialog-title';

/** The dialog's kind in a history entry's reopen record (dialog-history). */
export const CARD_DIALOG_KIND = 'collection-card';

/**
 * Read-only card dialog for one entry (brief §5; Collection Components §6): the clicked printing's
 * art and count, the card's other printings, Locked in, Could fit in, the ban label, Keywords (SPEC-011:
 * only keywords with a verified glossary entry, so hidden everywhere while the glossary is empty, KW-056).
 */
@Component({
  selector: 'app-card-dialog',
  imports: [CardArt, OwnershipChip, StatusLabel, Icon, MatIconButton, KeywordList],
  template: `
    @if (detail(); as d) {
      <div
        class="head"
        [class.head--scrolled]="sheet.scrolled()"
        (pointerdown)="sheet.onPointerDown($event)"
      >
        <div class="sheet-handle" aria-hidden="true"></div>
        <div class="head-row">
        <h2 #title class="title" [id]="titleId">{{ d.card.name }}</h2>
        <div class="head-actions">
          @if (data.stepping) {
            <button
              matIconButton
              type="button"
              aria-label="Previous card"
              [disabled]="!prev()"
              (click)="step(-1)"
            >
              <app-icon name="chevron_left" />
            </button>
            <button
              matIconButton
              type="button"
              aria-label="Next card"
              [disabled]="!next()"
              (click)="step(1)"
            >
              <app-icon name="chevron_right" />
            </button>
          }
          <button
            matIconButton
            type="button"
            class="close-button"
            aria-label="Close"
            (click)="closeClicked()"
          >
            <app-icon name="close" />
          </button>
        </div>
        </div>
      </div>
      <div #sheetBody class="sheet-body" (scroll)="sheet.onBodyScroll($event)">
      <div #content class="body">
        <div class="art-col">
          <div class="art-frame" [class.art-frame--stand-in]="d.tile.standIn">
            <app-card-art
              [name]="d.card.name"
              state="full"
              [fill]="1"
              [imageUrl]="artUrl()"
              [landscape]="landscape()"
            />
          </div>
          @if (d.ban; as ban) {
            <app-status-label class="ban" [variant]="ban.variant" [text]="ban.text" />
          }
        </div>
        <div class="info">
          <div class="section">
            <p #printingLine class="printing" tabindex="-1">{{ d.printingLine }}</p>
            @if (d.details) {
              <p class="muted">{{ d.details }}</p>
            }
          </div>
          @if (d.ownedHeading) {
            <section class="section">
              <h3>{{ d.ownedHeading }}</h3>
              <ul class="plain printings">
                @for (row of d.printings; track row.entryId) {
                  <li>
                    @if (row.current) {
                      <span aria-current="true">{{ row.text }} (this one)</span>
                    } @else {
                      <button
                        type="button"
                        class="link"
                        [attr.aria-label]="row.ariaLabel"
                        (click)="show(row.entryId)"
                      >
                        {{ row.text }}
                      </button>
                    }
                  </li>
                }
              </ul>
            </section>
          }
          @if (d.excludedLine) {
            <p class="muted">{{ d.excludedLine }}</p>
          }
          @if (d.lockedIn.length > 0) {
            <section class="section">
              <h3>Locked in</h3>
              <p class="help">Decks lock copies by card name, any printing.</p>
              <ul class="plain rows">
                @for (row of d.lockedIn; track row.deckId) {
                  <li>
                    <span class="deck"
                      ><app-icon name="lock" class="lock" />{{ row.deckName }}</span
                    >
                    <span class="end">{{ row.copies }}</span>
                  </li>
                }
              </ul>
            </section>
          }
          <section class="section">
            <h3>Could fit in</h3>
            @if (d.decksUnreadable) {
              <p class="muted">{{ decksUnreadable }}</p>
            } @else if (d.couldFit.length > 0) {
              <ul class="plain rows">
                @for (row of d.couldFit; track row.deckId) {
                  <li>
                    <span class="deck">{{ row.deckName }}</span>
                    <app-ownership-chip [state]="row.state" [label]="row.label" />
                  </li>
                }
              </ul>
            } @else {
              <p class="muted">{{ d.couldFitEmpty }}</p>
            }
          </section>
          @if (keywordRows().length > 0) {
            <section class="section">
              <h3>Keywords</h3>
              <app-keyword-list [rows]="keywordRows()" />
            </section>
          }
        </div>
      </div>
      </div>
    }
  `,
  styleUrl: './card-dialog.scss',
})
export class CardDialog {
  protected readonly data = inject<CardDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<CardDialog, CardDialogResult>>(MatDialogRef);
  private readonly injector = inject(Injector);
  private readonly printingLine = viewChild<ElementRef<HTMLElement>>('printingLine');
  private readonly sheetBody = viewChild<ElementRef<HTMLElement>>('sheetBody');
  private readonly content = viewChild<ElementRef<HTMLElement>>('content');
  private readonly title = viewChild<ElementRef<HTMLElement>>('title');
  /** H-699 (Brief H-698): the phone bottom sheet (animated close, swipe down, head divider) and Back closing it. */
  protected readonly sheet = new CardSheet(this.ref, () => this.report(), {
    reopen: () => ({ kind: CARD_DIALOG_KIND, id: this.entryId() }),
    adopt: this.data.historyToken,
  });

  protected readonly titleId = CARD_DIALOG_TITLE_ID;
  protected readonly decksUnreadable = DECKS_UNREADABLE;
  readonly entryId = signal(this.data.entryId);
  protected readonly detail = computed(() => this.data.detail(this.entryId()));
  protected readonly landscape = computed(() => landscapeFor(this.detail()?.card.card.category));
  /** SPEC-011 KW-030…053: rows from `PlayableCard.keywords` only; none hides the section and its heading. */
  private readonly keywordIndex = inject(KEYWORD_INDEX);
  protected readonly keywordRows = computed(() =>
    cardKeywords(this.detail()?.card.card.keywords, this.keywordIndex),
  );
  protected readonly prev = computed(() => this.data.neighbour(this.entryId(), -1));
  protected readonly next = computed(() => this.data.neighbour(this.entryId(), 1));

  /** Thumbnail first, swapped for the full image once it has loaded (no layout shift). */
  private readonly loadedFull = signal<string | null>(null);
  protected readonly artUrl = computed(() => {
    const t = this.detail()?.tile;
    if (!t) return null;
    return t.fullUrl && this.loadedFull() === t.fullUrl ? t.fullUrl : (t.thumbnailUrl ?? t.fullUrl);
  });

  constructor() {
    effect(() => {
      const d = this.detail();
      if (!d) {
        this.ref.close({ entryId: this.entryId(), gone: true });
        return;
      }
      const full = d.tile.fullUrl;
      if (full && full !== d.tile.thumbnailUrl && typeof Image !== 'undefined') {
        const img = new Image();
        img.onload = () => this.loadedFull.set(full);
        img.src = full;
      }
    });
    this.ref.disableClose = true; // Escape and backdrop go through close() to report the tile
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

  private report(): void {
    this.ref.close({ entryId: this.entryId(), gone: false });
  }

  protected show(entryId: string): void {
    this.entryId.set(entryId);
    afterNextRender(() => this.printingLine()?.nativeElement.focus(), { injector: this.injector });
  }

  /** Brief H-716 S6: the content enters from the side you moved to (12 px, --dur-med), the title fades; body to top. */
  protected step(dir: -1 | 1): void {
    const id = dir === -1 ? this.prev() : this.next();
    if (!id) return;
    this.entryId.set(id);
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
    } else if (this.data.stepping && (e.key === '[' || e.key === ']')) {
      e.preventDefault();
      this.step(e.key === '[' ? -1 : 1);
    }
  }
}
