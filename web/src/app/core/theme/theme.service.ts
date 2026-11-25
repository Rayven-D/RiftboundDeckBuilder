import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { THEME_BG, THEME_KEY, ThemeChoice, effectiveTheme, parseTheme, toggledTheme } from '../../shared/theme/theme';

const OS_LIGHT = '(prefers-color-scheme: light)';

/**
 * SPEC-010 SYNC-157 / SYNC-158 (v0.17.0): the theme of this device, bound by the one header toggle.
 *
 * Stored in browser storage under `device-theme` (never `rift.*`, never synced, never cleared by sign-out), as
 * `light` or `dark` only. With nothing stored the OS `prefers-color-scheme` decides and is followed live (the
 * stylesheet does that on its own; the `matchMedia` listener keeps `effective` and so the toggle in step). Any
 * other stored value (a leftover `system`, junk) counts as nothing stored and is removed when read. The inline
 * script in index.html applies a stored value before the first paint; this service keeps the document in step.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);
  private readonly storage: Storage | null = safeStorage(this.doc);
  private readonly media: MediaQueryList | null = this.doc.defaultView?.matchMedia?.(OS_LIGHT) ?? null;
  private readonly stored = signal<ThemeChoice | null>(this.read());
  private readonly osLight = signal(this.media?.matches ?? false);
  /** The original `theme-color` values, restored while nothing is stored (the OS decides). */
  private readonly metaDefaults = new Map<Element, string>();

  /** SYNC-157 (a): what the page shows now: the stored value, else the OS setting. */
  readonly effective = computed(() => effectiveTheme(this.stored(), this.osLight()));

  constructor() {
    for (const m of Array.from(this.doc.querySelectorAll('meta[name="theme-color"]'))) {
      const media = m.getAttribute('media') ?? '';
      this.metaDefaults.set(m, media.includes('light') ? THEME_BG.light : THEME_BG.dark);
    }
    this.apply(this.stored());
    const win = this.doc.defaultView;
    // SYNC-158 (e) SHOULD: a change made in another tab applies here too.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_KEY && e.key !== null) return;
      const next = this.read();
      this.stored.set(next);
      this.apply(next);
    };
    // SYNC-157 (d): with nothing stored the toggle's state follows the OS live.
    const onOs = (e: MediaQueryListEvent) => this.osLight.set(e.matches);
    win?.addEventListener('storage', onStorage);
    this.media?.addEventListener?.('change', onOs);
    inject(DestroyRef).onDestroy(() => {
      win?.removeEventListener('storage', onStorage);
      this.media?.removeEventListener?.('change', onOs);
    });
  }

  /**
   * SYNC-157 (d) / SYNC-158 (c, f): stores the opposite of the effective theme and applies it at once, with no
   * Save, no notice and no network request. A refused write (private mode, full storage) still applies the theme
   * for this page load, silently (SYNC-157 b).
   */
  toggle(): void {
    const next = toggledTheme(this.effective());
    this.stored.set(next);
    this.apply(next);
    try {
      this.storage?.setItem(THEME_KEY, next);
    } catch {
      // SYNC-157 (b): no error is shown.
    }
  }

  /** SYNC-157 (b): the stored value; an unknown one is removed so storage stays clean (no notice). */
  private read(): ThemeChoice | null {
    try {
      const raw = this.storage?.getItem(THEME_KEY) ?? null;
      const value = parseTheme(raw);
      if (raw !== null && value === null) this.storage?.removeItem(THEME_KEY);
      return value;
    } catch {
      return null;
    }
  }

  /** `data-theme` on <html> (no attribute = follow the OS) and the browser's theme colour (SYNC-157 d). */
  private apply(stored: ThemeChoice | null): void {
    const html = this.doc.documentElement;
    if (stored === null) html.removeAttribute('data-theme');
    else html.setAttribute('data-theme', stored);
    for (const [meta, fallback] of this.metaDefaults) {
      meta.setAttribute('content', stored === null ? fallback : THEME_BG[stored]);
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
