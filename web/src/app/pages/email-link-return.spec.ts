/**
 * SPEC-010 v0.10 SYNC-006 (H-145, brain/04-UI/Brief H-145.md), page level with the real SyncService, router and
 * Decks page (v0.14: `/decks?import=1`, SYNC-159): the email link returns to the page sign-in started from, the Firebase parameters leave the URL
 * through the Router (no reload, no rebuild, no extra history entry), and "You're signed in." shows once.
 * The landing URLs have the shape the Auth emulator produces (see API Contracts): the continue URL's own query
 * first, then `&mode=signIn&lang=en&oobCode=…&apiKey=…`.
 */
import { InteractivityChecker } from '@angular/cdk/a11y';
import { BrowserPlatformLocation, PlatformLocation } from '@angular/common';
import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
import { STORAGE_KEYS } from '../core/storage/local-stores';
import { SignInGate } from '../core/sync/sign-in-gate';
import { AUTH_PROVIDERS } from '../core/sync/auth-providers';
import { SYNC_ADAPTERS, SyncService } from '../core/sync/sync.service';
import { MESSAGES } from '../shared/sync/sync-engine';
import { emptySyncLog } from '../shared/sync/sync-log';
import type { AuthProviderId, StoredSyncLog } from '../shared/sync/sync-types';
import { FakeAuth, FakeFirestore, FakeRemote } from '../shared/sync/testing/fakes';

const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const button = (root: ParentNode, label: string) =>
  Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((b) => text(b) === label);
const flush = () => new Promise((r) => setTimeout(r));
const pane = () => document.querySelector<HTMLElement>('.cdk-overlay-container mat-dialog-container');
const here = () => location.pathname + location.search;
const STORED = 'rift.emailForSignIn';
const LINK_QUERY = 'mode=signIn&lang=en&oobCode=abc123&apiKey=fake-api-key';

/** jsdom has no layout; only visibility is faked so the dialogs' `autoFocus: 'first-tabbable'` finds the field. */
@Injectable()
class VisibleInteractivityChecker extends InteractivityChecker {
  override isVisible(): boolean {
    return true;
  }
}

describe('H-145 email link returns to the start page (SPEC-010 SYNC-006, AC 52, AC 39)', () => {
  let auth: FakeAuth;
  let startUrl: string;
  /** Every notice, with the URL and `router.url` at the moment it was shown. */
  let shown: { message: string; duration?: number; politeness?: string; url: string; routerUrl: string }[];

  beforeEach(() => {
    startUrl = here();
    localStorage.clear();
    shown = [];
  });
  afterEach(() => {
    history.replaceState(null, '', startUrl);
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => (el.innerHTML = ''));
    document.getElementById('main')?.remove();
    localStorage.clear();
  });

  function setup(providers: AuthProviderId[] = ['email-link']): void {
    auth = new FakeAuth();
    auth.enabled = providers;
    // uA's account exists (a returning user), so the SYNC-154 username prompt of a new account stays out of these tests.
    const db = new FakeFirestore();
    db.docs.set('users/uA', { schemaVersion: 1, createdAt: 1, updatedAt: 1, syncedAt: 1, lastClientVersion: 'x' });
    const remote = new FakeRemote(db);
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        // The real address bar (jsdom history), not TestBed's mock, so the tests see what the user would.
        { provide: PlatformLocation, useClass: BrowserPlatformLocation },
        { provide: AUTH_PROVIDERS, useValue: providers },
        { provide: SYNC_ADAPTERS, useValue: async () => ({ auth, remote }) },
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
        { provide: InteractivityChecker, useClass: VisibleInteractivityChecker },
      ],
    });
    const router = TestBed.inject(Router);
    vi.spyOn(TestBed.inject(MatSnackBar), 'open').mockImplementation((message, _action, config) => {
      shown.push({ message, duration: config?.duration, politeness: config?.politeness, url: here(), routerUrl: router.url });
      return undefined as never;
    });
  }

  /** Opens the app on `url` the way a link does: the address bar first, then the router's first navigation. */
  async function land(url: string) {
    history.replaceState(null, '', url);
    const harness = await RouterTestingHarness.create(url);
    await harness.fixture.whenStable();
    return harness;
  }

  const signedInShown = () => shown.filter((s) => s.message === MESSAGES.signedIn);

  it('AC 52 / H-145 same device from /decks?import=1: lands on exactly /decks?import=1, "You\'re signed in." once, then the deck import, without a reload', async () => {
    setup();
    auth.nextSignIn = 'uA';
    localStorage.setItem(STORED, 'rj@example.com');
    const harness = await land(`/decks?import=1&${LINK_QUERY}`);
    const page = harness.routeDebugElement!.componentInstance;
    const historyLength = history.length;
    const gate = TestBed.inject(SignInGate);
    TestBed.inject(SyncService).start();

    await vi.waitFor(() => expect(signedInShown()).toHaveLength(1), { timeout: 2000 });
    // When the notice shows, the URL and the router agree on the start page, with none of the five parameters.
    expect(signedInShown()[0]).toEqual({
      message: "You're signed in.",
      duration: 6000, // H-116 success
      politeness: 'polite',
      url: '/decks?import=1',
      routerUrl: '/decks?import=1',
    });
    expect(history.length).toBe(historyLength); // replaced, so Back doesn't return to the link

    await vi.waitFor(() => expect(gate.state()).toBe('open'), { timeout: 2000 });
    await harness.fixture.whenStable();
    expect(harness.routeDebugElement!.componentInstance).toBe(page); // the page was not rebuilt
    await vi.waitFor(() => expect(text(document.querySelector('mat-dialog-container'))).toContain('Import deck'));
    // SYNC-159 (c): the one-shot parameter leaves the address once the dialog opened.
    await vi.waitFor(() => expect(here()).toBe('/decks'));
    expect(here()).not.toMatch(/oobCode|mode=|apiKey|lang=|continueUrl/);
    expect(signedInShown()).toHaveLength(1);
    expect(localStorage.getItem(STORED)).toBeNull();
  });

  it('AC 52 / H-145 a reload after the sign-in (session restore, clean URL) shows no notice', async () => {
    setup();
    auth.uid = 'uA';
    const synced: StoredSyncLog = { ...emptySyncLog(), uid: 'uA', sessionExpected: true, lastFullSyncAt: 1, lastSyncAt: 1, cursors: { state: 1, decks: 1 } };
    localStorage.setItem(STORAGE_KEYS.syncLog, JSON.stringify(synced));
    await land('/decks?import=1');
    TestBed.inject(SyncService).start();
    await vi.waitFor(() => expect(TestBed.inject(SignInGate).state()).toBe('open'), { timeout: 2000 });
    await flush();
    expect(signedInShown()).toEqual([]);
  });

  it('AC 52 / AC 39 / H-108 another device from /: the confirm dialog, Finish, lands on / and "You\'re signed in." once', async () => {
    setup();
    auth.nextSignIn = 'uA';
    await land(`/?${LINK_QUERY}`);
    TestBed.inject(SyncService).start();
    await vi.waitFor(() => expect(document.activeElement?.matches('app-confirm-email-dialog input')).toBe(true), { timeout: 2000 });
    const input = document.activeElement as HTMLInputElement;
    input.value = 'rj@example.com';
    input.dispatchEvent(new Event('input'));
    await flush();
    button(pane()!, 'Finish sign-in')!.click();
    await vi.waitFor(() => expect(signedInShown()).toHaveLength(1), { timeout: 2000 });
    expect(signedInShown()[0].url).toBe('/');
    expect(signedInShown()[0].routerUrl).toBe('/');
  });

  it('AC 39 / H-108 / H-145 another device, Cancel: no sign-in, no notice, the URL still holds the code', async () => {
    setup();
    auth.nextSignIn = 'uA';
    await land(`/?${LINK_QUERY}`);
    TestBed.inject(SyncService).start();
    await vi.waitFor(() => expect(pane()).not.toBeNull(), { timeout: 2000 });
    button(pane()!, 'Cancel')!.click();
    await vi.waitFor(() => expect(pane()).toBeNull(), { timeout: 2000 });
    await flush();
    expect(shown).toEqual([]);
    expect(auth.uid).toBeNull();
    expect(here()).toBe(`/?${LINK_QUERY}`);
  });

  it('AC 52 / H-145 tampered link with a continueUrl parameter to another site: the sign-in completes on / and the parameter is never followed', async () => {
    setup();
    auth.nextSignIn = 'uA';
    localStorage.setItem(STORED, 'rj@example.com');
    await land(`/?${LINK_QUERY}&continueUrl=${encodeURIComponent('https://example.org/')}`);
    TestBed.inject(SyncService).start();
    await vi.waitFor(() => expect(signedInShown()).toHaveLength(1), { timeout: 2000 });
    expect(here()).toBe('/');
    expect(location.origin).toBe(new URL(startUrl, location.href).origin);
  });

  it('AC 39 / H-145 an expired code: the parameters are stripped, the SYNC-005 error shows, and no "You\'re signed in."', async () => {
    setup();
    auth.nextSignIn = 'error';
    auth.signInError = { code: 'auth/expired-action-code' };
    localStorage.setItem(STORED, 'rj@example.com');
    await land(`/decks?import=1&${LINK_QUERY}`);
    TestBed.inject(SyncService).start();
    await vi.waitFor(() => expect(shown.map((s) => s.message)).toContain(MESSAGES.signInFailed), { timeout: 2000 });
    await vi.waitFor(() => expect(here()).toBe('/decks?import=1'));
    expect(TestBed.inject(Router).url).toBe('/decks?import=1');
    expect(signedInShown()).toEqual([]);
    expect(shown.find((s) => s.message === MESSAGES.signInFailed)?.politeness).toBe('assertive');
  });

  it('H-145 a network failure keeps the code in the URL (a reload can retry); the SYNC-005 error shows', async () => {
    setup();
    auth.nextSignIn = 'error';
    auth.signInError = { code: 'auth/network-request-failed' };
    localStorage.setItem(STORED, 'rj@example.com');
    await land(`/decks?import=1&${LINK_QUERY}`);
    TestBed.inject(SyncService).start();
    await vi.waitFor(() => expect(shown.map((s) => s.message)).toContain(MESSAGES.signInFailed), { timeout: 2000 });
    await flush();
    expect(here()).toBe(`/decks?import=1&${LINK_QUERY}`);
    expect(signedInShown()).toEqual([]);
  });

  it('H-145 a mistyped address in the H-108 dialog (auth/invalid-email) keeps the code in the URL', async () => {
    setup();
    auth.nextSignIn = 'error';
    auth.signInError = { code: 'auth/invalid-email' };
    await land(`/?${LINK_QUERY}`);
    TestBed.inject(SyncService).start();
    await vi.waitFor(() => expect(document.activeElement?.matches('app-confirm-email-dialog input')).toBe(true), { timeout: 2000 });
    const input = document.activeElement as HTMLInputElement;
    input.value = 'rj@exmaple';
    input.dispatchEvent(new Event('input'));
    await flush();
    button(pane()!, 'Finish sign-in')!.click();
    await vi.waitFor(() => expect(shown.map((s) => s.message)).toContain(MESSAGES.signInFailed), { timeout: 2000 });
    await flush();
    expect(here()).toBe(`/?${LINK_QUERY}`);
  });

  it('AC 52 / H-145 Send link from the gate panel on /decks?import=1 sends that page as the return path', async () => {
    setup();
    const harness = await land('/decks?import=1');
    TestBed.inject(SyncService); // registers the gate actions, as the app shell does
    await harness.fixture.whenStable();
    const panel = (harness.routeNativeElement as HTMLElement).querySelector('app-sign-in-panel')!;
    button(panel, 'Sign in')!.click();
    await vi.waitFor(() => expect(document.activeElement?.matches('mat-dialog-container input')).toBe(true), { timeout: 2000 });
    const input = document.activeElement as HTMLInputElement;
    input.value = 'rj@example.com';
    input.dispatchEvent(new Event('input'));
    await flush();
    input.closest('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await vi.waitFor(() => expect(auth.emailLinksSent).toEqual(['rj@example.com']), { timeout: 2000 });
    expect(auth.emailLinkReturns).toEqual(['/decks?import=1']);
    await vi.waitFor(() => expect(button(pane()!, 'Close')).toBeDefined(), { timeout: 2000 });
    button(pane()!, 'Close')!.click(); // the sent state; closed so nothing is left for the next test
    await vi.waitFor(() => expect(pane()).toBeNull(), { timeout: 2000 });
    await flush();
  });

  it('AC 52 / H-145 Send again uses the page under the dialog too; Firebase parameters still on the page are dropped', async () => {
    setup();
    await land(`/collection?q=jinx&${LINK_QUERY}`);
    const sync = TestBed.inject(SyncService);
    await sync.sendEmailLink('rj@example.com');
    await sync.sendEmailLink('rj@example.com'); // Send again calls the same service method
    expect(auth.emailLinkReturns).toEqual(['/collection?q=jinx', '/collection?q=jinx']);
  });

  it('AC 52 / H-145 Continue with Google from the panel: "You\'re signed in." once, and focus falls back to #main when the panel goes', async () => {
    setup(['email-link', 'google']);
    auth.nextSignIn = 'uA';
    const main = document.createElement('main');
    main.id = 'main';
    main.tabIndex = -1;
    document.body.append(main);
    const harness = await land('/decks');
    TestBed.inject(SyncService).start();
    await harness.fixture.whenStable();
    const trigger = button((harness.routeNativeElement as HTMLElement).querySelector('app-sign-in-panel')!, 'Sign in')!;
    trigger.focus();
    trigger.click();
    await vi.waitFor(() => expect(pane() && button(pane()!, 'Continue with Google')).toBeTruthy(), { timeout: 2000 });
    button(pane()!, 'Continue with Google')!.click();
    await vi.waitFor(() => expect(TestBed.inject(SignInGate).state()).toBe('open'), { timeout: 2000 });
    await harness.fixture.whenStable();
    await vi.waitFor(() => expect(document.activeElement).toBe(main), { timeout: 2000 });
    expect(trigger.isConnected).toBe(false);
    expect(signedInShown()).toHaveLength(1);
  });
});
