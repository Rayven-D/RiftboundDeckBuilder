/**
 * H-680 (SPEC-010 SYNC-162, AC 89; RJ 2026-11-26): every notice can be dismissed at once. A notice without an action
 * shows OK (44 px), one with an action shows only that action, and on touch any notice can be swiped away (past 30 %
 * of its width or a fast flick; a short slow drag snaps back). A swipe never runs the action.
 */
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MatSnackBar, MatSnackBarRef } from '@angular/material/snack-bar';
import { noticeOptions } from '../sync/notice';
import { NOTICE_OK, injectNotices } from './notice-snack-bar';
import { SWIPE_SLOP_PX, swipeAxis, swipeRelease } from './swipe';

const clean = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();
const container = () => document.querySelector<HTMLElement>('mat-snack-bar-container');
const notice = () => document.querySelector<HTMLElement>('app-notice');
const buttons = () => Array.from(container()?.querySelectorAll('button') ?? []).map((b) => clean(b.textContent));
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

let snackBar: MatSnackBar;

beforeEach(() => {
  TestBed.configureTestingModule({ providers: [{ provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } }] });
  snackBar = TestBed.runInInjectionContext(() => injectNotices());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  snackBar.dismiss();
  document.querySelectorAll('.cdk-overlay-container').forEach((n) => (n.innerHTML = ''));
});

async function opened<T>(ref: MatSnackBarRef<T>): Promise<MatSnackBarRef<T>> {
  await vi.waitFor(() => expect(notice()).not.toBeNull());
  return ref;
}

function pointer(type: string, x: number, y = 0): PointerEvent {
  return new PointerEvent(type, { bubbles: true, clientX: x, clientY: y, pointerId: 7, pointerType: 'touch' });
}

/** A touch drag of `dx` px on the notice, released after `ms`. */
async function swipe(dx: number, ms: number, dy = 0): Promise<void> {
  const el = notice()!;
  el.dispatchEvent(pointer('pointerdown', 100, 50));
  for (let i = 1; i <= 4; i++) el.dispatchEvent(pointer('pointermove', 100 + (dx * i) / 4, 50 + (dy * i) / 4));
  await tick(ms);
  el.dispatchEvent(pointer('pointerup', 100 + dx, 50 + dy));
  await tick(200); // the slide-out
}

describe('H-680 swipe thresholds (pure)', () => {
  it('H-680 a drag is a swipe only when mostly horizontal past the slop; vertical is left to scrolling', () => {
    expect(swipeAxis(SWIPE_SLOP_PX - 1, 2)).toBe('pending');
    expect(swipeAxis(20, 4)).toBe('swipe');
    expect(swipeAxis(-20, 4)).toBe('swipe');
    expect(swipeAxis(6, 20)).toBe('scroll');
    expect(swipeAxis(12, 10)).toBe('scroll');
  });

  it('H-680 release: 30 % of the width or a fast flick dismisses; a short slow drag snaps back', () => {
    expect(swipeRelease(90, 300, 1000)).toBe('dismiss');
    expect(swipeRelease(-90, 300, 1000)).toBe('dismiss');
    expect(swipeRelease(89, 300, 1000)).toBe('snap');
    expect(swipeRelease(60, 300, 50)).toBe('dismiss'); // 1.2 px/ms flick
    expect(swipeRelease(20, 300, 10)).toBe('snap'); // too short to be a flick
  });
});

describe('H-680 notice buttons and swipe', () => {
  it('H-680 a plain notice (no action) shows OK, 44 px, with the name "OK"; OK closes it at once', async () => {
    const ref = await opened(snackBar.open('Test data loaded.', undefined, noticeOptions('success')));
    expect(clean(container()!.textContent)).toContain('Test data loaded.');
    expect(buttons()).toEqual([NOTICE_OK]);
    const ok = container()!.querySelector<HTMLButtonElement>('button')!;
    expect(ok.classList).toContain('notice-button');
    expect(document.activeElement).not.toBe(ok); // opening never moves focus (SYNC-087)
    const dismissed = vi.fn();
    ref.afterDismissed().subscribe(dismissed);
    ok.click();
    await vi.waitFor(() => expect(dismissed).toHaveBeenCalledWith({ dismissedByAction: false }));
  });

  it('H-680 an action passed as "OK" is the same single OK button', async () => {
    await opened(snackBar.open("Couldn't save.", 'OK', noticeOptions('error')));
    expect(buttons()).toEqual([NOTICE_OK]);
  });

  it('H-680 a notice with an action (Undo) shows only the action, no OK; the action runs it', async () => {
    const ref = await opened(snackBar.open('Deck deleted.', 'Undo', { duration: 10_000, politeness: 'polite' }));
    expect(buttons()).toEqual(['Undo']);
    const action = vi.fn();
    ref.onAction().subscribe(action);
    container()!.querySelector<HTMLButtonElement>('button')!.click();
    await vi.waitFor(() => expect(action).toHaveBeenCalledTimes(1));
  });

  it('H-680 OK gives focus back to where it was (a dialog keeps its focus)', async () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    await opened(snackBar.open('Saved.', undefined, noticeOptions('info')));
    const ok = container()!.querySelector<HTMLButtonElement>('button')!;
    ok.focus();
    expect(document.activeElement).toBe(ok);
    ok.click();
    await vi.waitFor(() => expect(notice()).toBeNull());
    expect(document.activeElement).toBe(input);
    input.remove();
  });

  it('H-680 a swipe past 30 % of the width dismisses the notice, left or right', async () => {
    for (const dx of [140, -140]) {
      const ref = await opened(snackBar.open('Saved.', undefined, noticeOptions('info')));
      vi.spyOn(container()!, 'getBoundingClientRect').mockReturnValue({ width: 300 } as DOMRect);
      const dismissed = vi.fn();
      ref.afterDismissed().subscribe(dismissed);
      await swipe(dx, 400);
      await vi.waitFor(() => expect(dismissed).toHaveBeenCalledWith({ dismissedByAction: false }));
    }
  });

  it('H-680 a short slow drag snaps back and the notice stays', async () => {
    const ref = await opened(snackBar.open('Saved.', undefined, noticeOptions('info')));
    vi.spyOn(container()!, 'getBoundingClientRect').mockReturnValue({ width: 300 } as DOMRect);
    const dismissed = vi.fn();
    ref.afterDismissed().subscribe(dismissed);
    await swipe(40, 400);
    expect(dismissed).not.toHaveBeenCalled();
    expect(notice()).not.toBeNull();
    expect(container()!.style.transform).toBe('');
  });

  it('H-680 a vertical drag is a scroll: the notice does not move or close', async () => {
    const ref = await opened(snackBar.open('Saved.', undefined, noticeOptions('info')));
    vi.spyOn(container()!, 'getBoundingClientRect').mockReturnValue({ width: 300 } as DOMRect);
    const dismissed = vi.fn();
    ref.afterDismissed().subscribe(dismissed);
    await swipe(10, 400, 160);
    expect(dismissed).not.toHaveBeenCalled();
    expect(container()!.style.transform).toBe('');
  });

  it('H-680 swiping an Undo notice closes it without undoing', async () => {
    const ref = await opened(snackBar.open('Deck deleted.', 'Undo', { duration: 10_000, politeness: 'polite' }));
    vi.spyOn(container()!, 'getBoundingClientRect').mockReturnValue({ width: 300 } as DOMRect);
    const action = vi.fn();
    const dismissed = vi.fn();
    ref.onAction().subscribe(action);
    ref.afterDismissed().subscribe(dismissed);
    await swipe(-150, 400);
    await vi.waitFor(() => expect(dismissed).toHaveBeenCalledWith({ dismissedByAction: false }));
    expect(action).not.toHaveBeenCalled();
  });

  it('H-680 with reduced motion a swipe closes without the slide', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }) as MediaQueryList);
    const ref = await opened(snackBar.open('Saved.', undefined, noticeOptions('info')));
    vi.spyOn(container()!, 'getBoundingClientRect').mockReturnValue({ width: 300 } as DOMRect);
    const dismissed = vi.fn();
    ref.afterDismissed().subscribe(dismissed);
    const el = notice()!;
    el.dispatchEvent(pointer('pointerdown', 100));
    el.dispatchEvent(pointer('pointermove', 250));
    await tick(300);
    el.dispatchEvent(pointer('pointerup', 250));
    expect(container()!.style.transform).not.toContain('120%');
    await vi.waitFor(() => expect(dismissed).toHaveBeenCalled());
  });

  it('H-680 a mouse drag does nothing (swipe is for touch)', async () => {
    const ref = await opened(snackBar.open('Saved.', undefined, noticeOptions('info')));
    vi.spyOn(container()!, 'getBoundingClientRect').mockReturnValue({ width: 300 } as DOMRect);
    const dismissed = vi.fn();
    ref.afterDismissed().subscribe(dismissed);
    const el = notice()!;
    const mouse = (type: string, x: number) =>
      new PointerEvent(type, { bubbles: true, clientX: x, pointerId: 1, pointerType: 'mouse' });
    el.dispatchEvent(mouse('pointerdown', 0));
    el.dispatchEvent(mouse('pointermove', 200));
    el.dispatchEvent(mouse('pointerup', 200));
    await tick(200);
    expect(dismissed).not.toHaveBeenCalled();
  });
});
