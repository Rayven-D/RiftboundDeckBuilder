---
tags: [validation]
item: H-452
---
# Validation H-452

2026-11-26 · H-452 · PASS · unit tests, lint, build, test, browser · no failures

## Checks
- **(1) championMany (PASS):** the prompt reads "Pick the deck's Chosen Champion. The other Champion cards go in the Main Deck."
- **(2) Also in the Main Deck (PASS):** after the pick, three moved lines: Varrow, Ashen Blade ("1 copy is the Chosen Champion; the other copy moves to the Main Deck"), Ember Volley and Flashfire ("Not picked as Chosen Champion, so it moves to the Main Deck").
- **(3) legendUnresolved (superseded by DECK-104 / H-500, as briefed):** the string is gone (`grep legendUnresolved web/src` is empty). Evelynn-like list: no Legend prompt.
- **(4) Lines without a section (PASS):** heading and new note; user-placed rows read "You picked this section".
- **(5) removed note (PASS):** "4 lines are left out of the deck: line 6 (2 Nothing Like It), line 7 (1 Not A Card), line 11 (3 Gust), line 2 (Sorrel, Tide Reader). They will be listed on the deck's page."
- **(6) Code-used Remove line (PASS):** "OGN-012 is Quiet Harbor, so that card was used." has Remove line; removing it gives "1 line is left out of the deck: line 4 (Quiet Harbor)." and focus on the review heading.
- **(7) Catalog search: SKIPPED by spec decision** (the catalog has fewer than 20 champions).

Code checks, all on branch loop/H-410-H-480-deck-import-review: lint clean, build ok, ng test 88 files / 1387 tests passed (no flake). Browser: Playwright, Chrome, port 4310, emulators, fixture card data, dark scheme, 1440 wide unless noted.

## Notes
The left-out list is in removal order (line 2 last), not sorted by line number. Cosmetic, not filed.
