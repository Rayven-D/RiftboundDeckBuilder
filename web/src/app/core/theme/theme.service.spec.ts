/**
 * SPEC-010 SYNC-157 / SYNC-158 theme per device (H-176): AC 77, AC 78, AC 79 at unit level, plus the inline
 * script in src/index.html that applies the saved theme before the first paint (SYNC-157 e).
 */
/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { KEY_PREFIX, MemoryBackend } from '../storage/kv-backend';
import { createBrowserStores } from '../storage/browser-stores';
import { STORAGE_KEYS, clearLocalData } from '../storage/local-stores';
import { THEME_BG, THEME_KEY, parseTheme } from '../../shared/theme/theme';
import { ThemeService } from './theme.service';
import { ThemeSwitch } from './theme-switch';

const html = () => document.documentElement;
const metas = () => Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'));

function addMetas(): void {
  for (const [content, media] of [
    ['#1b1f24', '(prefers-color-scheme: dark)'],
    ['#f4f6f8', '(prefers-color-scheme: light)'],
  ]) {
    const m = document.createElement('meta');
    m.name = 'theme-color';
    m.setAttribute('content', content);
    m.setAttribute('media', media);
    document.head.appendChild(m);
  }
}

describe('SYNC-157 theme per device', () => {
  beforeEach(() => {
    localStorage.clear();
    html().removeAttribute('data-theme');
    addMetas();
  });
  afterEach(() => {
    localStorage.clear();
    html().removeAttribute('data-theme');
    metas().forEach((m) => m.remove());
    vi.restoreAllMocks();
  });

  it('AC 77 / SYNC-157 (a) nothing saved, or an unknown value like "purple", means System', () => {
    expect(parseTheme(null)).toBe('system');
    expect(parseTheme('purple')).toBe('system');
    expect(parseTheme('dark')).toBe('dark');
    localStorage.setItem(THEME_KEY, 'purple');
    const theme = TestBed.inject(ThemeService);
    expect(theme.choice()).toBe('system');
    expect(html().hasAttribute('data-theme')).toBe(false);
  });

  it('AC 77 / SYNC-157 (b), (d) choosing Dark applies at once (data-theme, both theme-color metas) and saves device-theme; System removes the key', () => {
    const theme = TestBed.inject(ThemeService);
    expect(localStorage.getItem(THEME_KEY)).toBeNull(); // an empty browser has no key
    theme.set('dark');
    expect(html().getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('device-theme')).toBe('dark');
    expect(metas().map((m) => m.content)).toEqual([THEME_BG.dark, THEME_BG.dark]);
    theme.set('light');
    expect(html().getAttribute('data-theme')).toBe('light');
    expect(metas().map((m) => m.content)).toEqual([THEME_BG.light, THEME_BG.light]);
    theme.set('system');
    expect(html().hasAttribute('data-theme')).toBe(false);
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
    expect(metas().map((m) => m.content)).toEqual(['#1b1f24', '#f4f6f8']); // the media-matched defaults again
  });

  it('AC 77 / SYNC-157 (b) storage that refuses writes: the choice still applies for this page load and nothing throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    const theme = TestBed.inject(ThemeService);
    expect(() => theme.set('dark')).not.toThrow();
    expect(theme.choice()).toBe('dark');
    expect(html().getAttribute('data-theme')).toBe('dark');
  });

  it('SYNC-158 (c) SHOULD: a change made in another tab (storage event) applies here', () => {
    const theme = TestBed.inject(ThemeService);
    localStorage.setItem(THEME_KEY, 'light');
    window.dispatchEvent(new StorageEvent('storage', { key: THEME_KEY }));
    expect(theme.choice()).toBe('light');
    expect(html().getAttribute('data-theme')).toBe('light');
  });

  it('AC 78 / SYNC-157 (b) / SYNC-141 (d) the key is outside the rift. cache prefix and is never synced', () => {
    expect(THEME_KEY).toBe('device-theme');
    expect(THEME_KEY.startsWith(KEY_PREFIX)).toBe(false);
    expect(Object.values(STORAGE_KEYS).some((k) => THEME_KEY.startsWith(k))).toBe(false);
  });

  it('AC 78 / SYNC-142 / SYNC-091 the cache clear (sign-out, deletion, another account) removes every rift. key and keeps device-theme', async () => {
    const backend = new MemoryBackend();
    backend.set(THEME_KEY, 'dark');
    backend.set(STORAGE_KEYS.collection, '{}');
    backend.set(STORAGE_KEYS.syncLog, '{}');
    backend.set(`${STORAGE_KEYS.deckPrefix}x`, '{}');
    backend.set('rift.emailForSignIn', 'rj@example.com');
    clearLocalData(backend);
    expect(backend.keys()).toEqual([THEME_KEY]);
    // and through the engine's clearAll wiring (SYNC-048 step 1, SYNC-091, SYNC-096 step 4, SYNC-097)
    const stores = createBrowserStores(backend, { now: () => 0, changed: () => undefined, readOnly: () => false });
    backend.set(STORAGE_KEYS.tags, '{}');
    await stores.raw.clearAll();
    expect(backend.get(THEME_KEY)).toBe('dark');
    expect(backend.keys().filter((k) => k.startsWith(KEY_PREFIX))).toEqual([]);
  });
});

describe('SYNC-158 footer Theme switch (AC 79)', () => {
  beforeEach(() => {
    localStorage.clear();
    html().removeAttribute('data-theme');
  });
  afterEach(() => {
    localStorage.clear();
    html().removeAttribute('data-theme');
  });

  it('AC 79 radio semantics labelled Theme, System / Light / Dark, a check on the selected option; choosing Light applies it and the service shows it', async () => {
    const fixture = TestBed.createComponent(ThemeSwitch);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const group = el.querySelector('[role="radiogroup"]')!;
    expect(el.querySelector(`#${group.getAttribute('aria-labelledby')}`)?.textContent?.trim()).toBe('Theme');
    const radios = Array.from(group.querySelectorAll<HTMLButtonElement>('button[role="radio"]'));
    expect(radios.map((b) => b.textContent?.trim())).toEqual(['System', 'Light', 'Dark']);
    expect(radios.map((b) => b.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false']);
    radios[1].click();
    await fixture.whenStable();
    expect(TestBed.inject(ThemeService).choice()).toBe('light');
    expect(html().getAttribute('data-theme')).toBe('light');
    expect(radios.map((b) => b.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false']);
    // the selection indicator (check mark) is on, so the choice is not colour alone
    expect(el.querySelector('mat-button-toggle-group')?.classList.contains('mat-button-toggle-group-appearance-standard')).toBe(true);
    expect(el.querySelector('.mat-button-toggle-checked .mat-pseudo-checkbox')).not.toBeNull();
  });

  it('AC 79 / SYNC-158 (c) a change made elsewhere (the menu) shows in the switch at once', async () => {
    const fixture = TestBed.createComponent(ThemeSwitch);
    await fixture.whenStable();
    TestBed.inject(ThemeService).set('dark');
    await fixture.whenStable();
    const radios = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button[role="radio"]'));
    expect(radios.map((b) => b.getAttribute('aria-checked'))).toEqual(['false', 'false', 'true']);
  });
});

describe('SYNC-157 (e) no flash: the inline script in index.html', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/index.html'), 'utf8');
  const script = source.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? '';
  const run = () => new Function(script)();

  beforeEach(() => {
    localStorage.clear();
    html().removeAttribute('data-theme');
  });
  afterEach(() => {
    localStorage.clear();
    html().removeAttribute('data-theme');
  });

  it('AC 77 the script sits in <head> after the theme-color metas and before <body>, and reads device-theme', () => {
    const head = source.slice(0, source.indexOf('</head>'));
    expect(head).toContain('<script>');
    expect(head.indexOf('<script>')).toBeGreaterThan(head.lastIndexOf('<meta name="theme-color"'));
    expect(script).toContain(`'${THEME_KEY}'`);
  });

  it('AC 77 a saved dark (or light) is on <html> when the script has run; nothing or "purple" leaves System', () => {
    localStorage.setItem(THEME_KEY, 'dark');
    run();
    expect(html().getAttribute('data-theme')).toBe('dark');
    html().removeAttribute('data-theme');
    localStorage.setItem(THEME_KEY, 'purple');
    run();
    expect(html().hasAttribute('data-theme')).toBe(false);
    localStorage.removeItem(THEME_KEY);
    run();
    expect(html().hasAttribute('data-theme')).toBe(false);
  });

  it('AC 77 storage that throws on read does not break the page', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('SecurityError');
    });
    expect(run).not.toThrow();
    vi.restoreAllMocks();
  });
});

describe('SYNC-157 (d) stylesheet: an explicit choice overrides the device setting (Brief H-175 T2)', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/styles.scss'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const norm = (s: string) => s.replace(/\s+/g, ' ');

  it('AC 77 light tokens apply on a light device unless Dark was chosen, and for an explicit Light on any device', () => {
    expect(norm(css)).toContain("@media (prefers-color-scheme: light) { :root:not([data-theme='dark']) { @include light-tokens; } }");
    expect(norm(css)).toContain(":root[data-theme='light'] { @include light-tokens; }");
  });

  it('AC 77 an explicit choice sets the native color-scheme, so Material light-dark() tokens and form controls follow', () => {
    expect(norm(css)).toContain("html[data-theme='light'] { color-scheme: light; }");
    expect(norm(css)).toContain("html[data-theme='dark'] { color-scheme: dark; }");
  });
});
