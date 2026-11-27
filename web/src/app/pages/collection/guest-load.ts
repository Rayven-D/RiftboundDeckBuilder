import { injectNotices } from '../../shared/notice/notice-snack-bar';
import { ApplicationRef, Component, afterNextRender, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { refocusAfterDialog } from '../../core/sync/sync.service';
import { GuestTestData } from '../../core/test-data/guest-test-data';
import { TEST_DATA_ENABLED } from '../../core/test-data/test-data-flag';
import { TEST_TEXT } from '../../shared/collection/test-data';
import { noticeOptions } from '../../shared/sync/notice';
import { TestLoadDialog, TestLoadDialogData } from './test-data-dialogs';

/**
 * H-679: **Load test data** under Sign in on the signed-out panel of Collection and Decks (flag on, never for a lost
 * session). Opens the SPEC-013 TEST-003 dialog (Small / Large) in guest mode: the set goes into memory only.
 */
@Component({
  selector: 'app-guest-load',
  imports: [MatButton],
  template: `
    @if (enabled && guest.canOffer()) {
      <div class="guest-load">
        <button matButton type="button" aria-haspopup="dialog" (click)="open($event)">{{ text.loadButton }}</button>
      </div>
    }
  `,
  styles: `
    :host {
      display: contents;
    }
    .guest-load {
      flex-basis: 100%;
      display: flex;
      justify-content: center;
    }
  `,
})
export class GuestLoad {
  protected readonly guest = inject(GuestTestData);
  protected readonly enabled = inject(TEST_DATA_ENABLED);
  protected readonly text = TEST_TEXT;
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = injectNotices();
  /** Root: the dialog may close after this component is gone (the page content replaced the panel). */
  private readonly appRef = inject(ApplicationRef);
  private get injector() {
    return this.appRef.injector;
  }

  protected open(e: Event): void {
    const opener = e.currentTarget as HTMLElement;
    const data: TestLoadDialogData = { replacing: false, guest: true, load: (set) => this.guest.load(set) };
    const ref = this.dialog.open<TestLoadDialog, TestLoadDialogData, boolean>(TestLoadDialog, {
      data,
      width: '32rem',
      maxWidth: 'calc(100vw - 2rem)',
      autoFocus: 'first-tabbable',
      restoreFocus: false,
    });
    ref.afterClosed().subscribe((ok) => {
      if (this.appRef.destroyed) return; // app teardown closes every dialog
      if (ok) this.snackBar.open(TEST_TEXT.loaded, 'OK', noticeOptions('success'));
      // The page content replaced the panel (and this button): focus falls back to #main.
      afterNextRender(() => refocusAfterDialog(opener), { injector: this.injector });
    });
  }
}
