import { Component, computed, input } from '@angular/core';
import { Icon } from '../icon';
import { lockBandText } from './collection-view';

/**
 * Card-level lock band over the bottom of the art (brief §4; Collection Components §4): copies of
 * the CARD (all printings) held by locked decks, the same on every printing tile of the card.
 * Hidden from assistive technology: the tile's accessible name carries the full text.
 */
@Component({
  selector: 'app-lock-band',
  imports: [Icon],
  template: `
    @if (copies() > 0) {
      <div class="band" aria-hidden="true">
        <app-icon name="lock" />
        <span class="text">{{ text() }}</span>
      </div>
    }
  `,
  styles: `
    :host {
      display: contents;
    }
    .band {
      position: absolute;
      right: 0;
      bottom: 0;
      left: 0;
      z-index: 1;
      display: flex;
      align-items: flex-start;
      gap: var(--space-1);
      padding: var(--space-1) var(--space-2);
      border-radius: 0 0 var(--radius-md) var(--radius-md);
      background: var(--lock-scrim);
      color: #fff;
      font-size: var(--font-size-xs);
      font-weight: 600;
      line-height: 1.3;
      text-align: left;
    }
    app-icon {
      margin-top: 1px;
      font-size: 14px;
    }
    /* Phones (~138px tiles at 320): tighter padding and icon so line 1 keeps the count and
       line 2 the start of the deck name (H-095 fix 5). */
    @media (max-width: 39.99rem) {
      .band {
        gap: 2px;
        padding: var(--space-1);
      }
      app-icon {
        font-size: 12px;
      }
    }
    .text {
      display: -webkit-box;
      overflow: hidden;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      overflow-wrap: anywhere;
    }
    @media (forced-colors: active) {
      .band {
        border-top: 1px solid CanvasText;
        background: Canvas;
        color: CanvasText;
      }
    }
  `,
})
export class LockBand {
  /** Σ hold over the card's locked uses. */
  readonly copies = input.required<number>();
  /** Locked deck names holding ≥ 1 copy, lock order. */
  readonly decks = input.required<readonly string[]>();
  protected readonly text = computed(() => lockBandText(this.copies(), this.decks()));
}
