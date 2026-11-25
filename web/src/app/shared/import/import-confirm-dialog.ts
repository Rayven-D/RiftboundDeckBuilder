import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import type { LockedShortfall } from '../../core/decks';
import { ShortfallWarning } from '../deck/shortfall-warning';

export interface ImportConfirmData {
  readonly title: string;
  readonly text: string;
  /** SPEC-008 SHARE-034: the locked decks this change leaves short, one warning line each (IMP-050a). */
  readonly shortfalls: readonly LockedShortfall[];
  readonly confirm: string;
}

/**
 * The Replace confirmation (SPEC-003 IMP-050, IMP-050a a) and the Undo confirmation (COLL-058, IMP-050a b): Cancel
 * first, the action last. Closes with true only for the action; Cancel and Escape change nothing.
 */
@Component({
  selector: 'app-import-confirm-dialog',
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButton, ShortfallWarning],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p>{{ data.text }}</p>
      <app-shortfall-warning [items]="data.shortfalls" />
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton type="button" mat-dialog-close>Cancel</button>
      <button matButton="filled" type="button" [mat-dialog-close]="true">{{ data.confirm }}</button>
    </mat-dialog-actions>
  `,
})
export class ImportConfirmDialog {
  protected readonly data = inject<ImportConfirmData>(MAT_DIALOG_DATA);
}

/** Opens the confirmation; resolves true only for the action button. */
export async function confirmImport(dialog: MatDialog, data: ImportConfirmData): Promise<boolean> {
  const ref = dialog.open<ImportConfirmDialog, ImportConfirmData, boolean>(ImportConfirmDialog, {
    data,
    width: '28rem',
    maxWidth: 'calc(100vw - 2rem)',
    autoFocus: 'first-tabbable',
  });
  return (await firstValueFrom(ref.afterClosed())) === true;
}
