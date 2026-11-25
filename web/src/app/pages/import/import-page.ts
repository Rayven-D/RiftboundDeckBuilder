import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { SignInGate } from '../../core/sync/sign-in-gate';
import { SignInPanel } from '../../core/sync/sign-in-panel';
import { Icon, IconName } from '../../shared/icon';
import {
  hasFiles,
  ImportDialog,
  ImportDialogData,
  ImportKind,
} from '../../shared/import/import-dialog';
import { ParseResult, SECTION_LABELS } from '../../shared/import/parse-card-list';

interface ImportOption {
  readonly kind: ImportKind;
  readonly title: string;
  readonly subtext: string;
  readonly icon: IconName;
}

interface PendingImport {
  readonly kind: ImportKind;
  readonly result: ParseResult;
}

@Component({
  selector: 'app-import-page',
  imports: [Icon, MatButton, SignInPanel],
  // A file that misses the cards must not make the browser leave the page to open it.
  host: {
    '(window:dragover)': 'ignoreStrayFile($event)',
    '(window:drop)': 'ignoreStrayFile($event)',
  },
  template: `
    <header class="page-header">
      <h1>Import</h1>
      <p class="page-lede">Add cards you own, or deck lists you want to build.</p>
    </header>

    <!-- SYNC-009: gated (account-only, SPEC-010 v0.12). -->
    @if (!gate.open()) {
      <app-sign-in-panel />
    } @else {
      <div class="import-options">
        @for (option of options; track option.kind) {
          <button
            type="button"
            class="import-card lift"
            [class.drag-over]="dragOver() === option.kind"
            (click)="open(option.kind)"
            (dragenter)="onDragEnter($event, option.kind)"
            (dragover)="onDragOver($event, option.kind)"
            (dragleave)="onDragLeave($event)"
            (drop)="onDrop($event, option.kind)"
            [attr.aria-haspopup]="'dialog'"
          >
            <span class="import-icon"><app-icon [name]="option.icon" /></span>
            <span class="import-text">
              <span class="import-title">{{ option.title }}</span>
              <span class="import-subtext">{{ option.subtext }}</span>
              <span class="import-formats">
                @if (dragOver() === option.kind) {
                  Drop to import
                } @else {
                  Paste a list or upload CSV / Excel
                }
              </span>
            </span>
            <app-icon class="import-chevron" name="chevron_right" />
          </button>
        }
      </div>

      @if (pending(); as p) {
        <section class="pending" aria-labelledby="pending-title">
          <h2 id="pending-title">
            {{ p.kind === 'deck' ? 'Deck list' : 'Collection list' }} ready:
            {{ p.result.summary.totalCopies }}
            {{ p.result.summary.totalCopies === 1 ? 'card' : 'cards' }}
          </h2>
          <p class="pending-note">
            Not saved yet. Matching names to cards and saving come once card data is connected.
          </p>
          <ul class="pending-list">
            @for (e of p.result.entries; track $index) {
              <li>
                <span class="qty">{{ e.quantity }}</span>
                <span>{{ e.name || e.printing?.text }}</span>
                @if (p.kind === 'deck' && e.section) {
                  <span class="section">{{ sectionLabel(e.section) }}</span>
                }
              </li>
            }
          </ul>
          <div class="pending-actions">
            <button matButton="outlined" type="button" (click)="open(p.kind)">Import another</button>
            <button matButton type="button" (click)="pending.set(null)">Clear</button>
          </div>
        </section>
      }
    }
  `,
  styleUrl: './import-page.scss',
})
export class ImportPage {
  /** `?type=collection` or `?type=deck` opens that import straight away (bound by the router). */
  readonly type = input<string>();

  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  protected readonly gate = inject(SignInGate);
  protected readonly pending = signal<PendingImport | null>(null);
  /** The option card a file is being dragged over. */
  protected readonly dragOver = signal<ImportKind | null>(null);

  protected readonly options: readonly ImportOption[] = [
    {
      kind: 'collection',
      title: 'Collection',
      subtext: 'Import cards to your collection',
      icon: 'stacks',
    },
    {
      kind: 'deck',
      title: 'Deck',
      subtext: 'Import deck lists to your decks',
      icon: 'playing_cards',
    },
  ];

  constructor() {
    effect(() => {
      const type = this.type();
      // SYNC-009: a deep link keeps its URL while the gate is closed and opens the dialog once it opens.
      if ((type === 'collection' || type === 'deck') && this.gate.open()) {
        untracked(() => {
          this.open(type);
          // Drop the query param so a refresh or back navigation doesn't reopen the dialog.
          void this.router.navigate([], {
            queryParams: { type: null },
            queryParamsHandling: 'merge',
            replaceUrl: true,
          });
        });
      }
    });
  }

  /**
   * Drag and drop (RJ, 2026-11-24): a file dropped on an option card opens that card's dialog with
   * the file loaded through the dialog's own upload path. Only file drags are taken.
   */
  protected onDragEnter(event: DragEvent, kind: ImportKind): void {
    if (!hasFiles(event)) return;
    event.preventDefault();
    this.dragOver.set(kind);
  }

  protected onDragOver(event: DragEvent, kind: ImportKind): void {
    if (!hasFiles(event)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    this.dragOver.set(kind);
  }

  protected ignoreStrayFile(event: DragEvent): void {
    if (hasFiles(event)) event.preventDefault();
  }

  protected onDragLeave(event: DragEvent): void {
    // Moving between the card's own children fires dragleave too: only clear when leaving the card.
    const card = event.currentTarget as HTMLElement;
    if (!card.contains(event.relatedTarget as Node | null)) this.dragOver.set(null);
  }

  protected onDrop(event: DragEvent, kind: ImportKind): void {
    this.dragOver.set(null);
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    event.preventDefault();
    this.open(kind, file);
  }

  protected open(kind: ImportKind, file?: File): void {
    const ref = this.dialog.open<ImportDialog, ImportDialogData, ParseResult>(ImportDialog, {
      data: file ? { kind, file } : { kind },
      width: '40rem',
      maxWidth: 'calc(100vw - 2rem)',
      autoFocus: 'textarea',
      restoreFocus: true,
    });
    ref.afterClosed().subscribe((result) => {
      if (result) this.pending.set({ kind, result });
    });
  }

  protected sectionLabel(section: keyof typeof SECTION_LABELS): string {
    return SECTION_LABELS[section];
  }
}
