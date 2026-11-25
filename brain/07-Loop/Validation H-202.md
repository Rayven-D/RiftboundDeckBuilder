---
tags: [loop, validation]
item: H-202
date: 2026-11-25
round: 1
result: PASS (H-202)
---
# Validation H-202: SPEC-012 Changelog page build

Item: [[Handoff Board]] H-202. Spec: [[Changelog]] 0.1 (LOG-001...LOG-060, ACs 1-10). Accept: SPEC-012 ACs 1-10 pass; V-008 green; nothing deployed.

2026-11-25 · H-202 · **PASS** · V-008 (lint, build, tests), `check:changelog-release`, AC 1-10 against code and tests, public-route and lazy-chunk check, workflow scope, LOG traceability · 0 failures, 1 review gate (H-221, needs-RJ).

## Checks run
- **V-008:** `npm run lint` exit 0 ("All files pass linting"). `npm run build` exit 0; `changelog-page` is its own lazy chunk (4.36 kB), separate from the `firebase-adapters` chunk. `npm test -- --watch=false`: 61 files, 841 tests passed, exit 0.
- **Release check:** `npm --prefix web run check:changelog-release` exits 1 with exactly `Changelog has an undated entry: set its date before releasing.` (date is null). Spec test also covers all-dated = ok, invalid JSON, not-an-array, and that an invalid date string is not this check's job (LOG-054).
- **Public, no Firebase (AC 1, LOG-001/003):** route `changelog` in `app.routes.ts` has no gate and uses `loadComponent`; title `What's new · Rift Builder`. The page, `shared/changelog/changelog.ts` and `changelog-data.ts` import only Angular core and each other (no Firebase, no sync, no storage, no fetch); data is the bundled JSON. `/changelogs` falls to the existing `**` Home redirect (test). Tests cover tab title, h1, intro. Live offline/network behaviour is by design (static bundle), not browser-run by me (ui-engineer does that).
- **AC 2 footer (LOG-010/012):** `app.html` has `What's new` as a `routerLink` anchor in the theme-switch row, no `target`, 44 px min-height in `app.scss`; not in site nav or tab bar (tested). Privacy notice link is not there yet (H-180), allowed by AC 2 ("before that, What's new alone").
- **AC 3 menu (LOG-011):** `<a mat-menu-item routerLink="/changelog">` after the Privacy-notice slot and before the last divider; tests for online, offline, unfinished deletion (item present, not disabled, no target), 3 dividers kept, click navigates and closes the menu.
- **AC 4/5/6 (LOG-020/021/023/024/050/052/070):** page spec covers order, h2, `Version 0.0.3`, `December 4, 2026` in `<time datetime>`, nested `<ul>`, `Coming soon` with no `<time>`, bad entries skipped (empty bullets, version 1.0.0), empty array and all-bad give `Nothing to show yet.`, plain-text binding, the shipped file = one `0.0.1` entry with the 5 LOG-050 bullets and title `Accounts are here` (strings match the spec exactly), no appVersion or stats (LOG-025).
- **AC 7 (LOG-031/022/041):** shipped file passes with the null date. The helper reports every listed case: duplicate versions, increasing, gap, 2026-02-30, 6 bullets, 61-char title, `a1b2c3d4e5`, null on a non-first entry (plus two nulls, date rising).
- **AC 8 (LOG-053/054):** see Release check above. The script is not in `test`, `lint`, `build` or `build:preview` (asserted by a tooling spec). Workflow: `firebase-hosting-deploy.yml` triggers only on `push` to `main` and `workflow_dispatch`; it is the only workflow, so PR and preview deploys are unaffected. The step runs after `npm ci`, before the build/deploy. A push to `main` will fail until the `0.0.1` date is set: intended (spec SHOULD, open question 2). README deploy/release notes describe the step (LOG-042).
- **AC 9 (LOG-040/042/043):** process rule, nothing to run. No version injected into the build or `appVersion` (grep of the diff: untouched). Release step is in README.
- **AC 10 (LOG-070/071):** semantic structure tested (one h1, h2 per entry, `ol`/`ul`, `time`); CSS has `max-width: 65ch`, centred, `overflow-wrap: anywhere`, flex-wrap on footer; footer link 44 px; menu items use Material's 48 px. Actual 320 px / dark theme rendering is for the ui-engineer's browser review, not run here.
- **Traceability:** page, data, route, footer, menu and tooling specs carry LOG and AC ids in test names (`changelog-page.spec.ts`, `changelog.spec.ts`, `changelog-release.spec.ts`, `app.routes.spec.ts`, `app.spec.ts`, `account-menu.spec.ts`).
- **Nothing deployed:** no deploy or push run; `git status` shows only the listed uncommitted files, `web/dist` is ignored. I started no servers.
- **Existing specs touched:** `provideRouter([])` added to three existing specs and the menu-structure helper now counts `a` items as items; all green.

## Builder choices judged against the spec
- Empty bullets / more than 5 bullets / over-long title skipped at run time: matches AC 5 and resolves the LOG-024 ambiguity noted in H-220 item 2. Accepted.
- Hash guard also on titles and treating a bare 7+ digit number as a hash: LOG-022 says "no commit hashes" for entries and LOG-041 defines the token rule (digit-containing hex); applying to titles is stricter but consistent. Accepted. Consequence: a bullet like "Up to 1234567 cards" would be rejected; documented in the test.
- Release-script messages `Changelog is not valid JSON.` / `Changelog is not a JSON array.`: the spec only requires non-zero exit for these; wording is free. Accepted.

## Failures
None.

## Follow-ups
- **H-221** (RJ, needs-RJ): review the page, links, `0.0.1` wording and the deploy-workflow check. (Loop Protocol review gate for a finished screen.)
- H-220 (spec-writer, already filed from H-201) still stands; the builder's run-time check matches the clarification H-220 item 2 asks the spec to state.
