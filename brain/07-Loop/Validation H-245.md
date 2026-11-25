---
title: Validation H-245 - FAB docks above the footer
tags: [loop, validation]
date: 2026-11-25
---
# Validation H-245

2026-11-25 · H-245 · **PASS** · build `loop/H-245-fab-dock` @ `76cb978` (worktree `agent-aa181bccaba06a337`) · checks: lint, prod build, unit tests, Playwright scroll loop (Edge), snack bar, keyboard, traceability, diff scope · failures: none

Checked against [[Brief H-245 H-246 H-247]] §H-245 (D1…D4, Accept 1–7), [[My Collection]] 0.14 COLL-094 (d), (e) and AC 31, [[Your Decks Ownership View]] 0.8 OWN-094 and AC 22.

## Results

| Check | Result |
|---|---|
| `npm run lint` | PASS (all files pass) |
| `npm run build` (prod) | PASS |
| `npm test` | PASS, 71 files, 964 tests |
| Accept 1: 10 px scroll loop, last 400 px, down and up | PASS (below) |
| Accept 2: end of page | PASS |
| Accept 3: footer off screen, no drift | PASS, drift 0.00 px at every width |
| Accept 4: Undo snack bar above the docked button | PASS with substitute (judgement below) |
| Accept 5: no transition on `translate`, hover/press keep theirs | PASS (CSS read: `translate` is not in the `transition` list; reduced-motion block untouched; unit test) |
| Accept 6: Tab order, keyboard focus clear of the button | PASS |
| Accept 7: dock-formula unit tests | PASS (`fab-dock.spec.ts`, four cases) |
| Traceability | PASS: new tests name `COLL-094`, `OWN-094`, `H-245`, `Accept n` |
| Diff scope | PASS |

### Scroll loop (own run, dev server + Auth/Firestore emulators, signed in, Small and Large test data)
Pages `/collection` and `/decks`; widths 1440×900, 1024×768, 768×1024, 375×812, 812×375; scroll the last 400 px in 10 px steps, once downward and once upward (phone: label collapsed on the way down, expanded on the way up, widths seen 234 / 57 / 56 px).
- Smallest gap between the button's bottom and the footer's top at any step: **16.0 px** everywhere (spec: ≥ 16 ±1).
- While the footer was off screen the button's bottom edge never moved (drift 0.00 px).
- Scrolled to the end, `/collection`: footer bottom = page bottom on desktop (899.6 of 900, 767.6 of 768, 1023.6 of 1024, 374.6 of 375; fractional pixel only) and = tab bar top on phone (748.4 vs 748). Last tile bottom is 88 px above the footer top (for example 687.3 vs footer 791 at 1440), button spans 72 to 16 px above the footer. No empty band below the footer.
- `/decks` (3 decks) does not scroll at 1440, 1024, 768 or 375 (it scrolls 39 px at 812×375): the button is docked 16.0 px above the footer at the window bottom, footer bottom = page bottom (900/768/1024) or tab bar top (748) at 375.
- Large (5,000) data: same results.
- Small was run in full at 1440 (collection) and at 1024, 768, 375, 812 (both pages). Part of the Small run was cut short when a separate process shut down the shared emulators; the button measurements did not depend on the backend (the data was already in the page), and the Large run covers the missed pages.

### Accept 4 substitute: accepted
The import Undo could not be driven: import needs the card catalog from `/api` (no `services` here), and the builder saw "Not saved yet". The rule in COLL-094 (e) and `styles.scss` is `html.has-fab .mat-mdc-snack-bar-container { margin-bottom: calc(var(--fab-clearance) + var(--fab-dock, 0px)) }`, which applies to every snack bar, not to Undo alone. I triggered the "Exported 375 copies of 50 cards." notice with the page scrolled to its end, button docked:
- 1024×768: snack bar 527 to 575, button 587 to 643, footer top 659, `--fab-dock` 101 px. Bar is 12 px above the button.
- 375×812: snack bar 439 to 487, button 499 to 555, footer top 571, `--fab-dock` 176 px. Bar is 12 px above the button.
Acceptable for this item. Residual: the real import Undo is not exercised at the page end; it uses the same snack bar container, so the risk is low. It can be checked once import runs end to end with card data (not a board item).

### `focusTile()` change: accepted
`collection-page.ts` now reads the root `scroll-padding-bottom` (the button clearance, 0 without a button) because a scripted `scrollTo` ignores scroll-padding. In scope for COLL-094 (e) / Accept 6, six lines, one test (`COLL-094 (e) / H-245 Accept 6 …`). In the browser, ArrowDown through 60 tiles from the first one: the focused tile's bottom stayed at least 108 px above the window bottom at 1024×768 (button top is 80 px up) and 161 px at 375×812 (button top is 136 px up). Tab order after the header: Export CSV, "Add to your collection", then the banner and grid controls (button before the toolbar), unchanged at both widths.

### Diff scope
`git diff b16d17e..HEAD --stat`: `page-fab.ts`, new `fab-dock.ts`, `styles.scss` (`--fab-size`, `.site-main` reserve, `app-root` reserve removed, snack bar margin), `collection-page.ts` (focus scroll), their specs, `snackbar-offset.spec.ts`, plus the board row and session log in `brain/`. Nothing outside FAB, reserve, snack bar and the focus fix. No new dependency.

## Notes for others (not failures)
- Phone: the tab bar's 1 px top border overlaps the footer's last pixel (builder's note, `app.scss`). Measured footer bottom 748.4 vs bar top 748 on Collection. That belongs to H-247 (footer) and does not affect this item's Accept. Nothing filed.
- Two console 400/connection errors seen only while the shared emulators were being shut down by another process; not from this build.
- Test run left nothing behind: my dev server (port 4310), my Auth/Firestore emulators and all browsers are stopped.
