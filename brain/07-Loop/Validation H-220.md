---
tags: [validation]
item: H-220
---
# Validation H-220

2026-11-25 · H-220 · PASS · V-009 (numbering, GWT, wikilinks, versions), LOG-024/AC 5 vs `changelog.ts` and `changelog.spec.ts`, SPEC-010 order lists vs `account-menu.ts` and `app.html`, diff review, version pins · failures: none

- Versions: SPEC-010 0.16.0 → 0.16.1 and SPEC-012 0.1 → 0.1.1; frontmatter equals the Spec Index rows; version-history lines added in both specs.
- LOG-024 / AC 5 match the code: `entryErrors` (LOG-031 fields, 1 to 60 / 1 to 5 / 1 to 140 with whitespace-only = empty, `hasHashLikeToken` on title and every bullet, 7 to 40 hex chars with a digit so `1234567` counts), `showableEntries` runs only the per-entry check, no whole-file rules, file order kept. Tests cover bullets `[]`, version `1.0.0`, 6 bullets, 61-char title, `a1b2c3d4e5`, `1234567` (via `hasHashLikeToken`).
- LOG-053 messages match `web/scripts/changelog-release.mjs` (`Changelog is not valid JSON.`, `Changelog is not a JSON array.`).
- SPEC-010 order lists (SYNC-104 d/e, SYNC-151 item 7, SYNC-158 a, ACs 54, 68, 69, 72) agree: ..., Theme, Privacy notice, What's new, Sign out; footer Privacy notice then What's new; 3 dividers. Built menu and footer match (What's new after Account Information/Theme, 3 `mat-divider`s; Privacy notice is marked "H-180, not built"). The spec says `/privacy` and its links are H-180 and not built, so it does not claim them built.
- Diff review: only the listed requirements changed; no unrelated requirement edits. Board: H-202 `done`, H-220 `doing` as intended.
- Pins: no stale "current" pins of SPEC-010/012 in `brain/02-Specs/`. `Test Data.md` line 38 pins "Accounts and Sync 0.16.0": acceptable (0.16.1 is text-only for the public list, menu and footer order; test data uses only the SYNC-009 gate, unchanged in meaning).
- Wikilinks added ([[Changelog]], [[Validation H-202]], [[Critique H-202 Changelog]]) resolve.
- Nothing run in code (docs-only change).
