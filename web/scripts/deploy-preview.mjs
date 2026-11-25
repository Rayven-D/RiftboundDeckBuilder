#!/usr/bin/env node
// SPEC-010 SYNC-007 (H-078): deploy a named preview channel with sign-in on.
//   npm run deploy:preview -- <channel> [expires]      (from web/)
// Runs `firebase hosting:channel:deploy <channel> --config firebase.preview.json [--expires <expires>]`
// from the repo root. That config's predeploy runs `ng build --configuration preview` into dist/web-preview
// and its `public` is that folder, so no production build runs between the build and the upload.
// Preview URLs are public to anyone who has the link.
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PREVIEW_CHANNEL_ENV, USAGE, firebaseChannelDeployArgs, parsePreviewDeployArgs } from './preview-channel.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

let parsed;
try {
  parsed = parsePreviewDeployArgs(process.argv.slice(2));
} catch (e) {
  console.error(`deploy:preview: ${e.message}\n\n${USAGE}`);
  process.exit(1);
}

const args = firebaseChannelDeployArgs(parsed);
console.log(`deploy:preview: firebase ${args.join(' ')}`);
console.log('deploy:preview: preview URLs are public to anyone who has the link. Share it privately.');

// On Windows the CLI is firebase.cmd, which needs a shell. The arguments are validated (letters, digits,
// hyphens, dots), so joining them into one command line cannot change their meaning.
const options = { cwd: repoRoot, stdio: 'inherit', env: { ...process.env, [PREVIEW_CHANNEL_ENV]: parsed.channel } };
const result =
  process.platform === 'win32'
    ? spawnSync(['firebase', ...args].join(' '), { ...options, shell: true })
    : spawnSync('firebase', args, options);
if (result.error) {
  console.error(`deploy:preview: could not run the Firebase CLI (${result.error.message}). Is firebase-tools installed?`);
  process.exit(1);
}
process.exit(result.status ?? 1);
