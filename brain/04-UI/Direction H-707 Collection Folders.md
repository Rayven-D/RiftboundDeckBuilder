---
title: Direction H-707 - Collection folders and physical copies
status: draft
board: H-707
source: "[[ADR-0010 Deck Building, Physical Copies, Folders and Wishlist]] §3 (RJ 2026-11-28, chat); [[Design Direction]]; [[Collection]]; [[Collection Components]]; [[Decks]]; [[Brief H-698 Card Dialog Mobile]] (input only)"
date: 2026-11-28
tags: [ui, direction, draft, rj-requested]
---

# Direction H-707: Collection folders and physical copies

## Summary
- **Draft design direction.** The physical-copies spec (H-703) isn't written; this gives spec-writer and the later brief a shape to work from. Product gaps are in **Open questions** (§9) with a recommendation each.
- **Places, not filters:** Collection gets a **location switcher**. **Master collection** (every copy you own, the default; not a folder, ADR §3.1) · **Not in a folder** · **In decks** · then each folder with its icon and copy count · **New folder**. Desktop ≥ 64rem: a quiet **left rail** (14rem) beside the grid. Tablet and phone: a **location button** under the title ("Master collection ▾") that opens a menu (tablet) or sheet (phone).
- **Folder view** = the same grid filtered to that place, with a header: folder icon + name, "84 copies of 61 cards", a **Used for decks** / **Not used for decks** status (icon + text), and ⋮ (Rename, Change icon, Use for decks switch, Delete folder). Tile badges count **copies in this place**.
- **Icons:** Binder, Box, Top loader as three large radio tiles in the create dialog, drawn as our own simple line icons (no product art). One level only: there's no "New folder" inside a folder.
- **Moving = physically moving** (ADR §3.3): **Move…** from the card dialog or from multi-select on the grid. The Move dialog asks how many of which printing and where to, then the notice reads "Moved 2 copies of Ion Arc to Trade binder." with **Undo**. Decks are destinations too (ADR §3.4–3.5), except locked decks, which freeze their cards.
- **Card dialog "Where your copies are":** one row per place (folder icon, deck icon, or "Not in a folder"), with counts and a **Move** action. Shown in Master collection and in folder views (ADR §3.9).
- **Tag beats folder** (ADR §3.7): a copy tagged "exclude from decks" in a folder that allows decks gets a muted line with an info icon, "Not used for decks: tagged Exclude from decks", in the dialog row, and the folder header counts them ("3 copies here aren't used for decks because of a tag").
- **Delete is folder-specific** (ADR §3.8): in a folder view the dialog offers **Delete from this folder**; in Not in a folder it's **Delete from collection**. Whether "delete from a folder" destroys the copy or just un-files it is the most important open question (Q1).

## 1. Mental model
Three kinds of place hold a physical copy; each copy is in exactly one (ADR §3.3–3.4):

| Place | Icon (Material Symbols) | Holds copies for decks? |
|---|---|---|
| Not in a folder | `inbox` | yes (auto-fill takes from here first, ADR §3.5) |
| Folder: Binder | `menu_book` | per folder switch (ADR §3.6) |
| Folder: Box | `inventory_2` | per folder switch |
| Folder: Top loader | `crop_portrait` (a single framed card) | per folder switch |
| Deck | `playing_cards` (the existing Decks icon) | it *is* the deck |

**Master collection** is not a place; it's the sum of all of them. Copy in the UI always uses "copies" for physical cards and "cards" for distinct cards ("84 copies of 61 cards"), as the count line does today.

Reference patterns (collection trackers commonly offer binders, boxes and lists, and show "where is this card" on the card page; looked at, not copied): a sidebar of containers on desktop, a container picker on phones, multi-select then "Move to…", and per-container counts.

## 2. Layout

### 2.1 Desktop ≥ 64rem
```
Collection                                                       [⇩ Export CSV]
1,204 copies of 412 cards
┌ rail 14rem, sticky ──┐ ┌ toolbar (shared search, H-706) ────────────────────────────┐
│ ▣ Master collection   │ │ [⌕ Search by name ......] [Domain▾][Type▾]… Sort [Set ▾]   │
│   1,204               │ └────────────────────────────────────────────────────────────┘
│ ⊡ Not in a folder 300 │ ┌────┐┌────┐┌────┐┌────┐┌────┐
│ ▤ In decks        124 │ │ ×4 ││    ││ ×2 ││    ││ ×3 │   grid as today
│ FOLDERS               │ │art ││art ││art ││art ││art │
│ 📖 Main binder    612 │ └────┘└────┘└────┘└────┘└────┘
│ 📦 Bulk box       160 │
│ ▯ Showcase          8 │
│ [+ New folder]        │
└───────────────────────┘
```
- Rail rows are 44 px links (`aria-current="page"` on the active one), icon + name (1 line, ellipsis, full name in the tooltip and accessible name) + count right-aligned (`tabular-nums`, muted). The grid drops one column (6 → 5 at 1440).
- A folder that isn't used for decks shows a small `block` glyph after its name with the accessible suffix ", not used for decks".
- **New folder** is a text button at the end of the list.

### 2.2 Tablet 40–64rem and phone < 40rem
```
Collection                                   [⋯]
[📖 Main binder ▾]   612 copies of 380 cards
┌ sticky toolbar (search + Filters) ─────────────┐
```
- The location button (outlined, 44 px, icon + name + `expand_more`) opens a Material menu on tablet and a sheet on phones (H-698 chrome, title "Show"), listing the same rows as the rail plus **New folder**.
- Folder actions (Rename, Change icon, Use for decks, Delete folder) go in the page ⋯ when a folder is selected.
- URL: `/collection?in=<folderId>`, `in=none`, `in=decks`; no `in` = Master collection. Back and reload keep the place; an unknown id falls back to Master with the COLL-062 notice.

### 2.3 Folder header (folder selected)
```
📖 Main binder                                         [⋮]
612 copies of 380 cards · ✓ Used for decks
(3 copies here aren't used for decks because of a tag. Show)   ← only when true
```
- **Collection** stays the H1; the folder name is an H2 under it, so the page identity stays stable. The document title reads "Main binder · Collection · Rift Builder".
- "Used for decks" / "Not used for decks" is icon + text (`check_circle` / `block`), never colour alone.
- **Show** applies a filter to those copies (via the shared search's More filters).

## 3. Creating and editing folders
Dialog **New folder** (and **Edit folder**, same layout):
```
New folder
Name   [ Trade binder              ]   required
Icon   (◉ Binder) (○ Box) (○ Top loader)   three 96 × 88 radio tiles: icon over label
[✓] Use cards in this folder for decks
       Decks can take free copies from this folder.
                                    [Cancel] [Create folder]
```
- Radio tiles: a `radiogroup` named "Icon", arrow keys move, 2 px accent border + `check` corner mark on the selected one (not colour alone).
- The switch's help line changes with its state: off reads "Decks won't use copies in this folder."
- Name rules (length, duplicates) are the spec's; recommend any name up to 40 characters, duplicates allowed (as deck names, DECK-070) but warned inline ("You already have a folder called Trade binder.").
- No parent picker anywhere: one level only (ADR §3.2).
- **Turning "Use for decks" off** on a folder whose copies are in decks? Copies in a deck aren't in the folder (one place each), so nothing leaves a deck. The switch only affects future auto-fill. Say so in the help line: "Copies already in decks stay there."

## 4. Moving copies
### 4.1 From the card dialog
**Move…** opens:
```
Move Ion Arc
From  Main binder (2)            ← fixed when opened from a folder row; a select in Master
Printing  [OGN-012 · 2 ▾]        ← only when the place holds several printings
Copies    [−] 1 [+]   of 2
To        ( ) Not in a folder
          ( ) 📦 Bulk box
          ( ) ▯ Showcase
          ( ) 🂠 Jinx Aggro     needs 1 more
          (–) 🂠 Kennen Tempo   locked          ← disabled, with reason
                                     [Cancel] [Move 1 copy]
```
- Destinations are a radio list (44 px rows). Decks show whether they need the card ("needs 1 more") so moving into a deck is purposeful. Locked decks are listed but disabled with the reason "locked" (ADR §1.6).
- The primary button names the result: "Move 1 copy" / "Move 2 copies".
- Notice after: "Moved 1 copy of Ion Arc to Bulk box." + **Undo** (success kind, top, SYNC-161).
- Moving into a folder that isn't used for decks, out of a deck: "Moved 1 copy of Ion Arc out of Jinx Aggro. Jinx Aggro is now 1 copy short." (info kind). The deck's fill updates.

### 4.2 Many at once
- **Select** (text button in the toolbar; `checklist` icon on phones) turns on selection: each tile shows a 24 px check box in its top-left (hit area 44 px), tapping toggles. A selection bar replaces the toolbar: "5 cards selected · 9 copies" · **Move to…** · **Cancel**.
- Selecting a tile selects **all copies of that printing in the current place**; the Move dialog lists each selected printing with its own stepper when the user wants fewer.
- Escape or Cancel leaves selection mode. Keyboard: Space toggles the focused tile.
- Desktop drag onto a rail folder is a nice later addition, never the only way.

## 5. Card dialog: "Where your copies are" (ADR §3.9)
A new section in the Collection card dialog (desktop dialog and H-698 sheet), after the printing lines:
```
Where your copies are                       (h3)
📖 Main binder                    2   [Move]
📦 Bulk box                       1   [Move]
   ⓘ Not used for decks: tagged Exclude from decks
🂠 Jinx Aggro                      2   🔒      → links to the deck
⊡ Not in a folder                 1   [Move]
```
- One row per place holding copies of **this card**, all printings (with the printing shown when the card has several: "Main binder · OGN-012a Showcase"). Counts right-aligned.
- Deck rows link to `/decks/:id` (trailing chevron, as H-698 S3 for rows that leave the dialog); a locked deck shows `lock` + "Locked" text and no Move.
- In a **folder view** the dialog leads with "In this folder: 2 copies" and the actions **Move…** and **Delete from this folder**; the full "Where your copies are" list follows.
- This section replaces "Locked in" (copies in decks are now places) and sits before "Could fit in". Whether "Could fit in" stays, and what it counts, is the spec's call under the new model (Q5).
- Deck detail's card dialog shows the same rows for the deck's card (see [[Direction H-706 Search and Deck Editor]] §7).

## 6. Tiles
- Master collection: tile badge = all copies of that printing (as today). The **lock band** becomes a **deck band**: "2 in Jinx Aggro" / "3 in 2 decks" with the deck icon, on the printing that the deck actually holds (physical copies are per printing, if H-703 tracks them that way, Q4). Same scrim and contrast as today's band.
- Folder view: badge = copies of that printing **in this folder**; no deck band (copies in a deck aren't in the folder).
- In decks view: badge = copies in decks; the band names the deck.
- Not in a folder: as a folder view.

## 7. Delete (ADR §3.8)
| Where | Action label | Confirm | Result |
|---|---|---|---|
| Card dialog in a folder view | **Delete from this folder** | "Delete 1 copy of Ion Arc from Main binder?" + what happens (Q1) | per Q1 |
| Card dialog in Not in a folder | **Delete from collection** | "Delete 1 copy of Ion Arc from your collection?" | the copy leaves Master |
| Card dialog in Master | **Delete…** asks which place first (the Move dialog's "From" select) | | |
| Card in a deck | no delete here; remove it in the editor | | |
| Folder ⋮ | **Delete folder** | "Delete Trade binder? Its 84 copies move to Not in a folder." (recommended, Q2) | folder gone, copies kept |
- Every delete gets the existing 10 s Undo notice (H-087 rules).
- The existing bulk delete and Replace import stay (ADR §3.8). Replace import's "which folder or deck to take the rest from" question (ADR §3.10) is a dialog step in the import review; it lists places like the Move dialog does.

## 8. States
| State | What shows |
|---|---|
| No folders yet | Rail: Master, Not in a folder, In decks, then a muted line "Group your copies into binders, boxes and top loaders." and **New folder** |
| Empty folder | Grid area: deck mark + "Nothing in Trade binder yet" + "Move copies here from a card's details." (no action button: moving starts from a card) |
| Search finds nothing in a folder | "No cards in Trade binder match these filters." + **Clear all** + text button "Search Master collection" |
| Migration done (first load after H-703) | One info notice: "Your decks now hold their own copies. Cards that didn't fit stay missing." Wording waits on the migration spec |
| Copy in a folder that disallows decks while a deck is short | Deck side explains it (H-706 §7) |

## 9. Open questions (for RJ or the spec-writer)
1. **Q1 What does "Delete from this folder" do?** ADR §3.8 says it "removes that copy from its folder", and only a copy in no folder "is removed from the Master collection". Two readings: (a) it un-files the copy (it goes to Not in a folder, still owned), (b) it deletes the copy from the collection, starting from that folder. Recommend (a) **plus clear labels**: "Remove from folder" (to Not in a folder) and "Delete from collection" as two separate actions, so no one deletes a card by tidying a binder.
2. **Q2 Deleting a folder:** recommend its copies move to Not in a folder (nothing is lost), with Undo.
3. **Q3 Default for "Use cards in this folder for decks":** recommend **on** for every new folder (matches today's behaviour where every copy counts); a Top loader showcase is the obvious one users will switch off.
4. **Q4 Are copies tracked per printing in folders and decks?** The deck band and the Move dialog's printing select need it. Recommend yes (the tiles are already per printing).
5. **Q5 "Could fit in" under the new model:** keep it (decks that use the card and still need copies), renamed **"Decks that need this card"**, each with "needs 1 more". Recommend keep.
6. **Q6 "In decks" as a rail entry:** recommended (one tap to see what's sleeved up), but it's an extra place users didn't ask for; RJ may prefer only Master, Not in a folder and folders.
7. **Q7 Folder order in the rail:** recommend user order by drag later; for now newest last (creation order), not alphabetical, so a new folder appears where the user just made it.
8. **Q8 Folder name limits** (length, duplicates): recommend 40 characters, duplicates allowed with an inline warning.
