import { DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { DialogHistory, closeOnBack } from '../dialog-history';

/** The phone boundary of SPEC-010 0.17.1 (`max-width: 40rem`), as a media query for TS (SCSS writes it literally). */
export const PHONE = '(max-width: 40rem)';

/** The panel classes every card dialog pane gets; the second one only on phones (the bottom sheet, Brief H-698 S1). */
export const CARD_DIALOG_PANEL = 'card-dialog-panel';
export const CARD_SHEET_PANEL = 'card-sheet-panel';
const CARD_SHEET_BACKDROP = 'card-sheet-backdrop';

/** Sheet height: the dynamic viewport minus the top safe area and a 12 px strip of dimmed page (Brief H-698 S1). */
const SHEET_HEIGHT = 'calc(100dvh - env(safe-area-inset-top) - var(--space-3))';

/** Brief H-698 S6: a release past this distance (or 25% of the sheet height, whichever is less) closes the sheet. */
export const SWIPE_CLOSE_PX = 120;
export const SWIPE_CLOSE_SHARE = 0.25;
/** ... as does a downward flick faster than this, in px/ms. */
export const SWIPE_CLOSE_VELOCITY = 0.5;
/** Movement before a press on the head becomes a drag (so a tap on Close stays a tap). */
const DRAG_SLOP_PX = 6;
/** Upward rubber band, at most. */
const RUBBER_BAND_PX = 8;

/** Desktop / tablet sizes, as each page has them today (unchanged by H-699). */
export interface CardDialogSize {
  readonly width: string;
  readonly maxHeight: string;
}

/**
 * The MatDialog config shared by the four card dialog call sites (Collection, Deck detail, and their two styleguide
 * previews). Phones (Brief H-698 S1, S7, A11y): a full-width bottom sheet of fixed height, no Material scale / fade
 * (the sheet slides, styles.scss), focus on the container so a tap draws no ring on Close. Larger screens: the
 * centred dialog exactly as before. Both: `closeOnNavigation: false`, because Back is handled by `closeOnBack`.
 */
export function cardDialogConfig(phone: boolean, size: CardDialogSize): MatDialogConfig {
  const shared: MatDialogConfig = { closeOnNavigation: false };
  if (phone) {
    return {
      ...shared,
      panelClass: [CARD_DIALOG_PANEL, CARD_SHEET_PANEL],
      backdropClass: ['cdk-overlay-dark-backdrop', CARD_SHEET_BACKDROP],
      autoFocus: 'dialog',
      width: '100vw',
      maxWidth: '100vw',
      height: SHEET_HEIGHT,
      maxHeight: SHEET_HEIGHT,
      position: { bottom: '0' },
      enterAnimationDuration: 0,
      exitAnimationDuration: 0,
    };
  }
  return {
    ...shared,
    panelClass: CARD_DIALOG_PANEL,
    autoFocus: '.close-button',
    width: size.width,
    maxWidth: '100vw',
    maxHeight: size.maxHeight,
  };
}

/** Brief H-698 S6: whether a released drag closes the sheet. */
export function swipeCloses(dy: number, velocity: number, sheetHeight: number): boolean {
  return dy > Math.min(SWIPE_CLOSE_PX, SWIPE_CLOSE_SHARE * sheetHeight) || velocity > SWIPE_CLOSE_VELOCITY;
}

/**
 * Brief H-698 S6 (RJ 2026-11-28): a drag that starts in the body. The body scrolls natively until it is at its top;
 * from there a downward drag moves the sheet. `anchorY` is where the finger was when the top was reached, so the
 * sheet starts from 0 there and never jumps (case b, a drag that began mid-scroll).
 */
export interface BodyDrag {
  readonly startX: number;
  readonly startY: number;
  /** The finger's y at the previous move. */
  lastY: number;
  /** Decided once the finger has moved past the slop: `x` is never captured. */
  axis: 'x' | 'y' | null;
  /** Set while the sheet follows the finger; null while the body scrolls. */
  anchorY: number | null;
}

export function bodyDragStart(x: number, y: number): BodyDrag {
  return { startX: x, startY: y, lastY: y, axis: null, anchorY: null };
}

/**
 * One move of a body drag. Returns the sheet offset to show (px, 0 when the finger went back above the point where
 * the sheet took over, which hands the gesture back to scrolling), or null while the body scrolls as usual: before
 * the slop, sideways, upward, or with the body not at its top (`scrollTop > 0`).
 */
export function bodyDragMove(d: BodyDrag, x: number, y: number, scrollTop: number): number | null {
  if (d.axis === null) {
    const dx = x - d.startX;
    const dy = y - d.startY;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < DRAG_SLOP_PX) {
      d.lastY = y;
      return null;
    }
    d.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
  }
  if (d.axis === 'x') return null;
  if (d.anchorY === null) {
    if (scrollTop > 0 || y <= d.lastY) {
      d.lastY = y;
      return null;
    }
    d.anchorY = d.lastY; // the top is reached: the sheet moves from here
  }
  const offset = y - d.anchorY;
  d.lastY = y;
  if (offset <= 0) {
    d.anchorY = null;
    return 0;
  }
  return offset;
}

const reducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** A CSS time (`220ms`, `0.2s`) in ms; 0 when unreadable. */
function ms(value: string): number {
  const v = value.split(',')[0]?.trim() ?? '';
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return 0;
  return v.endsWith('ms') ? n : n * 1000;
}

/**
 * The bottom-sheet behaviour both card dialogs share (Brief H-698 S2, S6, S7, Motion): the animated close, swipe down
 * on the head, the head divider once the body scrolls, and Back (`closeOnBack`). Create it in the dialog's
 * constructor with the dialog's own close: the sheet calls `report()` to close with the dialog's usual result, so the
 * result contract (`{ entryId | cardId, gone }`) and focus return stay as they are. On larger screens it only adds
 * Back; `dismiss()` closes at once there.
 */
export class CardSheet {
  /** The body has scrolled away from its top: the head shows its divider (S2). */
  readonly scrolled = signal(false);
  readonly history: DialogHistory;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private closing = false;
  private drag: {
    id: number;
    head: HTMLElement | null;
    startY: number;
    dy: number;
    active: boolean;
    samples: { t: number; y: number }[];
  } | null = null;
  /** A drag just ended: the click it may produce must not press Close. */
  private suppressClick = false;
  /** A touch drag that started in the body (S6, RJ 2026-11-28). */
  private bodyDrag: { id: number; body: HTMLElement; state: BodyDrag; samples: { t: number; y: number }[] } | null = null;

  constructor(
    private readonly ref: MatDialogRef<unknown, unknown>,
    private readonly report: () => void,
  ) {
    this.history = closeOnBack(ref, () => this.dismiss());
    // Body drags use touch events: pointer events stop (pointercancel) once the browser starts scrolling the body,
    // touchmove does not, and it can be cancelled to keep the page (pull-to-refresh) out of it while the sheet moves.
    const start = (e: TouchEvent) => this.onBodyTouchStart(e);
    const move = (e: TouchEvent) => this.onBodyTouchMove(e);
    const end = (e: TouchEvent) => this.onBodyTouchEnd(e);
    this.host.addEventListener('touchstart', start, { passive: true });
    this.host.addEventListener('touchmove', move, { passive: false });
    this.host.addEventListener('touchend', end);
    this.host.addEventListener('touchcancel', end);
    inject(DestroyRef).onDestroy(() => {
      this.drag = null;
      this.bodyDrag = null;
      this.host.removeEventListener('touchstart', start);
      this.host.removeEventListener('touchmove', move);
      this.host.removeEventListener('touchend', end);
      this.host.removeEventListener('touchcancel', end);
    });
  }

  private pane(): HTMLElement | null {
    return this.host.closest<HTMLElement>('.cdk-overlay-pane');
  }

  /** True when this dialog is shown as the phone sheet (decided at open by `cardDialogConfig`). */
  isSheet(): boolean {
    return this.pane()?.classList.contains(CARD_SHEET_PANEL) ?? false;
  }

  private backdrop(): HTMLElement | null {
    const all = this.host.ownerDocument.querySelectorAll<HTMLElement>(`.${CARD_SHEET_BACKDROP}`);
    return all.item(all.length - 1);
  }

  /**
   * Close, Back, backdrop, Escape, and a swipe past the threshold. Phones: the sheet slides down (`--dur-med`,
   * `--ease-out`; `--dur-fast` after a swipe, it is already partly off screen) and the backdrop fades, then the result
   * is reported. Reduced motion, larger screens and a second call while closing: at once / nothing.
   */
  dismiss(fast = false): void {
    if (this.closing) return;
    this.closing = true;
    const pane = this.pane();
    if (!pane || !this.isSheet() || reducedMotion()) {
      this.report();
      return;
    }
    const style = getComputedStyle(this.host);
    const dur = style.getPropertyValue(fast ? '--dur-fast' : '--dur-med').trim();
    const ease = style.getPropertyValue('--ease-out').trim();
    const time = ms(dur);
    if (time <= 0) {
      this.report();
      return;
    }
    const transition = `transform ${dur} ${ease}, opacity ${dur} ${ease}`;
    pane.style.animation = 'none';
    pane.style.transition = transition;
    pane.style.transform = 'translateY(100%)';
    const backdrop = this.backdrop();
    if (backdrop) {
      backdrop.style.animation = 'none';
      backdrop.style.transition = transition;
      backdrop.style.opacity = '0';
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      this.report();
    };
    pane.addEventListener('transitionend', (e) => e.target === pane && e.propertyName === 'transform' && finish());
    setTimeout(finish, time + 60); // no transitionend (e.g. the transform did not change)
  }

  /** The body's scroll listener (S2 divider). */
  onBodyScroll(e: Event): void {
    this.scrolled.set((e.target as HTMLElement).scrollTop > 0);
  }

  // ---------------------------------------------------------------- swipe down (S6)

  /**
   * `pointerdown` on the head (handle + title row). The rest of the gesture is followed on the window: the finger
   * may leave the head before the drag starts (the pointer is captured only then, so a tap on Close stays a click).
   */
  onPointerDown(e: PointerEvent): void {
    if (!this.isSheet() || this.closing || this.drag || !e.isPrimary || e.button !== 0) return;
    const head = e.currentTarget as HTMLElement | null;
    const win = this.host.ownerDocument.defaultView;
    if (!win) return;
    const move = (ev: PointerEvent) => this.onPointerMove(ev);
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      win.removeEventListener('pointermove', move);
      win.removeEventListener('pointerup', up);
      win.removeEventListener('pointercancel', up);
      this.onPointerUp(ev);
    };
    win.addEventListener('pointermove', move);
    win.addEventListener('pointerup', up);
    win.addEventListener('pointercancel', up);
    this.drag = { id: e.pointerId, head, startY: e.clientY, dy: 0, active: false, samples: [{ t: e.timeStamp, y: e.clientY }] };
  }

  private onPointerMove(e: PointerEvent): void {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    const raw = e.clientY - d.startY;
    if (!d.active) {
      if (Math.abs(raw) < DRAG_SLOP_PX) return;
      d.active = true;
      try {
        d.head?.setPointerCapture?.(e.pointerId);
      } catch {
        // the pointer is already gone; the window listeners still end the drag
      }
    }
    d.dy = raw >= 0 ? raw : -Math.min(RUBBER_BAND_PX, -raw / 4);
    d.samples.push({ t: e.timeStamp, y: e.clientY });
    if (d.samples.length > 5) d.samples.shift();
    this.follow(d.dy);
  }

  /** The sheet follows the finger 1:1, no transition; the backdrop fades in proportion. */
  private follow(dy: number): void {
    const pane = this.pane();
    if (!pane) return;
    pane.style.animation = 'none';
    pane.style.transition = 'none';
    pane.style.transform = dy ? `translateY(${dy}px)` : '';
    const backdrop = this.backdrop();
    if (backdrop) {
      backdrop.style.animation = 'none';
      backdrop.style.transition = 'none';
      backdrop.style.opacity = String(Math.max(0, 1 - Math.max(0, dy) / (pane.offsetHeight || 1)));
    }
  }

  /** End of a drag: close past the threshold or on a flick, else snap back (instant under reduced motion). */
  private release(dy: number, samples: { t: number; y: number }[], cancelled: boolean): void {
    const pane = this.pane();
    if (!pane) return;
    const first = samples[0];
    const last = samples[samples.length - 1];
    const velocity = first && last && last.t > first.t ? (last.y - first.y) / (last.t - first.t) : 0;
    if (!cancelled && swipeCloses(dy, velocity, pane.offsetHeight)) {
      this.dismiss(true);
      return;
    }
    const style = getComputedStyle(this.host);
    const t = `${style.getPropertyValue('--dur-med').trim() || '0ms'} ${style.getPropertyValue('--ease-out').trim()}`;
    pane.style.transition = `transform ${t}`;
    pane.style.transform = '';
    const backdrop = this.backdrop();
    if (backdrop) {
      backdrop.style.transition = `opacity ${t}`;
      backdrop.style.opacity = '';
    }
  }

  // ---------------------------------------------------------------- swipe down from the body (S6, RJ 2026-11-28)

  private onBodyTouchStart(e: TouchEvent): void {
    this.bodyDrag = null;
    if (e.touches.length !== 1 || this.closing || this.drag || !this.isSheet()) return;
    const body = this.host.querySelector<HTMLElement>('.sheet-body');
    const t = e.touches[0];
    if (!body || !body.contains(e.target as Node)) return;
    this.bodyDrag = { id: t.identifier, body, state: bodyDragStart(t.clientX, t.clientY), samples: [] };
  }

  private onBodyTouchMove(e: TouchEvent): void {
    const d = this.bodyDrag;
    if (!d) return;
    if (e.touches.length !== 1) return this.endBodyDrag(true);
    const t = Array.from(e.changedTouches).find((c) => c.identifier === d.id);
    if (!t) return;
    const wasDragging = d.state.anchorY !== null;
    const offset = bodyDragMove(d.state, t.clientX, t.clientY, d.body.scrollTop);
    if (offset === null) {
      // Still scrolling. At the top, a downward move inside the slop is cancelled so the browser never starts its
      // own overscroll / pull-to-refresh for this touch (a tap that jitters a pixel still clicks).
      const s = d.state;
      if (s.axis === null && d.body.scrollTop <= 0 && t.clientY > s.startY && e.cancelable) e.preventDefault();
      return;
    }
    if (e.cancelable) e.preventDefault();
    d.body.classList.add('sheet-body--dragging');
    if (!wasDragging || offset === 0) d.samples = [];
    d.samples.push({ t: e.timeStamp, y: t.clientY });
    if (d.samples.length > 5) d.samples.shift();
    this.follow(offset);
  }

  private onBodyTouchEnd(e: TouchEvent): void {
    const d = this.bodyDrag;
    if (!d || !Array.from(e.changedTouches).some((c) => c.identifier === d.id)) return;
    this.endBodyDrag(e.type === 'touchcancel');
  }

  private endBodyDrag(cancelled: boolean): void {
    const d = this.bodyDrag;
    if (!d) return;
    this.bodyDrag = null;
    d.body.classList.remove('sheet-body--dragging');
    const s = d.state;
    if (s.anchorY === null) return; // the body only scrolled (or it was a tap)
    this.release(s.lastY - s.anchorY, d.samples, cancelled);
  }

  /** `pointerup` / `pointercancel` anywhere, for the drag in progress. */
  private onPointerUp(e: PointerEvent): void {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    this.drag = null;
    if (!d.active) return; // a tap: Close's own click handles it
    this.suppressClick = true;
    setTimeout(() => (this.suppressClick = false), 0);
    this.release(d.dy, d.samples, e.type === 'pointercancel');
  }

  /** Close's click: true when it is the click a drag ended with (a drag released on Close must not close). */
  swallowClick(): boolean {
    const swallow = this.suppressClick;
    this.suppressClick = false;
    return swallow;
  }
}
