// H-124 / H-106 (brain/04-UI/Brief H-104 H-106 H-124.md): the sign-in dialog's phone layout and the
// failed-send field outline. jsdom has no layout and doesn't evaluate media queries, so, like
// danger-button.spec.ts and focus-ring.spec.ts, this checks the source: the SignInDialog component
// styles in sync-dialogs.ts and the global stylesheet. The real widths and the no-scrollbar check are
// for the ui-engineer Playwright pass at 375 and 1440.
/// <reference types="node" />
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

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

describe('H-140 sign-in dialog sent state layout (brain/04-UI/Brief H-140 H-125 H-108.md decisions 2, 8, 10)', () => {
  it('H-140: the actions sit in content as a start-aligned row pulled left by the text button padding, with room below for the focus ring', () => {
    const actions = rule(signInStyles(), '.sent-actions');
    expect(actions).toContain('display: flex');
    expect(actions).toContain('flex-wrap: wrap');
    expect(actions).toContain('margin-inline-start: calc(-1 * var(--space-3))');
    expect(actions).toContain('padding-bottom: var(--space-1)');
  });

  it('H-140: at max-width 40rem the two actions are stacked and start-aligned', () => {
    const actions = rule(phoneBlock(signInStyles()), '.sent-actions');
    expect(actions).toContain('flex-direction: column');
    expect(actions).toContain('align-items: flex-start');
    expect(actions).toContain('gap: 0');
  });

  it('H-140: the address is emphasised and wraps anywhere; the script-focused sent line has no ring; the H-124 form rules are unchanged', () => {
    const css = signInStyles();
    expect(rule(css, '.sent-line strong')).toContain('overflow-wrap: anywhere');
    expect(rule(css, '.sent-line strong')).toContain('font-weight: 600');
    expect(rule(css, '.sent-line')).toContain('outline: none');
    expect(rule(css, '.email')).toBe(
      'display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); padding-bottom: var(--space-1);',
    );
    expect(rule(phoneBlock(css), '.email')).toBe('flex-direction: column; align-items: stretch; gap: var(--space-3);');
  });
});

/** Every .ts and .html file under web/src. */
function sourceFiles(dir = resolve(process.cwd(), 'src')): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = join(dir, d.name);
    if (d.isDirectory()) return sourceFiles(p);
    return /\.(ts|html)$/.test(d.name) ? [p] : [];
  });
}

describe('H-140 / H-108 removed strings and calls in web/src', () => {
  it('H-140: the pre-H-140 sent line is gone from web/src', () => {
    const old = 'Check your email for a ' + 'sign-in link.';
    expect(sourceFiles().filter((f) => readFileSync(f, 'utf8').includes(old))).toEqual([]);
  });

  it('H-108: no native browser prompt call is left in web/src', () => {
    const call = new RegExp('\\bprompt' + '\\s*\\(');
    expect(sourceFiles().filter((f) => call.test(readFileSync(f, 'utf8')))).toEqual([]);
  });
});
