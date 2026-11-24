import { Component } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { Icon } from '../../shared/icon';
import { CardTile } from '../../shared/deck/card-tile';
import { DeckHeading } from '../../shared/deck/deck-heading';
import { sampleCardArt } from '../../shared/deck/sample-art';
import { TopEightPanel } from '../home/top-eight-panel';

interface SampleCard {
  readonly name: string;
  readonly type: string;
  readonly owned: number;
  readonly required: number;
  readonly color: string;
  readonly ban?: string;
}

/**
 * Component preview (not in the nav): direction A styles and the shared deck components on
 * made-up sample data. Real screens use the same components with catalog data.
 */
@Component({
  selector: 'app-styleguide-page',
  imports: [CardTile, DeckHeading, MatButton, Icon, TopEightPanel],
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
        <button matButton="filled">
          <app-icon matButtonIcon name="content_copy" />Copy missing list
        </button>
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

    <section class="options" aria-labelledby="top8-options">
      <h2 id="top8-options" class="zone">Winning decks panel: options</h2>
      @for (o of top8Options; track o.variant) {
        <figure class="option">
          <figcaption class="option-bar">{{ o.label }}</figcaption>
          <app-top-eight-panel [variant]="o.variant" />
        </figure>
      }
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
    .options {
      margin-top: var(--space-7);
    }
    .option {
      max-width: 40rem;
      margin: 0 0 var(--space-5);
      overflow: hidden;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
    }
    .option-bar {
      padding: var(--space-2) var(--space-3);
      border-bottom: 1px solid var(--color-border);
      font-size: var(--font-size-sm);
      font-weight: 600;
    }
    .tiles {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
      gap: var(--space-4) var(--space-3);
    }
  `,
})
export class StyleguidePage {
  protected readonly top8Options = [
    { variant: 'list', label: 'Option A · Rows with a small Legend card' },
    { variant: 'grid', label: 'Option B · Grid of Legend cards' },
    { variant: 'strip', label: 'Option C · Swipe through Legend cards' },
  ] as const;

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
    return sampleCardArt(color, color.length + color.charCodeAt(2));
  }
}
