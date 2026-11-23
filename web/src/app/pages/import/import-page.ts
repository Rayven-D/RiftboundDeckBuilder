import { Component } from '@angular/core';
import { EmptyState } from '../../shared/empty-state';

@Component({
  selector: 'app-import-page',
  imports: [EmptyState],
  template: `
    <header class="page-header">
      <h1>Import collection</h1>
      <p class="page-lede">
        Add the cards you physically own by pasting a card list or uploading a CSV file. Each line is
        checked as it is read, and any line that can't be understood is listed with its line number and
        the reason, so you can fix it and import again.
      </p>
    </header>
    <app-empty-state
      heading="Nothing imported yet"
      message="Paste a list or choose a CSV file to get started. Import isn't wired up yet."
    />
  `,
})
export class ImportPage {}
