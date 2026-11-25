/**
 * SPEC-010 v0.10 SYNC-006 "Sent state" (AC 51, AC 1's sent line): board H-140, built from
 * brain/04-UI/Brief H-140 H-125 H-108.md decisions 1-10. The phone layout is guarded from the source in
 * src/tooling/sign-in-dialog-layout.spec.ts.
 */
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SEND_LINK_FAILED, SPAM_HINT, SignInDialog } from './sync-dialogs';
import { enabledProviders } from '../../shared/sync/sync-types';

const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const buttons = (root: ParentNode) => Array.from(root.querySelectorAll<HTMLButtonElement>('button'));
const button = (root: ParentNode, label: string) => buttons(root).find((b) => text(b) === label);
const flush = () => new Promise((r) => setTimeout(r));
/** The adapter's key (firebase-adapters.ts EMAIL_KEY): written only after a send succeeded. */
const STORED = 'rift.emailForSignIn';
const SENT = (address: string) => `We sent a sign-in link to ${address}. Open it on this device to finish signing in.`;
const SENT_NEW = (address: string) => `We sent a new sign-in link to ${address}. Open it on this device to finish signing in.`;

/**
 * Sends the test settles by hand. A success stores the address the way the Firebase adapter does (after the
 * request resolved), so the tests can check the dialog never touches the stored address itself.
 */
function adapterLikeSends() {
  const calls: { email: string; resolve: () => void; reject: (e: Error) => void }[] = [];
  const send = (email: string) =>
    new Promise<void>((resolve, reject) => {
      calls.push({
        email,
        resolve: () => {
          localStorage.setItem(STORED, email);
          resolve();
        },
        reject,
      });
    });
  return { calls, send };
}

describe('Sign-in dialog sent state (SPEC-010 v0.10 SYNC-006, H-140)', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  async function dialog(sendEmailLink: (email: string) => Promise<void>) {
    TestBed.configureTestingModule({
      imports: [SignInDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { online: true, providers: enabledProviders(['email-link']), sendEmailLink } },
        { provide: MatDialogRef, useValue: { close: () => undefined } },
      ],
    });
    const fixture = TestBed.createComponent(SignInDialog);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const input = () => el.querySelector<HTMLInputElement>('input');
    const settle = async () => {
      await fixture.whenStable();
      await flush();
      await fixture.whenStable();
    };
    const type = async (value: string) => {
      input()!.value = value;
      input()!.dispatchEvent(new Event('input'));
      await fixture.whenStable();
    };
    const submit = async () => {
      el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
      await fixture.whenStable();
    };
    const line = () => el.querySelector<HTMLElement>('.sent-line');
    const resend = () => button(el, 'Send again') ?? button(el, 'Sending…');
    const other = () => button(el, 'Use a different email');
    return { fixture, el, input, type, submit, settle, line, resend, other };
  }

  /** Types ` rj@example.com ` (with spaces), presses Send link, and lets it succeed. */
  async function sentState() {
    const sends = adapterLikeSends();
    const d = await dialog(sends.send);
    await d.type(' rj@example.com ');
    await d.submit();
    sends.calls[0].resolve();
    await d.settle();
    return { ...d, sends };
  }

  it('AC 51 / AC 1 / H-140 a successful Send link of " rj@example.com " replaces the form with the sent line (trimmed address in <strong>), the spam line and the text buttons Send again and Use a different email', async () => {
    const { el, line, sends } = await sentState();
    expect(sends.calls.map((c) => c.email)).toEqual(['rj@example.com']); // sent trimmed
    expect(el.querySelector('form')).toBeNull();
    expect(el.querySelector('input')).toBeNull();
    expect(text(line())).toBe(SENT('rj@example.com'));
    expect(text(line()!.querySelector('strong'))).toBe('rj@example.com');
    expect(line()!.getAttribute('role')).toBe('status');
    expect(line()!.getAttribute('tabindex')).toBe('-1');
    const note = line()!.nextElementSibling!;
    expect(note.classList).toContain('note');
    expect(text(note)).toBe("Didn't get it? Check your spam folder.");
    expect(SPAM_HINT).toBe("Didn't get it? Check your spam folder.");
    const actions = el.querySelector('.sent-actions')!;
    expect(note.nextElementSibling).toBe(actions);
    expect(buttons(actions).map(text)).toEqual(['Send again', 'Use a different email']);
    for (const b of buttons(actions)) {
      expect(b.classList).toContain('mat-mdc-button'); // text buttons
      expect(b.classList).not.toContain('mat-mdc-unelevated-button');
      expect(b.closest('mat-dialog-actions')).toBeNull(); // in content, not beside Close
    }
    expect(buttons(el.querySelector('mat-dialog-actions')!).map(text)).toEqual(['Close']);
    expect(text(el)).not.toContain('Check your email for a ' + 'sign-in link.'); // the pre-H-140 line
    expect(localStorage.getItem(STORED)).toBe('rj@example.com');
  });

  it('H-140 after a successful Send link focus moves to the sent line (the focused Send link is gone with the form)', async () => {
    const { line } = await sentState();
    expect(document.activeElement).toBe(line());
  });

  it('AC 51 / H-140 Send again sends a second link to the same address with no wait; while it runs it reads Sending…, both actions are disabled and focus stays; on success the line says "a new sign-in link"', async () => {
    const { fixture, el, line, resend, other, settle, sends } = await sentState();
    const sentLine = line()!;
    resend()!.focus();
    resend()!.click();
    await fixture.whenStable();
    expect(sends.calls.map((c) => c.email)).toEqual(['rj@example.com', 'rj@example.com']); // no cooldown
    expect(text(resend())).toBe('Sending…');
    expect(resend()!.getAttribute('aria-disabled')).toBe('true');
    expect(other()!.getAttribute('aria-disabled')).toBe('true');
    expect(document.activeElement).toBe(resend()); // disabledInteractive: focus does not drop to <body>
    resend()!.click(); // a press while pending does nothing
    other()!.click();
    await fixture.whenStable();
    expect(sends.calls.length).toBe(2);
    expect(el.querySelector('form')).toBeNull(); // still the sent state

    sends.calls[1].resolve();
    await settle();
    expect(line()).toBe(sentLine); // the same live region, so the change is announced
    expect(text(line())).toBe(SENT_NEW('rj@example.com'));
    expect(text(resend())).toBe('Send again');
    expect(resend()!.getAttribute('aria-disabled')).not.toBe('true');
    expect(document.activeElement).toBe(resend());
    expect(localStorage.getItem(STORED)).toBe('rj@example.com');
  });

  it('AC 51 / H-140 a failed Send again keeps the sent state and shows the send-failure text under it, in a status region that Send again points to', async () => {
    const { fixture, el, line, resend, settle, sends } = await sentState();
    resend()!.focus();
    resend()!.click();
    await fixture.whenStable();
    sends.calls[1].reject(new Error('auth/network-request-failed'));
    await settle();

    expect(text(line())).toBe(SENT('rj@example.com')); // the line keeps its last text
    expect(el.querySelector('form')).toBeNull();
    const error = el.querySelector<HTMLElement>('.sent .error')!;
    expect(text(error)).toBe(SEND_LINK_FAILED);
    expect(error.querySelector('app-icon')?.getAttribute('name')).toBe('error');
    expect(error.parentElement!.getAttribute('role')).toBe('status');
    expect(error.parentElement!.previousElementSibling!.classList).toContain('sent-actions'); // under the actions
    expect(resend()!.getAttribute('aria-describedby')).toBe(error.id);
    expect(document.getElementById(error.id)).toBe(error);
    expect(document.activeElement).toBe(resend());
    expect(resend()!.getAttribute('aria-disabled')).not.toBe('true'); // can be pressed again

    // Pressing Send again clears the failure; a success shows the "new" line with no failure left.
    resend()!.click();
    await fixture.whenStable();
    expect(el.querySelector('.error')).toBeNull();
    sends.calls[2].resolve();
    await settle();
    expect(text(line())).toBe(SENT_NEW('rj@example.com'));
    expect(el.querySelector('.error')).toBeNull();
    expect(resend()!.hasAttribute('aria-describedby')).toBe(false);
  });

  it('H-140 the failure status region is there (empty) before any failure, so adding the line is announced', async () => {
    const { el } = await sentState();
    const region = el.querySelector('.sent-actions')!.nextElementSibling!;
    expect(region.getAttribute('role')).toBe('status');
    expect(text(region)).toBe('');
  });

  it('AC 51 / H-140 Use a different email shows the form with the last address, focused, Send link enabled, and the stored address unchanged; a new send to rj2 names rj2 and stores it', async () => {
    const { fixture, el, input, type, submit, settle, line, resend, other, sends } = await sentState();
    // A Send again first, so the "new" flag is set and must be reset.
    resend()!.click();
    await fixture.whenStable();
    sends.calls[1].resolve();
    await settle();
    expect(text(line())).toBe(SENT_NEW('rj@example.com'));

    other()!.click();
    await settle();
    expect(line()).toBeNull();
    expect(input()!.value).toBe('rj@example.com');
    expect(document.activeElement).toBe(input());
    expect(button(el, 'Send link')!.getAttribute('aria-disabled')).not.toBe('true');
    expect(el.querySelector('.error')).toBeNull();
    expect(localStorage.getItem(STORED)).toBe('rj@example.com'); // the dialog never writes it

    await type('rj2@example.com');
    await submit();
    expect(sends.calls[2].email).toBe('rj2@example.com');
    expect(localStorage.getItem(STORED)).toBe('rj@example.com'); // not until the send succeeded
    sends.calls[2].resolve();
    await settle();
    expect(text(line())).toBe(SENT('rj2@example.com')); // plain line: a send from the form is never "new"
    expect(localStorage.getItem(STORED)).toBe('rj2@example.com');
  });

  it('AC 51 / H-140 Use a different email after a failed Send again clears the failure', async () => {
    const { fixture, el, settle, resend, other, sends } = await sentState();
    resend()!.click();
    await fixture.whenStable();
    sends.calls[1].reject(new Error('network'));
    await settle();
    expect(el.querySelector('.error')).not.toBeNull();
    other()!.click();
    await settle();
    expect(el.querySelector('.error')).toBeNull();
    expect(el.querySelector('input')!.getAttribute('aria-invalid')).not.toBe('true');
  });

  it('AC 51 / H-140 closing after the first send and opening the dialog again shows the email form', async () => {
    const { fixture, sends } = await sentState();
    fixture.destroy();
    const again = TestBed.createComponent(SignInDialog);
    await again.whenStable();
    const el = again.nativeElement as HTMLElement;
    expect(el.querySelector('.sent-line')).toBeNull();
    expect(el.querySelector('form.email input')).not.toBeNull();
    expect(button(el, 'Send link')).toBeDefined();
    expect(sends.calls.length).toBe(1);
    expect(localStorage.getItem(STORED)).toBe('rj@example.com'); // the link already sent still works
  });

  it('H-140 a Send again that settles after the dialog closed throws nothing', async () => {
    const { fixture, resend, sends } = await sentState();
    resend()!.click();
    await fixture.whenStable();
    fixture.destroy();
    sends.calls[1].reject(new Error('network'));
    await flush();
    expect(sends.calls.length).toBe(2);
  });
});
