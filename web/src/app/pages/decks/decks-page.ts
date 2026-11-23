import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyState } from '../../shared/empty-state';

@Component({
  selector: 'app-decks-page',
  imports: [EmptyState, RouterLink],
  template: `
    <header class="page-header">
      <h1>Your decks</h1>
      <p class="page-lede">Tournament Top 8 decks, sorted by how much of each you already own.</p>
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
