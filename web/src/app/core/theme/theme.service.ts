import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { THEME_BG, THEME_KEY, ThemeChoice, parseTheme } from '../../shared/theme/theme';

/**
 * SPEC-010 SYNC-157 / SYNC-158: the theme of this device. One signal, bound by both controls (the footer switch
 * and the account menu's Theme group), so changing one shows in the other at once.
 *
 * Stored in browser storage under `device-theme` (never `rift.*`, never synced, never cleared by sign-out). The
 * inline script in index.html applies the saved value before the first paint; this service keeps the document in
 * step afterwards. System needs no listener: the stylesheet follows `prefers-color-scheme` live.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);
  private readonly storage: Storage | null = safeStorage(this.doc);
  private readonly current = signal<ThemeChoice>(parseTheme(this.read()));
  /** The original `theme-color` values, restored when the choice goes back to System. */
  private readonly metaDefaults = new Map<Element, string>();

  readonly choice = this.current.asReadonly();

  constructor() {
    for (const m of Array.from(this.doc.querySelectorAll('meta[name="theme-color"]'))) {
      const media = m.getAttribute('media') ?? '';
      this.metaDefaults.set(m, media.includes('light') ? THEME_BG.light : THEME_BG.dark);
    }
    this.apply(this.current());
    // SYNC-158 (c) SHOULD: a change made in another tab applies here too.
    const win = this.doc.defaultView;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_KEY && e.key !== null) return;
      const next = parseTheme(this.read());
      this.current.set(next);
      this.apply(next);
    };
    win?.addEventListener('storage', onStorage);
    inject(DestroyRef).onDestroy(() => win?.removeEventListener('storage', onStorage));
  }

  /**
   * SYNC-157 / SYNC-158 (d): applies at once, with no Save, no notice and no network request. System removes the
   * key. A refused write (private mode, full storage) still applies the theme for this page load, silently.
   */
  set(choice: ThemeChoice): void {
    this.current.set(choice);
    this.apply(choice);
    try {
      if (choice === 'system') this.storage?.removeItem(THEME_KEY);
      else this.storage?.setItem(THEME_KEY, choice);
    } catch {
      // SYNC-157 (b): no error is shown.
    }
  }

  private read(): string | null {
    try {
      return this.storage?.getItem(THEME_KEY) ?? null;
    } catch {
      return null;
    }
  }

  /** `data-theme` on <html> (no attribute = System) and the browser's theme colour (SYNC-157 d). */
  private apply(choice: ThemeChoice): void {
    const html = this.doc.documentElement;
    if (choice === 'system') html.removeAttribute('data-theme');
    else html.setAttribute('data-theme', choice);
    for (const [meta, fallback] of this.metaDefaults) {
      meta.setAttribute('content', choice === 'system' ? fallback : THEME_BG[choice]);
    }
  }
}

function safeStorage(doc: Document): Storage | null {
  try {
    return doc.defaultView?.localStorage ?? null;
  } catch {
    return null;
  }
}
