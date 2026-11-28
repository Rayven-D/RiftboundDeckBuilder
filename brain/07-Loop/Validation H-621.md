# Validation H-621

2026-11-27 · H-621 · PASS · checks: diff review of [[Firestore Data Shape]] against [[Accounts and Sync]] (SYNC-050 / SYNC-113), grep for stale `PushChanges.batch` / "4 + N" citations, status/as_of intact · failures: none.

- `PushChanges.batch` now appears only as "removed" (lines 75, 296); the "4 + N writes in batches" row is replaced by "at most 1" (SYNC-050); one-document-at-a-time, account first, stated.
- Front matter `status: proposed`, `as_of: 2026-11-26` and source tables untouched (3 hunks, all in scope).
- Board diff note: the H-621 status cell is changed todo to verify. The same uncommitted board diff also holds an H-021 row edit (ADR-0009 RiftHunt comparison, RJ 2026-11-27) from other work; not part of H-621.
