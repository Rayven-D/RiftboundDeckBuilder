/**
 * SPEC-010 v0.8 SYNC-008 / SYNC-009 at page level: the sign-in gate on Decks, deck detail, Collection and Import,
 * Tournaments' deck controls, and SYNC-052, in both modes (`signInEnabled` true and false).
 */
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { App } from '../app';
import { routes } from '../app.routes';
import { STORAGE_KEYS } from '../core/storage/local-stores';
import { SignInGate } from '../core/sync/sign-in-gate';
import { GATE_HEADINGS, GATE_TEXT } from '../core/sync/sign-in-panel';
import { SIGN_IN_ENABLED, SYNC_ADAPTERS, SyncService } from '../core/sync/sync.service';
import { SIGN_IN_INTRO } from '../core/sync/sync-dialogs';
import { emptySyncLog } from '../shared/sync/sync-log';
import type { StoredSyncLog } from '../shared/sync/sync-types';
import { FakeAuth, FakeFirestore, FakeRemote } from '../shared/sync/testing/fakes';

const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const buttons = (el: Element) => Array.from(el.querySelectorAll('button')).map(text);
const SYNCED: StoredSyncLog = { ...emptySyncLog(), uid: 'uA', sessionExpected: true, lastFullSyncAt: 1, lastSyncAt: 1, cursors: { state: 1, decks: 1 } };
const GATED: [string, string][] = [
  ['/collection', GATE_HEADINGS.collection],
  ['/decks', GATE_HEADINGS.decks],
  ['/decks/0b7c0000-0000-4000-8000-000000000001', GATE_HEADINGS.decks],
  ['/import', GATE_HEADINGS.import],
];

/** Legacy local data (saved in local-only mode): a collection, a deck, and the stamps local-only mode writes. */
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

describe('Sign-in gate on pages (SPEC-010 SYNC-008, SYNC-009)', () => {
  let adapterLoads = 0;
  afterEach(() => {
    localStorage.clear();
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => (el.innerHTML = ''));
  });

  function setup(enabled: boolean, log: StoredSyncLog | null = null): void {
    adapterLoads = 0;
    if (log) localStorage.setItem(STORAGE_KEYS.syncLog, JSON.stringify(log));
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
        { provide: SIGN_IN_ENABLED, useValue: enabled },
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

  describe('account-required mode (signInEnabled true)', () => {
    it.each(GATED)('SYNC-009 / AC 46 signed out, %s keeps its URL and shows "%s" with the signed-out text and Sign in', async (url, heading) => {
      setup(true);
      const { el } = await open(url);
      expect(TestBed.inject(Router).url).toBe(url);
      expect(text(el.querySelector('app-sign-in-panel h2'))).toBe(heading);
      expect(text(el)).toContain(GATE_TEXT.signedOut);
      expect(GATE_TEXT.signedOut).toBe('You need a free account to import cards and decks. Tournaments are open to everyone.');
      expect(buttons(el)).toEqual(['Sign in']);
      expect(el.querySelector('app-empty-state, .import-options')).toBeNull();
      expect(adapterLoads).toBe(0); // no firebase chunk (SYNC-002)
    });

    it('SYNC-009 / AC 46 / AC 48 legacy local data is never shown while signed out', async () => {
      storeLegacyData();
      setup(true);
      for (const url of ['/collection', '/decks']) {
        const { el } = await open(url);
        expect(el.querySelector('app-sign-in-panel')).not.toBeNull();
        expect(text(el)).not.toMatch(/hextech|Legacy Deck/i);
      }
      expect(TestBed.inject(SignInGate).state()).toBe('signed-out');
    });

    it('SYNC-086 / AC 27 a stored lost session shows the panel with the lost-session text from the first frame', async () => {
      setup(true, { ...SYNCED, sessionLostUid: 'uA' });
      const { el } = await open('/collection');
      expect(text(el.querySelector('app-sign-in-panel h2'))).toBe('Sign in to see your collection');
      expect(text(el)).toContain("You've been signed out. Sign in again to see them.");
      expect(text(el)).not.toContain(GATE_TEXT.signedOut);
      expect(TestBed.inject(SignInGate).deckControls()).toBe(false); // AC 27: no Add to your decks
    });

    it('SYNC-009 / AC 47 a synced log opens the gate at the first frame (also offline: no Firebase needed)', async () => {
      setup(true, SYNCED);
      for (const url of ['/collection', '/decks', '/import']) {
        const { el } = await open(url);
        expect(el.querySelector('app-sign-in-panel')).toBeNull();
      }
      expect(adapterLoads).toBe(0);
      expect(TestBed.inject(SignInGate).deckControls()).toBe(true);
    });

    it('SYNC-048 / AC 47 first sync running: "Getting your collection and decks from your account…", no content, no edits', async () => {
      setup(true, { ...emptySyncLog(), sessionExpected: true });
      const { el } = await open('/collection');
      expect(text(el)).toContain('Getting your collection and decks from your account…');
      expect(buttons(el)).toEqual([]);
      expect(el.querySelector('app-empty-state')).toBeNull();
      expect(TestBed.inject(SignInGate).deckControls()).toBe(false);
    });

    it('SYNC-048 / AC 25 a failed first sync shows the failure text and Try again, which reruns the flow', async () => {
      setup(true, { ...emptySyncLog(), sessionExpected: true });
      const gate = TestBed.inject(SignInGate);
      let retries = 0;
      gate.connect({ signIn: () => undefined, retry: () => retries++ });
      gate.set('first-sync-failed');
      const { el, harness } = await open('/decks');
      expect(text(el)).toContain("Couldn't get your collection and decks. Check your connection and try again.");
      el.querySelector('button')!.click();
      expect(retries).toBe(1);
      gate.set('open'); // the flow completed: content without a reload
      await harness.fixture.whenStable();
      expect(el.querySelector('app-sign-in-panel')).toBeNull();
      expect(el.querySelector('app-empty-state')).not.toBeNull();
    });

    it('SYNC-003 the panel Sign in opens the Sign in dialog with the v0.8 text and loads no Firebase', async () => {
      setup(true);
      TestBed.inject(SyncService); // registers the gate actions, as the header's account menu does
      const { el, harness } = await open('/import');
      el.querySelector('button')!.click();
      await harness.fixture.whenStable();
      const dialog = document.querySelector('mat-dialog-container')!;
      expect(text(dialog)).toContain(SIGN_IN_INTRO);
      expect(SIGN_IN_INTRO).toBe(
        "Sign in to import your cards and decks. They're saved to your account, so you'll see them on any device you sign in on.",
      );
      expect(adapterLoads).toBe(0);
    });

    it('SYNC-009 a deep link /import?type=deck keeps its URL while closed and opens the deck import once the gate opens', async () => {
      setup(true);
      const { harness } = await open('/import?type=deck');
      expect(TestBed.inject(Router).url).toBe('/import?type=deck');
      expect(document.querySelector('mat-dialog-container')).toBeNull();
      TestBed.inject(SignInGate).set('open');
      await harness.fixture.whenStable();
      expect(text(document.querySelector('mat-dialog-container'))).toContain('Import deck');
    });

    it('SYNC-009 / AC 46 Tournaments is public, and its deck controls are off while the gate is not open', async () => {
      setup(true);
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

    it('SYNC-052 / AC 31 Collection offers no Delete all local data in account-required mode, signed in', async () => {
      setup(true, SYNCED);
      const { el } = await open('/collection');
      expect(text(el)).not.toContain('Delete all local data');
      expect(TestBed.inject(SignInGate).offerDeleteLocalData).toBe(false);
    });

    it('SYNC-009 / AC 46 the header tabs and the Import button stay visible while signed out', async () => {
      setup(true);
      TestBed.configureTestingModule({ imports: [App] });
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      const el = fixture.nativeElement as HTMLElement;
      expect(Array.from(el.querySelectorAll('nav a')).map((a) => a.getAttribute('href'))).toEqual([
        '/decks',
        '/collection',
        '/tournaments',
      ]);
      expect(el.querySelector('header .import-action')?.getAttribute('href')).toBe('/import');
    });
  });

  describe('local-only mode (signInEnabled false, production today)', () => {
    it.each(GATED)('SYNC-008 / AC 45 %s shows its content and no sign-in panel', async (url) => {
      storeLegacyData();
      setup(false, { ...SYNCED, sessionLostUid: 'uA' }); // even a log that would close the gate changes nothing
      const { el } = await open(url);
      expect(el.querySelector('app-sign-in-panel')).toBeNull();
      expect(text(el)).not.toMatch(/Sign in/);
      expect(el.querySelector('app-empty-state, .import-options')).not.toBeNull();
      expect(adapterLoads).toBe(0);
    });

    it('SYNC-008 / AC 45 Tournaments deck controls are allowed and Delete all local data stays offered (COLL-074)', async () => {
      setup(false);
      const gate = TestBed.inject(SignInGate);
      expect(gate.state()).toBe('open');
      expect(gate.deckControls()).toBe(true);
      expect(gate.offerDeleteLocalData).toBe(true);
      gate.set('signed-out'); // the sync side never runs here; even if it did, nothing changes
      expect(gate.deckControls()).toBe(true);
    });

    it('SYNC-008 / AC 45 nothing is cleared: local data stays in the browser across a reload', async () => {
      storeLegacyData();
      const before = JSON.stringify({ ...localStorage });
      setup(false);
      const { el } = await open('/collection');
      expect(el.querySelector('app-empty-state')).not.toBeNull();
      expect(JSON.stringify({ ...localStorage })).toBe(before);
    });

    it('SYNC-007 / AC 45 the app shell shows no Sign in and loads no Firebase', async () => {
      setup(false);
      TestBed.configureTestingModule({ imports: [App] });
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      expect(text(fixture.nativeElement as HTMLElement)).not.toContain('Sign in');
      expect(adapterLoads).toBe(0);
    });
  });
});

describe('Gate opens after sign-in without a reload (SPEC-010 SYNC-009, AC 46 / AC 47, real SyncService)', () => {
  afterEach(() => localStorage.clear());

  it('AC 46 signed out → Sign in → first sync completes → Collection shows its content and deck controls turn on', async () => {
    localStorage.clear();
    storeLegacyData();
    const db = new FakeFirestore();
    const auth = new FakeAuth();
    const remote = new FakeRemote(db);
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        { provide: SIGN_IN_ENABLED, useValue: true },
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
    expect(el.querySelector('app-empty-state')).not.toBeNull();
    expect(gate.deckControls()).toBe(true);
    // the first sign-in cleared the legacy data and uploaded nothing
    expect(localStorage.getItem(STORAGE_KEYS.collection)).toBeNull();
    expect([...db.docs.keys()]).toEqual(['users/uA']);
  });
});
