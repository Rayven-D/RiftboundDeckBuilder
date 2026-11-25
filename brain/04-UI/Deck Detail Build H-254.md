---
tags: [ui, decks, build]
status: built, needs-RJ review
date: 2026-11-25
owner: builder
for: H-254
brief: "[[Decks]]"
---
# Deck detail as built (H-254)

The as-built record of `/decks/:id`, from [[Decks]] §6–§10 with RJ's H-260 answers, [[Decks Components]] and
SPEC-005 OWN-010…119. Contracts: [[API Contracts]] → "Deck detail" (v1.27). Lock controls are H-060.

## Layout
- **Header (OWN-010):** back link "Decks"; h1 deck name; description (`notes`) clamped to 3 lines with Show more /
  Show less, nothing when empty; source line, then "· pilot" and "· Source ↗" for tournament decks; meta row
  (`app-lock-badge`: "Locked · Locked in on <date>" or the warning "Locked · n cards short", legality label, "Rule check" text button → dialog); summary "X of Y copies available · N%"
  (locked: "copies locked in"; the percentage is `aria-hidden` with a visually hidden ", N percent"; nothing when
  `completionPercent` is null) and "N of M cards fully available" (no percentage); actions (`app-lock-actions`: Lock in / Unlock with its reason line under the button, Copy missing
  list split button with "Copy as one list", More menu: Copy deck list, Download .txt, Duplicate, Rename, divider,
  Delete).
- **Notices** under the header: read-only (info), ownership unavailable, card data not loaded with Try again, locks
  unreadable, and the dismissible ban notice (OWN-015).
- **Sticky deck bar** under the site header: section links in Riot order (Legend and Champion without a count,
  `aria-current="location"` follows the scroll) and the Card view / List view toggle (`aria-pressed`, icon-only on
  phones, remembered per device under `deck-view`).
  A link scrolls only the page (`window.scrollTo`) so the heading lands 12 px under the sticky bars, focuses the
  heading and marks the section current at once; while the scroll is in flight (until `scrollend`, or 150 ms
  without a scroll event) the current section doesn't change, and afterwards it stays until the page moves again.
  The current section is the last heading at or above that same landing line. The bar keeps the current link in
  view by changing only its own `scrollLeft` (no `scrollIntoView`, which cancelled the page scroll; H-390). The bar
  has no scroll snap.
- **Sections:** six `h2` sections with counts; Card view is the card-tile grid, List view rows "3× Name" with the
  chip. Each grid is one Tab stop with arrow-key roving.
- **≥ 64rem:** a sticky right panel (`--deck-aside: 20rem`) with tabs Card / Missing; the first card is selected on
  load; no percentage anywhere in the panel.
- **< 64rem:** no panel. The missing list sits under the notices (no counts, the header has them; 10 lines then "Show
  all n lines"); a card press opens the card dialog with Previous / Next (also `[` and `]`); Escape returns focus to
  the tile. On phones the header Copy button moves into that missing panel.

## Tokens
Local to the page (`:host`): `--deck-aside: 20rem`, `--deck-bar: 3.25rem`. `--dur-fill: 180ms` is global (H-060);
the tile, row and panel art use `app-card-art`'s `animateChange` for the OWN-035 fill change (e.g. after Lock in).
Shared component tweak: `app-ownership-chip` border uses `--color-border-strong` (Decks Components §0, the "none"
state contrast). New icons: `arrow_back`, `open_in_new`, `edit`, `delete`, `grid_view`, `view_list`.

## Choices made in the build (not settled by spec; for RJ or `spec-writer`)
1. Ownership unavailable: the copies line reads "Ownership unavailable".
2. Below 64rem the missing panel omits the counts; the header Copy button is hidden on phones only (in the panel).
3. Below 64rem "Show all n lines" is a button, not `<details>`.
4. Duplicate shortens the original name to keep " (copy)" within 80 characters; disabled on read-only decks.
5. Rename that changes only the description or source says "Changes saved."; nothing written when nothing changed.
6. Delete removes the deck's lock after the deck; Undo re-creates the deck unlocked and notifies the list.
7. Not found keeps the page h1 "Deck detail" with the empty state; a corrupt record also shows not found.
8. The open deck deleted elsewhere: polite status "This deck is no longer in your decks."
9. Rule check, with no SPEC-002 engine in `web/`: always "Not fully checked" and a dialog saying the rules aren't
   checked in this version.
10. Copy strings "Deck list copied", "Missing list copied", clipboard failure "Couldn't copy. Select the list and copy it yourself."
11. A ban-list or catalog load that throws is treated as not loaded (banner / ban notice), never a broken page.

## Lock pieces (H-060, wired in H-254 phase 2)
- `.meta`: `app-lock-badge` (`view.lock`, `tile.lockBadge`), before the legality label.
- `.actions`, first: `app-lock-actions` (`deck`, `view`, `pool`, `readOnly`, `locksUnreadable`). Its reason line is
  its own; the actions row aligns to the top so the line sits under the button, and Copy / More sit level with the
  button. On phones the lock button fills the row with More beside it.
- The page re-reads on `DeckLocks.changed` and `(changed)`; after a change focus moves to the new button (Lock in ↔
  Unlock). Delete releases the lock through `DeckLocks.unlock`.
- No `app-shortfall-warning` here: [[Decks]] §9 and [[Decks Components]] §10 keep SHARE-034 warnings in Collection's
  confirmations. A short locked deck shows the warning badge (D8).

## Not done
- The pieces are not on `/styleguide` (Decks Components asks for it).
- Legality engine, real ban data, Edit cards (out of scope).
