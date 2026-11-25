// H-102 (brain/04-UI/Brief H-102.md): the danger button and danger menu item variants.
// jsdom has no real cascade and the unit-test builder doesn't load global styles, so, like
// focus-ring.spec.ts and snackbar-offset.spec.ts, this checks the global stylesheet source: the
// danger tokens in both colour schemes, the button and menu-item override rules, a neutral disabled
// fill, no !important, no outline (the H-139 ring stays the only focus indicator), and WCAG AA
// contrast of the label on the fill computed from the token values in the stylesheet.
/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ng test runs from web/, so the path is relative to the package root.
const styles = readFileSync(resolve(process.cwd(), 'src/styles.scss'), 'utf8');
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const css = stripComments(styles);
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

const BUTTON = '.mat-mdc-button-base.danger';
const MENU_ITEM = '.mat-mdc-menu-item.danger';

/** First top-level block (closing brace at column 0) whose header matches `header`. */
function topLevelBlock(header: string): string {
  const escaped = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return css.match(new RegExp(`^${escaped} \\{([\\s\\S]*?)\\n\\}`, 'm'))?.[1] ?? '';
}

const darkRoot = () => topLevelBlock(':root');
const lightBlock = () => topLevelBlock('@mixin light-tokens');

/** Whitespace-normalized body of the rule whose selector is exactly `selector`. */
function rule(selector: string): string {
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (norm(m[1]) === selector) return norm(m[2]);
  }
  return '';
}

/** Value of a custom property declared in `block`, e.g. `#f09595`. */
function token(block: string, name: string): string {
  return block.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6});`))?.[1] ?? '';
}

/** WCAG 2.x relative luminance of a #rrggbb colour. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('H-102 danger button and menu item', () => {
  it('H-102: --color-danger-contrast is #3b0a0a in the dark :root and #ffffff in the light scheme', () => {
    expect(darkRoot()).toContain('--color-danger-contrast: #3b0a0a;');
    expect(lightBlock()).toContain('--color-danger-contrast: #ffffff;');
  });

  it('H-102: the .mat-mdc-button-base.danger rule sets the filled container and label from the danger tokens', () => {
    const body = rule(BUTTON);
    expect(body).not.toBe('');
    expect(body).toContain('filled-container-color: var(--color-danger)');
    expect(body).toContain('filled-label-text-color: var(--color-danger-contrast)');
  });

  it('H-102: the disabled danger fill is neutral (no danger or accent colour)', () => {
    // The value up to the next top-level comma; parentheses (color-mix(..., var(...))) may nest once.
    const disabled =
      rule(BUTTON).match(/filled-disabled-container-color:\s*((?:[^,()]|\((?:[^()]|\([^()]*\))*\))+)/)?.[1] ?? '';
    expect(disabled).not.toBe('');
    expect(disabled).not.toContain('--color-danger');
    expect(disabled).not.toContain('--color-accent');
  });

  it('H-102: the .mat-mdc-menu-item.danger rule sets the label to the danger colour', () => {
    expect(rule(MENU_ITEM)).toContain('item-label-text-color: var(--color-danger)');
  });

  it('H-102: the danger rules use no !important and set no outline (the H-139 ring stays in charge)', () => {
    for (const selector of [BUTTON, MENU_ITEM]) {
      const body = rule(selector);
      expect(body).not.toBe('');
      expect(body).not.toContain('!important');
      // A CSS outline declaration, not the outlined-outline-color button token.
      expect(body).not.toMatch(/(^|[;{]\s*)outline(-(width|style|color|offset))?\s*:/);
    }
  });

  it('H-102: danger label on the danger fill meets WCAG AA 4.5:1 in both schemes (values read from the stylesheet)', () => {
    const dark = { fill: token(darkRoot(), '--color-danger'), label: token(darkRoot(), '--color-danger-contrast') };
    const light = { fill: token(lightBlock(), '--color-danger'), label: token(lightBlock(), '--color-danger-contrast') };
    expect(dark).toEqual({ fill: '#f09595', label: '#3b0a0a' });
    expect(light).toEqual({ fill: '#a32d2d', label: '#ffffff' });
    expect(contrast(dark.label, dark.fill)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(light.label, light.fill)).toBeGreaterThanOrEqual(4.5);
  });

  it('H-102: the contrast helper matches known WCAG values', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#ffffff', '#a32d2d')).toBeCloseTo(7.07, 1);
  });
});
