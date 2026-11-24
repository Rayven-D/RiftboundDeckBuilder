import { Component, computed, input, output } from '@angular/core';
import { CardArt } from '../deck/card-art';
import {
  CollectionTile as TileModel,
  CardSummary,
  landscapeFor,
  tileAccessibleName,
} from './collection-view';
import { CountBadge } from './count-badge';
import { LockBand } from './lock-band';

/**
 * One Collection tile = one entry (brief §4; Collection Components §5): image only, always full
 * color, `×N` badge for this printing, card-level lock band. The host is the list item; the
 * button inside carries the accessible name and opens the card dialog.
 */
@Component({
  selector: 'app-collection-tile',
  imports: [CardArt, CountBadge, LockBand],
  host: {
    role: 'listitem',
    '[attr.aria-setsize]': 'setSize()',
    '[attr.aria-posinset]': 'posInSet()',
  },
  template: `
    <button
      type="button"
      class="tile lift"
      [class.tile--stand-in]="tile().standIn"
      [attr.aria-label]="label()"
      [attr.data-entry]="tile().entryId"
      [tabIndex]="focusable() ? 0 : -1"
      (click)="open.emit()"
    >
      <div class="frame">
        <app-card-art
          [name]="tile().name"
          state="full"
          [fill]="1"
          [imageUrl]="tile().thumbnailUrl"
          [landscape]="landscape()"
          [eager]="eager()"
          decorative
        />
        <app-count-badge [count]="tile().count" />
        <app-lock-band [copies]="card()?.lockedCopies ?? 0" [decks]="deckNames()" />
      </div>
    </button>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .tile {
      display: block;
      width: 100%;
      padding: 0;
      border: 0;
      border-radius: var(--radius-md);
      background: none;
      box-shadow: var(--shadow-rest);
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    .tile:active {
      transform: translateY(1px) scale(0.98);
    }
    .tile--stand-in:focus-visible {
      outline-offset: 4px;
    }
    .frame {
      position: relative;
      border-radius: var(--radius-md);
    }
    .tile--stand-in .frame {
      outline: 1px dashed var(--color-border-strong);
      outline-offset: 2px;
    }
  `,
})
export class CollectionTile {
  readonly tile = input.required<TileModel>();
  readonly card = input<CardSummary | undefined>();
  readonly setSize = input<number | null>(null);
  readonly posInSet = input<number | null>(null);
  /** Roving tabindex: true for the grid's one Tab stop. */
  readonly focusable = input(true);
  /** First row: load the image eagerly (LCP, NG0913). */
  readonly eager = input(false);
  readonly open = output<void>();

  protected readonly label = computed(() => tileAccessibleName(this.tile(), this.card()));
  protected readonly landscape = computed(() => landscapeFor(this.card()?.card.category));
  protected readonly deckNames = computed(() => this.card()?.locked.map((u) => u.deckName) ?? []);
}
