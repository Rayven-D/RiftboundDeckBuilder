import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AccountMenu } from './account-menu';
import { CombineDialog, DeleteAccountDialog, SignInDialog, SignOutDialog } from './sync-dialogs';
import { SIGN_IN_ENABLED, SYNC_ADAPTERS, SyncService, isEmailLinkUrl } from './sync.service';

const text = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();
const buttons = (root: HTMLElement) => Array.from(root.querySelectorAll('button')).map(text);

describe('Sign-in UI (SPEC-010)', () => {
  let adapterLoads: number;
  const setup = (enabled: boolean) => {
    adapterLoads = 0;
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [AccountMenu],
      providers: [
        { provide: SIGN_IN_ENABLED, useValue: enabled },
        {
          provide: SYNC_ADAPTERS,
          useValue: async () => {
            adapterLoads++;
            throw new Error('not in unit tests');
          },
        },
      ],
    });
  };

  it('SYNC-007 / AC 35 with signInEnabled false no Sign in action is shown and nothing loads Firebase', async () => {
    setup(false);
    const fixture = TestBed.createComponent(AccountMenu);
    TestBed.inject(SyncService).start();
    await fixture.whenStable();
    expect(buttons(fixture.nativeElement)).toEqual([]);
    expect(adapterLoads).toBe(0);
  });

  it('SYNC-007 / SYNC-002 with signInEnabled true the Sign in action is shown, still without loading Firebase', async () => {
    setup(true);
    const fixture = TestBed.createComponent(AccountMenu);
    TestBed.inject(SyncService).start();
    await fixture.whenStable();
    expect(buttons(fixture.nativeElement)).toEqual(['Sign in']);
    expect(adapterLoads).toBe(0);
  });

  it('SYNC-003 / SYNC-006 the sign-in dialog has the SYNC-003 text and exactly the two provider buttons', async () => {
    TestBed.configureTestingModule({
      imports: [SignInDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { online: true, sendEmailLink: async () => undefined } },
        { provide: MatDialogRef, useValue: { close: () => undefined } },
      ],
    });
    const fixture = TestBed.createComponent(SignInDialog);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(text(el)).toContain(
      "Sign in to keep your collection and decks in sync across your devices. You don't need an account: without one, everything stays on this device.",
    );
    expect(buttons(el).filter((b) => b !== 'Close')).toEqual(['Continue with Google', 'Sign in with an email link']);
  });

  it('SYNC-049 the Combine dialog shows both sides’ counts, the different-account line, and only Combine and Cancel', async () => {
    TestBed.configureTestingModule({
      imports: [CombineDialog],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: { device: { cards: 1, decks: 1, tags: 1 }, account: { cards: 3, decks: 2, tags: 4 }, differentAccount: true },
        },
        { provide: MatDialogRef, useValue: { close: () => undefined } },
      ],
    });
    const fixture = TestBed.createComponent(CombineDialog);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(text(el)).toContain('This device: 1 cards, 1 decks, 1 tags. Account: 3 cards, 2 decks, 4 tags.');
    expect(text(el)).toContain("This device's data was last synced with a different account.");
    expect(buttons(el)).toEqual(['Cancel', 'Combine']);
  });

  it('SYNC-090 the sign-out dialog warns about unsynced changes, offers Sync now, and Keep a copy is primary (AC 20)', async () => {
    TestBed.configureTestingModule({
      imports: [SignOutDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { pending: 1, online: true } },
        { provide: MatDialogRef, useValue: { close: () => undefined } },
      ],
    });
    const fixture = TestBed.createComponent(SignOutDialog);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(text(el)).toContain("1 change hasn't synced yet. They'll be lost if you remove this device's copy.");
    expect(buttons(el)).toEqual(['Cancel', 'Sync now', 'Remove from this device', 'Keep a copy on this device']);
    const keep = Array.from(el.querySelectorAll('button')).find((b) => text(b) === 'Keep a copy on this device')!;
    expect(keep.getAttribute('matButton')).toBe('filled');
  });

  it('SYNC-095 Delete account stays disabled until the user types delete, with no keep-a-copy option (AC 38)', async () => {
    let closed: unknown = undefined;
    TestBed.configureTestingModule({
      imports: [DeleteAccountDialog],
      providers: [{ provide: MatDialogRef, useValue: { close: (v: unknown) => (closed = v) } }],
    });
    const fixture = TestBed.createComponent(DeleteAccountDialog);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(buttons(el)).toEqual(['Cancel', 'Delete account']);
    const del = Array.from(el.querySelectorAll('button')).find((b) => text(b) === 'Delete account')!;
    expect(del.disabled).toBe(true);
    const input = el.querySelector('input')!;
    input.value = 'delet';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(del.disabled).toBe(true);
    input.value = 'delete';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(del.disabled).toBe(false);
    del.click();
    expect(closed).toBe(true);
  });

  it('SYNC-006 an email sign-in link is recognised from the URL without loading Firebase', () => {
    expect(isEmailLinkUrl('https://x.web.app/?apiKey=k&oobCode=abc&mode=signIn&lang=en')).toBe(true);
    expect(isEmailLinkUrl('https://x.web.app/decks')).toBe(false);
  });
});

describe('AccountMenu delete outcomes (SPEC-010 SYNC-096)', () => {
  it('SYNC-096 a deletion that stopped part-way offers Try again, which retries', async () => {
    const { MatSnackBar } = await import('@angular/material/snack-bar');
    const { Subject } = await import('rxjs');
    const action = new Subject<void>();
    const opened: [string, string | undefined][] = [];
    const results: string[] = ['failed', 'ok'];
    let calls = 0;
    TestBed.configureTestingModule({
      imports: [AccountMenu],
      providers: [
        {
          provide: SyncService,
          useValue: {
            enabled: true,
            start: () => undefined,
            signedIn: () => true,
            online: () => true,
            statusLine: () => '',
            deleteAccount: async () => {
              calls++;
              return results.shift();
            },
          },
        },
        {
          provide: MatSnackBar,
          useValue: { open: (m: string, a?: string) => (opened.push([m, a]), { onAction: () => action }) },
        },
      ],
    });
    const fixture = TestBed.createComponent(AccountMenu);
    await (fixture.componentInstance as unknown as { runDelete(): Promise<void> }).runDelete();
    expect(opened).toEqual([["Some data couldn't be deleted. Try again.", 'Try again']]);
    action.next();
    await fixture.whenStable();
    expect(calls).toBe(2);
  });
});
