---
tags: [validation]
item: H-469
---
# Validation H-469

2026-11-26 · H-469 · PASS · unit test, lint, build, test, browser · no failures

## Checks
- **Focus (PASS):** Owned Cards Import, Continue by mouse and by keyboard: `document.activeElement` is H3 "Check the cards", never BODY. Unit test "ImportDialog Owned Cards review focus (H-469...)".
- **Focus ring:** after mouse Continue `:focus-visible` is false (no ring); after keyboard Continue it is true. That is the intended behaviour, same as the Deck Import review.
- **Heading text:** "Check the cards" is the builder's own wording (not in SPEC-003). Accepted; adoption filed in H-501.

Code checks, all on branch loop/H-410-H-480-deck-import-review: lint clean, build ok, ng test 88 files / 1387 tests passed (no flake). Browser: Playwright, Chrome, port 4310, emulators, fixture card data, dark scheme, 1440 wide unless noted.

## Notes
Adds `check` to `REVIEW_TEXT`.
