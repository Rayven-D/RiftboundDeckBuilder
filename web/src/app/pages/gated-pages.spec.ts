/**
 * SPEC-010 SYNC-009 / SYNC-086 at page level: the sign-in gate on Decks, deck detail and Collection (no Import page since
 * v0.14, SYNC-159), and
 * Tournaments' deck controls. Account-only since v0.12 (SYNC-001, SYNC-007): there is no build without the gate.
 */
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { App } from '../app';
import { routes } from '../app.routes';
import { AppStores } from '../core/storage/app-stores';
import { STORAGE_KEYS } from '../core/storage/local-stores';
import { SignInGate } from '../core/sync/sign-in-gate';
import { GATE_TEXT } from '../core/sync/sign-in-panel';
import { SYNC_ADAPTERS, SyncService } from '../core/sync/sync.service';
import { SIGN_IN_INTRO } from '../core/sync/sync-dialogs';
import { emptySyncLog } from '../shared/sync/sync-log';
import type { StoredSyncLog } from '../shared/sync/sync-types';
import { FakeAuth, FakeFirestore, FakeRemote } from '../shared/sync/testing/fakes';

const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const buttons = (el: Element) => Array.from(el.querySelectorAll('button')).map(text);
const SYNCED: StoredSyncLog = { ...emptySyncLog(), uid: 'uA', sessionExpected: true, lastFullSyncAt: 1, lastSyncAt: 1, cursors: { state: 1, decks: 1 } };
/**
 * A gated page's content: an empty state, the Decks count line, or dev's Collection page (H-086), which loads its
 * data asynchronously. Since H-114 the sign-in panel is itself an `app-empty-state`, so matches inside the panel
 * don't count as page content.
 */
const CONTENT = 'app-empty-state, .count-line, app-collection-page';
const content = (el: Element) =>
  Array.from(el.querySelectorAll(CONTENT)).find((e) => !e.closest('app-sign-in-panel')) ?? null;
const GATED: string[] = ['/collection', '/decks', '/decks/0b7c0000-0000-4000-8000-000000000001'];
/** The page title each gated URL keeps above its panel (RJ decision 14). */
const GATED_HEADERS: [string, string][] = [
  ['/collection', 'Collection'],
  ['/decks', 'Decks'],
  ['/decks/0b7c0000-0000-4000-8000-000000000001', 'Deck detail'],
];

/** Stale data left by the old no-account build (SYNC-048, AC 48): a collection, a deck, and the stamps it wrote. */
function storeLegacyData(): void {
  localStorage.setItem(
    STORAGE_KEYS.collection,
    JSON.stringify({ schemaVersion: 1, updatedAt: '2026-11-20T00:00:00.000Z', catalogVersion: 'x', cards: { 'hextech ray': { quantity: 3, byPrinting: {} } } }),
  );
  localStorage.setItem(`${STORAGE_KEYS.deckPrefix}legacy`, JSON.stringify({ schemaVersion: 1, id: 'legacy', name: 'Legacy Deck' }));
  localStorage.setItem(
    STORAGE_KEYS.syncLog,
    JSON.stringify({ ...emptySyncLog(), cards: { 'hextech ray': { t: 1, deleted: false, h: 'x' } } }),
  );
}

/**
 * Waits until dev's Collection page has left its loading phase: ready (count line), empty, or one of its banners
 * (these tests don't stub the card catalog, so it usually ends at "Card data couldn't load").
 */
async function pageSettled(harness: RouterTestingHarness, el: HTMLElement): Promise<void> {
  await vi.waitFor(() => {
    harness.fixture.detectChanges();
    expect(el.querySelector('app-collection-page #count-line, app-collection-page [role="alert"], app-collection-page app-empty-state')).not.toBeNull();
  });
  harness.fixture.detectChanges();
}

describe('Sign-in gate on pages (SPEC-010 SYNC-009)', () => {
  let adapterLoads = 0;
  afterEach(() => {
    localStorage.clear();
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => (el.innerHTML = ''));
  });

  function setup(log: StoredSyncLog | null = null): void {
    adapterLoads = 0;
    if (log) localStorage.setItem(STORAGE_KEYS.syncLog, JSON.stringify(log));
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
        {
          provide: SYNC_ADAPTERS,
          useValue: async () => {
            adapterLoads++;
            throw new Error('not loaded in these tests');
          },
        },
      ],
    });
  }

  let current: RouterTestingHarness | null = null;
  beforeEach(() => (current = null));

  /** Opens `url` (one harness per test; later calls navigate it). */
  async function open(url: string) {
    if (current) await current.navigateByUrl(url);
    else current = await RouterTestingHarness.create(url);
    const harness = current;
    await harness.fixture.whenStable();
    return { harness, el: harness.routeNativeElement as HTMLElement };
  }

  describe('every build (no sign-in flag, SYNC-001 / SYNC-007)', () => {
    it.each(GATED)('SYNC-009 / AC 46 / AC 26 signed out, %s keeps its URL and shows the signed-out line, no panel heading, and Sign in', async (url) => {
      setup();
      const { el } = await open(url);
      expect(TestBed.inject(Router).url).toBe(url);
      const panel = el.querySelector('app-sign-in-panel')!;
      // RJ decision 15, verbatim, no closing full stop
      expect(GATE_TEXT.signedOut).toBe('Sign in or create an account to start keeping track of your collections and decks');
      expect(panel.querySelectorAll('p')).toHaveLength(1); // the only line
      expect(text(panel.querySelector('p'))).toBe(GATE_TEXT.signedOut);
      expect(panel.querySelector('p')!.getAttribute('role')).toBeNull();
      expect(panel.querySelector('h1, h2, h3, [role="heading"]')).toBeNull();
      const section = panel.querySelector('section')!;
      expect(section.hasAttribute('aria-label')).toBe(false);
      expect(section.hasAttribute('aria-labelledby')).toBe(false);
      expect(section.getAttribute('role')).toBeNull();
      expect(buttons(el)).toEqual(['Sign in']);
      expect(content(el)).toBeNull();
      expect(adapterLoads).toBe(0); // no firebase chunk (SYNC-002)
    });

    it.each(GATED)('SYNC-086 / AC 27 / AC 57 a lost session on %s shows the one neutral lost-session line, no heading', async (url) => {
      setup({ ...SYNCED, sessionLostUid: 'uA' });
      const { el } = await open(url);
      const panel = el.querySelector('app-sign-in-panel')!;
      expect(GATE_TEXT.sessionLost).toBe("You've been signed out. Sign in again to continue.");
      expect(text(panel.querySelector('p'))).toBe(GATE_TEXT.sessionLost);
      expect(text(el)).not.toContain(GATE_TEXT.signedOut);
      expect(panel.querySelector('h2')).toBeNull();
      expect(buttons(el)).toEqual(['Sign in']);
      expect(content(el)).toBeNull();
    });

    it.each(GATED)('H-114 the %s panel is built from app-empty-state: deck mark and the action row', async (url) => {
      setup();
      const { el } = await open(url);
      const empty = el.querySelector('app-sign-in-panel app-empty-state')!;
      expect(empty).not.toBeNull();
      expect(empty.querySelector('app-deck-mark')).not.toBeNull();
      expect(text(empty.querySelector('.actions button'))).toBe('Sign in');
      expect(el.querySelector('app-sign-in-panel .gate')).toBeNull();
    });

    it.each(GATED_HEADERS)(
      'SYNC-009 / AC 46 signed out, %s keeps its page header "%s" (title and description) above the sign-in panel',
      async (url, title) => {
        setup();
        const { el } = await open(url);
        const header = el.querySelector('header.page-header');
        const panel = el.querySelector('app-sign-in-panel');
        expect(text(header?.querySelector('h1'))).toBe(title);
        expect(text(header?.querySelector('.page-lede'))).not.toBe('');
        expect(panel).not.toBeNull();
        expect(header!.compareDocumentPosition(panel!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(header!.contains(panel)).toBe(false);
      },
    );

    it('SYNC-009 / AC 46 / AC 48 legacy local data is never shown while signed out', async () => {
      storeLegacyData();
      setup();
      for (const url of ['/collection', '/decks']) {
        const { el } = await open(url);
        expect(el.querySelector('app-sign-in-panel')).not.toBeNull();
        expect(text(el)).not.toMatch(/hextech|Legacy Deck/i);
      }
      expect(TestBed.inject(SignInGate).state()).toBe('signed-out');
    });

    it('SYNC-086 / AC 27 a stored lost session shows the panel from the first frame and turns deck controls off', async () => {
      setup({ ...SYNCED, sessionLostUid: 'uA' });
      const { el } = await open('/collection');
      expect(text(el.querySelector('app-sign-in-panel p'))).toBe("You've been signed out. Sign in again to continue.");
      expect(TestBed.inject(SignInGate).deckControls()).toBe(false); // AC 27: no Add to your decks
    });

    it('SYNC-009 / AC 47 a synced log opens the gate at the first frame (also offline: no Firebase needed)', async () => {
      setup(SYNCED);
      for (const url of ['/collection', '/decks']) {
        const { el } = await open(url);
        expect(el.querySelector('app-sign-in-panel')).toBeNull();
      }
      expect(adapterLoads).toBe(0);
      expect(TestBed.inject(SignInGate).deckControls()).toBe(true);
    });

    it.each(GATED)('SYNC-048 / AC 47 / AC 57 / H-115 first sync running on %s: status line, no heading, decorative bar, no aria-busy', async (url) => {
      setup({ ...emptySyncLog(), sessionExpected: true });
      const { el } = await open(url);
      const panel = el.querySelector('app-sign-in-panel')!;
      const line = panel.querySelector('p')!;
      expect(text(line)).toBe('Getting your collection and decks from your account…');
      expect(line.getAttribute('role')).toBe('status');
      expect(panel.querySelector('h2')).toBeNull();
      expect(panel.querySelector('[aria-busy]')).toBeNull();
      const bar = panel.querySelector('app-empty-state .actions .progress')!;
      expect(bar).not.toBeNull();
      expect(bar.getAttribute('aria-hidden')).toBe('true');
      expect(bar.getAttribute('role')).toBeNull();
      expect(panel.querySelector('app-deck-mark')).not.toBeNull();
      expect(buttons(el)).toEqual([]);
      expect(content(el)).toBeNull();
      expect(TestBed.inject(SignInGate).deckControls()).toBe(false);
    });

    it('SYNC-048 / AC 25 / AC 47 / AC 57 a failed first sync shows the failure line (alert, no heading) and Try again, which reruns the flow', async () => {
      setup({ ...emptySyncLog(), sessionExpected: true });
      const gate = TestBed.inject(SignInGate);
      let retries = 0;
      gate.connect({ signIn: () => undefined, retry: () => retries++ });
      gate.set('first-sync-failed');
      const { el, harness } = await open('/decks');
      const line = el.querySelector('app-sign-in-panel p')!;
      expect(text(line)).toBe("Couldn't get your collection and decks. Check your connection and try again.");
      expect(line.getAttribute('role')).toBe('alert');
      expect(el.querySelector('app-sign-in-panel h2')).toBeNull();
      expect(el.querySelector('app-sign-in-panel app-deck-mark')).not.toBeNull();
      expect(el.querySelector('app-sign-in-panel .progress')).toBeNull();
      expect(buttons(el)).toEqual(['Try again']);
      el.querySelector('button')!.click();
      expect(retries).toBe(1);
      gate.set('open'); // the flow completed: content without a reload
      await harness.fixture.whenStable();
      expect(el.querySelector('app-sign-in-panel')).toBeNull();
      await vi.waitFor(async () => {
        await harness.fixture.whenStable();
        expect(content(el)).not.toBeNull(); // Decks reads its decks once the gate opens
      });
    });

    it('H-115 / Brief H-144 focus: Try again → running focuses the panel (not body); a second failure focuses Try again', async () => {
      setup({ ...emptySyncLog(), sessionExpected: true });
      const gate = TestBed.inject(SignInGate);
      gate.connect({ signIn: () => undefined, retry: () => gate.set('first-sync') });
      gate.set('first-sync-failed');
      const { el, harness } = await open('/decks');
      const retry = el.querySelector('app-sign-in-panel button') as HTMLButtonElement;
      retry.focus();
      retry.click();
      await harness.fixture.whenStable();
      const section = el.querySelector('app-sign-in-panel section')!;
      expect(text(section.querySelector('p'))).toBe(GATE_TEXT.firstSync);
      expect(section.getAttribute('tabindex')).toBe('-1');
      expect(document.activeElement).toBe(section);
      gate.set('first-sync-failed');
      await harness.fixture.whenStable();
      expect(document.activeElement).toBe(el.querySelector('app-sign-in-panel button'));
      expect(text(document.activeElement)).toBe('Try again');
    });

    it('H-115 / Brief H-144 focus: after Try again fails once, an automatic rerun (running → failed) does not move focus', async () => {
      setup({ ...emptySyncLog(), sessionExpected: true });
      const gate = TestBed.inject(SignInGate);
      gate.connect({ signIn: () => undefined, retry: () => gate.set('first-sync') });
      gate.set('first-sync-failed');
      const { el, harness } = await open('/decks');
      (el.querySelector('app-sign-in-panel button') as HTMLButtonElement).click();
      await harness.fixture.whenStable();
      gate.set('first-sync-failed'); // the user's retry failed: focus on Try again (previous test)
      await harness.fixture.whenStable();
      const outside = document.createElement('button');
      document.body.appendChild(outside);
      try {
        outside.focus();
        gate.set('first-sync'); // SyncService reruns on its own (online / visible), no Try again
        await harness.fixture.whenStable();
        expect(document.activeElement).toBe(outside);
        gate.set('first-sync-failed');
        await harness.fixture.whenStable();
        expect(document.activeElement).toBe(outside);
      } finally {
        outside.remove();
      }
    });

    it('SYNC-003 the panel Sign in opens the Sign in dialog with the v0.8 text and loads no Firebase', async () => {
      setup();
      TestBed.inject(SyncService); // registers the gate actions, as the header's account menu does
      const { el, harness } = await open('/decks');
      el.querySelector('button')!.click();
      await harness.fixture.whenStable();
      const dialog = document.querySelector('mat-dialog-container')!;
      expect(text(dialog)).toContain(SIGN_IN_INTRO);
      // SYNC-003 v0.14 (H-178 decision 7): the last sentence tells a new user this also creates the account.
      expect(SIGN_IN_INTRO).toBe(
        "Sign in to import your cards and decks. They're saved to your account, so you'll see them on any device you sign in on. New here? Signing in with your email creates your account.",
      );
      expect(adapterLoads).toBe(0);
      // Close before teardown: since H-125 the dialog restores focus to the panel's Sign in, and doing that
      // after the test's injector is gone would start a ripple on a destroyed injector (NG0205).
      Array.from(dialog.querySelectorAll('button')).find((b) => text(b) === 'Close')!.click();
      await vi.waitFor(() => expect(document.querySelector('mat-dialog-container')).toBeNull());
      expect(document.activeElement).toBe(el.querySelector('app-sign-in-panel button'));
    });

    it('SYNC-159 (c) / AC 80 /decks?import=1 keeps its URL while closed (sign-in panel, no dialog) and opens Import deck once the gate opens, then drops the parameter', async () => {
      setup();
      const { harness, el } = await open('/decks?import=1');
      expect(TestBed.inject(Router).url).toBe('/decks?import=1');
      expect(el.querySelector('app-sign-in-panel')).not.toBeNull();
      expect(document.querySelector('mat-dialog-container')).toBeNull();
      TestBed.inject(SignInGate).set('open');
      await vi.waitFor(async () => {
        await harness.fixture.whenStable();
        expect(text(document.querySelector('mat-dialog-container'))).toContain('Import deck');
      });
      await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/decks'));
      expect(document.querySelectorAll('mat-dialog-container')).toHaveLength(1);
    });

    it('SYNC-159 (c) / AC 80 /collection?add=1 signed out: the page header and the sign-in panel, no dialog, the parameter kept', async () => {
      setup();
      const { el } = await open('/collection?add=1');
      expect(TestBed.inject(Router).url).toBe('/collection?add=1');
      expect(text(el.querySelector('h1'))).toBe('Collection');
      expect(el.querySelector('app-sign-in-panel')).not.toBeNull();
      expect(document.querySelector('mat-dialog-container')).toBeNull();
    });

    it('SYNC-009 / AC 46 Tournaments is public, and its deck controls are off while the gate is not open', async () => {
      setup();
      const { el } = await open('/tournaments');
      expect(el.querySelector('app-sign-in-panel')).toBeNull();
      expect(text(el.querySelector('h1'))).toBe('Tournaments');
      expect(text(el)).not.toMatch(/Add to your decks|In your decks|Add another copy/);
      const gate = TestBed.inject(SignInGate);
      for (const state of ['signed-out', 'session-lost', 'first-sync', 'first-sync-failed'] as const) {
        gate.set(state);
        expect(gate.deckControls()).toBe(false);
      }
      gate.set('open');
      expect(gate.deckControls()).toBe(true);
    });

    it('AC 31 / SPEC-007 COLL-074 withdrawn: Collection offers no delete-all-local action, signed in (desktop: no More menu)', async () => {
      storeLegacyData(); // a filled collection
      setup(SYNCED);
      const { harness, el } = await open('/collection');
      await pageSettled(harness, el);
      expect(text(el)).not.toMatch(/Delete all local|local collection data/i);
      // Desktop: Export CSV sits in the header; the More menu exists only on phones, for Export CSV alone.
      expect(el.querySelector('button[aria-label="More"]')).toBeNull();
      expect('offerDeleteLocalData' in TestBed.inject(SignInGate)).toBe(false);
      // No browser-only delete in the stores either: sign-out and account deletion are the only clears (SYNC-142).
      expect(Object.keys(TestBed.inject(AppStores).stores).sort()).toEqual(
        ['collection', 'decks', 'locks', 'log', 'printingCodes', 'queue', 'raw', 'tags', 'viewState'],
      );
    });

    it('SYNC-009 / AC 46 / SYNC-150 / AC 71 the header tabs and Sign in stay visible while signed out; no Import button or tab', async () => {
      setup();
      TestBed.configureTestingModule({ imports: [App] });
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      const el = fixture.nativeElement as HTMLElement;
      const hrefs = (selector: string) =>
        Array.from(el.querySelectorAll(selector)).map((a) => a.getAttribute('href'));
      expect(hrefs('.site-nav a')).toEqual(['/decks', '/collection', '/tournaments']);
      // The phone tab bar (H-085) has the same three tabs (SYNC-150: no Import tab).
      expect(hrefs('.tab-bar a')).toEqual(['/decks', '/collection', '/tournaments']);
      expect(el.querySelector('header .import-action')).toBeNull();
      await vi.waitFor(() => {
        fixture.detectChanges();
        expect(buttons(el.querySelector('header')!)).toEqual(['Sign in']);
      });
    });

    it('AC 45 / SYNC-001 a fresh browser with no session can import nothing: panels, no Tournaments Add, nothing stored', async () => {
      setup();
      for (const url of [...GATED, '/decks?import=1', '/collection?add=1']) {
        const { el } = await open(url);
        expect(el.querySelector('app-sign-in-panel')).not.toBeNull();
        expect(el.querySelector('app-page-fab')).toBeNull();
        expect(document.querySelector('mat-dialog-container')).toBeNull(); // no import dialog opens
      }
      const { el } = await open('/tournaments');
      expect(text(el)).not.toMatch(/Add to your decks|In your decks|Add another copy/);
      expect(TestBed.inject(SignInGate).deckControls()).toBe(false);
      // Nothing was written to a local store and no sync log was created.
      expect(Object.keys({ ...localStorage }).filter((k) => k.startsWith('rift.'))).toEqual([]);
      expect(adapterLoads).toBe(0);
    });

    it('SPEC-012 LOG-001 / LOG-003 / AC 1 signed out with empty storage, /changelog shows its page, no panel, no Firebase, no storage key', async () => {
      setup();
      const cookies = document.cookie;
      const session = Object.keys({ ...sessionStorage });
      const { el } = await open('/changelog');
      expect(TestBed.inject(Router).url).toBe('/changelog');
      expect(text(el.querySelector('h1'))).toBe("What's new");
      expect(text(el)).toContain("What's changed in Rift Builder, newest first.");
      expect(el.querySelector('app-sign-in-panel')).toBeNull();
      expect(adapterLoads).toBe(0);
      expect(Object.keys({ ...localStorage })).toEqual([]);
      expect(Object.keys({ ...sessionStorage })).toEqual(session);
      expect(document.cookie).toBe(cookies);
    });

    it('SYNC-104 (a, h) / AC 65 / AC 70 signed out with empty storage, /privacy shows the notice, no panel, no Firebase, no storage key, no cookie', async () => {
      setup();
      const cookies = document.cookie;
      const session = Object.keys({ ...sessionStorage });
      const { el } = await open('/privacy');
      expect(TestBed.inject(Router).url).toBe('/privacy');
      expect(text(el.querySelector('h1'))).toBe('Privacy notice');
      expect(text(el)).toContain('Effective');
      expect(el.querySelector('app-sign-in-panel')).toBeNull();
      expect(adapterLoads).toBe(0);
      expect(Object.keys({ ...localStorage })).toEqual([]);
      expect(Object.keys({ ...sessionStorage })).toEqual(session);
      expect(document.cookie).toBe(cookies);
    });

    it('SYNC-104 (a) / AC 65 signed in and synced, or offline, /privacy shows the same text', async () => {
      setup(SYNCED);
      const { el } = await open('/privacy');
      const signedOut = text(el.querySelector('app-privacy-page'));
      expect(text(el.querySelector('h1'))).toBe('Privacy notice');
      expect(el.querySelector('app-sign-in-panel')).toBeNull();
      const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      try {
        window.dispatchEvent(new Event('offline'));
        await open('/');
        const { el: offline } = await open('/privacy');
        expect(text(offline.querySelector('app-privacy-page'))).toBe(signedOut);
      } finally {
        onLine.mockRestore();
      }
    });

    it('SPEC-012 LOG-001 / AC 1 signed in and synced, /changelog shows the same page', async () => {
      setup(SYNCED);
      const { el } = await open('/changelog');
      expect(text(el.querySelector('h1'))).toBe("What's new");
      expect(el.querySelector('app-sign-in-panel')).toBeNull();
    });

    it('AC 35 / SYNC-007 / SYNC-002 the app shell shows Sign in to a signed-out visitor and loads no Firebase', async () => {
      setup();
      TestBed.configureTestingModule({ imports: [App] });
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      await vi.waitFor(() => {
        fixture.detectChanges();
        expect(buttons(fixture.nativeElement as HTMLElement)).toContain('Sign in');
      });
      expect(adapterLoads).toBe(0);
    });
  });
});

describe('Gate opens after sign-in without a reload (SPEC-010 SYNC-009, AC 46 / AC 47, real SyncService)', () => {
  afterEach(() => localStorage.clear());

  it('AC 46 / AC 48 / AC 61 / AC 45 signed out → Sign in → first sync completes → Collection shows its content; stale data cleared, not uploaded; 40 imported cards land in the account', async () => {
    localStorage.clear();
    storeLegacyData();
    const db = new FakeFirestore();
    const auth = new FakeAuth();
    const remote = new FakeRemote(db);
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        { provide: SYNC_ADAPTERS, useValue: async () => ({ auth, remote }) },
      ],
    });
    const harness = await RouterTestingHarness.create('/collection');
    await harness.fixture.whenStable();
    const el = harness.routeNativeElement as HTMLElement;
    expect(el.querySelector('app-sign-in-panel')).not.toBeNull();
    const gate = TestBed.inject(SignInGate);
    const sync = TestBed.inject(SyncService);
    sync.start();
    await sync.signInWithGoogle();
    await vi.waitFor(() => expect(gate.state()).toBe('open'));
    await harness.fixture.whenStable();
    expect(el.querySelector('app-sign-in-panel')).toBeNull();
    expect(content(el)).not.toBeNull();
    expect(gate.deckControls()).toBe(true);
    // the first sign-in cleared the legacy data and uploaded nothing
    expect(localStorage.getItem(STORAGE_KEYS.collection)).toBeNull();
    expect([...db.docs.keys()]).toEqual(['users/uA']);

    // AC 45: signed in, an import of 40 cards is saved in the cache and in the account (one state/collection write).
    db.resetCounts();
    const cards: Record<string, { quantity: number; byPrinting: Record<string, number> }> = {};
    for (let i = 0; i < 40; i++) cards[`card ${i}`] = { quantity: 1, byPrinting: {} };
    const stores = TestBed.inject(AppStores).stores;
    await stores.collection.save({ schemaVersion: 1, updatedAt: new Date().toISOString(), catalogVersion: 'x', cards });
    await sync.syncNow();
    await vi.waitFor(() => expect(sync.pendingCount()).toBe(0));
    expect(Object.keys((await stores.collection.load())!.cards)).toHaveLength(40);
    expect(db.writeLog).toEqual([['users/uA/state/collection', 'set']]);
  });
});
