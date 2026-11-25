/**
 * SPEC-010 v0.10 SYNC-006 / SYNC-005, built from brain/04-UI/Brief H-140 H-125 H-108.md:
 * - H-125 (decision 11): focus returns to the Sign in button that opened the dialog (header or gate panel)
 *   after the failure and sent paths, with a fallback when focus was lost.
 * - H-108 (decisions 12-14, AC 39): a link opened on another device asks with the Material ConfirmEmailDialog.
 */
import { InteractivityChecker } from '@angular/cdk/a11y';
import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AccountMenu } from './account-menu';
import { SignInPanel } from './sign-in-panel';
import { CONFIRM_EMAIL_TEXT } from './sync-dialogs';
import { SYNC_ADAPTERS, SyncService, focusDocumentStart, refocusAfterDialog } from './sync.service';
import type { SyncEngine } from '../../shared/sync/sync-engine';

const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const buttons = (root: ParentNode) => Array.from(root.querySelectorAll<HTMLButtonElement>('button'));
const button = (root: ParentNode, label: string) => buttons(root).find((b) => text(b) === label);
const flush = () => new Promise((r) => setTimeout(r));
const pane = () => document.querySelector<HTMLElement>('.cdk-overlay-container mat-dialog-container');

/** jsdom has no layout; only visibility is faked so `autoFocus: 'first-tabbable'` finds the field. */
@Injectable()
class VisibleInteractivityChecker extends InteractivityChecker {
  override isVisible(): boolean {
    return true;
  }
}

function configure(): void {
  localStorage.clear();
  TestBed.configureTestingModule({
    providers: [
      {
        provide: SYNC_ADAPTERS,
        useValue: async () => {
          throw new Error('not in unit tests'); // so a real Send link fails (the H-106 failure path)
        },
      },
      { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
      { provide: InteractivityChecker, useClass: VisibleInteractivityChecker },
    ],
  });
}

function escape(): void {
  const target = document.activeElement ?? document.body;
  const e = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
  Object.defineProperty(e, 'keyCode', { get: () => 27 }); // CDK reads keyCode
  target.dispatchEvent(e);
}

/** The dialog's field once it has focus. */
async function openField(): Promise<HTMLInputElement> {
  await vi.waitFor(() => expect(document.activeElement?.matches('mat-dialog-container input')).toBe(true), { timeout: 2000 });
  return document.activeElement as HTMLInputElement;
}

async function typeAndSend(input: HTMLInputElement, value: string): Promise<void> {
  input.value = value;
  input.dispatchEvent(new Event('input'));
  await flush();
  input.closest('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
}

async function closed(): Promise<void> {
  await vi.waitFor(() => expect(pane()).toBeNull(), { timeout: 2000 });
  await flush();
}

describe('H-125 focus returns to the Sign in trigger (SPEC-010 SYNC-006)', () => {
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => (el.innerHTML = ''));
    document.getElementById('main')?.remove();
    localStorage.clear();
  });

  async function header() {
    configure();
    const fixture = TestBed.createComponent(AccountMenu);
    await fixture.whenStable();
    const trigger = button(fixture.nativeElement as HTMLElement, 'Sign in')!;
    return { fixture, trigger };
  }

  async function panel() {
    configure();
    const sync = TestBed.inject(SyncService); // registers the gate actions, as the app shell does
    const fixture = TestBed.createComponent(SignInPanel);
    await fixture.whenStable();
    const trigger = button(fixture.nativeElement as HTMLElement, 'Sign in')!;
    return { fixture, trigger, sync };
  }

  it('H-125 header Sign in (mouse-opened): Escape after a failed Send link returns focus to the header button', async () => {
    const { trigger } = await header();
    trigger.click(); // click() does not focus, like a mouse click in Safari
    const input = await openField();
    await typeAndSend(input, 'rj@example.com');
    await vi.waitFor(() => expect(pane()!.querySelector('.error')).not.toBeNull(), { timeout: 2000 });
    escape();
    await closed();
    expect(document.activeElement).toBe(trigger);
  });

  it('H-125 header Sign in: Close after a successful send (sent state) returns focus to the header button', async () => {
    const { trigger } = await header();
    vi.spyOn(TestBed.inject(SyncService), 'sendEmailLink').mockResolvedValue();
    trigger.focus();
    trigger.click();
    await typeAndSend(await openField(), 'rj@example.com');
    await vi.waitFor(() => expect(document.activeElement?.classList.contains('sent-line')).toBe(true), { timeout: 2000 });
    button(pane()!, 'Close')!.click();
    await closed();
    expect(document.activeElement).toBe(trigger);
  });

  it('H-125 panel Sign in: Escape after a failed Send link returns focus to the panel button', async () => {
    const { trigger } = await panel();
    trigger.click();
    await typeAndSend(await openField(), 'rj@example.com');
    await vi.waitFor(() => expect(pane()!.querySelector('.error')).not.toBeNull(), { timeout: 2000 });
    escape();
    await closed();
    expect(document.activeElement).toBe(trigger);
  });

  it('H-125 panel Sign in: Escape after Send again in the sent state returns focus to the panel button', async () => {
    const { trigger, sync } = await panel();
    vi.spyOn(sync, 'sendEmailLink').mockResolvedValue();
    trigger.click();
    await typeAndSend(await openField(), 'rj@example.com');
    await vi.waitFor(() => expect(pane()!.querySelector('.sent-line')).not.toBeNull(), { timeout: 2000 });
    const resend = button(pane()!, 'Send again')!;
    resend.focus();
    resend.click();
    await vi.waitFor(() => expect(text(pane()!.querySelector('.sent-line'))).toContain('a new sign-in link'), { timeout: 2000 });
    escape();
    await closed();
    expect(document.activeElement).toBe(trigger);
  });

  it('H-125 when the trigger is gone after close (the panel re-rendered), focus goes to #main, not <body>', async () => {
    configure();
    const main = document.createElement('main');
    main.id = 'main';
    main.tabIndex = -1;
    const trigger = document.createElement('button');
    main.append(trigger);
    document.body.append(main);
    const sync = TestBed.inject(SyncService);
    const done = sync.openSignIn(trigger);
    await openField();
    trigger.remove();
    button(pane()!, 'Close')!.click();
    await done;
    expect(document.activeElement).toBe(main);
  });

  it('H-125 refocusAfterDialog: focus lost to <body> goes back to a connected trigger', () => {
    const trigger = document.createElement('button');
    document.body.append(trigger);
    (document.activeElement as HTMLElement | null)?.blur();
    expect(document.activeElement).toBe(document.body);
    refocusAfterDialog(trigger);
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it('H-125 refocusAfterDialog: focus already on a real element is never moved', () => {
    const trigger = document.createElement('button');
    const other = document.createElement('input');
    document.body.append(trigger, other);
    other.focus();
    refocusAfterDialog(trigger);
    expect(document.activeElement).toBe(other);
    trigger.remove();
    other.remove();
  });

  it('H-125 refocusAfterDialog: no trigger and focus on <body> falls back to #main', () => {
    const main = document.createElement('main');
    main.id = 'main';
    main.tabIndex = -1;
    document.body.append(main);
    (document.activeElement as HTMLElement | null)?.blur();
    refocusAfterDialog(undefined);
    expect(document.activeElement).toBe(main);
  });
});

describe('H-108 another device: ConfirmEmailDialog (SPEC-010 SYNC-006, SYNC-005, AC 39)', () => {
  const LINK = '/?apiKey=k&oobCode=abc&mode=signIn&lang=en';
  let startUrl: string;
  beforeEach(() => (startUrl = location.pathname + location.search));
  afterEach(() => {
    history.replaceState(null, '', startUrl);
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => (el.innerHTML = ''));
    localStorage.clear();
  });

  /** Opens the app on an email sign-in link with the engine's signIn and the snack bar spied. */
  function openLink(stored: string | null = null) {
    configure();
    if (stored) localStorage.setItem('rift.emailForSignIn', stored);
    history.replaceState(null, '', LINK);
    const sync = TestBed.inject(SyncService);
    const engine = (sync as unknown as { engine: SyncEngine }).engine;
    const signIn = vi.spyOn(engine, 'signIn').mockResolvedValue('ok');
    const snack = vi.spyOn(TestBed.inject(MatSnackBar), 'open');
    sync.start();
    return { signIn, snack };
  }

  const confirm = () => document.querySelector<HTMLElement>('app-confirm-email-dialog');

  it('AC 39 / H-108 with no stored address the dialog asks "Confirm your email address to finish signing in." with focus in the Email address field', async () => {
    openLink();
    const input = await openField();
    const dlg = confirm()!;
    expect(dlg).not.toBeNull();
    expect(text(dlg.querySelector('h2'))).toBe('Finish signing in');
    expect(text(dlg.querySelector('mat-dialog-content p'))).toBe(CONFIRM_EMAIL_TEXT);
    expect(CONFIRM_EMAIL_TEXT).toBe('Confirm your email address to finish signing in.');
    expect(text(dlg.querySelector('mat-label'))).toBe('Email address');
    expect(input.type).toBe('email');
    expect(input.getAttribute('autocomplete')).toBe('email');
    expect(buttons(dlg).map(text)).toEqual(['Cancel', 'Finish sign-in']);
    const filled = buttons(dlg).filter((b) => b.classList.contains('mat-mdc-unelevated-button'));
    expect(filled.map(text)).toEqual(['Finish sign-in']); // one filled button
    expect(button(dlg, 'Finish sign-in')!.disabled).toBe(true);
    // Check (Playwright) fix 1: a fixed width so a long address fits; the phone cap is Material's panel CSS.
    const panel = dlg.closest<HTMLElement>('.cdk-overlay-pane')!;
    expect(panel.style.width).toBe('28rem');
    expect(panel.style.maxWidth).toBe('');
  });

  it('H-108 Finish: Finish sign-in signs in with the trimmed address', async () => {
    const { signIn, snack } = openLink();
    const input = await openField();
    input.value = ' rj@example.com ';
    input.dispatchEvent(new Event('input'));
    await flush();
    const finish = button(confirm()!, 'Finish sign-in')!;
    await vi.waitFor(() => expect(finish.disabled).toBe(false));
    finish.click();
    await vi.waitFor(() => expect(signIn).toHaveBeenCalledWith('email-link', 'rj@example.com'), { timeout: 2000 });
    expect(signIn).toHaveBeenCalledTimes(1);
    await closed();
    expect(snack).not.toHaveBeenCalled();
  });

  it('H-108 Enter submits; without an @ it does nothing', async () => {
    const { signIn } = openLink();
    const input = await openField();
    const form = input.closest('form')!;
    input.value = 'rj';
    input.dispatchEvent(new Event('input'));
    await flush();
    form.requestSubmit();
    await flush();
    expect(confirm()).not.toBeNull();
    expect(signIn).not.toHaveBeenCalled();
    input.value = 'rj@example.com';
    input.dispatchEvent(new Event('input'));
    await flush();
    form.dispatchEvent(new Event('submit', { cancelable: true })); // what Enter in the field fires
    await vi.waitFor(() => expect(signIn).toHaveBeenCalledWith('email-link', 'rj@example.com'), { timeout: 2000 });
  });

  it('AC 39 / H-108 Cancel: no sign-in and no message (SYNC-005 cancel)', async () => {
    const { signIn, snack } = openLink();
    const input = await openField();
    input.value = 'rj@example.com';
    input.dispatchEvent(new Event('input'));
    await flush();
    button(confirm()!, 'Cancel')!.click();
    await closed();
    await flush();
    expect(signIn).not.toHaveBeenCalled();
    expect(snack).not.toHaveBeenCalled();
    // Check (Playwright) fix 2: a mouse Cancel leaves focus at the start of the document, not after the overlay.
    expect(document.activeElement).toBe(document.body);
    expect(document.body.getAttribute('tabindex')).toBe('-1');
    const skip = document.createElement('a');
    skip.href = '#main';
    document.body.prepend(skip);
    skip.focus(); // the first Tab
    expect(document.body.hasAttribute('tabindex')).toBe(false); // removed on blur
    skip.remove();
  });

  it('AC 39 / H-108 Escape: no sign-in and no message', async () => {
    const { signIn, snack } = openLink();
    await openField();
    escape();
    await closed();
    await flush();
    expect(signIn).not.toHaveBeenCalled();
    expect(snack).not.toHaveBeenCalled();
  });

  it('AC 39 / AC 51 on the device that sent the link the stored address signs in with no question', async () => {
    const { signIn } = openLink('rj@example.com');
    await vi.waitFor(() => expect(signIn).toHaveBeenCalledWith('email-link', 'rj@example.com'), { timeout: 2000 });
    await flush();
    expect(confirm()).toBeNull();
  });
});

describe('H-108 focusDocumentStart (Check (Playwright) fix 2)', () => {
  afterEach(() => document.body.removeAttribute('tabindex'));

  it('H-108 focus on <body> moves the Tab starting point to the top: body is focused with a tabindex removed on blur', () => {
    (document.activeElement as HTMLElement | null)?.blur();
    focusDocumentStart();
    expect(document.activeElement).toBe(document.body);
    expect(document.body.getAttribute('tabindex')).toBe('-1');
    const input = document.createElement('input');
    document.body.append(input);
    input.focus();
    expect(document.body.hasAttribute('tabindex')).toBe(false);
    input.remove();
  });

  it('H-108 focus already on a real element is never moved', () => {
    const input = document.createElement('input');
    document.body.append(input);
    input.focus();
    focusDocumentStart();
    expect(document.activeElement).toBe(input);
    expect(document.body.hasAttribute('tabindex')).toBe(false);
    input.remove();
  });
});
