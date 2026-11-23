import { Component } from '@angular/core';
import { EmptyState } from '../../shared/empty-state';

@Component({
  selector: 'app-import-page',
  imports: [EmptyState],
  template: `
    <header class="page-header">
      <h1>Import</h1>
      <p class="page-lede">Import cards you own, or a deck you want to build.</p>
    </header>
    <app-empty-state
      heading="Nothing imported yet"
      message="Choose owned cards or a deck, then paste a list or upload a file. Import isn't wired up yet."
    />
  `,
})
export class ImportPage {}
