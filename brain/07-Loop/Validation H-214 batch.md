# Validation H-214 batch

2026-11-27 · H-214, H-211, H-136, H-137, H-130, H-131, H-128, H-129, H-190, H-678 · **PASS** (SPEC-010 0.21.0, brain-only) · checks: Accept of each row read against `git diff` of [[Accounts and Sync]] (V-009: numbered reqs, Given/When/Then, links); no code changed, so build/tests SKIPPED.

- H-214 PASS with follow-up: (c) double-quoted pattern, `lastClientVersion` probe noted, (g) production result left `unverified` and tracked by H-683 (blocked on RJ merge + deploy). Acceptable: the result cannot exist before deploy.
- H-211 PASS (AC 74 `Zoé`, U+0301 explained). H-136 PASS (SYNC-050/113, data contract, repair rule). H-137 PASS (SYNC-007/012/118 per diff). H-190 PASS (disabled, SYNC-112, AC 80, AC 74).
- H-130 PASS (SYNC-004/048, AC 90; builder H-682). H-131 PASS (SYNC-009, AC 91; following other tabs is a MAY, marked "spec-writer's reading, not an RJ answer"). H-128 PASS (choices 1 to 5 recorded; Offline default marked as spec-writer's). H-129 PASS (SYNC-096 step 3, AC 92; wording marked "proposed, not RJ-confirmed"). H-678 PASS (SYNC-163, AC 93, reuses SYNC-084 text).
- Gate: the two new step-3 notices (SYNC-096 / AC 92) are new user-facing strings, RJ has not approved them; builder H-682 part (2) should not ship them until he does.
- Fixed: SYNC-160 (g) pointed at H-682 for the production check; now H-683. Appended a 0.21.0 entry to `Archive/Spec-Changelogs/Accounts and Sync changelog.md` (convention says new entries go there; 0.16 to 0.20.1 are missing, a known lapse).
