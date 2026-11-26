---
tags: [validation]
item: H-453
---
# Validation H-453

2026-11-26 · H-453 · PASS · unit tests, lint, build, test, browser at 1440 / 768 / 390 · no failures

## Checks
- **(1) Label (PASS):** the Deck name label sits inside the content (label top 187, content top 154); screenshots show it whole.
- **(2) One scroll (PASS):** with a 30-line Evelynn-like list the only scrolling element in the dialog is `mat-dialog-content`.
- **(3) Full screen at 40rem (PASS):** at 390 the pane is at x 0, y 0, 375 x 844 (a 15px classic scrollbar in headless Chrome), radius 0, actions pinned at the bottom. At 768 the pane is 720px with an 8px radius.
- **(4) Rows stack (PASS):** at 390 the Section select sits under the card name at full row width (327).
- **(5) Chosen Champion label (PASS):** counts line "Legend 1 Chosen Champion 1 Main Deck 9"; unit test for Section options.
- **(6) Width (PASS):** 1440 pane width 720.
- **No Cancel confirmation (RJ):** Cancel closed the dialog at once after answering.

Code checks, all on branch loop/H-410-H-480-deck-import-review: lint clean, build ok, ng test 88 files / 1387 tests passed (no flake). Browser: Playwright, Chrome, port 4310, emulators, fixture card data, dark scheme, 1440 wide unless noted.

## Notes
Light scheme and the 1024 breakpoint were not re-run here.
