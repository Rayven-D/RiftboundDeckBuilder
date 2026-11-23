import { Component } from '@angular/core';
import { CardArt } from '../../shared/deck/card-art';
import { tileOwnership } from '../../shared/deck/ownership';
import { OwnershipChip } from '../../shared/deck/ownership-chip';
import { sampleCardArt } from '../../shared/deck/sample-art';
import type { FanCard } from './home-page';

/**
 * Home page hero visual: three fanned placeholder cards showing the ownership states, with the
 * deck-stack mark faded behind. Swap in real card art once the Riot API data is loaded.
 */
@Component({
  selector: 'app-ownership-fan',
  imports: [CardArt, OwnershipChip],
  host: {
    role: 'img',
    'aria-label':
      'Three cards showing ownership: one missing, one with 1 of 3 copies owned, one fully owned',
  },
  template: `
    <svg class="hero-mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect x="12.5" y="1.5" width="17" height="22" rx="1.5" />
      <rect x="7.5" y="5" width="17" height="22" rx="1.5" />
      <rect x="2.5" y="8.5" width="17" height="22" rx="1.5" />
    </svg>
    <div class="fan">
      @for (card of cards; track card.name; let i = $index) {
        <div [class]="'fan-card fan-card--' + i">
          <app-card-art
            class="fan-art"
            [name]="card.name"
            [state]="own(card).state"
            [fill]="own(card).fill"
            [imageUrl]="art(card, i)"
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
