import { booleanAttribute, Component, input } from '@angular/core';
import { DeckMark } from '../../shared/deck-mark';
import { CardArt } from '../../shared/deck/card-art';
import { tileOwnership } from '../../shared/deck/ownership';
import { OwnershipChip } from '../../shared/deck/ownership-chip';
import { sampleCardArt } from '../../shared/deck/sample-art';
import type { FanCard } from './home-page';

/**
 * Home page hero visual: three fanned placeholder cards showing the ownership states, with the
 * deck-stack mark faded behind. Swap in real card art once the Riot API data is loaded.
 *
 * With `deal` set (first home visit, RJ 2026-11-24) the cards are dealt once from a stacked pile
 * into the fan, then the 1-of-3 card fills to a third and the 3-of-3 card fills fully, then the
 * chips appear. CSS only: the resting style is the end state, and reduced motion skips it.
 */
@Component({
  selector: 'app-ownership-fan',
  imports: [CardArt, OwnershipChip, DeckMark],
  host: {
    role: 'img',
    'aria-label':
      'Three cards showing ownership: one missing, one with 1 of 3 copies available, one fully available',
    '[class.fan--deal]': 'deal()',
  },
  template: `
    <app-deck-mark class="hero-mark" />
    <div class="fan">
      @for (card of cards; track card.name; let i = $index) {
        <div [class]="'fan-card fan-card--' + i">
          <app-card-art
            class="fan-art"
            [name]="card.name"
            [state]="own(card).state"
            [fill]="own(card).fill"
            [imageUrl]="art(card, i)"
            [animateFill]="deal()"
            decorative
          />
          <app-ownership-chip
            class="fan-chip"
            [state]="own(card).state"
            [label]="own(card).label"
          />
        </div>
      }
    </div>
  `,
  styleUrl: './ownership-fan.scss',
})
export class OwnershipFan {
  /** Play the one-time deal-in and ownership fill. */
  readonly deal = input(false, { transform: booleanAttribute });

  /** Back to front: missing, partly owned (1 of 3), fully owned. */
  protected readonly cards: readonly FanCard[] = [
    { name: 'Missing card', owned: 0, required: 2, color: '#6c4fa3' },
    { name: 'Partly owned card', owned: 1, required: 3, color: '#b8563a' },
    { name: 'Owned card', owned: 3, required: 3, color: '#3f6fb8' },
  ];

  protected own(card: FanCard) {
    return tileOwnership(card.owned, card.required);
  }

  protected art(card: FanCard, i: number): string {
    return sampleCardArt(card.color, i);
  }
}
