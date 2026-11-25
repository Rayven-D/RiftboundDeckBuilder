import { Component, computed, input } from '@angular/core';
import { LockedShortfall, shortfallNotice, shortfallWarning } from '../../core/decks';
import { Icon } from '../icon';

/**
 * SPEC-008 SHARE-034 shortfall warning block ([[Decks Components]] §10), for the Collection confirmations that would
 * leave a locked deck short (the IMP-050 Replace confirmation, IMP-050a; the COLL-058 / IMP-052 Undo confirmation).
 * One line per locked deck from `lockedShortfalls(before, after)`:
 * - `mode="before"` (default, inside the confirmation): "'Kennen Tempo' (locked) will be 2 cards short. It stays
 *   locked." (`shortfallWarning`; every warning ends "It stays locked.").
 * - `mode="after"`: "'Kennen Tempo' (locked) is now 2 cards short." (`shortfallNotice`, after a confirmed Undo).
 * It sits in the dialog content, so it is read with the dialog: no `role="alert"`. Renders nothing without items.
 */
@Component({
  selector: 'app-shortfall-warning',
  imports: [Icon],
  template: `
    @if (lines().length) {
      <ul class="shortfall">
        @for (line of lines(); track $index) {
          <li><app-icon name="warning" /><span>{{ line }}</span></li>
        }
      </ul>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .shortfall {
      margin: var(--space-3) 0 0;
      padding: var(--space-3);
      list-style: none;
      border: 1px solid var(--color-warning);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      font-size: var(--font-size-sm);
      color: var(--color-text);
    }
    li {
      display: flex;
      gap: var(--space-2);
      align-items: flex-start;
    }
    li + li {
      margin-top: var(--space-2);
    }
    app-icon {
      flex: none;
      font-size: 16px;
      margin-top: 2px;
      color: var(--color-warning);
    }
    @media (forced-colors: active) {
      .shortfall {
        border-color: CanvasText;
      }
    }
  `,
})
export class ShortfallWarning {
  readonly items = input.required<readonly LockedShortfall[]>();
  readonly mode = input<'before' | 'after'>('before');
  protected readonly lines = computed(() =>
    this.items().map((s) => (this.mode() === 'after' ? shortfallNotice(s) : shortfallWarning(s))),
  );
}
