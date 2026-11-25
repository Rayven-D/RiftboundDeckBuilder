import { Component, computed, input } from '@angular/core';
import type { DeckLockState } from '../../core/decks';
import { Icon } from '../icon';
import { localDateText } from './local-date';

/** SHARE-041: "Locked in on Nov 23, 2026"; null when `lockedAt` doesn't parse (SHARE-030: badge without a date). */
function lockedOn(lockedAt: string | null): string | null {
  const d = localDateText(lockedAt);
  return d ? `Locked in on ${d}` : null;
}

/**
 * SPEC-008 SHARE-041 lock badge ([[Decks Components]] §6), for the Deck detail header (H-254) and anywhere a deck's
 * lock is shown in full: `lock` icon + "Locked" + muted "· Locked in on Nov 23, 2026" (`lockedAt` as a local date,
 * OWN-090; omitted when it doesn't parse, SHARE-030). Short (SHARE-033): `warning` icon + "Locked · 2 cards short"
 * in the warning colour. While ownership is unavailable the engine's label is "Locked", never "… cards short"
 * (SHARE-053 (b)). Plain text, read in order (SHARE-044). Renders nothing when the deck is not locked.
 *
 * Inputs: `lock` = `DeckOwnershipView.lock` (optional, default null: only the date comes from it); `label` =
 * `DeckTileSummary.lockBadge`, non-null exactly when the deck is locked; `showDate` (default true). It renders when
 * `label` is set, unless `lock` says the deck is not locked. The deck tile uses `label` alone with `showDate` false
 * (H-060 RJ 2026-11-25: the badge sits next to the ownership chip; the date is the header's, SHARE-041).
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
      @if (showDate() && date(); as d) {
        <span class="date"> · {{ d }}</span>
      }
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
    .date {
      color: var(--color-text-muted);
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
  readonly showDate = input(true);
  protected readonly short = computed(() => (this.label() ?? '').includes('short'));
  protected readonly date = computed(() => lockedOn(this.lock()?.lockedAt ?? null));
}
