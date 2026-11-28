import { Component, Injector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { Router, provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeOnBack, resetDialogHistory, takeDialogReopen } from './dialog-history';

/**
 * H-699 (Brief H-698 S7, AC 12 / AC 13): the history entry a dialog pushes on open, popped by Back or removed on any
 * other close. jsdom's history traverses asynchronously like a browser, so each Back is awaited by its popstate.
 */
@Component({ template: '' })
class Blank {}

function fakeRef() {
  const closed = new Subject<unknown>();
  return { ref: { afterClosed: () => closed } as unknown as MatDialogRef<unknown, unknown>, closed };
}

const popped = () => new Promise<void>((r) => addEventListener('popstate', () => setTimeout(r, 0), { once: true }));
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('H-699 closeOnBack (Brief H-698 S7)', () => {
  let injector: Injector;
  beforeEach(async () => {
    // Let history traversals left by earlier spec files (dialogs closed there) land before this file's state starts.
    await new Promise((r) => setTimeout(r, 50));
    resetDialogHistory();
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: '**', component: Blank }])] });
    injector = TestBed.inject(Injector);
  });
  afterEach(() => resetDialogHistory());

  it('AC 12: open pushes one same-URL entry; Back calls onBack once and leaves the URL alone', async () => {
    const start = history.length;
    const url = location.href;
    const { ref, closed } = fakeRef();
    const onBack = vi.fn();
    const h = runInInjectionContext(injector, () => closeOnBack(ref, onBack));
    expect(history.length).toBe(start + 1);
    expect(location.href).toBe(url);
    expect(h.pushed()).toBe(true);
    const p = popped();
    history.back();
    await p;
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(h.pushed()).toBe(false);
    expect(location.href).toBe(url);
    // The dialog then closes; nothing more happens to the history.
    const back = vi.spyOn(history, 'back');
    closed.next(undefined);
    await tick();
    expect(back).not.toHaveBeenCalled();
  });

  it('AC 13: closed another way, the entry is removed with one history.back(), and that popstate closes nothing', async () => {
    const { ref, closed } = fakeRef();
    const onBack = vi.fn();
    runInInjectionContext(injector, () => closeOnBack(ref, onBack));
    const back = vi.spyOn(history, 'back');
    const p = popped();
    closed.next(undefined);
    await tick();
    expect(back).toHaveBeenCalledTimes(1);
    await p;
    expect(onBack).not.toHaveBeenCalled();
  });

  it('OWN-113 (RJ 2026-11-28): a link in the dialog keeps its entry (no history.back()) and records how to reopen it', async () => {
    const { ref, closed } = fakeRef();
    const entryUrl = location.href;
    const h = runInInjectionContext(injector, () =>
      closeOnBack(ref, vi.fn(), { reopen: () => ({ kind: 'deck-card', id: 'main:storm caller' }) }),
    );
    expect(h.pushed()).toBe(true);
    const lengthOpen = history.length;
    const back = vi.spyOn(history, 'back');
    const router = TestBed.inject(Router);
    const done = router.navigateByUrl('/elsewhere');
    closed.next(undefined);
    await done;
    // TestBed's router uses a mock location: push the linked page in the window's history the way the browser would.
    history.pushState({ navigationId: 9 }, '', '/elsewhere');
    await tick();
    expect(back).not.toHaveBeenCalled();
    expect(history.length).toBe(lengthOpen + 1); // the linked page sits after the dialog's entry
    // Back from the linked page: the dialog's entry, with its record; a popstate navigation reads it.
    const p = popped();
    history.back();
    await p;
    expect(location.href).toBe(entryUrl);
    const nav = { trigger: 'popstate' };
    vi.spyOn(router, 'currentNavigation').mockReturnValue(nav as never);
    const r = takeDialogReopen(router, 'deck-card');
    expect(r).toMatchObject({ kind: 'deck-card', id: 'main:storm caller' });
    expect(takeDialogReopen(router, 'collection-card')).toBeNull(); // another dialog's kind
    // Reopened with adopt: no second entry; Back then closes it.
    const again = fakeRef();
    const onBack = vi.fn();
    const before = history.length;
    const h2 = runInInjectionContext(injector, () => closeOnBack(again.ref, onBack, { adopt: r!.token }));
    expect(history.length).toBe(before);
    expect(h2.pushed()).toBe(true);
    const p2 = popped();
    history.back();
    await p2;
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('OWN-113: no record is read after a reload or a link to the page (only Back / Forward reopens)', () => {
    history.replaceState({ riftDialog: 'dX', riftDialogReopen: { kind: 'deck-card', id: 'c', token: 'dX' } }, '');
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'currentNavigation').mockReturnValue({ trigger: 'imperative' } as never);
    expect(takeDialogReopen(router, 'deck-card')).toBeNull();
    vi.spyOn(router, 'currentNavigation').mockReturnValue({ trigger: 'popstate' } as never);
    expect(takeDialogReopen(router, 'deck-card')).toMatchObject({ id: 'c', token: 'dX' });
    history.replaceState({ riftDialogReopen: { kind: 'deck-card', id: 'c', token: 'dX' } }, ''); // marker gone: stale
    expect(takeDialogReopen(router, 'deck-card')).toBeNull();
    history.replaceState(null, '');
  });

  it('S7: a dialog opened while a cleanup Back is in flight pushes only after it, and Back then closes the new one', async () => {
    const first = fakeRef();
    runInInjectionContext(injector, () => closeOnBack(first.ref, vi.fn()));
    const cleanup = popped();
    first.closed.next(undefined);
    await tick(); // history.back() called, its popstate not handled yet
    const second = fakeRef();
    const onBack = vi.fn();
    const h = runInInjectionContext(injector, () => closeOnBack(second.ref, onBack));
    await cleanup;
    await tick();
    expect(h.pushed()).toBe(true);
    const p = popped();
    history.back();
    await p;
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
