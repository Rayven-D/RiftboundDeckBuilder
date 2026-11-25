---
title: Brief H-102 - Danger button variant and danger menu item
status: ready
board: H-102
source: "[[UI Review 2026-11-24]] finding #3"
date: 2026-11-24
---

# Brief H-102: the destructive action looks destructive

**Problem.** `DeleteAccountDialog` (`web/src/app/core/sync/sync-dialogs.ts` ~214) renders
`<button matButton="filled" class="danger">`, but no `.danger` style exists, so Delete account is the teal
primary button. In the account menu (`account-menu.ts` ~40) Delete account and data sits directly under
Sign out, with nothing to tell them apart.

## Decisions
1. **Filled danger, not outlined/text.** Delete account is the dialog's one commit action (Cancel is a text
   button beside it), and it is already gated by typing `delete`, so a loud fill is earned. Outlined danger
   (label + 1px edge `--color-danger`, 7.44 / 6.53 on the dialog bg) would pass too but sits too close to
   Sign out anyway (outlined). Rejected.
2. **New token `--color-danger-contrast`** (label on the danger fill), next to `--color-danger` in both
   `:root` blocks, with ratios in the comment like the accent tokens. The green preview doesn't touch danger.

   | Measured (WCAG) | Dark | Light |
   |---|---|---|
   | Fill `--color-danger` | `#f09595` | `#a32d2d` |
   | Label `--color-danger-contrast` | `#3b0a0a`: **7.65** | `#ffffff`: **7.07** |
   | Label on hover (8% label-colour state layer) | 6.68 | 6.06 |
   | Label on focus/pressed (12%) | 6.17 | 5.58 |
   | Fill vs dialog bg (`--color-bg`) | 7.44 | 6.53 |
   | Focus ring (2px outside) vs dialog bg / vs raised (if finding #11 lands) | 8.90 / 6.76 | 5.05 / 4.65 |
   | Ring vs the fill itself | 1.20 | 1.29 |

   The ring would vanish against the fill (1.20 / 1.29), so it must stay **outside** (H-139's 2px offset).
   Don't inset it.
3. **Disabled (until `delete` is typed): neutral, not red, not teal.** Fill `color-mix(in srgb,
   var(--color-text) 12%, transparent)`, label `var(--color-text-muted)`: 4.69 dark / 4.66 light on the dialog
   bg (3.52 / 4.29 on raised). Disabled is exempt from 1.4.3, but it stays readable. Set it explicitly in the
   danger overrides; don't rely on Material's `on-surface` default (its neutral comes from the generated palette).
   Cursor default, no hover layer (Material does that already).
4. **Hover / focus / pressed:** Material's state layer in the label colour (`filled-state-layer-color` +
   `filled-ripple-color` = `--color-danger-contrast`), opacities left at Material's defaults. Keep the existing
   1px hover lift and transitions. No colour change on the ring.
5. **Implementation, Angular Material 22 M3.** In `web/src/styles.scss`, below the global `button-overrides`:
   ```scss
   .mat-mdc-button-base.danger {
     @include mat.button-overrides((
       filled-container-color: var(--color-danger),
       filled-label-text-color: var(--color-danger-contrast),
       filled-state-layer-color: var(--color-danger-contrast),
       filled-ripple-color: color-mix(in srgb, var(--color-danger-contrast) 12%, transparent),
       filled-disabled-container-color: color-mix(in srgb, var(--color-text) 12%, transparent),
       filled-disabled-label-text-color: var(--color-text-muted),
       text-label-text-color: var(--color-danger),
       outlined-label-text-color: var(--color-danger),
       outlined-outline-color: var(--color-danger),
     ));
   }
   ```
   The mixin only emits `--mat-button-*` custom properties on the element, which beat the values inherited from
   `html`, so the global overrides and the H-139 focus rule (0,3,0, `outline`) are untouched. Text/outlined
   tokens are included so `class="danger"` works on any variant, but only filled is used today. No `!important`,
   no new Material theme. Scope to `.mat-mdc-button-base.danger`, not a bare `.danger`.
6. **Account menu.** Import `MatDivider`; add one `<mat-divider />` directly before Delete account and data
   (only this one; H-110 adds the rest). Give that item `class="danger"` and in `styles.scss`
   `.mat-mdc-menu-item.danger { @include mat.menu-overrides((item-label-text-color: var(--color-danger))); }`
   (plain `color` loses to the token). Contrast on the menu panel `--color-surface`: **6.51 dark / 7.07 light**;
   on hover 5.23 / 6.04; keyboard-focused 4.64 / 5.56. H-139's inset ring on the focused item: 5.55 / 4.31.
   Offline, Material dims the item (0.38); that's fine, it's disabled. No icon needed: the text says it.
   Divider colour stays Material's `outline-variant` (= `--color-border`).
7. **Out of scope:** the dialog surface colour (#11), the upfront re-sign-in copy (#10), all other dividers (H-110),
   copy changes. H-101's snack-bar rules are not touched (the delete result snack bar must still sit above the tab bar).

## Styleguide (`web/src/app/pages/styleguide/styleguide-page.ts`)
Add a small **Buttons** section (`<h2 class="zone">Buttons</h2>`) after the deck header: one row each of
Filled (accent), Outlined, Text, **Filled danger "Delete account"**, and **Filled danger, disabled**. Under it,
a dialog-style actions row `Cancel` (text) + `Delete account` (filled danger), right-aligned, as in the dialog.
It must work with both accent options (danger stays the same under green).

## Accept (ui-engineer Playwright pass)
At **1440 and 375**, **dark and light** (plus green preview on `/styleguide`):
- Delete dialog: before typing, the button is neutral grey with a muted label (not teal, not red); after
  typing `delete` it is red with the dark/white label; measured label contrast ≥ 4.5:1 (expect 7.65 / 7.07).
- Tab to Delete account: the 2px ring is outside the fill on all four edges, ≥ 3:1 against the dialog bg.
  Hover shows the state layer; label stays ≥ 4.5:1.
- Account menu (signed in, or status set in dev tools): one divider above Delete account and data; its label is
  `--color-danger` (≥ 4.5:1 at rest, hover and keyboard focus); keyboard-opened menu shows H-139's inset ring on it.
- Other filled buttons (Import, Send link, Sync now) still teal / green. `/styleguide` shows the Buttons section.
- 375: a snack bar opened after the dialog still sits 8px above the tab bar (H-101). Console clean.

Links: [[UI Review 2026-11-24]], [[Brief H-139]], [[Brief H-101]], [[Design Direction]], [[UI Index]].

## Check (ui-engineer, 2026-11-24): PASS

Uncommitted build on `loop/H-102-danger-button`, `ng serve` on :4302, Playwright at 1440 and 375, dark and light,
teal and green preview, keyboard. Contrast is WCAG, measured from `getComputedStyle` (label colour over the
container composited on the real background, with Material's `::before` state layer at its live opacity).
Screenshots: `.playwright-mcp/h-102/` (untracked).

The signed-in menu was reached without an emulator: in the browser console, `ng.getComponent(app-account-menu)
.sync.status.set({kind:'synced',…})` (a dev-mode hook, no code change). The Delete dialog was then opened from
the real menu item and always closed with Escape, so nothing was deleted.

| # | Point | Dark | Light | Result |
|---|---|---|---|---|
| 1 | Filled danger is red, not teal (styleguide + dialog) | fill `#f09595` | fill `#a32d2d` | PASS |
| 2 | Label on fill, at rest (≥ 4.5) | `#3b0a0a` **7.65** | `#fff` **7.07** | PASS |
| 3 | Label on hover (8% layer, 1px lift `translateY(-1)` present) | 6.66 | 6.05 | PASS |
| 4 | Label when keyboard-focused (12% layer) | 6.19 | 5.57 | PASS |
| 5 | Fill vs dialog/page bg | 7.44 | (6.53 per brief) | PASS |
| 6 | Disabled: neutral grey, not teal/red | fill `#34373c`, label `#9aa3ad` 4.67 | fill `#d9dcde`, label `#56606b` 4.65 | PASS |
| 7 | Disabled skipped by Tab, no hover (pointer-events none) | yes | yes | PASS |
| 8 | Green preview leaves danger unchanged | `#f09595`/`#3b0a0a` 7.65 | `#a32d2d`/`#fff` 7.07 | PASS |
| 9 | Other filled buttons keep the accent | Import teal `#14b8a6` / green `#22a559` | teal `#0f766e` / green `#15803d` | PASS |
| 10 | Tab to danger: H-139 ring 2px solid, offset +2px (outside on all four edges, seen in screenshot) | ring vs bg **8.90** teal, **9.50** green; vs fill 1.20 | ring vs bg **5.05**; vs fill 1.29 | PASS |
| 11 | Dialog: before typing grey, after `delete` red; Tab order input → Cancel → Delete account | 4.67 → 7.65 | 4.65 → 7.07 | PASS |
| 12 | Menu: one `mat-divider` directly before Delete account and data (only one) | yes | yes | PASS |
| 13 | Menu danger label `--color-danger`, at rest / hover / keyboard focus | 6.51 / 5.26 / 4.73 | 7.07 / 6.04 / 5.51 | PASS |
| 14 | H-139 inset ring (2px, offset -2px) on the focused danger item vs the item bg | 5.65 | 4.27 | PASS (≥ 3) |
| 15 | 375: buttons fit (no overflow, page scrollWidth 360), touch target 48px; dialog 328px wide, actions on one row | yes | yes | PASS |
| 16 | 375: snack bar (opened after the dialog closed) sits **8px** above the tab bar (margin-bottom 73px, pane `pointer-events: none`) | yes | — | PASS |
| 17 | Served `styles.css` contains `.mat-mdc-button-base.danger`, `.mat-mdc-menu-item.danger`, and the unchanged H-101 rules (`.cdk-overlay-pane:has(> .mat-mdc-snack-bar-container)`, doubled snack-bar class) | yes | | PASS |
| 18 | Console | 0 errors, 0 warnings | | PASS |

**Nothing for `builder` to change.**

Note (not a fail, brief error): decision 6 said the divider's `outline-variant` "= `--color-border`". It isn't: the
served divider is `#3c4947` dark / `#d7e6e1` light (Material's generated, slightly teal-tinted neutral) vs
`--color-border` `#343c45` / `#d3d9e0`. Decorative, so no contrast requirement, and H-102 was told to leave it.
H-110 (the other dividers) should map `divider-color` to `--color-border` globally so all dividers match the app's
hairlines.
