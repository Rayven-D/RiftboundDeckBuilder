import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';

/**
 * H-189 finding 9 (RJ, 2026-11-25): notices (MatSnackBar) show above an open dialog. Every CDK overlay is a manual
 * popover in the browser's top layer, stacked in the order it was shown, so a dialog opened after a notice (e.g. the
 * `?add=1` dialog right after "You're signed in.") covers it; z-index can't change top-layer order. When a dialog
 * opens, each open notice is shown again, which moves it to the top. Without popover support (older browsers,
 * jsdom) overlays stack in DOM order, so the notice's host is moved to the end of the overlay container instead.
 *
 * Notices stay non-modal: the dialog keeps focus and its focus trap (a notice is never focused by this), a notice
 * with focus inside is left where it is (re-showing or moving it would drop that focus), and the notice was already
 * announced when it opened (MatSnackBar uses the live announcer).
 * @returns how many notices were raised
 */
export function raiseNotices(doc: Document): number {
  let raised = 0;
  for (const container of Array.from(doc.querySelectorAll('mat-snack-bar-container'))) {
    const host = overlayHost(container);
    if (!host || host.contains(doc.activeElement)) continue;
    if (host.hasAttribute('popover') && typeof host.showPopover === 'function') {
      try {
        host.hidePopover();
        host.showPopover();
      } catch {
        continue;
      }
    } else if (host.parentElement && host.nextElementSibling) {
      host.parentElement.appendChild(host);
    } else {
      continue;
    }
    raised++;
  }
  return raised;
}

/** The overlay's host: the ancestor that sits directly in the CDK overlay container. */
function overlayHost(el: Element): HTMLElement | null {
  let node: HTMLElement | null = el.parentElement;
  while (node && !node.parentElement?.classList.contains('cdk-overlay-container')) node = node.parentElement;
  return node;
}

/** Raises open notices above each dialog as it opens (started once by SyncService). */
@Injectable({ providedIn: 'root' })
export class NoticeLayer {
  constructor() {
    const doc = inject(DOCUMENT);
    inject(MatDialog)
      .afterOpened.pipe(takeUntilDestroyed())
      .subscribe(() => raiseNotices(doc));
    keepDialogFocus(doc);
  }
}

/**
 * H-198: pressing OK on a notice while a dialog is open removes the focused button, which drops focus to the page
 * (the next Tab then re-enters the dialog). Remember the last element focused inside a dialog; when a notice button
 * is pressed and focus has fallen out of the dialog afterwards, put it back there.
 */
export function keepDialogFocus(doc: Document): void {
  let last: HTMLElement | null = null;
  doc.addEventListener('focusin', (e) => {
    const t = e.target as HTMLElement | null;
    if (t?.closest?.('mat-dialog-container')) last = t;
  });
  doc.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement | null)?.closest?.('mat-snack-bar-container')) return;
    const dialog = doc.querySelector<HTMLElement>('mat-dialog-container');
    if (!dialog) return;
    setTimeout(() => {
      if (dialog.isConnected && !dialog.contains(doc.activeElement)) (last?.isConnected ? last : dialog).focus();
    });
  });
}
