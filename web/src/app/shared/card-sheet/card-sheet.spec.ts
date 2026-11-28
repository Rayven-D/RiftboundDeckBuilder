import { describe, expect, it } from 'vitest';
import { CARD_DIALOG_PANEL, CARD_SHEET_PANEL, PHONE, cardDialogConfig, swipeCloses } from './card-sheet';

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
    expect(c.panelClass).toBe(CARD_DIALOG_PANEL);
    expect(c.autoFocus).toBe('.close-button');
    expect([c.width, c.maxWidth, c.maxHeight]).toEqual([SIZE.width, '100vw', SIZE.maxHeight]);
    expect(c.position).toBeUndefined();
    expect(c.closeOnNavigation).toBe(false); // S7: Back closes the dialog at every width (RJ 2026-11-28)
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
});
