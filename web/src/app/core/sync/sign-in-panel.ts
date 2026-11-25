import { Component, ElementRef, Injector, afterNextRender, effect, inject, viewChild } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { EmptyState } from '../../shared/empty-state';
import { SignInGate } from './sign-in-gate';

/** SPEC-010 v0.10 SYNC-009 / SYNC-086 panel lines. No panel heading in any state (RJ decision 15). */
export const GATE_TEXT = {
  signedOut: 'Sign in or create an account to start keeping track of your collections and decks',
  sessionLost: "You've been signed out. Sign in again to continue.",
  firstSync: 'Getting your collection and decks from your account…',
  firstSyncFailed: "Couldn't get your collection and decks. Check your connection and try again.",
} as const;

/**
 * SPEC-010 SYNC-009: what a gated page shows instead of its content while the gate is not open. It reads
 * nothing from the local stores, so legacy local data and a lost session's kept data stay hidden.
 *
 * Every state is an `app-empty-state` with no heading (H-114, Brief H-144): the page header's h1 names the
 * page. The running state shows a decorative indeterminate bar (H-115), static under reduced motion.
 */
@Component({
  selector: 'app-sign-in-panel',
  imports: [EmptyState, MatButton],
  template: `
    @switch (gate.state()) {
      @case ('first-sync') {
        <app-empty-state [message]="text.firstSync" messageRole="status" [focusable]="true">
          <div class="progress" aria-hidden="true"><div class="progress-segment"></div></div>
        </app-empty-state>
      }
      @case ('first-sync-failed') {
        <app-empty-state [message]="text.firstSyncFailed" messageRole="alert" [focusable]="true">
          <button #retryButton matButton="filled" type="button" (click)="retry()">Try again</button>
        </app-empty-state>
      }
      @default {
        <app-empty-state [message]="gate.state() === 'session-lost' ? text.sessionLost : text.signedOut">
          <button matButton="filled" type="button" aria-haspopup="dialog" (click)="signIn($event)">Sign in</button>
        </app-empty-state>
      }
    }
  `,
  styles: `
    /*
     * min(): 16rem, or the action row's width (app-empty-state stretches the row to the box's content width), so
     * the bar never sets the box's width and never overflows it on a narrow phone.
     * margin-block 18px: 4px + 36px = the 40px filled button, so running and failed rows have the same height.
     */
    .progress {
      width: min(16rem, 100%);
      height: 4px;
      margin-block: 18px;
      border-radius: 999px;
      background: var(--color-border);
      overflow: hidden;
    }
    .progress-segment {
      width: 40%;
      height: 100%;
      border-radius: inherit;
      background: var(--color-accent);
      animation: gate-progress 1.4s linear infinite;
    }
    @keyframes gate-progress {
      from {
        transform: translateX(-100%);
      }
      to {
        transform: translateX(250%);
      }
    }
    /* H-115: no motion; the segment rests centred so the bar still reads as "in progress". */
    @media (prefers-reduced-motion: reduce) {
      .progress-segment {
        animation: none;
        transform: translateX(75%);
      }
    }
  `,
})
export class SignInPanel {
  protected readonly gate = inject(SignInGate);
  protected readonly text = GATE_TEXT;
  private readonly injector = inject(Injector);
  private readonly panel = viewChild(EmptyState);
  private readonly retryButton = viewChild('retryButton', { read: ElementRef<HTMLButtonElement> });
  /**
   * Set by Try again, so focus follows the panel through one running → failed cycle (Brief H-144 decision 9).
   * One-shot: a later automatic rerun (back online, tab visible) must not move focus.
   */
  private retried = false;

  constructor() {
    effect(() => {
      const state = this.gate.state();
      if (!this.retried) return;
      if (state === 'first-sync') {
        this.afterRender(() => this.panel()?.focus());
      } else if (state === 'first-sync-failed') {
        this.afterRender(() => this.retryButton()?.nativeElement.focus());
        this.retried = false;
      } else {
        this.retried = false; // the page content replaces the panel: leave focus alone
      }
    });
  }

  /** H-125: the button is passed on, so focus returns to it when the Sign in dialog closes. */
  protected signIn(e: Event): void {
    this.gate.signIn(e.currentTarget as HTMLElement);
  }

  protected retry(): void {
    this.retried = true;
    this.gate.retry();
    // The button is removed when the state turns to running; keep focus off <body>.
    this.afterRender(() => {
      if (this.gate.state() === 'first-sync') this.panel()?.focus();
    });
  }

  private afterRender(fn: () => void): void {
    afterNextRender(fn, { injector: this.injector });
  }
}
