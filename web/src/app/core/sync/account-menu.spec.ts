import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AccountMenu } from './account-menu';
import * as dialogs from './sync-dialogs';
import { DeleteAccountDialog, SignInDialog, SignOutDialog } from './sync-dialogs';
import { SYNC_ADAPTERS, SyncService, isEmailLinkUrl } from './sync.service';
import { environment } from '../../../environments/environment';
import { enabledProviders } from '../../shared/sync/sync-types';
import type { StoredSyncLog } from '../../shared/sync/sync-types';
import { emptySyncLog } from '../../shared/sync/sync-log';
import { FakeAuth, FakeFirestore, FakeRemote } from '../../shared/sync/testing/fakes';
import { AppStores } from '../storage/app-stores';
import { STORAGE_KEYS } from '../storage/local-stores';

const text = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();
const buttons = (root: HTMLElement) => Array.from(root.querySelectorAll('button')).map(text);
/** Disabled natively or through Material's disabledInteractive (Sync now, H-122). */
const isDisabled = (b: HTMLButtonElement) => b.disabled || b.getAttribute('aria-disabled') === 'true';

describe('Sign-in UI (SPEC-010)', () => {
  let adapterLoads: number;
  const setup = () => {
    adapterLoads = 0;
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [AccountMenu],
      providers: [
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

  it('SYNC-007 / SYNC-002 / AC 35 the Sign in action is shown to a signed-out visitor (no sign-in flag), still without loading Firebase', async () => {
    setup();
    const fixture = TestBed.createComponent(AccountMenu);
    TestBed.inject(SyncService).start();
    await fixture.whenStable();
    expect(buttons(fixture.nativeElement)).toEqual(['Sign in']);
    expect(adapterLoads).toBe(0);
  });

  it('SYNC-002 a stored linked uid with sessionExpected false loads no Firebase at start-up', async () => {
    setup();
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

  it('SYNC-003 / SYNC-006 (a) with the default config the sign-in dialog offers only the email form, with no provider button', async () => {
    const el = await openSignInDialog(environment.authProviders);
    expect(environment.authProviders).toEqual(['email-link']);
    expect(text(el)).toContain(
      "Sign in to import your cards and decks. They're saved to your account, so you'll see them on any device you sign in on.",
    );
    // SYNC-003 v0.8 / AC 3 / AC 48: no warning about legacy local data
    expect(text(el)).not.toMatch(/this device|cleared|removed|legacy|don't need an account/i);
    // SYNC-006 v0.10 (a), H-104: email link is the only provider, so the form shows at once.
    expect(buttons(el).filter((b) => b !== 'Close')).toEqual(['Send link']);
    expect(el.querySelector('input[type="email"]')).not.toBeNull();
    expect(text(el)).not.toContain('Google');
  });

  it("SYNC-006 (b) with authProviders ['email-link', 'google'] the dialog shows both, in configured order, and no field", async () => {
    const el = await openSignInDialog(['email-link', 'google']);
    expect(buttons(el).filter((b) => b !== 'Close')).toEqual(['Sign in with an email link', 'Continue with Google']);
    expect(el.querySelector('input')).toBeNull();
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
        expect(text(syncNow)).toBe('Sync now');
        expect(isDisabled(syncNow)).toBe(false);
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
        expect(isDisabled(button('Sync now'))).toBe(false); // the sync finished (label back to Sync now)
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
      expect(isDisabled(button('Sync now'))).toBe(true);
      expect(button('Sign out anyway').disabled).toBe(true);
      expect(button('Cancel').disabled).toBe(false);
      online.set(true);
      await settle();
      expect(isDisabled(button('Sync now'))).toBe(false);
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
            status: () => ({ kind: 'synced', at: 0, pendingCount: 0 }),
            currentEmail: () => null,
            username: signal<string | null>(null),
            accountReady: signal(true),
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

  function stubbed(deletion: { canCancel: boolean } | null, online = true, email: string | null = null): string[] {
    const calls: string[] = [];
    // A deletion is the Error status online or offline: the engine ranks it above Offline and Paused
    // (sync-engine-cancel-deletion.spec.ts, SYNC-084 / SYNC-096 / AC 54).
    const status = deletion
      ? { kind: 'error', message: "Some data couldn't be deleted. Try again.", pendingCount: 0 }
      : { kind: online ? 'synced' : 'offline', at: 0, pendingCount: 0 };
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
            statusLine: () => (deletion ? "Some data couldn't be deleted. Try again." : 'Synced · 9:41 AM'),
            status: () => status,
            currentEmail: () => email,
            username: signal<string | null>(null),
            accountReady: signal(true),
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

  async function menuFor(deletion: { canCancel: boolean } | null, online = true, email: string | null = null) {
    const calls = stubbed(deletion, online, email);
    const fixture = TestBed.createComponent(AccountMenu);
    await fixture.whenStable();
    await openMenu(fixture);
    return { fixture, calls };
  }

  it('AC 43 with nothing removed the menu shows the Error status, Try deleting again and Cancel deletion', async () => {
    await menuFor({ canCancel: true });
    expect(overlayText()).toContain("Some data couldn't be deleted. Try again.");
    // SYNC-151 / AC 54 (v0.14): Delete account and data lives in Account Information.
    expect(menuButtons().map(text)).toEqual(['Try deleting again', 'Cancel deletion', 'Account Information', 'System', 'Light', 'Dark', 'Sign out']);
  });

  it('AC 43 once something was removed only Try deleting again is offered, and Sign out stays available', async () => {
    await menuFor({ canCancel: false });
    expect(menuButtons().map(text)).toEqual(['Try deleting again', 'Account Information', 'System', 'Light', 'Dark', 'Sign out']);
    expect(menuButton('Sign out')!.disabled).toBe(false);
  });

  it('SYNC-096 without an unfinished deletion the menu offers neither Try deleting again nor Cancel deletion', async () => {
    await menuFor(null);
    expect(menuButtons().map(text)).toEqual(['Sync now', 'Account Information', 'System', 'Light', 'Dark', 'Sign out']);
  });

  it('SYNC-151 / AC 72: no Delete account and data item, no Settings item and no /account link in the menu', async () => {
    await menuFor({ canCancel: true });
    expect(menuButton('Delete account and data')).toBeUndefined();
    expect(overlayText()).not.toMatch(/Settings/);
    expect(document.querySelector('.cdk-overlay-container a[href*="account"]')).toBeNull();
    expect(menuButtons().filter((b) => b.classList.contains('danger'))).toEqual([]);
  });

  it('SYNC-096 AC 43 the menu Try deleting again reruns the deletion without the confirmation dialog', async () => {
    const { fixture, calls } = await menuFor({ canCancel: true });
    menuButton('Try deleting again')!.click();
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

  it('SYNC-081 offline the menu Try deleting again is disabled (a deletion needs a connection)', async () => {
    await menuFor({ canCancel: true }, false);
    expect(menuButton('Try deleting again')!.disabled).toBe(true);
    expect(overlayText()).toContain("You're offline.");
  });

  it('SYNC-081 / AC 20 offline the menu Sign out is disabled and the offline line shows', async () => {
    await menuFor(null, false);
    expect(menuButton('Sign out')!.disabled).toBe(true);
    expect(menuButton('Sync now')!.disabled).toBe(true);
    // SYNC-151 / AC 72: Account Information and Theme need no network.
    expect(menuButton('Account Information')!.disabled).toBe(false);
    expect(menuButton('Dark')!.disabled).toBe(false);
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
    expect(menuButtons().map(text).slice(0, 2)).toEqual(['Try deleting again', 'Cancel deletion']);
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

describe('AccountMenu identity line, deletion state and groups (SPEC-010 SYNC-003, SYNC-084, SYNC-096, SYNC-100)', () => {
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => (el.innerHTML = ''));
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const panel = () => document.querySelector<HTMLElement>('.mat-mdc-menu-content')!;
  const menuButtons = () => Array.from(panel().querySelectorAll<HTMLButtonElement>('button'));
  const menuButton = (label: string) => menuButtons().find((b) => text(b) === label);
  /** The panel's element children, as 'divider', 'item:<label>' or 'text:<words>'. */
  const layout = () =>
    Array.from(panel().children).map((el) => {
      const tag = el.tagName.toLowerCase();
      if (tag === 'mat-divider') return 'divider';
      if (el.getAttribute('role') === 'group') {
        const items = Array.from(el.querySelectorAll('button')).map(text).join(',');
        return `group:${text(el.querySelector('p')!)}(${items})`;
      }
      return tag === 'button' ? `item:${text(el)}` : `text:${text(el)}`;
    });

  const trigger = (fixture: ComponentFixture<AccountMenu>) =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) => text(b) === 'Account')!;

  /** Opens the menu (or leaves it open), then renders. */
  async function openMenu(fixture: ComponentFixture<AccountMenu>): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    if (trigger(fixture).getAttribute('aria-expanded') !== 'true') trigger(fixture).click();
    fixture.detectChanges();
    await fixture.whenStable();
  }

  /** The real SyncService and engine over the fakes, with captured notices and console output. */
  function realService(auth: FakeAuth, db: FakeFirestore, opts: { newAccount?: boolean } = {}) {
    // A returning account by default, so the SYNC-154 username prompt of a new account stays out of these tests.
    if (!opts.newAccount && !db.docs.has('users/uA')) db.docs.set('users/uA', { ...accountDoc });
    const notices: [string, string | undefined][] = [];
    const consoleOut: string[] = [];
    for (const m of ['log', 'info', 'warn', 'error', 'debug'] as const) {
      vi.spyOn(console, m).mockImplementation((...args: unknown[]) => {
        consoleOut.push(args.map((a) => (typeof a === 'string' ? a : String(JSON.stringify(a)))).join(' '));
      });
    }
    TestBed.configureTestingModule({
      imports: [AccountMenu],
      providers: [
        { provide: SYNC_ADAPTERS, useValue: async () => ({ auth, remote: new FakeRemote(db) }) },
        {
          provide: MatSnackBar,
          useValue: {
            open: (m: string, a?: string) => (notices.push([m, a]), { onAction: () => ({ subscribe: () => undefined }) }),
            dismiss: () => undefined,
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(AccountMenu);
    return { fixture, sync: TestBed.inject(SyncService), notices, consoleOut };
  }

  const allLocalStorage = () =>
    Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)!)
      .map((k) => `${k}=${localStorage.getItem(k)}`)
      .join('\n');

  const accountDoc = { schemaVersion: 1, createdAt: 1, updatedAt: 1, syncedAt: 1, lastClientVersion: 'x' };

  it('AC 53 SYNC-003 the first line reads "Signed in as {email}" above the status, as text; SYNC-100 the address is written nowhere', async () => {
    localStorage.clear();
    const db = new FakeFirestore();
    const auth = new FakeAuth();
    auth.email = 'rj@example.com';
    auth.nextSignIn = 'uA';
    const { fixture, sync, consoleOut } = realService(auth, db);
    await fixture.whenStable();
    await sync.signInWithGoogle(); // the fake ignores the provider: a sign-in, then the first sync
    await vi.waitFor(() => expect(sync.status().kind).toBe('synced'));
    await sync.syncNow();
    await openMenu(fixture);

    const first = panel().firstElementChild as HTMLElement;
    expect(first.tagName.toLowerCase()).toBe('p');
    expect(text(first)).toBe('Signed in as rj@example.com');
    expect(first.hasAttribute('tabindex')).toBe(false);
    expect(first.hasAttribute('role')).toBe(false);
    expect(first.classList.contains('mat-mdc-menu-item')).toBe(false);
    const status = first.nextElementSibling as HTMLElement;
    expect(status.getAttribute('role')).toBe('status');
    expect(text(status)).toMatch(/^Synced · /);
    // Brief H-141 decision 3: opening the menu reads who is signed in, then the status.
    expect(document.querySelector('.mat-mdc-menu-panel')!.getAttribute('aria-describedby')).toBe(`${first.id} ${status.id}`);

    // SYNC-100: not in any local store (the sync log included), the cloud documents, the pushes or the console.
    const address = 'rj@example.com';
    expect(db.docs.size).toBeGreaterThan(0);
    expect(localStorage.getItem(STORAGE_KEYS.syncLog)).not.toBeNull();
    expect(allLocalStorage()).not.toContain(address);
    expect(JSON.stringify(Array.from(db.docs.entries()))).not.toContain(address);
    expect(JSON.stringify(db.pushLog)).not.toContain(address);
    expect(JSON.stringify(db.writeLog)).not.toContain(address);
    expect(consoleOut.join('\n')).not.toContain(address);
  });

  it('AC 53 SYNC-003 the menu shows the address Auth reports when it is opened: a changed or removed address shows on reopening', async () => {
    const auth = new FakeAuth();
    auth.email = 'rj@example.com';
    const { fixture, sync } = realService(auth, new FakeFirestore());
    await fixture.whenStable();
    await sync.signInWithGoogle();
    await vi.waitFor(() => expect(sync.status().kind).toBe('synced'));
    await openMenu(fixture);
    expect(text(panel().firstElementChild!)).toBe('Signed in as rj@example.com');

    const close = async () => {
      document.querySelector<HTMLElement>('.cdk-overlay-backdrop')?.click();
      fixture.detectChanges();
      await fixture.whenStable();
      await vi.waitFor(() => expect(trigger(fixture).getAttribute('aria-expanded')).not.toBe('true'));
    };
    await close();
    auth.email = 'other@example.com'; // Auth now reports another address; nothing in the app was told
    await openMenu(fixture);
    expect(text(panel().firstElementChild!)).toBe('Signed in as other@example.com');

    await close();
    auth.email = null;
    await openMenu(fixture);
    expect(text(panel())).not.toContain('Signed in as');
    expect(panel().firstElementChild!.getAttribute('role')).toBe('status');
  });

  it('AC 53 when Auth reports no address there is no "Signed in as" line and the menu starts with the status', async () => {
    const auth = new FakeAuth();
    auth.email = null;
    const { fixture, sync } = realService(auth, new FakeFirestore());
    await fixture.whenStable();
    await sync.signInWithGoogle();
    await vi.waitFor(() => expect(sync.status().kind).toBe('synced'));
    await openMenu(fixture);
    expect(text(panel())).not.toContain('Signed in as');
    const first = panel().firstElementChild as HTMLElement;
    expect(first.getAttribute('role')).toBe('status');
    expect(document.querySelector('.mat-mdc-menu-panel')!.getAttribute('aria-describedby')).toBe(first.id);
  });

  it('AC 54 3 pending and an unfinished deletion: exact status, no Sync now, notice action Try again; Cancel deletion brings Sync now back and pushes the 3', async () => {
    const db = new FakeFirestore();
    db.docs.set('users/uA', { ...accountDoc });
    const auth = new FakeAuth();
    auth.uid = 'uA';
    const now = Date.now();
    const log: StoredSyncLog = {
      ...emptySyncLog(),
      uid: 'uA',
      sessionExpected: true,
      lastFullSyncAt: now,
      lastSyncAt: now,
      cursors: { state: 1, decks: 1 },
      deletingUid: 'uA',
      deletingRemovedAny: false,
    };
    localStorage.setItem(STORAGE_KEYS.syncLog, JSON.stringify(log));
    const { fixture, sync, notices } = realService(auth, db);
    await vi.waitFor(() => expect(sync.deletion()).toEqual({ canCancel: true }));
    // 3 card edits, kept pending while the deletion is unfinished
    await TestBed.inject(AppStores).stores.collection.save({
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
      catalogVersion: '0.2+2026-11-20T18:04:00Z',
      cards: {
        'hextech ray': { quantity: 3, byPrinting: {} },
        'lightning rush': { quantity: 1, byPrinting: {} },
        'mystic shot': { quantity: 2, byPrinting: {} },
      },
    });
    await vi.waitFor(() => expect(sync.pendingCount()).toBe(3));
    await new Promise((r) => setTimeout(r, 2100)); // past the push debounce: still nothing pushed
    expect(db.pushLog).toHaveLength(0);
    await openMenu(fixture);

    const status = panel().querySelector('[role="status"]')!;
    expect(text(status)).toBe("Some data couldn't be deleted. Try again.");
    expect(text(panel())).not.toContain('not synced yet');
    expect(status.classList.contains('error')).toBe(true);
    expect(status.querySelector('app-icon')?.getAttribute('aria-hidden')).toBe('true');
    expect(menuButtons().map(text)).toEqual(['Try deleting again', 'Cancel deletion', 'Account Information', 'System', 'Light', 'Dark', 'Sign out']);
    expect(menuButton('Sync now')).toBeUndefined();

    // Try deleting again fails again (nothing removed): the failure notice's action still reads "Try again".
    const deleteAll = vi.spyOn(FakeRemote.prototype, 'deleteAll').mockResolvedValue({ remaining: 4, removedAny: false });
    menuButton('Try deleting again')!.click();
    await vi.waitFor(() => expect(notices.some(([, a]) => a === 'Try again')).toBe(true));
    expect(notices.find(([, a]) => a === 'Try again')![0]).toBe("Some data couldn't be deleted. Try again.");
    deleteAll.mockRestore();
    await vi.waitFor(() => expect(sync.deletion()).toEqual({ canCancel: true }));

    await openMenu(fixture);
    expect(menuButton('Sync now')).toBeUndefined();
    menuButton('Cancel deletion')!.click();
    await vi.waitFor(() => expect(sync.status().kind).toBe('synced'));
    expect(sync.deletion()).toBeNull();
    expect(notices.map(([m]) => m)).toContain("Your account wasn't deleted.");
    await vi.waitFor(() => expect(sync.pendingCount()).toBe(0));
    expect(Object.keys(db.get('users/uA/state/collection').cards).sort()).toEqual(['hextech ray', 'lightning rush', 'mystic shot']);
    await openMenu(fixture);
    expect(menuButtons().map(text)).toEqual(['Sync now', 'Account Information', 'System', 'Light', 'Dark', 'Sign out']);
  });

  /** H-110: exactly 3 dividers, none first, last or next to another. */
  const expectCleanDividers = (l: string[]) => {
    expect(l.filter((x) => x === 'divider')).toHaveLength(3);
    expect(l[0]).not.toBe('divider');
    expect(l[l.length - 1]).not.toBe('divider');
    l.forEach((x, i) => {
      if (x === 'divider') expect(l[i + 1]).not.toBe('divider');
    });
  };

  async function stubMenu(opts: { deletion: { canCancel: boolean } | null; online: boolean; email: string | null }) {
    // A deletion is the Error status even offline, as the engine reports it (sync-engine-cancel-deletion.spec.ts).
    const status = opts.deletion
      ? { kind: 'error', message: "Some data couldn't be deleted. Try again.", pendingCount: 3 }
      : opts.online
        ? { kind: 'synced', at: 0, pendingCount: 0 }
        : { kind: 'offline', pendingCount: 0 };
    const line = opts.deletion
      ? "Some data couldn't be deleted. Try again."
      : opts.online
        ? 'Synced · 9:41 AM'
        : 'Offline · changes are saved on this device';
    TestBed.configureTestingModule({
      imports: [AccountMenu],
      providers: [
        {
          provide: SyncService,
          useValue: {
            enabled: true,
            start: () => undefined,
            signedIn: () => true,
            online: () => opts.online,
            status: () => status,
            statusLine: () => line,
            currentEmail: () => opts.email,
            username: signal<string | null>(null),
            accountReady: signal(true),
            deletion: () => opts.deletion,
            pendingCount: () => 0,
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(AccountMenu);
    await fixture.whenStable();
    await openMenu(fixture);
    return layout();
  }

  it('H-110 / SYNC-151 / AC 72 normal: [identity, status] / [Sync now] / [Account Information, Theme] / [Sign out], 3 dividers, none leading, trailing or doubled', async () => {
    const l = await stubMenu({ deletion: null, online: true, email: 'rj@example.com' });
    expect(l).toEqual([
      'text:Signed in as rj@example.com',
      'text:Synced · 9:41 AM',
      'divider',
      'item:Sync now',
      'divider',
      'item:Account Information',
      'group:Theme(System,Light,Dark)',
      'divider',
      'item:Sign out',
    ]);
    expectCleanDividers(l);
  });

  it('H-110 / AC 54 deletion: [status] / [Try deleting again, Cancel deletion] / [Account Information, Theme] / [Sign out], no empty group', async () => {
    const l = await stubMenu({ deletion: { canCancel: true }, online: true, email: null });
    expect(l).toEqual([
      "text:Some data couldn't be deleted. Try again.",
      'divider',
      'item:Try deleting again',
      'item:Cancel deletion',
      'divider',
      'item:Account Information',
      'group:Theme(System,Light,Dark)',
      'divider',
      'item:Sign out',
    ]);
    expectCleanDividers(l);
  });

  it('H-110 deletion with nothing to cancel keeps one divider each side of Try deleting again', async () => {
    const l = await stubMenu({ deletion: { canCancel: false }, online: true, email: 'rj@example.com' });
    expect(l.slice(2, 5)).toEqual(['divider', 'item:Try deleting again', 'divider']);
    expectCleanDividers(l);
  });

  it("H-110 / SYNC-081 offline: You're offline. is right under the status, above the first divider; Sign out is last", async () => {
    const l = await stubMenu({ deletion: null, online: false, email: 'rj@example.com' });
    expect(l).toEqual([
      'text:Signed in as rj@example.com',
      'text:Offline · changes are saved on this device',
      "text:You're offline.",
      'divider',
      'item:Sync now',
      'divider',
      'item:Account Information',
      'group:Theme(System,Light,Dark)',
      'divider',
      'item:Sign out',
    ]);
    expectCleanDividers(l);
  });

  it('H-110 offline during a deletion keeps the same clean grouping', async () => {
    const l = await stubMenu({ deletion: { canCancel: true }, online: false, email: null });
    expect(l[1]).toBe("text:You're offline.");
    expectCleanDividers(l);
  });
});

describe('AccountMenu header trigger (H-123)', () => {
  it('H-123 Sign in carries the header-only 44px class with the strong control edge; signed in it is the SYNC-150 account control', async () => {
    const signedIn = signal(false);
    TestBed.configureTestingModule({
      imports: [AccountMenu],
      providers: [
        {
          provide: SyncService,
          useValue: {
            enabled: true,
            start: () => undefined,
            signedIn,
            online: () => true,
            statusLine: () => '',
            status: () => ({ kind: 'synced', at: 0, pendingCount: 0 }),
            currentEmail: () => null,
            username: signal<string | null>(null),
            accountReady: signal(true),
            deletion: () => null,
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(AccountMenu);
    await fixture.whenStable();
    const trigger = () => (fixture.nativeElement as HTMLElement).querySelector('button')!;
    expect(text(trigger())).toBe('Sign in');
    expect(trigger().classList).toContain('header-account');
    signedIn.set(true);
    await fixture.whenStable();
    // SYNC-150 (b), (c): signed in, the ghost account control (no outlined class); "Account" with no username.
    expect(text(trigger())).toBe('Account');
    expect(trigger().classList).toContain('account-trigger');
    expect(trigger().classList).not.toContain('header-account');
    const styles = Array.from(document.querySelectorAll('style'))
      .map((s) => s.textContent ?? '')
      .find((css) => css.includes('.header-account'));
    expect(styles).toMatch(/--mat-button-outlined-container-height:\s*44px/);
    expect(styles).toMatch(/--mat-button-outlined-outline-color:\s*var\(--color-border-strong\)/);
  });
});
