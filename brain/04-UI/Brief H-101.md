---
title: Brief H-101 - Snack bars clear the phone tab bar
status: done
board: H-101
source: "[[UI Review 2026-11-24]] finding #2"
date: 2026-11-24
---

# Brief H-101: snack bars sit above the phone tab bar

**Problem.** Below 40rem the fixed `.tab-bar` (`web/src/app/app.scss` ~179: `var(--tabbar-height)` = 4rem
plus `env(safe-area-inset-bottom)`, z-index 20) is always rendered (`app.html` line 48, no `@if`). Material
snack bars open bottom-center in the CDK overlay (z-index 1000) with only Material's 8px margin, so every
notice covers Decks / Collection / Tournaments / Import for 6-8 s, or for good on the persistent
session-lost notice. Opened from `sync.service.ts:152`, `account-menu.ts:99`, `collection-page.ts:533` / `:558`.

## Decisions
1. **One global rule in `web/src/styles.scss`, no call-site changes.** Put it next to the html
   `scroll-padding-bottom` rule (~232), which already uses the same offset. Every current and future snack bar
   is covered. Rejected: `MAT_SNACK_BAR_DEFAULT_OPTIONS` + `panelClass`, because a call that passes its own
   `panelClass` replaces the default and silently drops the offset, and it adds a provider for a layout concern.
2. **Selector:** `.mat-mdc-snack-bar-container.mat-mdc-snack-bar-container` (doubled, 0,2,0), same reason as
   H-139: Material's component style `.mat-mdc-snack-bar-container { margin: 8px }` is (0,1,0) and loads after
   `styles.css`, so a single class ties and loses. No `!important`.
3. **Value and breakpoint:** inside `@media (max-width: 40rem)` (the exact query that shows the tab bar):
   `margin-bottom: calc(var(--tabbar-height) + var(--tabbar-border) + env(safe-area-inset-bottom) + var(--space-2))`
   (as built: the bar's 1px hairline is the `--tabbar-border` token; see the post-build check below).
   Set `margin-bottom` only; leave Material's side and top margins (8px) and its handset width alone.
4. **Z-order unchanged.** The overlay stays above the bar (1000 over 20); the bar is no longer underneath,
   so nothing is covered. Don't lower the overlay or raise the bar.
5. **Wider screens unchanged.** No rule outside the media query; 1440 keeps the 8px bottom margin.
6. **Out of scope:** durations, politeness / live region (finding #14, own row), colors, enter/exit motion.
   Don't touch H-139's focus rules; the snack bar's OK / Undo buttons are `matButton`s and must inherit them.

## Accept (ui-engineer Playwright pass)
Open a notice (collection Undo toast and the sync 'OK' notice; set sync status in dev tools if needed).
- **375, dark and light:** screenshot shows the snack bar's bottom edge ≥ 8px above the tab bar's top border;
  all four tabs fully visible; click each tab while the notice is open and it navigates.
- **375, simulated safe area** (or reason from the calc): gap still holds with a non-zero inset.
- **1440, dark and light:** snack bar position identical to before (8px from the viewport bottom).
- **Keyboard:** Tab reaches OK / Undo; the H-139 ring shows on all four edges, not clipped by the
  overlay pane or the tab bar; Enter dismisses / undoes. Console clean.
- **640 / 641 px:** at 640 the offset applies with the bar; at 641 neither the bar nor the offset.

Links: [[UI Review 2026-11-24]], [[Brief H-139]], [[Design Direction]], [[UI Index]].

## Post-build check 2026-11-24
ui-engineer, Playwright on `ng serve` :4301 (dev build), `/collection` (gate state). The notice was opened with
`ng.getComponent(app-account-menu).snackBar.open('Test notice', 'OK')`. Screenshots are in `.playwright-mcp/h-101/` (untracked).

| Check | Measured | Result |
|---|---|---|
| 375 light/dark, computed margin | `8px 8px 72px`, surface 692-740, tab-bar top 747 (bar 65px = 64 + 1px border-top) | offset applies |
| 375 gap to tab-bar top border | **7px** | **FAIL** (≥ 8 asked; the calc leaves out the bar's 1px hairline) |
| 375 tabs clickable with notice open | `elementFromPoint` on all 4 tabs hits `.cdk-overlay-pane.mat-mdc-snack-bar-handset`; Playwright click on Decks times out ("overlay pane intercepts pointer events") | **FAIL** |
| 640 | offset applies, bar shown, gap 7px; pane is 360px wide and centered (not handset), so Collection and Tournaments are blocked | **FAIL** (same cause) |
| 641 | margin `8px`, 8px from viewport bottom, bar `display: none` | PASS |
| 1440 dark/light | margin `8px`, 8px from viewport bottom | PASS (unchanged) |
| Keyboard | Tab from Import reaches OK; `:focus-visible`, 2px teal outline, 2px offset; ring 692-740 sits inside the surface, no clipping ancestor, clear of the bar | PASS |
| Enter on OK | dismisses; focus falls to `body` (Material default, out of scope) | PASS |
| Console | 0 errors, 0 warnings | PASS |

**Why the tabs are blocked.** The margin lives on the container, so the CDK overlay pane (pointer-events: auto)
grows to 128px tall (684-812) and still covers the bar, invisibly. The notice looks lifted, but taps on the tabs
under it go to the empty pane. The pane's own `margin-bottom: 0px` is set inline by the CDK, so lifting the pane
with CSS would need `!important`. Make the pane click-through instead.

**Verified in the page (injected style, no file change):** with the rule below, all 4 tabs hit-test true at 375 and 640,
OK and the label still take clicks, and a real click on Decks navigated to `/decks`.

**Fix for builder (same `@media (max-width: 40rem)` block):**
1. Add the hairline: `margin-bottom: calc(var(--tabbar-height) + 1px + env(safe-area-inset-bottom) + var(--space-2))`
   (or a `--tabbar-border: 1px` token used by both `.tab-bar` and this calc). That gives a gap of 8px.
2. `.cdk-overlay-pane:has(> .mat-mdc-snack-bar-container) { pointer-events: none; }` and
   `.mat-mdc-snack-bar-container.mat-mdc-snack-bar-container { pointer-events: auto; }`. Use `:has()`, not
   `.mat-mdc-snack-bar-handset`, because 600-640px panes don't get the handset class.
3. Update `snackbar-offset.spec.ts` to match.

**Verdict: FAIL** (2 items). Re-check at 375 and 640: gap ≥ 8px, real clicks on all four tabs navigate while the notice is open, OK still clickable.

### Re-check after the fix (2026-11-24)
Builder's changes: a `--tabbar-border: 1px` token, also used by `.tab-bar`'s border-top; the margin calc now adds that token; and
`.cdk-overlay-pane:has(> .mat-mdc-snack-bar-container) { pointer-events: none }` with the container set to `auto`. All of it sits inside the
40rem query. Same setup as above, on a fresh page load.

| Check | Measured | Result |
|---|---|---|
| 375 dark + light | margin `8px 8px 73px`, notice bottom 739, bar top 747 → **gap 8px**; pane pointer-events `none`; all 4 tabs hit-test true | PASS |
| 375 real clicks, notice open (dark and light) | Decks → `/decks`, Tournaments → `/tournaments`, Import → `/import`, Collection → `/collection`; notice stayed open throughout | PASS |
| 640 (light) | gap 8px; all 4 tabs (the 2 middle ones were blocked before) navigate by real click with the notice open | PASS |
| OK | Tab from Import reaches OK; `:focus-visible`, 2px teal ring + 2px offset, ring 691-739 inside the notice, clear of the bar; Enter dismisses; a mouse click on OK dismisses at 375 and 640 | PASS |
| 641 | margin `8px`, 8px from the bottom, pane `auto`, bar hidden | PASS |
| 1440 dark + light | margin `8px`, 8px from the bottom, pane `auto` (unchanged) | PASS |
| Console | 0 errors, 0 warnings | PASS |

Screenshots: `.playwright-mcp/h-101/recheck-375-dark-open.png`, `recheck-375-dark-ok-focus.png`, `recheck-375-light-open.png`,
`recheck-640-light-open.png`, `recheck-1440-light-open.png`.

**Verdict: PASS.** Not part of this item: after dismissal, focus falls to `body` (Material default). That could be a later polish item.
