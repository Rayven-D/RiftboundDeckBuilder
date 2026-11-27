// H-671 (RJ 2026-11-26: "Let's also display the notices at the top of the page instead of the bottom, on all formats";
// "All notices, not just the deck ones. All notices will move to the top"). Replaces the H-101 bottom offset over the
// phone tab bar and the H-176 / H-245 clearance above the floating button, which only a bottom notice needed.
// jsdom has no real cascade, no media queries and the unit-test builder doesn't load global styles, so, like
// focus-ring.spec.ts, this checks the stylesheet source and the call sites' source.
/// <reference types="node" />
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { NOTICE_POSITION, noticeOptions } from '../app/shared/sync/notice';

// ng test runs from web/, so the path is relative to the package root.
const styles = readFileSync(resolve(process.cwd(), 'src/styles.scss'), 'utf8');
const SELECTOR = '.mat-mdc-snack-bar-container.mat-mdc-snack-bar-container';
const PANE = '.cdk-overlay-pane:has(> .mat-mdc-snack-bar-container)';
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '');

/** Whitespace-normalized bodies of the top-level rules whose selector is exactly `selector`. */
function rules(source: string, selector: string): string[] {
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
  const top = stripComments(source).replace(/^@media[^{]*\{[\s\S]*?\n\}/gm, '');
  return [...top.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((m) => norm(m[1]) === selector).map((m) => norm(m[2]));
}

function sources(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) sources(p, out);
    else if (p.endsWith('.ts') && !p.endsWith('.spec.ts')) out.push(p);
  }
  return out;
}

describe('H-671 notices at the top on every width', () => {
  it('H-671 the shared notice position is top, centred, and every noticeOptions() kind carries it', () => {
    expect(NOTICE_POSITION).toEqual({ verticalPosition: 'top', horizontalPosition: 'center' });
    for (const kind of ['success', 'info', 'error', undefined] as const) expect(noticeOptions(kind)).toMatchObject(NOTICE_POSITION);
  });

  it('H-671 every snack bar call site in web/src takes the top position (noticeOptions() or NOTICE_POSITION); none sets its own', () => {
    const files = sources(resolve(process.cwd(), 'src/app'));
    const calls: { file: string; args: string }[] = [];
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(/snackBar\.(open|openFromComponent)\(/g)) {
        // The call's arguments: up to the matching close paren.
        let depth = 1;
        let i = (m.index ?? 0) + m[0].length;
        for (; i < src.length && depth > 0; i++) depth += src[i] === '(' ? 1 : src[i] === ')' ? -1 : 0;
        calls.push({ file, args: src.slice((m.index ?? 0) + m[0].length, i) });
      }
    }
    expect(calls.length).toBeGreaterThan(20);
    const missing = calls.filter((c) => !/noticeOptions\(|NOTICE_POSITION/.test(c.args)).map((c) => `${c.file}: ${c.args.slice(0, 60)}`);
    expect(missing).toEqual([]);
    const own = files.filter((f) => !f.endsWith('notice.ts') && /verticalPosition|horizontalPosition/.test(readFileSync(f, 'utf8')));
    expect(own).toEqual([]);
  });

  it('H-671 the notice sits just under the sticky header at every width: header height + top safe-area inset + space-2; top margin only, no !important', () => {
    const [body] = rules(styles, SELECTOR);
    expect(body).toContain('margin-top: calc(var(--header-height) + env(safe-area-inset-top) + var(--space-2));');
    expect(body).not.toMatch(/(^|[\s;])margin\s*:|margin-(bottom|left|right|inline|block)/);
    expect(body).not.toContain('!important');
    expect(body).toContain('pointer-events: auto;');
    expect(rules(styles, PANE)).toEqual(['pointer-events: none;']);
    expect(stripComments(styles)).not.toContain('mat-mdc-snack-bar-handset');
  });

  it('H-671 no bottom lift is left: not over the phone tab bar (H-101), not above the floating button (H-176 / H-245)', () => {
    const css = stripComments(styles);
    expect(css).not.toMatch(/snack-bar-container[^{]*\{[^}]*margin-bottom/);
    expect(css).not.toMatch(/html\.has-fab [^{]*snack-bar/);
  });

  it('H-101: the tab bar border token stays (1px), still used by the bar itself', () => {
    expect(styles).toMatch(/--tabbar-border:\s*1px;/);
    const app = readFileSync(resolve(process.cwd(), 'src/app/app.scss'), 'utf8');
    expect(app).toContain('border-top: var(--tabbar-border) solid var(--color-border);');
  });

  it('H-245 D2 COLL-094 / OWN-094: the room for the floating button is reserved above the footer (inside main), none below it', () => {
    const css = stripComments(styles);
    expect(css).toMatch(/html\.has-fab \.site-main \{\s*padding-bottom: calc\(var\(--fab-size\) \+ 2 \* var\(--space-4\)\);/);
    expect(css).not.toMatch(/html\.has-fab app-root/);
    expect(css).toMatch(/html\.has-fab \{[^}]*scroll-padding-bottom: var\(--fab-clearance\);/);
  });
});
