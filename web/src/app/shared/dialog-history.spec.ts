import { Component, Injector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { Router, provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeOnBack, resetDialogHistory } from './dialog-history';

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
  beforeEach(() => {
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

  it('AC 14: a router navigation while open leaves the entry for the navigation to replace (no history.back())', async () => {
    const { ref, closed } = fakeRef();
    runInInjectionContext(injector, () => closeOnBack(ref, vi.fn()));
    const back = vi.spyOn(history, 'back');
    void TestBed.inject(Router).navigateByUrl('/elsewhere', { replaceUrl: true });
    closed.next(undefined);
    await tick();
    await tick();
    expect(back).not.toHaveBeenCalled();
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
