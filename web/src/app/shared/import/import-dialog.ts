import {
  Component,
  ElementRef,
  Injector,
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
import { MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';
import { countLine } from '../collection/collection-view';
import { Icon } from '../icon';
import { CommitMode, ImportCommitter, PreparedOk } from './collection-commit';
import {
  type DeckImportCommitter,
  type DeckReviewState,
  EMPTY_REVIEW_STATE,
  type PreparedDeck,
  carryReviewAnswers,
} from './deck-import';
import { DECK_REVIEW_STATUS_ID, DeckReview } from './deck-review';
import {
  ParseResult,
  SECTION_LABELS,
  UploadInfo,
  parseCardText,
  readImportFile,
} from './parse-card-list';

export type ImportKind = 'collection' | 'deck';

export interface ImportDialogData {
  readonly kind: ImportKind;
  /** A file dropped on the Collection or Decks page (COLL-094 i, OWN-094): loaded through the same upload path. */
  readonly file?: File;
  /**
   * Owned Cards Import (H-158): with a committer, Continue goes to the review step (resolved cards, lines left out,
   * Add / Replace) and the dialog closes with `'committed'` only after a written commit (IMP-072). Without one it
   * closes with the ParseResult.
   */
  readonly committer?: ImportCommitter;
  /**
   * Deck Import (H-253, same seam): Continue resolves the list and shows the deck review (name, lines to fix, zone
   * questions, source); Save closes with `'committed'` only after the deck is written (DECK-098).
   */
  readonly deckCommitter?: DeckImportCommitter;
}

/** What the dialog closes with: the parsed list (no committer), `'committed'`, or nothing (Cancel, Escape). */
export type ImportDialogResult = ParseResult | 'committed';

/** Review-step strings (H-158; SPEC-003 doesn't word this step, see the H-158 session note). */
export const REVIEW_TEXT = {
  ready: (copies: number, cards: number) => `Ready: ${countLine(copies, cards)}.`,
  noneMatched: 'None of these lines match a card. Go back and fix them.',
  leftOut: 'Not matched, left out of the import:',
  notes: 'Check these:',
  modeLabel: 'How to add them',
  add: 'Add to your collection',
  addHint: 'Adds these copies to the cards you already have.',
  replace: 'Replace your collection',
  replaceHint: 'Your collection becomes exactly this list.',
  addAction: 'Add cards',
  replaceAction: 'Replace collection',
  saving: 'Saving…',
  back: 'Back',
  /** H-469: the review's first heading (focus target after Continue). */
  check: 'Check the cards',
  /** Deck Import (H-253). */
  saveDeck: 'Save deck',
} as const;

const COPY: Readonly<Record<ImportKind, { title: string; lede: string; action: string }>> = {
  collection: {
    // SPEC-003 IMP-060 (v0.12, H-174): "Add to your collection" everywhere.
    title: 'Add to your collection',
    lede: 'Paste the cards you own, or upload a file.',
    action: 'Continue',
  },
  deck: {
    title: 'Import deck',
    lede: 'Paste a deck list, or upload a file. Section labels like "Main Deck:" are kept.',
    action: 'Continue',
  },
};

const MAX_ISSUES_SHOWN = 50;

/** True when a drag carries files (not text or a link). */
export function hasFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files');
}

/**
 * Paste-or-upload dialog shared by both imports. Uploaded CSV / Excel / text rows are written into
 * the text box, so everything is checked by the same line rule and can be fixed before continuing.
 * Without a committer it closes with the ParseResult; with one (Owned Cards H-158, Deck Import H-253) it closes with
 * `'committed'` after a written save. Parsing writes nothing (IMP-002, DECK-003).
 */
@Component({
  selector: 'app-import-dialog',
  // H-453: the Import deck dialog fills a phone screen with its actions pinned (import-dialog.scss, styles.scss).
  host: { '[class.deck-dialog]': "data.kind === 'deck'" },
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatButton,
    MatFormField,
    MatLabel,
    MatHint,
    MatInput,
    MatRadioGroup,
    MatRadioButton,
    Icon,
    DeckReview,
  ],
  template: `
    <h2 mat-dialog-title>{{ copy.title }}</h2>
    @if (deckReview(); as d) {
      <mat-dialog-content class="deck-content">
        <app-deck-review [prepared]="d" [initialState]="deckAnswers()" />
        @if (submitError(); as err) {
          <p class="error commit-error" role="alert"><app-icon name="error" />{{ err }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button matButton type="button" class="back" (click)="back()">{{ words.back }}</button>
        <button matButton type="button" mat-dialog-close>Cancel</button>
        <!-- H-451: styled disabled but focusable (disabledInteractive) and described by the review's status line. -->
        <button
          matButton="filled"
          type="button"
          class="commit save-deck"
          [disabled]="busy() || !canSaveDeck()"
          disabledInteractive
          [attr.aria-describedby]="deckStatusId"
          (click)="saveDeck(d)"
        >
          {{ busy() ? words.saving : words.saveDeck }}
        </button>
      </mat-dialog-actions>
    } @else if (review(); as r) {
      <mat-dialog-content class="cards-review-content">
        <!-- H-469: the review's first heading, focused after Continue (as the deck review's "Check the deck"). -->
        <h3 class="step-heading review-heading" tabindex="-1">{{ words.check }}</h3>
        @if (r.resolved.cardCount) {
          <p class="totals" role="status">
            <strong>{{ readyText(r) }}</strong>
          </p>
        } @else {
          <p class="error" role="alert"><app-icon name="error" />{{ words.noneMatched }}</p>
        }
        @if (r.resolved.leftOut.length) {
          <p class="note">{{ words.leftOut }}</p>
          <ul class="issues left-out">
            @for (l of r.resolved.leftOut.slice(0, maxIssues); track $index) {
              <li>
                <app-icon name="error" /><span><strong>Line {{ l.line }}:</strong> {{ l.message }}</span>
              </li>
            }
            @if (r.resolved.leftOut.length > maxIssues) {
              <li class="more">+{{ r.resolved.leftOut.length - maxIssues }} more</li>
            }
          </ul>
        }
        @if (r.resolved.notes.length) {
          <p class="note">{{ words.notes }}</p>
          <ul class="issues">
            @for (l of r.resolved.notes.slice(0, maxIssues); track $index) {
              <li class="warn">
                <app-icon name="warning" /><span><strong>Line {{ l.line }}:</strong> {{ l.message }}</span>
              </li>
            }
          </ul>
        }
        @if (r.resolved.cardCount) {
          <mat-radio-group
            class="modes"
            [attr.aria-label]="words.modeLabel"
            [value]="mode()"
            (change)="mode.set($event.value)"
          >
            <mat-radio-button value="add">
              <span class="mode-label">{{ words.add }}</span>
              <span class="mode-hint">{{ words.addHint }}</span>
            </mat-radio-button>
            <mat-radio-button value="replace">
              <span class="mode-label">{{ words.replace }}</span>
              <span class="mode-hint">{{ words.replaceHint }}</span>
            </mat-radio-button>
          </mat-radio-group>
        }
        @if (submitError(); as err) {
          <p class="error commit-error" role="alert"><app-icon name="error" />{{ err }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button matButton type="button" class="back" (click)="back()">{{ words.back }}</button>
        <button matButton type="button" mat-dialog-close>Cancel</button>
        @if (r.resolved.cardCount) {
          <button
            matButton="filled"
            type="button"
            class="commit"
            [attr.aria-disabled]="busy() || null"
            (click)="commit(r)"
          >
            {{ busy() ? words.saving : mode() === 'add' ? words.addAction : words.replaceAction }}
          </button>
        }
      </mat-dialog-actions>
    } @else {
    <mat-dialog-content>
      <p class="lede">{{ copy.lede }}</p>

      <mat-form-field appearance="outline" class="list-field" subscriptSizing="dynamic">
        <mat-label>Card list</mat-label>
        <textarea
          #listBox
          matInput
          rows="12"
          spellcheck="false"
          [value]="text()"
          (beforeinput)="onBeforeInput($event)"
          (input)="onType($event)"
          (dragover)="onDragOver($event)"
          (drop)="onDrop($event)"
          [placeholder]="placeholder"
          aria-describedby="import-format-hint"
        ></textarea>
        <mat-hint id="import-format-hint"
          >One card per line with its number: "3x Lightning Rush", "Lightning Rush x3". A set code
          is optional: "3 Lightning Rush RAD 001/167".</mat-hint
        >
      </mat-form-field>

      <div class="upload">
        <button matButton="outlined" type="button" (click)="fileInput.click()">
          <app-icon matButtonIcon name="upload_file" />
          Upload file
        </button>
        <input
          #fileInput
          type="file"
          accept=".csv,.txt,.xlsx,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          hidden
          (change)="onFile($event)"
        />
        <span class="upload-hint">
          @if (upload(); as u) {
            Loaded <strong>{{ u.fileName }}</strong>
          } @else {
            CSV, Excel (.xlsx) or text. Rows use the same rule.
          }
        </span>
      </div>
      @if (fileError(); as err) {
        <p class="error" role="alert"><app-icon name="error" />{{ err }}</p>
      }

      @if (text().trim()) {
        <section class="summary" aria-live="polite">
          <p class="totals">
            <strong>{{ result().summary.totalCopies }}</strong>
            {{ result().summary.totalCopies === 1 ? 'card' : 'cards' }} from
            {{ result().entries.length }}
            {{ result().entries.length === 1 ? 'line' : 'lines' }}
            @if (errorCount()) {
              <span class="bad"
                >· {{ errorCount() }}
                {{ errorCount() === 1 ? 'line needs' : 'lines need' }} fixing</span
              >
            }
          </p>
          @if (data.kind === 'deck' && sections().length) {
            <p class="sections">
              @for (s of sections(); track s.label) {
                <span>{{ s.label }} {{ s.count }}</span>
              }
            </p>
          }
          @if (result().issues.length) {
            <ul class="issues">
              @for (issue of shownIssues(); track $index) {
                <li [class.warn]="issue.severity === 'warning'">
                  <app-icon [name]="issue.severity === 'warning' ? 'warning' : 'error'" />
                  <span>
                    @if (issue.line) {
                      <strong>Line {{ issue.line }}:</strong>
                    }
                    {{ issue.message }}
                    @if (issue.raw) {
                      <code>{{ issue.raw }}</code>
                    }
                  </span>
                </li>
              }
              @if (result().issues.length > shownIssues().length) {
                <li class="more">+{{ result().issues.length - shownIssues().length }} more</li>
              }
            </ul>
            <p class="note">Lines with problems are left out of the import.</p>
          }
        </section>
      }
      @if (submitError(); as err) {
        <p class="error" role="alert"><app-icon name="error" />{{ err }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton type="button" mat-dialog-close>Cancel</button>
      <button matButton="filled" type="button" [attr.aria-disabled]="busy() || null" (click)="submit()">
        {{ copy.action }}
      </button>
    </mat-dialog-actions>
    }
  `,
  styleUrl: './import-dialog.scss',
})
export class ImportDialog {
  protected readonly data = inject<ImportDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<ImportDialog, ImportDialogResult>>(MatDialogRef);
  protected readonly words = REVIEW_TEXT;
  protected readonly maxIssues = MAX_ISSUES_SHOWN;
  /** The review step (Owned Cards Import): set by Continue once the list is resolved. */
  protected readonly review = signal<PreparedOk | null>(null);
  /** The Deck Import review step (H-253): set by Continue once the list is resolved. */
  protected readonly deckReview = signal<PreparedDeck | null>(null);
  private readonly deckReviewStep = viewChild(DeckReview);
  /** DECK-100: the answers the next deck review starts with (kept from the one left with Back). */
  protected readonly deckAnswers = signal<DeckReviewState>(EMPTY_REVIEW_STATE);
  /** DECK-100 / DECK-102: the review the user left with Back, held only while the dialog is open. */
  private leftReview: { readonly prepared: PreparedDeck; readonly answers: DeckReviewState } | null = null;
  private readonly listBox = viewChild<ElementRef<HTMLTextAreaElement>>('listBox');
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly canSaveDeck = computed(() => this.deckReviewStep()?.view().canSave ?? false);
  /** H-451: the review's status region (`DeckReview.statusId`), which describes Save. */
  protected readonly deckStatusId = DECK_REVIEW_STATUS_ID;
  /** IMP-049: Add is the default. */
  protected readonly mode = signal<CommitMode>('add');
  protected readonly busy = signal(false);

  protected readonly copy = COPY[this.data.kind];
  protected readonly placeholder =
    this.data.kind === 'deck'
      ? 'Legend:\n1 Kennen, Heart of the Tempest\nMain Deck:\n3 Lightning Rush\n2x Hextech Ray'
      : '3 Lightning Rush\n2x Hextech Ray\n1 Kennen, Heart of the Tempest';

  protected readonly text = signal('');
  /** The upload the text box content came from (IMP-062); cleared when the box is emptied. */
  protected readonly upload = signal<UploadInfo | null>(null);
  protected readonly fileError = signal<string | null>(null);
  protected readonly submitError = signal<string | null>(null);

  protected readonly result = computed(() => parseCardText(this.text(), { upload: this.upload() }));
  protected readonly errorCount = computed(() => this.result().summary.errors);
  protected readonly shownIssues = computed(() => this.result().issues.slice(0, MAX_ISSUES_SHOWN));
  protected readonly sections = computed(() => {
    const counts = new Map<string, number>();
    for (const e of this.result().entries) {
      const label = e.section ? SECTION_LABELS[e.section] : 'No section';
      counts.set(label, (counts.get(label) ?? 0) + e.quantity);
    }
    return [...counts].map(([label, count]) => ({ label, count }));
  });

  /** Bumped on every file pick, so only the latest pick is applied (overlapping reads). */
  private uploadRequest = 0;
  /** Set by a paste or drop that replaces the whole text box content (see `onType`). */
  private replacingAll = false;

  constructor() {
    if (this.data.kind === 'deck') {
      // H-453: up to 720px on desktop; full screen at 40rem and below (.import-deck-panel in styles.scss).
      this.dialogRef.addPanelClass('import-deck-panel');
      this.dialogRef.updateSize('45rem');
    }
    if (this.data.file) void this.loadFile(this.data.file);
  }

  protected onBeforeInput(event: Event): void {
    const { inputType } = event as InputEvent;
    const box = event.target as HTMLTextAreaElement;
    const wholeSelected = box.selectionStart === 0 && box.selectionEnd === box.value.length;
    this.replacingAll =
      (inputType === 'insertFromPaste' || inputType === 'insertFromDrop') && wholeSelected;
  }

  /**
   * The text box no longer holds the upload, so its file name, CSV format and row limit are
   * dropped, when the box is emptied or a paste / drop replaces its whole content. Other edits
   * keep the upload: they are fixes to the uploaded lines (IMP-062).
   */
  protected onType(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    if (this.replacingAll || !value.trim()) this.upload.set(null);
    this.replacingAll = false;
    this.text.set(value);
    this.fileError.set(null);
    this.submitError.set(null);
  }

  protected onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) void this.loadFile(file);
  }

  /** A file dragged over the text box can be dropped (text drags keep the native behavior). */
  protected onDragOver(event: DragEvent): void {
    if (hasFiles(event)) event.preventDefault();
  }

  /** A dropped file goes through the same upload path as "Upload file" (IMP-061 / IMP-062). */
  protected onDrop(event: DragEvent): void {
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    event.preventDefault();
    void this.loadFile(file);
  }

  /** The one upload path: picked, dropped on the text box, or dropped on the page that opened the dialog. */
  private async loadFile(file: File): Promise<void> {
    const request = ++this.uploadRequest;
    this.fileError.set(null);
    this.submitError.set(null);
    try {
      const { text, upload } = await readImportFile(file);
      if (request !== this.uploadRequest) return;
      this.text.set(text);
      this.upload.set(upload);
    } catch (err) {
      if (request !== this.uploadRequest) return;
      // IMP-061: a rejected file leaves the text box (and where it came from) unchanged.
      this.fileError.set(err instanceof Error ? err.message : `Couldn't read ${file.name}.`);
    }
  }

  protected async submit(): Promise<void> {
    if (this.busy()) return;
    if (this.result().entries.length === 0) {
      this.submitError.set('Add at least one line with a number and a card name first.');
      return;
    }
    const deckCommitter = this.data.deckCommitter;
    if (deckCommitter) return this.prepareDeck(deckCommitter);
    const committer = this.data.committer;
    if (!committer) {
      this.dialogRef.close(this.result());
      return;
    }
    this.busy.set(true);
    try {
      const prepared = await committer.prepare(this.result(), this.text());
      if (prepared.status === 'error') this.submitError.set(prepared.message);
      else {
        this.submitError.set(null);
        this.review.set(prepared);
        // H-469: the Continue button is gone; focus the review's first heading, not <body>.
        afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>('.review-heading')?.focus(), {
          injector: this.injector,
        });
      }
    } finally {
      this.busy.set(false);
    }
  }

  protected readyText(r: PreparedOk): string {
    return REVIEW_TEXT.ready(r.resolved.copies, r.resolved.cardCount);
  }

  /** DECK-003: Continue resolves the list; nothing is written. */
  private async prepareDeck(committer: DeckImportCommitter): Promise<void> {
    this.busy.set(true);
    try {
      const prepared = await committer.prepare(this.result(), this.text());
      if (prepared.status === 'error') this.submitError.set(prepared.message);
      else {
        this.submitError.set(null);
        // DECK-100 / DECK-101: answers on lines that did not change are kept; the others are asked again.
        const left = this.leftReview;
        this.deckAnswers.set(left ? carryReviewAnswers(left.prepared, left.answers, prepared, new Date()) : EMPTY_REVIEW_STATE);
        this.deckReview.set(prepared);
        // H-450: the Continue button is gone; focus the review's first heading, not <body>.
        afterNextRender(() => this.deckReviewStep()?.focusStart(), { injector: this.injector });
      }
    } finally {
      this.busy.set(false);
    }
  }

  /**
   * DECK-003 / DECK-098: only Save writes; the dialog closes only after the deck is written, and a failed save
   * (DECK_LIMIT, DECK_TOO_LARGE, STORAGE_FULL) keeps it open with the error. Save waits for DECK-038 / DECK-041.
   */
  protected async saveDeck(prepared: PreparedDeck): Promise<void> {
    const committer = this.data.deckCommitter;
    const step = this.deckReviewStep();
    const view = step?.view();
    if (!committer || !view || this.busy()) return;
    // H-451: disabledInteractive still sends the press; while blocked, take the user to what needs doing.
    if (!view.canSave) return step?.focusFirstOpen();
    this.busy.set(true);
    this.submitError.set(null);
    try {
      const out = await committer.commit(prepared, { draft: view.draft });
      if (out.status === 'written') this.dialogRef.close('committed');
      else if (out.status === 'error') this.submitError.set(out.message);
    } finally {
      this.busy.set(false);
    }
  }

  /**
   * Back to the list (the text and the upload are kept). DECK-100: the deck review's answers are held so the next
   * Continue keeps those on unchanged lines; the Owned Cards review starts over.
   */
  protected back(): void {
    if (this.busy()) return;
    const deck = this.deckReview();
    const step = this.deckReviewStep();
    if (deck && step) this.leftReview = { prepared: deck, answers: step.answers() };
    this.review.set(null);
    this.deckReview.set(null);
    this.submitError.set(null);
    // H-450: back on the list step, focus the Card list the user came back to fix.
    afterNextRender(() => this.listBox()?.nativeElement.focus(), { injector: this.injector });
  }

  /**
   * IMP-072: the dialog closes only after a written commit; a failed write keeps it open with the error and no
   * notice; a cancelled Replace confirmation keeps it open and writes nothing.
   */
  protected async commit(r: PreparedOk): Promise<void> {
    const committer = this.data.committer;
    if (!committer || this.busy()) return;
    this.busy.set(true);
    this.submitError.set(null);
    try {
      const out = await committer.commit(r, this.mode());
      if (out.status === 'written') this.dialogRef.close('committed');
      else if (out.status === 'error') this.submitError.set(out.message);
    } finally {
      this.busy.set(false);
    }
  }
}
