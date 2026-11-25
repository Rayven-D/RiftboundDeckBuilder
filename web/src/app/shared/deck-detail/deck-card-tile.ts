import { Component, computed, input, output } from '@angular/core';
import type { OwnershipCard } from '../../core/decks';
import { CountBadge } from '../collection/count-badge';
import { CardArt } from '../deck/card-art';
import { OwnershipChip } from '../deck/ownership-chip';
import { Icon } from '../icon';
import { StatusLabel } from '../status-label';
import { DETAIL_TEXT, banText, cardAccessibleName, cardId, labelParts } from './detail-view';

/**
 * One card of a deck section in Card view (SPEC-005 OWN-115; Decks Components §9 `app-deck-card-tile`): art with the
 * ownership fill (OWN-030…036), `×N` from 2 (OWN-040), name, type, the count chip and its deck-total line (OWN-033),
 * the shared line (SHARE-042), the ban label (OWN-015) and the Preview flag (OWN-017). The whole tile is one button
 * (OWN-038) that selects the card in the panel (desktop) or opens the card dialog (below 64rem).
 */
@Component({
  selector: 'app-deck-card-tile',
  imports: [CardArt, CountBadge, OwnershipChip, StatusLabel, Icon],
  template: `
    <button
      type="button"
      class="tile lift"
      [attr.data-card]="id()"
      [attr.aria-label]="name()"
      [attr.aria-haspopup]="opensDialog() ? 'dialog' : null"
      [attr.aria-current]="selected() ? 'true' : null"
      [class.tile--selected]="selected()"
      [tabIndex]="focusable() ? 0 : -1"
      (click)="pressed.emit()"
    >
      <div class="frame" [class.frame--dim]="card().state !== 'full'">
        <app-card-art
          [name]="card().name"
          [state]="card().state"
          [fill]="card().fill"
          [imageUrl]="card().imageUrl"
          [landscape]="landscape()"
          animateChange
          [eager]="eager()"
          decorative
        />
        <app-count-badge [count]="card().required" />
      </div>
      <span class="name" [attr.title]="card().name">{{ card().name }}</span>
      @if (unknown()) {
        <span class="type type--unknown">{{ text.unknownCard }}</span>
      } @else if (card().card?.type; as type) {
        <span class="type">{{ type }}</span>
      }
      @if (parts(); as p) {
        <span class="labels"><app-ownership-chip [state]="card().state" [label]="p.count" /></span>
        @if (p.total) {
          <span class="split">{{ p.total }}</span>
        }
        @if (card().sharedLabel; as shared) {
          <span class="shared"><app-icon name="stacks" />{{ shared }}</span>
        }
      }
      @if (ban(); as b) {
        <app-status-label [variant]="b.variant" [text]="b.text" />
      }
      @if (preview()) {
        <span class="flag">Preview</span>
      }
    </button>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .tile {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-1);
      width: 100%;
      padding: 0 0 var(--space-1);
      border: 0;
      border-radius: var(--radius-md);
      background: none;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    .tile:focus-visible {
      outline-offset: 4px;
    }
    .frame {
      position: relative;
      width: 100%;
      margin-bottom: var(--space-1);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-rest);
    }
    /* Decks Components §0: a darkened or partial card keeps its edge on the dark page. */
    .frame--dim {
      outline: 1px solid var(--color-border-strong);
    }
    /* OWN-111 (b): the selected card is marked by a visible outline (plus aria-current). */
    .tile--selected .frame {
      outline: 3px solid var(--color-accent-text);
      outline-offset: 2px;
    }
    .name {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      overflow: hidden;
      font-size: var(--font-size-sm);
      font-weight: 600;
      line-height: 1.3;
    }
    .type {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
    }
    .type--unknown {
      color: var(--color-text);
    }
    .labels {
      display: flex;
      max-width: 100%;
    }
    .labels app-ownership-chip {
      white-space: normal;
    }
    .split,
    .shared {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
    }
    .shared {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
    }
    .shared app-icon {
      font-size: 12px;
    }
    .flag {
      padding: 0 var(--space-1);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-sm);
      font-size: var(--font-size-xs);
    }
    @media (forced-colors: active) {
      .tile--selected .frame {
        outline-color: Highlight;
      }
    }
  `,
})
export class DeckCardTile {
  readonly card = input.required<OwnershipCard>();
  /** OWN-111 (b): this card is the one the panel shows (desktop only). */
  readonly selected = input(false);
  /** Below 64rem the press opens the card dialog (`aria-haspopup="dialog"`, OWN-038). */
  readonly opensDialog = input(false);
  /** Roving tabindex: one Tab stop per section (OWN-038). */
  readonly focusable = input(false);
  readonly eager = input(false);
  readonly pressed = output<void>();

  protected readonly text = DETAIL_TEXT;
  protected readonly id = computed(() => cardId(this.card()));
  protected readonly name = computed(() => cardAccessibleName(this.card()));
  protected readonly unknown = computed(() => this.card().flags.includes('unknown-card'));
  protected readonly preview = computed(() => this.card().flags.includes('preview'));
  protected readonly landscape = computed(() => (this.card().card?.category === 'battlefield' ? true : null));
  /** OWN-115: no chip, split or shared line while ownership is unavailable (label ''). */
  protected readonly parts = computed(() => (this.card().label ? labelParts(this.card().label) : null));
  /** OWN-015 (v0.9): unknown ban status has no label on the face; the page notice covers it. */
  protected readonly ban = computed(() => {
    const b = this.card().banStatus;
    if (b.status !== 'banned' && b.status !== 'upcoming') return null;
    return { variant: b.status, text: banText(b)! };
  });
}
