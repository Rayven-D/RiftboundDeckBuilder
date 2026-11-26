---
tags: [loop, validation]
item: H-460, H-461, H-475
date: 2026-11-25
round: 1
result: PASS (H-460, H-461, H-475)
---
# Validation H-460, H-461, H-475: Decks focus ring, phone targets, Deck detail header

Items: [[Handoff Board]] H-460 (tile focus ring, [[Decks Review]] B1), H-461 (44px phone targets, B2), H-475 (Deck
detail header actions top-right). Scope: uncommitted tree on `loop/H-460-H-461-decks-a11y`
(`deck-tile.ts`, `decks-page.scss`, `deck-missing.ts`, `deck-detail.html/.scss`, `lock-actions.ts`, specs,
`shared/testing/css-rules.ts`). Test data: "Small" from Collection, per [[Collection Test Data]].

## Checks
- V-008 lint: `npm run lint` passes. Build: `npm run build` passes. Tests: `npm test -- --watch=false` 87 files,
  1314 tests, all passed on the first run (no timing flake).
- Browser: Chrome over CDP (fresh profile, signed in through the Auth emulator with an email link, dev server on 4211).
  Both stopped afterwards. Measured with `getBoundingClientRect`, computed styles and a screenshot pixel probe.
- V-010: no metagame statistics added (layout and CSS only).

### H-460 (focus ring), PASS
Tab from the Sort control (at 390 the Sort select is not on the page, so Tab from the page start) to the first deck tile.
Computed: `outline: solid 2px`, `outline-offset: -2px`, `:focus-visible` true, `li` `content-visibility: auto` kept,
`li` rect equals link rect (tile layout unchanged, 362.7 x 198.1 at 1440; 358 x 152.2 at 390).
Pixel probe at the middle of all four edges: the ring colour fills the 2px band just inside the tile edge on top,
bottom, left and right, with page colour outside and surface colour inside, at 1440 and 390 in light and dark.

| Theme | Ring | Page / tile | Contrast ring vs page / tile |
|---|---|---|---|
| light | `#0F766E` | `#F4F6F8` / `#FFFFFF` | 5.05 / 5.47 |
| dark | `#2DD4BF` | `#1B1F24` / `#242A31` | 8.90 / 7.78 |

All at least 3:1.

### H-461 (44px phone targets), PASS
Filter chips ("Remove filter: ...", on `/decks?own=partial&lock=unlocked`):
- 390 (light, dark, with and without a coarse pointer): 131.9 x 44 and 107.8 x 44.
- Desktop unchanged: 1440, 1024, 768 and 641 measure 32 tall. 640 and below measure 44 (the page's PHONE query).

Copy missing list on Deck detail at 390 (the copy button is the Missing panel's `.copy-main` / `.copy-more`; the header
split is hidden on phones): main 184.8 x 44, more 44 x 44, same top (657) in light and dark. Equal height.
Desktop header split at 1440, 1024, 768, 641 and 640: main 184.8 x 40, more 40 x 40, same top, unchanged.

### H-475 (header actions top-right), PASS
Deck 3 (not lockable, 3 cards short, reason line shown) and deck 1 (locked). Names: the real one, a 60-character name
(`Kennen Tempo Control with Lightning Rush and Hextech Ray`, padded to 60) and 60 unbroken `W` characters, set on the
`h1`. Light and dark.
- 1440 and 1024: `.actions` top equals `h1` top (offset 0), Lock in at the header's right edge area, Copy missing
  list + chevron + More on the same row, the reason line under the whole row. Title column ends at 841 (1440) / 562
  (1024) and actions begin at 873 / 594, so no overlap with the 60-character name (wraps to 2 to 4 lines) in either
  case. No pairwise overlap between any title-column element and any action element (the 1px copy/chevron seam is
  the split button's design).
- 768: the actions wrap under the status lines, left-aligned (x=16), nothing overlaps with 1, 2 or 3 title lines. This
  is the allowed wrap in the dispatch. No horizontal scroll at any size (scrollWidth = viewport minus scrollbar).
- Locked deck at 1440, 1024, 768: Lock actions and More sit right-aligned beside the title, no overlap.
- Focus order from the back link at 1440 and 768: Rule check, Lock in, Copy missing list, More copy options, More
  actions, then the ban notice's Dismiss. Matches title, status, Lock in, Copy, chevron, More.
- 390 (light and dark, short and 60-character name): single column, title (23 / 69 px high), status, summary, Lock
  in 306 x 44 with More 44 x 44 beside it, reason line, then the notice; no horizontal scroll. Same structure and
  sizes as the pre-change phone layout (the builder's grid nesting carries the same gap). I did not diff against a
  second build of `dev`.

## Notes (not failures)
- At 768 the reason line is end-aligned inside a box that starts 8px left of the page gutter (`x=8`, because of the
  negative start margin that cancels the column gap). Text is end-aligned so nothing shows outside the gutter, but
  with a longer reason it could. Cosmetic; no check fails.
- At 768 with the actions wrapped, the reason text hangs under the copy buttons rather than under Lock in (the text
  is end-aligned in a 407px box). Taste call for RJ and `ui-engineer`.

## Result
2026-11-25 · H-460 · PASS · lint, build, tests, browser 1440 and 390 light and dark, pixel probe, contrast · no failures
2026-11-25 · H-461 · PASS · lint, build, tests, browser 390 / 640 / 641 / 768 / 1024 / 1440 · no failures
2026-11-25 · H-475 · PASS · lint, build, tests, browser 1440 / 1024 / 768 / 390 light and dark, 60-char overlap, focus order · no failures
