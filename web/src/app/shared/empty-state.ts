import { Component, ElementRef, input, viewChild } from '@angular/core';
import { DeckMark } from './deck-mark';

export type EmptyStateMessageRole = 'status' | 'alert' | null;

/**
 * Shared empty-state block: the faded deck-stack mark, an optional heading, a short message, and optional
 * projected actions (RJ, 2026-11-24: placeholder pages should feel finished). The sign-in gate panel uses it
 * without a heading (H-114, SYNC-009 v0.10); then the message is the primary text and the section has no name.
 */
@Component({
  selector: 'app-empty-state',
  imports: [DeckMark],
  template: `
    <section
      #section
      class="empty-state"
      [attr.aria-label]="heading() || null"
      [attr.tabindex]="focusable() ? -1 : null"
    >
      <app-deck-mark class="mark" />
      @if (heading()) {
        <h2>{{ heading() }}</h2>
      }
      @if (message()) {
        <p [class.primary]="!heading()" [attr.role]="messageRole()">{{ message() }}</p>
      }
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
    /* Focused only from script (H-115 Try again); it is not a control. */
    .empty-state:focus {
      outline: none;
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
      text-wrap: balance;
    }
    /* No heading above it: the line is the primary text (Brief H-144 decision 6). */
    p.primary {
      color: var(--color-text);
    }
    /* Stretched to the content width (items stay centred), so a projected child can size against it (H-115 bar). */
    .actions:not(:empty) {
      justify-self: stretch;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--space-2);
      margin-top: var(--space-4);
    }
  `,
})
export class EmptyState {
  readonly heading = input<string>('');
  readonly message = input<string>('');
  /** Role of the message line: `status` or `alert` when it changes in place, none when it is there on load. */
  readonly messageRole = input<EmptyStateMessageRole>(null);
  /** Gives the section `tabindex="-1"` so script can move focus to it (no visible ring: it isn't a control). */
  readonly focusable = input(false);

  private readonly section = viewChild.required<ElementRef<HTMLElement>>('section');

  focus(): void {
    this.section().nativeElement.focus();
  }
}
