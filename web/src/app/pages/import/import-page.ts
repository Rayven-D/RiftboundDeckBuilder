import { Component } from '@angular/core';

interface ImportOption {
  readonly id: 'owned' | 'deck';
  readonly title: string;
  readonly subtext: string;
}

@Component({
  selector: 'app-import-page',
  template: `
    <header class="page-header">
      <h1>Import</h1>
      <p class="page-lede">Import cards you own, or a deck you want to build.</p>
    </header>
    <div class="import-options">
      @for (option of options; track option.id) {
        <section class="import-card" [attr.aria-labelledby]="'import-' + option.id">
          <h2 [id]="'import-' + option.id">{{ option.title }}</h2>
          <p>{{ option.subtext }}</p>
        </section>
      }
    </div>
  `,
  styles: `
    .import-options {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
      gap: var(--space-4);
    }
    .import-card {
      padding: var(--space-5) var(--space-4);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
    }
    h2 {
      margin: 0 0 var(--space-2);
      font-size: var(--font-size-lg);
    }
    p {
      margin: 0;
      color: var(--color-text-muted);
    }
  `,
})
export class ImportPage {
  protected readonly options: readonly ImportOption[] = [
    { id: 'owned', title: 'Owned Cards Import', subtext: 'List of cards and their quantity you own' },
    { id: 'deck', title: 'Deck Import', subtext: 'Created deck list that you want to make' },
  ];
}
