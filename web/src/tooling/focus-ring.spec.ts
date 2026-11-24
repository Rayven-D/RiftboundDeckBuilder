// H-139 (ui-engineer brief, UI Review 2026-11-24 #1): visible keyboard focus on Material buttons and menu items.
// jsdom has no real cascade (no specificity ordering, no :focus-visible heuristics) and the unit-test
// builder doesn't load global styles, so a computed-outline test would prove nothing. This checks the
// global stylesheet source instead: the rules exist, use the focus token, have the agreed offsets,
// beat Material by specificity (no !important), map to Highlight in forced colors, and never animate.
/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ng test runs from web/, so the path is relative to the package root.
const styles = readFileSync(resolve(process.cwd(), 'src/styles.scss'), 'utf8');

/** Body of the first top-level rule whose selector list is exactly `selector` (whitespace-normalized). */
function ruleBody(source: string, selector: string): string | null {
  const norm = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim();
  const re = /([^{}]+)\{([^{}]*)\}/g;
  for (const m of source.matchAll(re)) {
    if (norm(m[1]) === norm(selector)) return norm(m[2]);
  }
  return null;
}

describe('H-139 focus ring on Material controls', () => {
  it('H-139: buttons get the 2px focus-token ring with a 2px outside offset, at (0,3,0) so .mdc-button:active cannot hide it', () => {
    const body = ruleBody(styles, '.mat-mdc-button-base.mat-mdc-button-base:focus-visible');
    expect(body).not.toBeNull();
    expect(body).toContain('outline: 2px solid var(--color-focus);');
    expect(body).toContain('outline-offset: 2px;');
  });

  it('H-139: menu items get the same ring, inset, on :focus-visible and cdk-keyboard-focused', () => {
    const body = ruleBody(styles, '.mat-mdc-menu-panel .mat-mdc-menu-item:focus-visible, .mat-mdc-menu-panel .mat-mdc-menu-item.cdk-keyboard-focused');
    expect(body).not.toBeNull();
    expect(body).toContain('outline: 2px solid var(--color-focus);');
    expect(body).toContain('outline-offset: -2px;');
  });

  it('H-139: forced colors map the ring to Highlight for buttons and menu items', () => {
    const media = styles.match(/@media \(forced-colors: active\) \{([\s\S]*?)\n\}/g) ?? [];
    const hit = media.find((block: string) => block.includes('.mat-mdc-button-base.mat-mdc-button-base:focus-visible'));
    expect(hit).toBeDefined();
    expect(hit).toContain('.mat-mdc-menu-panel .mat-mdc-menu-item:focus-visible');
    expect(hit).toContain('.mat-mdc-menu-panel .mat-mdc-menu-item.cdk-keyboard-focused');
    expect(hit).toContain('outline-color: Highlight;');
  });

  it('H-139: no !important on the focus rules and outline is never transitioned', () => {
    const rules = [
      ruleBody(styles, '.mat-mdc-button-base.mat-mdc-button-base:focus-visible'),
      ruleBody(styles, '.mat-mdc-menu-panel .mat-mdc-menu-item:focus-visible, .mat-mdc-menu-panel .mat-mdc-menu-item.cdk-keyboard-focused'),
    ];
    for (const body of rules) expect(body).not.toContain('!important');
    // `all` would animate the outline too, so it is as forbidden as naming `outline`.
    const transitions = [...styles.matchAll(/transition(?:-property)?\s*:([^;]*);/g)].map((m) => m[1]);
    expect(transitions.length).toBeGreaterThan(0);
    for (const value of transitions) expect(value).not.toMatch(/\ball\b|outline/);
  });
});
