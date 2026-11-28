import { Component, ElementRef, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MAT_SNACK_BAR_DATA,
  MatSnackBar,
  MatSnackBarAction,
  MatSnackBarActions,
  MatSnackBarLabel,
  MatSnackBarRef,
  SimpleSnackBar,
  TextOnlySnackBar,
} from '@angular/material/snack-bar';
import { tokenTransition } from '../motion';
import { SwipeAxis, swipeAxis, swipeRelease } from './swipe';

/** The plain notices' dismiss button (H-680). An action passed as "OK" is that same button. */
export const NOTICE_OK = 'OK';

/**
 * H-680 (RJ, 2026-11-26): the one notice component every `MatSnackBar.open()` renders (see `injectNotices`).
 * - A notice **with** an action (Undo, View deck, Open, …) shows only that action; one **without** shows **OK**,
 *   which closes it at once. Either button is at least 44 × 44 px (H-149) and reachable with Tab.
 * - Touch: a horizontal swipe left or right past 30 % of the width (or a fast flick) slides it out and closes it like
 *   OK (never the action: the change behind an Undo stays); below that it snaps back. `touch-action: pan-y` and a
 *   mostly-horizontal start leave vertical scrolling alone. Reduced motion: it closes without the slide.
 * - OK or a swipe that closes it gives focus back to where it was before (a dialog keeps its focus, H-198).
 * Durations, politeness (`aria-live`) and the top placement stay with the caller's options (`noticeOptions`).
 */
@Component({
  selector: 'app-notice',
  imports: [MatButton, MatSnackBarLabel, MatSnackBarActions, MatSnackBarAction],
  host: {
    // `mat-mdc-simple-snack-bar`: Material's own layout rules for its text-only notice (label, actions) still apply.
    class: 'app-notice mat-mdc-simple-snack-bar',
    '(pointerdown)': 'down($event)',
    '(pointermove)': 'move($event)',
    '(pointerup)': 'up($event)',
    '(pointercancel)': 'reset()',
    '(focusin)': 'focusIn($event)',
  },
  template: `
    <div matSnackBarLabel>{{ data.message }}</div>
    <div matSnackBarActions>
      <button matButton matSnackBarAction type="button" class="notice-button" (click)="press()">{{ label }}</button>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      touch-action: pan-y;
    }
    :host .mat-mdc-snack-bar-label {
      max-height: 50vh;
      overflow: auto;
    }
    .notice-button {
      min-width: 44px;
      min-height: 44px;
    }
  `,
})
export class NoticeSnackBar implements TextOnlySnackBar {
  readonly snackBarRef = inject<MatSnackBarRef<NoticeSnackBar>>(MatSnackBarRef);
  readonly data = inject<{ message: string; action: string }>(MAT_SNACK_BAR_DATA);
  /** A real action (not empty, not "OK"): shown alone, no OK. */
  readonly hasAction = !!this.data.action && this.data.action !== NOTICE_OK;
  protected readonly label = this.hasAction ? this.data.action : NOTICE_OK;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  /** Where focus was before it entered the notice. */
  private before: HTMLElement | null = null;
  private drag: { id: number; x: number; y: number; t: number; axis: SwipeAxis; dx: number } | null = null;
  private closing = false;

  constructor() {
    this.snackBarRef.afterDismissed().subscribe(({ dismissedByAction }) => {
      const doc = this.host.ownerDocument;
      const lost = !doc.activeElement || doc.activeElement === doc.body || this.host.contains(doc.activeElement);
      if (!dismissedByAction && lost && this.before?.isConnected) this.before.focus();
    });
  }

  /** TextOnlySnackBar: the action button. */
  action(): void {
    this.snackBarRef.dismissWithAction();
  }

  protected press(): void {
    if (this.hasAction) this.action();
    else this.close();
  }

  /** OK and swipe: closes without the action. */
  close(): void {
    if (this.closing) return;
    this.closing = true;
    this.snackBarRef.dismiss();
  }

  protected focusIn(e: FocusEvent): void {
    const from = e.relatedTarget;
    if (from instanceof HTMLElement && !this.host.contains(from)) this.before = from;
  }

  protected down(e: PointerEvent): void {
    if (e.pointerType === 'mouse' || this.closing || this.drag) return;
    this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, axis: 'pending', dx: 0 };
  }

  protected move(e: PointerEvent): void {
    const d = this.drag;
    if (!d || e.pointerId !== d.id || d.axis === 'scroll') return;
    const dx = e.clientX - d.x;
    if (d.axis === 'pending') {
      d.axis = swipeAxis(dx, e.clientY - d.y);
      if (d.axis === 'scroll') return;
      if (d.axis === 'swipe') this.host.setPointerCapture?.(e.pointerId);
    }
    if (d.axis !== 'swipe') return;
    d.dx = dx;
    const s = this.surface().style;
    s.transition = 'none';
    s.transform = `translateX(${dx}px)`;
    s.opacity = String(Math.max(0.4, 1 - Math.abs(dx) / Math.max(this.width(), 1)));
  }

  protected up(e: PointerEvent): void {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    this.drag = null;
    if (d.axis !== 'swipe') return;
    if (swipeRelease(d.dx, this.width(), e.timeStamp - d.t) === 'snap') return this.reset();
    if (reducedMotion()) return this.close();
    // Brief H-716 S7: the slide-out and the snap-back use the motion tokens (`--dur-fast`, `--ease-out`).
    const surface = this.surface();
    const slide = tokenTransition(surface, ['transform', 'opacity'], '--dur-fast');
    const s = surface.style;
    s.transition = slide.transition;
    s.transform = `translateX(${d.dx < 0 ? '-' : ''}120%)`;
    s.opacity = '0';
    setTimeout(() => this.close(), slide.ms);
  }

  /** Below the threshold (or a cancelled pointer): back to its place. */
  reset(): void {
    this.drag = null;
    const surface = this.surface();
    const s = surface.style;
    s.transition = reducedMotion() ? 'none' : tokenTransition(surface, ['transform', 'opacity'], '--dur-fast').transition;
    s.transform = '';
    s.opacity = '';
  }

  /** The visible notice (Material's container), so its background moves with the text. */
  private surface(): HTMLElement {
    return this.host.closest<HTMLElement>('.mat-mdc-snack-bar-container') ?? this.host;
  }

  private width(): number {
    return this.surface().getBoundingClientRect().width;
  }
}

function reducedMotion(): boolean {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * H-680: `inject(MatSnackBar)` with every `open(message, action?, options)` rendered by `NoticeSnackBar` (OK, swipe).
 * Used instead of `inject(MatSnackBar)` everywhere; set per call site, not in app.config, so the snack-bar code stays
 * out of the initial bundle (H-671).
 */
export function injectNotices(): MatSnackBar {
  const snackBar = inject(MatSnackBar);
  snackBar.simpleSnackBarComponent = NoticeSnackBar as unknown as typeof SimpleSnackBar;
  return snackBar;
}
