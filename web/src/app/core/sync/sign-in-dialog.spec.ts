/**
 * SPEC-010 v0.10 sign-in dialog (SYNC-006 "Dialog layout" + "Send link", SYNC-005, SYNC-002; ACs 1, 49, 50):
 * board H-104 (layout and focus), H-106 (Send link failure), built from brain/04-UI/Brief H-104 H-106 H-124.md.
 * The H-124 phone layout is guarded from the source in src/tooling/sign-in-dialog-layout.spec.ts.
 */
import { InteractivityChecker } from '@angular/cdk/a11y';
import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AccountMenu } from './account-menu';
import { SEND_LINK_FAILED, SIGN_IN_INTRO, SignInDialog } from './sync-dialogs';
import { SIGN_IN_ENABLED, SYNC_ADAPTERS, SyncService } from './sync.service';
import { environment } from '../../../environments/environment';
import { MESSAGES } from '../../shared/sync/sync-engine';
import { enabledProviders } from '../../shared/sync/sync-types';

const text = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();
const buttons = (root: ParentNode) => Array.from(root.querySelectorAll<HTMLButtonElement>('button'));
const button = (root: ParentNode, label: string) => buttons(root).find((b) => text(b) === label);
/** Material marks matButton="filled" with this class; "outlined" with mat-mdc-outlined-button. */
const filled = (root: ParentNode) => buttons(root).filter((b) => b.classList.contains('mat-mdc-unelevated-button'));
const flush = () => new Promise((r) => setTimeout(r));

/**
 * jsdom has no layout, so CDK's checker sees every element as invisible and the dialog's
 * `autoFocus: 'first-tabbable'` would find nothing. Only visibility is faked; tabbability is CDK's own.
 */
@Injectable()
class VisibleInteractivityChecker extends InteractivityChecker {
  override isVisible(): boolean {
    return true;
  }
}

describe('Sign-in dialog layout and Send link (SPEC-010 v0.10 SYNC-006)', () => {
  afterEach(() => document.querySelectorAll('.cdk-overlay-container').forEach((el) => (el.innerHTML = '')));

  /** The dialog on its own, with a controllable `sendEmailLink`. */
  async function dialog(
    providers: readonly ('email-link' | 'google')[],
    sendEmailLink: (email: string) => Promise<void> = async () => undefined,
  ) {
    TestBed.configureTestingModule({
      imports: [SignInDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { online: true, providers: enabledProviders(providers), sendEmailLink } },
        { provide: MatDialogRef, useValue: { close: () => undefined } },
      ],
    });
    const fixture = TestBed.createComponent(SignInDialog);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const input = () => el.querySelector<HTMLInputElement>('input');
    const type = async (value: string) => {
      input()!.value = value;
      input()!.dispatchEvent(new Event('input'));
      await fixture.whenStable();
    };
    const submit = async () => {
      el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
      await fixture.whenStable();
    };
    return { fixture, el, input, type, submit };
  }

  /** A send the test settles by hand, to see the pending state. */
  function deferredSends() {
    const calls: { email: string; resolve: () => void; reject: (e: Error) => void }[] = [];
    const send = (email: string) =>
      new Promise<void>((resolve, reject) => {
        calls.push({ email, resolve, reject });
      });
    return { calls, send };
  }

  describe('H-104 / AC 49 (a): email link is the only provider', () => {
    it('AC 49 / AC 1 / H-104 opened from the header: intro, the Email address field and one filled Send link, no provider button, focus in the field, no firebase load', async () => {
      expect(environment.authProviders).toEqual(['email-link']);
      let adapterLoads = 0;
      localStorage.clear();
      TestBed.configureTestingModule({
        imports: [AccountMenu],
        providers: [
          { provide: SIGN_IN_ENABLED, useValue: true },
          {
            provide: SYNC_ADAPTERS,
            useValue: async () => {
              adapterLoads++;
              throw new Error('not in unit tests');
            },
          },
          { provide: InteractivityChecker, useClass: VisibleInteractivityChecker },
        ],
      });
      const fixture = TestBed.createComponent(AccountMenu);
      TestBed.inject(SyncService).start();
      await fixture.whenStable();
      // The real open path: header Sign in -> SyncService.openSignIn -> MatDialog with autoFocus 'first-tabbable'.
      button(fixture.nativeElement, 'Sign in')!.click();
      await fixture.whenStable();
      await flush();
      await fixture.whenStable();

      const pane = document.querySelector<HTMLElement>('.cdk-overlay-container mat-dialog-container')!;
      expect(pane).not.toBeNull();
      expect(text(pane)).toContain(SIGN_IN_INTRO);
      expect(button(pane, 'Sign in with an email link')).toBeUndefined();
      expect(pane.querySelector('.providers')).toBeNull(); // no empty div adding margins
      expect(text(pane.querySelector('mat-label')!)).toBe('Email address');
      expect(filled(pane).map(text)).toEqual(['Send link']);
      expect(buttons(pane).map(text)).toEqual(['Send link', 'Close']);
      const input = pane.querySelector('input')!;
      // MatDialog traps focus once its enter animation (a timer) is done.
      await vi.waitFor(() => expect(document.activeElement).toBe(input), { timeout: 2000 });
      expect(adapterLoads).toBe(0); // SYNC-002: opening the dialog loads nothing
      // Close before teardown: since H-125 the dialog restores focus to the header button, and doing that
      // after the test's injector is gone would start a ripple on a destroyed injector (NG0205).
      button(pane, 'Close')!.click();
      await vi.waitFor(() => expect(document.activeElement).toBe(button(fixture.nativeElement, 'Sign in')), { timeout: 2000 });
      localStorage.clear();
    });

    it('H-104 the form follows the intro directly: field then Send link, and Send link waits for an address', async () => {
      const { el, type } = await dialog(['email-link']);
      expect(el.querySelector('.providers')).toBeNull();
      const form = el.querySelector('form.email')!;
      expect(form.previousElementSibling?.textContent).toBe(SIGN_IN_INTRO);
      const send = button(el, 'Send link')!;
      expect(send.getAttribute('aria-disabled')).toBe('true');
      await type('rj@example.com');
      expect(send.getAttribute('aria-disabled')).not.toBe('true');
    });

    it('H-104 / H-106 before any failure the field is not invalid and has no aria-describedby (empty: no aria-invalid; filled: Material "false")', async () => {
      const { input, type } = await dialog(['email-link']);
      expect(input()!.hasAttribute('aria-invalid')).toBe(false);
      expect(input()!.hasAttribute('aria-describedby')).toBe(false);
      await type('rj@example.com');
      // MatInput's own host binding writes "false" on a filled field; the dialog never writes the attribute.
      expect(input()!.getAttribute('aria-invalid')).not.toBe('true');
      expect(input()!.hasAttribute('aria-describedby')).toBe(false);
    });

    it('H-106 the form has novalidate: pressing the dimmed Send link with "abc" sends nothing and shows no native bubble', async () => {
      let sends = 0;
      const { fixture, el, type } = await dialog(['email-link'], async () => {
        sends++;
      });
      const form = el.querySelector('form')!;
      expect(form.noValidate).toBe(true);
      await type('abc');
      const send = button(el, 'Send link')!;
      expect(send.getAttribute('aria-disabled')).toBe('true');
      send.click();
      form.requestSubmit();
      await fixture.whenStable();
      expect(sends).toBe(0);
      expect(el.querySelector('.error')).toBeNull();
    });

    it('H-106 each dialog gets its own send-failure id', async () => {
      const failing = async () => {
        throw new Error('network');
      };
      const ids: string[] = [];
      for (let i = 0; i < 2; i++) {
        TestBed.resetTestingModule();
        const { fixture, el, type, submit } = await dialog(['email-link'], failing);
        await type('rj@example.com');
        await submit();
        await flush();
        await fixture.whenStable();
        ids.push(el.querySelector('.error')!.id);
      }
      expect(ids[0]).toMatch(/^send-error-\d+$/);
      expect(ids[1]).toMatch(/^send-error-\d+$/);
      expect(ids[0]).not.toBe(ids[1]);
    });
  });

  describe('H-104 / AC 49 (b): two providers', () => {
    it('AC 49 (b) / H-104 both provider buttons are outlined and there is no field until the reveal', async () => {
      const { el } = await dialog(['email-link', 'google']);
      const providers = Array.from(el.querySelectorAll<HTMLButtonElement>('.providers button'));
      expect(providers.map(text)).toEqual(['Sign in with an email link', 'Continue with Google']);
      for (const b of providers) expect(b.classList).toContain('mat-mdc-outlined-button');
      expect(filled(el)).toEqual([]);
      expect(el.querySelector('input')).toBeNull();
    });

    it('AC 49 (b) / H-104 choosing Sign in with an email link reveals the field below the buttons, focuses it, and Send link is the only filled button', async () => {
      const { fixture, el, input } = await dialog(['email-link', 'google']);
      const reveal = button(el, 'Sign in with an email link')!;
      reveal.focus();
      reveal.click();
      await fixture.whenStable();
      expect(input()).not.toBeNull();
      expect(document.activeElement).toBe(input());
      expect(el.querySelector('.providers')!.nextElementSibling?.matches('form.email')).toBe(true);
      expect(filled(el).map(text)).toEqual(['Send link']);
      // Not a toggle: pressing it again keeps the form and puts focus back in the field.
      reveal.focus();
      reveal.click();
      await fixture.whenStable();
      expect(input()).not.toBeNull();
      expect(document.activeElement).toBe(input());
      expect(reveal.hasAttribute('aria-expanded')).toBe(false);
    });
  });

  describe('H-106 / AC 50: Send link pending and failure', () => {
    it('H-106 a send that fails after the dialog closed throws nothing', async () => {
      const sends = deferredSends();
      const { fixture, type } = await dialog(['email-link'], sends.send);
      await type('rj@example.com');
      const dlg = fixture.componentInstance as unknown as { send(e: Event): Promise<void> };
      const pending = dlg.send(new Event('submit', { cancelable: true }));
      fixture.destroy(); // Close (or Escape) while the request runs
      sends.calls[0].reject(new Error('network'));
      await expect(pending).resolves.toBeUndefined(); // no NG0911 from afterNextRender on a destroyed view
    });

    it('H-106 a send that succeeds after the dialog closed throws nothing', async () => {
      const sends = deferredSends();
      const { fixture, type } = await dialog(['email-link'], sends.send);
      await type('rj@example.com');
      const dlg = fixture.componentInstance as unknown as { send(e: Event): Promise<void> };
      const pending = dlg.send(new Event('submit', { cancelable: true }));
      fixture.destroy();
      sends.calls[0].resolve();
      await expect(pending).resolves.toBeUndefined();
    });

    it('AC 50 / H-106 while the request runs Send link reads Sending… and is disabled but keeps focus', async () => {
      const sends = deferredSends();
      const { fixture, el, type, submit } = await dialog(['email-link'], sends.send);
      await type('rj@example.com');
      const send = button(el, 'Send link')!;
      send.focus();
      await submit();
      expect(sends.calls.map((c) => c.email)).toEqual(['rj@example.com']);
      expect(text(send)).toBe('Sending…');
      expect(send.getAttribute('aria-disabled')).toBe('true');
      expect(document.activeElement).toBe(send); // disabledInteractive: focus does not drop to <body>
      await submit(); // a second press while pending does nothing
      expect(sends.calls.length).toBe(1);
      sends.calls[0].resolve();
      await fixture.whenStable();
    });

    it('AC 50 / H-106 a failed send shows exactly the send-failure text with the icon, never the SYNC-005 text; the field keeps the address and is marked invalid', async () => {
      const sends = deferredSends();
      const { fixture, el, input, type, submit } = await dialog(['email-link'], sends.send);
      await type('rj@example.com');
      await submit();
      sends.calls[0].reject(new Error('auth/network-request-failed'));
      await fixture.whenStable();
      await flush();
      await fixture.whenStable();

      expect(SEND_LINK_FAILED).toBe("Couldn't send the link. Check the address and your connection, then try again.");
      const error = el.querySelector<HTMLElement>('.error')!;
      expect(text(error)).toBe(SEND_LINK_FAILED);
      expect(error.querySelector('app-icon')?.getAttribute('name')).toBe('error');
      expect(error.getAttribute('role')).toBeNull(); // focus does the announcing, not an alert
      expect(text(el)).not.toContain(MESSAGES.signInFailed);
      expect(input()!.value).toBe('rj@example.com');
      expect(input()!.getAttribute('aria-invalid')).toBe('true');
      expect(input()!.getAttribute('aria-describedby')).toBe(error.id);
      expect(document.getElementById(input()!.getAttribute('aria-describedby')!)).toBe(error);
      expect(el.querySelector('mat-form-field')!.classList).toContain('send-failed');
      expect(document.activeElement).toBe(input());
      const send = button(el, 'Send link')!;
      expect(send.getAttribute('aria-disabled')).not.toBe('true'); // can be pressed again
    });

    it('H-106 the failure clears on the first edit: message, both aria attributes and the red outline go', async () => {
      const { fixture, el, input, type, submit } = await dialog(['email-link'], async () => {
        throw new Error('network');
      });
      await type('rj@example.com');
      await submit();
      await flush();
      await fixture.whenStable();
      expect(el.querySelector('.error')).not.toBeNull();
      await type('rj@example.co');
      expect(el.querySelector('.error')).toBeNull();
      // Filled field without an error: Material's own "false", never "true"; no describedby left behind.
      expect(input()!.getAttribute('aria-invalid')).not.toBe('true');
      expect(input()!.hasAttribute('aria-describedby')).toBe(false);
      expect(el.querySelector('mat-form-field')!.classList).not.toContain('send-failed');
    });

    it('AC 50 / H-106 pressing Send link again after a failure clears the message; a success shows the sent line and the failure text is gone', async () => {
      const sends = deferredSends();
      const { fixture, el, submit, type } = await dialog(['email-link'], sends.send);
      await type('rj@example.com');
      await submit();
      sends.calls[0].reject(new Error('network'));
      await flush();
      await fixture.whenStable();
      expect(text(el)).toContain(SEND_LINK_FAILED);

      await submit();
      expect(text(el)).not.toContain(SEND_LINK_FAILED); // cleared when Send link is pressed
      expect(sends.calls.map((c) => c.email)).toEqual(['rj@example.com', 'rj@example.com']);
      sends.calls[1].resolve();
      await flush();
      await fixture.whenStable();
      expect(text(el)).not.toContain(SEND_LINK_FAILED);
      expect(text(el.querySelector('.sent-line')!)).toBe(
        'We sent a sign-in link to rj@example.com. Open it on this device to finish signing in.',
      ); // the AC 51 sent state
    });
  });
});
