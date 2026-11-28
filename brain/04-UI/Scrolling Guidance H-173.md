---
tags: [ui, scrolling, lists, performance]
updated: 2026-11-27
status: proposed
---
# Scrolling guidance for card and deck lists (H-173)

RJ 2026-11-24: smooth, no page numbers, infinite-scroll feel. Applies to Collection (built), Decks list and Deck detail
([[Decks]]), Tournaments (not built), and any future card list.

## Rule
1. **No pagination, ever.** One continuous list in the window scroll (page scroll, no inner scroll box on 390 px).
2. **Reuse the Collection pattern:** `cdk-virtual-scroll-viewport` with `scrollWindow`, fixed row height from a signal
   (`rowHeight()`), `minBufferPx` = 2 rows, `maxBufferPx` = 4 rows, `track` by a stable id, `role="list"` + an `aria-label`
   and a count line (`aria-describedby`). Rows are whole grid rows, so columns reflow with width.
3. **Lists under about 60 items** (a user's decks, a tournament's decks) may render fully: simpler, and Ctrl+F works. Switch to
   virtual scroll above that.
4. **Placeholders:** reserved aspect ratio for every image (no layout shift), skeleton tiles while the list loads
   (Collection already has `skeleton`), `eager` loading only for the first rows above the fold, lazy beyond.
5. **Scroll position:** coming back from a card or deck detail must land on the same row. Decks has an e2e for this
   (`web/e2e/decks-scroll-kept.e2e.ts`); every new list gets the same check. Filters/sort changes scroll to the top.
6. **Keyboard:** one tab stop for the grid, arrows move between tiles (Collection's `onGridKey`); virtual rows must keep the
   focused tile alive while scrolling.
7. **Reduced motion:** no scroll-linked animation; programmatic scrolling is instant under `prefers-reduced-motion`.

## Targets (check with the Large 5,000 test set, [[Collection Test Data]])
- 60 fps while flicking at 390 px (no dropped-frame runs over 100 ms in a Performance trace), 5,000 entries.
- DOM stays under about 400 card nodes at any scroll position.
- First paint of the list under 1 s on the Large set; no layout shift from images (CLS 0).
- Search typing stays under 100 ms per keystroke at 5,000 entries.

## Acceptance points for a reviewer
- [ ] No page numbers or "Load more" button anywhere.
- [ ] Large set: scroll end to end at 390 px, smooth, DOM node count stays bounded.
- [ ] Open a card, go Back: same scroll position.
- [ ] Tab reaches the grid once; arrows move; focus survives scrolling.
- [ ] Reduced motion: no animated scroll.

## Gaps in the built Collection page
Seen: list renders and scrolls; virtual viewport, buffers and stable tracking are in place. Not measured in this pass: the
60 fps trace and DOM count at 5,000 (no profiler in the review session), and back-navigation position on Collection (only
Decks has an e2e). Filed as builder row H-696.
