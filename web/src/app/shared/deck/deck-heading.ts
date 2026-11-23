import { Component, input } from '@angular/core';

/**
 * Deck name with its source line underneath (SPEC-005 OWN-003), e.g.
 * "1st, Regional Championship: Europe · Nov 6, 2026 – Nov 8, 2026". The source line is
 * supporting description, so it is set small and muted (RJ, 2026-11-23).
 */
@Component({
  selector: 'app-deck-heading',
  template: `
    <h1 class="name">{{ name() }}</h1>
    @if (source()) {
      <p class="source">{{ source() }}</p>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .name {
      margin: 0;
      font-size: var(--font-size-xl);
      line-height: 1.2;
    }
    .source {
      margin: var(--space-1) 0 0;
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
    }
  `,
})
export class DeckHeading {
  readonly name = input.required<string>();
  readonly source = input<string | null>(null);
}
