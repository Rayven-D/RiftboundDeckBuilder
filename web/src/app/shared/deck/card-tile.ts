import { Component, computed, input } from '@angular/core';
import { Icon } from '../icon';
import { tileOwnership } from './ownership';
import { OwnershipChip } from './ownership-chip';

/**
 * One deck card tile (SPEC-005 OWN-014..036): image with the ownership treatment, name, type,
 * ownership chip and ban label. Only the image is darkened; app text keeps full contrast.
 */
@Component({
  selector: 'app-card-tile',
  imports: [OwnershipChip, Icon],
  template: `
    <article class="tile" [attr.aria-label]="accessibleName()">
      <div class="art" [class]="'art art--' + ownership().state" [style.--fill]="ownership().fill">
        @if (imageUrl(); as url) {
          <img class="card-image" [src]="url" alt="" loading="lazy" />
          <img class="card-image dimmed" [src]="url" alt="" loading="lazy" aria-hidden="true" />
        } @else {
          <div class="card-image placeholder">{{ name() }}</div>
          <div class="card-image placeholder dimmed" aria-hidden="true">{{ name() }}</div>
        }
      </div>
      <h3 class="name">{{ name() }}</h3>
      @if (type()) {
        <p class="type">{{ type() }}</p>
      }
      <div class="labels">
        <app-ownership-chip [state]="ownership().state" [label]="ownership().label" />
        @if (banLabel(); as ban) {
          <span class="ban"><app-icon name="block" />{{ ban }}</span>
        }
      </div>
    </article>
  `,
  styles: `
    .tile {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      min-width: 0;
    }
    .art {
      position: relative;
    }
    /* The dimmed copy covers the part that is not owned: everything right of the fill edge. */
    .dimmed {
      position: absolute;
      inset: 0;
      filter: grayscale(1) brightness(0.55);
      clip-path: inset(0 0 0 calc(var(--fill) * 100%));
    }
    .art--full .dimmed {
      display: none;
    }
    .art--partial::after {
      content: '';
      position: absolute;
      top: 0;
      bottom: 0;
      left: calc(var(--fill) * 100%);
      width: 1px;
      background: rgb(255 255 255 / 85%);
    }
    .placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-2);
      border: 1px solid var(--color-border);
      background: #3a5f7d;
      color: #fff;
      font-size: var(--font-size-sm);
      text-align: center;
    }
    .name {
      margin: var(--space-1) 0 0;
      font-size: var(--font-size-sm);
      font-weight: 600;
      line-height: 1.3;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .type {
      margin: 0;
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
    }
    .labels {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-1);
    }
    .ban {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      font-size: var(--font-size-xs);
      font-weight: 600;
      color: var(--color-danger);
    }
    .ban app-icon {
      font-size: 14px;
    }
  `,
})
export class CardTile {
  readonly name = input.required<string>();
  readonly type = input<string>();
  readonly zone = input<string>();
  readonly owned = input.required<number>();
  readonly required = input.required<number>();
  readonly imageUrl = input<string | null>(null);
  /** Pre-formatted SPEC-002 ban label, e.g. "Banned since Nov 23, 2026". Never changes colouring. */
  readonly banLabel = input<string | null>(null);

  protected readonly ownership = computed(() => tileOwnership(this.owned(), this.required()));
  protected readonly accessibleName = computed(() =>
    [this.name(), this.zone(), this.ownership().label, this.banLabel()].filter(Boolean).join(', '),
  );
}
