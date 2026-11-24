import { Component, inject } from '@angular/core';
import { SignInGate } from '../../core/sync/sign-in-gate';
import { SignInPanel } from '../../core/sync/sign-in-panel';
import { CollectionPage } from './collection-page';

/**
 * SPEC-010 SYNC-009: the `/collection` route. While the gate is not open it shows the page header
 * and the sign-in panel and does not create `CollectionPage` at all, so nothing is read from the
 * local stores. In local-only mode (`signInEnabled: false`) the gate is always open.
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
      <app-sign-in-panel page="collection" />
    }
  `,
})
export class CollectionGate {
  protected readonly gate = inject(SignInGate);
}
