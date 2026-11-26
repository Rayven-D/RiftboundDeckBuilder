/**
 * SPEC-010 SYNC-157 / SYNC-158 theme per device (H-176; v0.17.0 light/dark toggle, H-246): AC 77, AC 78, AC 79 at
 * unit level, plus the inline script in src/index.html that applies the stored theme before the first paint
 * (SYNC-157 e).
 */
/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { MatTooltip } from '@angular/material/tooltip';
import { By } from '@angular/platform-browser';
import { KEY_PREFIX, MemoryBackend } from '../storage/kv-backend';
import { createBrowserStores } from '../storage/browser-stores';
import { STORAGE_KEYS, clearLocalData } from '../storage/local-stores';
import { THEME_BG, THEME_KEY, effectiveTheme, parseTheme, toggledTheme } from '../../shared/theme/theme';
import { ThemeService } from './theme.service';
import { ThemeToggle } from './theme-toggle';

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

/** A fake `matchMedia('(prefers-color-scheme: light)')` whose OS setting the test can flip live. */
function fakeOs(light: boolean) {
  const listeners: ((e: MediaQueryListEvent) => void)[] = [];
  const os = {
    light,
    set(next: boolean) {
      os.light = next;
      listeners.forEach((l) => l({ matches: next } as MediaQueryListEvent));
    },
  };
  vi.stubGlobal('matchMedia', (q: string) => ({
    media: q,
    get matches() {
      return q.includes('light') ? os.light : !os.light;
    },
    addEventListener: (_: string, l: (e: MediaQueryListEvent) => void) => listeners.push(l),
    removeEventListener: () => undefined,
  }));
  return os;
}

describe('SYNC-157 theme rules (pure)', () => {
  it('AC 77 / SYNC-157 (a) parseTheme: only light and dark are values; nothing, "system" or junk is null', () => {
    expect(parseTheme('light')).toBe('light');
    expect(parseTheme('dark')).toBe('dark');
    for (const v of [null, undefined, '', 'system', 'purple', 'blue', 'Dark']) expect(parseTheme(v)).toBeNull();
  });

  it('AC 77 / SYNC-157 (a) effectiveTheme: the stored value wins; nothing stored follows the OS (light if it says light, else dark)', () => {
    expect(effectiveTheme('light', false)).toBe('light');
    expect(effectiveTheme('dark', true)).toBe('dark');
    expect(effectiveTheme(null, true)).toBe('light');
    expect(effectiveTheme(null, false)).toBe('dark');
  });

  it('AC 77 / SYNC-157 (d) toggledTheme: the opposite of the effective theme', () => {
    expect(toggledTheme('dark')).toBe('light');
    expect(toggledTheme('light')).toBe('dark');
  });
});

describe('SYNC-157 theme per device (ThemeService)', () => {
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
    vi.unstubAllGlobals();
  });

  it('AC 77 / SYNC-157 (a, d) an empty browser on a dark OS: dark, no key; the OS turning light while nothing is stored turns it light live', () => {
    const os = fakeOs(false);
    const theme = TestBed.inject(ThemeService);
    expect(theme.effective()).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
    expect(html().hasAttribute('data-theme')).toBe(false); // the stylesheet follows the OS
    os.set(true);
    expect(theme.effective()).toBe('light');
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
  });

  it('AC 77 / SYNC-157 (d) toggle on a dark page: light at once (data-theme, both theme-color metas), device-theme = light; again: dark', () => {
    fakeOs(false);
    const theme = TestBed.inject(ThemeService);
    theme.toggle();
    expect(theme.effective()).toBe('light');
    expect(html().getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('device-theme')).toBe('light');
    expect(metas().map((m) => m.content)).toEqual([THEME_BG.light, THEME_BG.light]);
    theme.toggle();
    expect(theme.effective()).toBe('dark');
    expect(html().getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('device-theme')).toBe('dark');
    expect(metas().map((m) => m.content)).toEqual([THEME_BG.dark, THEME_BG.dark]);
  });

  it('AC 77 / SYNC-157 (d) toggle on a light OS with nothing stored stores dark (the opposite of the effective theme)', () => {
    fakeOs(true);
    const theme = TestBed.inject(ThemeService);
    expect(theme.effective()).toBe('light');
    theme.toggle();
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
    expect(theme.effective()).toBe('dark');
  });

  it('AC 77 / SYNC-157 (d) a stored choice wins: OS changes are ignored once stored', () => {
    const os = fakeOs(true);
    localStorage.setItem(THEME_KEY, 'light');
    const theme = TestBed.inject(ThemeService);
    os.set(false);
    expect(theme.effective()).toBe('light');
    expect(html().getAttribute('data-theme')).toBe('light');
  });

  it.each(['system', 'purple', 'blue'])('AC 77 / SYNC-157 (b) a stored "%s" counts as nothing stored: follows the OS and the key is removed', (v) => {
    fakeOs(true);
    localStorage.setItem(THEME_KEY, v);
    const theme = TestBed.inject(ThemeService);
    expect(theme.effective()).toBe('light');
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
    expect(html().hasAttribute('data-theme')).toBe(false);
    expect(metas().map((m) => m.content)).toEqual(['#1b1f24', '#f4f6f8']); // the media-matched defaults
  });

  it('AC 77 / SYNC-157 (b) storage that refuses writes: the toggle still applies for this page load and nothing throws', () => {
    fakeOs(false);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    const theme = TestBed.inject(ThemeService);
    expect(() => theme.toggle()).not.toThrow();
    expect(theme.effective()).toBe('light');
    expect(html().getAttribute('data-theme')).toBe('light');
  });

  it('SYNC-158 (e) SHOULD: a change made in another tab (storage event) applies here', () => {
    fakeOs(false);
    const theme = TestBed.inject(ThemeService);
    localStorage.setItem(THEME_KEY, 'light');
    window.dispatchEvent(new StorageEvent('storage', { key: THEME_KEY }));
    expect(theme.effective()).toBe('light');
    expect(html().getAttribute('data-theme')).toBe('light');
  });

  it('AC 77 / SYNC-157 (a) no "System" choice exists anywhere in the app code', () => {
    const files = ['shared/theme/theme.ts', 'core/theme/theme.service.ts', 'core/theme/theme-toggle.ts', 'core/sync/account-menu.ts', 'app.html'];
    for (const f of files) {
      const src = readFileSync(resolve(process.cwd(), 'src/app', f), 'utf8');
      expect(src, f).not.toMatch(/label: 'System'|>\s*System\s*</);
    }
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

describe('SYNC-158 header theme toggle (AC 79, H-246)', () => {
  beforeEach(() => {
    localStorage.clear();
    html().removeAttribute('data-theme');
  });
  afterEach(() => {
    localStorage.clear();
    html().removeAttribute('data-theme');
    vi.unstubAllGlobals();
  });

  const button = (el: HTMLElement) => el.querySelector<HTMLButtonElement>('button')!;
  const icon = (el: HTMLElement) => el.querySelector('app-icon path')!.getAttribute('d');

  it('AC 79 / SYNC-158 (b) a native button named "Dark theme", aria-pressed true on a dark page, the moon icon, tooltip "Switch to light theme"', async () => {
    fakeOs(false);
    const fixture = TestBed.createComponent(ThemeToggle);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const b = button(el);
    expect(b.getAttribute('type')).toBe('button');
    expect(b.getAttribute('aria-label')).toBe('Dark theme');
    expect(b.getAttribute('aria-pressed')).toBe('true');
    expect(b.hasAttribute('title')).toBe(false);
    expect(el.querySelector('app-icon')!.getAttribute('aria-hidden')).toBe('true');
    const moon = icon(el);
    const tooltip = fixture.debugElement.query(By.directive(MatTooltip)).injector.get(MatTooltip);
    expect(tooltip.message).toBe('Switch to light theme');
    expect(tooltip.position).toBe('below');
    expect(tooltip.showDelay).toBe(300);

    b.click(); // Enter and Space on a native button fire click
    await fixture.whenStable();
    expect(b.getAttribute('aria-label')).toBe('Dark theme'); // the name never changes
    expect(b.getAttribute('aria-pressed')).toBe('false');
    expect(icon(el)).not.toBe(moon); // the sun
    expect(tooltip.message).toBe('Switch to dark theme');
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
    expect(html().getAttribute('data-theme')).toBe('light');
  });

  it('AC 79 / SYNC-158 (b) focus stays on the button after toggling (the button is not re-created)', async () => {
    fakeOs(false);
    const fixture = TestBed.createComponent(ThemeToggle);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
    const b = button(fixture.nativeElement);
    b.focus();
    b.click();
    await fixture.whenStable();
    expect(document.activeElement).toBe(b);
    expect(button(fixture.nativeElement)).toBe(b);
    (fixture.nativeElement as HTMLElement).remove();
  });

  it('H-468 (1): toggling re-creates the icon (swap animation) without the dev warning NG0956', async () => {
    fakeOs(false);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fixture = TestBed.createComponent(ThemeToggle);
    await fixture.whenStable();
    const iconEl = () => (fixture.nativeElement as HTMLElement).querySelector('app-icon');
    const before = iconEl();
    button(fixture.nativeElement).click();
    await fixture.whenStable();
    button(fixture.nativeElement).click();
    await fixture.whenStable();
    expect(iconEl()).not.toBe(before); // re-created, so the swap animation plays
    expect(warn.mock.calls.flat().join(' ')).not.toContain('NG0956');
    warn.mockRestore();
  });

  it('AC 77 / SYNC-157 (d) with nothing stored the toggle follows the OS live', async () => {
    const os = fakeOs(false);
    const fixture = TestBed.createComponent(ThemeToggle);
    await fixture.whenStable();
    expect(button(fixture.nativeElement).getAttribute('aria-pressed')).toBe('true');
    os.set(true);
    await fixture.whenStable();
    expect(button(fixture.nativeElement).getAttribute('aria-pressed')).toBe('false');
  });

  it('AC 79 / SYNC-158 (b) the icon animates only after a toggle (not on load), and never under reduced motion', async () => {
    fakeOs(false);
    const fixture = TestBed.createComponent(ThemeToggle);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-icon')!.classList.contains('swap')).toBe(false);
    button(el).click();
    await fixture.whenStable();
    expect(el.querySelector('app-icon')!.classList.contains('swap')).toBe(true);
    const src = readFileSync(resolve(process.cwd(), 'src/app/core/theme/theme-toggle.ts'), 'utf8').replace(/\s+/g, ' ');
    expect(src).toContain('@media (prefers-reduced-motion: reduce) { .swap { animation: none; } }');
    expect(src).toContain('animation: theme-icon-in var(--dur-fast) var(--ease-out)');
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

  it('AC 77 a stored dark (or light) is on <html> when the script has run; nothing leaves the attribute off', () => {
    localStorage.setItem(THEME_KEY, 'dark');
    run();
    expect(html().getAttribute('data-theme')).toBe('dark');
    html().removeAttribute('data-theme');
    localStorage.setItem(THEME_KEY, 'light');
    run();
    expect(html().getAttribute('data-theme')).toBe('light');
    html().removeAttribute('data-theme');
    localStorage.removeItem(THEME_KEY);
    run();
    expect(html().hasAttribute('data-theme')).toBe(false);
  });

  it.each(['system', 'purple'])('AC 77 / SYNC-157 (b) a stored "%s" counts as nothing stored: no attribute, and the value is removed', (v) => {
    localStorage.setItem(THEME_KEY, v);
    run();
    expect(html().hasAttribute('data-theme')).toBe(false);
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
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

describe('H-189 stylesheet: shared button variant and error colour', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/styles.scss'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const norm = (s: string) => s.replace(/\s+/g, ' ');

  it('SYNC-153 / H-189 N2 a field in error uses --color-danger for outline, label, caret and error text (one red)', () => {
    const block = norm(css).split('@include mat.form-field-overrides( (')[1]?.split(') );')[0] ?? '';
    for (const token of [
      'error-text-color',
      'outlined-error-outline-color',
      'outlined-error-hover-outline-color',
      'outlined-error-focus-outline-color',
      'outlined-error-label-text-color',
      'outlined-error-hover-label-text-color',
      'outlined-error-focus-label-text-color',
      'outlined-error-caret-color',
    ]) {
      expect(block).toContain(`${token}: var(--color-danger)`);
    }
  });

  it('OWN-008 / H-189 .button--outlined is one global variant (no fill, strong border), not a page copy', () => {
    expect(norm(css)).toContain('.button--outlined { gap: var(--space-2); border: 1px solid var(--color-border-strong); background: transparent;');
    const collection = readFileSync(resolve(process.cwd(), 'src/app/pages/collection/collection-page.scss'), 'utf8');
    expect(collection).not.toContain('.button--outlined');
  });
});
