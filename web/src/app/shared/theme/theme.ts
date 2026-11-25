/**
 * SPEC-010 SYNC-157 theme per device (v0.17.0). Pure: the key, the values, how a stored value is read and the
 * effective theme / toggle rules.
 *
 * The key is deliberately OUTSIDE the `rift.` prefix of the account cache (SYNC-141 d, SYNC-142): no cache clear
 * (sign-out, account deletion, a deleted-account sign-out, another account's first sign-in) may remove it. The same
 * key and values are read by the inline script in `src/index.html` before the first paint (SYNC-157 e): it applies
 * only `light` / `dark`; anything else leaves the attribute off, so the stylesheet follows the OS.
 */
export const THEME_KEY = 'device-theme';

/** SYNC-157 (a): the only stored values. There is no System choice (RJ 2026-11-25). */
export type ThemeChoice = 'light' | 'dark';

/** SYNC-157 (a, b): `light` or `dark`; anything else (nothing stored, a leftover `system`, junk) is `null`. */
export function parseTheme(stored: string | null | undefined): ThemeChoice | null {
  return stored === 'light' || stored === 'dark' ? stored : null;
}

/** SYNC-157 (a): the stored value wins; with nothing stored, the OS `prefers-color-scheme` (light if it says light). */
export function effectiveTheme(stored: ThemeChoice | null, osPrefersLight: boolean): ThemeChoice {
  return stored ?? (osPrefersLight ? 'light' : 'dark');
}

/** SYNC-157 (d): toggling stores the opposite of the effective theme. */
export function toggledTheme(effective: ThemeChoice): ThemeChoice {
  return effective === 'dark' ? 'light' : 'dark';
}

/** Page background per explicit choice, for the `theme-color` meta tags (Brief H-175 T2). */
export const THEME_BG: Readonly<Record<ThemeChoice, string>> = { light: '#f4f6f8', dark: '#1b1f24' };
