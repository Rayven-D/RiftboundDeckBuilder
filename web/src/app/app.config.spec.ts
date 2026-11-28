import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, ViewTransitionInfo } from '@angular/router';
import { routeViewTransition } from './app.config';

/** A snapshot chain root → children with the given path segments. */
function snapshot(...paths: string[]): ActivatedRouteSnapshot {
  let child: ActivatedRouteSnapshot | null = null;
  for (const path of [...paths].reverse()) {
    child = { url: [{ path }], firstChild: child } as unknown as ActivatedRouteSnapshot;
  }
  return { url: [], firstChild: child } as unknown as ActivatedRouteSnapshot;
}

function info(from: string, to: string) {
  let finish!: () => void;
  const finished = new Promise<void>((r) => (finish = r));
  const transition = {
    skipTransition: vi.fn(),
    ready: Promise.resolve(),
    finished,
    updateCallbackDone: Promise.resolve(),
  };
  const value = {
    transition,
    from: snapshot(from),
    to: snapshot(to),
  } as unknown as ViewTransitionInfo;
  return { value, transition, finish };
}

describe('route view transitions (H-095 fix 1)', () => {
  afterEach(() => document.documentElement.classList.remove('vt-instant'));

  it('never skips a transition, so Angular logs no AbortError', () => {
    for (const [from, to] of [
      ['collection', 'collection'],
      ['collection', 'decks'],
    ]) {
      const t = info(from, to);
      routeViewTransition(t.value);
      expect(t.transition.skipTransition).not.toHaveBeenCalled();
    }
  });

  it('a same-route (query only) navigation is instant until the transition finishes', async () => {
    const t = info('collection', 'collection');
    routeViewTransition(t.value);
    expect(document.documentElement.classList).toContain('vt-instant');
    t.finish();
    await t.transition.finished;
    await Promise.resolve();
    expect(document.documentElement.classList).not.toContain('vt-instant');
  });

  it('a change between tabs keeps the normal cross-fade', () => {
    routeViewTransition(info('collection', 'decks').value);
    expect(document.documentElement.classList).not.toContain('vt-instant');
  });

  it('H-716 S2 / check 3: Back to an entry whose card dialog opens again is instant (the page is under the dialog)', () => {
    const nav = { trigger: 'popstate' as string };
    const router = { currentNavigation: () => nav, lastSuccessfulNavigation: () => null };
    TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: router }] });
    history.replaceState({ riftDialog: 'd9', riftDialogReopen: { kind: 'deck-card', id: 'x', token: 'd9' } }, '');
    try {
      TestBed.runInInjectionContext(() => routeViewTransition(info('collection', 'decks').value));
      expect(document.documentElement.classList).toContain('vt-instant');
      document.documentElement.classList.remove('vt-instant');
      // A link (not Back / Forward) from that entry keeps the normal cross-fade.
      nav.trigger = 'imperative';
      TestBed.runInInjectionContext(() => routeViewTransition(info('collection', 'decks').value));
      expect(document.documentElement.classList).not.toContain('vt-instant');
    } finally {
      history.replaceState(null, '');
    }
  });
});
