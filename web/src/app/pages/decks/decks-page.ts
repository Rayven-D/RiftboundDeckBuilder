import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SignInGate } from '../../core/sync/sign-in-gate';
import { SignInPanel } from '../../core/sync/sign-in-panel';
import { EmptyState } from '../../shared/empty-state';

@Component({
  selector: 'app-decks-page',
  imports: [EmptyState, RouterLink, SignInPanel],
  template: `
    <header class="page-header">
      <h1>Decks</h1>
      <p class="page-lede">Decks you've imported. Cards you own are shown in full color.</p>
    </header>
    <!-- SYNC-009: gated (account-only, SPEC-010 v0.12). -->
    @if (gate.open()) {
      <app-empty-state
        heading="No decks to show yet"
        message="Import a deck to see which of its cards you own."
      >
        <a class="button" routerLink="/import" [queryParams]="{ type: 'deck' }">Import a deck</a>
      </app-empty-state>
    } @else {
      <app-sign-in-panel />
    }
  `,
})
export class DecksPage {
  protected readonly gate = inject(SignInGate);
}
