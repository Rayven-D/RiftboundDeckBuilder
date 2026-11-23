import { Component } from '@angular/core';
import { EmptyState } from '../../shared/empty-state';

@Component({
  selector: 'app-tournaments-page',
  imports: [EmptyState],
  template: `
    <header class="page-header">
      <h1>Tournaments</h1>
      <p class="page-lede">
        Recent events, newest first, each with its Top 8 decks, their placings exactly as published, and
        the full decklists.
      </p>
    </header>
    <app-empty-state heading="No tournaments loaded yet" message="Tournament results will appear here once the catalog is connected." />
  `,
})
export class TournamentsPage {}
