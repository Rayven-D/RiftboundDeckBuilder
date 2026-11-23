import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyState } from '../../shared/empty-state';

@Component({
  selector: 'app-decks-page',
  imports: [EmptyState, RouterLink],
  template: `
    <header class="page-header">
      <h1>Your decks</h1>
      <p class="page-lede">Decks you've imported. Cards you own are shown in full color.</p>
    </header>
    <app-empty-state
      heading="No decks to show yet"
      message="Import a deck to see which of its cards you own."
    >
      <a class="button" routerLink="/import" [queryParams]="{ type: 'deck' }">Import a deck</a>
    </app-empty-state>
  `,
})
export class DecksPage {}
