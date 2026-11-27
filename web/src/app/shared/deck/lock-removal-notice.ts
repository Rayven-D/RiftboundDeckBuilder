import { Component, computed, input } from '@angular/core';
import type { LockLoss } from '../../core/decks';
import { Icon } from '../icon';
import { LOCK_REMOVAL_TEXT, lockRemovalLines } from './deck-locks';

/**
 * SPEC-008 SHARE-088 (v0.6, H-665): the block a removal confirmation shows when it would take copies a card-name lock
 * holds (SHARE-087): the intro "Some of the cards you are removing are locked in your decks. Going on unlocks them:"
 * and one line per affected deck with each name and how many copies it has locked, plus "'<deck>' will no longer be
 * locked." for a locked deck (`lockLosses`, proposal wording, SPEC-008 Open question 8). It goes inside the change's
 * own confirmation (the IMP-050 Replace, the COLL-058 Undo; IMP-050a), so one dialog only. It sits in the dialog
 * content, so it is read with the dialog: no `role="alert"`. Renders nothing without losses (no lock hit, no mention).
 * Replaces the v0.5 `app-shortfall-warning` ("… will be n cards short. It stays locked.", withdrawn).
 */
@Component({
  selector: 'app-lock-removal-notice',
  imports: [Icon],
  template: `
    @if (lines().length) {
      <div class="removal">
        <p class="intro"><app-icon name="lock_open" /><span>{{ text.intro }}</span></p>
        <ul>
          @for (line of lines(); track $index) {
            <li>{{ line }}</li>
          }
        </ul>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .removal {
      margin: var(--space-3) 0 0;
      padding: var(--space-3);
      border: 1px solid var(--color-warning);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      font-size: var(--font-size-sm);
      color: var(--color-text);
    }
    .intro {
      display: flex;
      gap: var(--space-2);
      align-items: flex-start;
      margin: 0;
    }
    ul {
      margin: var(--space-2) 0 0;
      padding-inline-start: calc(16px + var(--space-2));
      list-style: none;
    }
    li + li {
      margin-top: var(--space-1);
    }
    app-icon {
      flex: none;
      font-size: 16px;
      margin-top: 2px;
      color: var(--color-warning);
    }
    @media (forced-colors: active) {
      .removal {
        border-color: CanvasText;
      }
    }
  `,
})
export class LockRemovalNotice {
  readonly losses = input.required<readonly LockLoss[]>();
  protected readonly text = LOCK_REMOVAL_TEXT;
  protected readonly lines = computed(() => lockRemovalLines(this.losses()));
}
