// H-113 (brain/04-UI/Brief H-113 H-116 H-123 H-126.md): the dialog surface and its edges.
// The unit-test builder doesn't load global styles, so, like danger-button.spec.ts, this checks the
// global stylesheet source.
/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ng test runs from web/, so the path is relative to the package root.
const css = readFileSync(resolve(process.cwd(), 'src/styles.scss'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

function topLevelBlock(header: string): string {
  const escaped = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return css.match(new RegExp(`^${escaped} \\{([\\s\\S]*?)\\n\\}`, 'm'))?.[1] ?? '';
}

function rule(selector: string): string {
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (norm(m[1]) === selector) return norm(m[2]);
  }
  return '';
}

const DIALOG = '.cdk-overlay-pane:not(.card-dialog-panel) .mat-mdc-dialog-surface';

describe('H-113 dialog surface', () => {
  it('H-113: dialog surface is raised in dark and white (surface) in light; dark dialog border is #434c56 = rgb(67, 76, 86)', () => {
    const dark = topLevelBlock(':root');
    const light = topLevelBlock('@media (prefers-color-scheme: light)');
    expect(dark).toContain('--color-surface-dialog: var(--color-surface-raised);');
    expect(dark).toContain('--color-border-dialog: #434c56;');
    expect(light).toContain('--color-surface-dialog: var(--color-surface);');
    expect(light).toContain('--color-border-dialog: #d3d9e0;');
  });

  it('H-113: Material dialogs use the dialog surface and --color-text for title and body', () => {
    const block = norm(css.match(/@include mat\.dialog-overrides\(([\s\S]*?)\);/)?.[1] ?? '');
    expect(block).toContain('container-color: var(--color-surface-dialog)');
    expect(block).toContain('subhead-color: var(--color-text)');
    expect(block).toContain('supporting-text-color: var(--color-text)');
  });

  it('H-113: hairlines and outlined-button edges inside dialogs (not the card dialog) use --color-border-dialog', () => {
    const body = rule(DIALOG);
    expect(body).toContain('--color-border: var(--color-border-dialog);');
    expect(body).toContain('--mat-button-outlined-outline-color: var(--color-border-dialog);');
  });
});
