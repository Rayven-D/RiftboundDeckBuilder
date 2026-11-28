import { Component, DestroyRef, inject, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { Icon } from '../../shared/icon';
import { TEST_TEXT, TestSetId } from '../../shared/collection/test-data';
import { DIALOG_MOTION } from '../../shared/motion';

/**
 * SPEC-013 dialogs (H-205): Load test data (TEST-003, TEST-004, TEST-022, TEST-023) and one small confirmation
 * used for Replace (TEST-022), Remove (TEST-050) and the Add-while-test-data notice (TEST-032). Small Angular
 * Material dialogs in the style of the SPEC-010 ones.
 */

export type TestLoadOutcome = 'ok' | 'real-cards' | 'error';

export interface TestLoadDialogData {
  /** Test data is present: choosing a set asks the TEST-022 confirmation first. */
  replacing: boolean;
  /** H-679: signed out, the set goes into memory only: guest text, and no network is needed (no offline block). */
  guest?: boolean;
  load:(set: TestSetId) => Promise<TestLoadOutcome>;
}

export interface TestConfirmDialogData {
  title?: string;
  text: string;
  confirm: string;
  danger?: boolean;
}

let testDialogSeq = 0;

/** TEST-022 / TEST-050 / TEST-032: Cancel first, the action last (filled; danger for Remove). Closes with true. */
@Component({
  selector: 'app-test-confirm-dialog',
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButton],
  template: `
    @if (data.title) {
      <h2 mat-dialog-title>{{ data.title }}</h2>
    }
    <mat-dialog-content>
      <p>{{ data.text }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton type="button" mat-dialog-close>Cancel</button>
      <button matButton="filled" type="button" [class.danger]="!!data.danger" [mat-dialog-close]="true">
        {{ data.confirm }}
      </button>
    </mat-dialog-actions>
  `,
})
export class TestConfirmDialog {
  protected readonly data = inject<TestConfirmDialogData>(MAT_DIALOG_DATA);
}

/** Opens the confirmation; resolves true only for the action button. */
export async function confirmTestData(dialog: MatDialog, data: TestConfirmDialogData): Promise<boolean> {
  const ref = dialog.open<TestConfirmDialog, TestConfirmDialogData, boolean>(TestConfirmDialog, {
    ...DIALOG_MOTION,
    data,
    width: '28rem',
    maxWidth: 'calc(100vw - 2rem)',
    autoFocus: 'first-tabbable',
    ...(data.title ? {} : { ariaLabel: data.text }),
  });
  return (await firstValueFrom(ref.afterClosed())) === true;
}

/**
 * TEST-003: two radio options, none preselected; Load stays disabled (aria-disabled, focus kept) until one is
 * picked, and offline (TEST-004, "You're offline." above the buttons). While writing it reads "Loading…"
 * (TEST-023); success closes with true; a failure keeps the dialog open with the error line. Escape and Cancel
 * close with nothing written. The page returns focus to the opener.
 */
@Component({
  selector: 'app-test-load-dialog',
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButton, Icon],
  template: `
    <h2 mat-dialog-title>{{ text.dialogTitle }}</h2>
    <mat-dialog-content>
      <p>{{ data.guest ? text.guestDialogText : text.dialogText }}</p>
      <fieldset class="sets" [disabled]="busy()">
        <legend class="visually-hidden">Test set</legend>
        @for (o of options; track o.id) {
          <label class="set">
            <input
              type="radio"
              name="test-set-{{ seq }}"
              [value]="o.id"
              [checked]="chosen() === o.id"
              (change)="choose(o.id)"
            />
            <span><strong>{{ o.label }}</strong>: {{ o.detail }}</span>
          </label>
        }
      </fieldset>
      <div role="status">
        @if (!online() && !data.guest) {
          <p class="note">{{ text.offline }}</p>
        }
        @if (error(); as err) {
          <p class="error"><app-icon name="error" />{{ err }}</p>
        }
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton type="button" mat-dialog-close [disabled]="busy()">Cancel</button>
      <button
        matButton="filled"
        type="button"
        class="load"
        [disabled]="!canLoad()"
        disabledInteractive
        (click)="submit()"
      >
        {{ busy() ? text.loading : 'Load' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .sets { display: grid; gap: var(--space-2); margin: var(--space-3) 0 0; padding: 0; border: 0; }
    .set {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      min-height: 44px;
      cursor: pointer;
    }
    .set input { width: 1.25rem; height: 1.25rem; margin: 0; flex: none; accent-color: var(--color-accent); }
    .note { margin: var(--space-3) 0 0; color: var(--color-text-muted); }
    .error {
      display: flex;
      align-items: flex-start;
      gap: var(--space-1);
      margin: var(--space-3) 0 0;
      color: var(--color-danger);
      font-size: var(--font-size-sm);
    }
    .error app-icon { flex: none; }
    .load { min-width: 6.5rem; }
    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
  `,
})
export class TestLoadDialog {
  protected readonly data = inject<TestLoadDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<TestLoadDialog, boolean>);
  private readonly dialog = inject(MatDialog);
  protected readonly text = TEST_TEXT;
  protected readonly seq = ++testDialogSeq;
  protected readonly options: { id: TestSetId; label: string; detail: string }[] = [
    { id: 'small', label: TEST_TEXT.small, detail: TEST_TEXT.smallDetail },
    { id: 'large', label: TEST_TEXT.large, detail: TEST_TEXT.largeDetail },
  ];
  protected readonly chosen = signal<TestSetId | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);
  private destroyed = false;

  constructor() {
    const on = () => this.online.set(true);
    const off = () => this.online.set(false);
    addEventListener('online', on);
    addEventListener('offline', off);
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      removeEventListener('online', on);
      removeEventListener('offline', off);
    });
  }

  protected canLoad(): boolean {
    return this.chosen() !== null && (this.online() || !!this.data.guest) && !this.busy();
  }

  protected choose(set: TestSetId): void {
    this.chosen.set(set);
    this.error.set(null);
  }

  protected async submit(): Promise<void> {
    const set = this.chosen();
    if (!set || !this.canLoad()) return; // disabledInteractive: a press while disabled does nothing
    if (this.data.replacing) {
      const ok = await confirmTestData(this.dialog, {
        text: this.data.guest ? TEST_TEXT.guestReplaceQuestion(set) : TEST_TEXT.replaceQuestion(set),
        confirm: 'Replace',
      });
      if (!ok || this.destroyed) return; // TEST-022: Cancel writes nothing
    }
    this.busy.set(true);
    this.ref.disableClose = true; // the write is under way: Escape waits for it
    this.error.set(null);
    let outcome: TestLoadOutcome;
    try {
      outcome = await this.data.load(set);
    } catch {
      outcome = 'error';
    }
    if (this.destroyed) return;
    this.busy.set(false);
    this.ref.disableClose = false;
    if (outcome === 'ok') return this.ref.close(true);
    this.error.set(outcome === 'real-cards' ? TEST_TEXT.realCards : TEST_TEXT.loadFailed);
  }
}
