import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SignInGate } from '../../core/sync/sign-in-gate';
import { SignInPanel } from '../../core/sync/sign-in-panel';
import { GuestLoad } from '../collection/guest-load';
import { DeckDetail } from './deck-detail';

/**
 * `/decks/:id` (SPEC-005 OWN-066, SPEC-010 SYNC-009). While the gate is not open it shows the page header and the
 * sign-in panel and does not create `DeckDetail` at all, so nothing is read from the browser cache (D1). Once the gate
 * opens the deck shows without a reload.
 */
@Component({
  selector: 'app-deck-detail-page',
  imports: [DeckDetail, GuestLoad, RouterLink, SignInPanel],
  template: `
    @if (gate.content()) {
      <app-deck-detail [deckId]="id()" />
    } @else {
      <header class="page-header">
        <p class="page-eyebrow"><a routerLink="/decks">&larr; Decks</a></p>
        <h1>Deck detail</h1>
        <p class="page-lede">Which cards you own and which you're missing.</p>
      </header>
      <!-- SPEC-013 v0.2 TEST-060: a signed-out deck URL with no guest data shows the panel with Load test data. -->
      <app-sign-in-panel><app-guest-load /></app-sign-in-panel>
    }
  `,
})
export class DeckDetailPage {
  /** Bound from the `:id` route parameter (withComponentInputBinding). */
  readonly id = input.required<string>();
  protected readonly gate = inject(SignInGate);
}
