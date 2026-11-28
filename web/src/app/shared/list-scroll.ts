import { inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs';

/** Where a list was: the window's `scrollY`, and the first item showing at the top of the viewport (if any). */
export interface ListScrollPosition {
  readonly y: number;
  /** The item's key and its distance from the viewport top, in px (negative when it is partly scrolled off). */
  readonly anchor: { readonly key: string; readonly top: number } | null;
}

/** How a page names its list items, so the restore can line up the same item rather than only the same `scrollY`. */
export interface ListItems {
  /** Matches every item element of the list (e.g. `a.deck-tile`). */
  readonly selector: string;
  /** A stable key for an item element (e.g. its `href`). */
  key(el: Element): string | null;
}

/** Scroll positions by list path, for this tab session (module state, so it outlives the page component). */
const saved = new Map<string, ListScrollPosition>();

/** Test hook: forget every saved position. */
export function resetListScroll(): void {
  saved.clear();
}

/** Frames `restoreListScroll` keeps working while the list is still laying out. */
const RESTORE_FRAMES = 30;
/** Frames in a row the position must hold before the restore counts as done. */
const STABLE_FRAMES = 3;

/** The position of the list in `doc` now. */
export function readListScroll(doc: Document, items?: ListItems): ListScrollPosition {
  // A dialog open over the page (a link followed from it) blocks scrolling: the CDK pins <html> with `top: -y` and
  // scrollY reads 0. The real position is in that offset.
  const html = doc.documentElement;
  const blocked = html.classList.contains('cdk-global-scrollblock');
  const y = blocked ? -(parseFloat(html.style.top) || 0) : (doc.defaultView?.scrollY ?? 0);
  let anchor: ListScrollPosition['anchor'] = null;
  // While blocked the sticky bars no longer stick, so item rects are not what the user sees: y alone is exact there.
  if (items && !blocked) {
    for (const el of Array.from(doc.querySelectorAll(items.selector))) {
      const r = el.getBoundingClientRect();
      if (r.bottom <= 0 || r.height === 0) continue;
      const key = items.key(el);
      if (key) anchor = { key, top: r.top };
      break;
    }
  }
  return { y, anchor };
}

/**
 * SPEC-007 COLL-093 (e) / SPEC-005 OWN-084: keeps a list page's scroll position for a browser Back to it. Call in
 * the page's constructor (injection context). Returns the position to restore when this page was reached by Back
 * (`popstate`) and one was saved for `path`, else null.
 *
 * H-699 root cause: the position used to be read in the page's `onDestroy`. Angular removes a view's DOM before it
 * runs the view's destroy callbacks, so by then the list was gone, the document was only as tall as the next page's
 * loading state, and the browser had already clamped `scrollY` to 0. The saved value was 0 and Back "restored" the
 * top. `NavigationStart` fires before the router touches the DOM, so the position is read there. `canSave` says
 * whether the list is shown (a loading or empty page saves nothing and clears an older position).
 *
 * The trigger is read from the navigation in flight or, when the page is created after it ended (Collection sits
 * behind its sign-in gate, which renders the page a moment later), from the last one that succeeded. A saved
 * position is used once.
 */
export function keepListScroll(path: string, canSave: () => boolean, items?: ListItems): ListScrollPosition | null {
  const router = inject(Router);
  const restore = takeListScroll(router, path);
  saveListScrollOnLeave(router, () => path, canSave, items);
  return restore;
}

/**
 * The saved position for `path` if the current (or last) navigation was a Back / Forward, else null; used once.
 * For a page that stays alive across its own navigations (Deck detail reuses its component from deck to deck): call
 * it after each first load, with `saveListScrollOnLeave` in the constructor.
 */
export function takeListScroll(router: Router, path: string): ListScrollPosition | null {
  const nav = router.currentNavigation() ?? router.lastSuccessfulNavigation();
  const restore = nav?.trigger === 'popstate' ? (saved.get(path) ?? null) : null;
  saved.delete(path);
  return restore;
}

/** Saves the position for `path()` (read when the page is left) on every `NavigationStart`. Injection context. */
export function saveListScrollOnLeave(router: Router, path: () => string, canSave: () => boolean, items?: ListItems): void {
  router.events
    .pipe(
      filter((e): e is NavigationStart => e instanceof NavigationStart),
      takeUntilDestroyed(),
    )
    .subscribe(() => {
      const doc = globalThis.document;
      const key = path();
      if (doc && canSave()) saved.set(key, readListScroll(doc, items));
      else saved.delete(key);
    });
}

/**
 * Puts the list back where `pos` says: scrolls the window to `pos.y`, then, while the list is still laying out (tiles
 * or virtual rows not measured yet, `content-visibility` placeholders replaced by real sizes), keeps lining the
 * anchor item up with its saved distance from the viewport top, for at most `RESTORE_FRAMES` frames. Without an
 * anchor it only keeps trying to reach `pos.y` (a document still too short). Any user scroll input (wheel, touch,
 * key) stops it, so it never fights the user. Resolves when it is done (a dialog reopened from history waits for it).
 */
export function restoreListScroll(
  pos: ListScrollPosition,
  items?: ListItems,
  doc: Document | null = globalThis.document ?? null,
): Promise<void> {
  const win = doc?.defaultView;
  if (!doc || !win) return Promise.resolve();
  let done: () => void = () => undefined;
  const finished = new Promise<void>((r) => (done = r));
  let frames = 0;
  let stable = 0;
  let stopped = false;
  const inputs = ['wheel', 'touchstart', 'keydown'] as const;
  const stop = () => {
    stopped = true;
    for (const type of inputs) win.removeEventListener(type, stop);
    done();
  };
  for (const type of inputs) win.addEventListener(type, stop, { passive: true });
  const anchorEl = (): Element | null => {
    if (!items || !pos.anchor) return null;
    const key = pos.anchor.key;
    return Array.from(doc.querySelectorAll(items.selector)).find((el) => items.key(el) === key) ?? null;
  };
  win.scrollTo({ top: pos.y, behavior: 'instant' });
  const attempt = () => {
    if (stopped) return;
    const el = anchorEl();
    let delta: number;
    if (el && pos.anchor) delta = el.getBoundingClientRect().top - pos.anchor.top;
    else delta = pos.y - win.scrollY;
    if (Math.abs(delta) > 1) {
      stable = 0;
      win.scrollBy({ top: delta, behavior: 'instant' });
    } else stable++;
    if (stable >= STABLE_FRAMES || ++frames >= RESTORE_FRAMES) return stop();
    win.requestAnimationFrame(attempt);
  };
  attempt();
  return finished;
}
