import { Component, input } from '@angular/core';

/** Shared empty-state block: a heading, a short message, and optional projected actions. */
@Component({
  selector: 'app-empty-state',
  template: `
    <section class="empty-state" [attr.aria-label]="heading()">
      <h2>{{ heading() }}</h2>
      <p>{{ message() }}</p>
      <ng-content />
    </section>
  `,
  styles: `
    .empty-state {
      padding: var(--space-5) var(--space-4);
      border: 1px dashed var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      text-align: center;
    }
    h2 {
      margin: 0 0 var(--space-2);
      font-size: var(--font-size-lg);
    }
    p {
      margin: 0 auto var(--space-3);
      max-width: 50ch;
      color: var(--color-text-muted);
    }
  `,
})
export class EmptyState {
  readonly heading = input.required<string>();
  readonly message = input.required<string>();
}
