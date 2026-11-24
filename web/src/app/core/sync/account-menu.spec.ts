import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AccountMenu } from './account-menu';
import { CombineDialog, DeleteAccountDialog, SignInDialog, SignOutDialog } from './sync-dialogs';
import { SIGN_IN_ENABLED, SYNC_ADAPTERS, SyncService, isEmailLinkUrl } from './sync.service';
import { environment } from '../../../environments/environment';
import { enabledProviders } from '../../shared/sync/sync-types';
import type { StoredSyncLog } from '../../shared/sync/sync-types';
import { emptySyncLog } from '../../shared/sync/sync-log';
import { FakeAuth, FakeFirestore, FakeRemote } from '../../shared/sync/testing/fakes';
import { STORAGE_KEYS } from '../storage/local-stores';

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

  const openSignInDialog = async (providers: readonly ('email-link' | 'google')[]) => {
    TestBed.configureTestingModule({
      imports: [SignInDialog],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: { online: true, providers: enabledProviders(providers), sendEmailLink: async () => undefined },
        },
        { provide: MatDialogRef, useValue: { close: () => undefined } },
      ],
    });
    const fixture = TestBed.createComponent(SignInDialog);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  it('SYNC-003 / SYNC-006 with the default config the sign-in dialog offers exactly the email link', async () => {
    const el = await openSignInDialog(environment.authProviders);
    expect(environment.authProviders).toEqual(['email-link']);
    expect(text(el)).toContain(
      "Sign in to keep your collection and decks in sync across your devices. You don't need an account: without one, everything stays on this device.",
    );
    expect(buttons(el).filter((b) => b !== 'Close')).toEqual(['Sign in with an email link']);
    expect(text(el)).not.toContain('Google');
  });

  it("SYNC-006 with authProviders ['email-link', 'google'] the dialog shows both, in configured order", async () => {
    const el = await openSignInDialog(['email-link', 'google']);
    expect(buttons(el).filter((b) => b !== 'Close')).toEqual(['Sign in with an email link', 'Continue with Google']);
  });

  it('SYNC-006 enabledProviders keeps known ids only, once each, in order', () => {
    expect(enabledProviders(['google', 'email-link', 'google', 'apple']).map((p) => p.id)).toEqual(['google', 'email-link']);
    expect(enabledProviders([])).toEqual([]);
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
            deletion: () => null,
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

describe('AccountMenu during an unfinished deletion (SPEC-010 SYNC-096, AC 43)', () => {
  afterEach(() => document.querySelectorAll('.cdk-overlay-container').forEach((el) => (el.innerHTML = '')));

  const overlayText = () => text(document.querySelector('.cdk-overlay-container')!);
  const menuButtons = () => Array.from(document.querySelectorAll<HTMLButtonElement>('.cdk-overlay-container button'));
  const menuButton = (label: string) => menuButtons().find((b) => text(b) === label);

  async function openMenu(fixture: ComponentFixture<AccountMenu>): Promise<void> {
    const el = fixture.nativeElement as HTMLElement;
    const trigger = Array.from(el.querySelectorAll('button')).find((b) => text(b) === 'Account')!;
    trigger.click();
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function stubbed(deletion: { canCancel: boolean } | null, online = true): string[] {
    const calls: string[] = [];
    TestBed.configureTestingModule({
      imports: [AccountMenu],
      providers: [
        {
          provide: SyncService,
          useValue: {
            enabled: true,
            start: () => undefined,
            signedIn: () => true,
            online: () => online,
            statusLine: () => "Some data couldn't be deleted. Try again.",
            deletion: signal(deletion),
            pendingCount: () => 0,
            deleteAccount: async () => (calls.push('deleteAccount'), 'ok'),
            cancelDeletion: async () => (calls.push('cancelDeletion'), true),
          },
        },
      ],
    });
    return calls;
  }

  async function menuFor(deletion: { canCancel: boolean } | null, online = true) {
    const calls = stubbed(deletion, online);
    const fixture = TestBed.createComponent(AccountMenu);
    await fixture.whenStable();
    await openMenu(fixture);
    return { fixture, calls };
  }

  it('AC 43 with nothing removed the menu shows the Error status, Try again and Cancel deletion', async () => {
    await menuFor({ canCancel: true });
    expect(overlayText()).toContain("Some data couldn't be deleted. Try again.");
    expect(menuButtons().map(text)).toEqual(['Try again', 'Cancel deletion', 'Sync now', 'Sign out', 'Delete account and data']);
  });

  it('AC 43 once something was removed only Try again is offered, and Sign out stays available', async () => {
    await menuFor({ canCancel: false });
    expect(menuButtons().map(text)).toEqual(['Try again', 'Sync now', 'Sign out', 'Delete account and data']);
    expect(menuButton('Sign out')!.disabled).toBe(false);
  });

  it('SYNC-096 without an unfinished deletion the menu offers neither Try again nor Cancel deletion', async () => {
    await menuFor(null);
    expect(menuButtons().map(text)).toEqual(['Sync now', 'Sign out', 'Delete account and data']);
  });

  it('SYNC-096 the menu Try again reruns the deletion without the confirmation dialog', async () => {
    const { fixture, calls } = await menuFor({ canCancel: true });
    menuButton('Try again')!.click();
    await fixture.whenStable();
    expect(calls).toEqual(['deleteAccount']);
    expect(document.querySelector('mat-dialog-container')).toBeNull();
  });

  it('SYNC-096 the menu Cancel deletion calls Cancel deletion and dismisses the failure notice', async () => {
    const { fixture, calls } = await menuFor({ canCancel: true });
    // a still-visible "Try again" notice must not restart the cancelled deletion
    const dismiss = vi.spyOn(TestBed.inject(MatSnackBar), 'dismiss');
    menuButton('Cancel deletion')!.click();
    await fixture.whenStable();
    expect(calls).toEqual(['cancelDeletion']);
    expect(dismiss).toHaveBeenCalled();
  });

  it('SYNC-081 offline the menu Try again is disabled (a deletion needs a connection)', async () => {
    await menuFor({ canCancel: true }, false);
    expect(menuButton('Try again')!.disabled).toBe(true);
    expect(overlayText()).toContain("You're offline.");
  });

  it('AC 43 after a reload the real SyncService restores the unfinished deletion; Cancel deletion resumes syncing', async () => {
    localStorage.clear();
    const db = new FakeFirestore();
    db.docs.set('users/uA', { schemaVersion: 1, createdAt: 1, updatedAt: 1, syncedAt: 1, lastClientVersion: 'x' });
    const auth = new FakeAuth();
    auth.uid = 'uA';
    const remote = new FakeRemote(db);
    const log: StoredSyncLog = {
      ...emptySyncLog(),
      uid: 'uA',
      sessionExpected: true,
      lastFullSyncAt: Date.now(),
      lastSyncAt: Date.now(),
      cursors: { state: 1, decks: 1 },
      deletingUid: 'uA',
      deletingRemovedAny: false,
    };
    localStorage.setItem(STORAGE_KEYS.syncLog, JSON.stringify(log));
    const notices: string[] = [];
    TestBed.configureTestingModule({
      imports: [AccountMenu],
      providers: [
        { provide: SIGN_IN_ENABLED, useValue: true },
        { provide: SYNC_ADAPTERS, useValue: async () => ({ auth, remote }) },
        {
          provide: MatSnackBar,
          useValue: {
            open: (m: string) => (notices.push(m), { onAction: () => ({ subscribe: () => undefined }) }),
            dismiss: () => undefined,
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(AccountMenu);
    const sync = TestBed.inject(SyncService);
    await vi.waitFor(() => expect(sync.deletion()).toEqual({ canCancel: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(db.reads).toBe(0); // no pull while the deletion is unfinished
    await openMenu(fixture);
    expect(menuButtons().map(text).slice(0, 2)).toEqual(['Try again', 'Cancel deletion']);
    expect(overlayText()).toContain("Some data couldn't be deleted. Try again.");

    menuButton('Cancel deletion')!.click();
    await vi.waitFor(() => expect(sync.status().kind).toBe('synced'));
    expect(sync.deletion()).toBeNull();
    expect(notices).toContain("Your account wasn't deleted.");
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.syncLog)!) as StoredSyncLog;
    expect(saved.deletingUid).toBeNull();
    expect(saved.deletingRemovedAny).toBeUndefined();
    expect(db.reads).toBeGreaterThan(0); // the account check and pull ran again
    localStorage.clear();
  });
});
