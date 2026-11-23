import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyState } from '../../shared/empty-state';

@Component({
  selector: 'app-decks-page',
  imports: [EmptyState, RouterLink],
  template: `
    <header class="page-header">
      <h1>Decks I can build</h1>
      <p class="page-lede">
        Top 8 decklists from recent tournaments, checked against your collection. Decks are sorted by how
        complete they are for you, then by how recent the event was, and each shows its placing. Open a
        deck to see exactly which cards you're missing.
      </p>
    </header>
    <app-empty-state
      heading="No decks to show yet"
      message="Import your collection to see which tournament decks you can build."
    >
      <a class="button" routerLink="/import">Import collection</a>
    </app-empty-state>
  `,
})
export class DecksPage {}
