import { DestroyRef, Injectable, InjectionToken, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CombineQuestion, MESSAGES, SyncEngine } from '../../shared/sync/sync-engine';
import { statusText } from '../../shared/sync/status-text';
import type { AuthService, RemoteStore, SyncStatus } from '../../shared/sync/sync-types';
import { AppStores } from '../storage/app-stores';
import { SIGN_IN_ENABLED } from './sign-in-flag';
import { CombineDialog } from './sync-dialogs';

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

  readonly status = signal<SyncStatus>({ kind: 'signed-out' });
  readonly statusLine = computed(() => statusText(this.status()));
  readonly online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);
  readonly signedIn = computed(() => this.status().kind !== 'signed-out');
  /** SYNC-096: this device's own unfinished deletion of the signed-in account (Try again, Cancel deletion). */
  readonly deletion = signal<{ canCancel: boolean } | null>(null);

  private readonly engine: SyncEngine;
  private started = false;
  private hiddenAt: number | null = null;

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
      confirmCombine: (q) => this.askCombine(q),
      notify: (m) => this.notify(m),
      onStatus: (s) => {
        this.status.set(s);
        this.deletion.set(this.engine.unfinishedDeletion());
      },
      withTabLock: tabLock,
      setTimer: (fn, ms) => setTimeout(fn, ms),
      clearTimer: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
    });
    this.app.connect(
      () => this.engine.scheduleChange(),
      (area) => this.engine.isReadOnly(area),
    );
    inject(DestroyRef).onDestroy(() => this.removeListeners());
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

  signInWithGoogle(): Promise<unknown> {
    return this.engine.signIn('google');
  }

  sendEmailLink(email: string): Promise<void> {
    return this.engine.sendEmailLink(email);
  }

  syncNow(): Promise<void> {
    return this.engine.syncNow();
  }

  signOut(mode: 'keep' | 'remove'): Promise<void> {
    return this.engine.signOut(mode);
  }

  deleteAccount(): Promise<'ok' | 'cancelled' | 'needs-sign-in' | 'failed' | 'offline'> {
    return this.engine.deleteAccount();
  }

  /** SYNC-096 Cancel deletion: only while nothing was removed; resumes normal syncing. */
  cancelDeletion(): Promise<boolean> {
    return this.engine.cancelDeletion();
  }

  /** SYNC-052: Delete all local data while signed in removes this device's copy and signs out. */
  deleteLocalData(): Promise<void> {
    return this.engine.signOut('remove');
  }

  private async completeEmailLink(): Promise<void> {
    // The address is kept on the device that asked for the link; opened elsewhere, ask for it.
    const email =
      localStorage.getItem('rift.emailForSignIn') ?? prompt('Confirm your email address to finish signing in.') ?? undefined;
    if (!email) return;
    await this.engine.signIn('email-link', email);
  }

  private async askCombine(q: CombineQuestion): Promise<'combine' | 'cancel'> {
    const ref = this.dialog.open(CombineDialog, { data: q, disableClose: true, autoFocus: 'first-tabbable' });
    return (await firstValueFrom(ref.afterClosed())) === 'combine' ? 'combine' : 'cancel';
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
