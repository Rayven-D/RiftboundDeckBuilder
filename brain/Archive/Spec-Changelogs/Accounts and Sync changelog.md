---
tags: [archive, changelog]
archived: true
archived_on: 2026-11-23
reason: spec changelog
superseded_by: "[[Accounts and Sync]]"
---
# Accounts and Sync changelog

Newest first. New changelog entries for the spec go here.

- 0.12 (2026-11-24, H-171, RJ decision 17, [[ADR-0007 Firebase Accounts and Firestore]] amendment 2, account-only;
  build H-172): **removed** the `signInEnabled` flag and local-only mode. SYNC-008 ("Two modes") and SYNC-052
  ("Delete all local data by mode") withdrawn, IDs retired. SYNC-007 rewritten from "Sign-in is gated by a build
  flag" to the **production release rule**: the account-only build is not deployed to production until H-063 (Auth
  providers), H-152 (privacy notice) and the Firestore rules (SYNC-117) are done; production keeps its current
  build and only preview channels run the new one; the preview deploy path (H-078) stays, minus the flag.
  SYNC-001 ("Accounts by mode") now "Account-only"; SYNC-002, SYNC-009 (gate always on), SYNC-031 / 032 (no
  "stamp but never push" branch), SYNC-048 ("legacy local data" → "stale local data"), SYNC-080, SYNC-086,
  SYNC-097, SYNC-101 (the notice also says what the browser keeps), SYNC-125 lose their mode wording. New
  section M **Browser cache**, SYNC-140 (cache never the record of truth, pending changes the only exception),
  SYNC-141 (what: session; the whole collection, tags, locks and every deck, justified by the existing full
  read, 2-3 reads per reopen, ≈ 95 KB typical / 640 KB heavy; sync log; device preferences; public catalog and
  images not cleared), SYNC-142 (cleared exactly on sign-out, account deletion, deleted / half-deleted account
  sign-outs, a different account's first sign-in; not on reload, offline, lost session), SYNC-143 (never
  uploaded), SYNC-144 (cache first, then fresh), SYNC-145 (scrolling and browsing make no Firestore reads;
  smooth scrolling per COLL-093 / OWN-084 / CAT-079), SYNC-146 (the browser may drop it; pending changes then
  lost, SYNC-098 residual risk). Definitions: Browser cache, Stale local data (replaces Legacy local data),
  Local stores. Design decision 1 rewritten. ACs 31 (now "No delete-all-local action"), 35 (no flag, preview
  deploy path), 45 (now "No import without an account"), 48 (first account-only build on a browser with old
  data) rewritten; ACs 1, 3, 5, 36, 39, 46, 49 de-moded; ACs 59–64 new (cache contents, cache clears, never
  uploaded, scrolling reads nothing, no local-only code left, production release rule). Decision 17 added;
  decisions 10 and 13 (c) marked superseded in part; Open questions 10 (how to hold production back) and 11
  (how much to cache) for RJ. Impacts: SPEC-003…008 applied (IMP-053/076, CAT-077/078/079, OWN-066/084/093,
  DECK-087/090/097, COLL-070/074 withdrawn/092/093, SHARE-060) plus the 7-point H-172 change list. Pins SPEC-003
  0.11, SPEC-004 0.6, SPEC-005 0.6, SPEC-006 0.8, SPEC-007 0.11, SPEC-008 0.4.4.
- 0.11.2 (2026-11-25, H-160): metadata and Impacts only, no requirement changed. The v0.8 Impacts for SPEC-003
  (0.10.1), SPEC-004 (0.5.1), SPEC-005 (0.5.2), SPEC-006 (0.7.1), SPEC-007 (0.10.1) and SPEC-008 (0.4.3) are marked
  applied. Dependency pins updated to those versions.
- 0.11.1 (2026-11-25, merge of the nightly `/board` line into the v0.11 line): metadata only. Dependency pins
  SPEC-003 0.10, SPEC-004 0.5, SPEC-005 0.5.1, SPEC-006 0.7, SPEC-007 0.10, SPEC-008 0.4.2 (SPEC-009 withdrawn).
  Impacts: the v0.7 items H-071 applied are marked applied; the v0.8 per-mode wording, COLL-074 by mode and the
  gate notes are left for H-160. The nightly line had numbered this pin update 0.6.1 (from 0.6); 0.6.1 never
  existed on the v0.7…v0.11 line. No SYNC requirement changed.

- 0.11 (2026-11-24, H-146, from [[Validation H-140 H-125 H-108]], [[Validation H-113 H-116 H-123 H-126]] and
  [[Validation H-145]]; documents the build, no behaviour change): **SYNC-006:** "disabled" for Send link, Send
  again and Use a different email means Material `disabledInteractive`: `aria-disabled="true"`, a press does
  nothing, focus stays on the button (not the native `disabled` attribute); Send link is also disabled with no '@'
  in the field and offline, as built. The other-device confirm is a dialog titled "Finish signing in" with the
  text "Confirm your email address to finish signing in.", an "Email address" field, and **Cancel** / **Finish
  sign-in**; Finish stays disabled until the trimmed value has an '@'; Enter submits; Cancel, Escape and the
  backdrop count as no address. The emulator's continue-URL behaviour (checked in H-145) replaces the
  `unverified` note; production stays `unverified`. **New SYNC-087 notice kinds** (as built in H-116): `success`
  closes after 6 s, polite ("Your account and its data were deleted.", "Your account wasn't deleted.", "You're
  signed in."); `info` stays until OK, polite; `error` stays until OK, assertive (the only assertive kind); a
  missing kind = `info`; the deleteIncomplete Try again notice is assertive; COLL-054 Undo (at least 8 s) stays
  outside the 6 s rule; the sync status messages of SYNC-033, SYNC-047, SYNC-083, SYNC-084 and SYNC-118 are
  account-menu status text, not notices, with no kind ([[Validation H-146]] F1). **SYNC-063:** the clock warning is
  an `info` notice, as built (was "the account menu shows"). **ACs:** 39 (confirm dialog strings, Finish disabled, Enter, Cancel), 50 and 51
  (`aria-disabled`, focus kept, no second request), 52 (the URL is `/import?type=deck` when the sign-in completes
  and "You're signed in." shows; the Import page may drop `?type=` afterwards) reworded; AC 58 new (notice
  kinds). **Impacts:** the Home page copy bullet now records the built rule (local-only "Free", account-required
  "Free account", by `signInEnabled`, RJ 2026-11-24, H-126). **RJ 2026-11-24** ("all those look good to me"):
  Open questions 1–9 and the confirm title confirmed, new decision 16; every "RJ to confirm" marker removed; H-083
  closed. All v0.10 "pending build" markers now read "built" (H-104, H-106, H-122, H-140…H-145). Builder items:
  none (the wording matches the build).

- 0.10 (2026-11-24, [[UI Review 2026-11-24]] spec rows H-103, H-105, H-107, H-109, H-111, H-112, H-117, H-118,
  H-119, H-121; RJ decision 15): **SYNC-006:** email link as the only provider shows the email form straight
  away (no provider button; with two providers the reveal moves focus to the field); Send link reads
  "Sending…"; own send-failure text "Couldn't send the link. Check the address and your connection, then try
  again." (SYNC-005 no longer used for it); sent state "We sent a sign-in link to {address}. Open it on this
  device to finish signing in." / "Didn't get it? Check your spam folder." with Send again (no cooldown) and Use
  a different email; the link returns to the start page (path + query) and "You're signed in." shows once.
  **SYNC-003 / SYNC-100:** "Signed in as {email}" as the account menu's first line, read from Auth, never
  stored. **SYNC-096 / SYNC-084:** during an unfinished deletion no Sync now, no pending count, menu action "Try
  deleting again". **SYNC-095:** sign-in-first state of the delete dialog (reuses the step 1 text; Sign out opens
  the Sign out dialog). **SYNC-090:** Sync now reads "Syncing…" while it runs, Cancel stays enabled, the plain
  explanation stays under the warning. **SYNC-009 / SYNC-086 (RJ decision 15):** signed-out panel line "Sign in
  or create an account to start keeping track of your collections and decks" (was "You need a free account to
  import cards or decks."); lost-session line "You've been signed out. Sign in again to continue." (was "…to see
  them."); no panel headings in any state. Data contract: `AuthService.currentEmail()`, `canReauthenticate()`,
  `sendEmailLink(email, returnTo?)`. ACs 1, 26, 27, 38, 43, 46, 47 changed; ACs 49–57 new. Decision 15 added,
  decision 14 (b) superseded. Open questions 3–9 (RJ to confirm). Build: H-104, H-106, H-110, H-115, H-122
  extended; H-140…H-145 new.

- 0.9 (2026-11-24, H-134, RJ decision 14): SYNC-009: a gated page keeps its page header (title and
  description); only the content below it is replaced by the sign-in panel. Signed-out panel text is exactly
  "You need a free account to import cards or decks." (was "...cards and decks. Tournaments are open to
  everyone."); text pending build H-135, header as built. AC 46 checks both. Summary key rules line and the
  Decisions section (new decision 14) follow. Requirement and AC counts unchanged.

- 0.8 (2026-11-24, H-080: account required to import, RJ decision 13; ADR-0007 amendment `proposed`):
  **Modes:** new SYNC-008: `signInEnabled: false` = local-only mode, unchanged; `true` = account-required mode.
  SYNC-001 rewritten by mode. **Gates:** new SYNC-009: Decks, deck detail, Collection, Import and "Add to your
  decks" show a sign-in panel when signed out; Home, Tournaments, `/styleguide` and the privacy notice are public;
  the gate is read from the sync log (open offline and during a lost session); "Getting…" state during the first
  sync. **First sign-in:** SYNC-048 clears every local store and the sync log, then full read, then download;
  cases (b) upload and (d) Combine removed; (f) clears; an interrupted flow starts over; `uploadingUid` no longer
  written. SYNC-049 becomes MUST NOT (no Combine). SYNC-050: at most 1 write (account create, or one account
  `update()` for a new build), no `state` / `decks` writes, no `batch` (H-077). SYNC-064: Combine union removed.
  **Sign-out:** SYNC-090 one choice (Sign out / Cancel) with the unsynced-changes step (Sync now, Sign out
  anyway); SYNC-091 sign-out clears the device. SYNC-004 and the linked-uid / session-expected definitions
  follow. SYNC-052: Delete all local data not offered in account-required mode. **Deletion:** SYNC-096 account
  menu Try again after reload, `deletingRemovedAny` rules (H-127), sign-out clears `deletingUid`; SYNC-097
  `deleted` and half-deleted branches clear the device (new half-deleted message); SYNC-098 residual risks
  rewritten. **Build id and deploy:** SYNC-012 `appVersion` = `web-<prod|preview>-<short commit>` (or UTC build
  time), ≤ 40 characters; SYNC-007 preview deploy path as outcomes (H-078); SYNC-118 note. **Other:** SYNC-003
  dialog text and legacy-data warning; SYNC-031/032/033 by mode and clearing is not deletion; SYNC-041, 074, 075
  drop Combine; SYNC-080 offline cache in account-required mode; SYNC-086 gate stays open, different uid clears;
  SYNC-101 notice facts; SYNC-113, SYNC-120 first-sign-in cost; SYNC-125. **ACs:** 1, 2, 3, 4, 5, 13, 20, 21,
  25, 26, 27, 28, 31, 35, 36, 40, 42, 43 rewritten; new 45–48 (local-only unchanged, gates, gate at start-up
  and offline, switching production). Decisions 5, 6 and part of 11 superseded by new decision 13. Impacts list
  for SPEC-003/004/005/006/007/008, H-071, H-075, H-077, Home copy, Current State, Firestore Data Shape.
  **Round 2 (same version, [[Validation H-080]] and RJ's follow-ups, decision 13 e–h):** (e) ADR-0007 amendment
  accepted. (f) SYNC-009 gate also needs the session not lost; SYNC-086 closes the gate during a lost session
  (data kept until sign-in; same uid resumes, different uid clears); SYNC-031 note; ACs 27, 47. (g) SYNC-003
  legacy-data warning dropped (clearing stays, silent); ACs 3, 48. (h) SYNC-009: while the gate is not open,
  Tournaments shows no Add to your decks / In your decks / Add another copy and the CAT-074 check reads no local
  store (replaces "opens the sign-in dialog"); SYNC-002 wording; AC 46; SPEC-004 and SPEC-006 impact lines.
  Validator failure 1: SYNC-081 and SYNC-090 say sign-out is disabled offline (as built), including Sign out
  anyway and Sync now in the dialog; AC 20. SYNC-012: short commit id is exactly 7 characters. Open questions:
  two unconfirmed defaults (sign out during an unfinished deletion; no offline sign-out).
  **Round 3 (same version, [[Validation H-080]] round 2):** decision 13 (b) and ADR-0007 amendment bullet (b)
  keep RJ's text and mark its "Add to your decks shows a sign-in prompt" part as replaced by (h). New sync-log
  field `sessionLostUid` (pending build, H-081): set when SYNC-086 detects a lost session; cleared by a
  successful sign-in, a restore of the linked uid that passes the account check, and every log clear. SYNC-009:
  the gate is closed while it equals the linked uid, so a reload never shows the cards; the undetected-loss
  window is stated (cards shown until the check finishes, edits allowed and kept pending). SYNC-030, SYNC-031
  ("no user change after the loss is detected"), SYNC-086, Data contract, ACs 27 and 47.

- 0.7 (2026-11-23, H-074: the spec documents the H-062 build, [[Validation H-062]] rounds 1–3; RJ decision 12):
  **Data contract:** `RemoteStore.getAccount`, `pull(..., { withAccount })`, `push()` returns a per-document
  `PushOutcome`; `PushChanges` with `account { create, createdAt, updatedAt, lastClientVersion }`, `replace` and
  `updatedAt` per state document, `purgeTags`/`purgeAssignments`, `batch`; `AuthService.restore`, `signIn(id,
  email?)`, `sendEmailLink`, `isEmailLinkReturn`, `needsRecentSignIn`, `reauthenticate` → `'ok' | 'cancelled' |
  'needs-sign-in'`; `RemoteErrorCode` incl. `'unconfirmed'`; `StoredSyncLog` fields `cloudDocs`,
  `pending.collectionReplace`, `locks[id].h`, `deckTombstones[id].createdAt` / `.wasPending`, `deckCreated`,
  `lastBuild`, `uploadingUid`, `deletingUid`; `SyncStatus` carries `pendingCount`. SYNC-030 lists the new log
  fields. **SYNC-002:** three load triggers (starting a sign-in, an expected session, an email sign-in link in
  the URL); opening the dialog loads nothing (AC 1 updated). **SYNC-006:** email-link flow as built; a link opened
  on another device asks "Confirm your email address to finish signing in." **SYNC-003:** interim placement:
  Delete account and data in the account menu until Settings exists. **SYNC-007:** preview vs production builds;
  `firebase.json` predeploy rebuilds production, so no deploy path ships the preview build (gap; AC 35 updated).
  **SYNC-012 / SYNC-118:** "build changed" is device-local (`lastBuild`); the account is updated at most once per
  build change and only if `lastClientVersion` differs; `appVersion` is a fixed string today. **SYNC-048 /
  SYNC-050 / SYNC-113:** first-sign-in writes in batches of at most 10, account creation first; this device's own
  partial upload (`uploadingUid`) resumes as case (b). **SYNC-053:** create detection via `cloudDocs`.
  **SYNC-080:** an `'unconfirmed'` write (20 s) stays pending and is checked by a pull about 60 s later.
  **SYNC-084:** singular "1 change not synced yet". **SYNC-096:** email-link re-auth = sign in again (exact
  message); Google popup cancel "Your account wasn't deleted."; Try again; `deletingUid` stops all sync until the
  deletion completes; **RJ decision 12:** Cancel deletion only when the deletion removed nothing, then only Try
  again (or Remove from this device); pending build H-127 (`deletingRemovedAny`, `deleteAll` `removedAny`).
  **SYNC-097:** Auth emulator codes recorded (`auth/user-token-expired`, `auth/invalid-refresh-token`), mapping
  listed, production still `unverified`; the half-deleted sign-out clears `uploadingUid` (H-075). **SYNC-111 /
  SYNC-112:** owner-only `list`, id checks on every operation, account `createdAt` immutable, `duplicatedFrom` ≤ 36.
  **SYNC-114:** Java 21 for `npm run test:rules` (Android Studio JBR via `JAVA_HOME`). New ACs 39–44 (email-link
  return, resumed upload, unconfirmed write, device-local build, unfinished deletion and Cancel deletion, Auth
  codes); ACs 1, 3, 22, 29, 35 updated. Still 89 requirements (81 MUST, 3 SHOULD, 5 MUST NOT); 44 ACs.

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
