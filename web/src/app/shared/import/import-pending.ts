import { Component, input, output } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { ImportKind } from './import-dialog';
import { ParseResult, SECTION_LABELS } from './parse-card-list';

/**
 * The parsed list the import dialog closed with, shown on the page it was opened from (H-176 moved it here from the
 * removed `/import` page, unchanged). Nothing is saved yet: matching names to cards and saving (SPEC-003 IMP-050…,
 * SPEC-006 DECK-0xx) come with the card data (H-020) and their own build items.
 */
@Component({
  selector: 'app-import-pending',
  imports: [MatButton],
  template: `
    <section class="pending" aria-labelledby="pending-title">
      <h2 id="pending-title">
        {{ kind() === 'deck' ? 'Deck list' : 'Collection list' }} ready:
        {{ result().summary.totalCopies }}
        {{ result().summary.totalCopies === 1 ? 'card' : 'cards' }}
      </h2>
      <p class="pending-note">Not saved yet. Matching names to cards and saving come once card data is connected.</p>
      <ul class="pending-list">
        @for (e of result().entries; track $index) {
          <li>
            <span class="qty">{{ e.quantity }}</span>
            <span>{{ e.name || e.printing?.text }}</span>
            @if (kind() === 'deck' && e.section) {
              <span class="section">{{ sectionLabel(e.section) }}</span>
            }
          </li>
        }
      </ul>
      <div class="pending-actions">
        <button matButton="outlined" type="button" aria-haspopup="dialog" (click)="again.emit()">Import another</button>
        <button matButton type="button" (click)="cleared.emit()">Clear</button>
      </div>
    </section>
  `,
  styles: `
    .pending {
      margin: var(--space-5) 0;
      padding: var(--space-4);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
    }
    .pending h2 { margin: 0 0 var(--space-1); font-size: var(--font-size-lg); }
    .pending-note { margin: 0 0 var(--space-3); font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .pending-list {
      max-height: 20rem;
      margin: 0 0 var(--space-3);
      padding: 0;
      overflow-y: auto;
      list-style: none;
      font-size: var(--font-size-sm);
    }
    .pending-list li { display: flex; gap: var(--space-3); padding: var(--space-1) 0; border-bottom: 1px solid var(--color-border); }
    .qty { min-width: 2.5ch; text-align: right; font-variant-numeric: tabular-nums; color: var(--color-text-muted); }
    .section { margin-left: auto; font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .pending-actions { display: flex; gap: var(--space-2); }
  `,
})
export class ImportPending {
  readonly kind = input.required<ImportKind>();
  readonly result = input.required<ParseResult>();
  readonly again = output<void>();
  readonly cleared = output<void>();

  protected sectionLabel(section: keyof typeof SECTION_LABELS): string {
    return SECTION_LABELS[section];
  }
}
