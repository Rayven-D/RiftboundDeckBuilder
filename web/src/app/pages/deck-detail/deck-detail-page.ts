import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyState } from '../../shared/empty-state';

@Component({
  selector: 'app-deck-detail-page',
  imports: [EmptyState, RouterLink],
  template: `
    <header class="page-header">
      <p class="page-eyebrow"><a routerLink="/decks">&larr; Decks I can build</a></p>
      <h1>Deck detail</h1>
      <p class="page-lede">
        The event and placing for this deck, then every card in the list marked as owned or missing. The
        missing cards are gathered into a shopping list, and the full list can be copied for export.
      </p>
    </header>
    <app-empty-state
      heading="Deck not available yet"
      [message]="'Deck ' + id() + ' will show here once deck data is connected.'"
    />
  `,
})
export class DeckDetailPage {
  /** Bound from the `:id` route parameter (withComponentInputBinding). */
  readonly id = input.required<string>();
}
