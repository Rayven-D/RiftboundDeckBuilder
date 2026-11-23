import { Component } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { Icon } from '../../shared/icon';
import { CardTile } from '../../shared/deck/card-tile';
import { DeckHeading } from '../../shared/deck/deck-heading';

interface SampleCard {
  readonly name: string;
  readonly type: string;
  readonly owned: number;
  readonly required: number;
  readonly color: string;
  readonly ban?: string;
}

/** Plain SVG stand-in art so the preview needs no API data. */
function sampleArt(color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 63 88"><rect width="63" height="88" fill="${color}"/><rect x="8" y="14" width="47" height="38" fill="#fff" fill-opacity=".25"/><rect x="5" y="66" width="53" height="16" fill="#000" fill-opacity=".3"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Component preview (not in the nav): direction A styles and the shared deck components on
 * made-up sample data. Real screens use the same components with catalog data.
 */
@Component({
  selector: 'app-styleguide-page',
  imports: [CardTile, DeckHeading, MatButton, Icon],
  template: `
    <p class="page-eyebrow sample">Component preview · sample data, not real cards</p>
    <header class="page-header deck-header">
      <app-deck-heading
        name="Kennen: ASC Evansrhim"
        source="1st, Regional Championship: Europe · Nov 6, 2026 – Nov 8, 2026"
      />
      <p class="summary">
        21 of 40 copies owned for decks · 9 of 18 cards fully owned · Not fully checked
      </p>
      <div class="actions">
        <button matButton="filled"><app-icon name="content_copy" />Copy missing list</button>
        <button matButton="outlined">Edit</button>
      </div>
    </header>

    <section aria-labelledby="zone-main">
      <h2 id="zone-main" class="zone">Main Deck</h2>
      <div class="tiles">
        @for (card of cards; track card.name) {
          <app-card-tile
            [name]="card.name"
            [type]="card.type"
            zone="Main Deck"
            [owned]="card.owned"
            [required]="card.required"
            [imageUrl]="art(card.color)"
            [banLabel]="card.ban ?? null"
          />
        }
        <app-card-tile
          name="Missing Image Card"
          type="Spell"
          zone="Main Deck"
          [owned]="1"
          [required]="2"
        />
      </div>
    </section>
  `,
  styles: `
    .sample {
      color: var(--color-text-muted);
    }
    .deck-header {
      display: grid;
      gap: var(--space-2);
    }
    .summary {
      margin: 0;
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }
    .zone {
      margin: 0 0 var(--space-3);
      padding-bottom: var(--space-1);
      border-bottom: 1px solid var(--color-border);
      font-size: var(--font-size-md);
    }
    .tiles {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
      gap: var(--space-4) var(--space-3);
    }
  `,
})
export class StyleguidePage {
  protected readonly cards: readonly SampleCard[] = [
    { name: 'Hextech Ray', type: 'Spell', owned: 3, required: 3, color: '#4a6fb5' },
    { name: 'Rally Banner', type: 'Gear', owned: 1, required: 3, color: '#b8563a' },
    { name: 'Storm Caller', type: 'Unit', owned: 2, required: 3, color: '#2f8f6b' },
    { name: 'Void Gate', type: 'Spell', owned: 0, required: 2, color: '#6c4fa3' },
    {
      name: 'Iron Warden',
      type: 'Unit',
      owned: 2,
      required: 2,
      color: '#8a6d2f',
      ban: 'Banned since Nov 23, 2026',
    },
  ];

  protected art(color: string): string {
    return sampleArt(color);
  }
}
