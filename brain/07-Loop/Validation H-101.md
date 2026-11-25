---
tags: [loop, validation]
item: H-101
date: 2026-11-24
round: 1
result: PASS
---
# Validation H-101: snack bars clear the phone tab bar (UI review #2)

Item: [[Handoff Board]] H-101. Accept: "At 375 px with a notice open, all four tabs are fully visible and tappable".
Also asked by the loop: 1440 unchanged, dark and light, the notice's OK button reachable by keyboard, H-139's focus ring intact.
Scope: uncommitted tree on `loop/H-101-snackbar-offset` (base ac93f84): `web/src/styles.scss` (`--tabbar-border: 1px` token,
one `@media (max-width: 40rem)` block with the pane and container rules), `web/src/app/app.scss` (tab-bar `border-top` uses the
token), new `web/src/tooling/snackbar-offset.spec.ts` (5 tests), new [[Brief H-101]]. Source: [[UI Review 2026-11-24]] #2.

## Result
2026-11-24 · H-101 · PASS · Accept (browser evidence + served CSS + Material cascade check), V-008 (web), test quality (mutation check), V-009 (changed notes), V-012 · failures: none

## Checks run
### V-008 (web), rerun by the validator from `web/`
| Command | Result |
|---|---|
| `npm run lint` | All files pass linting (exit 0) |
| `npm run build` | bundle generated (exit 0) |
| `npx ng test --watch=false` | 37 files, **532 passed** (exit 0) |
| `npm run test:rules` | not run: CSS-only change, no rules or services code touched (builder reported 34/34) |

These match the builder's report.

### Accept: four tabs visible and tappable at 375 with a notice open
Browser evidence is the ui-engineer's re-check in [[Brief H-101]] (Playwright on `ng serve` :4301). The validator has no
Playwright in this worktree and did not re-drive the browser. It did:
- **Served CSS:** `curl http://localhost:4301/styles.css` contains `--tabbar-border: 1px` and the H-101 block exactly as in the
  diff, so the re-check ran against this tree.
- **Screenshots** (`.playwright-mcp/h-101/`, untracked) opened and inspected: `recheck-375-dark-open` and `recheck-375-light-open`
  (notice sits above the bar with a visible gap; Decks, Collection, Tournaments and Import fully visible, labels and icons
  uncovered), `recheck-375-dark-ok-focus` (OK has the H-139 teal ring on all four edges, inside the notice, clear of the bar).
  The thin line above the notice at y ≈ 681 is the `.site-footer` border-top, also present in the pre-fix shots; not part of this item.
- **Re-check numbers** (brief): gap 8px at 375 dark/light and 640; pane `pointer-events: none`; real clicks on all four tabs
  navigate with the notice open; OK reachable by Tab, Enter and mouse click dismiss; 641 and 1440 dark/light keep Material's 8px
  margin with pane `auto`; console clean. The first pass (7px gap, pane blocking taps) is fixed by exactly the two changes recorded.
- **Calc:** 64px bar + 1px hairline + inset + 8px = 73px margin at inset 0; with a non-zero inset the bar grows by the same
  `env(safe-area-inset-bottom)` as the margin, so the 8px gap holds (reasoned, not simulated in a browser).

### CSS vs the brief (Material 22.3.0, `node_modules/@angular/material/fesm2022/snack-bar.mjs`)
- Material sets `.mat-mdc-snack-bar-container { margin: 8px }` (0,1,0) in component styles that load after `styles.css`; the
  doubled selector (0,2,0) wins without `!important`. Material's snack-bar styles set no `pointer-events`, so the container's
  `auto` and the pane's `none` come only from this rule (the pane's inline CDK styles set no pointer-events either, per the brief's measurement).
- Bottom margin only; Material's side/top 8px and handset `width: 100vw` untouched. No snack-bar rule outside the 40rem query.
- `:has()` instead of `.mat-mdc-snack-bar-handset`, so 600-640px panes are covered (the brief's 640 re-check confirms).
- **H-139 intact:** `git diff web/` does not touch the focus rules (`styles.scss` lines ~269-300 unchanged), and
  `focus-ring.spec.ts` passes in the 532.

### Test quality
All five tests carry `H-101` in their names and parse the stylesheet source (the file says why: no cascade or media queries in
jsdom). Mutation check by the validator (the spec's parsing logic run against edited copies of `styles.scss`):

| Mutation | Caught by |
|---|---|
| unmutated file | none fail (expected) |
| single class selector | tests 1, 2, 4 |
| hairline token dropped from the calc | test 2 |
| `!important` added | test 2 |
| `margin: 8px` shorthand added | test 2 |
| pane `pointer-events: none` removed | test 4 |
| container `pointer-events: auto` removed | test 4 |
| `.mat-mdc-snack-bar-handset` instead of `:has()` | test 4 |
| breakpoint `48rem` | tests 1, 2, 4, 5 |
| snack-bar rule also at top level | test 5 |
| token `2px` | test 3 |

Not hollow. The tap and gap behaviour itself is covered by the Playwright re-check, not by unit tests.

### Other checks
- **V-009 (changed notes):** [[Brief H-101]] links [[UI Review 2026-11-24]], [[Brief H-139]], [[Design Direction]], [[UI Index]]: all resolve.
- **V-012:** `git grep RGAPI-` outside `brain/`: no matches.
- V-010 / V-011: not in scope (CSS only; no data, no imports).

## Notes (not failures)
1. **[[UI Index]] has no row for [[Brief H-101]]** (H-139's brief got one). Doc hygiene; add it when the branch is committed.
2. **Brief Decision 3 still shows the old calc** (no hairline); the post-build section records the change. Fine as history, but a
   reader of Decisions alone gets the wrong value.
3. The validator did not re-drive the browser (no Playwright here); browser evidence is the ui-engineer's re-check, with screenshots
   inspected and the served CSS confirmed. The simulated safe-area inset was reasoned from the calc, not measured.
4. After dismissal, focus falls to `body` (Material default). Out of scope, as the brief says; candidate for a later polish item.
