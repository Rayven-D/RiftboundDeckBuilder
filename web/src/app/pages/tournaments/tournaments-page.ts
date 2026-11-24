import { Component, inject } from '@angular/core';
import { SignInGate } from '../../core/sync/sign-in-gate';
import { EmptyState } from '../../shared/empty-state';

/**
 * Tournaments is public (SYNC-009). Its deck controls (SPEC-004 CAT-070 Add to your decks, CAT-074 In your
 * decks / Add another copy) are not built yet; when they are, they render only while `gate.deckControls()`
 * is true, and the CAT-074 "already added" check reads the local stores only then.
 */
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
export class TournamentsPage {
  protected readonly gate = inject(SignInGate);
}
