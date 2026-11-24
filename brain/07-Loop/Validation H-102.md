---
tags: [loop, validation]
item: H-102
date: 2026-11-24
round: 1
result: PASS
---
# Validation H-102: danger button variant and danger menu item (UI review #3)

Item: [[Handoff Board]] H-102. Accept: "Delete label contrast ≥ 4.5:1 dark and light; not teal; variant on `/styleguide`".
Also asked by the loop: H-139's focus ring on the danger button, H-101's snack-bar offset intact, only one divider (before
"Delete account and data") added to the account menu.
Scope: uncommitted tree on `loop/H-102-danger-button` (base 67f0eb8): `web/src/styles.scss` (`--color-danger-contrast` token dark
and light, `.mat-mdc-button-base.danger` via `mat.button-overrides`, `.mat-mdc-menu-item.danger` via `mat.menu-overrides`),
`web/src/app/core/sync/account-menu.ts` (one `<mat-divider />` + `class="danger"` on the delete item), styleguide Buttons section,
3 new tests (2 in `account-menu.spec.ts`, 1 in `styleguide-page.spec.ts`), [[UI Index]] row, new [[Brief H-102]].
Source: [[UI Review 2026-11-24]] #3.

## Result
2026-11-24 · H-102 · PASS · Accept (contrast computed + browser evidence + screenshots), V-008 (web), test quality (mutation check), H-139/H-101 regression, V-009 (changed notes), V-012 · failures: none

## Checks run
### V-008 (web), rerun by the validator from `web/`
| Command | Result |
|---|---|
| `npm run lint` | All files pass linting (exit 0) |
| `npm run build` | bundle generated (exit 0) |
| `npx ng test --watch=false` | 37 files, **535 passed** (532 baseline + 3 H-102) (exit 0) |
| `npm run test:rules` | not run: no rules or services code touched (builder reported 34/34) |

### Accept: Delete label contrast ≥ 4.5:1, not teal
Computed by the validator (WCAG 2.x relative luminance, node script) from the token values in `styles.scss`:

| Theme | Label / fill | At rest | 8% hover layer | 12% focus/pressed layer |
|---|---|---|---|---|
| Dark | `#3b0a0a` on `#f09595` | **7.65** | 6.68 | 6.17 |
| Light | `#ffffff` on `#a32d2d` | **7.07** | 6.06 | 5.58 |

These match the comments in `styles.scss` and the brief; the ui-engineer's live `getComputedStyle` values (6.66/6.19 dark,
6.05/5.57 light) differ by ≤ 0.02 from the state-layer rounding. All ≥ 4.5. Fill is red in both themes (not teal); the
green preview does not change it (brief check #8).

**Variant on `/styleguide`:** Buttons section (filled accent, outlined, text, filled danger, disabled danger, dialog actions row).
Screenshots opened (`.playwright-mcp/h-102/`, untracked): `1440-dark-buttons` (salmon fill, dark label; disabled neutral grey;
Import stays teal), `1440-light-dialog-focus` (dark-red fill, white label, teal H-139 ring outside the button on all four edges),
`375-dark-menu` and `1440-dark-menu-focus` (one divider above "Delete account and data" in danger red; inset focus ring on the item).

### Also checked
- **One divider only:** `account-menu.ts` adds exactly one `<mat-divider />`, directly before the delete item; asserted by the
  new test and by the brief's browser check #12.
- **H-139 intact:** no focus rule lines changed in `styles.scss` (only comments mention the ring); `focus-ring.spec.ts` passes in
  the 535; ring outside the danger button seen in the screenshot (ring vs bg 8.90 dark teal / 5.05 light per brief).
- **H-101 intact:** no snack-bar or `--tabbar-border` lines changed; `snackbar-offset.spec.ts` passes; brief check #16 measured the
  8px gap at 375 after the dialog closed, and the served CSS still has the H-101 rules (check #17).

### Test quality
Mutation check by the validator (files edited, the two spec files run, files restored byte-identical via `cmp`):

| Mutation | Caught by |
|---|---|
| unmutated | 30/30 pass |
| divider removed from the menu | menu test |
| `class="danger"` removed from the menu item | menu test |
| divider moved before "Sync now" | menu test |
| second divider added | menu test |
| `class="danger"` removed from the dialog's Delete account | dialog test |
| `class="danger"` removed from the styleguide buttons | styleguide test |

Not hollow. Gap (note, not a failure): no unit test asserts the `.mat-mdc-button-base.danger` / `.mat-mdc-menu-item.danger`
rules or the `--color-danger-contrast` token exist in `styles.scss`; deleting them would pass all tests. The colour itself is
covered by the browser check and the computed ratios above.

### Other checks
- **V-009 (changed notes):** [[Brief H-102]] links [[UI Review 2026-11-24]], [[Brief H-139]], [[Brief H-101]], [[Design Direction]],
  [[UI Index]]: all resolve. [[UI Index]] has a row for [[Brief H-102]].
- **V-012:** `git grep RGAPI-` outside `brain/`: no matches.
- V-010 / V-011: not in scope (no data, no imports).

## Notes (not failures)
1. No stylesheet test for the danger CSS (see Test quality). A source-parsing test like H-101's would close it cheaply.
2. The validator did not re-drive the browser; browser evidence is the ui-engineer's check in [[Brief H-102]] (dev-mode
   `sync.status.set` to reach the signed-in menu, dialog closed with Escape), with screenshots inspected.
3. Brief decision 6 misstates the divider colour (Material's `#3c4947` / `#d7e6e1`, not `--color-border`); recorded in the brief's
   Check section and handed to H-110.

## Addendum (after code review, 2026-11-24)
Note 1 closed: `web/src/tooling/danger-button.spec.ts` (7 `H-102:` tests) reads `styles.scss` and checks the `--color-danger-contrast` tokens, the `.mat-mdc-button-base.danger` and `.mat-mdc-menu-item.danger` rules (no `!important`, no `outline`), a neutral disabled fill, and WCAG ≥ 4.5 of label on fill per scheme. Deleting the danger rules fails 4 of them. Lint green; `ng test` 38 files, **542 passed**. Verdict unchanged: PASS.
