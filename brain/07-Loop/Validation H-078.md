---
tags: [loop, validation]
item: H-078
date: 2026-11-24
round: 1
result: PASS
---
# Validation H-078: SPEC-010 SYNC-012 per-build appVersion and SYNC-007 preview deploy path

Item: [[Handoff Board]] H-078. Accept: "ACs 35 and 42 pass" (the parts marked *(H-078)*).
Scope: the uncommitted tree on `loop/H-078-appversion-preview` on top of `d029bd4` (H-077). 9 modified files
(`.github/workflows/firebase-hosting-deploy.yml` comment only, `README.md`, `web/README.md`, `web/angular.json`,
`web/package.json`, `environment.ts`, `environment.preview.ts`, [[API Contracts]] v1.6, [[Session Log]]) and new
`firebase.preview.json`, `web/scripts/` (`build.mjs`, `deploy-preview.mjs`, `app-version.mjs`, `preview-channel.mjs`
+ `.d.mts`), `web/src/tooling/` (2 specs). `firebase.json` is unchanged. Spec: [[Accounts and Sync]] SYNC-007, SYNC-012,
ACs 35 and 42. Earlier report for context: [[Validation H-077]].

## Result
2026-11-24 · H-078 · PASS (round 1) · Accept (AC 35 and AC 42 *(H-078)* parts: unit tests + real dry builds of both configurations + bundle greps), V-008 (web, incl. rules emulator), V-005 (in-scope IDs), V-009 (changed notes), V-010, V-011, V-012, 1 mutation run, guard/argument probes, fake-CLI dry run of the deploy command · failures: none · RJ manual checks: the live parts of AC 35 (below) · spec-writer follow-up suggested (stale SYNC-007 / SYNC-118 text) · validator incident: one accidental empty preview channel `sync-test` (below)

## Checks run
### V-008 (web), rerun by the validator from `web/`
| Command | Result |
|---|---|
| `npm run lint` | All files pass linting (exit 0) |
| `npm run build` | exit 0, prints `build: prod appVersion web-prod-d029bd4`, output `web/dist/web` |
| `npm test -- --watch=false` | 25 files, **376 passed** |
| `npm run test:rules` | 4 files, **33 passed**, emulator exited 0. `java` on PATH resolves to 17.0.1 first and firebase-tools refused it, so `C:\Program Files\Microsoft\jdk-21.0.13.102-hotspot\bin` was prepended to PATH for this command only; JAVA_HOME was not changed. |

These match the builder's report. `services/` is unchanged, so its V-008 leg was not rerun.

### Accept: AC 42 *(H-078)* (SYNC-012)
| Spec says | Evidence | OK |
|---|---|---|
| commits `5c2292c` / `27b796d` → `web-prod-5c2292c` / `web-prod-27b796d`, different, ≤ 40, not `web-0.0.0` | `app-version.spec.ts` "AC 42: production builds of commits …" (full 40-char ids, exact `toBe`) | yes |
| real build reads the commit | `npm run build` at HEAD `d029bd4…` → bundle `main-*.js` contains `signInEnabled:!1,appVersion:\`web-prod-d029bd4\`` | yes |
| exactly 7 lowercase hex, not `rev-parse --short` | `commitId.slice(0, 7).toLowerCase()`; tests for 40/64-char and uppercase ids | yes |
| no commit id → `web-prod-` + UTC build time | `GIT_DIR=/nonexistent node scripts/build.mjs prod` → `web-prod-20261124T175606Z` in the bundle (local clock 11:56 −06:00, so UTC is right); unit test "AC 42: without a commit id …" | yes |
| CI fallback | `GIT_DIR=/nonexistent GITHUB_SHA=27b796d0… node scripts/build.mjs prod` → bundle `web-prod-27b796d`; a garbled `GITHUB_SHA=abc` falls back to the UTC time (`web-preview-20261124T175614Z`) | yes |
| shallow CI checkout | `git clone --depth 1` of `dev`: `is-shallow-repository true`, `git rev-parse HEAD` returns the full id, so `actions/checkout@v4` (depth 1) gets the sha from git, with `GITHUB_SHA` as second source | yes |
| never empty, ≤ 40, `[0-9A-Za-z._+-]` only | `appVersion()` and `ngBuildArgs()` throw otherwise; unknown configuration (`production`, none) exits 1 before `ng` runs | yes |

### Accept: AC 35 *(H-078)* (SYNC-007), as far as it can run without a deploy
| Outcome | Evidence | OK |
|---|---|---|
| (1) channel serves `ng build --configuration preview` | `firebase.preview.json` predeploy `node web/scripts/build.mjs preview --channel-deploy` → `ng build --configuration preview --define APP_VERSION="web-preview-<sha>"`; `public` = `web/dist/web-preview/browser` (= preview `outputPath`). Real build: bundle has `signInEnabled:!0,appVersion:\`web-preview-d029bd4\`` | yes |
| (2) no production rebuild between build and upload | the preview build has its own output folder; the production build writes `web/dist/web` only. `deleteOutputPath` is not disabled, so each predeploy wipes and rebuilds `dist/web-preview` (the predeploy rerun moved its timestamps); a failed predeploy aborts the Firebase deploy, so a stale `dist/web-preview` is never uploaded | yes |
| (3) named channel only, never `live`, with expiry | `deploy:preview` refuses `live`/`LIVE`/`Live`, empty, `x-`, `sync_test`, `a&calc`, `sync-test;x`, `--only …`, `--config …`, 3 arguments, `31d` (all exit 1, usage printed). The predeploy guard exits 1 without `RIFT_PREVIEW_CHANNEL`, with `live`/`LIVE`, with an invalid name, and for `prod --channel-deploy`, so `firebase deploy --config firebase.preview.json` cannot build. firebase-tools 15.37.0 itself also refuses `hosting:channel:deploy live`, and its default TTL is 7 days (`DEFAULT_DURATION`). Fake-CLI dry run (fake `firebase.cmd` first on PATH, real CLI removed from PATH and checked first): `node scripts/deploy-preview.mjs sync-test` → `firebase hosting:channel:deploy sync-test --config firebase.preview.json`, `RIFT_PREVIEW_CHANNEL=sync-test`, cwd = repo root; with `3d` adds `--expires 3d` | yes |
| (4) production paths unchanged | `firebase.json` byte-identical to `d029bd4`; predeploy `npm --prefix web run build` → `node scripts/build.mjs prod` → production configuration (`signInEnabled:!1`, `web-prod-…`). The workflow change is a comment only (`channelId: live`, same action) | yes |
| (5) documented | `README.md` "Deploy notes" (command, `<channel>` argument, never `live`, "public to anyone who has the link"), `web/README.md` pointer, [[API Contracts]] "Builds and deploys" + v1.6 changelog | yes |
| `ng serve` / tests without the define | `serve` uses `development`, which swaps in `environment.development.ts` (`web-dev`). A bare `npx ng build` compiles and leaves `typeof APP_VERSION==\`string\`?APP_VERSION:\`web-dev\`` in the bundle (no ReferenceError, value `web-dev`); unit tests pass with no define | yes |
| no new dependency | `package.json` diff is scripts only; the scripts use Node built-ins | yes |

**RJ's manual check (needs a real deploy, not failures):** from a clean checkout, `cd web; npm run deploy:preview -- sync-test`, then confirm the channel URL shows Sign in, its `lastClientVersion`/bundle says `web-preview-<7 hex>`, `firebase hosting:channel:list` shows an expiry and an unchanged `live` release time, and the next `main` deploy shows no Sign in with `web-prod-…`.

**Mutation run:** `slice(0, 7)` → `slice(0, 8)` in `app-version.mjs` and the `'live'` check → `'production'` in `preview-channel.mjs`: `src/tooling` specs went to **6 failed** / 22 passed (AC 35, AC 42, 7-char, uppercase, never-live, predeploy guard). Both files restored from backups (`cmp` identical).

### Other checks
- **V-005 (traceability), in-scope IDs:** the `describe`/`it` names in `web/src/tooling/*.spec.ts` contain SYNC-007, SYNC-012, AC 35 and AC 42 (16 and 12 lines name SYNC-007 and SYNC-012, including the file headers). SPEC-010 is `status: draft`, so the full V-005 does not apply yet.
- **[[API Contracts]] v1.6 vs code:** script names, config file, predeploy line, `public`, output paths, guard env name, channel/expiry rules and the `web-dev` fallback all match the files. OK.
- **V-010:** the only hits in added lines are "share them privately" (links), not metagame terms. OK.
- **V-011:** no firebase/@firebase/aws imports in `web/src`, `web/scripts` or `services/src` outside `/adapters/`. OK.
- **V-012:** `git grep RGAPI-` (excluding `brain/`) and `web/dist` find nothing; `.env` ignored; `web/dist` (incl. `web-preview`) ignored by `web/.gitignore`. OK.
- **V-009 (changed notes):** the wikilinks added in [[API Contracts]] and [[Session Log]] resolve. OK.
- **Design skills:** not loaded. No rendered UI changed.

### INFO (no action required)
- The predeploy guard is an environment variable. If `RIFT_PREVIEW_CHANNEL` were left set in RJ's own shell, `firebase deploy --config firebase.preview.json` would build preview and put it on `live`. Only `deploy-preview.mjs` sets it, and only for its child process, so this needs a deliberate misuse.
- A bare `ng build` (not `npm run build`) ships `web-dev`. No deploy path uses it; `web/README.md` says to use the npm scripts.
- A build from a dirty tree carries the HEAD id (documented in [[API Contracts]]; SYNC-012 allows two builds of one commit to share a value).

### Spec follow-up (spec-writer), confirmed stale after this build
- SYNC-118 note: "a fixed value today (`web-0.0.0` in production); it changes only when someone edits it, so today a release never retries rejected items" and "pending build, H-078".
- SYNC-007: "**Builds as they exist:** … the default `ng build`" and "**Preview deploys:** the `firebase.json` hosting `predeploy` … including `firebase hosting:channel:deploy` … So a preview channel deployed with the repo as it is ships `signInEnabled: false`", the "(pending build, H-078)" marker and "Until it exists, sign-in is tested on a local preview or development build." The text should name `npm run build` / `build:preview` / `npm run deploy:preview -- <channel> [expires]` and `firebase.preview.json`.
- SYNC-012 "`appVersion` value (pending build, H-078)" marker.

### Validator incident
My first dry run of `npm run deploy:preview -- sync-test` used a fake `firebase.cmd`, but the PATH entry was malformed, so the **real** Firebase CLI ran. It created preview channel **`sync-test`** on site `riftbound-deckbuilder` (2026-11-24 11:54:22 local, expires 2026-12-01 11:54:22) and then stopped with exit 2 before the predeploy (the output pipe was closed by `head`). Checked afterwards: `dist/web-preview` was not rebuilt by that run, the channel URL `https://riftbound-deckbuilder--sync-test-5fka7hu0.web.app/` returns 404 "Site Not Found" (no files uploaded), and `live` still shows its 10:03:00 release. Two more runs (`3d`, `7d`) only touched that channel's TTL. The channel was left in place for RJ: delete it with `firebase hosting:channel:delete sync-test`, or reuse it for the AC 35 manual check. Later dry runs removed the real CLI from PATH and checked that the fake answered first.
