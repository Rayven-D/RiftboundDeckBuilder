import { Component, Injectable, computed, inject, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import type { DeckLock, OwnershipCard } from '../../core/decks';
import { DeckCardContent } from '../../shared/deck-detail/deck-card-content';
import {
  DECK_CARD_DIALOG_TITLE_ID,
  DeckCardDialog,
  DeckCardDialogData,
} from '../../shared/deck-detail/deck-card-dialog';
import { DeckCardRow } from '../../shared/deck-detail/deck-card-row';
import { DeckCardTile } from '../../shared/deck-detail/deck-card-tile';
import { DeckMissing } from '../../shared/deck-detail/deck-missing';
import { findCard, fullArtUrl, neighbourId } from '../../shared/deck-detail/detail-view';
import { otherDecksLine } from '../../shared/deck/deck-locks';
import { DeckLocks } from '../../shared/deck/deck-locks.service';
import { DeckStatusChip } from '../../shared/deck/deck-status-chip';
import { DeckTile } from '../../shared/deck/deck-tile';
import { LockActions } from '../../shared/deck/lock-actions';
import { LockBadge } from '../../shared/deck/lock-badge';
import { LockInDialog, LockInDialogData } from '../../shared/deck/lock-in-dialog';
import { styleguideDecks } from './deck-samples';

/**
 * Preview lock store: Lock in / Unlock only flip an in-memory set, so the buttons can be tried on /styleguide
 * without writing the browser's locks (H-391).
 */
@Injectable()
export class PreviewLocks {
  readonly locked = signal<ReadonlySet<string>>(new Set());
  readonly changed = new Subject<void>();
  now = () => new Date().toISOString();

  async load(): Promise<readonly DeckLock[]> {
    return [...this.locked()].map((deckId) => ({ deckId, lockedAt: this.now() }));
  }
  async lockIn(deckId: string): Promise<void> {
    this.locked.update((s) => new Set(s).add(deckId));
    this.changed.next();
  }
  async unlock(deckId: string): Promise<void> {
    this.locked.update((s) => {
      const next = new Set(s);
      next.delete(deckId);
      return next;
    });
    this.changed.next();
  }
}

/** Which deck cards the tile and row previews show, with the state each one stands for. */
const CARD_STATES: readonly { id: string; label: string }[] = [
  { id: 'main:hextech ray', label: 'Full' },
  { id: 'main:rally banner', label: 'Partial 1 of 3, shared + locked' },
  { id: 'main:void gate', label: 'None, split (Main + Sideboard)' },
  { id: 'main:storm caller', label: 'Split, shared' },
  { id: 'main:iron warden', label: 'Banned' },
  { id: 'main:ember spark', label: 'Upcoming ban' },
  { id: 'main:mist walker', label: 'Preview' },
  { id: 'main:glass lantern', label: 'No image (placeholder)' },
  { id: 'main:lost relic', label: 'Unknown card' },
  { id: 'battlefields:sunken market', label: 'Battlefield' },
  { id: 'runes:calm rune', label: 'Rune ×6' },
];

/**
 * The Decks list (H-060) and Deck detail (H-254) pieces on sample data ([[Decks Components]] §16): deck tiles,
 * status chips, lock badges, lock actions + Lock in dialog, card tiles, list rows and the desktop panel. Sample data
 * goes through the real engine; nothing is read from or written to the browser's stores.
 */
@Component({
  selector: 'app-styleguide-decks',
  imports: [
    DeckTile,
    DeckStatusChip,
    LockBadge,
    LockActions,
    DeckCardTile,
    DeckCardRow,
    DeckCardContent,
    DeckMissing,
    MatButton,
  ],
  providers: [PreviewLocks, { provide: DeckLocks, useExisting: PreviewLocks }],
  template: `
    <section class="decks-preview" aria-labelledby="sg-decks">
      <h2 id="sg-decks" class="zone">Decks (H-060, H-254)</h2>

      <h3 class="sub">Deck tiles</h3>
      <ul class="deck-tiles" role="list" aria-label="Sample deck tiles">
        @for (t of s.tiles; track t.label) {
          <li>
            <p class="caption">{{ t.label }}</p>
            <app-deck-tile [summary]="t.summary" />
          </li>
        }
      </ul>

      <h3 class="sub">Deck status chip</h3>
      <div class="row-items">
        <app-deck-status-chip filter="ready" />
        <app-deck-status-chip filter="partial" />
        <app-deck-status-chip filter="none" />
        <app-deck-status-chip filter="locked" lockBadge="Locked" />
        <app-deck-status-chip filter="partial" lockBadge="Locked · 2 cards short" />
        <app-deck-status-chip filter="unavailable" lockBadge="Locked" />
        <span class="caption">(unavailable, unlocked: no chip)</span>
        <app-deck-status-chip filter="unavailable" />
      </div>

      <h3 class="sub">Lock badge</h3>
      <div class="column-items">
        <app-lock-badge [lock]="s.lockedView.lock" label="Locked" />
        <app-lock-badge [lock]="s.lockedView.lock" label="Locked · 2 cards short" />
        <app-lock-badge label="Locked" [showDate]="false" />
        <span><span class="caption">Tile size: </span><app-lock-badge class="tile-size" label="Locked · 1 card short" [showDate]="false" /></span>
      </div>

      <h3 class="sub">Lock actions</h3>
      <dl class="button-rows">
        <dt>Complete deck (try it; preview only, nothing saved)</dt>
        <dd><app-lock-actions [deck]="s.readyDeck" [view]="readyView()" [pool]="s.pool" /></dd>
        <dt>Cards missing: disabled with reason</dt>
        <dd><app-lock-actions [deck]="s.deck" [view]="s.view" [pool]="s.pool" /></dd>
        <dt>Locked deck: Unlock</dt>
        <dd><app-lock-actions [deck]="s.deck" [view]="s.lockedView" [pool]="s.pool" /></dd>
        <dt>Locks unreadable: disabled with reason</dt>
        <dd><app-lock-actions [deck]="s.deck" [view]="s.lockedView" [pool]="s.pool" [locksUnreadable]="true" /></dd>
      </dl>
      <div class="actions">
        <button matButton="outlined" type="button" (click)="openLockIn(true)">Lock in dialog, other decks</button>
        <button matButton="outlined" type="button" (click)="openLockIn(false)">Lock in dialog, no other decks</button>
      </div>

      <h3 class="sub">Deck detail: card tiles</h3>
      <ul class="card-grid" role="list" aria-label="Sample deck card tiles">
        @for (c of cards(); track c.id) {
          <li>
            <app-deck-card-tile
              [card]="c.card"
              [selected]="selectedId() === c.id"
              [focusable]="true"
              (pressed)="selectedId.set(c.id)"
            />
            <p class="caption">{{ c.label }}</p>
          </li>
        }
        <li>
          <app-deck-card-tile [card]="unavailableCard()!" [focusable]="true" />
          <p class="caption">Ownership unavailable</p>
        </li>
      </ul>

      <h3 class="sub">Deck detail: list rows</h3>
      <ul class="card-rows" role="list" aria-label="Sample deck list rows">
        @for (c of cards(); track c.id) {
          <li>
            <app-deck-card-row
              [card]="c.card"
              [selected]="selectedId() === c.id"
              [focusable]="true"
              (pressed)="selectedId.set(c.id)"
            />
          </li>
        }
      </ul>

      <h3 class="sub">Deck detail: right panel (pick a tile or row above)</h3>
      <div class="panel-row">
        <aside class="panel" aria-label="Sample card and missing cards">
          <div class="tabs" role="tablist" aria-label="Sample deck panel">
            <button type="button" role="tab" id="sg-tab-card" aria-controls="sg-tabpanel" [attr.aria-selected]="tab() === 'card'" (click)="tab.set('card')">
              Card
            </button>
            <button type="button" role="tab" id="sg-tab-missing" aria-controls="sg-tabpanel" [attr.aria-selected]="tab() === 'missing'" (click)="tab.set('missing')">
              Missing
            </button>
          </div>
          <div class="tabpanel" id="sg-tabpanel" role="tabpanel" tabindex="0" [attr.aria-labelledby]="'sg-tab-' + tab()">
            @if (tab() === 'card') {
              @if (selected(); as c) {
                <app-deck-card-content [card]="c" [fullUrl]="fullUrl(c)" />
              }
            } @else {
              <app-deck-missing [view]="s.view" (copyRequested)="copied.set($event)" />
            }
          </div>
        </aside>
        <div class="panel-side">
          <p class="caption">Missing list below 64rem (collapsed past 10 lines, no counts):</p>
          <app-deck-missing [view]="s.view" [showCounts]="false" [collapsible]="true" (copyRequested)="copied.set($event)" />
          <p class="caption">Ownership unavailable:</p>
          <app-deck-missing [view]="s.unavailableView" />
          @if (copied(); as mode) {
            <p class="caption" role="status">Preview: copy requested ({{ mode }}); nothing copied.</p>
          }
          <div class="actions">
            <button matButton="outlined" type="button" (click)="openCard()">Card dialog (below 64rem)</button>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: `
    .decks-preview {
      margin-top: var(--space-7);
    }
    .zone {
      margin: 0 0 var(--space-3);
      padding-bottom: var(--space-1);
      border-bottom: 1px solid var(--color-border);
      font-size: var(--font-size-md);
    }
    .sub {
      margin: var(--space-5) 0 var(--space-2);
      font-family: var(--font-sans);
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
    }
    .caption {
      margin: 0 0 var(--space-1);
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
    }
    ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .deck-tiles {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(var(--deck-tile-min), 100%), 1fr));
      gap: var(--space-4);
    }
    .deck-tiles li {
      display: flex;
      flex-direction: column;
    }
    .deck-tiles app-deck-tile {
      flex: 1;
    }
    .row-items,
    .actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2) var(--space-3);
    }
    .actions {
      margin-top: var(--space-3);
    }
    .column-items {
      display: grid;
      justify-items: start;
      gap: var(--space-2);
    }
    .tile-size {
      --lock-badge-font-size: var(--font-size-xs);
      --lock-badge-icon-size: 14px;
    }
    .button-rows {
      display: grid;
      grid-template-columns: max-content 1fr;
      align-items: start;
      gap: var(--space-3) var(--space-4);
      margin: 0;
    }
    .button-rows dt {
      padding-top: var(--space-3);
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
    }
    .button-rows dd {
      margin: 0;
    }
    .card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(var(--tile-min), 1fr));
      gap: var(--space-4);
    }
    .card-grid li,
    .card-rows li {
      min-width: 0;
    }
    .card-grid .caption {
      margin-top: var(--space-1);
    }
    .card-rows {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
      gap: var(--space-2);
    }
    .panel-row {
      display: grid;
      grid-template-columns: 20rem minmax(0, 1fr);
      gap: var(--space-6);
      align-items: start;
    }
    .panel {
      display: flex;
      flex-direction: column;
      max-height: 40rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
    }
    .tabs {
      display: flex;
      flex: none;
      border-bottom: 1px solid var(--color-border);
    }
    .tabs button {
      flex: 1;
      min-height: 44px;
      border: 0;
      border-bottom: 2px solid transparent;
      background: none;
      color: var(--color-text-muted);
      font: inherit;
      font-size: var(--font-size-sm);
      font-weight: 600;
      cursor: pointer;
    }
    .tabs button:hover {
      color: var(--color-text);
    }
    .tabs button[aria-selected='true'] {
      border-bottom-color: var(--color-accent-text);
      color: var(--color-accent-text);
    }
    .tabs button:focus-visible,
    .tabpanel:focus-visible {
      outline-offset: -2px;
    }
    .tabpanel {
      flex: 1 1 auto;
      min-height: 0;
      overflow: auto;
      padding: var(--space-4);
    }
    .panel-side {
      display: grid;
      gap: var(--space-3);
      align-content: start;
    }
    @media (max-width: 40rem) {
      .button-rows,
      .panel-row {
        grid-template-columns: minmax(0, 1fr);
      }
      .button-rows dt {
        padding-top: 0;
      }
      .card-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--space-3);
      }
      .card-rows {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class StyleguideDecks {
  protected readonly s = styleguideDecks();
  private readonly locks = inject(PreviewLocks);
  private readonly dialog = inject(MatDialog);

  protected readonly readyView = computed(() =>
    this.locks.locked().has(this.s.readyDeck.id) ? this.s.readyLockedView : this.s.readyView,
  );
  protected readonly cards = computed(() =>
    CARD_STATES.flatMap(({ id, label }) => {
      const card = findCard(this.s.view, id);
      return card ? [{ id, label, card }] : [];
    }),
  );
  protected readonly unavailableCard = computed(() => findCard(this.s.unavailableView, 'main:hextech ray'));
  protected readonly selectedId = signal('main:rally banner');
  protected readonly selected = computed(() => findCard(this.s.view, this.selectedId()));
  protected readonly tab = signal<'card' | 'missing'>('card');
  protected readonly copied = signal<string | null>(null);

  protected fullUrl(card: OwnershipCard): string | null {
    return fullArtUrl(card, this.s.catalog);
  }

  protected openLockIn(others: boolean): void {
    this.dialog.open<LockInDialog, LockInDialogData, boolean>(LockInDialog, {
      data: { deckName: this.s.deck.name, others: others ? otherDecksLine(this.s.view) : null },
      width: 'min(28rem, calc(100vw - 2 * var(--content-gutter)))',
      maxWidth: '100vw',
      autoFocus: '.confirm',
    });
  }

  protected openCard(): void {
    const view = this.s.view;
    const data: DeckCardDialogData = {
      cardId: this.selectedId(),
      card: (id) => findCard(view, id),
      fullUrl: (c) => this.fullUrl(c),
      neighbour: (id, step) => neighbourId(view, id, step),
      locked: () => false,
      ownershipAvailable: () => true,
    };
    this.dialog.open(DeckCardDialog, {
      data,
      ariaLabelledBy: DECK_CARD_DIALOG_TITLE_ID,
      autoFocus: '.close-button',
      panelClass: 'card-dialog-panel',
      width: 'min(44rem, calc(100vw - 2 * var(--content-gutter)))',
      maxWidth: '100vw',
      maxHeight: 'min(90svh, 52rem)',
    });
  }
}
