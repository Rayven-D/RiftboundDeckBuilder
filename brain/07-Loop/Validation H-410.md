---
tags: [validation]
item: H-410
---
# Validation H-410

2026-11-26 · H-410 · PASS · unit tests, lint, build, test, browser, scope · no failures

## Checks
- **DECK-027 / AC 32 (PASS):** `deck-import.spec.ts` "DECK-027 / AC 32: Champion: 2 X gives champion x1 and main +1 (39 in all), no question, nothing removed"; the same card on two lines; DECK-025 `Champion: 1` + `Main Deck: 1` unchanged; user-placed 3-copy line (DECK-105). Browser: `Champion:` / `2 Varrow, Ashen Blade` gives Legend 1, Chosen Champion 1, Main Deck 10, 0 questions, status "Ready to save.", and "Also in the Main Deck: 1 Varrow, Ashen Blade, 1 copy is the Chosen Champion; the other copy moves to the Main Deck".
- **API Contracts (PASS):** the diff updates `brain/05-Services/API Contracts.md`.
- **Scope (PASS):** the diff is the import dialog files, `web/src/styles.scss` (H-453 panel class), `decks-import-save.spec.ts`, API Contracts and the critique note. `git status` is clean: no untracked `brain/Build Matching.md` or `web/public/import/` is staged.

Code checks, all on branch loop/H-410-H-480-deck-import-review: lint clean, build ok, ng test 88 files / 1387 tests passed (no flake). Browser: Playwright, Chrome, port 4310, emulators, fixture card data, dark scheme, 1440 wide unless noted.

## Notes
AC 40 as written (`2 Gust` under `Main Deck:` asking PICK_ZONE) cannot occur, because a section label places the line. Agreed with the builder: the DECK-105 test uses an unsectioned line, the only reachable case. Spec fix filed as H-501.
