// SPEC-010 AC 31 (SYNC-052 and SPEC-007 COLL-074 withdrawn, v0.12; H-075): there is no browser-only delete
// and no browser-only mode, so a grep of web/src finds no `signInEnabled` and no `clearCollectionData`.
/// <reference types="node" />
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

// ng test runs from web/, so the path is relative to the package root.
const SRC = resolve(process.cwd(), 'src');
// Built from parts; this file itself is skipped (its comments name the words).
const BANNED = ['signIn' + 'Enabled', 'clearCollection' + 'Data'];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return sourceFiles(p);
    return /\.(ts|html|scss)$/.test(e.name) ? [p] : [];
  });
}

describe('SPEC-010 AC 31: no delete-all-local action', () => {
  it('AC 31 / SYNC-052 web/src has no signInEnabled and no clearCollectionData', () => {
    const files = sourceFiles(SRC).filter((f) => !f.endsWith('no-local-delete.spec.ts'));
    expect(files.length).toBeGreaterThan(50);
    const hits = files.flatMap((f) => {
      const text = readFileSync(f, 'utf8');
      return BANNED.filter((w) => text.includes(w)).map((w) => `${f}: ${w}`);
    });
    expect(hits).toEqual([]);
  });
});
