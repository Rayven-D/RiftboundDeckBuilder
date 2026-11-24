import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AccountMenu } from './account-menu';
import * as dialogs from './sync-dialogs';
import { DeleteAccountDialog, SignInDialog, SignOutDialog } from './sync-dialogs';
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

  it('SYNC-002 a stored linked uid with sessionExpected false loads no Firebase at start-up', async () => {
    setup(true);
    const seeded: StoredSyncLog = { ...emptySyncLog(), uid: 'uA', sessionExpected: false, lastFullSyncAt: 1, cursors: { state: 1, decks: 1 } };
    localStorage.setItem(STORAGE_KEYS.syncLog, JSON.stringify(seeded));
    const fixture = TestBed.createComponent(AccountMenu);
    TestBed.inject(SyncService).start();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));
    expect(adapterLoads).toBe(0);
    expect(buttons(fixture.nativeElement)).toEqual(['Sign in']);
    localStorage.clear();
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
      "Sign in to import your cards and decks. They're saved to your account, so you'll see them on any device you sign in on.",
    );
    // SYNC-003 v0.8 / AC 3 / AC 48: no warning about legacy local data
    expect(text(el)).not.toMatch(/this device|cleared|removed|legacy|don't need an account/i);
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

  it('SYNC-049 / AC 5 there is no Combine dialog any more', () => {
    expect(Object.keys(dialogs).some((k) => /combine/i.test(k))).toBe(false);
  });

  describe('SYNC-090 / SYNC-081 the sign-out dialog (AC 20)', () => {
    async function openSignOut(pending: number, onSync: () => number = () => pending) {
      let closed: unknown = 'not closed';
      let count = pending;
      const online = signal(true);
      TestBed.configureTestingModule({
        imports: [SignOutDialog],
        providers: [
          {
            provide: MAT_DIALOG_DATA,
            useValue: {
              pending: () => count,
              online,
              syncNow: async () => {
                count = onSync();
              },
            },
          },
          { provide: MatDialogRef, useValue: { close: (v: unknown) => (closed = v) } },
        ],
      });
      const fixture = TestBed.createComponent(SignOutDialog);
      await fixture.whenStable();
      const el = fixture.nativeElement as HTMLElement;
      const button = (label: string) => Array.from(el.querySelectorAll('button')).find((b) => text(b) === label)!;
      const settle = async () => {
        fixture.detectChanges();
        await fixture.whenStable();
      };
      return { el, button, online, settle, closed: () => closed };
    }

    it('SYNC-090 AC 20 with nothing pending: the plain question with Sign out (primary) and Cancel; no Keep a copy', async () => {
      const { el, button, settle, closed } = await openSignOut(0);
      expect(text(el.querySelector('h2')!)).toBe('Sign out?');
      expect(text(el)).toContain(
        'Your collection and decks stay in your account and are removed from this device. Sign in again to get them back.',
      );
      expect(buttons(el)).toEqual(['Cancel', 'Sign out']);
      expect(button('Sign out').getAttribute('matButton')).toBe('filled');
      button('Sign out').click();
      await settle();
      expect(closed()).toBe(true);
    });

    it('SYNC-090 AC 20 with 1 pending change: the warning with Sync now (primary), Sign out anyway and Cancel', async () => {
      const { el, button, settle, closed } = await openSignOut(1);
      expect(text(el)).toContain("1 change hasn't synced yet. It'll be lost if you sign out now.");
      expect(buttons(el)).toEqual(['Cancel', 'Sign out anyway', 'Sync now']);
      expect(text(el)).not.toMatch(/Keep a copy|Remove/);
      expect(button('Sync now').getAttribute('matButton')).toBe('filled');
      button('Sign out anyway').click();
      await settle();
      expect(closed()).toBe(true);
    });

    it('SYNC-090 AC 20 Sync now keeps the dialog open and switches to the plain question once nothing is pending', async () => {
      const { el, button, settle, closed } = await openSignOut(1, () => 0);
      button('Sync now').click();
      await vi.waitFor(async () => {
        await settle();
        expect(buttons(el)).toEqual(['Cancel', 'Sign out']);
      });
      expect(closed()).toBe('not closed');
      expect(text(el)).toContain('Your collection and decks stay in your account and are removed from this device.');
    });

    it('SYNC-090 a Sync now that rejects is caught: the dialog stays open and re-reads the count', async () => {
      // Vitest fails the run on an unhandled rejection, so an uncaught syncNow() error would show up there.
      const syncNowCalls = vi.fn(() => Promise.reject(new Error('push failed')));
      let closed: unknown = 'not closed';
      TestBed.configureTestingModule({
        imports: [SignOutDialog],
        providers: [
          {
            provide: MAT_DIALOG_DATA,
            useValue: { pending: () => 2, online: signal(true), syncNow: syncNowCalls },
          },
          { provide: MatDialogRef, useValue: { close: (v: unknown) => (closed = v) } },
        ],
      });
      const fixture = TestBed.createComponent(SignOutDialog);
      await fixture.whenStable();
      const el = fixture.nativeElement as HTMLElement;
      const syncNow = Array.from(el.querySelectorAll('button')).find((b) => text(b) === 'Sync now')!;
      syncNow.click();
      await vi.waitFor(async () => {
        fixture.detectChanges();
        await fixture.whenStable();
        expect(syncNow.disabled).toBe(false);
      });
      await new Promise((r) => setTimeout(r));
      expect(syncNowCalls).toHaveBeenCalledTimes(1);
      expect(closed).toBe('not closed');
      expect(text(el)).toContain("2 changes haven't synced yet. They'll be lost if you sign out now.");
    });

    it('SYNC-090 AC 20 a rejected push leaves the warning with the new count', async () => {
      const { el, button, settle } = await openSignOut(1, () => 1);
      button('Sync now').click();
      await vi.waitFor(async () => {
        await settle();
        expect(button('Sync now').disabled).toBe(false); // the sync finished
      });
      expect(text(el)).toContain("1 change hasn't synced yet. It'll be lost if you sign out now.");
      expect(buttons(el)).toEqual(['Cancel', 'Sign out anyway', 'Sync now']);
    });

    it("SYNC-081 AC 20 the connection drops while open: You're offline, only Cancel works; buttons return online", async () => {
      const { el, button, online, settle } = await openSignOut(1);
      online.set(false);
      await settle();
      expect(text(el)).toContain("You're offline.");
      expect(text(el)).toContain("1 change hasn't synced yet.");
      expect(button('Sync now').disabled).toBe(true);
      expect(button('Sign out anyway').disabled).toBe(true);
      expect(button('Cancel').disabled).toBe(false);
      online.set(true);
      await settle();
      expect(button('Sync now').disabled).toBe(false);
      expect(button('Sign out anyway').disabled).toBe(false);
      expect(text(el)).not.toContain("You're offline.");
    });

    it('SYNC-081 offline with nothing pending, Sign out is disabled', async () => {
      const { button, online, settle } = await openSignOut(0);
      online.set(false);
      await settle();
      expect(button('Sign out').disabled).toBe(true);
    });
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

  it('H-102: the Delete account dialog button is a filled danger button; Cancel is not', async () => {
    TestBed.configureTestingModule({
      imports: [DeleteAccountDialog],
      providers: [{ provide: MatDialogRef, useValue: { close: () => undefined } }],
    });
    const fixture = TestBed.createComponent(DeleteAccountDialog);
    await fixture.whenStable();
    const all = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    const del = all.find((b) => text(b) === 'Delete account')!;
    expect(del.classList).toContain('danger');
    expect(del.classList).toContain('mat-mdc-unelevated-button');
    expect(all.find((b) => text(b) === 'Cancel')!.classList).not.toContain('danger');
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

  it('H-102: one divider directly precedes Delete account and data, which carries the danger class', async () => {
    await menuFor({ canCancel: true });
    const panel = document.querySelector('.mat-mdc-menu-panel')!;
    expect(panel.querySelectorAll('mat-divider')).toHaveLength(1);
    const del = menuButton('Delete account and data')!;
    expect(del.classList.contains('danger')).toBe(true);
    expect(del.previousElementSibling?.tagName.toLowerCase()).toBe('mat-divider');
    expect(menuButtons().filter((b) => b.classList.contains('danger')).map(text)).toEqual(['Delete account and data']);
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

  it('SYNC-081 / AC 20 offline the menu Sign out is disabled and the offline line shows', async () => {
    await menuFor(null, false);
    expect(menuButton('Sign out')!.disabled).toBe(true);
    expect(menuButton('Sync now')!.disabled).toBe(true);
    expect(menuButton('Delete account and data')!.disabled).toBe(true);
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
