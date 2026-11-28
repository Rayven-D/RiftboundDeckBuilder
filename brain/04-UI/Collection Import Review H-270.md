---
tags: [ui, review, collection, import]
updated: 2026-11-27
status: review
---
# Collection Import Review (H-270)

Review of the H-158 Owned Cards Import pieces ([[Collection Import]]): the dialog's review step, the Replace and Undo
confirmations, the 10 s Undo snack bar. Done 2026-11-27, usage-saving run.

## What I could and could not look at
- **Looked at in a browser (Playwright, ~1040 wide, light):** Collection with the Small test set loaded as a guest (375 copies of
  50 cards, test-data banner, tiles). **No import FAB signed out** (H-679: imports are sign-in only), so the import dialog
  itself was not reachable. Seeding the signed-in state the way `web/e2e/fixtures.ts` does failed because the real
  Firebase session restore signed the page out (Firebase can't be blocked from the MCP browser).
- **Not looked at in a browser:** the review step, Replace/Undo confirmations, Undo snack bar, 390 px, dark mode.
- **Read in code instead:** `shared/import/import-dialog.ts` (+ `.scss`), `import-launch.ts`, `import-confirm-dialog.ts`,
  `collection-commit.ts`. Findings below are code-level and marked as such. A signed-in pass (RJ's own browser, or an e2e
  run with Firebase blocked and a screenshot step) is still needed for visual points: see builder row H-697.

## Decision: Add / Replace stays on the second step (RJ 2026-11-25)
Agreed as built. The paste step stays a single job (get the list in); the second step shows what will be counted (Ready line,
left-out lines) and then asks how, so the choice comes with the numbers it affects. **Do not reopen.**

## Findings (code-level)
| # | Finding | Verdict |
|---|---|---|
| 1 | Radio group has `aria-label` (words.modeLabel); each radio's label includes the hint text, so the name reads "Add to my collection <hint>". | Pass. Check the spoken name is not too long (see 5) |
| 2 | Focus: after close, `import-launch.ts` returns focus FAB, then opener, then the empty-state button (H-189 finding 2). Review step focuses its heading (`tabindex=-1`). | Pass |
| 3 | Back / Cancel / primary: Back is pushed left (`margin-right:auto`), Cancel and the primary on the right; busy state shows "Saving…" on the primary and keeps it focusable (`disabledInteractive`). | Pass |
| 4 | Status/alert roles: Ready line `role="status"`, none-matched and submit errors `role="alert"`; left-out and note lines use icon + "Line n:" text, not colour alone. | Pass |
| 5 | Radio rows: Material radio touch target is about 40 px; the whole label (two lines) is clickable, so the row passes 44 px when the hint wraps but a one-line hint at 390 px may measure under 44 px. | Measure, fix if under (H-697) |
| 6 | Left-out list is capped by `maxIssues` with "+n more": fine; the "+n more" line has no way to see them. | Note only, RJ call |
| 7 | Snack bar Undo lasts 10 s (spec). Keyboard users reach it only by moving focus into the snack bar; there is no later way to Undo. | Note: matches spec IMP-072..075; flag to RJ only if he wants a longer or persistent Undo |

## Seen in the browser (nits, not blocking)
- Collection tile: a long card name sits under the count badge ("Varrow, Ashen Blade" runs into "x2") and the locked
  line truncates ("3 of this card locked in Generated Locke…") in the 6-column layout at about 1040 px. Cosmetic; belongs to
  [[Collection]] polish, not H-158. Included in H-697 as an optional check.

## Builder items
- **H-697** (P3): signed-in browser pass of the review step, confirmations and snack bar at 1440 and 390, dark and light,
  with the 44 px radio measurement (finding 5).
