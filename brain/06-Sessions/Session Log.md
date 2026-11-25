---
tags: [sessions]
---
# Session Log

Newest first. One short entry per working session.

Older entries: [[Session Log 2026-11-24 (late)]], [[Session Log 2026-11-24]], [[Session Log 2026-11-24 (day)]] and [[Session Log 2026-11-23 (early)]] (archived).

## 2026-11-25: H-207 username 20 characters, no emoji (builder)
- Built SPEC-010 v0.15.0 SYNC-153/156/112: the client normalizes (NFC, trim, collapse `\p{Zs}`), counts code points (at most 20, marks count, no `Intl.Segmenter` for counting), accepts only the SYNC-153 (4) set with no variation selector; length error before the character error; counter `n / 20` turns to the error colour with an icon above 20. `firestore.rules`: username `size()` 1–80, checked only when the request changes it (create still denied). [[API Contracts]] v1.17.
- Chosen behaviour (for spec): a Save of the unchanged value closes before the check runs, so a v0.14 name that breaks the new rules is not re-checked until changed. AC 74's "`Zoë` typed as `e` + U+0301" names the wrong mark (U+0301 gives `é`; `ë` is U+0308); tests cover both.
- Checks: web lint clean, build OK, 807 unit tests, rules 50/50 (JDK 21). Not committed or deployed (orchestrator).

## 2026-11-25: `/board 5` (orchestrator; RJ asked for H-176 first)
- Round 1: **H-176** (builder): built the header account control, account menu and Account Information dialog, username (client 24 graphemes / 500 UTF-16 units; rules `size()` 1–2000; the emulator counts **UTF-16 units**), theme per device `device-theme` (inline script before first paint, footer and menu), Collection / Decks import FABs, and removed `/import`. Validator **PASS** ([[Validation H-176]]): lint, build, 777 unit tests; rules 40/40 on a partial run because the builder's leftover emulators held the ports. **PR #35 open for RJ**, gate **H-189**, follow-ups H-190, H-191. RJ asked for H-189 to run in its own session (worktree on the PR branch), which reviews, fixes and re-validates.
- Rounds 2–4: **H-164** (spec-writer), SPEC-002 0.4 `review` from H-022 research. **FAIL** on attempt 1 (inferred 2v2 split, stale pins) and attempt 2 (dated AC 22 count), **PASS** on attempt 3 ([[Validation H-164]]). **PR #36 merged by the loop.** Filed gate **H-193** (SPEC-002 review: promos by name, SAMPLE, 2v2 as data), build H-194, research tidy-ups H-192.
- Round 5: **H-165** (spec-writer), SPEC-001 0.4 `review` (CARD-034 leading-"The" lookup fallback, ARC, promo codes, CARD-044 SAMPLE marker). **FAIL** ([[Validation H-165]]): AC 6 example contradicts CARD-034, an unreachable ambiguous branch, and a conflict with SPEC-003 IMP-025 / IMP-059 / AC 24. WIP kept locally; back to `todo` (attempt 1). Filed H-195 (API Contracts SPEC-001 pins) and H-196 (ARC legality research).
- Process: memory note corrected (agent shells still find Java 17 first; prepend the JDK 21 bin for `test:rules`). The builder's `ng serve` and emulators outlived its run; the permission classifier blocked stopping them, and they ended on their own later.
- Next: RJ reviews and merges PR #35 (after H-189), answers H-182, H-185, H-187 and H-193. The loop retries H-165 (attempt 2), then H-186, H-166, H-167, H-181, H-190; H-180 `/privacy` after #35 is merged. Hold `main` (H-179).

## 2026-11-25: `/board 5` (orchestrator; RJ asked for H-172 and H-152 first)
- Before the run: RJ decided to launch with **Email link only, no Google OAuth for now**. That is recorded on H-063 together with the console checklist for production: reply-to to a support inbox, app name, authorized domains, delete protection, enumeration protection, App Check optional.
- Round 1: **H-172** (builder): local-only mode is removed from `web/` and the cache rules are tested. Validator **PASS** ([[Validation H-172]]): lint, build, 712 tests. Not deployed. **PR #29 open for RJ** (code). It also carries the H-063 board note `1d9f573`.
- Round 2: **H-152** (spec-writer): SPEC-010 0.13 adds the privacy notice SYNC-101/103/104 and ACs 65–70, plus [[Privacy Notice Draft]] (`review`, blanks for RJ). **PASS**. **PR #30 merged by the loop.** Filed H-180 (build `/privacy`), H-181 (draft wording) and gate **H-182** (RJ approves the notice).
- Round 3: **H-174** (spec-writer, picked ahead of the usual order because it is on the launch path): SPEC-010 0.14 adds the header account, username, per-device theme `device-theme`, the import FABs and the removal of `/import` (→ Home); it also updates SPEC-003 0.12, 005 0.7, 006 0.9 and 007 0.12, and records H-179. **PASS**. **PR #31 merged by the loop.** Filed H-183, H-184 and gate **H-185** (Open question 13).
- Round 4: **H-183** (spec-writer): username limits now agree. The client allows 24 graphemes and at most 500 UTF-16 units; the rules allow `size()` up to 2000. SPEC-010 is 0.14.1. **PASS**. **PR #32 merged by the loop.**
- Round 5: **H-091** (spec-writer): SPEC-007 0.13 is `review`. RJ's Collection decisions are applied and the deferrals are written as proposals. **PASS**. **PR #33 merged by the loop.** Filed H-186, H-188 and gate **H-187** (Open questions 11–15).
- Next: RJ merges PR #29 (H-172) and this run's PR, answers H-182, H-185 and H-187, and finishes H-063. The loop then picks H-176 (header build, once #29 is merged), H-186, H-181, H-164…H-167, then H-180 after H-176. Hold `main` (H-179).
