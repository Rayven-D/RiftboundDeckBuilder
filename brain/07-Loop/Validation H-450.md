---
tags: [loop, validation]
date: 2026-11-25
board: H-450
status: done
---
# Validation H-450: Deck Import review, stable select and focus

2026-11-25 · H-450 · **PASS** · V-008 (lint, build, tests), Accept check in a real browser (Variant A), test naming · 0 failures

Item: [[Critique H-341 Deck Import Review]] findings 1 and 2. Code: `web/src/app/shared/import/` (uncommitted on `loop/H-450-import-review-focus`). Spec: [[Deck Import]].

## V-008
| Check | Result |
|---|---|
| `npm run lint` (web) | pass, "All files pass linting." |
| `npm run build` (web) | pass |
| `npm test -- --watch=false` (web) | 1321 / 1322 on the second full run (first run: 5 timeouts under load); the one failure, `sync-engine-cache.spec.ts` "AC 62 / SYNC-145 3,000 entries and 200 decks" (5000 ms timeout), is unrelated to the import files and **passes alone** (9 / 9). Load flake, as H-420 / H-430. |

## Accept check in a browser (Playwright-core, Chrome, `ng serve --port 4213`, Auth emulator, signed in by email link)
Input: Variant A (two Legends, `3 Varrow, Ashen Blade`, `3 Ember Volley`, `2 Flashfire`, two unknown lines, `Main Deck:` with two Battlefields, `3 Gust`).

| Step | `document.activeElement` | Result |
|---|---|---|
| Continue | h3 "Check the deck" | ok |
| Answer first PICK_ZONE (Line 3) with Champion | next question's `mat-select` | the 2 remaining Section selects (Ember Volley, Flashfire) both show the placeholder and an empty value: **pass** (the critique's blocker no longer reproduces) |
| Put all in Main Deck | h3 "Check the deck" | ok |
| Move to Battlefields | next Move to button | ok |
| Remove line (3 times) | next Remove line, then "Check the deck" when the list is gone | ok |
| Back | textarea "Card list" | ok |

`BODY` or null focus count: **0** across all steps. No console errors.

## Unit tests
- Stable track: `deck-import.spec.ts` ("H-450 / DECK-033…035: a question is keyed by its kind and first line…", "H-450 / DECK-036: …still has a key"); `deck-review.spec.ts` ("each question keeps its own select instance when an earlier one leaves (stable track)", first-answer leaves other selects empty, PICK_LEGEND shows its answer, six focus-move tests); `import-dialog.spec.ts` (Continue / Back focus).
- Naming: every new test carries `H-450 / DECK-nnn` (requirement or item), as V-005 asks.

## Not tested in the browser
Use <card> (code-used pick) focus move and answering the last question: covered by unit tests only. Real screen reader not used.

## Follow-ups
None. Setup left as found: dev server on 4213 stopped; Auth emulator (9099), Firestore (8080) and services (3000) were already running and were left running.
