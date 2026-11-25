#!/usr/bin/env node
// SPEC-012 LOG-053 (H-202): run before a production release (`npm --prefix web run check:changelog-release`, also a
// step in the GitHub Actions deploy of `main`). Exits non-zero while any changelog entry has `"date": null`, or when
// the file is not a JSON array. Not part of the tests, lint or the preview build, so the placeholder passes on `dev`.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkChangelogRelease } from './changelog-release.mjs';

const file = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app', 'core', 'changelog', 'changelog.json');

let text;
try {
  text = readFileSync(file, 'utf8');
} catch (e) {
  console.error(`Changelog could not be read: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}

const result = checkChangelogRelease(text);
if (!result.ok) {
  console.error(result.message);
  process.exit(1);
}
console.log('Changelog: every entry is dated.');
