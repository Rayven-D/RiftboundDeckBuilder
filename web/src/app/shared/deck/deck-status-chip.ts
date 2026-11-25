import { Component, computed, input } from '@angular/core';
import type { OwnershipFilter } from '../../core/decks';
import { Icon, IconName } from '../icon';

/** SHARE-051 filter option names, used by the chip and the toolbar so tile and filter use the same words (OWN-102). */
export const OWNERSHIP_OPTION_LABEL: Readonly<Record<'ready' | 'partial' | 'none', string>> = {
  ready: 'Ready to build',
  partial: 'Partly available',
  none: 'None available',
};

export const OWNERSHIP_OPTION_ICON: Readonly<Record<'ready' | 'partial' | 'none', IconName>> = {
  ready: 'check_circle',
  partial: 'contrast',
  none: 'radio_button_unchecked',
};

type ChipKind = 'ready' | 'partial' | 'none' | 'locked' | 'short';

/**
 * SPEC-005 OWN-102 ownership chip of a deck tile ([[Decks Components]] §3), from `DeckTileSummary.ownershipFilter`
 * and `lockBadge`: a locked deck shows its lock badge ("Locked", or "Locked · 2 cards short" in the warning colour
 * with a warning icon); otherwise Ready to build / Partly available / None available. `unavailable` without a lock
 * renders nothing (OWN-065: no chip; a locked deck still shows "Locked"). Always icon + text, never colour alone.
 */
@Component({
  selector: 'app-deck-status-chip',
  imports: [Icon],
  template: `
    @if (kind(); as k) {
      <span class="chip" [class]="'chip chip--' + k">
        <app-icon [name]="icon()" />
        <span>{{ text() }}</span>
      </span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    :host:empty {
      display: none;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      padding: 1px var(--space-2) 1px var(--space-1);
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
    .chip--ready {
      border-color: var(--color-accent);
      background: var(--color-accent);
      color: var(--color-accent-contrast);
    }
    .chip--ready app-icon {
      color: var(--color-accent-contrast);
    }
    .chip--partial {
      border-color: var(--color-accent);
    }
    .chip--partial app-icon {
      color: var(--color-accent-text);
    }
    .chip--locked app-icon {
      color: var(--color-text);
    }
    .chip--short {
      border-color: var(--color-warning);
      color: var(--color-warning);
    }
    .chip--short app-icon {
      color: var(--color-warning);
    }
    @media (forced-colors: active) {
      .chip {
        border-color: CanvasText;
      }
    }
  `,
})
export class DeckStatusChip {
  readonly filter = input.required<OwnershipFilter>();
  readonly lockBadge = input<string | null>(null);

  protected readonly kind = computed((): ChipKind | null => {
    const badge = this.lockBadge();
    if (badge) return badge.includes('short') ? 'short' : 'locked';
    const f = this.filter();
    return f === 'ready' || f === 'partial' || f === 'none' ? f : null;
  });
  protected readonly icon = computed((): IconName => {
    const k = this.kind();
    if (k === 'locked') return 'lock';
    if (k === 'short') return 'warning';
    return OWNERSHIP_OPTION_ICON[k ?? 'none'];
  });
  protected readonly text = computed(() => {
    const k = this.kind();
    if (k === 'locked' || k === 'short') return this.lockBadge() ?? '';
    return k ? OWNERSHIP_OPTION_LABEL[k] : '';
  });
}
