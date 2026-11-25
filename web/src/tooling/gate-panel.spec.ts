// H-144 / H-114 / H-115 (brain/04-UI/Brief H-144 H-114 H-115.md). jsdom has no real cascade or media queries,
// so, like danger-button.spec.ts, this checks the stylesheet sources: the gate's progress bar and its
// reduced-motion rule, the empty state's balanced message, and that no retired gate copy is left in web/src.
/// <reference types="node" />
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

// ng test runs from web/, so paths are relative to the package root.
const SRC = resolve(process.cwd(), 'src');
const read = (path: string) => readFileSync(join(SRC, path), 'utf8');
/** The component's inline `styles` block, so template braces don't confuse the rule matcher. */
const styles = (path: string) => read(path).match(/styles: `([\s\S]*?)`/)?.[1] ?? '';
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '');

/** Whitespace-normalized body of the first rule whose selector is exactly `selector`, inside `css`. */
function rule(css: string, selector: string): string {
  for (const m of stripComments(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (norm(m[1]) === selector) return norm(m[2]);
  }
  return '';
}

/** Body of the `@media (prefers-reduced-motion: reduce)` block in `css`. */
function reducedMotion(css: string): string {
  return stripComments(css).match(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?\})\s*\}/)?.[1] ?? '';
}

describe('Gate panel styles (H-115, H-114)', () => {
  const panel = styles('app/core/sync/sign-in-panel.ts');

  it('H-115 the running-state bar: 16rem track capped at the content width, 4px, accent segment animated', () => {
    const bar = rule(panel, '.progress');
    expect(bar).toContain('width: min(16rem, 100%);'); // a fixed 16rem overflowed the box below ~337px
    expect(bar).not.toMatch(/(^|[; ])(max-)?width: 16rem;/);
    expect(bar).toContain('height: 4px;');
    expect(bar).toContain('margin-block: 18px;'); // 4 + 2 × 18 = the 40px button row: no jump running ↔ failed
    expect(bar).toContain('overflow: hidden;');
    expect(rule(panel, '.progress-segment')).toContain('background: var(--color-accent);');
    expect(rule(panel, '.progress-segment')).toContain('animation: gate-progress 1.4s linear infinite;');
    // the bar's 100% is the action row, which the empty state stretches to the box's content width
    expect(rule(styles('app/shared/empty-state.ts'), '.actions:not(:empty)')).toContain('justify-self: stretch;');
  });

  it('H-115 reduced motion: no animation, the segment rests centred (translateX(75%))', () => {
    const block = reducedMotion(panel);
    expect(rule(block, '.progress-segment')).toContain('animation: none;');
    expect(rule(block, '.progress-segment')).toContain('transform: translateX(75%);');
  });

  it('H-115 the global reduced-motion rule is still there (it would park a Material bar off-screen, hence the CSS bar)', () => {
    const block = reducedMotion(read('styles.scss'));
    expect(block).toContain('animation-iteration-count: 1 !important;');
  });

  it('H-114 the empty state balances its message and shows a heading-less line in the body colour', () => {
    const empty = styles('app/shared/empty-state.ts');
    expect(rule(empty, 'p')).toContain('text-wrap: balance;');
    expect(rule(empty, 'p.primary')).toContain('color: var(--color-text);');
  });

  it('H-144 no retired gate copy is left anywhere in web/src', () => {
    const retired = [
      ['Sign in to see', 'your collection'],
      ['Sign in to see', 'your decks'],
      ['Sign in to import', 'cards and decks'],
      ['You need a', 'free account'],
      ['Sign in again', 'to see them'],
    ].map((parts) => parts.join(' ')); // split so this file holds none of the phrases either
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(ts|html|scss|css|json)$/.test(name)) {
          const source = readFileSync(path, 'utf8');
          for (const phrase of retired) if (source.includes(phrase)) hits.push(`${path}: ${phrase}`);
        }
      }
    };
    walk(SRC);
    expect(hits).toEqual([]);
  });
});
