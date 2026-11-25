---
tags: [archive, changelog]
archived: true
archived_on: 2026-11-23
reason: spec changelog
superseded_by: "[[Accounts and Sync]]"
---
# Accounts and Sync changelog

Newest first. New changelog entries for the spec go here.

- 0.6.1 (2026-11-24, H-071): metadata only. Dependency pins updated to SPEC-003 0.9.1, SPEC-005 0.5, SPEC-006 0.7,
  SPEC-007 0.9, SPEC-008 0.4.1 (SPEC-009 withdrawn). The Impacts section is marked applied (IMP-053, COLL-070,
  DECK-090, SHARE-060 wording; DECK-074 monotonic `updatedAt`; `TagId` / `StoredTags` 3 / COLL-074; ADR-0007
  pointer). No SYNC requirement changed.
- 0.6 (2026-11-23, RJ: "i did email. update the specs to work in google later but stick with email for now"):
  SYNC-006 and RJ decision 1: email link is the only launch provider; Google stays specified but off; enabled
  providers come from build config `authProviders` (default `['email-link']`), so adding `'google'` needs only
  the config change plus enabling it in the console. SYNC-003 points to it. SYNC-096 step 1: with email link,
  re-authentication means signing in again with a fresh link ("To delete your account, sign out, sign in again,
  then choose Delete account and data within 5 minutes."), nothing deleted; the Google popup applies only when
  Google is enabled. `AuthService.providers()` / `reauthenticate()` comments updated (`'needs-sign-in'`). AC 1
  shows exactly the enabled providers (default: only "Sign in with an email link"); AC 38 adds the stale
  email-link case. Still 89 requirements (81 MUST, 3 SHOULD, 5 MUST NOT); 38 ACs.

- 0.5 (2026-11-23, RJ's answers to the 11 open questions): "Open questions for RJ" replaced by **Decisions
  (RJ, 2026-11-23)**, quoting each answer. SYNC-006: providers Google and email link ("Continue with Google",
  "Sign in with an email link"). SYNC-071/072/074/049/090 cite RJ decisions 4/3/2/5/6 (defaults confirmed). New
  **SYNC-077**: every deck status (ownership group, lock badge incl. "cards short", fill and labels, shared
  indicator, Lock in reason) is identical on every signed-in device once synced; statuses are computed only from
  synced data plus the catalog, never stored; view state, saved views, printing-code memory, import Undo snapshot
  and sync log never affect them (so none needs syncing); listed per-device exceptions are always visible
  (pending, rejected, unreadable, newer schema, invalid item, different `catalogVersion`). SYNC-095/096: no
  keep-a-copy option; deleting the account always clears this device; type `delete` kept. SYNC-097 half-deleted
  branch: sign out, write nothing, keep local data as signed-out data, clear linked uid; Upload path removed (also
  from SYNC-048 f); SYNC-004 and SYNC-098 residual risks updated. SYNC-034/083 cite decision 9 (accepted for now,
  may be revisited). SYNC-101 cites H-069 and decision 10. ACs 1, 28, 36 updated; new ACs 37 (same status on two
  devices) and 38 (delete without keep-a-copy). 89 requirements (81 MUST, 3 SHOULD, 5 MUST NOT); 38 ACs; no open
  questions for RJ.

- 0.4 (2026-11-23, H-061 validator round 3, [[Validation H-061]]):
  **(1)** SYNC-041: tag assignment lists the merge rewrites (ids moved by SYNC-065, ids removed by SYNC-066,
  SYNC-064 Combine unions) are stamped `max(now, pulled t + 1)` and pending, like the SYNC-065/071 tombstones, so
  other devices receive them; AC 5 and AC 14 now check the other device's lists after its next pull.
  **(2)** SYNC-053: a denied create or a not-found `update()` repeats the account check once; account document
  missing → SYNC-097, present → SYNC-118 (rejected, not retried), so no retry loop; defines when a write is a
  create (no `knownDecks` entry and never written by this device; for `state`, not returned by the last full
  read and never written). AC 29 now has an existing-deck (update) case and a new-deck (create) case.
  Non-blocking: SYNC-097 lists the denied-create signal; SYNC-098 adds the Upload-vs-deletion-retry race to the
  residual risks; SYNC-030 lists `h` hashes, `recordUpdatedAt`, `knownDecks` and `rejected`. Still 88
  requirements (80 MUST, 3 SHOULD, 5 MUST NOT); 36 ACs; 11 open questions.

- 0.3 (2026-11-23, H-061 validator round 2, [[Validation H-061]]):
  **(1)** SYNC-041: saves made by the sync engine (merge, SYNC-044 deletions) are exempt from SYNC-031
  stamping, keep the pulled `t` / `updatedAt` / `deletedAt`, are not pending (except SYNC-042 local winners and
  the tombstones SYNC-065/071 create), and update `recordUpdatedAt`, item hashes and `knownDecks` in the same
  save; SYNC-031 now applies to user saves only; new AC 34 (nothing pending after a pull, reload pushes
  nothing). **(2)** SYNC-113 counts ≤ 1 billed read per created document and marks `existsAfter()` same-batch
  billing, repeated-lookup billing and the per-request lookup limit `unverified`; SYNC-120 and AC 3 now count
  them (first sign-in ≤ 3 + 3 + N reads, ≤ 16 for 10 decks; new deck ≤ 1 extra read); Impacts note the
  Firestore Data Shape read estimates (3 per reopen) are stale. **(3)** AC 33 rewritten (199 live + 201
  tombstones, create a tag, oldest tombstone dropped, map stays 400). **(4)** AC 28: each scenario has its own
  When. Non-blocking: SYNC-053 sends `update()` not-found and denied creates to the account check, not SYNC-118;
  SYNC-032 reconcile stamps only items whose per-item value hash changed (`h` in the sync log); SYNC-048 edge
  cases (e) account document with no data (no `set()` over it) and (f) leftovers without an account document
  (never imported, half-deleted branch, Upload deletes them first; SYNC-097 matches); SYNC-007 notes preview URLs
  are public (obscurity, not access control); new ACs 35 (build flag) and 36 (edge cases). Still 88
  requirements (80 MUST, 3 SHOULD, 5 MUST NOT); 36 ACs; 11 open questions.

- 0.2 (2026-11-23, H-061 validator fixes, [[Validation H-061]]):
  **(1)** SYNC-031: deck `updatedAt = max(now, previous + 1 ms)` on save and `deletedAt = max(now, updatedAt +
  1 ms)` on delete; Impacts list SPEC-006 DECK-074; new AC 24 (lagging clock). **(2)** AC 6 second scenario
  rewritten so the sequence is possible and converges (cloud briefly holds the older value). **(3)** SYNC-004 /
  048 / 049: the linked uid and `lastFullSyncAt` are written only when the first sync completes; Cancel writes
  neither; new AC 25. **(4)** New `sessionExpected` flag (cleared by every sign-out, Cancel, deletion) decides
  whether `firebase` loads at start-up (SYNC-002/004/091); SYNC-086 applies only while a session is expected;
  new ACs 26, 27. **(5)** Account document is the "account exists" marker (design decision 8): created only by
  the first-sign-in flow, deleted first (SYNC-096); new SYNC-053 (account check before any write, not-found on
  `update()` triggers it); SYNC-097 names the signals and `AuthService.checkAccount()` results (provider error
  mapping `unverified`, confirm in H-062), half-deleted case pauses sync; SYNC-113 allows `existsAfter()` on
  creates only; SYNC-098 states the residual risk; new AC 28. **(6)** SYNC-112: `importRemovedLines` has no cap
  (SPEC-006 sets none; 1 MiB bounds it); `format` / `sourceFormat` checked against SPEC-002 `FormatId` /
  SPEC-006 `DeckSourceFormat`; `catalogVersion` and `lastClientVersion` caps sourced as design caps (CARD-068
  example); new SYNC-118 (rejected writes stay pending, reported, not retried until changed); new AC 29.
  Non-blocking: design decision 7 + SYNC-119 (map caps, early tombstone drop; AC 33); SYNC-032 reconcile on load;
  SYNC-043 pre-push window limitation; SYNC-040/120 read counts (3 at start-up, 2 later); `AuthService`
  `reauthenticate()`; mapping rows for `schemaVersion`/`updatedAt`, tombstone fields; SYNC-018 `set()` without
  merge; Summary ranges; AC 16 and AC 18 wording; new ACs 30–32 (SYNC-047, 052, 073); new SYNC-007 build flag
  `signInEnabled` gates sign-in until the privacy notice is approved. Open question 11 added (half-deleted
  account). 88 requirements (80 MUST, 3 SHOULD, 5 MUST NOT), 33 ACs, 11 open questions.

- 0.1 (2026-11-23, H-061): first draft from [[ADR-0007 Firebase Accounts and Firestore]] and
  [[Firestore Data Shape]]. Optional sign-in (signed out loads no Firebase); layout `users/{uid}`,
  `state/collection` (`cards` map `cardKey` → `{q, t, p}`, `FieldPath` per card, `q: 0` tombstone),
  `state/tags` (map by 8-character `TagId`, assignments `{a, t}`), `state/locks` (`{lockedAt | null,
  updatedAt}`), `decks/{deckId}` (UserDeck + `deletedAt` tombstone); `schemaVersion` / `updatedAt` /
  `syncedAt` on every document. Device-local sync log for stamps, tombstones (30 days), pending items and
  cursors, so SPEC-003/006/007/008 record shapes stay as they are (except short tag ids, `StoredTags` v3).
  Pull / merge / push flows, first sign-in Combine dialog, latest change wins per item with monotonic stamps
  and cloud-wins ties, locks across devices (deletion drops the lock, edited-while-locked stays locked, short
  after merge stays locked and flagged), offline and status, sign-out keep or remove, delete account and data,
  privacy (privacy-notice legal content blocked on research), owner-only rules with field validation and
  emulator tests, index exemptions, free-tier cost limits, adapters behind interfaces. 84 requirements
  (SYNC-001…131: 76 MUST, 3 SHOULD, 5 MUST NOT), 23 ACs, 10 open questions for RJ.
