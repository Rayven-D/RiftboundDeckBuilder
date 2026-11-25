/** H-189 finding 9 (RJ 2026-11-25): notices show above a dialog opened after them, without taking focus. */
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoticeLayer, raiseNotices } from './notice-layer';

@Component({ template: '<input aria-label="Field" />' })
class FieldDialog {}

const container = () => document.querySelector('.cdk-overlay-container')!;
const hostOf = (selector: string) =>
  Array.from(container().children).find((c) => c.querySelector(selector)) as HTMLElement | undefined;

describe('H-189 notices above dialogs (raiseNotices, NoticeLayer)', () => {
  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
    TestBed.inject(MatSnackBar).dismiss();
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => (el.innerHTML = ''));
    document.body.querySelectorAll(':scope > .fixture').forEach((el) => el.remove());
  });

  function overlayDom(): { overlays: HTMLElement; notice: HTMLElement; dialog: HTMLElement } {
    const overlays = document.createElement('div');
    overlays.className = 'cdk-overlay-container fixture';
    const notice = document.createElement('div');
    notice.innerHTML = '<div class="cdk-overlay-pane"><mat-snack-bar-container><button>OK</button></mat-snack-bar-container></div>';
    const dialog = document.createElement('div');
    dialog.innerHTML = '<div class="cdk-overlay-pane"><mat-dialog-container></mat-dialog-container></div>';
    overlays.append(notice, dialog);
    document.body.appendChild(overlays);
    return { overlays, notice, dialog };
  }

  it('H-189 without popover support: the notice host moves after the dialog in the overlay container', () => {
    const { overlays, notice } = overlayDom();
    expect(raiseNotices(document)).toBe(1);
    expect(overlays.lastElementChild).toBe(notice);
  });

  it('H-189 with popover (top layer): the notice is hidden and shown again, which puts it on top', () => {
    const { notice } = overlayDom();
    notice.setAttribute('popover', 'manual');
    const calls: string[] = [];
    Object.assign(notice, { hidePopover: () => calls.push('hide'), showPopover: () => calls.push('show') });
    expect(raiseNotices(document)).toBe(1);
    expect(calls).toEqual(['hide', 'show']);
  });

  it('H-189 a notice with focus inside (its OK button) is left alone, so its focus is never dropped', () => {
    const { overlays, notice } = overlayDom();
    notice.querySelector('button')!.focus();
    expect(raiseNotices(document)).toBe(0);
    expect(overlays.firstElementChild).toBe(notice);
    expect(document.activeElement).toBe(notice.querySelector('button'));
  });

  it('H-189 / SYNC-159 "You\'re signed in." then a dialog: the notice ends up above it and focus stays in the dialog', async () => {
    TestBed.configureTestingModule({ providers: [{ provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } }] });
    TestBed.inject(NoticeLayer);
    TestBed.inject(MatSnackBar).open("You're signed in.", 'OK', { duration: 6000, politeness: 'polite' });
    await new Promise((r) => setTimeout(r));
    const ref = TestBed.inject(MatDialog).open(FieldDialog, { autoFocus: 'input' });
    await new Promise((r) => setTimeout(r));
    const hosts = Array.from(container().children);
    expect(hosts.indexOf(hostOf('mat-snack-bar-container')!)).toBeGreaterThan(hosts.indexOf(hostOf('mat-dialog-container')!));
    expect(ref.componentRef!.location.nativeElement.closest('mat-dialog-container')!.contains(document.activeElement)).toBe(true);
    expect(hostOf('mat-snack-bar-container')!.contains(document.activeElement)).toBe(false);
  });
});
