import { Component, input } from '@angular/core';
import { DeckMark } from './deck-mark';

/**
 * Shared empty-state block: the faded deck-stack mark, a heading, a short message, and optional
 * projected actions (RJ, 2026-11-24: placeholder pages should feel finished).
 */
@Component({
  selector: 'app-empty-state',
  imports: [DeckMark],
  template: `
    <section class="empty-state" [attr.aria-label]="heading()">
      <app-deck-mark class="mark" />
      <h2>{{ heading() }}</h2>
      <p>{{ message() }}</p>
      <div class="actions"><ng-content /></div>
    </section>
  `,
  styles: `
    .empty-state {
      display: grid;
      justify-items: center;
      gap: var(--space-2);
      padding: var(--space-7) var(--space-4);
      border: 1px dashed var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      text-align: center;
    }
    .mark {
      width: 4.5rem;
      margin-bottom: var(--space-3);
      opacity: 0.9;
    }
    h2 {
      margin: 0;
      font-size: var(--font-size-lg);
    }
    p {
      max-width: 50ch;
      margin: 0;
      color: var(--color-text-muted);
    }
    .actions:not(:empty) {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--space-2);
      margin-top: var(--space-4);
    }
  `,
})
export class EmptyState {
  readonly heading = input.required<string>();
  readonly message = input.required<string>();
}
