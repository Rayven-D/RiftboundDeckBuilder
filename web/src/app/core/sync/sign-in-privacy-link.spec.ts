/** SPEC-010 SYNC-104 (c, f, g) / AC 67 (H-180): the sign-in dialog's age line and Privacy notice link. */
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AGE_LINE, SignInDialog } from './sync-dialogs';
import { enabledProviders } from '../../shared/sync/sync-types';

const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

async function dialog(providers: readonly ('email-link' | 'google')[] = ['email-link']) {
  TestBed.configureTestingModule({
    imports: [SignInDialog],
    providers: [
      { provide: MAT_DIALOG_DATA, useValue: { online: true, providers: enabledProviders(providers), sendEmailLink: async () => undefined } },
      { provide: MatDialogRef, useValue: { close: () => undefined } },
    ],
  });
  const fixture = TestBed.createComponent(SignInDialog);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const input = () => el.querySelector<HTMLInputElement>('input');
  const sendTo = async (email: string) => {
    input()!.value = email;
    input()!.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();
  };
  const privacyLink = () =>
    Array.from(el.querySelectorAll<HTMLAnchorElement>('a')).find((a) => text(a) === 'Privacy notice') ?? null;
  return { fixture, el, input, sendTo, privacyLink };
}

function expectNewTabLink(link: HTMLAnchorElement | null, root: HTMLElement): void {
  expect(link).not.toBeNull();
  expect(link!.getAttribute('href')).toBe('/privacy');
  expect(link!.getAttribute('target')).toBe('_blank');
  expect(link!.getAttribute('rel')).toContain('noopener');
  expect(link!.tabIndex).toBe(0);
  // The accessible name stays "Privacy notice"; the new tab is said in its description.
  const described = root.querySelector(`#${link!.getAttribute('aria-describedby')}`);
  expect(text(described)).toBe('Opens in a new tab.');
}

describe('Sign-in dialog privacy link and age line (SPEC-010 SYNC-104 c, f; AC 67)', () => {
  it('SYNC-104 (f) / AC 67 the age line reads "For ages 16 and over." under the form; no age check, no date-of-birth field', async () => {
    const { el } = await dialog();
    expect(AGE_LINE).toBe('For ages 16 and over.');
    const fine = el.querySelector('.fine-print')!;
    expect(text(fine)).toContain(AGE_LINE);
    expect(el.querySelector('form')!.compareDocumentPosition(fine) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(el.querySelectorAll('input')).toHaveLength(1); // only Email address
    expect(el.querySelector('input[type="date"]')).toBeNull();
  });

  it('SYNC-104 (c, g) / AC 67 form state: a real "Privacy notice" link under the form opens /privacy in a new tab', async () => {
    const { el, privacyLink } = await dialog();
    expectNewTabLink(privacyLink(), el);
  });

  it('SYNC-104 (c) / AC 67 sent state: the link and the age line are still there, and the typed address is unchanged', async () => {
    const { el, sendTo, privacyLink } = await dialog();
    await sendTo('rj@example.com');
    expect(el.querySelector('.sent-line')).not.toBeNull();
    expect(text(el.querySelector('.sent-line'))).toContain('rj@example.com');
    expectNewTabLink(privacyLink(), el);
    expect(text(el.querySelector('.fine-print'))).toContain(AGE_LINE);
  });

  it('SYNC-104 (c) with two providers, before the email form is revealed, the link and age line show too', async () => {
    const { el, privacyLink } = await dialog(['email-link', 'google']);
    expect(el.querySelector('form')).toBeNull();
    expectNewTabLink(privacyLink(), el);
    expect(text(el.querySelector('.fine-print'))).toContain(AGE_LINE);
  });
});
