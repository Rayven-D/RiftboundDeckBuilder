import { DestroyRef, Signal, inject, signal } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { NavigationStart, Router } from '@angular/router';
import { filter, take } from 'rxjs';

/**
 * H-699 (Brief H-698 S7, RJ decision B1): the browser / system Back closes an open dialog and stays on the page.
 *
 * On open, one history entry is pushed with `pushState` (same URL, a marker in the state, no router navigation).
 * Back pops it: the router sees a navigation to the URL it is already on and skips it (NavigationSkipped: the page is
 * not re-created, nothing scrolls, the lists' Back restore does not run), and this helper calls `onBack`, which closes
 * the dialog the dialog's own way (result object, exit animation).
 *
 * Closed any other way (Close, swipe, backdrop, Escape, the dialog closing itself), the entry is removed again with
 * `history.back()`, so the next Back leaves the page. That popstate is ours: it is swallowed here, and the router
 * skips it for the same reason as above. A router navigation started while the dialog is open (a link in it) leaves
 * the entry alone: the link should navigate with `replaceUrl` (see `pushed`), so the new page takes the entry's place
 * and one Back returns to this page.
 *
 * The dialog must be opened with `closeOnNavigation: false`: Material's own close-on-popstate would close it a second
 * time without a result. Use from the dialog component's constructor (injection context). One helper per dialog; if
 * dialogs stack, Back closes the top one.
 */
const MARKER = 'riftDialog';

interface Entry {
  readonly token: string;
  readonly onBack: () => void;
}

/** Open dialogs with an entry on the history stack, oldest first. */
const stack: Entry[] = [];
/** `history.back()` calls made here whose popstate has not arrived yet. */
let cleanups = 0;
/** Pushes waiting for those popstates (a push before them would land in the wrong place). */
let waiting: (() => void)[] = [];
let seq = 0;
let listening = false;

function onPopState(): void {
  if (cleanups > 0) {
    cleanups--;
    if (cleanups === 0) {
      const run = waiting;
      waiting = [];
      run.forEach((f) => f());
    }
    return;
  }
  const top = stack.at(-1);
  if (top && (globalThis.history?.state as Record<string, unknown> | null)?.[MARKER] !== top.token) {
    stack.pop();
    top.onBack();
  }
}

function listen(): void {
  if (listening || typeof addEventListener !== 'function') return;
  listening = true;
  addEventListener('popstate', onPopState);
}

/** Test hook: forget all state (each test starts with a fresh history in jsdom only if it says so). */
export function resetDialogHistory(): void {
  stack.length = 0;
  cleanups = 0;
  waiting = [];
  if (listening) removeEventListener('popstate', onPopState);
  listening = false;
}

export interface DialogHistory {
  /** True while this dialog's entry is on the history stack (links inside should then navigate with replaceUrl). */
  readonly pushed: Signal<boolean>;
}

export function closeOnBack(ref: MatDialogRef<unknown, unknown>, onBack: () => void): DialogHistory {
  const router = inject(Router);
  const history = globalThis.history;
  const pushed = signal(false);
  if (!history || typeof history.pushState !== 'function') return { pushed };
  listen();
  const token = `d${++seq}`;
  let closed = false;
  /** A router navigation started while open: the entry is the navigation's to replace, never ours to remove. */
  let navigated = false;
  const entry: Entry = {
    token,
    onBack: () => {
      pushed.set(false);
      if (!closed) onBack();
    },
  };

  const push = () => {
    if (closed || navigated) return;
    const state = { ...((history.state as object | null) ?? {}), [MARKER]: token };
    history.pushState(state, '', globalThis.location?.href);
    stack.push(entry);
    pushed.set(true);
  };
  if (cleanups > 0) waiting.push(push);
  else push();

  const nav = router.events
    .pipe(
      filter((e): e is NavigationStart => e instanceof NavigationStart),
      take(1),
    )
    .subscribe(() => (navigated = true));

  const release = () => {
    if (closed) return;
    closed = true;
    nav.unsubscribe();
    waiting = waiting.filter((f) => f !== push);
    const i = stack.indexOf(entry);
    if (i === -1) return; // Back already took the entry (or it was never pushed)
    stack.splice(i, 1);
    pushed.set(false);
    // A link in the dialog: the router replaces this entry with the new page. Otherwise take the entry off again,
    // but only while it is still the current one (the user may have gone elsewhere meanwhile).
    if (navigated) return;
    if ((history.state as Record<string, unknown> | null)?.[MARKER] !== token) return;
    cleanups++;
    history.back();
  };
  // After the click that closed it: a routerLink's NavigationStart in the same task is seen first.
  ref.afterClosed().subscribe(() => setTimeout(release, 0));
  inject(DestroyRef).onDestroy(() => setTimeout(release, 0));
  return { pushed };
}
