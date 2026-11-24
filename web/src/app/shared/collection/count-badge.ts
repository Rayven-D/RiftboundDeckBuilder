import { Component, computed, input } from '@angular/core';
import { copiesText } from './collection-view';

/**
 * `×N` count badge (SPEC-007 COLL-016; Collection Components §3). Renders nothing below 2 copies
 * (RJ decision 3). The visible `×N` is hidden from assistive technology; outside a tile that already
 * names the count, set `announce` to add a visually hidden "3 copies".
 */
@Component({
  selector: 'app-count-badge',
  template: `
    @if (count() >= 2) {
      <span class="badge" aria-hidden="true">{{ text() }}</span>
      @if (announce()) {
        <span class="visually-hidden">{{ spoken() }}</span>
      }
    }
  `,
  styles: `
    :host {
      display: contents;
    }
    .badge {
      position: absolute;
      top: var(--space-1);
      right: var(--space-1);
      z-index: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 20px;
      min-width: 28px;
      padding: 0 var(--space-1);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-sm);
      background: var(--color-surface-raised);
      box-shadow: var(--shadow-rest);
      color: var(--color-text);
      font-size: var(--font-size-xs);
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      line-height: 1;
    }
    @media (max-width: 40rem) {
      .badge {
        height: 22px;
      }
    }
    @media (forced-colors: active) {
      .badge {
        border-color: CanvasText;
        background: Canvas;
      }
    }
    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
  `,
})
export class CountBadge {
  readonly count = input.required<number>();
  readonly announce = input(false);
  protected readonly text = computed(() => `×${this.count().toLocaleString('en-US')}`);
  protected readonly spoken = computed(() => copiesText(this.count()));
}
