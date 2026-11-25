---
tags: [loop, validation]
item: H-103, H-105, H-107, H-109, H-111, H-112, H-117, H-118, H-119, H-121
date: 2026-11-24
round: 3
result: PASS
---
# Validation H-103 spec batch: SPEC-010 Accounts and Sync v0.9 → v0.10 (UI review spec rows)

Items: [[Handoff Board]] H-103, H-105, H-107, H-109, H-111, H-112, H-117, H-118, H-119, H-121 (all spec-writer).
Spec: [[Accounts and Sync]] v0.10. Source findings: [[UI Review 2026-11-24]] #4, #5, #6, #8, #9, #10, #15, #16, #17, #19.
Scope: uncommitted brain-only tree on `loop/H-103-spec010-ui-review` (base 7f92a3c): `brain/02-Specs/Accounts and Sync.md`,
`brain/02-Specs/Spec Index.md`, `brain/05-Handoffs/Handoff Board.md`,
`brain/Archive/Spec-Changelogs/Accounts and Sync changelog.md`. No code changed, so V-008 is not in scope.

## Result
2026-11-24 · H-103 spec batch · FAIL · 10 row Accepts, V-009 (spec, Spec Index, board, changelog), stale-string search, open-question audit, board audit (IDs, columns, `next_id`, builder coverage), internal consistency (requirements vs ACs vs data contract) · failures:
- F1 (H-103): SYNC-003 still says the dialog text is "followed by one button per enabled sign-in provider", which contradicts SYNC-006 (a) and AC 49 (no provider button with email link only).
- F2 (H-112): AC 38's first Given ("signed in as `uA`") does not fix the sign-in age, but its Then (type-to-confirm state) holds only for a sign-in ≤ 5 min old or a Google identity under v0.10 SYNC-095.
- F3 (H-119): Open question 9 states the default and an alternative but gives no reason (OQ3–OQ8 each give one).
- F4 (consistency): build-status markers contradict each other inside v0.10 text (H-081 and H-127 are done on the board).
- F5 (V-009): a wikilink spans a line break in the spec (`[[ADR-0005 MVP Product` / `Defaults]]`, line 972). It predates v0.10.

## Per-row verdicts
| Row | Accept | Verdict | Evidence |
|---|---|---|---|
| H-103 | SYNC-006 states the single-provider layout + G/W/T; V-009; then a builder item | **FAIL** (F1) | SYNC-006 (a)/(b) and AC 49 are good, and builder H-104 was extended (depends H-103). But SYNC-003 contradicts (a) (F1). |
| H-105 | SPEC-010 has the send-failure string; V-009; then builder | PASS | SYNC-006 has the exact string "Couldn't send the link. Check the address and your connection, then try again."; SYNC-005 v0.10 excludes Send link and Send again; AC 50 G/W/T; builder H-106 extended (depends H-105). |
| H-107 | SPEC-010 sent-state text and actions + G/W/T; V-009; then builder | PASS | SYNC-006 sent state (text, Send again, Use a different email, resend line, failure, reopen); AC 51; OQ3 marked RJ to confirm with a reason; board row says RJ to confirm (OQ3); builder H-140. |
| H-109 | SPEC-010 states the line or rejects it with a reason; V-009 | PASS | Accepted in SYNC-003 (first line, `currentEmail()`, omitted when null, never stored); SYNC-100 allows it with a stated reason; AC 53; OQ4 has a reason; board row says RJ to confirm; builder H-141. Privacy is coherent (see below). |
| H-111 | SPEC-010 decides; V-009; then builder | PASS | SYNC-096 menu paragraph: Sync now hidden, no pending count, "Try deleting again" (notice keeps "Try again"); SYNC-084 exception; AC 43 updated, AC 54 new; OQ5 has a reason; builder H-142; H-110 updated. The H-127 marker clash in the same row is listed under F4. |
| H-112 | SPEC-010 dialog states + G/W/T; V-009; then builder | **FAIL** (F2) | SYNC-095 sign-in-first state, `canReauthenticate()` in the data contract, AC 55 and the second half of AC 38 are good; OQ6 has a reason; builder H-143. The first Given of AC 38 is underdetermined (F2). |
| H-117 | SPEC-010 SYNC-009 text updated; V-009 | PASS | SYNC-009, SYNC-086, ACs 27, 47, 57 all read "You've been signed out. Sign in again to continue."; "Sign in again to see them" is left only in the "replaces …" note (SYNC-009) and in AC 57's must-not-appear check; OQ7 has a reason; builder H-144. |
| H-118 | SPEC-010 records decision 15 with the exact string; V-009; then a builder row | PASS | Decision 15 is recorded as **decided** (quoted from the board row), with the exact string (same as the board row, no full stop) in SYNC-009, AC 26 and AC 46. Decision 14 (a) stands (page header stays), and 14 (b) is struck through and marked superseded. Panel headings go in every state (SYNC-009, AC 46, AC 57). Only that reading of "just" is a default (OQ8, RJ to confirm). "You need a free account" survives only in the replaces note, decision 14 (b) struck, and the 0.9 changelog. Builder row H-144. |
| H-119 | SPEC-010 SYNC-006 + G/W/T; V-009; then builder | **FAIL** (F3) | SYNC-006 Return paragraph and AC 52 are good, with the continue-URL merge marked `unverified` for the builder; builder H-145. OQ9 gives no reason (F3). |
| H-121 | SPEC-010 sign-out dialog text; V-009 | PASS | SYNC-090: explanation stays under the warning (muted), title "Sign out?", "Syncing…" while it runs, Cancel stays enabled, "Sync now" again after a partial sync; SYNC-084 cross-reference; AC 56; builder H-122 extended (depends H-121). "Cancel stays enabled, as built" was checked against `web/src/app/core/sync/sync-dialogs.ts`: Cancel has no `[disabled]`. |

## Failures (each fixable in the spec text in this session; no board items filed)
**F1, SYNC-003 vs SYNC-006 (a).** Check: internal consistency, H-103 Accept. Input: `brain/02-Specs/Accounts and Sync.md`
line 180, SYNC-003: "It opens a dialog: "Sign in to import …" followed by one button per enabled sign-in provider
(`authProviders`, SYNC-006) and a link to the privacy notice". Expected: SYNC-003 agrees with SYNC-006 (a), which says that with
`['email-link']` there is **no** provider button and the email form shows at once. Actual: SYNC-003 still requires a button per
provider. Fix: for example "followed by the sign-in options for the enabled providers (SYNC-006: the email form at once when
email link is the only provider, otherwise one button per provider)".

**F2, AC 38 first Given.** Check: Given/When/Then determinism, H-112. Input: AC 38 (line 770): "**Given** signed in as `uA`
**When** RJ opens Delete account and data **Then** … Delete account stays disabled until he types `delete`". Expected: the Given
fixes the inputs that SYNC-095 v0.10 branches on, which are the sign-in age and whether `canReauthenticate()` holds. Actual: with
the default config and a sign-in older than 5 minutes, SYNC-095 opens the sign-in-first state (no field), so this Then is false
for some inputs the Given allows. Fix: for example "**Given** signed in as `uA` by email link 1 minute ago".

**F3, OQ9 has no reason.** Check: every defaulted decision is marked RJ to confirm with a reason. Input: Open questions, item 9
(line 1144). Expected: a reason, like OQ3–OQ8 give. Actual: the item lists the default (start page, app paths only, else `/`;
notice after any user-started sign-in) and an alternative, but no reason. Fix: add one, for example "Reason: the user lands where
they were; app paths only so a tampered link cannot send them to another site; one notice for every provider keeps the behaviour
the same when Google is turned on."

**F4, build-status markers contradict each other.** Check: internal consistency. Board: H-081 and H-127 are in Done (PASS round
2). v0.10 changed SYNC-009 to "built H-081", the Key rules and the SYNC-096 menu paragraph to "built H-127", and added "The v0.7
gap … was closed by H-127". The same text still says otherwise:
- SYNC-096, same row: "**Cancel deletion (RJ decision 12, 2026-11-23; pending build, H-127)**" (line 273).
- AC 43 title: "the Cancel parts are **pending build, H-127**" (line 812).
- Summary **Open** (line 101): "Not built yet: account-required mode (H-081), Cancel deletion and the account-menu Try again (H-127), …".
- Decision 12 (line 1066): "Not built yet: H-127."
- Open questions, **Other** (line ~1150): "Build: account-required mode (H-081), Cancel deletion and the account-menu Try again (H-127)".
- "pending build, H-081" is still on SYNC-003, 004, 008, 048, 052, 086, 090, 091, 097 and the line 28 preamble, while SYNC-009
  now says "built H-081".

Expected: one consistent status. Either mark H-081 and H-127 as built everywhere (they pass on the board), or leave SYNC-009 and
the H-127 menu text as "pending build" the way v0.9 had them. Actual: mixed, with two statuses inside SYNC-096 alone.

**F5, V-009 broken wikilink (predates v0.10).** Check: V-009, wikilinks resolve. Input: spec lines 972–973:
`[[ADR-0005 MVP Product` + line break + `Defaults]]`. It is already in HEAD, at line 859. Expected: the link on one line, as in
the H-100 precedent. Actual: the link spans a line break, so Obsidian does not resolve it. Fix: join the link onto one line.

## Checks run
### V-009 (changed notes)
Script by the validator: extract every `[[…]]` target from the 4 changed notes, resolve it with `find brain -name "<target>.md"`,
and flag any line where a `[[` is not closed.
| Note | Result |
|---|---|
| [[Accounts and Sync]] | every one-line link resolves; **1 link spans a line break** (F5) |
| [[Spec Index]] | all resolve |
| [[Handoff Board]] | all resolve. The one "unresolved" hit is the quoted text `[[Physical Copies Across` + line break + `Decks]]` inside H-100's historical description, not a real link |
| [[Accounts and Sync changelog]] | all resolve |

Spec structure: requirements are numbered and use MUST/MUST NOT. ACs 1–57 are contiguous with no gaps or duplicates. New ACs
49–57 and changed ACs 1, 26, 27, 38, 43, 46, 47 are all Given/When/Then and cite their SYNC IDs and build item. Front matter:
`version: 0.10`, `as_of`/`updated` 2026-11-24, `board` lists the ten rows. Open questions are numbered 1–9.

### Stale strings (search of the spec)
| String | Hits outside history/superseded/must-not-appear text |
|---|---|
| "Sign in again to see them" | none (only the SYNC-009 replaces note and AC 57's absence check) |
| "You need a free account" | none (only the SYNC-009 replaces note, decision 14 (b) struck, and the 0.9 changelog line) |
| "Check your email for a sign-in link" | none |
| "Sign in to see your …" / "Sign in to import cards and decks" | none (only the SYNC-009 removed-headings note and AC 46's absence check) |
| "one button per enabled" | **SYNC-003** (F1) |

The decision 15 string appears 5 times (SYNC-009, AC 26, AC 46, decision 15, the changelog line). Each matches the board row
character for character, with no closing full stop. The lost-session line is the same in SYNC-009, SYNC-086, AC 27, AC 47 and AC 57.

### Open questions OQ3–OQ9
| OQ | Row | "RJ to confirm" in spec | On board row | Reason given |
|---|---|---|---|---|
| 3 | H-107 | yes (SYNC-006 + OQ list header) | yes | yes |
| 4 | H-109 | yes (SYNC-003) | yes | yes |
| 5 | H-111 | yes (SYNC-096) | yes | yes |
| 6 | H-112 | yes (SYNC-095) | yes | yes |
| 7 | H-117 | yes (SYNC-009, decision 15) | yes | yes |
| 8 | H-118 | yes (SYNC-009, decision 15) | yes | yes ("the page header's title names the page") |
| 9 | H-119 | yes (SYNC-006) | yes | **no** (F3) |

### H-109 privacy vs SYNC-100
Coherent. SYNC-100 keeps its rule (the address is not copied into Firestore, logs or analytics). The v0.10 paragraph allows
showing the address only on the owner's device: read from Auth, or before sign-in from the typed or SYNC-006 stored address,
which already existed and is removed when the sign-in completes. Nothing new is written. SYNC-003 says the same ("read from Auth
each time the menu renders; never written…"). The data contract's `currentEmail()` says "never stored (SYNC-100)". AC 53 tests
it by searching the cloud documents, local stores, the sync log and the console, with Firebase Auth's own persisted session
excepted. The sent-state `{address}` (SYNC-006) is covered by the same paragraph.

### Board audit
- `next_id: 146`. The highest ID on the board is H-145. No ID appears twice (`grep "^| H-" | sort | uniq -d` is empty).
- H-104, H-106, H-110, H-115, H-122 and H-140…H-145 each have the 10 columns. Owner, `from` (spec-writer or ui-engineer),
  depends and Link are set, and each Accept names its SPEC-010 ACs as tests named by AC.
- Coverage of what v0.10 makes buildable:

| Requirement | Builder rows |
|---|---|
| SYNC-006 (a)/(b) layout, focus | H-104 (AC 49, AC 1) |
| Sending… and the send-failure text | H-106 (AC 50) |
| Sent state | H-140 (AC 51, AC 1) |
| Return path and "You're signed in." | H-145 (AC 52, AC 39) |
| Identity line, `currentEmail()` | H-141 (AC 53) |
| Deletion menu, SYNC-084 exception | H-142 (AC 54, AC 43) |
| Menu groups without a double divider | H-110 |
| Delete dialog sign-in-first state, `canReauthenticate()` | H-143 (AC 55, AC 38) |
| Sign-out dialog | H-122 (AC 56) |
| Panel text and no heading | H-144 (ACs 26, 27, 46, 47, 57) |
| First-sync states with no heading | H-115 (AC 57) |

  Nothing is uncovered.
- Rows were not marked done (the orchestrator does that).

### Spec Index and changelog
- [[Spec Index]]: SPEC-010 shows 0.10 with a v0.10 note (H-103…H-121; build H-140…H-145).
- [[Accounts and Sync changelog]]: a 0.10 entry is at the top (newest first) and lists every changed SYNC ID, ACs, decision 15,
  14 (b) superseded, OQ3–9 and the build rows. The spec's own Changelog line says "Current: 0.10".

### Internal consistency (requirements vs ACs vs data contract)
Checked and consistent:
- SYNC-005 vs SYNC-006 (send failure vs sign-in failure).
- SYNC-084 vs SYNC-096 vs ACs 43 and 54 (status text with no count, Try deleting again vs the notice's Try again).
- SYNC-095 vs SYNC-096 step 1 vs AC 55 (one reused string, `canReauthenticate()` in the data contract).
- SYNC-090 vs AC 56 vs the build (Cancel enabled).
- SYNC-009 vs SYNC-086 vs ACs 26, 27, 46, 47, 57.
- SYNC-006 return vs AC 52 (`sendEmailLink(email, returnTo?)` in the data contract).

Failures: F1, F2 and F4.

## Notes (not failures)
- The H-103, H-105 and H-121 board rows carry no spec-writer result note, unlike the seven others. Their Accepts are still met
  in the spec. Consider adding one-line results for traceability.
- [[UI Review 2026-11-24]] #19 says that during Sync now "all buttons just go disabled". The build leaves Cancel enabled, which
  matches SYNC-090 v0.10. The review overstated it.
- The SPEC-010 `depends_on` and the Spec Index still pin SPEC-009 0.2, which is withdrawn (left for H-074, predates this batch).

## Round 2 (2026-11-24)
2026-11-24 · H-103 spec batch (round 2) · FAIL · re-check of F1–F5, V-009 (spec, board), spot-check of the F4 edits, board result notes · failures:
- F4 (residual): four "pending build" markers for H-077 and H-078 are left. The Summary, the AC preamble and the "Other" paragraph now say both are built (board `done`).

| Round-1 failure | Round 2 | Evidence |
|---|---|---|
| F1 SYNC-003 vs SYNC-006 (a) | fixed | SYNC-003 (line 181): "followed by the enabled sign-in providers laid out as SYNC-006 says (… with email link as the only provider there is no provider button, only the email form; with two or more, one button per provider)" |
| F2 AC 38 first Given | fixed | AC 38 (line 773): "**Given** signed in as `uA` by email link 1 minute ago … **Then** the dialog opens in its type-to-confirm state" |
| F3 OQ9 reason | fixed | OQ9 (line 1149): "Reason: the user lands where they were …, app paths only so a tampered link cannot send them to another site, and one confirmation for every provider is simpler …" |
| F4 build markers H-081 / H-127 | fixed for H-081 and H-127; **new residual for H-077 and H-078** | 0 left of "pending build, H-081" and 0 of "pending build, H-127". SYNC-096 Cancel deletion, AC 43, decision 12 ("Built: H-127"), Summary and Other all say built. See the residual below |
| F5 wikilink across a line break | fixed | the V-009 script finds no unclosed `[[` and no unresolved target in the spec |

**F4 residual (new, caused by the round-2 edit).** Check: internal consistency. The Summary **Open** (lines 101–103) says "Built
(board `done`): … first sign-in at most 1 write (H-077), per-build `appVersion` and the preview deploy path (H-078)". The AC
preamble (line 522) says ACs marked *(H-077)* or *(H-078)* "name the build item that built them (all `done`)". The **Other**
paragraph (lines 1156–1158) says the same. The requirement rows still say pending:
- SYNC-007, line 185: "**Preview deploy path (pending build, H-078).**"
- SYNC-012, line 194: "**`appVersion` value (pending build, H-078):**"
- SYNC-050, line 226: "**First-sign-in writes** (v0.8; pending build, H-077)."
- line 296: "v0.8 makes `appVersion` change with every build (SYNC-012; pending build, H-078)"

Expected: one status per item. The board shows H-077 and H-078 done (PASS), so change these four to "built H-077" and "built H-078".
Actual: the Summary says built and the requirement rows say pending.

**Spot-check of the F4 edits:** every "built H-081" and "built H-127" replacement reads correctly in context. That covers SYNC-003,
004, 008, 009, 015, 048, 052, 086, 090, 091, 096, 097, the data-contract comments (lines 418, 422, 426, 498), the line-28 preamble
and the AC 43 title. The v0.10 markers are untouched: every "pending build, H-104/106/122/140…145" and the three data-contract
`PENDING BUILD` comments are still there. "Not built yet" now lists only the v0.10 UI items.

**Other round-2 checks:**
- ACs 1–57 are still contiguous.
- Board: `next_id` 146, no duplicate IDs.
- H-103, H-105 and H-121 now carry spec-writer result notes (closes the round-1 traceability note).
- V-009 on the board: the only "broken" hit is still the quoted text in H-100's history, which is not a real link.

### Final per-row verdicts (round 2)
| Row | Verdict |
|---|---|
| H-103 | PASS |
| H-105 | PASS |
| H-107 | PASS |
| H-109 | PASS |
| H-111 | PASS |
| H-112 | PASS |
| H-117 | PASS |
| H-118 | PASS |
| H-119 | PASS |
| H-121 | PASS |

**Overall: FAIL.** Every row's Accept is met, but the batch fails V-009/consistency on the F4 residual: the four H-077/H-078
markers at lines 185, 194, 226 and 296. Once they are changed, the batch passes. It needs only a grep check for "pending build,
H-07[78]", not a full re-validation.

## Round 3 (2026-11-24)
2026-11-24 · H-103 spec batch (round 3) · PASS · F4 residual re-check, stale-marker search, V-009 (spec) · failures: none

- **F4 residual fixed.**
  - `grep -c "pending build, H-07[78]"` on the spec returns 0.
  - Lines 185 (SYNC-007), 194 (SYNC-012), 226 (SYNC-050) and 296 now read "built H-078", "built H-078", "built H-077" and
    "built H-078".
  - These now agree with the Summary, the AC preamble and the Other paragraph.
- **Stale-marker search.** A case-insensitive search for "pending build" finds only the v0.10 build items (H-104, H-106, H-122,
  H-140…H-145, H-142 in the Key rules) and the line-93 pointer to the data contract's `PENDING BUILD` comments. No stale marker
  is left.
- **V-009 (spec), rerun.** Every wikilink target resolves, and no link spans a line break.

### Final result
All ten rows PASS: H-103, H-105, H-107, H-109, H-111, H-112, H-117, H-118, H-119, H-121. **Overall: PASS.** Rows are not marked
done here; the orchestrator does that.
