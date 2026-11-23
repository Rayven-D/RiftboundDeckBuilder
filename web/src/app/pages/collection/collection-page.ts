import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyState } from '../../shared/empty-state';

@Component({
  selector: 'app-collection-page',
  imports: [EmptyState, RouterLink],
  template: `
    <header class="page-header">
      <h1>My collection</h1>
      <p class="page-lede">
        Every card you own, shown as a grid of official card images with the quantity you have. Filter
        by domain, type, set and rarity to find cards quickly.
      </p>
    </header>
    <app-empty-state
      heading="Your collection is empty"
      message="Import the cards you own and they will appear here."
    >
      <a class="button" routerLink="/import">Import collection</a>
    </app-empty-state>
  `,
})
export class CollectionPage {}
