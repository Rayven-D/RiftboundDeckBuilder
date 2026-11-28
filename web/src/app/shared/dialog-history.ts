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
 * skips it for the same reason as above.
 *
 * A link in the dialog (RJ 2026-11-28: the dialog is part of the history stack): the router pushes the new page after
 * the dialog's entry, and the entry stays. Before the router changes the URL, the entry's state gets `reopen()`'s
 * small record (dialog kind and the card shown). Back from the new page lands on that entry: the page is rebuilt by
 * the router, reads the record with `takeDialogReopen` and opens the dialog again with `adopt` (no second entry).
 * The next Back closes it as usual; Forward from it closes it and the router goes to the linked page.
 *
 * The dialog must be opened with `closeOnNavigation: false`: Material's own close-on-popstate would close it a second
 * time without a result. Use from the dialog component's constructor (injection context). One helper per dialog; if
 * dialogs stack, Back closes the top one.
 */
const MARKER = 'riftDialog';
/** The reopen record in a dialog entry's state (written when a link in the dialog is followed). */
const REOPEN = 'riftDialogReopen';

/** What a page needs to open a dialog again from its history entry. Small on purpose (it lives in history.state). */
export interface DialogReopenInfo {
  /** Which dialog, e.g. `deck-card`. */
  readonly kind: string;
  /** The card (or entry) it showed when the link was followed (the deck dialog's current step). */
  readonly id: string;
}

export interface DialogReopen extends DialogReopenInfo {
  /** The entry's token; pass it back as `adopt` so the reopened dialog uses this entry. */
  readonly token: string;
}

function currentState(): Record<string, unknown> | null {
  return (globalThis.history?.state as Record<string, unknown> | null) ?? null;
}

/**
 * The record for a dialog of `kind` to reopen on this page, or null. Only after a Back / Forward (`popstate`)
 * navigation: a reload or a link to the page never reopens anything (the stale record is ignored). Call it when the
 * page has its data, then open the dialog only if the card still exists (a stale record opens nothing).
 */
export function takeDialogReopen(router: Router, kind: string): DialogReopen | null {
  const r = reopenRecord(router);
  return r && r.kind === kind ? r : null;
}

/**
 * Brief H-733 S2: whether the navigation in progress lands on an entry whose dialog will open again (any kind). The
 * route change behind a restored dialog is then instant (`vt-instant`): the page is under the dialog.
 */
export function dialogReopenPending(router: Router): boolean {
  return reopenRecord(router) !== null;
}

function reopenRecord(router: Router): DialogReopen | null {
  const nav = router.currentNavigation() ?? router.lastSuccessfulNavigation();
  if (nav?.trigger !== 'popstate') return null;
  const state = currentState();
  const r = state?.[REOPEN] as Partial<DialogReopen> | undefined;
  if (!r || typeof r.kind !== 'string' || typeof r.id !== 'string' || typeof r.token !== 'string') return null;
  if (state?.[MARKER] !== r.token) return null;
  return { kind: r.kind, id: r.id, token: r.token };
}

interface Entry {
  readonly token: string;
  readonly href: string;
  readonly onBack: (leaving: boolean) => void;
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
    // Back to this page (same URL) or a move to another page (Forward from a reopened dialog: the router follows).
    top.onBack(globalThis.location?.href !== top.href);
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
  /** True while this dialog's entry is on the history stack. */
  readonly pushed: Signal<boolean>;
}

export interface CloseOnBackOptions {
  /** The record to keep in the entry when a link in the dialog is followed; null keeps none. */
  reopen?: () => DialogReopenInfo | null;
  /** Reopening from history: the token of the entry that is already current (`takeDialogReopen`). */
  adopt?: string | null;
}

export function closeOnBack(
  ref: MatDialogRef<unknown, unknown>,
  onBack: (leaving: boolean) => void,
  opts: CloseOnBackOptions = {},
): DialogHistory {
  const router = inject(Router);
  const history = globalThis.history;
  const pushed = signal(false);
  if (!history || typeof history.pushState !== 'function') return { pushed };
  listen();
  // Reopened from its entry: use that entry (it is current) instead of pushing a second one.
  const adopt = opts.adopt && currentState()?.[MARKER] === opts.adopt ? opts.adopt : null;
  const token = adopt ?? `d${++seq}`;
  let closed = false;
  /** A router navigation started while open: the entry is the navigation's to replace, never ours to remove. */
  let navigated = false;
  const entry: Entry = {
    token,
    href: globalThis.location?.href ?? '',
    onBack: (leaving) => {
      pushed.set(false);
      if (!closed) onBack(leaving);
    },
  };

  const push = () => {
    if (closed || navigated) return;
    const state = { ...((history.state as object | null) ?? {}), [MARKER]: token };
    history.pushState(state, '', globalThis.location?.href);
    stack.push(entry);
    pushed.set(true);
  };
  if (adopt) {
    stack.push(entry);
    pushed.set(true);
  } else if (cleanups > 0) waiting.push(push);
  else push();

  const nav = router.events
    .pipe(
      filter((e): e is NavigationStart => e instanceof NavigationStart),
      take(1),
    )
    .subscribe(() => {
      navigated = true;
      // A link in the dialog: the URL has not changed yet, so the dialog's entry is still current. Keep the record.
      const state = currentState();
      if (!opts.reopen || !pushed() || state?.[MARKER] !== token) return;
      const info = opts.reopen();
      if (info) history.replaceState({ ...state, [REOPEN]: { kind: info.kind, id: info.id, token } }, '', globalThis.location?.href);
    });

  const release = () => {
    if (closed) return;
    closed = true;
    nav.unsubscribe();
    waiting = waiting.filter((f) => f !== push);
    const i = stack.indexOf(entry);
    if (i === -1) return; // Back already took the entry (or it was never pushed)
    stack.splice(i, 1);
    pushed.set(false);
    // A link in the dialog: the entry stays (Back from the new page reopens the dialog). Otherwise take the entry off
    // again, but only while it is still the current one (the user may have gone elsewhere meanwhile).
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
