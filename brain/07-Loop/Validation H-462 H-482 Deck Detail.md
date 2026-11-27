---
tags: [loop, validation]
item: H-462, H-464, H-466, H-467, H-468 (1)(4)(5)(10), H-482 (without the tile %), H-520
date: 2026-11-26
round: 1
result: PASS
---
# Validation H-462 H-464 H-466 H-467 H-468 (part) H-482 (part) H-520: Deck detail review fixes

Branch `loop/H-462-H-482-deck-detail` (commits 36c2876, merge b99fcd1, 1bb9a0e; `git diff origin/dev...HEAD`: 17 files,
web code, specs and the board). Specs: [[Your Decks Ownership View]] 0.11.1 (OWN-110 / AC 34, OWN-119 (b) / AC 35),
[[Decks Review]], [[Decks]] §6 and §9.

## Per item
| Item | Result | Evidence |
|---|---|---|
| H-462 | PASS | Tests: Rename Cancel / Save and Delete Cancel focus More actions; Delete focuses the first tile link on `/decks`; Undo focuses the restored deck's tile; last deck deleted focuses the empty state's Import deck; `DeckListFocus` unit tests. Screenshots `h462-*` (after delete, after undo, 390 empty) show the focus ring. |
| H-464 | PASS | Test: bar has no translucent mix and no blur, sits on the content edges, back link only as wide as its content. `h464-*` screenshots (1440 and 390, both themes): no heading text shows through the bar. |
| H-466 | PASS | Tests: "1 of 1 card fully available" (header, Missing tab); complete deck shows "Missing" + "All cards available", no "0 copies"; empty section "Legend · 0 cards", also locked. `h466-*` screenshots match. |
| H-467 | PASS | Tests: not-found uses `.back` with `arrow_back` (44px on phones); Lock in 40px with a fine pointer from 40rem. `h467-*` header and `h482-*-notfound` screenshots (the `h467-*-notfound` ones are pre-H-482) show the same back link as the populated page. |
| H-468 parts (1), (4), (5), (10) | PASS (part) | (1) theme toggle uses `@switch`, spec asserts no NG0956; (4) `matMenuItemIcon` slot, `h468-*-more-menu` screenshots show icon and text centred; (5) Duplicate uses new `library_add` icon, not `stacks`; (10) "Showing <card name>" status at 64rem and wider, none below. **Parts (7), (8), (9) are not built and stay on H-468, which stays `review`.** |
| H-482 (without tile %) | PASS (part) | AC 34: bar reads "Legend" / "Champion" when full, "Legend 0" / "Champion 0" (still muted) when empty, "Main N" and "Battlefields 0" always counted (`navLabel` tests, `h482-*-legend0-bar` screenshots). AC 35: one H1 "This deck isn't in your decks", no "Deck detail" text, message and Back to Decks link (`app-empty-state` `headingLevel` 1; `h482-*-notfound`). **Deck tile % 16px / 600 (OWN-101 (d) / AC 36) belongs to the other session (deck-tile); not validated here, H-482 stays `review`.** |
| H-520 | PASS | Test: from 40rem the reason line is `flex: 0 0 100%`, start aligned, negative margin on the end side; phones unchanged. Screenshots 1440 / 1024 / 768 light and dark and the 120-character case: the reason starts under Lock in and ends at More, wraps inside the row, box inside the gutter at 768. |

## Checks run
- `npm run lint` (web): All files pass linting.
- `npm run build` (web): complete, no errors.
- `ng test --no-watch` (web): first run 1343 / 1350 (7 failures while a build was running alongside; only the first was readable in the tail output, a 5 s timeout in `shared/sync/sync-engine-cache.spec.ts`, AC 62 / SYNC-145); clean rerun 1349 / 1350, the one failure again the same 5 s timeout. That spec alone: 9 / 9 pass (20 s). Judged a load-dependent flake, unrelated to this diff (no sync or cache code changed). Not a blocker; the builder's "1345 / 1346" is the same flake.
- Rules tests (`test:rules`): SKIPPED (no `firestore.rules` or rules code in the diff).
- Spec-to-test traceability: AC 34 (`navLabel` unit test and Deck detail spec), AC 35 (Deck detail spec), OWN-050 singular (`cardsLine` test), H-462 (4 Deck detail tests + 4 `DeckListFocus` tests), H-520 and H-464 (style assertions), H-468 (1), (4)/(5), (10) (one test each, plus the below-64rem negative case). Every in-scope Accept clause has a test or screenshot. PASS.
- Footprint: 17 files. Outside the Deck detail page and its `shared/deck-detail` helpers, the builder touched `core/theme/theme-toggle.ts` (NG0956 source, 12 lines + a spec), `shared/empty-state.ts` (`headingLevel` input, default 2, so other users unchanged), `shared/icon.ts` (one path), `shared/deck/lock-actions.ts` (H-520 / H-467 CSS, scoped to `.in-row`), new `shared/deck/deck-list-focus.ts` (+ spec) and 4 lines in `pages/decks/decks-page.ts` (inject + one `afterNextRender` call after the list loads). Minimal, no overlap with deck-tile or list rendering. PASS.
- Board diff: only the 5 H-462…H-520 rows moved `todo` to `review`; no `next_id` change. PASS.
- Accessibility / design skills: not loaded; focus order, name and 44px targets are covered by the tests and screenshots above.

## Follow-up
- H-521 (builder, P3): "1 of 1 copies available" stays plural (`copiesLine` in `detail-view.ts`, `ownershipLine` in `core/decks/deck-ownership-view.ts`). Outside H-466's scope (the "cards fully available" line). Not a failure of any item here.

No failures.
