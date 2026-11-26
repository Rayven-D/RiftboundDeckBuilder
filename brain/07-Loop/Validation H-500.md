---
tags: [validation]
item: H-500
---
# Validation H-500

2026-11-26 · H-500 · PASS · unit tests, lint, build, test, browser · no failures

## Checks
- **DECK-104 / AC 39 (PASS):** tests named `DECK-104 / AC 39`: typo Legend line gives no PICK_LEGEND, no legendNone, no questions, Save blocked, name `Imported deck <date>`; fixed gives the Legend; removed gives PICK_LEGEND with legendNone; also next to a Legend line that did resolve. AC 3 / AC 33 (no Legend line) still pass. `legendUnresolved` no longer appears in `web/src`.
- **Browser (PASS):** `Legend:` / `1 Varrow, Ember Wardn`: Lines to fix shows line 2, status "1 card needs attention", 0 Legend selects, no "This list has no Legend.", no "to answer", name "Imported deck Nov 26, 2026", Save `aria-disabled=true`. Remove line 2: "This list has no Legend. Pick one, or leave it empty." and "1 question to answer". Back, fix the name, Continue: 0 questions, "Ready to save.", name "Varrow, Ember Warden".
- **Judged builder choices:** resolved Legend lines wait while held (`legendHeld` is true for any attention line under `Legend`); a parse-error Legend line does not hold. Both are consistent with DECK-104 as RJ decided it; recorded for the spec in H-501.

Code checks, all on branch loop/H-410-H-480-deck-import-review: lint clean, build ok, ng test 88 files / 1387 tests passed (no flake). Browser: Playwright, Chrome, port 4310, emulators, fixture card data, dark scheme, 1440 wide unless noted.
