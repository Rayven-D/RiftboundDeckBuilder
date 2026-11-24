import { Component, DOCUMENT, inject, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { Icon } from '../../shared/icon';
import { CardTile } from '../../shared/deck/card-tile';
import { DeckHeading } from '../../shared/deck/deck-heading';
import { sampleCardArt } from '../../shared/deck/sample-art';

type Accent = 'teal' | 'green';

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
  imports: [CardTile, DeckHeading, MatButton, Icon],
  template: `
    <p class="page-eyebrow sample">Component preview · sample data, not real cards</p>
    <div class="accent-switch" role="group" aria-labelledby="accent-label">
      <span id="accent-label" class="accent-label">Accent</span>
      @for (option of accents; track option.value) {
        <button
          type="button"
          class="accent-option"
          [attr.aria-pressed]="accent() === option.value"
          (click)="setAccent(option.value)"
        >
          <span class="swatch" [style.background]="option.swatch"></span>{{ option.label }}
        </button>
      }
    </div>
    <header class="page-header deck-header">
      <app-deck-heading
        name="Kennen: ASC Evansrhim"
        source="1st, Regional Championship: Europe · Nov 6, 2026 – Nov 8, 2026"
      />
      <p class="summary">
        21 of 40 copies available · 9 of 18 cards fully available · Not fully checked
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
  `,
  styles: `
    .sample {
      color: var(--color-text-muted);
    }
    .accent-switch {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
      margin-bottom: var(--space-5);
    }
    .accent-label {
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
    }
    .accent-option {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      min-height: 44px;
      padding: 0 var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: var(--color-text);
      font: inherit;
      cursor: pointer;
    }
    .accent-option[aria-pressed='true'] {
      border-color: var(--color-accent);
      box-shadow: inset 0 0 0 1px var(--color-accent);
      font-weight: 600;
    }
    .swatch {
      width: 1rem;
      height: 1rem;
      border-radius: var(--radius-sm);
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
  /**
   * Accent preview (RJ, 2026-11-24): teal is the default; Green sets html[data-accent="green"] so
   * RJ can compare. Only this page sets the attribute; it lasts until the page is reloaded.
   */
  protected readonly accents: readonly { value: Accent; label: string; swatch: string }[] = [
    { value: 'teal', label: 'Teal', swatch: '#14b8a6' },
    { value: 'green', label: 'Green', swatch: '#22a559' },
  ];
  private readonly root = inject(DOCUMENT).documentElement;
  protected readonly accent = signal<Accent>(
    this.root.getAttribute('data-accent') === 'green' ? 'green' : 'teal',
  );

  protected setAccent(accent: Accent): void {
    this.accent.set(accent);
    if (accent === 'green') this.root.setAttribute('data-accent', 'green');
    else this.root.removeAttribute('data-accent');
  }

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
