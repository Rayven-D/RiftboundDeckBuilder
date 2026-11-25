---
tags: [validation, loop]
board: H-091
as_of: 2026-11-25
---
# Validation H-091 (SPEC-007 0.13, simplified Collection page)

2026-11-25 · H-091 · **PASS** · Accept vs [[Collection]] rev 3 "RJ's decisions", `git diff`, deferred-ID grep, ID and AC coverage, AC 34 arithmetic vs SHARE-040, dependent specs, pins and Spec Index, V-009 · 0 blocking, 5 follow-ups below. Gate: `status: review` is warranted (RJ must confirm Open questions 11-15).

## Checks
- **RJ vs proposal attribution:** every "RJ" claim traced to [[Collection]] "RJ's decisions" 1-6, RJ's quoted words (header block) or "Revision 3 (RJ)": owned-only and full colour (COLL-100 a, b), badge from 2 copies (COLL-016, 101), per-printing tiles, ban in dialog plus accessible name only (COLL-008), Could fit in = unlocked decks with "a of q available" (COLL-106), "what deck(s) it's locked in" (COLL-105), "maybe explain certain effects" (COLL-107). The deferrals (c-f), the three sorts, `q` + `sort`, the count wording and the exact lock/notice wording are labelled *proposal* in the Source column, the status table, the Summary, section C/D/E/F banners and Open questions 11-15. No ui-engineer recommendation is presented as RJ's decision, with one small exception (follow-up 2).
- **Deferred, not deleted:** all 37 IDs checked by grep (005, 013, 019-030, 037, 041-056, 064, 082-085, 088) each still has its row with text. A diff of the `| COLL-nnn |` row set HEAD vs working tree shows no ID lost. COLL-083 is "replaced" by COLL-103 (e), text kept. COLL-088 is split with Replace and Undo staying active.
- **Each kept or new rule has an ID and an AC:** COLL-010 (AC 36), 100 (32, 38), 101 (32), 102 (32, 33, 41), 103 (34, 38), 104 (34), 105 (34), 106 (34, 35), 107 (34, no Keywords), 108 (37), 109 (40), 088 split (39), 004/008/009 (32, 34, 40). ACs 32-41 are Given/When/Then and testable. Status of ACs 1-31 under 0.13 is stated.
- **AC 34 vs SHARE-040 / SHARE-011:** owned 2+3+1 = 6; Jinx Aggro (locked) holds 2; available(D, k) = max(0, ownedForDecks − lockedByOthers) = 4; Draven needs 2 gives "2 of 2"; Kennen needs 5 gives "4 of 5"; Draven sorts first (full row first). Consistent with SHARE-040 label and SHARE-011. AC 38 (3 excluded: owned 6, ownedExcluded 3, ownedForDecks 3) is consistent with COLL-081.
- **Dependent risk (deferring tag UI while `deckOwnership()` uses exclude tags):** flagged in Open question 12 ("a tag marked exclude from decks keeps reducing Decks' counts, and with no UI there is no way to remove or change it"), in COLL-100 (e), COLL-103 (e) and AC 38. Adequate.
- **Pins and versions:** SPEC-007 0.13 agrees across the front matter, Spec Index (SPEC-005, 007, 008, 010, 011 rows), Accounts and Sync, Shared Cards and Lock-in, Your Decks Ownership View and the archived changelog. No stale non-historical `0.12` pin to SPEC-007 remains in the specs (the older hits are changelog and history text). SPEC-007 `depends_on` adds SPEC-011, matching the Depends line.
- **V-009:** 21 distinct wikilinks in SPEC-007 all resolve; requirements are numbered; ACs are Given/When/Then.
- **Not run:** no code in scope (docs only).

## Follow-ups (non-blocking)
1. **spec-writer, AC 33:** "Kennen Tempo is now also locked and holds 1 copy" conflicts with the shared data (Kennen uses 5; 6 owned, so a lock would hold 4, or 5 if locked first). A hold of 1 would also make the deck "short" and show " · short" in COLL-105. Reword (hold 4 and "3 of..." becomes "6 of this card locked in 2 decks", or state it is a short deck).
2. **spec-writer, COLL-104 Source:** the quoted phrase "the card's total across printings is in the dialog" is ui-engineer text ([[Collection]] §4, not RJ's words) but sits inside an *RJ* attribution. RJ's words are "how many you have". Re-attribute the quote as brief text.
3. **spec-writer, SPEC-011:** [[Keyword Explanations]] Open question and changelog still say "SPEC-007 0.7 has no such pointer yet (H-091 owns it)". COLL-107 now closes it, and the Spec Index says so. Update the note.
4. **spec-writer (low):** specs outside SPEC-007 still cite deferred IDs as live behaviour: SPEC-005 line 211 (COLL-084 flag change), SPEC-008 SHARE-034 (COLL-084 and COLL-054 confirmation pattern), SPEC-010 (COLL-054 Undo timing, COLL-022 limit). The IDs and text still exist, so nothing breaks; note "deferred" there when those specs are next touched.
5. **spec-writer (low):** COLL-103 behaviours with no AC: the "This card is no longer in your collection." close notice and Previous / Next with `[` / `]` (SHOULD). Add a line to AC 34 or a new AC before build.

## Board note
The working tree also moves the H-091 row to `doing` on the Handoff Board (spec-writer's edit, not mine). RJ's gate: Open questions 11-15 (defer group-by-card; defer tag and exclude UI with the stuck-flag consequence; defer filters and manual edits; sort and count wording; dialog details line, Preview label, ", banned" in the accessible name).
