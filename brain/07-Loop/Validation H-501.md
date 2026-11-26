---
tags: [validation]
item: H-501
---
# Validation H-501

2026-11-26 · H-501 · PASS · strings vs code, AC 40 / AC 39 vs tests, versions and pins, V-009, board diff · no failures (1 follow-up: H-600)

## Checks
- **Scope (PASS):** commit 93c7a4b (`git show HEAD`) touches 9 files, all under `brain/02-Specs/` and the board. No code changed. (`git diff origin/dev..HEAD` is larger only because `origin/dev` has moved on since the branch point fadb0dc.)
- **DECK-099 strings vs `web/src/app/` (PASS, byte for byte):** every string marked "built" matches `DECK_REVIEW_WORDS` (`shared/import/deck-review.ts`) and `DECK_REVIEW_TEXT` (`shared/import/deck-import.ts`): `check`, `sectionFor`, `sectionForLine`, `needsAnswer`, `ready`, `checks`, `championAsk`, `championMany`, `alsoMain`, `inferred`, `inferredNote`, `pickedSection`, `moveTo`, `removed(n, list)` (both forms), `removedItem`, `ambiguousName`, `championNotPicked`, `championExtraToMain(n)` (both forms). "Chosen Champion" display label is `DECK_REVIEW_WORDS.champion` and `label()` in the review. The `legendUnresolved` string is gone from `web/src` (as DECK-104 now says).
- **SPEC-003 "Check the cards" (PASS):** `REVIEW_TEXT.check` in `shared/import/import-dialog.ts` line 80 is `Check the cards`. Recorded as the builder's wording, RJ to confirm (Open questions).
- **AC 40 (PASS):** the Given is now an unsectioned `2 Gust` first, then `Legend:`, then `Main Deck:` with 38 cards. The test `DECK-105 / DECK-027 / DECK-025 / AC 40` (`deck-import.spec.ts` line 1059) builds exactly that (`2 Mystery Card` first, 12+12+12+2 = 38 others), asserts `PICK_ZONE` is asked, and checks `champion` x1, `main` x1 (39 in all), `zoneMethod: 'user'`, the reason line, nothing removed. The spec says the test uses `Mystery Card` in place of `Gust`.
- **AC 39 (PASS):** names both paths. (a) Back, type the name, Continue: test `DECK-104 / AC 39: once the line is fixed in the list` (built). (b) pick on a `PRINTING_NAME_MISMATCH` Legend line `1 Kennen, Heart of the Tempest RAD 001`: test `DECK-104 / DECK-033: a Legend line fixed by a pick in Lines to fix` (it carries no "AC 39" in its name, but is in the same DECK-104 block and the spec describes it correctly). The suggestion path for the typo line is marked as waiting for H-272.
- **(3) builder choices (PASS):** recorded as Open questions (v0.14.1) (a) to (c), each labelled "builder's choices as built, none decided by RJ", and added to gate H-483. DECK-100 and DECK-104 point to them and say "As built". Claims match the code: `carryReviewAnswers` drops a zone answer when `next.lines[to].card` is missing; `legendHeld = attention.some(l => l.section === 'legend')`; (c) is honestly marked "read from the code, no test names this case". Not presented as RJ's decision. DECK-104's source column still says the removal and "any Legend line" choices are the spec-writer's reading.
- **Versions (PASS):** SPEC-006 0.14.1, SPEC-003 0.14.1, status unchanged (`review` / `draft`), Spec Index rows 14 and 17, board field and Current line updated.
- **Live pins (PASS):** grep of `brain/` (no Archive, no history entries) finds SPEC-003 0.14.1 in Deck Import, Accounts and Sync, My Collection, Shared Cards and Lock-in, Test Data, Spec Index (SPEC-007, SPEC-010, SPEC-013 rows); SPEC-006 0.14.1 in Accounts and Sync, Shared Cards and Lock-in, Your Decks Ownership View, Spec Index. No live pin to 0.14 is left (remaining 0.14 mentions are changelog or "pin SPEC-006 0.14: H-454" history). `API Contracts.md` carries only dated history entries.
- **Board diff (PASS):** only the H-501 and H-483 rows changed. The H-483 addition lists (a) to (d) and matches Open questions (v0.14.1); nothing else in that row was lost.
- **V-009 (PASS with note):** specs keep numbered requirements and Given/When/Then; every new link target exists (`Validation H-469`, `H-480`, `H-500`, `Critique H-341 Deck Import Review`, `Collection Import`). A scripted wikilink check of the nine changed files flags only links that wrap across a line or contain backticks, which were there before this commit and are not new.

## Finding (not an H-501 failure): AC 8 relies on an unbuilt suggestion
The spec-writer's note is right. AC 8 (`3 Lightnig Rush`) says the line is `needs-review` with the pre-selected suggestion `Lightning Rush` and that the user accepts it. Suggestions (IMP-026 to IMP-030, H-272) are not built: the build gives `UNKNOWN_CARD` and the test named `DECK-041 / AC 8` checks only that Save is blocked with "1 card needs attention". That is outside H-501's four items, so H-501 passes and the follow-up is **H-600** (spec-writer): make AC 8 satisfiable today and mark the accept-the-suggestion half as waiting for H-272.

## Not run
Code checks (lint, build, tests): not applicable, no code in the diff.
