import { Component, computed, inject, input } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { SignInGate } from './sign-in-gate';

export type GatedPage = 'collection' | 'decks' | 'import';

/** SYNC-009 panel headings per gated page. */
export const GATE_HEADINGS: Record<GatedPage, string> = {
  collection: 'Sign in to see your collection',
  decks: 'Sign in to see your decks',
  import: 'Sign in to import cards and decks',
};

export const GATE_TEXT = {
  signedOut: 'You need a free account to import cards and decks. Tournaments are open to everyone.',
  sessionLost: "You've been signed out. Sign in again to see them.",
  firstSync: 'Getting your collection and decks from your account…',
  firstSyncFailed: "Couldn't get your collection and decks. Check your connection and try again.",
} as const;

/**
 * SPEC-010 SYNC-009: what a gated page shows instead of its content while the gate is not open. It reads
 * nothing from the local stores, so legacy local data and a lost session's kept data stay hidden.
 */
@Component({
  selector: 'app-sign-in-panel',
  imports: [MatButton],
  template: `
    @switch (gate.state()) {
      @case ('first-sync') {
        <section class="gate" aria-busy="true">
          <p role="status">{{ text.firstSync }}</p>
        </section>
      }
      @case ('first-sync-failed') {
        <section class="gate">
          <p role="alert">{{ text.firstSyncFailed }}</p>
          <button matButton="filled" type="button" (click)="gate.retry()">Try again</button>
        </section>
      }
      @default {
        <section class="gate" [attr.aria-labelledby]="headingId">
          <h2 [id]="headingId">{{ heading() }}</h2>
          <p>{{ gate.state() === 'session-lost' ? text.sessionLost : text.signedOut }}</p>
          <button matButton="filled" type="button" aria-haspopup="dialog" (click)="gate.signIn()">Sign in</button>
        </section>
      }
    }
  `,
  styles: `
    .gate {
      padding: var(--space-5) var(--space-4);
      border: 1px dashed var(--color-border);
      border-radius: var(--radius-lg);
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
export class SignInPanel {
  readonly page = input.required<GatedPage>();
  protected readonly gate = inject(SignInGate);
  protected readonly text = GATE_TEXT;
  protected readonly heading = computed(() => GATE_HEADINGS[this.page()]);
  protected readonly headingId = `gate-heading-${nextId++}`;
}

let nextId = 0;
