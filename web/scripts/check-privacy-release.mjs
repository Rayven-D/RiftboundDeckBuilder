#!/usr/bin/env node
// SPEC-010 SYNC-101 check 2 (H-180): run by the release step (`npm --prefix web run check:privacy-release`), the
// GitHub Actions deploy of `main` and the firebase.json hosting predeploy (`firebase deploy --only hosting`). Exits
// non-zero while the notice text still holds "[set on release". Not part of the tests, lint, `npm run build` or the
// preview deploy (firebase.preview.json), so the placeholder passes on `dev` and on preview channels.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NOTICE_PATH, checkPrivacyRelease } from './privacy-notice-checks.mjs';

const file = resolve(dirname(fileURLToPath(import.meta.url)), '..', NOTICE_PATH);

let text;
try {
  text = readFileSync(file, 'utf8');
} catch (e) {
  console.error(`Privacy notice could not be read: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}

const result = checkPrivacyRelease(text);
if (!result.ok) {
  console.error(result.message);
  process.exit(1);
}
console.log('Privacy notice: the release date is filled.');
