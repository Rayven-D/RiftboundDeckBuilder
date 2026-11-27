import { ApplicationRef, Component, afterNextRender, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { refocusAfterDialog } from '../../core/sync/sync.service';
import { GuestTestData } from '../../core/test-data/guest-test-data';
import { TEST_DATA_ENABLED } from '../../core/test-data/test-data-flag';
import { TEST_TEXT } from '../../shared/collection/test-data';
import { Icon } from '../../shared/icon';
import { noticeOptions } from '../../shared/sync/notice';
import { TestLoadDialog, TestLoadDialogData, confirmTestData } from './test-data-dialogs';

/**
 * SPEC-013 v0.2 TEST-063 / TEST-064 (H-679): the guest test-data banner on Collection, Decks and Deck detail, in the
 * TEST-010 style (not dismissible, `role="status"`): "You're trying Rift Builder with test data. Nothing is saved: it's
 * gone when you reload." with **Change set** (TEST-064 (b), while the flag is on) and **Remove test data** (TEST-064
 * (a): drops the memory stores; the sign-in panel with Load test data comes back).
 */
@Component({
  selector: 'app-guest-banner',
  imports: [MatButton, Icon],
  template: `
    <div class="banner banner--warning banner--test" role="status">
      <app-icon name="warning" />
      <p>{{ text.guestBanner }}</p>
      <div class="banner-actions">
        @if (enabled) {
          <button matButton type="button" aria-haspopup="dialog" (click)="changeSet($event)">{{ text.changeSet }}</button>
        }
        <button matButton type="button" aria-haspopup="dialog" (click)="remove()">{{ text.removeButton }}</button>
      </div>
    </div>
  `,
  styles: `
    .banner {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2) var(--space-3);
      margin-bottom: var(--space-4);
      padding: var(--space-3);
      border: 1px solid var(--color-warning);
      border-radius: var(--radius-md);
      background: var(--color-surface);
    }
    app-icon {
      font-size: 20px;
      color: var(--color-warning);
    }
    p {
      flex: 1 1 20rem;
      margin: 0;
    }
    .banner-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-1);
      margin-inline-end: calc(-1 * var(--space-2));
    }
  `,
})
export class GuestBanner {
  protected readonly text = TEST_TEXT;
  protected readonly enabled = inject(TEST_DATA_ENABLED);
  private readonly guest = inject(GuestTestData);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  /** Root: the dialog may close after this component is gone (the page content replaced the panel). */
  private readonly appRef = inject(ApplicationRef);
  private get injector() {
    return this.appRef.injector;
  }

  protected changeSet(e: Event): void {
    const opener = e.currentTarget as HTMLElement;
    const data: TestLoadDialogData = { replacing: true, guest: true, load: (set) => this.guest.load(set) };
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
      afterNextRender(() => refocusAfterDialog(opener), { injector: this.injector });
    });
  }

  protected async remove(): Promise<void> {
    const ok = await confirmTestData(this.dialog, {
      title: TEST_TEXT.removeTitle,
      text: TEST_TEXT.guestRemoveText,
      confirm: 'Remove',
      danger: true,
    });
    if (!ok) {
      afterNextRender(() => refocusAfterDialog(undefined), { injector: this.injector });
      return;
    }
    this.guest.discard();
    this.snackBar.open(TEST_TEXT.removed, 'OK', noticeOptions('success'));
    // The page shows the sign-in panel again: focus its Load test data (or #main).
    afterNextRender(
      () => refocusAfterDialog(document.querySelector<HTMLElement>('app-guest-load button') ?? undefined),
      { injector: this.injector },
    );
  }
}
