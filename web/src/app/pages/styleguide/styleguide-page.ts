import { Component, DOCUMENT, inject, isDevMode, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import {
  CardData,
  DEV_LARGE_ENTRIES,
  DEV_SAMPLE_DECKS_KEY,
  DEV_SAMPLE_KEY,
} from '../../core/cards/card-data';
import { AppStores } from '../../core/storage/app-stores';
import { STORAGE_KEYS } from '../../core/storage/local-stores';
import { CARD_DIALOG_TITLE_ID, CardDialog, CardDialogData } from '../../shared/collection/card-dialog';
import { CollectionTile } from '../../shared/collection/collection-tile';
import { cardDetail } from '../../shared/collection/collection-view';
import { CountBadge } from '../../shared/collection/count-badge';
import { LockBand } from '../../shared/collection/lock-band';
import { generateLargeSample, sampleOverCatalog, SampleData } from '../../shared/collection/sample-data';
import { CardArt } from '../../shared/deck/card-art';
import { StatusLabel } from '../../shared/status-label';
import { styleguideCollection } from './collection-samples';
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
  imports: [CardTile, DeckHeading, MatButton, Icon, CardArt, CountBadge, LockBand, StatusLabel, CollectionTile],
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

    <section class="collection-preview" aria-labelledby="sg-collection">
      <h2 id="sg-collection" class="zone">Collection (H-086)</h2>

      <h3 class="sub">Count badge</h3>
      <div class="frames">
        @for (n of badgeCounts; track n) {
          <div class="frame">
            <app-card-art name="Badge sample" state="full" [fill]="1" [imageUrl]="art('#4a6fb5')" decorative />
            <app-count-badge [count]="n" [announce]="true" />
          </div>
        }
      </div>

      <h3 class="sub">Lock band</h3>
      <div class="frames">
        @for (b of bands; track b.color) {
          <div class="frame">
            <app-card-art name="Band sample" state="full" [fill]="1" [imageUrl]="art(b.color)" decorative />
            <app-lock-band [copies]="b.copies" [decks]="b.decks" />
          </div>
        }
      </div>

      <h3 class="sub">Status labels</h3>
      <div class="labels">
        <app-status-label variant="banned" text="Banned since Nov 23, 2026" />
        <app-status-label variant="upcoming" text="Banned from Dec 15, 2026" />
        <app-status-label variant="unknown" text="Ban status unknown" />
      </div>

      <h3 class="sub">Tiles: printing, Showcase, unassigned, missing, no image, rune ×999</h3>
      <div class="tiles" role="list" aria-label="Sample tiles">
        @for (tile of sample.tiles; track tile.entryId) {
          <app-collection-tile
            [tile]="tile"
            [card]="sample.cards.get(tile.cardKey)"
            (open)="openDialog(tile.entryId)"
          />
        }
      </div>

      <h3 class="sub">Card dialog</h3>
      <div class="actions">
        <button matButton="outlined" (click)="openDialog('p:SGP-007a')">Several printings, locked + short</button>
        <button matButton="outlined" (click)="openDialog('p:SGP-012')">Banned, no image, two decks</button>
        <button matButton="outlined" (click)="openDialog('p:SGP-031')">No decks</button>
        <button matButton="outlined" (click)="openDialog('p:SGP-040')">Rune, locked in + could fit</button>
      </div>

      @if (devMode) {
        <h3 class="sub">Sample collection (dev builds only)</h3>
        <p class="sample">
          Replaces this browser's collection, decks and locks with invented sample data, so the
          Collection page has something to show. The fixture sample needs the services API
          (<code>npm run ingest:fixture</code>, then <code>npm run dev</code> in services/).
        </p>
        <div class="actions">
          <button matButton="outlined" (click)="loadFixtureSample()">Load fixture sample</button>
          <button matButton="outlined" (click)="loadLargeSample()">
            Load {{ largeEntriesText }} generated entries
          </button>
          <button matButton="outlined" (click)="clearSample()">Clear sample data</button>
        </div>
        @if (sampleStatus(); as status) {
          <p class="sample" role="status">{{ status }}</p>
        }
      }
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
    .collection-preview {
      margin-top: var(--space-7);
    }
    .sub {
      margin: var(--space-5) 0 var(--space-2);
      font-family: var(--font-sans);
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
    }
    .frames,
    .labels {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-4);
    }
    .frame {
      position: relative;
      width: 9.5rem;
      border-radius: var(--radius-md);
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

  // ---- Collection preview (H-086, Collection Components §10)
  protected readonly badgeCounts = [2, 12, 999];
  protected readonly bands = [
    { color: '#f4f1e8', copies: 2, decks: ['Jinx Aggro'] },
    { color: '#2f8f6b', copies: 1, decks: ['Kennen Tempo with a very long locked deck name'] },
    { color: '#b8563a', copies: 3, decks: ['Jinx Aggro', 'Kennen Tempo'] },
  ];
  protected readonly sample = styleguideCollection();
  protected readonly devMode = isDevMode();
  protected readonly largeEntriesText = DEV_LARGE_ENTRIES.toLocaleString('en-US');
  protected readonly sampleStatus = signal<string | null>(null);
  private readonly dialog = inject(MatDialog);
  private readonly stores = inject(AppStores).stores;
  private readonly cardData = inject(CardData);

  protected openDialog(entryId: string): void {
    const data: CardDialogData = {
      entryId,
      detail: (id) => cardDetail(this.sample, id),
      neighbour: (id, step) => {
        const i = this.sample.tiles.findIndex((t) => t.entryId === id);
        return this.sample.tiles[i + step]?.entryId ?? null;
      },
      stepping: true,
    };
    this.dialog.open(CardDialog, {
      data,
      ariaLabelledBy: CARD_DIALOG_TITLE_ID,
      autoFocus: '.close-button',
      panelClass: 'card-dialog-panel',
      width: 'min(56rem, calc(100vw - 2 * var(--content-gutter)))',
      maxWidth: '100vw',
      maxHeight: 'min(90svh, 52rem)',
    });
  }

  /** Dev only: writes invented sample data through the raw stores (sync never stamps it). */
  private async writeSample(s: Omit<SampleData, 'catalog'>): Promise<void> {
    await this.stores.raw.collection.save(s.collection);
    await this.stores.printingCodes.save(s.printingCodes);
    for (const d of await this.stores.raw.decks.list()) await this.stores.raw.decks.delete(d.id);
    for (const d of s.decks) await this.stores.raw.decks.put(d);
    localStorage.setItem(DEV_SAMPLE_DECKS_KEY, JSON.stringify(s.decks.map((d) => d.id)));
    await this.stores.raw.locks.save({ schemaVersion: 1, updatedAt: new Date().toISOString(), locks: s.locks });
  }

  private confirmReplace(): boolean {
    return confirm("Replace this browser's collection, decks and locks with sample data?");
  }

  protected async loadFixtureSample(): Promise<void> {
    if (!this.confirmReplace()) return;
    localStorage.removeItem(DEV_SAMPLE_KEY);
    const result = await this.cardData.reload();
    if (result.status === 'error') {
      this.sampleStatus.set('Card data did not load. Start the services API with the fixture first.');
      return;
    }
    await this.writeSample(sampleOverCatalog(result.catalog));
    this.sampleStatus.set('Fixture sample loaded. Open Collection.');
  }

  protected async loadLargeSample(): Promise<void> {
    if (!this.confirmReplace()) return;
    localStorage.setItem(DEV_SAMPLE_KEY, 'large');
    await this.cardData.reload();
    await this.writeSample(generateLargeSample(DEV_LARGE_ENTRIES));
    this.sampleStatus.set(`${this.largeEntriesText} generated entries loaded. Open Collection.`);
  }

  /** Deck ids the last sample load wrote (none if it predates the record or it is unreadable). */
  private sampleDeckIds(): string[] {
    try {
      const ids: unknown = JSON.parse(localStorage.getItem(DEV_SAMPLE_DECKS_KEY) ?? '[]');
      return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
    } catch {
      return [];
    }
  }

  /**
   * Dev only. The collection, locks and printing codes are whole records, so they go entirely;
   * of the decks only those the sample wrote are deleted (H-086 review 1).
   */
  protected async clearSample(): Promise<void> {
    if (
      !confirm(
        "Clear this browser's collection and locks, and the sample's decks? This can't be undone. Decks you added yourself are kept.",
      )
    )
      return;
    localStorage.removeItem(DEV_SAMPLE_KEY);
    for (const key of [STORAGE_KEYS.collection, STORAGE_KEYS.locks, STORAGE_KEYS.printingCodes]) {
      localStorage.removeItem(key);
    }
    for (const id of this.sampleDeckIds()) await this.stores.raw.decks.delete(id);
    localStorage.removeItem(DEV_SAMPLE_DECKS_KEY);
    await this.cardData.reload();
    this.sampleStatus.set('Sample data cleared.');
  }

  protected art(color: string): string {
    return sampleCardArt(color, color.length + color.charCodeAt(2));
  }
}
