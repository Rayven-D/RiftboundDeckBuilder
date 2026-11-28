# Validation H-682 (part 1) and H-133

2026-11-27 · H-682 part 1 · PASS · lint, `ng test --watch=false` (Node 22.23.5), diff review · no failures. Part 2 not built (H-684); row stays `todo`.
2026-11-27 · H-133 · PASS · same · no failures. Row stays `verify`.

- `npx ng lint`: all files pass. `npx ng test --watch=false`: 101 files, 1598 tests passed. Emulator tests not run: the diff touches no rules or adapter files.
- AC 90 (`sync-engine-h682-h133.spec.ts`): an old Keep a copy log (uid uA, `lastFullSyncAt` set, `sessionExpected` false, one pending signed-out change) signs in as uA. No state or deck writes, the signed-out change is cleared and the cloud downloaded. A reload before the first sync completes reruns the flow. A lost session (`sessionExpected` true) still resumes and pushes. The code clears `lastFullSyncAt` before `sessionExpected` is set, so these exercise the clear-first path.
- `sync-engine-first-sign-in.spec.ts` 'failed' to 'signed-out' matches SYNC-096: sign-out stays allowed during a deletion and clears `deletingUid`. The spec sets no failure notice for it.
- H-133: `deleteAccount()` returns `'signed-out'` (`!uid` or a stale generation after a failure). The account menu shows no failure notice or Try again for it, and sign-out dismisses an open failure notice. The failure notice now uses `noticeOptions('error')`, which puts it at the top (H-671).
- [[API Contracts]] does not list `deleteAccount` results (only the dialog data), so nothing to update.
- Follow-ups: none.
