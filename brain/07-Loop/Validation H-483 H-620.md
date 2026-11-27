---
tags: [validation]
item: H-483 H-620
---
# Validation H-483 H-620

2026-11-26 · H-483 · PASS · SPEC-006 0.15 vs RJ's answers, scope of change, pins, V-009, SPEC-003 conflict · no failures (1 note: stale line in Current State)
2026-11-26 · H-620 · FAIL · ADR-0006 line 129 vs SYNC-153 (4) / SYNC-160 · wording omits the apostrophes `'` `’` that SPEC-010 allows (H-661)

Compared with `git diff dev` on the working tree (uncommitted, brain-only; 8 spec/board/state files plus the ADR).

## H-483 (PASS)
- **Answers recorded and attributed (PASS):** `Deck Import.md` 0.15 `approved`; every S4 to S7 answer is tagged "RJ 2026-11-26, in chat, H-483" and matches the task (S4 keep, DECK-105 RJ's decision, Legend and Chosen Champion stay in the Section selects, a Legend picked with quantity above 1 stored as given; S5 keep "{n} cards need attention"; S6 no bulk remove, revisit after H-020; S7 keep, `codeUsed` + Remove line).
- **No over-claiming (PASS):** the v0.14.1 builder choices (a) to (d) are stated as still not answered by RJ. S1 and S2 stay open (research H-020, H-099). The status line says RJ approved 0.14.x, which is what he said.
- **No behaviour change (PASS):** the diff of the requirement table touches only DECK-105's level and source cell (plus the AC 40 heading tag, Open questions, version note). DECK-105's mechanics text is unchanged except the Legend sentence, which now records "stored as given" (the current behaviour).
- **Pins (PASS):** SPEC-005 (Depends on and data-contract comment), SPEC-008 (Depends on and import comment), SPEC-010 (Depends on and import comment) all read SPEC-006 0.15; Spec Index rows for SPEC-005, 006, 008, 010 read 0.15; no live "0.14" pin to SPEC-006 left outside history lines (API Contracts v1.33 and the critique note are dated history).
- **SPEC-003 (PASS):** S7 restates IMP-068 (c) as is; no change to `Collection Import.md`.
- **V-009 (PASS):** frontmatter present, wikilinks used in the diff resolve (Deck Import, Critique H-341 Deck Import Review, Deck Construction Rules, Collection Import, Validation H-454).
- **Board and Current State (PASS with a note):** row H-483 `done`, row text and Current State item 2 agree (S4 keep, S5 keep, S6 not now, S7 keep, 0.15 `approved`). Note: the older paragraph "Decks run (`/board` 2026-11-26, four parallel sessions)" in `Current State.md` (line ~78) still says "Deck Import 0.14 `review` (gate H-483)". It is a dated log paragraph, so not failed, but it now reads wrong; filed with H-661.

## H-620 (FAIL)
- ADR line 129 now reads "1–20 characters, no emoji; letters and numbers of any script, spaces and `.` `_` `-`".
- SYNC-153 (4) and SYNC-160 (allowed pattern `^[\p{L}\p{Nd}][\p{L}\p{Mn}\p{Mc}\p{Nd} ._'’-]{0,19}$`) allow **also `'` and `’`** (and combining marks, first character a letter or digit). The board request itself lists "`.` `_` `-` `'` `’`". Expected: same set as SPEC-010. Actual: apostrophes missing, so `O'Neil` would look disallowed by the ADR.
- Board and Current State match each other (H-620 `done`, line amended), but the amendment itself is not exact. Filed H-661 (spec-writer, P2, depends H-620; it is RJ's ADR, so he confirms).
- The rest of the line (1–20, no emoji, "not unique", skippable prompt) matches SYNC-153 / SYNC-154.

## Re-check, attempt 2 (H-620, H-661): PASS
2026-11-26 · H-620 · PASS · ADR-0006 line 129 vs SYNC-153 (4) / SYNC-160 / decision 21 · no failures
- ADR line 129 now: 1–20 characters (code points); letters and numbers of any script, the combining marks they need, spaces, `.` `_` `-` `'` `’`; first character a letter or digit; no emoji, citing SPEC-010 decision 21, SYNC-153 / SYNC-160. This is the same set as SYNC-153 (4) and the pattern `^[\p{L}\p{Nd}][\p{L}\p{Mn}\p{Mc}\p{Nd} ._'’-]{0,19}$` in SYNC-160. The apostrophe gap is closed.
- `Current State.md` line ~78 now reads "0.14 `review` at the time (now 0.15 `approved`)". Board row H-661 is `done`, H-620 `done`.
