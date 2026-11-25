import { Component, inject } from '@angular/core';
import { SignInGate } from '../../core/sync/sign-in-gate';
import { SignInPanel } from '../../core/sync/sign-in-panel';
import { CollectionPage } from './collection-page';

/**
 * SPEC-010 SYNC-009: the `/collection` route. While the gate is not open it shows the page header
 * and the sign-in panel and does not create `CollectionPage` at all, so nothing is read from the
 * local stores (the cache of another account or of the old no-account build stays hidden, SYNC-142).
 */
@Component({
  selector: 'app-collection-gate',
  imports: [CollectionPage, SignInPanel],
  template: `
    @if (gate.open()) {
      <app-collection-page />
    } @else {
      <header class="page-header">
        <h1>Collection</h1>
        <p class="page-lede">Every card you own.</p>
      </header>
      <app-sign-in-panel />
    }
  `,
})
export class CollectionGate {
  protected readonly gate = inject(SignInGate);
}
