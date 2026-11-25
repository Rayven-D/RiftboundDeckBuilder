// H-101 (ui-engineer brief, UI Review 2026-11-24 #2): snack bars clear the phone tab bar.
// jsdom has no real cascade, no media queries and the unit-test builder doesn't load global styles,
// so a computed-margin test would prove nothing. Like focus-ring.spec.ts, this checks the global
// stylesheet source: the rule lives inside the tab-bar breakpoint, uses the tab-bar offset, beats
// Material by specificity without !important, sets only the bottom margin (including the bar's
// hairline), and makes the grown overlay pane click-through so the tabs under it stay tappable.
/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ng test runs from web/, so the path is relative to the package root.
const styles = readFileSync(resolve(process.cwd(), 'src/styles.scss'), 'utf8');
const SELECTOR = '.mat-mdc-snack-bar-container.mat-mdc-snack-bar-container';
const PANE = '.cdk-overlay-pane:has(> .mat-mdc-snack-bar-container)';
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '');

/** Top-level `@media (max-width: 40rem) { ... }` blocks (closing brace at column 0). */
function phoneBlocks(source: string): string[] {
  return stripComments(source).match(/^@media \(max-width: 40rem\) \{([\s\S]*?)\n\}/gm) ?? [];
}

const phoneBlock = () => phoneBlocks(styles).find((b) => b.includes(SELECTOR)) ?? '';

/** Whitespace-normalized body of the rule whose selector is exactly `selector` inside `block`. */
function ruleIn(block: string, selector: string): string {
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
  for (const m of block.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (norm(m[1]) === selector) return norm(m[2]);
  }
  return '';
}

describe('H-101 snack bar offset above the phone tab bar', () => {
  it('H-101: the doubled snack-bar selector sits inside the 40rem tab-bar breakpoint', () => {
    const block = phoneBlocks(styles).find((b) => b.includes(SELECTOR));
    expect(block).toBeDefined();
  });

  it('H-101: margin-bottom is tab-bar height + hairline + safe-area inset + space-2, bottom only, no !important', () => {
    const body = ruleIn(phoneBlock(), SELECTOR);
    expect(body).toContain('margin-bottom: calc(var(--tabbar-height) + var(--tabbar-border) + env(safe-area-inset-bottom) + var(--space-2));');
    expect(body).not.toMatch(/(^|[\s;])margin\s*:|margin-(top|left|right|inline|block)/);
    expect(body).not.toContain('!important');
  });

  it('H-101: the tab bar border and the offset share the --tabbar-border token (1px)', () => {
    expect(styles).toMatch(/--tabbar-border:\s*1px;/);
    const app = readFileSync(resolve(process.cwd(), 'src/app/app.scss'), 'utf8');
    expect(app).toContain('border-top: var(--tabbar-border) solid var(--color-border);');
  });

  it('H-101: the overlay pane is click-through and only the snack bar takes taps, matched by :has() not the handset class', () => {
    const block = phoneBlock();
    expect(ruleIn(block, PANE)).toBe('pointer-events: none;');
    expect(ruleIn(block, SELECTOR)).toContain('pointer-events: auto;');
    expect(stripComments(styles)).not.toContain('mat-mdc-snack-bar-handset');
  });

  it('H-101: wider screens keep Material\'s default margin, except above a page floating button (H-176)', () => {
    const outside = stripComments(styles).replace(/^@media \(max-width: 40rem\) \{[\s\S]*?\n\}/gm, '');
    const selectors = [...outside.matchAll(/([^{}]+)\{/g)]
      .map((m) => m[1].trim())
      .filter((sel) => sel.includes('mat-mdc-snack-bar-container'));
    expect(selectors.length).toBeGreaterThan(0);
    expect(selectors.every((sel) => sel.startsWith('html.has-fab'))).toBe(true);
  });

  it('H-176 COLL-094 (d), (e): while a floating button shows, the page ends clear of it and snack bars sit above it (no !important)', () => {
    const css = stripComments(styles);
    const body = css.match(/html\.has-fab \.mat-mdc-snack-bar-container\.mat-mdc-snack-bar-container \{([^}]*)\}/)?.[1] ?? '';
    expect(body).toContain('margin-bottom: var(--fab-clearance);');
    expect(body).not.toContain('!important');
    expect(css).toMatch(/--fab-clearance: calc\(var\(--space-5\) \+ 56px \+ var\(--space-3\)\);/);
    expect(css).toMatch(/html\.has-fab app-root \{\s*padding-bottom: var\(--fab-clearance\);/);
    expect(css).toMatch(/html\.has-fab \{[^}]*scroll-padding-bottom: var\(--fab-clearance\);/);
  });
});
