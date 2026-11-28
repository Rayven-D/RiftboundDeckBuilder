import { afterEach, describe, expect, it, vi } from 'vitest';
import { trackRouteTransition } from './route-transition';
import { startScopedTransition } from './scoped-transition';

/** H-717 (Brief H-716 helper, §5, §6.3, check 18 / check 20): when a scoped view transition may animate. */
interface FakeTransition {
  finish(): void;
}

function fakeDoc(opts: { api?: boolean; reduce?: boolean; overlay?: string } = {}) {
  const root = document.createElement('html');
  const body = document.createElement('body');
  root.appendChild(body);
  if (opts.overlay) body.innerHTML = opts.overlay;
  const started: FakeTransition[] = [];
  const doc = {
    documentElement: root,
    defaultView: { matchMedia: () => ({ matches: !!opts.reduce }) },
    querySelector: (s: string) => root.querySelector(s),
    startViewTransition: undefined as unknown,
  };
  if (opts.api !== false) {
    doc.startViewTransition = vi.fn((update: () => void) => {
      let finish!: () => void;
      const finished = new Promise<void>((r) => (finish = r));
      const updateCallbackDone = Promise.resolve().then(update);
      started.push({ finish });
      return { finished, ready: Promise.resolve(), updateCallbackDone, skipTransition: vi.fn() };
    });
  }
  return { doc: doc as unknown as Document, root, started };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('H-716 startScopedTransition', () => {
  afterEach(async () => {
    await flush();
  });

  it('runs the update inside a view transition with its class on <html> for the transition only', async () => {
    const { doc, root, started } = fakeDoc();
    const update = vi.fn(() => expect(root.classList).toContain('vt-view-swap'));
    const done = startScopedTransition(update, 'vt-view-swap', doc);
    expect(root.classList).toContain('vt-view-swap');
    await done;
    expect(update).toHaveBeenCalledTimes(1);
    started[0].finish();
    await flush();
    expect(root.classList).not.toContain('vt-view-swap');
  });

  it('check 18: under reduced motion the update runs at once and no view transition starts', () => {
    const { doc, root } = fakeDoc({ reduce: true });
    const update = vi.fn();
    void startScopedTransition(update, 'vt-theme', doc);
    expect(update).toHaveBeenCalledTimes(1);
    expect(doc.startViewTransition).not.toHaveBeenCalled();
    expect(root.classList).not.toContain('vt-theme');
  });

  it('without the API the update runs at once', () => {
    const { doc } = fakeDoc({ api: false });
    const update = vi.fn();
    void startScopedTransition(update, 'vt-list', doc);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('check 20: never two at once: a second change while one runs is applied without its own animation', async () => {
    const { doc, started } = fakeDoc();
    void startScopedTransition(vi.fn(), 'vt-view-swap', doc);
    const second = vi.fn();
    void startScopedTransition(second, 'vt-view-swap', doc);
    expect(second).toHaveBeenCalledTimes(1);
    expect(doc.startViewTransition).toHaveBeenCalledTimes(1);
    started[0].finish();
    await flush();
  });

  it('check 20: not during a route view transition', async () => {
    const { doc, started } = fakeDoc();
    let finish!: () => void;
    trackRouteTransition(new Promise<void>((r) => (finish = r)));
    const update = vi.fn();
    void startScopedTransition(update, 'vt-list', doc);
    expect(update).toHaveBeenCalledTimes(1);
    expect(doc.startViewTransition).not.toHaveBeenCalled();
    finish();
    await flush();
    void startScopedTransition(vi.fn(), 'vt-list', doc);
    expect(doc.startViewTransition).toHaveBeenCalledTimes(1);
    started[0].finish();
    await flush();
  });

  it('H-699: not while a dialog or menu overlay is open; tooltips and notices do not block', () => {
    const blocked = fakeDoc({ overlay: '<div class="cdk-overlay-pane"><mat-dialog-container></mat-dialog-container></div>' });
    void startScopedTransition(vi.fn(), 'vt-theme', blocked.doc);
    expect(blocked.doc.startViewTransition).not.toHaveBeenCalled();
    const tip = fakeDoc({
      overlay:
        '<div class="cdk-overlay-pane mat-mdc-tooltip-panel"></div><div class="cdk-overlay-pane"><div class="mat-mdc-snack-bar-container"></div></div>',
    });
    void startScopedTransition(vi.fn(), 'vt-theme', tip.doc);
    expect(tip.doc.startViewTransition).toHaveBeenCalledTimes(1);
    tip.started[0].finish();
  });
});
