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
  (Lock badge slot, legality label, "Rule check" text button → dialog); summary "X of Y copies available · N%"
  (locked: "copies locked in"; the percentage is `aria-hidden` with a visually hidden ", N percent"; nothing when
  `completionPercent` is null) and "N of M cards fully available" (no percentage); actions (Lock slot, Copy missing
  list split button with "Copy as one list", More menu: Copy deck list, Download .txt, Duplicate, Rename, divider,
  Delete).
- **Notices** under the header: read-only (info), ownership unavailable, card data not loaded with Try again, locks
  unreadable, and the dismissible ban notice (OWN-015).
- **Sticky deck bar** under the site header: section links in Riot order (Legend and Champion without a count,
  `aria-current="location"` follows the scroll) and the Card view / List view toggle (`aria-pressed`, icon-only on
  phones, remembered per device under `deck-view`).
- **Sections:** six `h2` sections with counts; Card view is the card-tile grid, List view rows "3× Name" with the
  chip. Each grid is one Tab stop with arrow-key roving.
- **≥ 64rem:** a sticky right panel (`--deck-aside: 20rem`) with tabs Card / Missing; the first card is selected on
  load; no percentage anywhere in the panel.
- **< 64rem:** no panel. The missing list sits under the notices (no counts, the header has them; 10 lines then "Show
  all n lines"); a card press opens the card dialog with Previous / Next (also `[` and `]`); Escape returns focus to
  the tile. On phones the header Copy button moves into that missing panel.

## Tokens
Local to the page (`:host`), not `:root`: `--deck-aside: 20rem`, `--deck-bar: 3.25rem`, `--dur-fill: 180ms`.
Shared component tweaks: `app-card-art` fill transitions use `--dur-fill` (0 ms elsewhere);
`app-ownership-chip` border uses `--color-border-strong` (Decks Components §0, the "none" state contrast).
New icons: `arrow_back`, `open_in_new`, `edit`, `delete`, `grid_view`, `view_list`.

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

## Slots for H-060
- `deck-detail.html` `.meta`: `<div class="deck-detail__badge-slot">` → `app-lock-badge` (`view.lock`, `tile.lockBadge`).
- `deck-detail.html` `.actions` (first child): `<div class="deck-detail__lock-slot">` → `app-lock-actions`
  (deck, view: lock / ownershipAvailable / locksIgnored, readOnly); its reason line goes under the actions with
  `aria-describedby`. The page re-reads on lock-store changes.
- Shortfall warning (Decks Components §10) not placed yet; it belongs under the notices.

## Not done
- The pieces are not on `/styleguide` (Decks Components asks for it).
- Legality engine, real ban data, Edit cards (out of scope).
