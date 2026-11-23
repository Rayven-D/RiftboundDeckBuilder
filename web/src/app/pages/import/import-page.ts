import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Icon, IconName } from '../../shared/icon';
import { ImportDialog, ImportDialogData, ImportKind } from '../../shared/import/import-dialog';
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
  imports: [Icon, MatButton],
  template: `
    <header class="page-header">
      <h1>Import</h1>
      <p class="page-lede">Add cards you own, or deck lists you want to build.</p>
    </header>

    <div class="import-options">
      @for (option of options; track option.kind) {
        <button
          type="button"
          class="import-card"
          (click)="open(option.kind)"
          [attr.aria-haspopup]="'dialog'"
        >
          <span class="import-icon"><app-icon [name]="option.icon" /></span>
          <span class="import-text">
            <span class="import-title">{{ option.title }}</span>
            <span class="import-subtext">{{ option.subtext }}</span>
            <span class="import-formats">Paste a list or upload CSV / Excel</span>
          </span>
          <app-icon class="import-chevron" name="chevron_right" />
        </button>
      }
    </div>

    @if (pending(); as p) {
      <section class="pending" aria-labelledby="pending-title">
        <h2 id="pending-title">
          {{ p.kind === 'deck' ? 'Deck list' : 'Collection list' }} ready:
          {{ p.result.totalCopies }}
          {{ p.result.totalCopies === 1 ? 'card' : 'cards' }}
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
  `,
  styleUrl: './import-page.scss',
})
export class ImportPage {
  /** `?type=collection` or `?type=deck` opens that import straight away (bound by the router). */
  readonly type = input<string>();

  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  protected readonly pending = signal<PendingImport | null>(null);

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
      if (type === 'collection' || type === 'deck') {
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

  protected open(kind: ImportKind): void {
    const ref = this.dialog.open<ImportDialog, ImportDialogData, ParseResult>(ImportDialog, {
      data: { kind },
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
