import { Component, computed, input } from '@angular/core';
import { Icon } from '../icon';
import { CardArt } from './card-art';
import { tileOwnership } from './ownership';
import { OwnershipChip } from './ownership-chip';

/**
 * One deck card tile (SPEC-005 OWN-014..036): image with the ownership treatment, name, type,
 * ownership chip and ban label. Only the image is darkened; app text keeps full contrast.
 */
@Component({
  selector: 'app-card-tile',
  imports: [CardArt, OwnershipChip, Icon],
  template: `
    <article class="tile" [attr.aria-label]="accessibleName()">
      <app-card-art
        [name]="name()"
        [state]="ownership().state"
        [fill]="ownership().fill"
        [imageUrl]="imageUrl()"
        decorative
      />
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
