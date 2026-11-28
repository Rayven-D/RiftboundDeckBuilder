2026-11-27 · H-682 part (2) + H-075 · PASS · lint (`ng lint`) clean; full web suite `ng test` 103 files / 1616 tests pass (Node 22.23.5) · no failures

- H-682 (2): `reauthNeededAfterData` in `sync-engine.ts` equals the RJ-approved text exactly (AC 92 email-link half); used only at step 3 (`reauth(true)`); step 1 keeps its own text; no Google notice (a) built.
- H-075: (1) shortfalls hook obsolete: SYNC-068/074 v0.18 are rewritten as lock drops, no `shortfalls` hook to wire; (2) `web/src/tooling/no-local-delete.spec.ts` greps web/src for the two banned names, passes; (3) SYNC-123 warning via `EngineDeps.warn` (default console.warn), message has sizes only, no uid; counts tombstones, once per page load, both consistent with SYNC-123 (SHOULD, "logs a warning").
- Rules, adapter and emulator tests untouched (git status shows only sync-engine, push-plan, device test helper, specs). API Contracts v1.41 matches: no endpoint or stored-shape change.
- Spec gap (real): SYNC-096 (3) "step 1 runs again" vs AC 92. A retried deletion whose step 1 returns `'needs-sign-in'` after data is gone shows the step-1 text. Filed H-686 (spec-writer, P3).
