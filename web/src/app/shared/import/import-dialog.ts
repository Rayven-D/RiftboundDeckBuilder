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
  MAX_INPUT_BYTES,
  ParseResult,
  SECTION_LABELS,
  parseCardText,
  rowsToText,
  splitCsv,
} from './parse-card-list';

export type ImportKind = 'collection' | 'deck';

export interface ImportDialogData {
  readonly kind: ImportKind;
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
          (input)="onType($event)"
          [placeholder]="placeholder"
          aria-describedby="import-format-hint"
        ></textarea>
        <mat-hint id="import-format-hint"
          >One card per line: a number, then the name. "3 Lightning Rush" or "3x Lightning
          Rush".</mat-hint
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
          @if (fileName(); as name) {
            Loaded <strong>{{ name }}</strong>
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
            <strong>{{ result().totalCopies }}</strong>
            {{ result().totalCopies === 1 ? 'card' : 'cards' }} from {{ result().entries.length }}
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
  protected readonly fileName = signal<string | null>(null);
  protected readonly fileError = signal<string | null>(null);
  protected readonly submitError = signal<string | null>(null);

  protected readonly result = computed(() => parseCardText(this.text()));
  protected readonly errorCount = computed(
    () => this.result().issues.filter((i) => i.severity === 'error').length,
  );
  protected readonly shownIssues = computed(() => this.result().issues.slice(0, MAX_ISSUES_SHOWN));
  protected readonly sections = computed(() => {
    const counts = new Map<string, number>();
    for (const e of this.result().entries) {
      const label = e.section ? SECTION_LABELS[e.section] : 'No section';
      counts.set(label, (counts.get(label) ?? 0) + e.quantity);
    }
    return [...counts].map(([label, count]) => ({ label, count }));
  });

  protected onType(event: Event): void {
    this.text.set((event.target as HTMLTextAreaElement).value);
    this.submitError.set(null);
  }

  protected async onFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.fileError.set(null);
    this.submitError.set(null);
    try {
      this.text.set(await readImportFile(file));
      this.fileName.set(file.name);
    } catch (err) {
      this.fileName.set(null);
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

/** Reads an uploaded file into text lines. Excel support is loaded only when needed. */
export async function readImportFile(file: File): Promise<string> {
  if (file.size > MAX_INPUT_BYTES * 5) {
    throw new Error(`${file.name} is too large to import (limit: 5 MB).`);
  }
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx')) {
    const { readSheet } = await import('read-excel-file/browser');
    try {
      return rowsToText(await readSheet(file));
    } catch {
      throw new Error(`Couldn't read ${file.name}. Save it as .xlsx or .csv and try again.`);
    }
  }
  if (name.endsWith('.xls')) {
    throw new Error('Older .xls files aren’t supported. Save it as .xlsx or .csv and try again.');
  }
  const text = await file.text();
  return name.endsWith('.csv') ? rowsToText(splitCsv(text)) : text;
}
