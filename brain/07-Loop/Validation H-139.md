---
tags: [loop, validation]
item: H-139
date: 2026-11-24
round: 1
result: PASS
---
# Validation H-139: visible keyboard focus on Material buttons and menu items (UI review #1)

Item: [[Handoff Board]] H-139 (formerly H-100). Accept: "Tab through header, gate panel, sign-in dialog and account
menu at 1440 and 375, dark and light: every stop shows a ring ≥ 3:1 (WCAG 2.4.7)".
Scope: uncommitted tree on `loop/H-139-focus-ring` (base 49e3f8d): `web/src/styles.scss` (+30/-4),
`web/src/app/core/sync/sync-dialogs.ts` (`.email` padding-bottom), new `web/src/tooling/focus-ring.spec.ts`,
new [[Brief H-139]], one row in [[UI Index]]. Brief: [[Brief H-139]]; source: [[UI Review 2026-11-24]] #1.

## Result
2026-11-24 · H-139 · PASS · Accept (browser evidence + validator cascade/contrast checks), V-008 (web), test quality (mutation check), V-009 (changed notes), V-012 · failures: none

## Checks run
### V-008 (web), rerun by the validator from `web/`
| Command | Result |
|---|---|
| `npm run lint` | All files pass linting (exit 0) |
| `npm run build` | bundle generated (exit 0) |
| `npx ng test --watch=false` | 36 files, **527 passed** (exit 0) |
| `npx ng test --watch=false --include src/tooling/focus-ring.spec.ts` | 1 file, 4 passed |
| `npm run test:rules` (JDK 21 on PATH) | 4 files, **34 passed**, script exited 0 |

These match the builder's report.

### Accept: the ring at every stop
Browser evidence is the ui-engineer's Playwright runs 1 and 2 (recorded in [[Brief H-139]]) plus the loop's own held-Space
check; the validator had no Playwright install in this worktree, so it did not re-drive the browser. It did:
- **Screenshots** (`.playwright-mcp/h139/`, untracked) opened and inspected: `r2-375-light-dialog-sendlink` (Send link ring
  shows all four edges, not clipped), `1440-light-account-menu-keyboard` (Sign out item has the inset ring inside the panel),
  `375-dark-collection-gate-signin` (gate Sign in filled button, ring outside the fill on the panel surface). All as described.
- **Held Space** (loop check, 1440 light, gate Sign in, filled): `:active` and `:focus-visible` both true, computed outline
  `solid 2px rgb(15,118,110)`, offset 2px. Matches the cascade reasoning below.
- **Contrast recomputed from the tokens in `styles.scss`** (WCAG relative luminance), ring vs background:

  | Ring | bg | surface | raised | own accent fill |
  |---|---|---|---|---|
  | dark teal #2dd4bf | 8.90 | 7.78 | 6.76 | 1.34 |
  | light teal #0f766e | 5.05 | 5.47 | 4.65 | 1.00 |
  | dark green #4ade80 | 9.50 | 8.31 | 7.22 | 1.83 |
  | light green #166534 | 6.58 | 7.13 | 6.06 | 1.42 |

  Teal figures and all green bg/surface/raised figures match the brief exactly. Every surface the ring sits on is ≥ 3:1;
  only the accent fill fails, which the outside offset on buttons avoids (see note 1 for a doc-only mismatch in the green
  accent column).

### CSS vs the brief (Material 22.3.0 styles read from `node_modules/@angular/material/fesm2022`)
- Material rules confirmed: `.mdc-button { outline: none }` (0,1,0), `.mdc-button:active { outline: none }` (0,2,0),
  `.mat-mdc-icon-button { outline: none }` (0,1,0), `.mat-mdc-menu-item { outline: none }` (0,1,0),
  `.mat-mdc-menu-item:focus { outline: 0 }` (0,2,0), `.mat-mdc-fab-base:active, :focus` (0,2,0; no FABs in the app).
- `.mat-mdc-button-base.mat-mdc-button-base:focus-visible` = (0,3,0) and the two panel-scoped menu selectors = (0,3,0):
  each beats every Material rule above regardless of load order, no `!important`. Correct.
- Offsets: buttons `2px` (outside), menu items `-2px` (inset). Matches Decisions 2–3.
- Forced colors: `@media (forced-colors: active)` sets `outline-color: Highlight` on all three selectors. Material's own
  forced-colors `.mat-mdc-icon-button.mat-mdc-icon-button { outline: solid 1px }` is (0,2,0), so ours wins on focus.
- No transition: the `.button, .mat-mdc-button-base` list is background-color, box-shadow, transform only; `outline` is
  not in any `transition:` declaration in `styles.scss` or `web/src/app`.
- The old icon-only rule of H-095 fix 6 is replaced by the broader button rule (icon buttons still carry
  `.mat-mdc-button-base`). Form fields untouched, as the brief decides.
- `sync-dialogs.ts`: `.email { padding-bottom: var(--space-1) }` with an H-139 comment; scoped to the sign-in dialog's
  component styles only.

### Test quality
All four tests in `focus-ring.spec.ts` carry `H-139` in the describe and `it` names. They parse `styles.scss` (the file
says why: jsdom has no cascade and the unit-test builder loads no global styles). Mutation check by the validator
(same parsing logic run against edited copies of the stylesheet):

| Mutation | Caught by |
|---|---|
| single class `.mat-mdc-button-base:focus-visible` | tests 1, 4 |
| button offset `-2px` | test 1 |
| menu offset `2px` | test 2 |
| `CanvasText` instead of `Highlight` | test 3 |
| `!important` added | tests 2, 4 |
| `outline-color` added to the button transition list | test 4 |
| `transition: all` added | **not caught** (note 2) |

Not hollow. The browser behaviour itself is covered by the Playwright acceptance runs, not by unit tests.

### Other checks
- **V-009 (changed notes):** [[Brief H-139]] links [[UI Review 2026-11-24]], [[Design Direction]], [[UI Index]]: all resolve.
  [[UI Index]] row links [[Brief H-139]]: resolves.
- **V-012:** `git grep RGAPI-` outside `brain/`: no matches.
- V-010 / V-011: not in scope (CSS and one component style string; no data, no imports).

## Notes (not failures)
1. **Brief contrast table, green accent column is wrong:** it says (1.43) dark / (1.30) light for the ring on its own green
   fill; the tokens give **1.83** dark (#4ade80 on #22a559) and **1.42** light (#166534 on #15803d). Run 2's prose
   "1.42 / 1.83" has the right numbers in light/dark order. Both values are < 3:1, so the conclusion (keep the outside
   offset) stands. Doc fix for the ui-engineer/builder when the brief is next touched.
2. **Test 4 does not catch `transition: all`** on a button (it only looks for the word `outline` in transition values).
   Low risk; could be tightened to reject `all` too.
3. **Test 3** checks only the menu `.cdk-keyboard-focused` selector inside the forced-colors block, not the menu
   `:focus-visible` one. Low risk.
4. **Not browser-checked by anyone:** the account menu in a real signed-in session (reached by setting the sync status in dev
   mode; the DOM and CSS are the real ones) and the green preview at 375. Green is a preview only, not shipped.
5. The validator did not re-drive the browser itself (no Playwright in this worktree); browser evidence is the
   ui-engineer's runs and the loop's held-Space check, with screenshots inspected.
