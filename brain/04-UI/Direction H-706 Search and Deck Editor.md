---
title: Direction H-706 - Shared card search and the deck editor
status: draft
board: H-706
source: "[[ADR-0010 Deck Building, Physical Copies, Folders and Wishlist]] §1, §2 (RJ 2026-11-28, chat); [[Design Direction]]; [[Decks]]; [[Decks Components]]; [[Collection]]; [[Brief H-698 Card Dialog Mobile]] (sheet shell, input only)"
date: 2026-11-28
tags: [ui, direction, draft, rj-requested]
---

# Direction H-706: shared card search and the deck editor

## Summary
- **Draft design direction, not a build brief.** The specs it depends on (H-701 search, H-702 editor, H-703 physical copies, H-704 formats) aren't written yet. Spec-writer reads this as input; the final brief is written after the specs pass. Anything that needs a product rule is in **Open questions** (§9) with a recommendation, not decided here.
- **One search component, three hosts:** `app-card-search` (field + filters + results) is used by the deck editor, Collection and the Wishlist ([[Direction H-708 Wishlist]]). The host decides the result tile and which filters show; the query model, URL keys, chips and phone filter sheet are shared.
- **Filters:** a name field that is always visible, then filter buttons (Domain, Type, Rarity, Cost, Might, Set, Keywords, More), each opening a small menu on desktop. Active filters show as removable chips with **Clear all**. On phones one **Filters (n)** button opens a full-height sheet (the [[Brief H-698 Card Dialog Mobile]] shell) with every group and a sticky **Show 42 cards** button. Domains are **text chips**, never Riot's domain symbols ([[Design Direction]] "Not copied on purpose"). Cost and Might are rows of number chips (0 1 2 … n+), not sliders: precise, 44 px, one tap each.
- **Owned filter** (All / Owned / Not owned) shows in the editor and the Wishlist. Collection stays owned-only and gets a **Location** filter instead ([[Direction H-707 Collection Folders]]).
- **Deck editor** is its own screen, `/decks/:id/edit` and `/decks/new`, opened by **Edit cards** on Deck detail and **New deck** on Decks. It edits a **draft**; **Save** commits once (that's when auto-fill takes copies, ADR §3.5). Desktop: search on the left, the deck as a compact list on the right. Tablet: two tabs, **Find cards** / **Deck (52)**. Phone: the deck list is the page, **Add cards** opens the search as a full-height sheet with a running deck tray at the bottom.
- **Full colour while searching** (ADR §1.4): every result tile is full colour, with plain text for "Own 3 · 2 in deck". The ownership fill comes back only on Deck detail.
- **Live legality** sits at the top of the deck panel: the deck's format with Legal / Not legal and a problem count that expands to the list. Other formats show as a compact row of status chips. Illegal decks save without a warning dialog (ADR §1.2: planning illegal decks is allowed).
- **Locked deck:** **Edit cards** stays visible; activating it shows the notice "Can't edit cards. This deck is locked." (the existing "Can't lock…" pattern). Rename and description stay in ⋮ (ADR §1.6).
- **Edited tournament copy:** a small outlined **Edited** chip after the source line on the tile and on Deck detail; the event source stays.
- **Auto-filled copies:** after Save a success notice says how many copies moved in and from where, with **Undo**. The card dialog on Deck detail lists where this deck's copies came from (shared with H-707's "Where your copies are").

## 1. What the user is doing
| Job | Where | Success looks like |
|---|---|---|
| "Change two cards in my imported deck" | Deck detail → Edit cards | Finds the card in seconds, swaps it, saves, sees the ownership fill update |
| "Build a deck from scratch" | Decks → New deck | Picks a Legend, fills zones, sees what's still illegal as they go |
| "Find all my Fury units that cost 2" | Collection search | Two filter taps, no typing |
| "Plan a 2v2 deck" | Editor format selector | Sees 2v2 legality next to Standard without changing anything |

Patterns seen in established deck builders and collection trackers (looked at as reference, not copied; no product's look, wording or colours used): search-left / deck-right on desktop, quantity steppers in the deck list, filters as removable chips, a "Filters" sheet on phones, and "add" as an explicit button on each result rather than "tap anywhere to add".

## 2. Shared search, `app-card-search`

### 2.1 Anatomy
```
Desktop (≥ 64rem), inside the host's column
┌───────────────────────────────────────────────────────────────────────────┐
│ [⌕ Search cards by name ...........................] [✕]    Sort [Name ▾]  │  44 px
│ [Domain ▾] [Type ▾] [Rarity ▾] [Cost ▾] [Might ▾] [Set ▾] [Keywords ▾] [More ▾] │
│ Fury ✕   Cost 2 ✕   Unit ✕   Clear all                                       │  only when active
│ Showing 42 of 1,180 cards                                    (role=status)  │
└───────────────────────────────────────────────────────────────────────────┘
results grid (host's tile)

Phone (< 40rem)
┌──────────────────────────────────────┐
│ [⌕ Search cards by name ......] [⚲ 3]│  ⚲ = "Filters (3)", 44 × 44, badge = active count
│ Fury ✕  Cost 2 ✕  Unit ✕  Clear all  │  one row, scrolls sideways
│ Showing 42 of 1,180 cards            │
└──────────────────────────────────────┘
```
- The field and the filter row are **sticky** under the header (same translucent slate and blur as Collection's toolbar today), so the filters stay reachable while scrolling results.
- **Name search** keeps SPEC-001 CARD-038 matching (tokens, accents, leading "a"/"the"). Whether free text also matches rules text and keyword names is open (Q1).
- `/` focuses the field, Escape clears it (as on Decks).

### 2.2 Filter groups
Which groups exist depends on the live Riot data (ADR §2.3, H-020). Build and test on the fixture; a group with no values in the data is hidden, not shown empty.

| Group | Control | Notes |
|---|---|---|
| Domain | multi-select text chips | "Any of" by default (a multi-domain card matches if any selected domain matches, COLL-042). Whether to offer "Only these domains" for deck colour identity is a spec call (Q2). Text labels only, no domain symbols, no colour-only coding |
| Type / category | multi-select chips | Unit, Spell, Gear, Rune, Battlefield, Legend… as the data names them |
| Rarity | multi-select chips | data order (COLL-034) |
| Cost | number chips `0 1 2 3 4 5 6 7+` | multi-select; the top bucket ("7+") is set by the spec from the data range |
| Might | number chips, same pattern | hidden for categories without might when that's the only type selected |
| Set | multi-select list | set order (CARD-071), newest first in the menu |
| Keywords | searchable multi-select | names from the keyword glossary (ADR-0008); "Has all" vs "has any" is a spec call |
| More ▸ Owned | segmented All / Owned / Not owned | editor and Wishlist only |
| More ▸ Location | folder / deck list | Collection only, from H-707 |
| More ▸ Ban status | All / Hide banned / Banned only | COLL-045 wording |
| More ▸ Variant | Regular / Foil / Showcase… | Collection and Wishlist (per printing) |

- Within a group values are OR; across groups AND (COLL-041). Unknown values get their own "Unknown" option (COLL-035).
- **Desktop menus** are Material menus with checkbox rows (44 px), not a modal. Changes apply at once; the count line updates (`role="status"`, polite).
- **Phone sheet** (title "Filters"): every group stacked, chips wrap; a sticky footer with **Clear all** (text button) and **Show 42 cards** (filled, label updates live; "No cards match" and `aria-disabled` when zero). Applies on **Show**, so the grid behind doesn't reshuffle while the user taps. Back gesture / swipe down = close without applying (follows H-698 B1/B2).
- **Chips** read "Fury", "Cost 2", "Cost 2–4" (a contiguous run collapses), "Not owned". Each is a button, `aria-label="Remove filter: Cost 2"`. **Clear all** restores the default.
- **URL:** Collection and Wishlist keep the query in the URL (`q`, `domain`, `type`, `cost`… as COLL-060/061 do today), so Back and reload keep it. The editor keeps it in the editor's own state (it isn't a page someone shares mid-build).
- **No-match state:** "No cards match these filters." with **Clear all**, and the chips still visible above so the user sees what's narrowing it (COLL-047).

### 2.3 Hosts
| Host | Result tile | Default sort | Extra |
|---|---|---|---|
| Deck editor | full-colour art + name + "Own 3 · 2 in deck" + **Add** button (§4.3) | Name | Owned filter; results = whole catalog (ADR §1.3) |
| Collection | today's image-only tile with ×N (unchanged) | Set & number | Location filter; owned cards only (Q3) |
| Wishlist "Add cards" | full-colour art + name + **Add** | Name | Owned filter |

## 3. Entry points
- **Decks list:** **New deck** next to **Import deck** in the title row (outlined, `add` icon; Import deck keeps its current place). Phone: a two-item menu on the existing FAB ("New deck", "Import deck") or two buttons in the title row; recommend the title row, so the FAB keeps one meaning (Q4).
- **Deck detail:** **Edit cards** (outlined, `edit` icon) in the title row before the lock toggle on desktop; on phones a full-width outlined button under the summary lines, above the Missing panel. It is the only new header action.
- **Tournaments → Add to your decks** is unchanged; the copy it makes is editable like any deck.

## 4. The deck editor

### 4.1 Layout
```
Desktop 1440 (content 1152 px): /decks/:id/edit
← Kennen Tempo                                               [Discard]  [Save]
┌ search (minmax(0,1fr)) ─────────────────────────────┐ ┌ deck (24rem, sticky) ─────────────┐
│ [⌕ Search cards ......] Sort [Name ▾]                │ │ Format [Standard ▾]               │
│ [Domain▾][Type▾][Cost▾][Might▾][Set▾][More▾]         │ │ ⛔ Not legal · 3 problems  ▸      │
│ Showing 42 of 1,180 cards                            │ │ 2v2 ✓  Other format ? (chips)     │
│ ┌────┐┌────┐┌────┐┌────┐┌────┐  full colour          │ │──────────────────────────────────│
│ │art ││art ││art ││art ││art │                       │ │ Legend · 1                        │
│ └────┘└────┘└────┘└────┘└────┘                       │ │  ▯ Kennen, …            [⋮]       │
│ Ion Arc     Hextech…                                 │ │ Main Deck · 37 / 40               │
│ Own 3 · 2 in deck                                    │ │  ▯ Ion Arc        [−] 2 [+] [⋮]   │
│        [+ Add]                                       │ │  ▯ Lightning Rush [−] 3 [+] [⋮]   │
│                                                      │ │ … Battlefields · Runes · Sideboard│
└──────────────────────────────────────────────────────┘ └───────────────────────────────────┘
```
- **Tablet 40–64rem:** one column with two tabs under the title row, **Find cards** and **Deck (52)**; the legality line stays visible above both tabs. Adding from Find cards bumps the Deck tab's count (no tab switch).
- **Phone < 40rem:**
```
← Kennen Tempo                    [Save]
Format Standard ▾ · ⛔ 3 problems ▸
Legend · 1
 ▯ Kennen, …                     [⋮]
Main Deck · 37 / 40
 ▯ Ion Arc            [−] 2 [+] [⋮]
 …
┌ sticky bottom bar (above the tab bar) ┐
│ [+ Add cards]                          │  full width, filled, 48 px
└────────────────────────────────────────┘
```
  **Add cards** opens the search as a full-height sheet (H-698 chrome: handle, title "Add cards", Close). A tray at the bottom of the sheet reads "Main Deck 37 / 40 · 52 cards" and **Done**. Adding keeps the sheet open, so many cards go in without round trips.
- Zone order is Riot's (OWN-011): Legend, Chosen Champion, Main Deck, Battlefields, Runes, Sideboard. Every zone shows, empty ones with "No cards yet".
- **Zone counts** ("37 / 40") come from the legality engine for the selected format; the UI never hard-codes a number (rules facts belong to [[Deck Legality]]).

### 4.2 Deck rows
`[thumb 32×45] Name (sm 600, 1 line, ellipsis) · [−] n [+] · [⋮]`
- Steppers are 44 × 44 on touch (36 visual, 44 hit) with names "Remove one Ion Arc" / "Add one Ion Arc"; the number is `aria-live="polite"` only on change. At 1, **−** becomes a `delete` icon ("Remove Ion Arc").
- **⋮ menu:** "Move to Sideboard" (one item per other zone, listing only zones the card may go in if the spec defines that), "Move 1 to Sideboard" when n > 1, "Card details", "Remove from deck".
- Tapping the name or thumb opens the card details (the existing deck card dialog / H-698 sheet) in an **editor mode** that adds a zone selector and a quantity stepper.
- No drag-and-drop between zones in the first build (keyboard and touch cost a lot for little gain); the ⋮ menu covers it. Desktop drag can come later with the menu kept as the accessible path.
- Removal is instant with no confirm (it's a draft). Draft changes show a muted "Unsaved changes" line next to Save.

### 4.3 Result tiles (editor)
```
┌──────────────┐
│          ×2  │  badge: copies already in this deck (any zone); hidden at 0
│   art, full  │  always full colour (ADR §1.4)
│    colour    │
└──────────────┘
Ion Arc               sm 600, 2 lines max
Own 3 · 2 in deck     xs muted, text only ("Not owned" when 0)
[+ Add]               text button, 44 px, aria-label "Add Ion Arc to Main Deck"
```
- **Add** puts one copy into the card's default zone (from its category; Legend → Legend, Battlefield → Battlefields, Rune → Runes, else Main Deck; the spec confirms the mapping, Q5). The badge counts up with a 120 ms scale bump (none under reduced motion). No notice per add: the badge and the deck panel are the feedback.
- Activating the tile body opens card details with zone + quantity (§4.2).
- No cap on copies: adding a fourth copy is allowed and shows as a legality problem (ADR §1.2).
- "Own 3" counts the user's copies of the card. Whether that's free copies (not in other decks / folders that disallow decks) or all owned depends on H-703; recommend "Own 3 · 1 free" when they differ (Q6).

### 4.4 Live legality and formats
- **Format selector** (Material select): the deck's own format; options come from H-700/H-704 research. Changing it changes the zone targets and the problem list, live.
- **Status line:** `check_circle` "Legal in Standard" / `block` "Not legal in Standard · 3 problems" / `help` "Not fully checked" (existing wording, OWN-006). Text plus icon, never colour alone.
- **Problems ▸** expands an inline list in the panel (phone: opens the Rule check sheet). Each problem names the card and is a button that scrolls to that row and focuses it. Long lists use the "Show cards" disclosure from OWN-117.
- **Other formats:** a row of small chips "2v2 ✓", "<format> ⛔" for every known format (`aria-label="2v2: legal"`). Tapping one shows that format's problems without changing the deck's format.
- Updates are debounced ~150 ms after the last change; the status line is `role="status"` (polite) so screen readers hear "Legal in Standard" when it flips, not every recount.
- Deck detail keeps the existing legality line; it gains the format name and the same chip row under the Rule check link.

### 4.5 Save, discard, leave
- **Save** (filled): writes the draft; auto-fill runs once (ADR §3.5). Success notice (top, SYNC-161): "Deck saved. 8 copies moved in from Main binder and 1 other folder." with **Undo** (where the spec allows undoing an auto-fill). If nothing moved: "Deck saved." Returns to Deck detail.
- **Discard** (text): when there are changes, a confirm "Discard your changes to Kennen Tempo?" / **Discard changes** (danger) / **Keep editing**.
- Leaving by tab, Back or link with unsaved changes asks the same question (route guard). Closing the browser tab uses the browser's own prompt.
- Saving an illegal deck needs no extra step.
- **New deck:** the draft starts with the name "New deck" in an inline-editable title (or follows the Legend's name once one is added, matching DECK-070, Q7). Save is `aria-disabled` with the reason "Add at least one card to save." until the deck has a card. Discarding an unsaved new deck goes back to Decks.

## 5. Locked decks (ADR §1.6)
- Deck detail: **Edit cards** stays visible and focusable. Activating it shows the notice "Can't edit cards. This deck is locked." (info kind, top) and doesn't navigate. Same pattern as the lock toggle's "Can't lock…" notices.
- A direct visit to `/decks/:id/edit` on a locked deck redirects to Deck detail with the same notice.
- Rename, description and source in ⋮ stay enabled.
- Per-card-name locks (SPEC-008 0.6) don't map cleanly onto ADR-0010's "a locked deck's cards can't be moved". If partial locks survive, locked rows in the editor show a `lock` icon with steppers and Move off (`aria-disabled`, "Ion Arc is locked in this deck"). Q8.

## 6. Tournament copies: "Edited"
- After the first saved card change, a tournament copy shows an outlined chip **Edited** (`edit` icon, `--font-size-xs`, `--color-border-strong`) after the source line on the deck tile and on Deck detail. Accessible text: "Edited after adding from the tournament".
- The source line, event link and "In your decks" on Tournaments stay as they are (ADR §1.5).
- A "Reset to the tournament list" action is not in the ADR; leave it out unless RJ wants it (Q9).

## 7. Auto-filled copies on Deck detail
- The ownership fill now reflects copies the deck **holds** (H-703). The card dialog's ownership section becomes "In this deck: 2 of 3" with one row per source ("1 from Main binder", "1 from Not in a folder"), sharing the "Where your copies are" rows of [[Direction H-707 Collection Folders]] §5.
- A shortfall line explains why free copies weren't taken when the reason is a rule: "1 more in Showcase top loader (not used for decks)", "1 more is tagged Exclude from decks", "2 more are in Jinx Aggro". Each with a **Move here** action where moving is allowed (not out of a locked deck).

## 8. Accessibility, motion, copy notes
- Every control ≥ 44 px on touch; the search field 44 px tall; chip rows wrap on desktop, scroll sideways on phones with visible overflow cues.
- Tab order (desktop editor): back link → Discard → Save → search field → filter buttons → chips → results (Add buttons after each tile body) → deck panel (format → status → problems → rows). A "Skip to deck" link at the start of the results helps keyboard users jump columns.
- Live regions: the search count line and the legality status only. No live region per add.
- Motion: only the badge bump and the existing card art `animateChange`; everything rests under reduced motion.
- Light and dark: all colours are existing tokens; no new colours needed.
- Strings above are proposals for RJ (American spelling). New strings: "New deck", "Edit cards", "Add cards", "Find cards", "Add", "Own 3 · 2 in deck", "Not owned", "Unsaved changes", "Discard your changes to <deck>?", "Discard changes", "Keep editing", "Deck saved. 8 copies moved in from <folder> and 1 other folder.", "Can't edit cards. This deck is locked.", "Edited", "Filters", "Show 42 cards", "No cards match these filters.", "Clear all", "Add at least one card to save."

## 9. Open questions (for RJ or the spec-writer)
1. **Q1 What does free text search?** Recommend: name by default, plus a "Include rules text" toggle in More. "Just about anything" is covered by the filter groups without making name search noisy.
2. **Q2 Domain filter for deck building:** "any of" vs "only these domains" (deck colour identity). Recommend both, "any of" by default, as a spec rule from [[Deck Construction Rules]].
3. **Q3 Does Collection's search ever show cards you don't own?** Recommend no: Collection stays owned-only (RJ 2026-11-24); browsing the whole catalog happens in the editor and Wishlist search.
4. **Q4 New deck on phones:** title-row button (recommended) or a two-item FAB menu.
5. **Q5 Default zone for an added card** by category, and whether a card may only go into certain zones (spec + rules research).
6. **Q6 "Own 3" in results:** all owned, or free for this deck. Recommend showing both when they differ ("Own 3 · 1 free").
7. **Q7 New deck name:** fixed "New deck" until renamed, or follow the Legend like imports (DECK-070). Recommend follow the Legend, for consistency.
8. **Q8 Per-card-name locks after ADR-0010:** keep partial (per-name) locks, or only whole-deck locks. This changes the editor (frozen rows vs a fully read-only deck). Needs RJ.
9. **Q9 "Reset to the tournament list"** for an Edited copy: recommend not now.
10. **Q10 Draft + Save vs autosave:** recommend draft + Save (auto-fill runs once, no folder churn on every tap, a clear Undo). Autosave would move physical copies on every click.
11. **Q11 Does a deck store one "own" format?** Recommend yes (default Standard), with other formats as secondary chips.
