---
tags: [loop, validation]
item: H-391
date: 2026-11-25
round: 1
result: PASS (H-391)
---
# Validation H-391: Decks pieces on /styleguide

Item: [[Handoff Board]] H-391. Pieces from [[Decks Components]] (H-060, H-254) shown on `/styleguide`.
Scope: uncommitted tree on `loop/H-391-styleguide-decks`. New `pages/styleguide/deck-samples.ts`, `decks-preview.ts`;
edited `styleguide-page.ts`, `styleguide-page.spec.ts`, [[Decks Components]] section 16. `git diff` shows no shared
component changed.

## Checks
- V-008 lint: `npm run lint` passes. Build: `npm run build` passes.
- V-008 tests: `npm test -- --watch=false` 85 files, 1283 tests, all passed (the sync-engine-cache timeouts the builder
  saw did not recur; that file is untouched and unrelated).
- Browser (Edge via Playwright, dev server on 4206, stopped afterwards), 1440 and 375, light and dark: section
  "Decks (H-060, H-254)" renders 10 deck tiles, 17 status chips, 14 lock badges, 4 lock-action sets, 6 card tiles plus
  list rows and the right panel (Card / Missing tabs). Both Lock in dialog buttons open `app-lock-in-dialog` at every
  size and theme. No console errors or warnings, no horizontal scroll.
- Icon gap: Copy missing list, Lock in and Unlock buttons each measure an 8 px gap between icon and label.
- V-010: no metagame statistics added (sample data only).

## Result
2026-11-25 · H-391 · PASS · lint, build, tests, browser at 2 sizes x 2 themes · no failures
