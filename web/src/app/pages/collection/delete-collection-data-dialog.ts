import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';

/** SPEC-007 COLL-074 strings (local-only mode). No SPEC-010 text: there is no account (SYNC-052). */
export const DELETE_COLLECTION_DATA = {
  action: 'Delete all local collection data',
  title: 'Delete all local collection data?',
  body:
    'This deletes the cards, tags and printing codes saved in this browser, and your Collection search and sort. ' +
    "Your decks stay, but their cards will show as missing. This can't be undone.",
  hint: 'To keep a copy of your cards, export a CSV first.',
  confirm: 'Delete',
  done: 'Your collection data was deleted from this browser.',
  failed: "Couldn't delete your collection data. Try again.",
} as const;

export interface DeleteCollectionDataDialogData {
  /** The page has cards to export: the dialog points to Export CSV. */
  canExport: boolean;
}

/**
 * SPEC-007 COLL-074 confirmation (local-only mode only). Closes with `true` to delete. Cancel comes first and
 * gets the initial focus (`autoFocus` at the call site), so Enter never deletes by accident.
 */
@Component({
  selector: 'app-delete-collection-data-dialog',
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButton],
  template: `
    <h2 mat-dialog-title>{{ t.title }}</h2>
    <mat-dialog-content>
      <p>{{ t.body }}</p>
      @if (data?.canExport) {
        <p class="note">{{ t.hint }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton type="button" class="cancel" mat-dialog-close>Cancel</button>
      <button matButton="filled" type="button" class="danger" [mat-dialog-close]="true">
        {{ t.confirm }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .note {
      color: var(--color-text-muted);
    }
  `,
})
export class DeleteCollectionDataDialog {
  protected readonly t = DELETE_COLLECTION_DATA;
  protected readonly data = inject<DeleteCollectionDataDialogData | null>(MAT_DIALOG_DATA, { optional: true });
}
