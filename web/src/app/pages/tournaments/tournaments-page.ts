import { Component } from '@angular/core';
import { EmptyState } from '../../shared/empty-state';

@Component({
  selector: 'app-tournaments-page',
  imports: [EmptyState],
  template: `
    <header class="page-header">
      <h1>Tournaments</h1>
      <p class="page-lede">Recent events and their Top 8 decks.</p>
    </header>
    <app-empty-state heading="No tournaments loaded yet" message="Tournament results will appear here once the catalog is connected." />
  `,
})
export class TournamentsPage {}
