---
tags: [sessions]
---
# Session Log

Newest first. One short entry per working session.

Older entries: [[Session Log 2026-11-24 (late)]], [[Session Log 2026-11-24]], [[Session Log 2026-11-24 (day)]] and [[Session Log 2026-11-23 (early)]] (archived).

## 2026-11-25: `/board 5` (orchestrator; RJ asked for H-172 and H-152 first)
- Before the run: RJ decided to launch with **Email link only, no Google OAuth for now**. That is recorded on H-063 together with the console checklist for production: reply-to to a support inbox, app name, authorized domains, delete protection, enumeration protection, App Check optional.
- Round 1: **H-172** (builder): local-only mode is removed from `web/` and the cache rules are tested. Validator **PASS** ([[Validation H-172]]): lint, build, 712 tests. Not deployed. **PR #29 open for RJ** (code). It also carries the H-063 board note `1d9f573`.
- Round 2: **H-152** (spec-writer): SPEC-010 0.13 adds the privacy notice SYNC-101/103/104 and ACs 65–70, plus [[Privacy Notice Draft]] (`review`, blanks for RJ). **PASS**. **PR #30 merged by the loop.** Filed H-180 (build `/privacy`), H-181 (draft wording) and gate **H-182** (RJ approves the notice).
- Round 3: **H-174** (spec-writer, picked ahead of the usual order because it is on the launch path): SPEC-010 0.14 adds the header account, username, per-device theme `device-theme`, the import FABs and the removal of `/import` (→ Home); it also updates SPEC-003 0.12, 005 0.7, 006 0.9 and 007 0.12, and records H-179. **PASS**. **PR #31 merged by the loop.** Filed H-183, H-184 and gate **H-185** (Open question 13).
- Round 4: **H-183** (spec-writer): username limits now agree. The client allows 24 graphemes and at most 500 UTF-16 units; the rules allow `size()` up to 2000. SPEC-010 is 0.14.1. **PASS**. **PR #32 merged by the loop.**
- Round 5: **H-091** (spec-writer): SPEC-007 0.13 is `review`. RJ's Collection decisions are applied and the deferrals are written as proposals. **PASS**. **PR #33 merged by the loop.** Filed H-186, H-188 and gate **H-187** (Open questions 11–15).
- Next: RJ merges PR #29 (H-172) and this run's PR, answers H-182, H-185 and H-187, and finishes H-063. The loop then picks H-176 (header build, once #29 is merged), H-186, H-181, H-164…H-167, then H-180 after H-176. Hold `main` (H-179).

## 2026-11-24: `/board 3` (orchestrator; RJ asked for H-171, H-175 first)
- Round 1: **H-171** (spec-writer) account-only specs per ADR-0007 amendment 2: SPEC-010 0.12 (local-only mode and `signInEnabled` gone, SYNC-007 production release rule, browser cache SYNC-140…146: whole account cached, cleared on 4 events, never uploaded, scrolling reads nothing), COLL-093 smooth scrolling (+ OWN-084, CAT-079), COLL-074 / SYNC-008 / SYNC-052 withdrawn; SPEC-003 0.11, 004 0.6, 005 0.6, 006 0.8, 007 0.11, 008 0.4.4. Validator **FAIL** (split wikilink, stale Out-of-scope lines, v0.8 Impacts text) → H-177; WIP committed.
- Round 2: H-171 attempt 2 (H-177 fixes) → Validator **PASS** ([[Validation H-171]]). **PR #24 merged by the loop** (brain-only). Open questions OQ 10 / 11 parked as **H-179** (non-blocking).
- Round 3: **H-175** (ui-engineer) [[Brief H-175]]: header account control, account menu, `/account` settings page, username dialog, "Add to your collection" FAB, "Import deck", 3-tab phone bar, 16 acceptance points. Validator PASS ([[Validation H-175]]). **PR #25 merged by the loop.** Gate parked: **H-178** (RJ: 8 choices + `/import` → Home); H-174 and H-176 now wait on it.
- Skipped by RJ's request this run: H-164…H-167 (P1 spec-writer, research follow-ups) — next run picks them.
- Next: RJ answers H-178 and H-179; H-172 (builder, account-only code, now unblocked); H-164…H-167; H-173 (scrolling brief).
