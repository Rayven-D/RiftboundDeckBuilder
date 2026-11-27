import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
import { LOCK_TEXT, lockInTitle } from './deck-locks';

export interface LockInDialogData {
  readonly deckName: string;
  /** SHARE-021 (SHOULD) "2 other decks use some of these cards: …", or null. */
  readonly others: string | null;
}

/**
 * SPEC-008 SHARE-021 / SHARE-029 (d) Lock in confirmation ([[Decks Components]] §7): title "Lock in '<name>'?", the
 * body line, the optional other-decks line, Cancel · Lock in (filled, focused first). Escape = Cancel. Closes with
 * true only for Lock in.
 */
@Component({
  selector: 'app-lock-in-dialog',
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButton],
  template: `
    <h2 mat-dialog-title>{{ title }}</h2>
    <mat-dialog-content>
      <p>{{ text.confirmBody }}</p>
      @if (data.others) {
        <p class="others">{{ data.others }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton type="button" mat-dialog-close>{{ text.cancel }}</button>
      <button matButton="filled" type="button" class="confirm" cdkFocusInitial [mat-dialog-close]="true">
        {{ text.lockIn }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    p {
      margin: 0;
    }
    .others {
      margin-top: var(--space-3);
      color: var(--color-text-muted);
    }
  `,
})
export class LockInDialog {
  protected readonly data = inject<LockInDialogData>(MAT_DIALOG_DATA);
  protected readonly text = LOCK_TEXT;
  protected readonly title = lockInTitle(this.data.deckName);
}
