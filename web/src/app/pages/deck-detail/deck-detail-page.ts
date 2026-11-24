import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SignInGate } from '../../core/sync/sign-in-gate';
import { SignInPanel } from '../../core/sync/sign-in-panel';
import { EmptyState } from '../../shared/empty-state';

@Component({
  selector: 'app-deck-detail-page',
  imports: [EmptyState, RouterLink, SignInPanel],
  template: `
    <header class="page-header">
      <p class="page-eyebrow"><a routerLink="/decks">&larr; Decks</a></p>
      <h1>Deck detail</h1>
      <p class="page-lede">Which cards you own and which you're missing.</p>
    </header>
    <!-- SYNC-009: gated in account-required mode; always open in local-only mode. -->
    @if (gate.open()) {
      <app-empty-state
        heading="Deck not available yet"
        [message]="'Deck ' + id() + ' will show here once deck data is connected.'"
      />
    } @else {
      <app-sign-in-panel page="decks" />
    }
  `,
})
export class DeckDetailPage {
  /** Bound from the `:id` route parameter (withComponentInputBinding). */
  readonly id = input.required<string>();
  protected readonly gate = inject(SignInGate);
}
