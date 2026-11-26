---
tags: [validation]
item: H-451
---
# Validation H-451

2026-11-26 · H-451 · PASS · unit tests, lint, build, test, browser a11y tree · no failures

## Checks
- **(1) Save state (PASS):** blocked Save has `aria-disabled=true`, the `mat-mdc-button-disabled` look, stays focusable, `aria-describedby=deck-review-status`. Clicking it moved focus to the first open item ("Remove line 6" in Lines to fix).
- **(2) Status (PASS):** one `role=status` always present. Blocked: "3 cards need attention / 4 questions to answer"; after answering "Ready to save."; empty name "Give the deck a name.".
- **(3) Structure (PASS):** a11y tree shows groups named by their prompts; comboboxes "Section for Varrow, Ashen Blade (line 3)", "Section for Ember Volley (line 4)", "Section for Flashfire (line 5)" (three distinct names); text "Needs an answer" on open questions (5.79:1 against its background); h3 "Check the deck" and "Check these".
- **(4) Name and Link (PASS):** empty name gives `required` and `aria-invalid="true"`; typing "h" in Link shows no warning; after blur "This link isn't an http or https address, so it is kept as text." and the input's `aria-describedby` names it.
- **Unit tests (PASS):** `deck-review.spec.ts` and `import-dialog.spec.ts` H-451 tests; `decks-import-save.spec.ts` updated to the status region.

Code checks, all on branch loop/H-410-H-480-deck-import-review: lint clean, build ok, ng test 88 files / 1387 tests passed (no flake). Browser: Playwright, Chrome, port 4310, emulators, fixture card data, dark scheme, 1440 wide unless noted.

## Notes
Dark scheme only in this run.
