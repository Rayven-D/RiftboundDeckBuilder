// H-124 / H-106 (brain/04-UI/Brief H-104 H-106 H-124.md): the sign-in dialog's phone layout and the
// failed-send field outline. jsdom has no layout and doesn't evaluate media queries, so, like
// danger-button.spec.ts and focus-ring.spec.ts, this checks the source: the SignInDialog component
// styles in sync-dialogs.ts and the global stylesheet. The real widths and the no-scrollbar check are
// for the ui-engineer Playwright pass at 375 and 1440.
/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ng test runs from web/, so the paths are relative to the package root.
const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

/** The `styles` string of the SignInDialog component (between its selector and the next @Component). */
function signInStyles(): string {
  const src = read('src/app/core/sync/sync-dialogs.ts');
  const start = src.indexOf("selector: 'app-sign-in-dialog'");
  const end = src.indexOf('export class SignInDialog');
  const component = src.slice(start, end);
  return stripComments(component.match(/styles:\s*`([\s\S]*?)`/)?.[1] ?? '');
}

/** Body of the first `@media (max-width: 40rem) { ... }` block (one level of nested rules). */
function phoneBlock(css: string): string {
  return css.match(/@media \(max-width: 40rem\) \{((?:[^{}]|\{[^{}]*\})*)\}/)?.[1] ?? '';
}

/** Whitespace-normalized body of the rule whose selector is exactly `selector`. */
function rule(css: string, selector: string): string {
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (norm(m[1]) === selector) return norm(m[2]);
  }
  return '';
}

describe('H-124 sign-in dialog phone layout', () => {
  it('H-124: at max-width 40rem (the app phone query) the email form is a column, so the field and Send link are full width', () => {
    const phone = phoneBlock(signInStyles());
    expect(phone).not.toBe('');
    const email = rule(phone, '.email');
    expect(email).toContain('flex-direction: column');
    expect(email).toContain('align-items: stretch');
    // The desktop flex-basis would become a height in a column; the field resets it.
    expect(rule(phone, '.email mat-form-field')).toContain('flex: none');
  });

  it('H-124: on desktop the field fills the row and the error line spans it', () => {
    const css = signInStyles();
    expect(rule(css, '.email mat-form-field')).toContain('flex: 1 1 16rem');
    expect(rule(css, '.error')).toContain('flex-basis: 100%');
  });

  it('H-124 / H-139: the overflow is fixed without overflow:hidden and .email keeps its padding-bottom for the focus ring', () => {
    const css = signInStyles();
    expect(css).not.toMatch(/overflow\s*:/);
    expect(rule(css, '.email')).toContain('padding-bottom: var(--space-1)');
  });

  it('H-106: the error line uses the danger colour and keeps the icon on the first line', () => {
    const error = rule(signInStyles(), '.error');
    expect(error).toContain('color: var(--color-danger)');
    expect(error).toContain('align-items: flex-start');
    expect(error).toContain('font-size: var(--font-size-sm)');
  });

  it('H-106: .mat-mdc-form-field.send-failed sets the outline and the label to the danger colour at rest, hover and focus (plain and error tokens), without !important', () => {
    const body = rule(stripComments(read('src/styles.scss')), '.mat-mdc-form-field.send-failed');
    for (const prefix of ['outlined-', 'outlined-error-']) {
      for (const state of ['', 'hover-', 'focus-']) {
        expect(body).toContain(`${prefix}${state}outline-color: var(--color-danger)`);
        expect(body).toContain(`${prefix}${state}label-text-color: var(--color-danger)`);
      }
    }
    expect(body).not.toContain('!important');
  });

  it('H-106: the sign-in email form has novalidate, so the browser never shows its own validation bubble', () => {
    const src = read('src/app/core/sync/sync-dialogs.ts');
    expect(src).toMatch(/<form class="email" novalidate \(submit\)="send\(\$event\)">/);
  });
});
