import { Component } from '@angular/core';
import { EmptyState } from '../../shared/empty-state';

@Component({
  selector: 'app-import-page',
  imports: [EmptyState],
  template: `
    <header class="page-header">
      <h1>Import collection</h1>
      <p class="page-lede">Paste a card list or upload a CSV.</p>
    </header>
    <app-empty-state
      heading="Nothing imported yet"
      message="Paste a list or choose a CSV file to get started. Import isn't wired up yet."
    />
  `,
})
export class ImportPage {}
