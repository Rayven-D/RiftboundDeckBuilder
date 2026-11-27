import { Component, computed, input } from '@angular/core';
import type { DeckLockState } from '../../core/decks';
import { Icon } from '../icon';

/**
 * SPEC-008 SHARE-041 lock badge ([[Decks Components]] §6), on the deck tile: `lock` icon + "Locked". Short
 * (SHARE-033): `warning` icon + "Locked · 2 cards short" in the warning colour. H-662 (RJ 2026-11-26): the lock date
 * ("Locked in on <date>") is no longer shown anywhere, and the Deck detail header shows the lock as the title-row icon
 * toggle (`app-lock-actions variant="icon"`) instead of this badge. While ownership is unavailable the engine's
 * label is "Locked", never "… cards short" (SHARE-053 (b)). Plain text, read in order (SHARE-044). Renders nothing when the deck is not locked.
 *
 * Inputs: `lock` = `DeckOwnershipView.lock` (optional, default null); `label` = `DeckTileSummary.lockBadge`, non-null
 * exactly when the deck is locked. It renders when `label` is set, unless `lock` says the deck is not locked. The deck
 * tile uses `label` alone (H-060 RJ 2026-11-25: the badge sits next to the ownership chip).
 * Size: `--lock-badge-font-size` (default `--font-size-sm`) and `--lock-badge-icon-size` (default 16px).
 */
@Component({
  selector: 'app-lock-badge',
  imports: [Icon],
  template: `
    @if (label() && lock()?.locked !== false) {
      <span class="badge" [class.badge--short]="short()">
        <app-icon [name]="short() ? 'warning' : 'lock'" />
        <span class="label">{{ label() }}</span>
      </span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-1);
      font-size: var(--lock-badge-font-size, var(--font-size-sm));
    }
    :host:empty {
      display: none;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      padding: 1px var(--space-2) 1px var(--space-1);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-sm);
      background: var(--color-surface-raised);
      color: var(--color-text);
      font-weight: 600;
    }
    .badge--short {
      border-color: var(--color-warning);
      color: var(--color-warning);
    }
    app-icon {
      font-size: var(--lock-badge-icon-size, 16px);
    }
    @media (forced-colors: active) {
      .badge {
        border-color: CanvasText;
      }
    }
  `,
})
export class LockBadge {
  readonly lock = input<DeckLockState | null>(null);
  readonly label = input.required<string | null>();
  protected readonly short = computed(() => (this.label() ?? '').includes('short'));
}
