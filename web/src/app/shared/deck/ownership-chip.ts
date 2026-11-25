import { Component, computed, input } from '@angular/core';
import { Icon } from '../icon';
import { OWNERSHIP_ICON, OwnershipState } from './ownership';

/**
 * Ownership chip ("1 of 3 available"): accent-filled when fully available, outlined otherwise.
 * Always text + icon, never color alone (SPEC-005 OWN-033).
 */
@Component({
  selector: 'app-ownership-chip',
  imports: [Icon],
  template: `
    <app-icon [name]="icon()" />
    <span>{{ label() }}</span>
  `,
  host: { '[class]': '"chip chip--" + state()' },
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      padding: 1px var(--space-2) 1px var(--space-1);
      /* Decks Components §0 token fix (H-060): the none edge was --color-border (1.29:1); strong is >= 3:1. */
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-sm);
      background: var(--color-surface-raised);
      color: var(--color-text);
      font-size: var(--font-size-xs);
      font-weight: 600;
      line-height: 1.4;
      white-space: nowrap;
    }
    app-icon {
      font-size: 14px;
      color: var(--color-text-muted);
    }
    :host(.chip--full) {
      border-color: var(--color-accent);
      background: var(--color-accent);
      color: var(--color-accent-contrast);
    }
    :host(.chip--full) app-icon {
      color: var(--color-accent-contrast);
    }
    :host(.chip--partial) {
      border-color: var(--color-accent);
    }
    :host(.chip--partial) app-icon {
      color: var(--color-accent);
    }
    @media (forced-colors: active) {
      :host {
        border: 1px solid CanvasText;
      }
    }
  `,
})
export class OwnershipChip {
  readonly state = input.required<OwnershipState>();
  readonly label = input.required<string>();
  protected readonly icon = computed(() => OWNERSHIP_ICON[this.state()]);
}
