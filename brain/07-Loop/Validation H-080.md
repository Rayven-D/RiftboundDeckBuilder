---
tags: [loop, validation]
item: H-080
date: 2026-11-24
result: FAIL
---
# Validation H-080: account required to import (SPEC-010 v0.8, ADR-0007 amendment)

Item: [[Handoff Board]] H-080. Accept: "ADR-0007 amended and accepted by RJ; SPEC-010 v0.8; V-009".
Scope: uncommitted tree on `loop/H-074-spec010-followups` (HEAD 5c2292c): [[Accounts and Sync]],
[[ADR-0007 Firebase Accounts and Firestore]], [[Accounts and Sync changelog]].

## Result
2026-11-24 · H-080 · FAIL · Accept, V-009, decision fidelity, supersession marking, as-built spot-check vs `web/src/app/shared/sync/` + `web/src/app/core/sync/`, buildability of H-086/H-077/H-078/H-081 · failures:
1. SYNC-081 vs SYNC-090 / AC 20: offline "Sign out anyway" is both disabled and required to clear the device → spec-writer
2. SYNC-009 / CAT-074: Tournaments "In your decks" / "Add another copy" state while the gate is closed or the first sync runs is unspecified (legacy decks in `DeckStore`) → spec-writer
3. [[Spec Index]] still lists SPEC-010 0.7; [[Current State]] still says "specs not updated yet" / "optional sign-in" / SPEC-010 0.7 (H-080 row asks to update Current State constraints) → spec-writer

Outstanding, not a failure: RJ's acceptance of the ADR-0007 amendment (correctly marked `proposed`).

## Checks run
### Accept
- **ADR-0007 amended:** new section "Amendment 2026-11-24: account required to import", marked
  **Status: proposed**, plus frontmatter `amendment: "2026-11-24 … proposed, pending RJ (H-080)"`; frontmatter
  `status: accepted` stays for the 2026-11-23 decision. The original text ("Accounts stay optional", "anonymous use
  stays as it is") is kept and the amendment says which lines it replaces and that it wins once accepted. Quotes
  RJ and answers a–d match the board row. **Accepted by RJ: outstanding** (caller: not a FAIL).
- **SPEC-010 v0.8:** frontmatter `version: 0.8`, `as_of`/`updated` 2026-11-24, `board` adds H-080; changelog
  entry 0.8 is newest first in the archive note; the spec's Changelog line says "Current: 0.8".

### (1) RJ's decision faithfully specified
| Decision | Where | OK |
|---|---|---|
| Account required to import | SYNC-001, SYNC-008, SYNC-009 | yes |
| Home and Tournaments public | SYNC-009 public list (adds `/styleguide` and the privacy notice; reasonable) | yes |
| (a) sign-out clears device, no Keep a copy, no Combine | SYNC-090, SYNC-091, SYNC-049 (MUST NOT), SYNC-097 half-deleted now clears | yes |
| (b) signed out = Home + Tournaments; Decks / Collection / Import / Add to your decks gated | SYNC-009, ACs 46, 47 | yes (see failure 2) |
| (c) `signInEnabled: false` keeps local-only mode | SYNC-007, SYNC-008, AC 45, AC 48 | yes |
| (d) legacy browser data cleared on first sign-in, not imported | SYNC-048 step 1, SYNC-003 warning, ACs 3, 5, 36, 40, 48 | yes |

Leftover-term search (Combine, Keep a copy, signed-out data/copy, `uploadingUid`, upload, Remove from this device,
optional, "need an account"): every hit in the spec is either a "removed / no longer / superseded" statement, the
v0.7 history of a field (`uploadingUid` "v0.7 only … never written"), the `mergePulled` `'combine'` mode marked
"no longer called", or a strike-through decision. No live requirement or AC still asks for Combine, Keep a copy,
an upload at sign-in, the upload resume or signed-out data. One contradiction found elsewhere: failure 1.

### (2) Superseded decisions marked, not deleted
Decisions 5 and 6 are struck through with "Superseded by decision 13 (2026-11-24)"; decision 11 keeps "sign out",
strikes the "keeps its data" reasoning and explains why it no longer holds; decision 12 notes "since v0.8, Sign
out". Decision 13 records RJ's quote and a–d and lists what it supersedes. ADR-0007 original text kept. OK.

### (3) As built vs pending build; spot-checks against code
The spec marks new work "pending build, H-081 / H-086 / H-077 / H-078" per row and per AC, and the Data contract
marks `deletingRemovedAny` and `deleteAll`'s `removedAny` as PENDING BUILD. Spot-checks (all confirmed):
- `signOut(mode: 'keep' | 'remove')`, `'remove'` → `local.clearAll()` + `emptySyncLog()` (`sync-engine.ts:225-237`); `clearLocalData` removes every prefixed key (`core/storage/local-stores.ts:328`). SYNC-091 "the build already has `signOut('remove')`" holds.
- Built half-deleted branch signs out and keeps the data (`sync-engine.ts:594-607`). SYNC-097 "as built keeps the data" holds.
- First sign-in: case (f) detection, `confirmCombine`, `uploadingUid` resume, `forgetItems` for (c), `pushPending({ batch: true })`, link only after push (`sync-engine.ts:328-410`). `planPush` with `batch` sends every logged card, tag, target and lock (`push-plan.ts:113, 135-136, 171`), decks only when pending. SYNC-050 "up to 3 extra `state` writes" holds.
- `appVersion` fixed: `web-0.0.0` (`environment.ts:12`), `web-0.0.0-preview`, `web-dev`; `signInEnabled` false in production, true in preview/development. SYNC-007/012/118 hold.
- `firebase.json` hosting `predeploy` = `npm --prefix web run build`. SYNC-007 preview-deploy gap holds.
- `deleteAll(uid): Promise<'ok' | { remaining: number }>` (`firebase-adapters.ts:427`), Try again only on the snackbar (`account-menu.ts:101`). SYNC-096 gap holds.
- `isEmailLinkUrl` start-up trigger (`sync.service.ts:83`). SYNC-002 holds.
- Account menu disables Sync now / Sign out / Delete offline (`account-menu.ts:38-40`). SYNC-081 holds as built (this is the basis of failure 1).

### (4) Buildable without guessing
- **H-086:** SYNC-096 defines `removedAny`, `deletingRemovedAny` (set false on first record, true once, never back, `'unconfirmed'` counts as removed, cleared with `deletingUid`), the menu Try again after reload, Cancel deletion effects and text; AC 43 covers each branch. OK.
- **H-077:** SYNC-050 gives exact counts per case ((a) 1, (c)/(e) 0 or 1 account `update()`, (f) 0, no `state`/`decks` write, no `batch`), reads ≤ 3 + 1 per document; SYNC-120 worked examples (3 reads/1 write; ≤ 16 reads/0 writes); ACs 3, 4, 36, 40 count writes. The resumed-Combine question is moot and recorded in Impacts. OK.
- **H-078:** SYNC-012 format `web-<prod|preview>-<7–12 hex>` or UTC `YYYYMMDDTHHMMSSZ`, ≤ 40, charset; SYNC-007 five outcomes for the preview deploy; ACs 35, 42 with concrete values. OK (INFO 1).
- **H-081:** SYNC-003, 008, 009, 048, 052, 090, 091, 097 and ACs 3, 5, 20, 25–28, 31, 36, 40, 45–48 give texts, routes and states. Two points need a guess: failures 1 and 2.

### (5) V-009
- Requirement rows: 91 (82 MUST, 6 MUST NOT, 3 SHOULD) = v0.7's 89 (81/5/3) + SYNC-008 + SYNC-009, with SYNC-049 MUST → MUST NOT. No duplicate IDs; every SYNC ID referenced in the spec exists; every row has a Source.
- ACs: 48, numbered 1–48, every one has **Given / When / Then** (script over the AC section). No reference to an AC above 48.
- Cross-spec IDs cited in Impacts exist: IMP-053, COLL-070, COLL-074, DECK-005, DECK-090, SHARE-060, CAT-070, CAT-074, CAT-077.
- Wikilinks in the three changed notes all resolve.

## Failures (for new board rows; the validator was told not to edit the board)
1. **P1 · spec-writer · SYNC-081 vs SYNC-090 / AC 20 (offline sign-out).** Input: signed in, 1 pending change,
   offline; Sign out → Sync now fails because offline. Expected (AC 20): "Sign out anyway" clears the device.
   Actual: SYNC-081 (unchanged in v0.8) says sign-out needs a connection and is disabled offline with "You're
   offline." (as built, `account-menu.ts:39`), and SYNC-090 lists "offline" as a reason items stay pending. A
   builder must guess whether Sign out / Sign out anyway is enabled offline. v0.8 sign-out only ends the session
   and clears the device, so state the offline rule explicitly in SYNC-081/SYNC-090 and make AC 20 match.
   Accept: SYNC-081, SYNC-090 and AC 20 agree on offline sign-out; V-009.
2. **P1 · spec-writer · SYNC-009 / CAT-074 (Tournaments button state while gated).** Input: account-required
   mode, gate closed, `DeckStore` holds a legacy deck with `source.decklistId` = X; Tournaments row X renders.
   Expected: per decision 13 d legacy data is ignored, so the row shows "Add to your decks" and opens the sign-in
   dialog. Actual: SYNC-009 only says gated *pages* read nothing from the local stores; it does not say whether
   Tournaments' CAT-074 "already added" check reads `DeckStore` while the gate is closed, so the row could show
   "In your decks" (opening a gated deck) and "Add another copy". Same gap during "first sync running" (SYNC-009
   disables Add to your decks but not "In your decks" / "Add another copy"). AC 46 covers only the press of Add to
   your decks. Accept: SYNC-009 states the CAT-074 states when the gate is closed and during the first sync, with
   an AC; V-009.
3. **P1 · spec-writer · index notes not updated to v0.8.** [[Spec Index]] row SPEC-010 says version 0.7
   (`Spec Index.md:21`); [[Current State]] line 22 says "specs not updated yet", line 23 "optional sign-in and sync
   planned, ADR-0007", line 48 SPEC-010 0.7 with v0.7 wording. The H-080 row asks to "update Current State
   constraints". Accept: Spec Index shows SPEC-010 0.8; Current State constraints per mode (ADR-0007 amendment,
   proposed) and SPEC-010 0.8.

## INFO (no item)
1. SYNC-012 allows a 7–12 character short commit id, but ACs 35 and 42 expect exactly `web-preview-5c2292c` /
   `web-prod-5c2292c` (7). A builder using `git rev-parse --short` (length can grow) could meet SYNC-012 and miss
   the AC; the AC values effectively fix 7 characters. Consider saying so in SYNC-012.
2. AC 42 keeps `web-0.1.0` / `web-0.2.0` as build values; fine as test-injected values (SYNC-012 "tests inject
   their own").
3. RJ open questions 1–5 (amendment acceptance and four defaults) are listed with defaults; building need not wait.

## Round 2 (2026-11-24)
Scope: uncommitted tree (HEAD 5c2292c): [[Accounts and Sync]], [[ADR-0007 Firebase Accounts and Firestore]],
[[Accounts and Sync changelog]], [[Spec Index]], [[Current State]]. RJ's answers applied: decision 13 e–h.

2026-11-24 · H-080 (round 2) · FAIL · Accept, V-009, decision fidelity incl. 13 e–h, leftover-contradiction search, round-1 failures re-checked, buildability · failures:
1. Decision 13 (b) in SPEC-010 and ADR-0007 amendment (b) still say Tournaments' "Add to your decks" shows a sign-in prompt, not marked as replaced by (h); the ADR's own consequence line says no controls → spec-writer
2. Lost session across a reload: AC 27 "When he reloads Then the same holds" vs SYNC-009 (start-up gate opens from the sync log without waiting for the restore) and SYNC-031 (no user change during a lost session); nothing persists the lost state → spec-writer

### Round-1 failures
- **F1 (offline sign-out): fixed.** SYNC-081 and SYNC-090 now say Sign out, Sign out anyway and the dialog's Sync now are disabled offline, "You're offline." shows, only Cancel works, buttons re-enable on reconnect, nothing is cleared offline; AC 20 tests the rejected-online case, the drop-during-Sync-now case and the offline menu. Matches the build (`account-menu.ts:39`). Kept as open question 2 for RJ (not a FAIL).
- **F2 (Tournaments controls while gated): fixed.** SYNC-009 "Tournaments while the gate is not open" (signed out, session lost, first sync running): no Add to your decks / In your decks / Add another copy, the CAT-074 check reads no local store, controls appear on gate open without a reload. AC 46 (legacy deck with matching `decklistId` shows no In your decks; after sign-in the row shows Add to your decks) and AC 47 (first sync). Impacts lines for SPEC-004 and SPEC-006 updated.
- **F3 (index notes): fixed.** Spec Index SPEC-010 0.8 (deps add SPEC-004 0.4, ADR amendment); Current State line 22 cites v0.8 and the accepted amendment, line 23 constraints per mode, line 48 SPEC-010 0.8.
- **INFO 1: fixed.** SYNC-012 short commit id is exactly 7 characters, matching ACs 35 and 42.

### Accept
- ADR-0007 amendment: **Status: accepted** (RJ, 2026-11-24, in chat; H-080); frontmatter `amendment: "… accepted by RJ 2026-11-24 (H-080)"`. "accepted by RJ" now holds.
- SPEC-010 `version: 0.8`; changelog 0.8 entry has a "Round 2 (same version)" paragraph covering e–h and the validator fixes. Same-version change is acceptable: v0.8 was never accepted or built.

### RJ's new answers (e–h)
| Answer | Where | OK |
|---|---|---|
| (e) amendment accepted | ADR status, Summary "Open", decision 13 e, Open questions | yes |
| (f) lost session closes the gated pages, data kept until sign-in, same uid resumes, other uid clears | SYNC-009 (gate open needs session not lost; lost-session panel text), SYNC-086, SYNC-031, ACs 27, 47 | yes, but see failure 2 |
| (g) no legacy-data warning, clearing stays silent | SYNC-003 ("There is **no** warning"), ACs 3, 48, ADR consequence | yes |
| (h) no Tournaments deck controls while the gate is not open | SYNC-009, SYNC-002 (trigger 1 no longer mentions "Add to your decks"), AC 46, 47, Impacts, ADR consequence, Current State | yes, but see failure 1 |

Leftover search (Sign in to add this deck, opens the sign-in/SYNC-003 dialog, legacy-data warning, "will be removed when you sign in", gate stays open, keep working, Add to your decks disabled, still offers): no live requirement or AC hit. Hits are SYNC-003's "no warning" sentence, the panels' Sign in button, decision 13 g/h and the Open questions, plus failure 1.

### V-009
91 rows (82 MUST / 6 MUST NOT / 3 SHOULD), unchanged from round 1; no duplicate IDs; every referenced SYNC ID exists; 48 ACs numbered 1–48, all Given/When/Then; no AC reference above 48; wikilinks in the 5 changed notes resolve.

### Buildability
H-086, H-077, H-078: unchanged from round 1, OK (H-078 now exact 7-character id). H-081: OK apart from failure 2.

### Failures (for new board rows; the board was not edited)
1. **P1 · spec-writer · decision 13 (b) still says "sign-in prompt" for Add to your decks.** Input: SPEC-010
   Decisions, item 13 (b): "Decks, Collection, Import and Tournaments' "Add to your decks" show a sign-in prompt
   instead (SYNC-009)"; ADR-0007 amendment bullet (b), same text. Expected: marked as refined by (h) (no
   Tournaments deck controls while the gate is not open), as decisions 5, 6 and 11 are marked. Actual: unmarked.
   (h) says it replaces "the draft 'opens the sign-in dialog' behaviour", not (b), and in the ADR the consequence
   "Signed out … Tournaments shows no 'Add to your decks' controls" contradicts bullet (b) with no cross-reference.
   Accept: (b) in both notes carries a note that (h) replaces its "Add to your decks" part (RJ's quote unchanged).
2. **P1 · spec-writer · lost session after a reload.** Input: signed in as `uA`, token revoked, `checkAccount()`
   returned `signed-out` (AC 27), then the page is reloaded online. The sync log still has `sessionExpected: true`,
   the linked uid and `lastFullSyncAt`, and nothing records the lost state (no field in `StoredSyncLog`).
   Expected (AC 27): "When he reloads Then the same holds" (gate closed, sign-in panel). Actual: SYNC-009 says the
   start-up gate is decided from the sync log "without waiting for the session restore", so it opens and shows the
   cards, then closes only when the restore or a later check finds the session lost (AC 47 describes this switch).
   A revoked token is usually found only by `checkAccount()` after the first pull, not by the restore. In that
   window the user can edit, which contradicts SYNC-031 "No user change can be made during a lost session". The
   builder must guess whether to persist the lost state (a new sync-log field) or allow the window. Accept:
   SYNC-009/SYNC-086 (and the Data contract if a field is added) say what a reload during a lost session shows
   before the check finishes, AC 27's reload step matches, and SYNC-031 is consistent; V-009.

### INFO
- Changelog 0.8 headline still says "ADR-0007 amendment `proposed`"; the Round 2 paragraph records (e) accepted. That is fine as history.
- SYNC-003 still lists "Settings" as a Sign in location; that is unchanged from v0.7 (interim placement documented).

## Round 3 (2026-11-24)
Scope: uncommitted tree (HEAD 5c2292c): [[Accounts and Sync]], [[ADR-0007 Firebase Accounts and Firestore]],
[[Accounts and Sync changelog]], [[Spec Index]], [[Current State]].

2026-11-24 · H-080 (round 3) · PASS · Accept, V-009, round-2 failures re-checked, `sessionLostUid` set/clear consistency, buildability of H-086/H-077/H-078/H-081 · failures: none

### Round-2 failures
- **F1 (decision 13 b): fixed.** ADR-0007 amendment bullet (b) and SPEC-010 decision 13 (b) keep RJ's text and
  mark the "Add to your decks shows a sign-in prompt" part as replaced by (h), quoting RJ's follow-up. The ADR's
  consequence line and bullet (b) no longer contradict each other.
- **F2 (lost session after a reload): fixed.** New sync-log field `sessionLostUid` (pending build, H-081):
  - Set: when SYNC-086 detects the loss, to the linked uid (SYNC-086, Data contract).
  - Gate: closed while `sessionLostUid` equals the linked uid, read at start-up from the log, so a reload (online or offline) shows the panel from the first frame (SYNC-009, AC 27).
  - Cleared: by a successful sign-in (same uid: no first sign-in, gate opens, pending pushed; different uid: SYNC-048 clear), by a later start-up whose restore returns the linked uid and passes the account check, and by every log clear (sign-out SYNC-091, first-sign-in clear SYNC-048, own deletion SYNC-096, SYNC-097 `deleted` and half-deleted). `emptySyncLog()` "resets every field", so the clear paths agree with SYNC-091/096/097 and the Data contract comment.
  - Undetected-loss window stated: cards shown until the restore or check finds the loss; edits allowed, stamped and pending (SYNC-009, SYNC-031, AC 47). SYNC-031 now says "no user change after a lost session is detected", which is consistent.
  - Edge checked: a loss during an unfinished first sign-in sets `sessionLostUid` to a null linked uid, which changes nothing. The gate is already closed in "first sync running", so there is no conflict.
  - Start-up while lost: `sessionExpected` stays true, so `firebase` loads (SYNC-002 trigger 2) and the restore plus account check can clear the flag. No guess needed.

### Accept and V-009
- ADR-0007 amendment **accepted by RJ** (2026-11-24); SPEC-010 `version: 0.8`; changelog 0.8 has Round 2 and
  Round 3 paragraphs; Spec Index and Current State show 0.8.
- 91 rows (82 MUST / 6 MUST NOT / 3 SHOULD), no duplicate IDs, every referenced SYNC ID exists; 48 ACs numbered
  1–48, all Given/When/Then; wikilinks in the 5 changed notes resolve. No "stays open" / "keep working" leftover.

### Buildability
H-086 (SYNC-096, AC 43), H-077 (SYNC-050 write counts, ACs 3/4/36/40), H-078 (SYNC-012 exactly 7-character id,
SYNC-007 deploy outcomes, ACs 35/42) and H-081 (SYNC-003/008/009/048/052/081/086/090/091/097, Data contract
`sessionLostUid`, ACs 3, 5, 20, 25–28, 31, 36, 40, 45–48) can be built without guessing.

### Open (not failures)
RJ open questions 1 (sign out during an unfinished deletion) and 2 (no offline sign-out) have defaults, and the spec is written with them.
