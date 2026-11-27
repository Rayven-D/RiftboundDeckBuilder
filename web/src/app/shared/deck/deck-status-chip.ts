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

type ChipKind = 'ready' | 'partial' | 'none';

/**
 * SPEC-005 OWN-102 ownership chip of a deck tile ([[Decks Components]] §3), from `DeckTileSummary.ownershipFilter`:
 * Ready to build / Partly available / None available, always icon + text, never colour alone. Any other group
 * renders nothing: `locked` (a locked complete deck) and `unavailable` (OWN-065). The lock is not part of this
 * chip; it is the separate `app-lock-badge` next to it (RJ 2026-11-25, H-382 (2); H-400).
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
    @media (forced-colors: active) {
      .chip {
        border-color: CanvasText;
      }
    }
  `,
})
export class DeckStatusChip {
  readonly filter = input.required<OwnershipFilter>();

  protected readonly kind = computed((): ChipKind | null => {
    const f = this.filter();
    return f === 'ready' || f === 'partial' || f === 'none' ? f : null;
  });
  protected readonly icon = computed((): IconName => OWNERSHIP_OPTION_ICON[this.kind() ?? 'none']);
  protected readonly text = computed(() => {
    const k = this.kind();
    return k ? OWNERSHIP_OPTION_LABEL[k] : '';
  });
}
