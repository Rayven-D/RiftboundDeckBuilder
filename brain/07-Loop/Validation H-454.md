---
tags: [validation]
item: H-454
---
# Validation H-454

2026-11-26 · H-454 · PASS · S1-S7 handling, over-claim check, DECK-104 testability and strings, DECK-105 against the code branch, ID uniqueness, live pin grep, cross-spec read, scope, board diff, V-009 · no failures (two non-blocking notes).

## Checks
- **S1-S7 (PASS):** [[Deck Import]] 0.14. S3 is DECK-104, attributed to RJ 2026-11-26, with AC 39 and builder item H-500. S1 and S2 are open questions waiting on research (H-020, H-099) with no invented formats. S4 is DECK-105 with AC 40, labelled proposal. S5, S6, S7 are proposals in Open questions, marked "NOT RJ's", no requirement changed. DECK-036 points to DECK-104.
- **No over-claiming (PASS):** S1 and S2 say `unverified`. The IMP-064 / CARD-037 reading for `R03` and `SP1` is stated as "the rule as written, not a verified fact". DECK-105 is headed "proposal, not RJ's" in the requirement, source cell, AC 40, changelog and Spec Index; status stays `review` with the reason. DECK-104's source cell says which parts are the spec-writer's reading of RJ's sentence.
- **DECK-104 testable, existing strings only (PASS):** AC 39 gives concrete input and outcomes (line 2 message, "1 card needs attention", no `PICK_LEGEND`, no `legendNone`, no "questions to answer", name `Imported deck <date>`; fixed; removed gives `PICK_LEGEND` with `legendNone` and "Leave empty"; no Legend line at all gives AC 3 / AC 33). Every string named (`unknownCard`, `unknownCode`, `codeMismatch`, `ambiguousCode`, `fixNote`, `remove`, `use(name)`, `needAttention`, `questions(n)`, `legendNone`) is in the DECK-099 table. The `legendUnresolved` text is quoted only as not part of the spec.
- **DECK-105 against the code branch (PASS):** `loop/H-410-H-480-deck-import-review` has `deck-import.spec.ts` test "DECK-027: a 3-copy line the user puts in Chosen Champion keeps 1 there and 2 in main (zoneMethod user)", and `deck-import.ts` keeps 1 copy in `champion` and moves the rest to `main` with `championExtraToMain`. This matches "reported as built". The Legend-with-quantity case is explicitly not decided.
- **`legendUnresolved` on the branch (PASS):** `deck-review.ts` line 62 (string) and line 492 (prompt), test at `deck-review.spec.ts` line 374; the wording quoted in DECK-104 and H-500 matches. Not on `origin/dev`.
- **IDs unique (PASS):** DECK-104 and DECK-105 each appear once as a row (section N, after DECK-103); ACs 39 and 40 follow AC 38; no clash.
- **Pins (PASS):** Spec Index, [[Accounts and Sync]], [[Shared Cards and Lock-in]], [[Your Decks Ownership View]] say 0.14. Remaining 0.13 mentions are labelled history ("pin SPEC-006 0.13: H-479", changelog, H-479 board row).
- **Cross-spec (PASS):** no conflict. SPEC-003 IMP-064 / IMP-068 and CARD-037 are cited, not changed; S1 and S2 say any change is SPEC-003 / SPEC-001 first. S7 keeps IMP-068 (c).
- **Scope (PASS):** 6 files changed, all under `brain/`.
- **Board diff (PASS):** H-454 row (`todo` to `verify`, Result text) plus new H-500 (P2, builder, todo, depends H-454, from RJ, Accept names AC 39 and AC 3 / 33, 12 columns like neighbours).
- **V-009 (PASS):** wikilinks in the changed text resolve; requirements numbered, ACs Given/When/Then.
- **Code checks:** SKIPPED (no `web/` or `services/` change).

## Notes (non-blocking)
1. S4, S5, S6, S7 and the S3 details stay proposals until RJ reads them; 0.14 stays `review`.
2. H-500 must also remove the `legendUnresolved` test on the unmerged branch; the item says so. H-452 (3) on the board still asks for `legendUnresolved` and now conflicts with H-500; the builder should treat H-500 as overriding it (H-500 names the conflict).
