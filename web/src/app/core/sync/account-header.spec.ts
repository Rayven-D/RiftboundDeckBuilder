/**
 * SPEC-010 v0.14 (H-176) at component level with the real SyncService and engine over the fakes: the header account
 * control (SYNC-150, AC 71), the menu's Theme group (SYNC-151, AC 72), Account Information (SYNC-152, AC 73), the
 * username dialog and its rules in the UI (SYNC-153, SYNC-155, AC 74, AC 76) and the one-time prompt, SYNC-154 and AC 75.
 */
import { InteractivityChecker, LiveAnnouncer } from '@angular/cdk/a11y';
import { Injectable, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatMenuTrigger } from '@angular/material/menu';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { STORAGE_KEYS } from '../storage/local-stores';
import { ThemeService } from '../theme/theme.service';
import { emptySyncLog } from '../../shared/sync/sync-log';
import type { StoredSyncLog } from '../../shared/sync/sync-types';
import { FakeAuth, FakeFirestore, FakeRemote } from '../../shared/sync/testing/fakes';
import { AccountMenu, menuEdgeCorrection } from './account-menu';
import { UsernameDialog, UsernameDialogData, UsernameSaveResult } from './account-dialogs';
import { SYNC_ADAPTERS, SyncService } from './sync.service';

const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const buttonIn = (root: ParentNode, label: string) =>
  Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((b) => text(b) === label);
const flush = () => new Promise((r) => setTimeout(r));
const panes = () => document.querySelectorAll<HTMLElement>('.cdk-overlay-container mat-dialog-container');
const top = () => {
  const all = panes();
  return all.length ? all[all.length - 1] : null;
};
const accountDoc = (extra: Record<string, unknown> = {}) => ({
  schemaVersion: 1,
  createdAt: 1,
  updatedAt: 1,
  syncedAt: 1,
  lastClientVersion: 'x',
  ...extra,
});

/** jsdom has no layout; only visibility is faked so `autoFocus: 'first-tabbable'` finds the controls. */
@Injectable()
class VisibleInteractivityChecker extends InteractivityChecker {
  override isVisible(): boolean {
    return true;
  }
}

function synced(extra: Partial<StoredSyncLog> = {}): StoredSyncLog {
  const now = Date.now();
  return { ...emptySyncLog(), uid: 'uA', sessionExpected: true, lastFullSyncAt: now, lastSyncAt: now, cursors: { state: 1, decks: 1 }, ...extra };
}

describe('Header account control, menu and Account Information (SPEC-010 SYNC-150…155, H-176)', () => {
  let notices: [string, string | undefined, number | undefined, string | undefined][];
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => (el.innerHTML = ''));
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    vi.restoreAllMocks();
  });

  function setup(db: FakeFirestore, auth: FakeAuth, log: StoredSyncLog | null) {
    localStorage.clear();
    if (log) localStorage.setItem(STORAGE_KEYS.syncLog, JSON.stringify(log));
    notices = [];
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
            open: (m: string, a?: string, c?: { duration?: number; politeness?: string }) => (
              notices.push([m, a, c?.duration, c?.politeness]), { onAction: () => new Subject<void>() }
            ),
            dismiss: () => undefined,
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(AccountMenu);
    return { fixture, sync: TestBed.inject(SyncService) };
  }

  const trigger = (f: ComponentFixture<AccountMenu>) => (f.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button')!;
  async function render(f: ComponentFixture<AccountMenu>): Promise<void> {
    f.detectChanges();
    await f.whenStable();
  }
  async function openMenu(f: ComponentFixture<AccountMenu>): Promise<HTMLElement> {
    await render(f);
    trigger(f).click();
    await render(f);
    return document.querySelector<HTMLElement>('.mat-mdc-menu-content')!;
  }
  async function choose(f: ComponentFixture<AccountMenu>, label: string): Promise<void> {
    const menu = await openMenu(f);
    buttonIn(menu, label)!.click();
    await render(f);
    await flush();
  }

  describe('SYNC-150 header control (AC 71)', () => {
    it('AC 71 signed in as RJ Smith: one ghost button with the initial R, the name and a chevron, named "Account: RJ Smith", opening the menu', async () => {
      const db = new FakeFirestore();
      db.docs.set('users/uA', accountDoc({ username: 'RJ Smith' }));
      const auth = new FakeAuth();
      auth.uid = 'uA';
      const { fixture } = setup(db, auth, synced({ username: 'RJ Smith' }));
      await render(fixture);
      const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
      expect(buttons).toHaveLength(1);
      const b = buttons[0];
      expect(b.classList).toContain('account-trigger');
      expect(text(b.querySelector('.avatar'))).toBe('R');
      expect(b.querySelector('.avatar')!.getAttribute('aria-hidden')).toBe('true');
      expect(text(b.querySelector('.name'))).toBe('RJ Smith');
      expect(b.querySelector('.chevron')).not.toBeNull();
      expect(b.getAttribute('aria-label')).toBe('Account: RJ Smith');
      expect(b.getAttribute('aria-haspopup')).toBe('menu');
      expect(b.hasAttribute('title')).toBe(false);
      b.click();
      await render(fixture);
      expect(b.getAttribute('aria-expanded')).toBe('true');
    });

    it('AC 71 a 20-character name (20 × W): the accessible name still holds all 20 characters (the visible one may be cut by CSS)', async () => {
      const name = 'W'.repeat(20);
      const auth = new FakeAuth();
      auth.uid = 'uA';
      const db = new FakeFirestore();
      db.docs.set('users/uA', accountDoc({ username: name }));
      const { fixture } = setup(db, auth, synced({ username: name }));
      await render(fixture);
      expect(trigger(fixture).getAttribute('aria-label')).toBe(`Account: ${name}`);
      expect(text(trigger(fixture).querySelector('.name'))).toBe(name);
    });

    it('AC 71 no username: the label is Account with a person icon, named "Account"', async () => {
      const auth = new FakeAuth();
      auth.uid = 'uA';
      const db = new FakeFirestore();
      db.docs.set('users/uA', accountDoc());
      const { fixture } = setup(db, auth, synced());
      await render(fixture);
      expect(text(trigger(fixture).querySelector('.name'))).toBe('Account');
      expect(trigger(fixture).querySelector('.avatar app-icon')).not.toBeNull();
      expect(trigger(fixture).getAttribute('aria-label')).toBe('Account');
    });

    it('AC 71 / SYNC-150 (e) a reload while signed in, also offline, shows the name at once from the sync log (before the restore)', async () => {
      const auth = new FakeAuth();
      auth.uid = 'uA';
      const db = new FakeFirestore();
      const slow = new Promise<never>(() => undefined); // the adapters never finish loading
      localStorage.setItem(STORAGE_KEYS.syncLog, JSON.stringify(synced({ username: 'RJ Smith' })));
      TestBed.configureTestingModule({
        imports: [AccountMenu],
        providers: [provideRouter([]), { provide: SYNC_ADAPTERS, useValue: () => slow }],
      });
      void db;
      const fixture = TestBed.createComponent(AccountMenu);
      await render(fixture);
      expect(trigger(fixture).getAttribute('aria-label')).toBe('Account: RJ Smith');
    });

    it('AC 71 / SYNC-086 a lost session shows Sign in', async () => {
      const { fixture } = setup(new FakeFirestore(), new FakeAuth(), synced({ sessionLostUid: 'uA', username: 'RJ Smith' }));
      await render(fixture);
      expect(text(trigger(fixture))).toBe('Sign in');
    });
  });

  describe('SYNC-151 menu (AC 72)', () => {
    it('AC 72 the username line comes first, then "Signed in as", then the status; the panel is described by all three', async () => {
      const db = new FakeFirestore();
      db.docs.set('users/uA', accountDoc({ username: 'RJ Smith' }));
      const auth = new FakeAuth();
      auth.uid = 'uA';
      auth.email = 'rj@example.com';
      const { fixture, sync } = setup(db, auth, synced({ username: 'RJ Smith' }));
      await vi.waitFor(() => expect(sync.status().kind).toBe('synced'));
      const menu = await openMenu(fixture);
      const lines = Array.from(menu.children).slice(0, 3);
      expect(lines.map(text)).toEqual(['RJ Smith', 'Signed in as rj@example.com', expect.stringMatching(/^Synced · /)]);
      const ids = lines.map((l) => l.id).join(' ');
      expect(document.querySelector('.mat-mdc-menu-panel')!.getAttribute('aria-describedby')).toBe(ids);
    });

    it('AC 72 / SYNC-157 Theme: three radio items, exactly one checked with a check mark; choosing Dark applies it at once and closes the menu', async () => {
      const db = new FakeFirestore();
      db.docs.set('users/uA', accountDoc());
      const auth = new FakeAuth();
      auth.uid = 'uA';
      const { fixture } = setup(db, auth, synced());
      const menu = await openMenu(fixture);
      const group = menu.querySelector('[role="group"]')!;
      expect(text(menu.querySelector(`#${group.getAttribute('aria-labelledby')}`))).toBe('Theme');
      const radios = Array.from(group.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'));
      expect(radios.map(text)).toEqual(['System', 'Light', 'Dark']);
      expect(radios.map((r) => r.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false']);
      expect(radios.map((r) => !!r.querySelector('.check app-icon'))).toEqual([true, false, false]);
      radios[2].click();
      await render(fixture);
      expect(TestBed.inject(ThemeService).choice()).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      await vi.waitFor(() => expect(trigger(fixture).getAttribute('aria-expanded')).not.toBe('true'));
    });
  });

  describe('SYNC-151 / H-189 N3 the menu lines up with its button', () => {
    it('SYNC-151 menuEdgeCorrection: a small leftward gap (the 15 px scrollbar gutter) is closed; none, rightward or large gaps are left', () => {
      expect(menuEdgeCorrection(1272.5, 1257.5)).toBe(15);
      expect(menuEdgeCorrection(1272.5, 1272.5)).toBe(0);
      expect(menuEdgeCorrection(1272.5, 1272.2)).toBe(0);
      expect(menuEdgeCorrection(1272.5, 1280)).toBe(0);
      expect(menuEdgeCorrection(1272.5, 1200)).toBe(0);
    });

    it('SYNC-151 opening the menu 15 px left of the trigger moves its pane right by 15 px; a later aligned opening clears it', async () => {
      const db = new FakeFirestore();
      db.docs.set('users/uA', accountDoc({ username: 'RJ Smith' }));
      const auth = new FakeAuth();
      auth.uid = 'uA';
      const { fixture } = setup(db, auth, synced({ username: 'RJ Smith' }));
      await render(fixture);
      const rect = (right: number) => ({ right }) as DOMRect;
      vi.spyOn(trigger(fixture), 'getBoundingClientRect').mockReturnValue(rect(1272.5));
      let paneRight = 1257.5;
      const real = HTMLElement.prototype.getBoundingClientRect;
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
        return this.classList.contains('cdk-overlay-pane') ? rect(paneRight - parseFloat(this.style.marginRight || '0')) : real.call(this);
      });
      trigger(fixture).click();
      await render(fixture);
      await flush();
      const pane = document.querySelector('.account-menu-panel')!.closest<HTMLElement>('.cdk-overlay-pane')!;
      await vi.waitFor(() => expect(pane.style.marginRight).toBe('-15px'));
      // closed and opened again on a page where the CDK got it right: no correction left over
      const menuTrigger = fixture.debugElement.query(By.directive(MatMenuTrigger)).injector.get(MatMenuTrigger);
      menuTrigger.closeMenu();
      await render(fixture);
      await flush();
      paneRight = 1272.5;
      menuTrigger.openMenu();
      await render(fixture);
      await flush();
      await vi.waitFor(() => expect(pane.style.marginRight).toBe(''));
    });
  });

  describe('SYNC-152 Account Information (AC 73)', () => {
    it('AC 73 the dialog: title, the username row with Change (named "Change username"), the hint, a separated Delete account and data with its line, Close; no route', async () => {
      const db = new FakeFirestore();
      db.docs.set('users/uA', accountDoc({ username: 'RJ Smith' }));
      const auth = new FakeAuth();
      auth.uid = 'uA';
      const { fixture } = setup(db, auth, synced({ username: 'RJ Smith' }));
      await choose(fixture, 'Account Information');
      const d = top()!;
      expect(text(d.querySelector('h2'))).toBe('Account Information');
      expect(text(d)).toContain('RJ Smith');
      const change = buttonIn(d, 'Change')!;
      expect(change.getAttribute('aria-label')).toBe('Change username');
      expect(text(d)).toContain('Shown at the top right. Only you can see it.');
      expect(d.querySelector('hr')).not.toBeNull();
      const del = buttonIn(d, 'Delete account and data')!;
      expect(del.classList).toContain('danger');
      expect(text(d.querySelector(`#${del.getAttribute('aria-describedby')}`))).toBe(
        "Deletes your account and everything saved in it, on every device. This can't be undone.",
      );
      expect(buttonIn(d, 'Close')).toBeDefined();
      expect(buttonIn(d, 'Sign out')).toBeUndefined(); // Sign out is in the menu
    });

    it('AC 73 Change opens Change username on top; after Cancel focus is back on Change', async () => {
      const db = new FakeFirestore();
      db.docs.set('users/uA', accountDoc({ username: 'RJ Smith' }));
      const auth = new FakeAuth();
      auth.uid = 'uA';
      const { fixture } = setup(db, auth, synced({ username: 'RJ Smith' }));
      await choose(fixture, 'Account Information');
      const change = buttonIn(top()!, 'Change')!;
      change.focus();
      change.click();
      await vi.waitFor(() => expect(panes()).toHaveLength(2));
      await vi.waitFor(async () => {
        await render(fixture);
        expect(text(top()!.querySelector('h2'))).toBe('Change username');
      });
      expect(text(top())).toContain('Only you can see it.');
      const input = top()!.querySelector('input')!;
      await vi.waitFor(() => expect(document.activeElement).toBe(input));
      expect(input.value).toBe('RJ Smith');
      buttonIn(top()!, 'Cancel')!.click();
      await vi.waitFor(() => expect(panes()).toHaveLength(1));
      await flush();
      expect(document.activeElement).toBe(change);
    });

    it('AC 73 no username: "No username yet." with Add username', async () => {
      const db = new FakeFirestore();
      db.docs.set('users/uA', accountDoc());
      const auth = new FakeAuth();
      auth.uid = 'uA';
      const { fixture } = setup(db, auth, synced());
      await choose(fixture, 'Account Information');
      expect(text(top())).toContain('No username yet.');
      expect(buttonIn(top()!, 'Add username')).toBeDefined();
    });

    it('AC 73 / SYNC-081 offline: Delete account and data is aria-disabled with "You\'re offline." and opens nothing', async () => {
      const db = new FakeFirestore();
      db.docs.set('users/uA', accountDoc());
      const auth = new FakeAuth();
      auth.uid = 'uA';
      const { fixture, sync } = setup(db, auth, synced());
      await choose(fixture, 'Account Information');
      sync.online.set(false);
      await render(fixture);
      const del = buttonIn(top()!, 'Delete account and data')!;
      expect(del.getAttribute('aria-disabled')).toBe('true');
      expect(text(top())).toContain("You're offline.");
      // H-189 finding 4: the reason is tied to the button (its line, then "You're offline.").
      const ids = del.getAttribute('aria-describedby')!.split(' ');
      expect(ids.map((id) => text(top()!.querySelector(`#${id}`)))).toEqual([
        "Deletes your account and everything saved in it, on every device. This can't be undone.",
        "You're offline.",
      ]);
      del.click();
      await flush();
      expect(panes()).toHaveLength(1);
    });

    it('AC 76 saving RJ Smith from Add username: one update, the header and the row update without a reload, focus back on the button, "Username saved." (6 s, polite)', async () => {
      const db = new FakeFirestore();
      db.docs.set('users/uA', accountDoc());
      const auth = new FakeAuth();
      auth.uid = 'uA';
      const { fixture, sync } = setup(db, auth, synced());
      await vi.waitFor(() => expect(sync.status().kind).toBe('synced'));
      await choose(fixture, 'Account Information');
      const add = buttonIn(top()!, 'Add username')!;
      add.focus();
      add.click();
      await vi.waitFor(() => expect(panes()).toHaveLength(2));
      await vi.waitFor(async () => {
        await render(fixture);
        expect(text(top()!.querySelector('h2'))).toBe('Add username');
      });
      const input = top()!.querySelector('input')!;
      input.value = '  RJ   Smith ';
      input.dispatchEvent(new Event('input'));
      db.resetCounts();
      top()!.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
      await vi.waitFor(() => expect(panes()).toHaveLength(1));
      await render(fixture);
      expect(db.writeLog).toEqual([['users/uA', 'update']]);
      expect(db.reads).toBe(0);
      expect(db.get('users/uA').username).toBe('RJ Smith');
      expect(trigger(fixture).getAttribute('aria-label')).toBe('Account: RJ Smith');
      expect(text(top())).toContain('RJ Smith');
      expect(document.activeElement).toBe(add); // the same button, now labelled Change
      expect(text(add)).toBe('Change');
      expect(notices).toContainEqual(['Username saved.', 'OK', 6000, 'polite']);
      expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.syncLog)!).username).toBe('RJ Smith');
    });
  });

  describe('SYNC-154 the one-time prompt, AC 75', () => {
    it('AC 75 a brand-new account: "Choose a username" with its line, an empty focused field, Not now and Save; Save waits for the first sync', async () => {
      const db = new FakeFirestore();
      const auth = new FakeAuth();
      auth.nextSignIn = 'uA';
      const { fixture, sync } = setup(db, auth, null);
      await render(fixture);
      await sync.signInWithGoogle();
      await vi.waitFor(() => expect(text(top()?.querySelector('h2'))).toBe('Choose a username'));
      const d = top()!;
      expect(text(d)).toContain(
        "It's shown at the top right of every page. Only you can see it, and you can change it any time in Account Information.",
      );
      const input = d.querySelector('input')!;
      expect(input.value).toBe('');
      expect(input.getAttribute('autocomplete')).toBe('nickname');
      expect(input.getAttribute('autocapitalize')).toBe('words');
      expect(input.getAttribute('spellcheck')).toBe('false');
      expect(buttonIn(d, 'Not now')).toBeDefined();
      expect(buttonIn(d, 'Save')).toBeDefined();
      await vi.waitFor(() => expect(sync.accountReady()).toBe(true));
      // Not now: no username, the header reads Account, focus on the header account control
      buttonIn(top()!, 'Not now')!.click();
      await vi.waitFor(() => expect(panes()).toHaveLength(0));
      await render(fixture);
      expect(db.get('users/uA').username).toBeUndefined();
      expect(text(trigger(fixture).querySelector('.name'))).toBe('Account');
      await vi.waitFor(() => expect(document.activeElement).toBe(trigger(fixture)));
    });

    it('AC 75 an existing account signing in on a new device gets no prompt', async () => {
      const db = new FakeFirestore();
      db.docs.set('users/uA', accountDoc());
      const auth = new FakeAuth();
      auth.nextSignIn = 'uA';
      const { fixture, sync } = setup(db, auth, null);
      await render(fixture);
      await sync.signInWithGoogle();
      await vi.waitFor(() => expect(sync.accountReady()).toBe(true));
      await flush();
      expect(panes()).toHaveLength(0);
    });
  });
});

describe('UsernameDialog (SPEC-010 SYNC-153…155, AC 74, AC 75, AC 76)', () => {
  afterEach(() => document.querySelectorAll('.cdk-overlay-container').forEach((el) => (el.innerHTML = '')));

  function open(over: Partial<UsernameDialogData> = {}) {
    const closed: unknown[] = [];
    const saved: string[] = [];
    const keydown = new Subject<KeyboardEvent>();
    const ref = { close: (v?: unknown) => closed.push(v), disableClose: false, keydownEvents: () => keydown };
    const data: UsernameDialogData = {
      mode: 'change',
      current: 'RJ Smith',
      online: signal(true),
      ready: signal(true),
      save: async (v: string): Promise<UsernameSaveResult> => (saved.push(v), 'ok'),
      ...over,
    };
    TestBed.configureTestingModule({
      imports: [UsernameDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: ref },
      ],
    });
    const fixture = TestBed.createComponent(UsernameDialog);
    const el = fixture.nativeElement as HTMLElement;
    const input = () => el.querySelector('input')!;
    const type = async (v: string) => {
      input().value = v;
      input().dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await fixture.whenStable();
    };
    const save = async () => {
      el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
      await flush();
      fixture.detectChanges();
      await fixture.whenStable();
    };
    return { fixture, el, input, type, save, closed, saved, ref, keydown, data };
  }

  it('AC 74 empty or three spaces: "Enter a username." under the field with an icon, aria-invalid, described by, focus kept; nothing saved', async () => {
    const t = open();
    await t.fixture.whenStable();
    await t.type('   ');
    await t.save();
    const err = t.el.querySelector('.error')!;
    expect(text(err)).toBe('Enter a username.');
    expect(err.querySelector('app-icon')).not.toBeNull();
    expect(t.input().getAttribute('aria-invalid')).toBe('true');
    expect(t.input().getAttribute('aria-describedby')).toContain(err.id);
    expect(document.activeElement).toBe(t.input());
    expect(t.saved).toEqual([]);
    expect(t.closed).toEqual([]);
  });

  it('AC 74 / H-189 an error marks the field invalid (mat-form-field-invalid) and the next keystroke clears it; each described-by id once', async () => {
    const t = open();
    await t.fixture.whenStable();
    await t.type('');
    await t.save();
    const field = t.el.querySelector('mat-form-field')!;
    expect(field.classList).toContain('mat-form-field-invalid');
    const ids = t.input().getAttribute('aria-describedby')!.split(' ');
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(t.el.querySelector('.error')!.id);
    expect(ids).toContain(t.el.querySelector('.counter')!.id);
    await t.type('K');
    expect(field.classList).not.toContain('mat-form-field-invalid');
    expect(t.input().getAttribute('aria-invalid')).not.toBe('true');
    expect(t.input().getAttribute('aria-describedby')).toBe(t.el.querySelector('.counter')!.id);
  });

  it('SYNC-153 / H-189 N1 the n / 20 counter is outside every aria-live region (not read on each keystroke) but describes the field', async () => {
    const t = open();
    await t.fixture.whenStable();
    await t.type('Kai S');
    const counter = t.el.querySelector('.counter')!;
    expect(text(counter)).toBe('5 / 20');
    expect(counter.classList).not.toContain('over');
    expect(t.el.querySelector('mat-hint')).toBeNull();
    expect(counter.closest('[aria-live]')).toBeNull();
    for (const live of Array.from(t.el.querySelectorAll('[aria-live]'))) expect(text(live)).not.toContain('/ 20');
    expect(t.input().getAttribute('aria-describedby')!.split(' ')).toContain(counter.id);
  });

  it('AC 74 / H-189 Enter in the field with an invalid value announces the error once (focus already there); a Save click moves focus instead', async () => {
    const t = open();
    await t.fixture.whenStable();
    const announce = vi.spyOn(TestBed.inject(LiveAnnouncer), 'announce').mockResolvedValue();
    await t.type('');
    t.input().focus();
    await t.save();
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith('Enter a username.', 'polite');
    announce.mockClear();
    await t.type('');
    buttonIn(t.el, 'Save')!.focus();
    await t.save();
    expect(announce).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(t.input());
  });

  it('AC 74 20 letters: accepted, the counter reads 20 / 20 in the normal colour', async () => {
    const t = open();
    await t.fixture.whenStable();
    await t.type('a'.repeat(20));
    const counter = t.el.querySelector('.counter')!;
    expect(text(counter)).toBe('20 / 20');
    expect(counter.classList).not.toContain('over');
    expect(counter.querySelector('app-icon')).toBeNull();
    await t.save();
    expect(t.saved).toEqual(['a'.repeat(20)]);
  });

  it('AC 74 21 characters: "Use 20 characters or fewer.", the counter reads 21 / 20 in the error colour with an icon, the text is not cut', async () => {
    const t = open();
    await t.fixture.whenStable();
    await t.type('a'.repeat(21));
    const counter = t.el.querySelector('.counter')!;
    expect(text(counter)).toBe('21 / 20');
    expect(counter.classList).toContain('over');
    expect(counter.querySelector('app-icon')).not.toBeNull();
    expect(t.input().hasAttribute('maxlength')).toBe(false);
    await t.save();
    expect(text(t.el.querySelector('.error'))).toBe('Use 20 characters or fewer.');
    expect(t.input().value).toBe('a'.repeat(21));
    expect(t.saved).toEqual([]);
  });

  it(`AC 74 an emoji (Squad 😀): "Use letters, numbers, spaces and . _ - ' only. No emoji." and nothing is saved`, async () => {
    const t = open();
    await t.fixture.whenStable();
    await t.type('Squad \u{1F600}');
    await t.save();
    expect(text(t.el.querySelector('.error'))).toBe("Use letters, numbers, spaces and . _ - ' only. No emoji.");
    expect(t.saved).toEqual([]);
  });

  it('AC 74 21 characters that include an emoji: the length error shows first', async () => {
    const t = open();
    await t.fixture.whenStable();
    await t.type('a'.repeat(20) + '\u{1F600}');
    await t.save();
    expect(text(t.el.querySelector('.error'))).toBe('Use 20 characters or fewer.');
  });

  it('SYNC-155 / H-207 a name saved under v0.14 that breaks the v0.15 rules (an emoji) just closes when saved unchanged; a change runs the new check', async () => {
    const legacy = 'Squad \u{1F600}';
    const t = open({ current: legacy });
    await t.fixture.whenStable();
    expect(t.input().value).toBe(legacy);
    await t.save();
    expect(t.saved).toEqual([]);
    expect(t.closed).toEqual([undefined]);
    TestBed.resetTestingModule();
    const u = open({ current: legacy });
    await u.fixture.whenStable();
    await u.type('Squad \u{1F601}');
    await u.save();
    expect(text(u.el.querySelector('.error'))).toBe("Use letters, numbers, spaces and . _ - ' only. No emoji.");
    expect(u.saved).toEqual([]);
  });

  it(`AC 74 a right-to-left override (U+202E): "Use letters, numbers, spaces and . _ - ' only. No emoji." (a pasted line feed is covered by username.spec.ts: a single-line input strips it)`, async () => {
    const t = open();
    await t.fixture.whenStable();
    await t.type(`Line one${String.fromCodePoint(0x202e)}Line two`);
    await t.save();
    expect(text(t.el.querySelector('.error'))).toBe("Use letters, numbers, spaces and . _ - ' only. No emoji.");
  });

  it('AC 74 / AC 76 a valid name is saved normalized and the dialog closes with it; the unchanged value just closes', async () => {
    const t = open();
    await t.fixture.whenStable();
    await t.type('  Kai   Sa ');
    await t.save();
    expect(t.saved).toEqual(['Kai Sa']);
    expect(t.closed).toEqual(['Kai Sa']);
    TestBed.resetTestingModule();
    const u = open();
    await u.fixture.whenStable();
    await u.save(); // still "RJ Smith"
    expect(u.saved).toEqual([]);
    expect(u.closed).toEqual([undefined]);
  });

  it('AC 76 a failed save keeps the dialog and the value, with "Couldn\'t save your username. Check your connection and try again."', async () => {
    const t = open({ save: async () => 'failed' });
    await t.fixture.whenStable();
    await t.type('Kai');
    await t.save();
    expect(t.closed).toEqual([]);
    expect(t.input().value).toBe('Kai');
    expect(text(t.el.querySelector('.error'))).toBe("Couldn't save your username. Check your connection and try again.");
  });

  it('AC 76 offline: Save is aria-disabled with "You\'re offline." above the buttons; pressing it does nothing', async () => {
    const t = open({ online: signal(false) });
    await t.fixture.whenStable();
    const save = buttonIn(t.el, 'Save')!;
    expect(save.getAttribute('aria-disabled')).toBe('true');
    expect(text(t.el.querySelector('.note'))).toBe("You're offline.");
    // H-189 finding 4: Save is described by the reason.
    expect(text(t.el.querySelector(`#${save.getAttribute('aria-describedby')}`))).toBe("You're offline.");
    await t.type('Kai');
    await t.save();
    expect(t.saved).toEqual([]);
  });

  it('AC 75 the prompt while the first sync runs: Save aria-disabled with "Getting your account ready…"; it works once ready', async () => {
    const ready = signal(false);
    const t = open({ mode: 'choose', current: null, ready });
    await t.fixture.whenStable();
    expect(text(t.el.querySelector('h2'))).toBe('Choose a username');
    expect(buttonIn(t.el, 'Not now')).toBeDefined();
    expect(buttonIn(t.el, 'Save')!.getAttribute('aria-disabled')).toBe('true');
    expect(text(t.el.querySelector('.note'))).toBe('Getting your account ready…');
    await t.type('RJ');
    await t.save();
    expect(t.saved).toEqual([]);
    ready.set(true);
    t.fixture.detectChanges();
    await t.fixture.whenStable();
    expect(buttonIn(t.el, 'Save')!.getAttribute('aria-disabled')).not.toBe('true');
    await t.save();
    expect(t.saved).toEqual(['RJ']);
  });

  it('AC 75 the backdrop does nothing (disableClose); Escape closes with no name', async () => {
    const t = open({ mode: 'choose', current: null });
    await t.fixture.whenStable();
    expect(t.ref.disableClose).toBe(true);
    t.keydown.next(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(t.closed).toEqual([undefined]);
  });
});
