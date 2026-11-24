import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SignInGate } from '../../core/sync/sign-in-gate';
import { SignInPanel } from '../../core/sync/sign-in-panel';
import { EmptyState } from '../../shared/empty-state';

@Component({
  selector: 'app-collection-page',
  imports: [EmptyState, RouterLink, SignInPanel],
  template: `
    <header class="page-header">
      <h1>Collection</h1>
      <p class="page-lede">Every card you own.</p>
    </header>
    <!-- SYNC-009: gated in account-required mode; always open in local-only mode. -->
    @if (gate.open()) {
      <app-empty-state
        heading="Your collection is empty"
        message="Import the cards you own and they will appear here."
      >
        <a class="button" routerLink="/import" [queryParams]="{ type: 'collection' }"
          >Import collection</a
        >
      </app-empty-state>
    } @else {
      <app-sign-in-panel page="collection" />
    }
  `,
})
export class CollectionPage {
  protected readonly gate = inject(SignInGate);
}
