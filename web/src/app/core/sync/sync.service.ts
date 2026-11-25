import { DestroyRef, Injectable, InjectionToken, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MESSAGES, SyncEngine } from '../../shared/sync/sync-engine';
import { statusText } from '../../shared/sync/status-text';
import { enabledProviders } from '../../shared/sync/sync-types';
import type { AuthService, RemoteStore, SyncStatus } from '../../shared/sync/sync-types';
import { AppStores } from '../storage/app-stores';
import { SignInGate } from './sign-in-gate';
import { AUTH_PROVIDERS, SIGN_IN_ENABLED } from './sign-in-flag';
import { ConfirmEmailDialog, SignInDialog, SignInDialogData } from './sync-dialogs';

export { SIGN_IN_ENABLED };

export type AdapterLoader = () => Promise<{ auth: AuthService; remote: RemoteStore }>;

/**
 * Lazy loader of the Firebase adapters (SYNC-002): a dynamic `import()`, so `firebase` lands in a
 * lazy chunk and is fetched only on Sign in or when a session is expected at start-up.
 */
export const SYNC_ADAPTERS = new InjectionToken<AdapterLoader>('SYNC_ADAPTERS', {
  providedIn: 'root',
  factory: () => () =>
    import('./adapters/firebase-adapters').then((m) => m.createFirebaseAdapters(environment.firebase, environment.authProviders)),
});

/** Where the Firebase adapter keeps the address between Send link and opening the link (SYNC-006). */
const EMAIL_FOR_SIGN_IN = 'rift.emailForSignIn';

/**
 * H-125 fallback after the Sign in dialog closed: Material restores focus to the trigger it was given, but if
 * focus still ended on <body> (or nowhere), put it on the trigger, or on #main when the trigger is gone (a
 * panel that re-rendered). Focus already on a real element is never moved.
 */
export function refocusAfterDialog(trigger: HTMLElement | undefined, doc: Document = document): void {
  const active = doc.activeElement;
  if (active && active !== doc.body) return;
  if (trigger?.isConnected) trigger.focus();
  else doc.getElementById('main')?.focus();
}

/**
 * H-108 fallback after the start-up confirm dialog: a mouse Cancel leaves focus on <body> with the browser's Tab
 * starting point after the removed overlay, so the first Tab would leave the page. Focusing <body> (with a
 * tabindex removed again on blur) moves the starting point to the top, so one Tab reaches Skip to content.
 * Focus already on a real element is never moved.
 */
export function focusDocumentStart(doc: Document = document): void {
  const body = doc.body;
  if (doc.activeElement && doc.activeElement !== body) return;
  if (body.hasAttribute('tabindex')) return body.focus();
  body.setAttribute('tabindex', '-1');
  body.addEventListener('blur', () => body.removeAttribute('tabindex'), { once: true });
  body.focus();
}

/** Email link return: Firebase appends `mode=signIn` and `oobCode` to the continue URL. */
export function isEmailLinkUrl(href: string): boolean {
  const q = new URL(href).searchParams;
  return q.get('mode') === 'signIn' && q.has('oobCode');
}

/** Wires the pure `SyncEngine` to the browser: stores, dialogs, notices, and the SYNC-040 triggers. */
@Injectable({ providedIn: 'root' })
export class SyncService {
  readonly enabled = inject(SIGN_IN_ENABLED);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly app = inject(AppStores);
  private readonly loadAdapters = inject(SYNC_ADAPTERS);
  private readonly gate = inject(SignInGate);
  private readonly providers = inject(AUTH_PROVIDERS);

  readonly status = signal<SyncStatus>({ kind: 'signed-out' });
  readonly statusLine = computed(() => statusText(this.status()));
  readonly online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);
  readonly signedIn = computed(() => this.status().kind !== 'signed-out');
  /** SYNC-096: this device's own unfinished deletion of the signed-in account (Try again, Cancel deletion). */
  readonly deletion = signal<{ canCancel: boolean } | null>(null);

  private readonly engine: SyncEngine;
  private started = false;
  private hiddenAt: number | null = null;
  /** The app is being torn down (MatDialog closes its dialogs then): no focus is moved. */
  private destroyed = false;

  constructor() {
    const stores = this.app.stores;
    this.engine = new SyncEngine({
      local: stores.raw,
      log: stores.log,
      queue: stores.queue,
      adapters: this.loadAdapters,
      now: () => Date.now(),
      appVersion: environment.appVersion,
      isOnline: () => navigator.onLine,
      notify: (m) => this.notify(m),
      onStatus: (s) => {
        this.status.set(s);
        this.deletion.set(this.engine.unfinishedDeletion());
        this.gate.set(this.engine.gate()); // SYNC-009
      },
      withTabLock: tabLock,
      setTimer: (fn, ms) => setTimeout(fn, ms),
      clearTimer: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
    });
    this.app.connect(
      () => this.engine.scheduleChange(),
      (area) => this.engine.isReadOnly(area),
    );
    this.gate.connect({ signIn: (trigger) => void this.openSignIn(trigger), retry: () => void this.syncNow() });
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.removeListeners();
    });
  }

  /** App start-up. With the flag off nothing happens, so `firebase` is never loaded (SYNC-007, SYNC-002). */
  start(): void {
    if (!this.enabled || this.started) return;
    this.started = true;
    addEventListener('online', this.onOnline);
    addEventListener('offline', this.onOffline);
    document.addEventListener('visibilitychange', this.onVisibility);
    void this.engine.start().then(() => {
      if (isEmailLinkUrl(location.href)) return this.completeEmailLink();
      return undefined;
    });
  }

  pendingCount(): number {
    return this.engine.pendingCount();
  }

  /**
   * SYNC-003 / SYNC-100 (H-141): the signed-in address for the account menu's identity line, read from Auth on
   * every call (the menu template calls it as it renders). Not a signal and never stored.
   */
  currentEmail(): string | null {
    return this.engine.currentEmail();
  }

  /**
   * SYNC-095 (H-143): read once when the delete dialog opens. Both are false while the adapters aren't loaded
   * (then there is no session, and the engine's SYNC-096 step 1 check on confirm still applies).
   */
  needsRecentSignIn(): boolean {
    return this.engine.needsRecentSignIn();
  }

  canReauthenticate(): boolean {
    return this.engine.canReauthenticate();
  }

  signInWithGoogle(): Promise<unknown> {
    return this.engine.signIn('google');
  }

  sendEmailLink(email: string): Promise<void> {
    return this.engine.sendEmailLink(email);
  }

  syncNow(): Promise<void> {
    return this.engine.syncNow();
  }

  /** SYNC-090 / SYNC-091: signs out and clears this device; refused offline (SYNC-081). */
  signOut(): Promise<'ok' | 'offline'> {
    return this.engine.signOut();
  }

  /**
   * SYNC-003 Sign in dialog (header and the SYNC-009 panels). Opening it loads nothing (SYNC-002); Send link
   * or Continue with Google does. `trigger` is the Sign in button that opened it (H-125): focus returns to it
   * on close, also when the browser didn't focus it on click (Safari) or focus was lost inside the dialog.
   */
  async openSignIn(trigger?: HTMLElement): Promise<void> {
    const data: SignInDialogData = {
      online: this.online(),
      providers: enabledProviders(this.providers),
      sendEmailLink: (e) => this.sendEmailLink(e),
    };
    const ref = this.dialog.open(SignInDialog, { data, autoFocus: 'first-tabbable', restoreFocus: trigger ?? true });
    const choice = await firstValueFrom(ref.afterClosed());
    if (!this.destroyed) refocusAfterDialog(trigger);
    if (choice === 'google' && this.providers.includes('google')) await this.signInWithGoogle();
  }

  deleteAccount(): Promise<'ok' | 'cancelled' | 'needs-sign-in' | 'failed' | 'offline'> {
    return this.engine.deleteAccount();
  }

  /** SYNC-096 Cancel deletion: only while nothing was removed; resumes normal syncing. */
  cancelDeletion(): Promise<boolean> {
    return this.engine.cancelDeletion();
  }

  /**
   * SYNC-006 email link return. On the device that sent it the stored address completes the sign-in with no
   * question; elsewhere the H-108 dialog asks for it. No address (Cancel, Escape, backdrop) is a cancelled
   * sign-in: nothing happens and no message shows (SYNC-005). A failed link shows the engine's SYNC-005 text.
   */
  private async completeEmailLink(): Promise<void> {
    const email = localStorage.getItem(EMAIL_FOR_SIGN_IN) ?? (await this.confirmEmail());
    if (!email) return;
    await this.engine.signIn('email-link', email);
  }

  /**
   * H-108: no trigger at start-up, so focus goes back to the start of the document and the next Tab reaches
   * Skip to content. Width: 28rem fits a long address; on phones Material's panel max-width
   * (100vw - 32px under 600px) keeps it the Sign in dialog's width.
   */
  private async confirmEmail(): Promise<string | undefined> {
    const ref = this.dialog.open<ConfirmEmailDialog, unknown, string>(ConfirmEmailDialog, {
      autoFocus: 'first-tabbable',
      restoreFocus: false,
      width: '28rem',
    });
    const email = await firstValueFrom(ref.afterClosed());
    if (!this.destroyed) focusDocumentStart();
    return email;
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'OK', { duration: message === MESSAGES.sessionLost ? undefined : 8000 });
  }

  private readonly onOnline = () => {
    this.online.set(true);
    void this.engine.syncNow(); // SYNC-040: back online
  };

  private readonly onOffline = () => this.online.set(false);

  private readonly onVisibility = () => {
    if (document.visibilityState === 'hidden') {
      this.hiddenAt = Date.now();
      void this.engine.flush(); // SYNC-043: push when the tab is hidden
    } else if (this.hiddenAt !== null && Date.now() - this.hiddenAt >= 5 * 60_000) {
      this.hiddenAt = null;
      void this.engine.syncNow(); // SYNC-040: visible again after 5 minutes or more
    }
  };

  private removeListeners(): void {
    removeEventListener('online', this.onOnline);
    removeEventListener('offline', this.onOffline);
    document.removeEventListener('visibilitychange', this.onVisibility);
  }
}

/** SYNC-051: one syncing tab per browser (Web Locks); without Web Locks, every tab may sync. */
function tabLock<T>(job: () => Promise<T>): Promise<T> {
  const locks = (navigator as Navigator & { locks?: LockManager }).locks;
  if (!locks) return job();
  return locks.request('rift-builder-sync', job) as Promise<T>;
}
