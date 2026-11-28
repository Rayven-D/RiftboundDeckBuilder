import { describe, expect, it } from 'vitest';
import { CARD_DIALOG_PANEL, CARD_DIALOG_RESTORED, CARD_SHEET_PANEL, PHONE, bodyDragMove, bodyDragStart, cardDialogConfig, swipeCloses } from './card-sheet';

/** H-699 (Brief H-698): the pure parts of the phone sheet. Drag, animation and Back are in e2e/card-sheet.e2e.ts. */
const SIZE = { width: 'min(44rem, 90vw)', maxHeight: 'min(90svh, 52rem)' };

describe('H-699 card sheet (Brief H-698)', () => {
  it('SPEC-010 0.17.1: the phone query is max-width 40rem', () => {
    expect(PHONE).toBe('(max-width: 40rem)');
  });

  it('S1 / AC 1 / AC 10 / AC 16: phones get the bottom sheet, focus on the container, no Material animation', () => {
    const c = cardDialogConfig(true, SIZE);
    expect(c.panelClass).toEqual([CARD_DIALOG_PANEL, CARD_SHEET_PANEL]);
    expect(c.position).toEqual({ bottom: '0' });
    expect(c.width).toBe('100vw');
    expect(c.height).toBe('calc(100dvh - env(safe-area-inset-top) - var(--space-3))');
    expect(c.maxHeight).toBe(c.height);
    expect(c.autoFocus).toBe('dialog');
    expect([c.enterAnimationDuration, c.exitAnimationDuration]).toEqual([0, 0]);
    expect(c.closeOnNavigation).toBe(false); // Back is closeOnBack's (S7)
  });

  it('AC 20: larger screens keep the centred dialog with the page sizes and focus on Close', () => {
    const c = cardDialogConfig(false, SIZE);
    expect(c.panelClass).toEqual([CARD_DIALOG_PANEL]);
    expect(c.autoFocus).toBe('.close-button');
    expect([c.width, c.maxWidth, c.maxHeight]).toEqual([SIZE.width, '100vw', SIZE.maxHeight]);
    expect(c.position).toBeUndefined();
    expect(c.closeOnNavigation).toBe(false); // S7: Back closes the dialog at every width (RJ 2026-11-28)
  });

  it('H-716 check 3 (S2): a dialog reopened by Back gets the restored class at every width (fade in place)', () => {
    expect(cardDialogConfig(true, SIZE, true).panelClass).toEqual([CARD_DIALOG_PANEL, CARD_SHEET_PANEL, CARD_DIALOG_RESTORED]);
    expect(cardDialogConfig(false, SIZE, true).panelClass).toEqual([CARD_DIALOG_PANEL, CARD_DIALOG_RESTORED]);
  });

  it('S6 / AC 11: release closes past min(120 px, 25% of the height) or after a flick faster than 0.5 px/ms', () => {
    expect(swipeCloses(119, 0.1, 800)).toBe(false);
    expect(swipeCloses(121, 0.1, 800)).toBe(true);
    expect(swipeCloses(101, 0.1, 400)).toBe(true); // 25% of 400 = 100
    expect(swipeCloses(99, 0.1, 400)).toBe(false);
    expect(swipeCloses(30, 0.6, 800)).toBe(true);
    expect(swipeCloses(30, 0.5, 800)).toBe(false);
    expect(swipeCloses(-8, 0, 800)).toBe(false);
  });

  describe('S6 swipe down from the body (RJ 2026-11-28)', () => {
    it('(a) body at its top: a downward drag moves the sheet from where the drag passed the slop', () => {
      const d = bodyDragStart(100, 300);
      expect(bodyDragMove(d, 100, 303, 0)).toBeNull(); // inside the slop
      expect(bodyDragMove(d, 101, 310, 0)).toBe(7); // anchored at the previous move (303), no jump
      expect(bodyDragMove(d, 101, 450, 0)).toBe(147);
    });

    it('(b) mid-scroll: the body scrolls until its top, then the same drag moves the sheet from that point', () => {
      const d = bodyDragStart(100, 200);
      expect(bodyDragMove(d, 100, 260, 240)).toBeNull(); // scrolling up the content
      expect(bodyDragMove(d, 100, 400, 40)).toBeNull();
      expect(bodyDragMove(d, 100, 420, 0)).toBe(20); // top reached at 400: offset from there
      expect(bodyDragMove(d, 100, 560, 0)).toBe(160);
    });

    it('mid-scroll drag that stops before (or just after) the top never moves the sheet past a few px', () => {
      const d = bodyDragStart(100, 200);
      expect(bodyDragMove(d, 100, 300, 500)).toBeNull();
      expect(bodyDragMove(d, 100, 380, 300)).toBeNull();
      expect(d.anchorY).toBeNull();
    });

    it('upward drags, sideways drags and a return above the take-over point hand the gesture to scrolling', () => {
      const up = bodyDragStart(100, 400);
      expect(bodyDragMove(up, 100, 300, 0)).toBeNull();
      expect(bodyDragMove(up, 100, 200, 0)).toBeNull();
      const side = bodyDragStart(100, 400);
      expect(bodyDragMove(side, 160, 420, 0)).toBeNull();
      expect(bodyDragMove(side, 220, 600, 0)).toBeNull(); // the axis stays x for the whole touch
      const back = bodyDragStart(100, 300);
      expect(bodyDragMove(back, 100, 320, 0)).toBe(20);
      expect(bodyDragMove(back, 100, 290, 0)).toBe(0); // the sheet is back at 0; the body may scroll again
      expect(back.anchorY).toBeNull();
      expect(bodyDragMove(back, 100, 250, 0)).toBeNull();
    });
  });
});
