---
title: Direction H-708 - Wishlist tab and the desktop card sidebar
status: draft
board: H-708
source: "[[ADR-0010 Deck Building, Physical Copies, Folders and Wishlist]] §4 (RJ 2026-11-28, chat); [[Design Direction]]; [[Decks]] §6 (desktop panel); [[Brief H-698 Card Dialog Mobile]] (input only); live site measured with Playwright 2026-11-28"
date: 2026-11-28
tags: [ui, direction, draft, rj-requested]
---

# Direction H-708: Wishlist tab and the desktop card sidebar

## Summary
- **Draft design direction.** The wishlist spec (H-705) isn't written; open product questions are in §8 with recommendations.
- **Fifth phone tab: it doesn't fit as is.** Measured on the live site at 360 px with a fifth tab injected: each tab is about 69 px wide (2 px padding each side) and the 12 px label "Tournaments" is 71 px, so it truncates to "Tourname…" (`.playwright-mcp/h708-tabbar5-360.png` in the main checkout). At 320 px every tab is 64 px. **Recommendation:** order **Decks · Collection · Wishlist · Tournaments · Account**, and label the Tournaments tab **"Events"** in the phone bar only (page title and desktop tab stay "Tournaments"). Alternatives and trade-offs in §2 (Q1).
- **Desktop:** a fourth top tab **Wishlist** after Collection.
- **Page:** title, count line "23 cards · 41 copies wanted", the shared search ([[Direction H-706 Search and Deck Editor]] §2) with an Owned filter, a sort, and a grid of **full-colour** tiles with the card name, the wanted count ("Want 2"), the variant when it isn't the default printing, and a **"Needed for Jinx Aggro"** chip (or "Needed for 2 decks").
- **Card details:** phones open the H-698 **bottom sheet**; desktop ≥ 64rem shows a **sticky right sidebar** (22rem) with the selected card, reusing the Deck detail panel shell that already exists (Card / Missing tabs, [[Decks]] §6). Tablets use the centred dialog. One shared **card details content** component renders in all three containers; H-698 owns the phone shell, this item adds the sidebar host.
- **Add missing to wishlist:** a button beside **Copy missing list** in Deck detail's Missing panel. One click; the notice says what was added, with **Undo** and **View wishlist**.
- **Auto-update:** when copies enter the collection, matching wishlist entries count down and leave at zero, with one summary notice after an import.

## 1. Jobs
| Job | Success |
|---|---|
| "What do I still need to buy or trade for?" | One list, full colour, counts, which deck each is for |
| "Put everything Jinx Aggro is missing on my list" | One click on the deck |
| "I want the Showcase one, not the regular" | Pick the variant in the details |
| "I just opened packs" | Import, and the list shrinks by itself |

Reference patterns (collection trackers and deck builders commonly have a "wants" or wishlist view, a "missing cards to wishlist" action on decks and per-entry variant choice; looked at, not copied).

## 2. Navigation
### 2.1 Phone bottom bar (five tabs)
Measured 2026-11-28 on https://riftbound-deckbuilder.web.app at 360 × 780, light, labels 12 px:

| Label | Width | Fits a 5-tab cell at 360 (≈ 65 px text room)? | at 320 (≈ 60 px)? |
|---|---|---|---|
| Decks | 32 px | yes | yes |
| Collection | 55 px | yes | yes |
| Wishlist | 43 px | yes | yes |
| Tournaments | 71 px | **no** ("Tourname…") | no |
| Sign in | 37 px | yes | yes |

Options:
| Option | Pro | Con |
|---|---|---|
| **A. "Events" as the phone label for Tournaments** (recommended) | Every label fits at 320; icons and 64 px height unchanged; 5 equal cells ≥ 64 × 64 | Two names for one page (mitigated: same trophy icon, page title says Tournaments) |
| B. Smaller labels (11 px) and 0 padding | No wording change | Still fails at 320; 11 px is below our smallest text token |
| C. Account back into the header (top-right, next to the theme toggle) | Four tabs again | Reverses RJ's H-247 decision |
| D. Wishlist inside Collection (a "Wishlist" view in the location switcher) | No fifth tab | ADR §4.1 says a separate tab |

- Order: **Decks · Collection · Wishlist · Tournaments · Account**; the collection-related pair sits together, Account stays last (SYNC-150 (g)).
- Icon: `bookmark` (outlined; filled when active, like the others' active treatment). Avoid a heart: it reads as "favourite", not "looking for".
- Grid becomes `repeat(5, minmax(0, 1fr))`; the reserved empty Account cell behaviour stays.

### 2.2 Desktop
Top tabs: Decks · Collection · **Wishlist** · Tournaments. Route `/wishlist`, behind the sign-in gate like Collection (same panel wording).

## 3. Page layout
```
Desktop 1440
Wishlist                                                     [+ Add cards]
23 cards · 41 copies wanted
┌ shared search (H-706) ─────────────────────────────────────┐ ┌ sidebar 22rem, sticky ──┐
│ [⌕ Search by name ...] [Domain▾][Type▾]…[More▾] Sort [Added▾]│ │ Ion Arc            [✕]   │
└────────────────────────────────────────────────────────────┘ │ ┌──────────┐            │
┌────┐┌────┐┌────┐┌────┐                                         │ │   art    │            │
│art ││art ││art ││art │   full colour, 4 columns                │ │          │            │
└────┘└────┘└────┘└────┘                                         │ └──────────┘            │
Ion Arc        Lightning Rush                                    │ Want [−] 2 [+]          │
Want 2         Want 1 · Showcase                                 │ Printing [OGN-012 ▾]    │
[🂠 Needed for Jinx Aggro]                                        │ Needed for              │
                                                                 │  Jinx Aggro   needs 2 → │
                                                                 │ You own 1 (Main binder) │
                                                                 │ [Remove from wishlist]  │
                                                                 └─────────────────────────┘
```
- **Grid:** `--tile-min` 9rem; 4 columns beside the sidebar at 1440, 3 at 1024, 4 at 768 (no sidebar), 2 on phones.
- **Tile:**
```
┌──────────────┐
│              │  art, full colour (ADR §4.1), 63:88, lazy, alt = card name
│              │
└──────────────┘
Ion Arc                 sm 600, 2 lines max
Want 2 · Showcase       xs; variant only when not the default printing
[🂠 Needed for Jinx Aggro]   chip, xs, outlined, deck name truncated; "Needed for 2 decks" when several
```
  - The whole tile is one button that selects it (sidebar) or opens the sheet / dialog. Accessible name: "Ion Arc, Showcase, want 2, needed for Jinx Aggro".
  - "Want 2" is shown at 1 too ("Want 1"): on this page the count is the point (unlike Collection's ×N rule).
  - The chip is text plus a deck icon, not interactive on the tile (the sidebar lists the decks as links), so the tile stays one target.
  - A partly arrived entry (want 3, own 1 of them since adding, if the spec keeps progress; Q3) reads "Want 2 more".
- **Sort:** Recently added (default) · Name · Set & number · Deck.
- **Phone:** title row with **Add cards** as an icon button (`add`, "Add cards"), search + Filters, 2-column grid. No FAB (the page already has one primary action in the title row; avoids stacking over the five-tab bar).
- **Add cards** opens the shared search in add mode (H-706 §2.3): results whole catalog, full colour, an **Add** button per result adding one of the default printing (ADR §4.2), badge showing how many are already wanted.

## 4. Card details: sheet, dialog, sidebar
- **One content component** (`card details`) with sections chosen by the host; three containers:
  | Width | Container | Open | Close |
  |---|---|---|---|
  | < 40rem | H-698 bottom sheet | tap a tile | Close, swipe down, Back |
  | 40–64rem | centred dialog (today's) | tap a tile | Close, Escape |
  | ≥ 64rem | sticky sidebar | select a tile (it shows a 2 px accent ring + `aria-pressed`/`aria-current`) | ✕ in the sidebar clears the selection; the sidebar then shows a quiet hint "Select a card to see its details." |
- The sidebar is **not a dialog**: no focus trap, no backdrop. Selecting a tile updates it and moves focus only when opened by keyboard (Enter), to the sidebar's heading (`tabindex="-1"`); a mouse click leaves focus on the tile. `[` / `]` step through tiles as in the dialogs.
- **Relation to H-698 and existing dialogs:** H-698 is cleaning up the phone presentation of the Collection and Deck detail dialogs now. This item must not fork it: build the wishlist sheet from the same shared sheet chrome H-698 introduces, and extract the dialog **content** so it can render in a panel. Deck detail already has a desktop panel (Card / Missing tabs); the Wishlist sidebar uses the same panel shell, so the app has one desktop pattern. Whether Collection also moves to a desktop sidebar is a separate RJ call (Q6).
- **Wishlist sections, in order:** art (+ ban label) · name · **Want** stepper (min 1; at 1 the minus becomes "Remove") · **Printing** select (default printing first, each option names its variant) · **Needed for** (deck rows: deck name, "needs 2", chevron, link to `/decks/:id`) · **You own** (count and places, shared rows from [[Direction H-707 Collection Folders]] §5; "You don't own any yet") · keywords · **Remove from wishlist** (text button, danger colour text, Undo notice instead of a confirm).

## 5. Deck detail: "Add missing to wishlist"
- In the Missing panel's heading row (desktop) and under the missing list (tablet, phone), next to **Copy missing list**: an outlined button **Add to wishlist** (`bookmark_add`). Accessible name: "Add missing cards to wishlist".
- One click adds every missing copy of this deck (ADR §4.4). Success notice: "Added 11 copies of 7 cards to your wishlist." with **Undo** and **View** (to `/wishlist`).
- Already all there: the button stays enabled; the notice reads "Your wishlist already has every missing card from Kennen Tempo." (info).
- Nothing missing: the button is not shown (the Missing panel already says the deck is complete).
- **Sums across decks** (ADR §4.4): if Jinx Aggro and Kennen Tempo each miss 2 Ion Arc, the entry reads "Want 4" and the chip "Needed for 2 decks"; the details list "Jinx Aggro needs 2", "Kennen Tempo needs 2".
- On Deck detail tiles, a wanted missing card could show a small `bookmark` glyph; recommend not now (the tile already carries fill, chip and ban label).

## 6. Auto-update when a card is owned (ADR §4.6)
- After an import or a test-data load adds copies, matching entries count down (match rule per Q2); entries at zero leave the list.
- One notice per import, not per card: "3 cards left your wishlist: you have them now." (success, with **View wishlist**). An entry that only counts down isn't announced separately.
- If the Wishlist page is open in another tab, it updates in place, keeps scroll, and a selected card that leaves clears the sidebar with the hint text.
- Removing copies from the collection never adds wishlist entries by itself.

## 7. States, accessibility, motion
| State | What shows |
|---|---|
| Signed out | the shared sign-in panel (same as Collection) |
| Empty | deck mark, "Your wishlist is empty", "Add cards you're looking for, or add a deck's missing cards from the deck page.", **Add cards** |
| Filters match nothing | "No wishlist cards match these filters." + **Clear all** |
| Card data not loaded | names and counts still show; art placeholders with the name (COLL-006 pattern) |
| A deck in "Needed for" was deleted | its chip drops; the entry stays with its count (user's own list) |
- Targets ≥ 44 px (stepper, printing select, rows, chip rows in details). Tile and sidebar order in the DOM: grid, then sidebar, with a "Skip to card details" link when a card is selected.
- Contrast: existing tokens only; the "Needed for" chip uses `--color-text` on `--color-surface` with `--color-border-strong`.
- Motion: tiles leaving after auto-update fade out over `--dur-fast`; rest under reduced motion. The sidebar content swap uses the existing art `animateChange` only.
- New strings (proposals for RJ): "Wishlist", "Events" (phone tab, if Q1 = A), "23 cards · 41 copies wanted", "Want 2", "Want 2 more", "Needed for <deck>", "Needed for 2 decks", "<deck> needs 2", "Add to wishlist", "Added 11 copies of 7 cards to your wishlist.", "Your wishlist already has every missing card from <deck>.", "3 cards left your wishlist: you have them now.", "Remove from wishlist", "Select a card to see its details.", "Your wishlist is empty", "You don't own any yet".

## 8. Open questions (for RJ or the spec-writer)
1. **Q1 Five phone tabs:** recommend option A ("Events" as the phone label for Tournaments). Alternatives B–D in §2.1.
2. **Q2 Which owned copies count against an entry?** Entries are per printing (ADR §4.2), but decks need a card by name. Recommend: entries added from a deck accept **any printing** ("Any printing is fine" on by default), entries where the user picked a variant count only that printing. Shown in the details as a switch under Printing.
3. **Q3 Counting down vs progress:** when 1 of 3 wanted copies arrives, does the entry become "Want 2" (recommended, simpler) or "1 of 3" (progress)?
4. **Q4 Do deck-linked counts stay live?** If the user later adds more copies of a card to Jinx Aggro, should the wishlist grow by itself? Recommend no: the list is the user's; "Needed for" stays live (computed from current missing), the count changes only by user action, Add to wishlist, or auto-update.
5. **Q5 Owned copies vs free copies:** should a card count as "got it" when the user owns it but every copy is in another deck? Under ADR-0010 each deck needs its own copies, so recommend counting **free** copies for deck-linked entries.
6. **Q6 Desktop sidebar beyond the Wishlist:** keep it Wishlist-only for now (ADR scope), or also use it on Collection (replacing the centred dialog at ≥ 64rem). Recommend Wishlist first, then decide on Collection after RJ has used it.
7. **Q7 Wishlist tab icon:** `bookmark` (recommended) or `favorite`.
