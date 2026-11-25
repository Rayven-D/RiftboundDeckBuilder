import { Component, computed, input, output } from '@angular/core';
import type { OwnershipCard } from '../../core/decks';
import { CardArt } from '../deck/card-art';
import { OwnershipChip } from '../deck/ownership-chip';
import { Icon } from '../icon';
import { StatusLabel } from '../status-label';
import { DETAIL_TEXT, banText, cardAccessibleName, cardId, labelParts } from './detail-view';

/**
 * One card in List view (SPEC-005 OWN-114): `<thumbnail> 2× <Card Name>` with the same fill as the Card view tile
 * (OWN-030…036), the count label "2 of 3 available" (with its deck-total part when split, OWN-033), the shared line
 * (SHARE-042) and the ban label (OWN-015). "1×" is shown here (the row has no `×N` badge). At least 44px tall; the
 * same press target and selection as the tile (OWN-038, OWN-111).
 */
@Component({
  selector: 'app-deck-card-row',
  imports: [CardArt, OwnershipChip, StatusLabel, Icon],
  template: `
    <button
      type="button"
      class="row"
      [attr.data-card]="id()"
      [attr.aria-label]="name()"
      [attr.aria-haspopup]="opensDialog() ? 'dialog' : null"
      [attr.aria-current]="selected() ? 'true' : null"
      [class.row--selected]="selected()"
      [tabIndex]="focusable() ? 0 : -1"
      (click)="pressed.emit()"
    >
      <span class="thumb" [class.thumb--dim]="card().state !== 'full'">
        <app-card-art
          [name]="card().name"
          [state]="card().state"
          [fill]="card().fill"
          [imageUrl]="card().imageUrl"
          [landscape]="landscape()"
          decorative
        />
      </span>
      <span class="body">
        <span class="title"
          ><span class="qty">{{ card().required }}× </span><span class="name">{{ card().name }}</span></span
        >
        @if (unknown()) {
          <span class="meta meta--unknown">{{ text.unknownCard }}</span>
        }
        @if (parts(); as p) {
          <span class="meta">
            <app-ownership-chip [state]="card().state" [label]="p.count" />
            @if (p.total) {
              <span class="muted">{{ p.total }}</span>
            }
          </span>
          @if (card().sharedLabel; as shared) {
            <span class="meta muted"><app-icon name="stacks" />{{ shared }}</span>
          }
        }
        @if (ban(); as b) {
          <app-status-label [variant]="b.variant" [text]="b.text" />
        }
        @if (preview()) {
          <span class="flag">Preview</span>
        }
      </span>
    </button>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
      --dur-fill: 180ms;
    }
    .row {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      width: 100%;
      min-height: 44px;
      padding: var(--space-2);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
      transition: border-color var(--dur-fast) var(--ease-out), background-color var(--dur-fast) var(--ease-out);
    }
    .row:hover {
      border-color: var(--color-border-strong);
    }
    .row--selected {
      border-color: var(--color-accent-text);
      box-shadow: inset 0 0 0 2px var(--color-accent-text);
    }
    .thumb {
      flex: none;
      width: 2.75rem;
      border-radius: var(--radius-sm);
    }
    .thumb--dim {
      outline: 1px solid var(--color-border-strong);
    }
    .body {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .title {
      font-size: var(--font-size-sm);
      line-height: 1.3;
      overflow-wrap: anywhere;
    }
    .qty {
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .name {
      font-weight: 600;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-1) var(--space-2);
      font-size: var(--font-size-xs);
    }
    .meta app-icon {
      font-size: 12px;
    }
    .meta--unknown {
      color: var(--color-text);
    }
    .muted {
      color: var(--color-text-muted);
    }
    .flag {
      align-self: flex-start;
      padding: 0 var(--space-1);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-sm);
      font-size: var(--font-size-xs);
    }
    @media (forced-colors: active) {
      .row--selected {
        outline: 2px solid Highlight;
      }
    }
  `,
})
export class DeckCardRow {
  readonly card = input.required<OwnershipCard>();
  readonly selected = input(false);
  readonly opensDialog = input(false);
  readonly focusable = input(false);
  readonly pressed = output<void>();

  protected readonly text = DETAIL_TEXT;
  protected readonly id = computed(() => cardId(this.card()));
  protected readonly name = computed(() => cardAccessibleName(this.card()));
  protected readonly unknown = computed(() => this.card().flags.includes('unknown-card'));
  protected readonly preview = computed(() => this.card().flags.includes('preview'));
  protected readonly landscape = computed(() => (this.card().card?.category === 'battlefield' ? true : null));
  protected readonly parts = computed(() => (this.card().label ? labelParts(this.card().label) : null));
  protected readonly ban = computed(() => {
    const b = this.card().banStatus;
    if (b.status !== 'banned' && b.status !== 'upcoming') return null;
    return { variant: b.status, text: banText(b)! };
  });
}
