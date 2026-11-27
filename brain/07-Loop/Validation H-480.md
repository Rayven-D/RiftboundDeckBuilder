---
tags: [validation]
item: H-480
---
# Validation H-480

2026-11-26 · H-480 · PASS · unit tests, lint, build, test, browser · no failures

## Checks
- **Unit tests (PASS):** `deck-import.spec.ts` section M named DECK-100 / DECK-101 / AC 34 to 37 (zone answer kept; blank line above keeps it; edited line asked again; changed section label drops Move to; identical-line occurrence; Legend and Champion answers kept only for the same candidates; removed lines kept; suggestion picks, name, Source and Link not kept); `import-dialog.spec.ts` "Back keeps answers" (DECK-100 to 102).
- **Browser (PASS):** answered Flashfire's zone (Sideboard), Back, edited another line (3 to 4 Cinder Recruit), Continue: 0 questions, Flashfire still Sideboard ("You picked this section"), "Ready to save.". Editing the answered line (2 to 3 Flashfire): 1 open question. Cancel closes the dialog; reopened, nothing is kept (DECK-102).
- **Judged builder choice:** a zone answer on a line that needs a pick again is dropped (`next.lines[to].card` check). It fits DECK-100 "answers tied to edited lines are dropped". Recorded for the spec in H-501.

Code checks, all on branch loop/H-410-H-480-deck-import-review: lint clean, build ok, ng test 88 files / 1387 tests passed (no flake). Browser: Playwright, Chrome, port 4310, emulators, fixture card data, dark scheme, 1440 wide unless noted.

## Notes
The AC 39 fix-by-pick test uses a PRINTING_NAME_MISMATCH Legend line because H-272 suggestions are not built. Judged reasonable; H-501 asks the spec to say so.
