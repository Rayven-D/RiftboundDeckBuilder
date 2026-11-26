---
tags: [validation]
item: H-321
---
# Validation H-321

2026-11-26 · H-321 · PASS · V-009 documentation checks plus the item's Accept column · no failures (one non-blocking note).

## Checks
- **Accept (PASS):** `git diff origin/dev...HEAD` shows [[Decks]] edited in the Summary, §2 rule 5, the tile Legend-art bullet, choices 1 and 3 and acceptance point A1. No "no percentage" / "never percentages" text remains without a note pointing at [[Your Decks Ownership View]] 0.11.1 (current version, confirmed in its frontmatter). A grep for "percent", "%", "progress" and "score" finds no unannotated contradiction.
- **Claims vs SPEC-005 (PASS):** rule 5 (percentage only on the deck tile and the Deck detail header, not on the Missing tab, Card tab, dialog, section bar or Collection) matches OWN-101 (d), OWN-010 (f), OWN-111 (c) and OWN-054. No score, rank, sort, filter or meta comparison: OWN-054 and ADR-0003. Art filled by the whole deck's A / R, not the Legend card's own state: OWN-100 (b). `floor(100 x A / R)`, 1 to 99 unless empty or complete: OWN-101 (b). Tile "51%" at 16 px, weight 600: OWN-101 (d), v0.11, AC 36. AC numbers 23, 33, 36 exist and match their titles.
- **51% rounding (PASS):** 34 / 66 = 51.5, floor gives 51. The two wireframes that said 52% (desktop and phone header) now say 51%, which agrees with OWN-010 (f) and OWN-101 (d).
- **Wikilinks (PASS):** `[[Your Decks Ownership View]]` resolves; `[[Validation H-321]]` is this note.
- **Board (PASS):** H-321 row is `verify` in the diff; set to `done` by this run.

## Notes (non-blocking)
- Original text kept under "Superseded" notes (choice 1 option text, line ~541 "reads as a progress meter (OWN-054)", choice 3 "OWN-054 bans completion percentages") is historical and each is followed by a note with the current rule. Acceptable as annotation.
- The board row's Accept and text still say "0.10"; the current spec is 0.11.1 and the brief cites 0.11.1.
