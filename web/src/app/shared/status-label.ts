import { Component, computed, input } from '@angular/core';
import { Icon, IconName } from './icon';

export type StatusVariant = 'banned' | 'upcoming' | 'unknown';

const ICON: Record<StatusVariant, IconName> = {
  banned: 'block',
  upcoming: 'schedule',
  unknown: 'help',
};

/**
 * Ban status label (SPEC-002 LEGAL-R08, SPEC-007 COLL-008/009): icon + text, never color alone.
 * Copy comes from the caller ("Banned since Nov 23, 2026", "Banned from …", "Ban status unknown").
 * Spec: brain/04-UI/Collection Components.md §7.
 */
@Component({
  selector: 'app-status-label',
  imports: [Icon],
  template: `<app-icon [name]="icon()" />{{ text() }}`,
  host: { '[class]': '"status status--" + variant()' },
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      font-size: var(--font-size-xs);
      font-weight: 600;
      line-height: 1.4;
    }
    app-icon {
      font-size: 14px;
    }
    :host(.status--banned) {
      color: var(--color-danger);
    }
    :host(.status--upcoming) {
      color: var(--color-warning);
    }
    :host(.status--unknown) {
      color: var(--color-text-muted);
    }
  `,
})
export class StatusLabel {
  readonly variant = input.required<StatusVariant>();
  readonly text = input.required<string>();
  protected readonly icon = computed(() => ICON[this.variant()]);
}
