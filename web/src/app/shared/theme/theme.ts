/**
 * SPEC-010 SYNC-157 theme per device. Pure: the key, the values and how a stored value is read.
 *
 * The key is deliberately OUTSIDE the `rift.` prefix of the account cache (SYNC-141 d, SYNC-142): no cache clear
 * (sign-out, account deletion, a deleted-account sign-out, another account's first sign-in) may remove it. The same
 * key and values are read by the inline script in `src/index.html` before the first paint (SYNC-157 e).
 */
export const THEME_KEY = 'device-theme';

export type ThemeChoice = 'system' | 'light' | 'dark';

export const THEME_CHOICES: readonly { value: ThemeChoice; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

/** SYNC-157 (a): `light` or `dark`; anything else (nothing saved, an unknown value) is `system`. */
export function parseTheme(stored: string | null | undefined): ThemeChoice {
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

/** Page background per explicit choice, for the `theme-color` meta tags (Brief H-175 T2). */
export const THEME_BG: Readonly<Record<'light' | 'dark', string>> = { light: '#f4f6f8', dark: '#1b1f24' };
