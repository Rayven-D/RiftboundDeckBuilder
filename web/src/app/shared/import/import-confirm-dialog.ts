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
import { Icon } from '../icon';

export interface ImportConfirmData {
  readonly title: string;
  readonly text: string;
  /** SPEC-008 SHARE-034 warnings, one per locked deck (IMP-050a). */
  readonly warnings: readonly string[];
  readonly confirm: string;
}

/**
 * The Replace confirmation (SPEC-003 IMP-050, IMP-050a a) and the Undo confirmation (COLL-058, IMP-050a b): Cancel
 * first, the action last. Closes with true only for the action; Cancel and Escape change nothing.
 */
@Component({
  selector: 'app-import-confirm-dialog',
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButton, Icon],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p>{{ data.text }}</p>
      @if (data.warnings.length) {
        <ul class="warnings">
          @for (w of data.warnings; track $index) {
            <li><app-icon name="warning" /><span>{{ w }}</span></li>
          }
        </ul>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton type="button" mat-dialog-close>Cancel</button>
      <button matButton="filled" type="button" [mat-dialog-close]="true">{{ data.confirm }}</button>
    </mat-dialog-actions>
  `,
  styles: `
    .warnings { margin: var(--space-3) 0 0; padding: 0; list-style: none; }
    .warnings li { display: flex; gap: var(--space-2); align-items: flex-start; margin-top: var(--space-2); }
    .warnings app-icon { flex: none; color: var(--color-warning, currentColor); }
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
