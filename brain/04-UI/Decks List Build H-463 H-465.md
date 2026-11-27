---
tags: [ui, decks, build]
status: built, needs-RJ review
date: 2026-11-26
owner: builder
for: H-463, H-465, H-478, H-400, H-468 (7)(8)(9), RJ 2026-11-26 tile %
brief: "[[Decks Review]]"
---
# Decks list fixes (H-463, H-465, H-478, H-400, H-468 (7)–(9))

Branch `loop/H-400-H-478-decks-list`. From [[Decks Review]] S2, S4, S5, S9 and "Nice to have" 7–9, with
[[Decks Components]] §2 / §4 (updated with what is below). Specs: SPEC-005 [[Your Decks Ownership View]] OWN-101,
OWN-102, OWN-105. No contract change.

## What changed
- **H-463 one-row toolbar at 1440** (`decks-page.scss`): Lock and Sort `.control` are `flex: none`; the selects are
  fixed to their longest option at 14px (Lock 7.25rem for "Not locked" 73px, Sort 8rem for "Last updated" 86px;
  padding 12px left / 8px right, `margin-left: --space-2` on Material's arrow wrapper). Values are 14px through
  Material's own token `--mat-select-trigger-text-size: var(--font-size-sm)`. Search keeps `flex: 1 1 10rem`, so
  it alone gives way. Active filter chips were already 14px (`.filter-chip` `--font-size-sm`, measured 14px).
- **H-465 (1)** (`decks-page.html`): the desktop Filters menu wraps Legality and Source each in
  `<div role="group" aria-labelledby>`; the visible headings are `aria-hidden` (heard once, as the group name).
  Arrow keys still walk all seven items (checked in Chrome).
- **H-465 (2)** (`shared/deck/deck-tile.ts`): the visible % is `aria-hidden`; its words ("83 percent of copies
  available" / "… locked in") are a visually hidden `<p class="percent-text">` in the details, right after the
  copies line, so they are in the link's `aria-describedby` text, which still starts with the source line.
- **H-465 (3)**: measured, no change needed (table below). Native radios stay.
- **H-478 / H-468 (8)** (`deck-tile.ts`): on phones (`max-width: 40rem`) `.copies` is `flex-basis: 100%`, so the copies
  line always sits on its own line under the chip / lock badge; `.copies` also gets `min-width: 0` and
  `overflow-wrap: anywhere` as a guard. 1440 unchanged.
- **H-468 (7)** (`deck-filters-dialog.ts`, `decks-page.ts`): the phone Filters dialog's Ownership options show their
  deck counts (muted, tabular-nums) from `ownershipCounts()` on the draft query, so they update before Show.
  Heard as "Ready to build, 1 deck" (visually hidden comma and "deck(s)").
- **H-468 (9)** (`decks-page.html`, `decks-page.ts`): the no-match empty state adds an outlined **Show locked decks**
  when `own=ready` hides locked decks. Both Show locked decks buttons now move focus to the search field afterwards
  (the button disappears with the hint, as after Clear filters).
- **RJ 2026-11-26 (H-392 (c), spec text H-481):** the tile % is 16px 600 (`--font-size-md`), in the name's font
  (the display font is dropped), on desktop and phone. Deck detail header untouched.
- **H-400** (`shared/deck/deck-status-chip.ts`): comment matches OWN-102 (chip only for ready / partial / none);
  `lockBadge` input and the `locked` / `short` kinds and styles removed. The `/styleguide` Decks preview and its spec
  used them, so they changed too (`pages/styleguide/decks-preview.ts`, `styleguide-page.spec.ts`).

## Measured (Chrome 158 headless, dev build + Auth/Firestore emulators, test data "Small")
| Check | Result |
|---|---|
| 1440, `?lock=unlocked&legality=incomplete&source=user&q=gen` | **1 row** (dark and light): search 153+165, chips 326+480, Lock 814+152, Filters (badge 2) 974+111, Sort 1092+180, ends at the 1272 content edge. Was 2 rows (Sort on row 2, search 320). 1280: 1 row. 1024: 2 rows (allowed) |
| Lock / Sort values | 14px (was 16px); "Not locked" 72.8 in a 76 box, "Last updated" 86 in 88, no ellipsis; text to arrow 11.2 / 10px (was 1.5 / 2.5) |
| Active filter chips | 14px (before and after) |
| Filters menu a11y tree | `menu` > `group "Legality"` (4 menuitemradio) and `group "Source"` (3) |
| Tile link description (Generated Open) | "Imported Partly available 55 of 66 copies available 83 percent of copies available Not fully checked Updated Nov 26, 2026" |
| Unselected native radio, phone Filters dialog | dark ring `#858585` on the dialog's `#242A31` = **3.92:1** (on `#2D343C`, the panel behind it, it would be 3.43:1); light `#767676` on `#FFFFFF` = **4.54:1**. Both ≥ 3:1, so no styled edge (pixel probe of a 4x screenshot, max-contrast pixel on the centre line) |
| H-478 at 390 before the change | not reproduced: "66 of 66 copies locked in" fit beside the badge (right 344.8 vs content edge 361) |
| H-478 after, 390 and 360, light and dark, all 3 tiles | copies line on its own line at the same offset (88.6px) in every state; `scrollWidth == clientWidth` (248 / 218); nothing past the tile's content edge |

Screenshots (not in the repo): `C:\Users\rjder\AppData\Local\Temp\claude\9c2fcc2550b91ef5\ed0a4e88-c9bc-441f-bbde-a833fea8e827\scratchpad\shots\`.

## For RJ
- The tile % now reads at the name's weight; check it still anchors the art at 1440 and 390.
- The no-match state has two buttons (Clear filters filled, Show locked decks outlined).
- Native radio contrast depends on the browser; Chrome passes. If Safari / Firefox render a fainter ring, the styled
  `--color-border-strong` edge from [[Decks Review]] S9 is the fallback.
