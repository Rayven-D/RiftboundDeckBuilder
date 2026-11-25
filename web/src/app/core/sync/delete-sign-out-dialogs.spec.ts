/**
 * SPEC-010 v0.10, built from brain/04-UI/Brief H-143 H-122.md:
 * - H-143 (SYNC-095, SYNC-096 step 1, AC 55, AC 38): the delete dialog decides at open between the
 *   type-to-confirm state and the sign-in-first state, whose Sign out hands off to the SYNC-090 dialog.
 * - H-122 (SYNC-090, SYNC-084, AC 56): the sign-out dialog keeps its explanation under the warning and labels
 *   Sync now "Syncing…" while it runs.
 */
import { InteractivityChecker } from '@angular/cdk/a11y';
import { Injectable, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import { AccountMenu } from './account-menu';
import { DeleteAccountDialog, SIGN_OUT_TEXT, SignOutDialog } from './sync-dialogs';
import { SYNC_ADAPTERS, SyncService } from './sync.service';
import { MESSAGES } from '../../shared/sync/sync-engine';
import type { StoredSyncLog } from '../../shared/sync/sync-types';
import { emptySyncLog } from '../../shared/sync/sync-log';
import { FakeAuth, FakeFirestore, FakeRemote } from '../../shared/sync/testing/fakes';
import { STORAGE_KEYS } from '../storage/local-stores';

const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const buttonsIn = (root: ParentNode) => Array.from(root.querySelectorAll<HTMLButtonElement>('button'));
const buttonIn = (root: ParentNode, label: string) => buttonsIn(root).find((b) => text(b) === label);
/** Disabled natively or through Material's `disabledInteractive` (aria-disabled, still focusable). */
const isDisabled = (b: HTMLButtonElement) => b.disabled || b.getAttribute('aria-disabled') === 'true';
const flush = () => new Promise((r) => setTimeout(r));

const DELETE_PARAGRAPH =
  "This deletes your account and the collection, tags, decks and locks saved in it, including the copy on this device and on every other device that syncs it. This can't be undone.";
const STEP_1 = 'To delete your account, sign out, sign in again, then choose Delete account and data within 5 minutes.';

describe('H-143 delete dialog states (SPEC-010 SYNC-095, AC 55, AC 38)', () => {
  function open(data: { signInFirst: boolean } | null) {
    let closed: unknown = 'not closed';
    TestBed.configureTestingModule({
      imports: [DeleteAccountDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: { close: (v: unknown) => (closed = v) } },
      ],
    });
    const fixture = TestBed.createComponent(DeleteAccountDialog);
    return { fixture, el: fixture.nativeElement as HTMLElement, closed: () => closed };
  }

  it('AC 55 H-143 sign-in-first state: title, the SYNC-095 paragraph, the step 1 sentence, no field, Cancel and Sign out (filled, not danger)', async () => {
    const { fixture, el, closed } = open({ signInFirst: true });
    await fixture.whenStable();
    expect(text(el.querySelector('h2'))).toBe('Delete your Rift Builder account?');
    const ps = Array.from(el.querySelectorAll('mat-dialog-content p'));
    expect(ps.map(text)).toEqual([DELETE_PARAGRAPH, STEP_1]);
    // One string: the SYNC-096 step 1 notice text.
    expect(MESSAGES.reauthNeeded).toBe(STEP_1);
    // Plain body text: no role, no live region, no muted note.
    const step = ps[1] as HTMLElement;
    expect(step.hasAttribute('role')).toBe(false);
    expect(step.hasAttribute('aria-live')).toBe(false);
    expect(step.classList.contains('note')).toBe(false);
    expect(el.querySelector('input')).toBeNull();
    expect(text(el)).not.toContain('Type delete to confirm');
    expect(buttonsIn(el).map(text)).toEqual(['Cancel', 'Sign out']);
    const signOut = buttonIn(el, 'Sign out')!;
    expect(signOut.getAttribute('matButton')).toBe('filled');
    expect(signOut.classList).not.toContain('danger');
    expect(signOut.getAttribute('aria-describedby')).toBe(step.id);
    expect(document.getElementById(step.id)).toBe(step);
    signOut.click();
    await fixture.whenStable();
    expect(closed()).toBe('sign-out');
  });

  it('AC 38 H-143 type-to-confirm state (no fresh sign-in needed): the field, and danger Delete account disabled until delete', async () => {
    const { fixture, el, closed } = open({ signInFirst: false });
    await fixture.whenStable();
    expect(text(el)).not.toContain(STEP_1);
    expect(buttonsIn(el).map(text)).toEqual(['Cancel', 'Delete account']);
    const del = buttonIn(el, 'Delete account')!;
    expect(del.classList).toContain('danger');
    expect(del.disabled).toBe(true);
    const input = el.querySelector('input')!;
    input.value = 'delete';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(del.disabled).toBe(false);
    del.click();
    expect(closed()).toBe(true);
  });
});

describe('H-122 sign-out dialog: explanation under the warning, "Syncing…" (SPEC-010 SYNC-090, SYNC-084, AC 56)', () => {
  /** A Sync now whose promise the test settles; `after` is the pending count once it settles. */
  function open(pending: number) {
    const online = signal(true);
    let count = pending;
    let settle: (after: number, reject?: boolean) => void = () => undefined;
    const syncCalls = vi.fn(
      () =>
        new Promise<void>((resolve, reject) => {
          settle = (after, fail = false) => {
            count = after;
            if (fail) reject(new Error('rejected'));
            else resolve();
          };
        }),
    );
    TestBed.configureTestingModule({
      imports: [SignOutDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { pending: () => count, online, syncNow: syncCalls } },
        { provide: MatDialogRef, useValue: { close: () => undefined } },
      ],
    });
    const fixture = TestBed.createComponent(SignOutDialog);
    const el = fixture.nativeElement as HTMLElement;
    const render = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
    };
    return { fixture, el, render, syncCalls, online, settle: (after: number, fail?: boolean) => settle(after, fail) };
  }

  const paragraphs = (el: HTMLElement) => Array.from(el.querySelectorAll<HTMLElement>('mat-dialog-content p'));

  it('AC 56 H-122 with 2 pending: the warning (alert) and directly under it the explanation, muted, with no role', async () => {
    const { fixture, el } = open(2);
    await fixture.whenStable();
    expect(text(el.querySelector('h2'))).toBe('Sign out?');
    const [warning, explanation, ...rest] = paragraphs(el);
    expect(rest).toEqual([]);
    expect(text(warning)).toBe("2 changes haven't synced yet. They'll be lost if you sign out now.");
    expect(warning.getAttribute('role')).toBe('alert');
    expect(warning.nextElementSibling).toBe(explanation);
    expect(text(explanation)).toBe(SIGN_OUT_TEXT);
    expect(explanation.classList).toContain('note');
    expect(explanation.hasAttribute('role')).toBe(false);
    expect(explanation.hasAttribute('aria-live')).toBe(false);
    // Brief decision 13: an 8px gap (the warning's margin-bottom), not the explanation's 1em top margin that
    // the two would collapse into. jsdom resolves neither var() nor UA margins, so the rule itself is checked
    // here; the computed 8px is checked in the browser (ui-engineer Playwright pass).
    const css = Array.from(document.querySelectorAll('style'))
      .map((st) => st.textContent ?? '')
      .join(' ');
    expect(css).toMatch(/\.warning\[[^\]]+\]\s*\{\s*margin-bottom:\s*var\(--space-2\)/);
    expect(css).toMatch(/\.warning\[[^\]]+\]\s*\+\s*\.explanation\[[^\]]+\]\s*\{\s*margin-top:\s*0/);
    expect(buttonsIn(el).map(text)).toEqual(['Cancel', 'Sign out anyway', 'Sync now']);
    // H-122 decision 17: only the warning state stacks its actions on a phone.
    expect(el.querySelector('mat-dialog-actions')!.classList).toContain('stack');
  });

  it('AC 56 H-122 the plain question (nothing pending): the explanation in body colour, actions stay a row', async () => {
    const { fixture, el } = open(0);
    await fixture.whenStable();
    const ps = paragraphs(el);
    expect(ps.map(text)).toEqual([SIGN_OUT_TEXT]);
    expect(ps[0].classList).not.toContain('note');
    expect(el.querySelector('[role="alert"]')).toBeNull();
    expect(el.querySelector('mat-dialog-actions')!.classList).not.toContain('stack');
  });

  it('AC 56 H-122 "Syncing…" while the sync promise is pending: Sync now and Sign out anyway disabled, Cancel enabled, focus stays on the button', async () => {
    const { fixture, el, render, syncCalls } = open(2);
    await fixture.whenStable();
    const sync = buttonIn(el, 'Sync now')!;
    sync.focus();
    sync.click();
    await render();
    expect(syncCalls).toHaveBeenCalledTimes(1);
    expect(text(sync)).toBe('Syncing…');
    expect(buttonIn(el, 'Syncing…')).toBe(sync); // the same element: no width jump, focus kept
    expect(isDisabled(sync)).toBe(true);
    expect(sync.disabled).toBe(false); // disabledInteractive: still focusable
    expect(document.activeElement).toBe(sync);
    expect(isDisabled(buttonIn(el, 'Sign out anyway')!)).toBe(true);
    expect(isDisabled(buttonIn(el, 'Cancel')!)).toBe(false);
    // The explanation stays under the warning while it runs.
    expect(paragraphs(el).map(text)).toEqual(["2 changes haven't synced yet. They'll be lost if you sign out now.", SIGN_OUT_TEXT]);
    // disabledInteractive still sends clicks: the guard starts no second sync.
    sync.click();
    await render();
    expect(syncCalls).toHaveBeenCalledTimes(1);
  });

  it('AC 56 H-122 a rejected push: the warning keeps its count, the explanation stays under it, the button reads "Sync now" again', async () => {
    const { fixture, el, render, settle } = open(2);
    await fixture.whenStable();
    const sync = buttonIn(el, 'Sync now')!;
    sync.focus();
    sync.click();
    await render();
    settle(2, true);
    await vi.waitFor(async () => {
      await render();
      expect(text(sync)).toBe('Sync now');
    });
    expect(isDisabled(sync)).toBe(false);
    expect(document.activeElement).toBe(sync);
    const [warning, explanation] = paragraphs(el);
    expect(text(warning)).toBe("2 changes haven't synced yet. They'll be lost if you sign out now.");
    expect(text(explanation)).toBe(SIGN_OUT_TEXT);
    expect(explanation.classList).toContain('note');
    expect(buttonsIn(el).map(text)).toEqual(['Cancel', 'Sign out anyway', 'Sync now']);
  });

  it('AC 56 H-122 the push succeeds: the plain question in body colour, and focus moves to Sign out', async () => {
    const { fixture, el, render, settle } = open(2);
    await fixture.whenStable();
    const sync = buttonIn(el, 'Sync now')!;
    sync.focus();
    sync.click();
    await render();
    settle(0);
    await vi.waitFor(async () => {
      await render();
      expect(buttonsIn(el).map(text)).toEqual(['Cancel', 'Sign out']);
    });
    const ps = paragraphs(el);
    expect(ps.map(text)).toEqual([SIGN_OUT_TEXT]);
    expect(ps[0].classList).not.toContain('note');
    await vi.waitFor(() => expect(document.activeElement).toBe(buttonIn(el, 'Sign out')));
  });

  it('AC 56 H-122 the push succeeds while offline: Sign out is disabled, so focus goes to Cancel (not body)', async () => {
    const { fixture, el, render, settle, online } = open(2);
    await fixture.whenStable();
    const sync = buttonIn(el, 'Sync now')!;
    sync.focus();
    sync.click();
    await render();
    online.set(false);
    settle(0);
    await vi.waitFor(async () => {
      await render();
      expect(buttonsIn(el).map(text)).toEqual(['Cancel', 'Sign out']);
    });
    expect(buttonIn(el, 'Sign out')!.disabled).toBe(true);
    await vi.waitFor(() => expect(document.activeElement).toBe(buttonIn(el, 'Cancel')));
  });

  it('AC 56 H-122 focus the user moved to Cancel during the sync stays there when it succeeds', async () => {
    const { fixture, el, render, settle } = open(2);
    await fixture.whenStable();
    buttonIn(el, 'Sync now')!.click();
    await render();
    const cancel = buttonIn(el, 'Cancel')!;
    cancel.focus();
    settle(0);
    await vi.waitFor(async () => {
      await render();
      expect(buttonsIn(el).map(text)).toEqual(['Cancel', 'Sign out']);
    });
    await flush();
    await render();
    expect(document.activeElement).toBe(cancel);
  });
});

/** jsdom has no layout; only visibility is faked so `autoFocus: 'first-tabbable'` finds the first control. */
@Injectable()
class VisibleInteractivityChecker extends InteractivityChecker {
  override isVisible(): boolean {
    return true;
  }
}

describe('H-143 / H-176 Account Information: delete dialog state at open and the Sign out hand-off (SPEC-010 AC 55, AC 38, AC 73)', () => {
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => (el.innerHTML = ''));
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const accountDoc = { schemaVersion: 1, createdAt: 1, updatedAt: 1, syncedAt: 1, lastClientVersion: 'x' };
  const panes = () => document.querySelectorAll<HTMLElement>('.cdk-overlay-container mat-dialog-container');
  /** The top-most dialog (v0.14: the delete dialog opens on top of Account Information, SYNC-152). */
  const pane = () => {
    const all = panes();
    return all.length ? all[all.length - 1] : null;
  };
  /** Account Information's Delete account and data button (focus returns here when the delete dialog is cancelled). */
  const deleteButton = () => buttonIn(document.querySelector('app-account-info-dialog')!, 'Delete account and data')!;

  /** The real SyncService and engine over the fakes, signed in as uA with a synced session. */
  async function signedIn(auth: FakeAuth) {
    localStorage.clear();
    const db = new FakeFirestore();
    db.docs.set('users/uA', { ...accountDoc });
    auth.uid = 'uA';
    const now = Date.now();
    const log: StoredSyncLog = {
      ...emptySyncLog(),
      uid: 'uA',
      sessionExpected: true,
      lastFullSyncAt: now,
      lastSyncAt: now,
      cursors: { state: 1, decks: 1 },
    };
    localStorage.setItem(STORAGE_KEYS.syncLog, JSON.stringify(log));
    const notices: string[] = [];
    TestBed.configureTestingModule({
      imports: [AccountMenu],
      providers: [
        provideRouter([]),
        { provide: SYNC_ADAPTERS, useValue: async () => ({ auth, remote: new FakeRemote(db) }) },
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
        { provide: InteractivityChecker, useClass: VisibleInteractivityChecker },
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
    await vi.waitFor(() => expect(sync.status().kind).toBe('synced'));
    fixture.detectChanges();
    await fixture.whenStable();
    const deleteAll = vi.spyOn(FakeRemote.prototype, 'deleteAll');
    return { fixture, sync, db, notices, deleteAll };
  }

  const trigger = (fixture: ComponentFixture<AccountMenu>) => buttonIn(fixture.nativeElement as HTMLElement, 'Account')!;

  async function chooseFromMenu(fixture: ComponentFixture<AccountMenu>, label: string): Promise<void> {
    trigger(fixture).focus();
    trigger(fixture).click();
    fixture.detectChanges();
    await fixture.whenStable();
    const item = buttonIn(document.querySelector('.mat-mdc-menu-content')!, label)!;
    item.click();
    fixture.detectChanges();
    await vi.waitFor(() => expect(pane()).not.toBeNull(), { timeout: 2000 });
    await flush();
  }

  async function closed(): Promise<void> {
    await vi.waitFor(() => expect(pane()).toBeNull(), { timeout: 2000 });
    await flush();
  }

  /** SYNC-152: account menu → Account Information → Delete account and data, which opens on top of it. */
  async function openDeleteDialog(fixture: ComponentFixture<AccountMenu>): Promise<void> {
    await chooseFromMenu(fixture, 'Account Information');
    expect(text(pane()?.querySelector('h2'))).toBe('Account Information');
    deleteButton().focus();
    deleteButton().click();
    fixture.detectChanges();
    await vi.waitFor(() => expect(panes()).toHaveLength(2), { timeout: 2000 });
    await flush();
  }

  /** Back to Account Information alone. */
  async function backToInfo(): Promise<void> {
    await vi.waitFor(() => expect(panes()).toHaveLength(1), { timeout: 2000 });
    await flush();
  }

  it('AC 55 H-143 signed in 20 minutes ago by email link with 1 pending: sign-in-first state; Sign out opens the SYNC-090 dialog; Cancel there deletes and clears nothing', async () => {
    const auth = new FakeAuth();
    auth.recentSignIn = false; // more than 5 minutes ago
    const { fixture, sync, db, deleteAll } = await signedIn(auth);
    vi.spyOn(sync, 'pendingCount').mockReturnValue(1);
    const logBefore = localStorage.getItem(STORAGE_KEYS.syncLog);

    await openDeleteDialog(fixture);
    const del = pane()!;
    expect(text(del.querySelector('h2'))).toBe('Delete your Rift Builder account?');
    expect(text(del)).toContain(DELETE_PARAGRAPH);
    expect(text(del)).toContain(STEP_1);
    expect(del.querySelector('input')).toBeNull();
    expect(buttonsIn(del).map(text)).toEqual(['Cancel', 'Sign out']);
    expect(buttonIn(del, 'Delete account')).toBeUndefined();
    // Brief decision 6: focus starts on Cancel.
    await vi.waitFor(() => expect(document.activeElement).toBe(buttonIn(del, 'Cancel')));

    buttonIn(del, 'Sign out')!.click();
    // SYNC-152 / AC 55: the delete dialog and Account Information close; then the SYNC-090 dialog opens (never stacked).
    await vi.waitFor(() => expect(text(pane()?.querySelector('h2'))).toBe('Sign out?'), { timeout: 2000 });
    expect(panes()).toHaveLength(1);
    const out = pane()!;
    expect(text(out)).toContain("1 change hasn't synced yet. It'll be lost if you sign out now.");
    expect(text(out)).toContain(SIGN_OUT_TEXT);
    expect(buttonsIn(out).map(text)).toEqual(['Cancel', 'Sign out anyway', 'Sync now']);

    buttonIn(out, 'Cancel')!.click();
    await closed();
    // Nothing deleted or cleared, and no delete request (no re-authentication, no deleteAll, no deleteUser).
    expect(deleteAll).not.toHaveBeenCalled();
    expect(auth.calls).not.toContain('reauthenticate');
    expect(auth.calls).not.toContain('deleteUser');
    expect(auth.signOuts).toBe(0);
    expect(db.get('users/uA')).toBeDefined();
    expect(localStorage.getItem(STORAGE_KEYS.syncLog)).toBe(logBefore);
    expect(sync.signedIn()).toBe(true);
    // Brief decision 8: focus back on the Account trigger.
    expect(document.activeElement).toBe(trigger(fixture));
  });

  it('AC 55 / AC 73 H-143 Cancel in the sign-in-first state closes it with focus on Delete account and data and nothing deleted', async () => {
    const auth = new FakeAuth();
    auth.recentSignIn = false;
    const { fixture, deleteAll } = await signedIn(auth);
    await openDeleteDialog(fixture);
    buttonIn(pane()!, 'Cancel')!.click();
    await backToInfo();
    expect(deleteAll).not.toHaveBeenCalled();
    // SYNC-152 / AC 73: focus returns to Delete account and data in Account Information.
    expect(document.activeElement).toBe(deleteButton());
  });

  it('AC 38 H-143 signed in 1 minute ago: the type-to-confirm state with focus in the field, danger Delete account disabled until delete', async () => {
    const auth = new FakeAuth();
    auth.recentSignIn = true;
    const { fixture, deleteAll } = await signedIn(auth);
    await openDeleteDialog(fixture);
    const del = pane()!;
    expect(text(del)).not.toContain(STEP_1);
    expect(buttonsIn(del).map(text)).toEqual(['Cancel', 'Delete account']);
    const confirm = buttonIn(del, 'Delete account')!;
    expect(confirm.classList).toContain('danger');
    expect(confirm.disabled).toBe(true);
    await vi.waitFor(() => expect(document.activeElement).toBe(del.querySelector('input')));
    buttonIn(del, 'Cancel')!.click();
    await backToInfo();
    expect(deleteAll).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(deleteButton());
  });

  it('AC 38 H-143 signed in 4 minutes ago: type-to-confirm; 2 minutes later typing delete and confirming deletes nothing and shows the step 1 text', async () => {
    const auth = new FakeAuth();
    auth.enabled = ['email-link']; // default config: email link only
    auth.recentSignIn = true; // 4 minutes ago: still recent at open
    auth.reauthResult = 'needs-sign-in'; // what the adapter returns for an email-link user (no popup)
    const { fixture, db, notices, deleteAll } = await signedIn(auth);
    await openDeleteDialog(fixture);
    const del = pane()!;
    expect(text(del)).not.toContain(STEP_1);
    const input = del.querySelector('input')!;
    expect(input).not.toBeNull();

    auth.recentSignIn = false; // 2 minutes pass: the sign-in is now 6 minutes old
    input.value = 'delete';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    buttonIn(del, 'Delete account')!.click();
    await backToInfo(); // nothing was deleted, so Account Information stays open

    // SYNC-096 step 1 on confirm (as built): nothing deleted, the step 1 text shows.
    await vi.waitFor(() => expect(notices).toContain(MESSAGES.reauthNeeded));
    expect(auth.calls).toContain('reauthenticate');
    expect(deleteAll).not.toHaveBeenCalled();
    expect(auth.calls).not.toContain('deleteUser');
    expect(auth.deletedUser).toBe(false);
    expect(db.get('users/uA')).toBeDefined();
  });

  it('AC 55 H-143 Google enabled and a Google identity, signed in 20 minutes ago: type-to-confirm, and confirming opens the re-authentication popup', async () => {
    const auth = new FakeAuth();
    auth.enabled = ['email-link', 'google'];
    auth.googleIdentity = true;
    auth.recentSignIn = false;
    auth.reauthResult = 'cancelled'; // the popup is closed: nothing is deleted
    const { fixture, notices, deleteAll } = await signedIn(auth);
    await openDeleteDialog(fixture);
    const del = pane()!;
    expect(text(del)).not.toContain(STEP_1);
    const input = del.querySelector('input')!;
    input.value = 'delete';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    buttonIn(del, 'Delete account')!.click();
    await backToInfo();
    await vi.waitFor(() => expect(auth.calls).toContain('reauthenticate'));
    await vi.waitFor(() => expect(notices).toContain(MESSAGES.deleteNotDone));
    expect(deleteAll).not.toHaveBeenCalled();
  });

  it('H-143 email-link only with Google off, even a Google identity gets the sign-in-first state', async () => {
    const auth = new FakeAuth();
    auth.enabled = ['email-link'];
    auth.googleIdentity = true;
    auth.recentSignIn = false;
    const { fixture } = await signedIn(auth);
    await openDeleteDialog(fixture);
    expect(text(pane())).toContain(STEP_1);
    expect(pane()!.querySelector('input')).toBeNull();
  });

  it('H-122 Sign out dialog opened while focus is on body (Safari-like click): Cancel returns focus to the Account trigger', async () => {
    // MatMenu would put focus back on the trigger by itself; opening with focus on <body> proves the dialog's
    // own wiring (restoreFocus: trigger plus the refocusAfterDialog fallback). Without it focus stays on body.
    const auth = new FakeAuth();
    const { fixture } = await signedIn(auth);
    (document.activeElement as HTMLElement | null)?.blur();
    expect(document.activeElement).toBe(document.body);
    const done = (fixture.componentInstance as unknown as { openSignOut(): Promise<void> }).openSignOut();
    await vi.waitFor(() => expect(text(pane()?.querySelector('h2'))).toBe('Sign out?'), { timeout: 2000 });
    buttonIn(pane()!, 'Cancel')!.click();
    await done;
    await closed();
    expect(document.activeElement).toBe(trigger(fixture));
    expect(auth.signOuts).toBe(0);
  });

  it('H-143 / SYNC-152 delete dialog cancelled while focus was lost to body: focus still returns to Delete account and data', async () => {
    const auth = new FakeAuth();
    auth.recentSignIn = false;
    const { fixture } = await signedIn(auth);
    await openDeleteDialog(fixture);
    (document.activeElement as HTMLElement | null)?.blur();
    buttonIn(pane()!, 'Cancel')!.click();
    await backToInfo();
    expect(document.activeElement).toBe(deleteButton());
  });

  it('AC 21 / SYNC-152 a completed deletion from Account Information closes every dialog and signs out', async () => {
    const auth = new FakeAuth();
    auth.recentSignIn = true;
    const { fixture, sync, db, notices } = await signedIn(auth);
    await openDeleteDialog(fixture);
    const input = pane()!.querySelector('input')!;
    input.value = 'delete';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    buttonIn(pane()!, 'Delete account')!.click();
    await closed();
    await vi.waitFor(() => expect(notices).toContain(MESSAGES.deletedOwn));
    expect(db.get('users/uA')).toBeUndefined();
    await vi.waitFor(() => expect(sync.signedIn()).toBe(false));
  });

  it('H-122 a real sign-out: the Account button is gone, so focus goes to #main (H-125 fallback), not body', async () => {
    const main = document.createElement('main');
    main.id = 'main';
    main.tabIndex = -1;
    document.body.appendChild(main);
    try {
      const auth = new FakeAuth();
      const { fixture, sync } = await signedIn(auth);
      await chooseFromMenu(fixture, 'Sign out');
      expect(buttonsIn(pane()!).map(text)).toEqual(['Cancel', 'Sign out']);
      buttonIn(pane()!, 'Sign out')!.click();
      await closed();
      await vi.waitFor(() => expect(sync.signedIn()).toBe(false));
      await vi.waitFor(async () => {
        fixture.detectChanges();
        await fixture.whenStable();
        expect(buttonIn(fixture.nativeElement as HTMLElement, 'Sign in')).toBeDefined();
        expect(document.activeElement).toBe(main);
      });
      expect(auth.signOuts).toBe(1);
    } finally {
      main.remove();
    }
  });
});
