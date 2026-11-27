---
tags: [services, build]
board: H-662, H-663
specs: ["[[Your Decks Ownership View]] (OWN-010, OWN-116)", "[[Shared Cards and Lock-in]] (SHARE-020…023, SHARE-029, SHARE-041, SHARE-042, SHARE-044)"]
branch: loop/H-662-deck-lock-icon
as_of: 2026-11-26
---
# Build H-662 H-663 Deck Detail

Two RJ requests from 2026-11-26 on one branch, one commit each. **H-662** (lock icon) first, **H-663** (no
other-deck information on card tiles and rows) at the end.

## H-662 Deck lock icon

Builder note for the validator and RJ. RJ asked for this from a phone screenshot of the preview (2026-11-26): "Move
the locked status up to the name with just the icon. Just tapping the lock icon button can lock and unlock. No need to
show the date locked, just lock/unlocked status." No ui-engineer step (RJ gave the design). SPEC-005 is being updated
on another branch; no spec was touched here. No API or contract change.

### What was built
- **Deck detail title row** (`web/src/app/pages/deck-detail/deck-detail.html`, `.scss`): the name and an icon-only
  lock toggle sit in a wrapping `.title-row`. The "Locked" badge and "· Locked in on <date>" left the header, and
  Lock in / Unlock left the actions row. The ⋮ menu stays; on desktop Copy missing list and ⋮ stay top-right (H-475).
  On phones the ⋮ button, now alone in its row, keeps the right edge.
- **`app-lock-actions variant="icon"`** (`web/src/app/shared/deck/lock-actions.ts`): one native `<button>`, `lock`
  icon (accent colour) when locked and `lock_open` (muted) when not, `aria-label` and Material tooltip "Lock deck" /
  "Unlock deck", `aria-pressed` = locked, `aria-haspopup="dialog"` when it opens the Lock in confirmation, 44 × 44 on
  every width, the global focus ring. It calls the same `lockIn()` / `unlock()` (same guards, SHARE-021 dialog,
  SHARE-029 snack bars, SHARE-063 failure), and is `aria-disabled` (still focusable) exactly when the text button was
  disabled, plus while saving. The SHARE-020 / SHARE-061 reason line still shows, under the title row, tied by
  `aria-describedby`. Being one element in both states, focus stays on it after a change.
- **Lock date removed everywhere** (`lock-badge.ts`): only Deck detail showed it, so `showDate` and the date went from
  `app-lock-badge`; the deck tile (which already passed `showDate=false`) looks the same.
- **Styleguide** (`/styleguide`, Decks section): a "Deck detail title: lock toggle (H-662)" block with unlocked,
  can't-lock (reason) and locked examples; the lock badge examples no longer show a date.
- `LOCK_TEXT.lockDeck` / `unlockDeck` added (`deck-locks.ts`). The 40rem `in-row` styles of `app-lock-actions` are
  gone (nothing uses them).

### Tests
- Updated: deck-detail.spec (header layout and focus order, lock in / unlock, short, failed save, rename, H-467 (2),
  H-520), lock-badge.spec, decks-list.spec (tile has no date), styleguide-page.spec. New `H-662 …` tests: locked
  toggle (label, pressed, tooltip trigger, icon only, no badge / date / Unlock button), short locked deck, unlocked
  toggle (label, not pressed, haspopup, 44 px), styleguide toggles (labels, pressed, aria-disabled, closed vs open
  icon).
- Web: lint clean; build OK; **1471 unit tests pass (93 files)**; `npm run e2e` **5 / 5 pass** (no e2e covers the
  lock; checked by hand with a throwaway Playwright script at 375 and 1280 px: 44 × 44 target, tap unlocks, tap +
  confirm locks, focus stays, tooltip shows).

### Behaviour I chose (for SPEC-005 / SPEC-008)
1. **Short locked deck:** the header no longer says "Locked · n cards short" (RJ: just locked / unlocked). The
   shortfall still shows in the copies line ("12 of 23 copies locked in") and the shortfall warning; the deck tile
   keeps its "Locked · n cards short" badge.
2. **Reason line** ("Lock in needs every card available: 3 cards short") stays visible under the title row for a deck
   that can't be locked, as OWN-116 requires a visible reason. It still says "Lock in"; RJ may prefer it in the
   tooltip only, or shorter.
3. While saving, the label stays "Lock deck" / "Unlock deck" (the text button read "Locking in…"); the toggle is
   `aria-disabled` meanwhile.
4. `aria-pressed` together with a label that changes ("Unlock deck", pressed) is what the item asked for; screen
   readers will read "Unlock deck, toggle button, pressed". A fixed name ("Locked") would be the more usual pattern
   if RJ wants it.

## H-663 No other-deck information on card tiles and rows
RJ: "In the deck list, no need to display how many of that card is in another deck. Keep information small and just
within the deck. We can keep it in the dialogue/full card info, but in the card view or list view, we don't need to see
other deck information there." SPEC-008 / SPEC-005 are being updated on another branch; no spec touched here.

### What was built
- `app-deck-card-tile` (Card view) and `app-deck-card-row` (List view) no longer render the SHARE-042 line
  ("Also in N other decks · n locked", `stacks` icon); their now-unused styles and `Icon` imports went.
- `cardAccessibleName()` (`detail-view.ts`, the tile / row `aria-label`) no longer adds the shared part, so screen
  readers don't hear it on the tile either. Example: "Lightning Rush, Main Deck, 0 of 3 available, banned since
  Nov 23, 2026".
- Unchanged: this deck's chip ("1 of 3 available"), split line, ban label and Preview flag on the tile / row; the
  card dialog and desktop panel ("This deck" breakdown with "Locked by other decks: n", and "Other decks using this
  card" with each deck's lock); the Decks list deck tiles; the engine still computes `OwnershipCard.sharedLabel`
  (unused by the UI now, kept so the engine and its SHARE-042 tests stay as specified until the spec changes).
- Styleguide: its card-tile samples just lose the line; nothing else showed it.

### Tests
- Updated: the OWN-115 tile test (no `.shared`), the `cardAccessibleName` test (no other-deck part). New
  `H-663 …` test: with a second, locked deck using the cards, no tile (Card view) or row (List view) has other-deck
  text or name, this deck's count stays, and the card dialog still shows "Other decks using this card",
  "Jinx Aggro · needs 3 · Locked, holds 1" and "Locked by other decks: 1".
- Web after both items: lint clean; build OK; **1472 unit tests pass (93 files)**; `npm run e2e` **5 / 5 pass**.

### Behaviour I chose
1. The accessible name drops the other-deck part too (the item says the tile shows none; keeping it only for screen
   readers would differ from what is seen). SHARE-044 / SPEC-005 AC 16's example name needs the spec update.
2. `sharedLabel` stays in the engine output (no contract change); it could be removed once the spec drops SHARE-042.
