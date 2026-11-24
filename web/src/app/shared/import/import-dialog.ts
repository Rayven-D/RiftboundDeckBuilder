import { Component, computed, inject, signal } from '@angular/core';
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
import { Icon } from '../icon';
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
  /** A file dropped on the Import page's option card: loaded through the same upload path. */
  readonly file?: File;
}

const COPY: Readonly<Record<ImportKind, { title: string; lede: string; action: string }>> = {
  collection: {
    title: 'Import collection',
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
 * Closes with the ParseResult; nothing is saved here (IMP-002).
 */
@Component({
  selector: 'app-import-dialog',
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
    Icon,
  ],
  template: `
    <h2 mat-dialog-title>{{ copy.title }}</h2>
    <mat-dialog-content>
      <p class="lede">{{ copy.lede }}</p>

      <mat-form-field appearance="outline" class="list-field" subscriptSizing="dynamic">
        <mat-label>Card list</mat-label>
        <textarea
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
      <button matButton="filled" type="button" (click)="submit()">{{ copy.action }}</button>
    </mat-dialog-actions>
  `,
  styleUrl: './import-dialog.scss',
})
export class ImportDialog {
  protected readonly data = inject<ImportDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<ImportDialog, ParseResult>>(MatDialogRef);

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

  /** The one upload path: picked, dropped on the text box, or dropped on the Import page card. */
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

  protected submit(): void {
    if (this.result().entries.length === 0) {
      this.submitError.set('Add at least one line with a number and a card name first.');
      return;
    }
    this.dialogRef.close(this.result());
  }
}
