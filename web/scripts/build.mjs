#!/usr/bin/env node
// SPEC-010 SYNC-012 / SYNC-007 (H-078): production or preview build with a per-build appVersion.
//   node scripts/build.mjs prod                     -> npm run build (also the firebase.json predeploy and CI)
//   node scripts/build.mjs preview                  -> npm run build:preview (local preview build)
//   node scripts/build.mjs preview --channel-deploy -> the firebase.preview.json predeploy only
// The value reaches `ng build` as a `define` (APP_VERSION), so nothing is written into the source tree.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { appVersion, ngBuildArgs, resolveCommitId } from './app-version.mjs';
import { previewDeployChannelFromEnv } from './preview-channel.mjs';

const webDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function fail(message) {
  console.error(`build: ${message}`);
  process.exit(1);
}

const [configuration, ...rest] = process.argv.slice(2);
const channelDeploy = rest.includes('--channel-deploy');
const unknown = rest.filter((a) => a !== '--channel-deploy');
if (unknown.length > 0) fail(`unknown argument(s): ${unknown.join(' ')}`);
if (channelDeploy && configuration !== 'preview') fail('--channel-deploy is for the preview build only');

if (channelDeploy) {
  try {
    previewDeployChannelFromEnv(process.env);
  } catch (e) {
    fail(e.message);
  }
}

const git = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: webDir, encoding: 'utf8' });
const commitId = resolveCommitId({
  gitHead: git.status === 0 ? git.stdout : null,
  githubSha: process.env.GITHUB_SHA ?? null,
});

let version;
try {
  version = appVersion({ configuration, commitId, buildTime: new Date() });
} catch (e) {
  fail(e.message);
}
console.log(`build: ${configuration} appVersion ${version}${commitId ? '' : ' (no commit id found: UTC build time)'}`);

const ng = createRequire(import.meta.url).resolve('@angular/cli/bin/ng.js');
const result = spawnSync(process.execPath, [ng, ...ngBuildArgs(configuration, version)], {
  cwd: webDir,
  stdio: 'inherit',
});
if (result.error) fail(result.error.message);
process.exit(result.status ?? 1);
