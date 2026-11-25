---
title: Brief H-139 - Visible focus on Material buttons and menu items
status: ready
board: H-139
source: "[[UI Review 2026-11-24]] finding #1"
date: 2026-11-24
---

# Brief H-139: visible keyboard focus on Material controls

**Problem.** The global `:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px }`
(`web/src/styles.scss` ~240) loses to Material's `outline: none` on `.mat-mdc-button-base` (component
styles load later, same specificity). Keyboard users see no focus on Import, Sign in / Account, gate
and dialog buttons, or account menu items. WCAG 2.4.7 failure.

## Decisions
1. **Selectors.** Material in the app is only: `matButton` (filled, outlined, text; with `matButtonIcon`),
   `mat-menu` / `mat-menu-item`, `mat-dialog-*`, `mat-form-field` + `matInput`. Header tabs and phone tab
   bar are plain `<a>`s and already get the global ring. Cover:
   - `.mat-mdc-button-base.mat-mdc-button-base:focus-visible` (all button variants, icon buttons included;
     replaces the icon-only rule of H-095 fix 6). The class is doubled to (0,3,0) on purpose: Material's
     `.mdc-button:active { outline: none }` is (0,2,0) and loads later, so with a single class the ring
     disappears while Space is held on a focused text/outlined/filled button.
   - `.mat-mdc-menu-panel .mat-mdc-menu-item:focus-visible, .mat-mdc-menu-panel .mat-mdc-menu-item.cdk-keyboard-focused`
     (0,3,0). Scoped to the panel because Material's `.mat-mdc-menu-item:focus { outline: 0 }` is (0,2,0)
     and loads later, so the unscoped selector would tie and lose. A menu opened by keyboard focuses the
     first item with `cdk-keyboard-focused`; opened by mouse it stays ringless.
   - `matInput` / form field: **no change.** The outlined field's thick `--mat-sys-primary` border is its
     focus indicator (teal 6.76:1 on raised dark, 4.65:1 light). Don't add a second ring.
   - No chips, tabs, checkboxes, toggles or selects exist today. If one is added, it gets the same rule.
2. **Offset.** Buttons: `outline-offset: 2px` (outside, matches every other control). Menu items:
   `outline-offset: -2px` (inset), because items are flush with the panel edge and the panel clips.
   Keep Material's focus state layer on the item; the ring sits on top of it.
3. **Contrast (ring vs what it touches, need ≥ 3:1).** Teal ring; green preview in brackets.

   | Background | Dark #2dd4bf | Light #0f766e |
   |---|---|---|
   | Page bg / header (translucent bg) | 8.90 (9.50) | 5.05 (6.58) |
   | Surface: menu panel, phone tab bar, scrolled header | 7.78 (8.31) | 5.47 (7.13) |
   | Raised: dialog surface, focused menu item | 6.76 (7.22) | 4.65 (6.06) |
   | Accent fill (Import, filled dialog buttons) | 1.34 (green 1.83) | **1.00** (green 1.42) |

   All pass, except **on the accent fill**, which is why filled buttons keep the 2px **outside** offset:
   the ring sits on the header/dialog background, not on the fill. Never inset the ring on a filled button.
   Measured 2026-11-24 (Playwright): the dialog surface is the **page bg**, not raised (8.90 / 5.05);
   the keyboard-focused menu item (panel + focus/hover state layer) is 5.61-8.29 dark, **4.29** light.
   All ≥ 3:1.
4. **Approach: plain CSS in `styles.scss`**, next to the global `:focus-visible` rule. Every selector
   above is (0,3,0), which beats Material's (0,1,0) `outline: none`, its (0,2,0) `.mdc-button:active`
   and its (0,2,0) `.mat-mdc-menu-item:focus` whatever the load order, so no `!important`. One ring, one token,
   no new theme mixins. Not `mat.strong-focus-indicators`: it draws a `::before` border with its own
   color/offset tokens, a second focus system beside ours that would need theming in dark, light and the
   green preview.
5. **Motion and forced colors.** No transition on `outline` (Design Direction: focus rings are never
   animated; don't add `outline` to the button transition list). The ring moves with the 1px hover lift,
   that's fine. Forced colors: never `outline: none` on focus; add
   `@media (forced-colors: active) { outline-color: Highlight }` for these selectors so the ring maps to
   the system focus color.

## Accept (ui-engineer Playwright pass)
At **1440 and 375**, **dark and light** (plus one pass with the green preview), Tab through and screenshot:
- Header: wordmark, tabs, Sign in / Account, Import (1440); wordmark, Sign in / Account, tab bar (375).
- Gate panel **Sign in** button.
- Sign-in dialog: provider buttons, email field, Send link, Close. Ring fully visible, not clipped by
  `mat-dialog-content` or the actions row. Dialogs need ≥ 4px of room (2px offset + 2px ring) between
  the last focusable control and the edge of `mat-dialog-content`. Watch for Material's 48px
  `.mat-mdc-button-touch-target` on a 40px button: it overflows a content box with no bottom padding by
  4px, which both scrolls the content and clips the ring's bottom edge (seen at 375 on Send link).
- Account menu opened with Enter: first item shows an inset ring; arrow keys move it; mouse-opened
  menu shows no ring.
- Import ring is outside the fill, on the header background, measurably ≥ 3:1.
- Mouse click on any button shows no ring (`:focus-visible` only). Console clean.

**Acceptance run 1 (2026-11-24, ui-engineer):** every stop PASS at 1440/375 × dark/light except
Send link at 375 (bottom edge of the ring clipped by `mat-dialog-content`, both schemes). Two changes
requested before PASS: dialog bottom room (above) and the doubled button selector (Decision 1).
Green preview pass and a real signed-in session not checked (account menu reached by setting the sync
status in dev tools).

**Acceptance run 2 (2026-11-24, ui-engineer): PASS.** Builder doubled the button selector
(`.mat-mdc-button-base.mat-mdc-button-base:focus-visible`, also in the forced-colors block) and gave the
email form `padding-bottom: var(--space-1)` (`sync-dialogs.ts`). Send link at 375 dark and light: ring
shows all four edges, `mat-dialog-content` scrollHeight = clientHeight (234/234), no scrollbar; 1440
unchanged (166/166). `:active`: the only loaded rule that combines `:active` with `outline` is
Material's `.mdc-button:active { outline: none }` (0,2,0), below the (0,3,0) button rule, so the ring
holds while Space is down (cascade check; a held key can't be simulated with the tools available).
Green preview (`html[data-accent=green]`), 1440 dark/light: header tabs, outlined Sign in, filled
Import, gate Sign in, dialog email-link button, Send link, Close all show the ring at 6.58-11.65:1
against the background (ring on its own green fill would be 1.42 / 1.83, so the outside offset is
what makes it pass). Console clean. Still not checked: a real signed-in session.

Links: [[UI Review 2026-11-24]], [[Design Direction]], [[UI Index]].
