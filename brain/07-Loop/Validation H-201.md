---
tags: [loop, validation]
item: H-201
date: 2026-11-25
round: 1
result: PASS (H-201)
---
# Validation H-201: SPEC-012 Changelog ("What's new")

Item: [[Handoff Board]] H-201. Spec: [[Changelog]] 0.1 (LOG-001...LOG-060, ACs 1-10). Accept: spec with IDs and ACs; versioning rule stated; V-009 clean.

2026-11-25 · H-201 · **PASS** · V-009, brief coverage, cross-spec check against [[Accounts and Sync]] (SYNC-009, 012, 100, 104, 151, 158), version pins, buildability · 0 blocking failures, 2 non-blocking follow-ups (filed as H-220).

## Checks
- **V-009:** frontmatter (id, version, status, depends_on, research), Summary block, numbered requirements (LOG-001...060) with levels and sources, 10 Given/When/Then ACs, every ID cited in the ACs exists. All 4 wikilinks (Accounts and Sync, Privacy Notice Draft, ADR-0003 Tournament Results Only, Current State) resolve (scripted).
- **Index and board:** Spec Index row SPEC-012 0.1 draft matches frontmatter; SPEC-010 cited as 0.14.x (intended, parent is moving it to 0.14.2). H-202 row is filled in place (todo, depends H-201), no new IDs, `next_id` still 208, H-201 only moved to `doing`.
- **Brief coverage:** route `/changelog`, h1 and tab title "What's new"; public, never gated; footer and account-menu links; entry = version, date, plain summary; `0.0.X` rule (LOG-040) with RJ's quote; relation to `appVersion` (LOG-043, Definitions: no link except the release process); JSON data file updated by the release PR (LOG-042); first entry `0.0.1` with null date and "Coming soon" (LOG-050, 052), mirroring the privacy notice's release-day date; wording "the public changelog (the What's new page)" is specified in Impacts for H-200.
- **Cross-spec:** SYNC-012 does define `appVersion` as `web-<prod|preview>-<7 hex>`: matches. SYNC-009 public list (Home, Tournaments, styleguide, privacy notice) lacks `/changelog`: the spec flags this as an Impact, no conflict. SYNC-151 has exactly 3 dividers with Privacy notice (7) right before the last divider and Sign out; adding What's new after it in the same group keeps 3. SYNC-104 d/e and SYNC-158(a) footer row (theme switch, legal line) fit LOG-010. AC 3 order list is consistent with SYNC-151. `app.routes.ts` has the `**` redirect to Home, so `/changelogs` goes Home (LOG-001). SYNC-104 AC 66 does carry the `[RJ:` build check LOG-053 mirrors (the mirror is as a release-time script, stated).
- **Buildability, JSON import:** `web/tsconfig.json` has no `resolveJsonModule`, but TypeScript 6.0.3 with `"module": "preserve"` defaults to bundler resolution, where JSON imports are on. Run for real: a temp file importing a `.json` array with `"date": null` type-checks (`tsc` exit 0) under the web tsconfig, and `web/src/tooling/preview-deploy.spec.ts` already imports JSON. So the `.json` path works without a config change; the `.ts` fallback is not needed. Builder note: a one-entry file infers `date: null`, so cast to `ChangelogEntry[]`.
- **Buildability, release check:** `web/scripts/` (.mjs files) and `npm --prefix web run ...` pattern exist; `.github/workflows/firebase-hosting-deploy.yml` exists (the SHOULD step is plausible); web `package.json` has no `check:changelog-release` yet (expected, H-202).
- **Internal consistency:** LOG-050 title (16 chars) and bullets (all under 140) pass LOG-022/041; no hex-hash token. LOG-041 (versions strictly decreasing, oldest `0.0.1`) agrees with the first entry and ACs 4, 7, 9.
- Code checks (tests, build): SKIPPED (docs-only change).

## Non-blocking follow-ups (H-220, spec-writer, P2)
1. Apply the Impacts to SPEC-010 (SYNC-009 public list, SYNC-104 d/e, SYNC-151 item 7, AC 68, footer wording) after H-200 and H-206 land, as the spec itself says.
2. LOG-024 ambiguity: it skips an entry failing "the shape check of LOG-030", but the field rules sit in LOG-031, which allow `bullets: []`, while AC 5 expects an empty-bullets entry to be skipped (the 1 to 5 count is in LOG-022, described as unit-test only). Name the run-time check exactly.
