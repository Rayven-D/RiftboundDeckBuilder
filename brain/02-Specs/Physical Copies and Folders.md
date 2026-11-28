---
tags: [spec]
id: SPEC-015
version: 0.1.2
status: draft
depends_on: [SPEC-001, SPEC-003, SPEC-005, SPEC-006, SPEC-007, SPEC-010, SPEC-014]
supersedes: "SPEC-008 [[Shared Cards and Lock-in]] (shared pool, card-name locks, lock storage)"
research: ["[[Physical Copies Across Decks]]", "[[Deck Construction Rules]]"]
decisions: ["[[ADR-0010 Deck Building, Physical Copies, Folders and Wishlist]]", "[[ADR-0006 Two Imports - Collection and Decks]]"]
ui: ["[[Direction H-707 Collection Folders]]", "[[Direction H-706 Search and Deck Editor]]"]
board: H-703, H-707, H-709
as_of: 2026-11-28
---
# SPEC-015: Physical Copies and Folders

## Summary
> Read this first. Full detail below only if needed.

**Purpose:** model the user's cards as **physical copies** that sit in exactly one place: **Not in a folder**, a **folder** (binder, box or top loader) or a **deck**. Decks hold their own copies, so two decks that each need 2 Ion Arc need 4. Copies get into decks by **auto-fill** on Save, Restore and Fork, or by hand. This **replaces SPEC-008's shared pool and card-name locks** (RJ 2026-11-28, chat, ADR-0010 §3 and answers parts 1 and 2).

**Key rules (RJ unless marked *default, proposed*)**
- COPY-001…008: **Master collection** = the whole collection, not a place. Each copy is in **one** place, tracked **per printing** (copy key = `printingId`, or `u` for copies with no known printing). Not in a folder is the **remainder** (never stored). A move is a physical move.
- COPY-010…017: **Folders**: any name, 1 to 40 characters, duplicates allowed with a warning; icon Binder / Box / Top loader; one level only; **"Use cards in this folder for decks"** on by default; listed in creation order; deleting a folder moves its copies to Not in a folder, with Undo.
- COPY-020…026: **Moves** from the card dialog (Move…) and multi-select; decks are destinations up to what they still need; locked decks are never a source or a destination.
- COPY-030…039: **Auto-fill** on Save, Restore, Fork (and, *default, proposed*, on every other new deck) takes **free** copies (in Not in a folder and in deck-allowed folders, not excluded, never from another deck) up to the deck's need. *Default, proposed:* Not in a folder first, then folders in creation order; unassigned copies, then base printings, then other printings; extra copies after an edit go back to Not in a folder.
- COPY-040…044: the **"exclude from decks" tag beats the place** (card first, then its folder or deck); the user is told when a tag is why a copy isn't used.
- COPY-050…057: **Locks are per deck only**: a locked deck's cards and copies are frozen (rename and description stay allowed); auto-fill never takes from it. Per-name locks (SHARE-080…095) are withdrawn. Deleting a deck frees its copies.
- COPY-060…066: collection changes. Added copies land in Not in a folder (*default, proposed*: no deck takes them by itself; Deck detail offers **Fill with free copies**). **Replace import takes copies in no folder first, then asks which folder or deck to take the rest from** (RJ).
- COPY-070…081: display: "Where your copies are" in the card dialog, **"Remove from folder"** and **"Delete from collection"**, **"Decks that need this card"** ("needs 1 more"), the location rail with **In decks**, "Own 3 · 1 free" in editor results, OWN-126 "owned but not available" listing every deck (and folder) holding copies, and the Deck detail fill = the copies the deck **holds**.
- COPY-090…096: **migration** of existing decks and per-name locks (*default, proposed*: a fully locked deck stays locked and fills first, in lock order; a partly locked deck becomes unlocked; then every other deck in Decks-list order).
- COPY-100…107: storage: `StoredFolders` (new), `UserDeck.copies` (new field, SPEC-006), `StoredDeckLocks` v3 (per deck); Firestore shape is SPEC-010's (H-714), applied in SPEC-010 SYNC-017, 018, 020.

**Shared types:** `CopyKey`, `CopyCounts`, `Folder`, `FolderIcon`, `StoredFolders`, `DeckLock`, `StoredDeckLocks` (v3), `PlaceRef`, `CopyMove`, `PlacesInput`, `PlacesView`, `CardPlaces`, `DeckHolding`, `AutoFillResult`, `RemovalPlan`. Pure functions `computePlaces()`, `autoFill()`, `planRemoval()`, `repairPlacements()`, `migrateToCopies()`.
**Depends on:** SPEC-001 v0.4.2, SPEC-003 v0.19.2, SPEC-005 v0.24.1, SPEC-006 v0.23.1, SPEC-007 v0.20.2, SPEC-010 v0.23, SPEC-014 v0.4.1.
**Open:** every *default, proposed* item is listed in Open questions for RJ. Nothing is BLOCKED on research: the rules facts this spec uses are `verified` ([[Physical Copies Across Decks]], as of 2026-11-23).

## Purpose
RJ wants the app to treat the collection the way it sits on the table: "Treat decks like the user is physically making those decks" (ADR-0010 §3.4). A copy in a binder is not in a box; a copy sleeved in one deck is not in another. The old model (SPEC-008) let every unlocked deck count every copy, so two decks could both look complete with the same cards. This spec defines where each copy is, how copies get into decks, how folders work, what a lock means now, and how existing data moves to the new model.

This spec owns the place model, folders, moves, auto-fill, locks and their storage. SPEC-007 owns the Collection page that shows them, SPEC-005 the deck views that read `DeckHolding`, SPEC-006 the editor Save, Restore and Fork that call auto-fill, SPEC-003 the import that adds and removes copies, SPEC-010 the cloud documents.

## Definitions
- **cardKey**: SPEC-001 `cardKey` (card name key, CARD-012). All printings of a name share it.
- **Copy key** (`CopyKey`): which printing a copy is, inside one `cardKey`: a **`printingId`** (a printing entry, or a missing-printing entry whose id no longer resolves, SPEC-007 COLL-014) or **`u`** (the card's unassigned copies, no known printing, SPEC-007 COLL-002). These are exactly SPEC-007's entries and tag targets.
- **owned(k, c)**: copies of copy key c of card k in the SPEC-003 collection: `byPrinting[c]` for a printing, `quantity − Σ byPrinting` for `u`. **owned(k)** = `quantity`.
- **Place**: where a copy is. Three kinds: **Not in a folder** (one), a **folder** (`Folder`), a **deck** (`UserDeck`). **Master collection** is not a place; it is every copy (COPY-001).
- **placed(P, k, c)**: copies of (k, c) in folder or deck P (stored, COPY-100, COPY-101).
- **inNone(k, c)** = owned(k, c) − Σ over folders and decks of placed(P, k, c): the copies in Not in a folder. Derived, never stored (COPY-003).
- **Excluded copy**: a copy whose copy key carries a tag with `excludeFromDecks: true` (SPEC-007 COLL-080, COLL-081; a tag on `p:<printingId>` or `u:<cardKey>`).
- **Deck-allowed place**: Not in a folder, or a folder with `useForDecks: true`.
- **free(k)**: Σ over the non-excluded copy keys c of k of copies in deck-allowed places (inNone plus deck-allowed folders). Copies in decks are never free.
- **need(D, k)**: Σ `qty` of k over D's **counted zones** Legend, Chosen Champion, Main Deck, Battlefields, Runes, Sideboard (COPY-005).
- **held(D, k)**: Σ over non-excluded c of placed(D, k, c). **heldExcluded(D, k)**: the same over excluded c.
- **missing(D, k)** = max(0, need(D, k) − held(D, k)).
- **availableTo(D, k)** = held(D, k) + free(k): the copies this deck has or could take now.
- **Complete deck**: at least one counted entry, and missing(D, k) = 0 for every counted k. An unknown card (OWN-061) can never be held, so a deck with one is not complete.
- **Locked deck**: a deck with a `DeckLock` in a readable lock store (COPY-050).
- **Decks list order**: SPEC-005 OWN-005 (`updatedAt` descending, then `createdAt` descending, then `id`).
- **Folder order**: `createdAt` ascending, then `id` (COPY-014).

## Requirements
Source key: *RJ* = RJ 2026-11-28, chat, recorded in [[ADR-0010 Deck Building, Physical Copies, Folders and Wishlist]] (§3, "RJ answers" parts 1 and 2); *rules* = [[Physical Copies Across Decks]] (`verified`, as of 2026-11-23); *Direction* = [[Direction H-707 Collection Folders]] or [[Direction H-706 Search and Deck Editor]] (ui-engineer drafts; their strings are proposals); ***default, proposed*** = the spec-writer's choice where RJ has not decided, listed in Open questions.

### A. The place model
| ID | Level | Requirement | Source |
|---|---|---|---|
| COPY-001 | MUST | **Master collection is the whole collection, not a folder.** It shows every owned copy wherever it is; its counts are SPEC-003 `quantity` and `byPrinting`, unchanged by places. Nothing can be moved "into" Master, and it can't be renamed or deleted. | *RJ* (ADR-0010 §3.1) |
| COPY-002 | MUST | **Each physical copy is in exactly one place** (Not in a folder, one folder or one deck), and places are tracked **per copy key** (per printing; unassigned copies as `u`). Owning 3 copies of a printing allows e.g. 1 in a binder, 1 in a box, 1 in no folder. | *RJ* (ADR-0010 §3.3; answers part 2 item 7, H-707 Q4) |
| COPY-003 | MUST | **Not in a folder is the remainder.** It is never stored: inNone(k, c) is computed from the collection minus every folder and deck placement. A copy added to the collection is in Not in a folder until it is moved (COPY-060). | *default, proposed* (one source of truth, no drift between the collection and a stored "none" list) |
| COPY-004 | MUST | **Invariant:** for every (k, c), Σ over folders and decks of placed(P, k, c) ≤ owned(k, c), so inNone ≥ 0. Every action in this spec keeps it; a stored state that breaks it (another device, a collection change) is repaired by COPY-065. Placements are integers ≥ 1; a 0 is removed. | design rule |
| COPY-005 | MUST | **Counted zones and need.** need(D, k) counts the Legend, Chosen Champion, Main Deck, Battlefields, Runes and Sideboard: the Chosen Champion, Main Deck and Sideboard copies of one name are one physical pool, and the Legend and each Battlefield need their own physical copy per deck. Runes are cards like any other (RJ 2026-11-24). need uses the stored quantities even when they break a rule (4 copies, 2 of one battlefield); legality stays SPEC-002's. Carries over SPEC-008 SHARE-001, SHARE-003, SHARE-006. | *rules* facts 1, 3, 6, 7, 8, 10; RJ 2026-11-24 (runes) |
| COPY-006 | MUST | **A deck holds copies per card name.** placed(D, k, c) is per copy key, but any printing of k counts for any zone entry of k in D (the deck stores `cardKey`s only, DECK-096; printings of one name are interchangeable, *rules* fact 14). held is split over the deck's zone entries in SPEC-005 OWN-022 order (Legend → Champion → Main → Battlefields → Runes → Sideboard). | *rules* fact 14; SPEC-005 OWN-022 |
| COPY-007 | MUST | **A deck never holds more of a card than it needs** after any action of this spec: a move into a deck is capped at missing(D, k) (COPY-021), and auto-fill releases the rest (COPY-032). Only a stored state written elsewhere can exceed it; then the extra copies are shown as "extra" and released at the deck's next auto-fill. | *default, proposed* |
| COPY-008 | MUST | **Every deck takes part**, read-only decks (DECK-091) and copies made by Add another copy (DECK-064), Duplicate (DECK-084) and Fork (DECK-140) included: each is its own deck holding its own copies. A **read-only** deck's stored copies count as held, but nothing moves into or out of it (it can't be written). | *RJ* (ADR-0010 §3.4); DECK-091 |

### B. Folders
| ID | Level | Requirement | Source |
|---|---|---|---|
| COPY-010 | MUST | **Create a folder** with **New folder** (Collection's location rail or menu, COPY-075). Fields: **Name** (required; trimmed; **1 to 40 characters**; any text), **Icon** (one of **Binder**, **Box**, **Top loader**; *default, proposed*: Binder preselected), and the switch **"Use cards in this folder for decks"** (**on** by default). Help line under the switch: on "Decks can take free copies from this folder.", off "Decks won't use copies in this folder. Copies already in decks stay there." (*Direction* §3, proposal). Buttons **Cancel** / **Create folder**. A new folder is empty. | *RJ* (ADR-0010 §3.2; answers part 2 item 7: H-707 Q3, Q8) |
| COPY-011 | MUST | **Duplicate names are allowed with a warning.** When the trimmed name matches another folder's name case-insensitively, an inline warning shows under the field, "You already have a folder called `<name>`." (*Direction*, proposal); Create stays enabled. An empty name keeps Create `aria-disabled` with "Give the folder a name."; a 41st character can't be typed (and a pasted longer name is cut to 40 with the polite status "Names can be up to 40 characters."). | *RJ* (H-707 Q8); wording *default, proposed* |
| COPY-012 | MUST | **One level only.** A folder holds copies, never another folder; no screen offers a parent folder or a folder inside a folder. | *RJ* (ADR-0010 §3.2) |
| COPY-013 | MUST | **Edit a folder** (the folder's ⋮: **Rename**, **Change icon**, **Use for decks** switch, **Delete folder**; *Direction* §2.3). Rename follows COPY-010 and COPY-011. **Turning "Use for decks" off moves nothing**: copies already in decks are not in the folder (COPY-002); the switch only decides whether **future** auto-fills and the free count (COPY-030, free(k)) use the folder's copies. Turning it on makes its copies free at once (decks still take them only on auto-fill or by hand). | *RJ* (ADR-0010 §3.6); *Direction* §3 |
| COPY-014 | MUST | **Folders are listed in creation order** (`createdAt` ascending, then `id`), in the rail, the location menu, the Move dialog and every list of places. | *RJ* (H-707 Q7) |
| COPY-015 | MUST | **Delete a folder:** confirmation "Delete `<name>`? Its `<n>` copies move to Not in a folder." (n = copies in it; "1 copy"; an empty folder: "Delete `<name>`?") with **Delete folder** (danger) / **Cancel**. On confirm the folder is removed and **all its copies go to Not in a folder** (no copy is deleted). Notice "Folder deleted." with **Undo** for 10 s (the H-087 notice rules, at the top, SYNC-161). **Undo** restores the folder (same id, name, icon, switch, `createdAt`) and moves back the copies that are **still in Not in a folder**, per copy key, up to what it held; copies the user moved elsewhere in the meantime stay where they are. | *RJ* (H-707 Q2: "moves its copies to Not in a folder, with Undo"); wording *Direction* §7, proposal |
| COPY-016 | MUST | **Limits:** at most **100 folders** per account; at 100, New folder is `aria-disabled` with "You can have up to 100 folders." | *default, proposed* (keeps the folders document small, COPY-106) |
| COPY-017 | MUST | **Folder states** (*Direction* §8, wording proposal): no folders yet: under the rail's fixed places a muted line "Group your copies into binders, boxes and top loaders." and **New folder**; an empty folder: "Nothing in `<name>` yet" and "Move copies here from a card's details."; a search with no match in a folder: "No cards in `<name>` match these filters." with **Clear all** and "Search Master collection". | *Direction* §8 |

### C. Moving copies
| ID | Level | Requirement | Source |
|---|---|---|---|
| COPY-020 | MUST | **A move is physical.** Moving n copies of (k, c) from place A to place B lowers A by n and raises B by n; the collection's quantities, tags and every deck's **card list** are unchanged. A move needs n ≤ the copies of (k, c) in A. | *RJ* (ADR-0010 §3.3: "Moving a copy is like physically moving it: it leaves the old folder") |
| COPY-021 | MUST | **Move dialog** (from the card dialog's **Move…** and from each "Where your copies are" row, COPY-070): title "Move `<card name>`"; **From** (fixed when opened from a row; a select of places holding copies when opened from Master); **Printing** (a select, only when the From place holds several copy keys of the card; label = the SPEC-007 printing label); **Copies** stepper 1 … (copies of that printing in From); **To**, a radio list: **Not in a folder**, every folder in folder order, then every deck that **needs** the card (missing(D, k) ≥ 1) in Decks list order, each deck row reading "`<deck name>` · needs `<m>` more". The stepper's maximum is capped by the chosen destination's missing count when it is a deck. Disabled destinations (listed, `aria-disabled`, reason as text): the From place itself; a **locked** deck ("Locked"); a **read-only** deck ("Read-only"); any deck when the chosen copy key is **excluded** ("Tagged Exclude from decks", COPY-042). Decks that don't need the card aren't listed. Primary button "Move 1 copy" / "Move `<n>` copies". | *RJ* (ADR-0010 §3.5: "The user can also move a copy into or out of a deck by hand"); *Direction* §4.1; caps and disabled rules *default, proposed* |
| COPY-022 | MUST | **Out of a deck.** Copies held by an **unlocked**, writable deck can be moved out to any other place (another deck only within its missing count). A locked deck is never a From place: its rows show "Locked" and no Move (COPY-051). | *RJ* (§3.5, §1.6) |
| COPY-023 | MUST | **Notices.** After a move: "Moved `<n>` cop(y/ies) of `<card name>` to `<place>`." (success, top, SYNC-161) with **Undo** for 10 s; moving out of a deck adds " `<deck>` is now `<m>` cop(y/ies) short." when the deck now misses copies of the card (info kind). **Undo** reverses the move only when every copy it moved is still in the destination and the source can take it back (a deck still needs it, a folder still exists); otherwise it moves what it can and says "Undid part of the move: some copies had moved again." Place names in notices: a folder's name, a deck's name, or "Not in a folder". | *Direction* §4.1 (wording, proposal); Undo rule *default, proposed* |
| COPY-024 | SHOULD | **Many at once.** Collection's **Select** mode (*Direction* §4.2): selecting a tile selects all copies of that printing **in the current place**; **Move to…** opens the Move dialog with one stepper per selected printing and one **To** list (decks are offered only when every selected printing is a card that deck needs; each deck takes at most its missing count per card, the rest stays where it was, and the notice says how many moved). Escape or Cancel leaves selection mode. Drag and drop is never the only way. | *Direction* §4.2 |
| COPY-025 | MUST | **A move changes only places.** It never changes `quantity`, `byPrinting`, tags, a deck's zones or its version history (DECK-130), and never locks or unlocks a deck. A move into or out of a deck changes that deck's fill at once (OWN-070). | design rule |
| COPY-026 | MUST | **Moves need readable data.** While the collection, tags, folders, decks or locks can't be read (COPY-104), Move, Remove from folder, Delete from collection, folder edits and auto-fill are unavailable, with the reason "Your folders couldn't be read, so copies can't be moved right now." (or the existing ownership-unavailable reason, OWN-062). | *default, proposed* |

### D. Auto-fill
| ID | Level | Requirement | Source |
|---|---|---|---|
| COPY-030 | MUST | **When auto-fill runs.** Once, for one deck, right after: (a) an editor **Save** that writes the deck (DECK-119; a Save with no change writes nothing and runs nothing, so a deck short of free copies uses COPY-080), (b) **Restore** of a version (DECK-132), (c) **New deck from a version** (fork, DECK-140), for the new deck; and *default, proposed*: (d) every other way a deck is created (Import deck save, Add to your decks, Add another copy, Duplicate, a New deck's first Save) and (e) **Fill with free copies** on Deck detail (COPY-080). It never runs for a **locked** or **read-only** deck, on a rename or description change, on a format change, or on any collection change (COPY-060). | *RJ* (ADR-0010 §3.5: "when a deck is saved or edited it takes free copies"; only "saved or edited", so (a) is RJ's); (b), (c), (d), (e) *default, proposed* (the coordinator's brief names Restore and Fork; ADR-0010 does not; Open question 6) |
| COPY-031 | MUST | **Auto-fill only takes free copies.** It takes from Not in a folder and from folders with "Use cards in this folder for decks" on, never an excluded copy (COPY-040), and **never from another deck**, locked or not. | *RJ* (§3.5; "A locked deck's copies are never taken by auto-fill") |
| COPY-032 | MUST | **Step 1, release.** For each card k the deck holds: (a) every **excluded** copy it holds goes to Not in a folder (COPY-043); (b) when held(D, k) > need(D, k) (the edit needs fewer, or the card left the deck), the extra copies go to **Not in a folder**, releasing copy keys in the reverse of the take order (COPY-033 (b): other printings first, then base printings, then `u`). | *default, proposed* (matches RJ's accepted default for a deleted deck, ADR-0010 §3.10) |
| COPY-033 | MUST | **Step 2, take.** For each counted card k of the deck with missing(D, k) > 0, in the order the cards first appear in the deck's zones (OWN-011 order, stored order within a zone), take min(missing, free) copies: (a) **places in this order:** Not in a folder, then deck-allowed folders in folder order; (b) **within a place, copy keys in this order:** `u` (no known printing), then printings whose SPEC-001 `variant.kind` is base (`base`/regular), then every other printing (foil, alt-art, Showcase, overnumbered, signature, promo, unknown), each group by `printingSortKey` (CARD-070), then missing-printing copy keys by `printingId`. Each card is filled as far as it can be before the next; there is no other priority. | *default, proposed* (keeps showcase and special printings in binders, uses loose copies first) |
| COPY-034 | MUST | **Deterministic and pure.** `autoFill(input, deckId)` returns the moves and the result without writing; the same inputs give the same moves. The caller writes the deck (with its new `copies`) and, when copies left folders, the folders record, **as one user action** (COPY-105): a failed write leaves both unchanged. | design rule |
| COPY-035 | MUST | **Save notice** (replaces DECK-119's plain "Deck saved." when copies moved; *Direction* §4.5, proposal): "Deck saved. `<n>` cop(y/ies) moved in from `<places>`." where `<places>` is one place name, "`<A>` and `<B>`", or "`<A>` and `<m>` other places" (in take order); plus, when copies were released, " `<r>` cop(y/ies) went back to Not in a folder."; when nothing moved, "Deck saved." as today. Restore and Fork use their own first sentence ("Restored version `<n>`.", "New deck created from version `<N>`.") followed by the same copy sentences. Shortfalls aren't in the notice; Deck detail shows them (COPY-079). **No Undo for auto-fill** (*default, proposed*): copies can be moved back by hand, and the version history covers card changes. | *Direction* §4.5; no-Undo *default, proposed* |
| COPY-036 | MUST | **Save with nothing to do.** When the deck already holds exactly its need and holds no excluded copy, auto-fill makes no move and writes nothing extra. | design rule |
| COPY-037 | MUST | **Auto-fill runs on the saved deck, not the draft.** The editor's draft never takes or releases copies (DECK-111); Discard changes nothing in places. | *RJ* (ADR-0010 RJ answers part 1 item 4: explicit Save); the autosave reasoning is *Direction* ([[Direction H-706 Search and Deck Editor]]), not RJ's words |
| COPY-038 | MUST | **Deck delete frees its copies** (COPY-055); deck **Duplicate** and **Fork** copy no placements: the new deck takes its own free copies (COPY-030 (c), (d)). | *RJ* (§3.10); design rule |
| COPY-039 | MUST NOT | Auto-fill never ranks or suggests decks (no "best deck to fill first"), and never moves copies between decks (ADR-0003, SHARE-052 carried over). | [[ADR-0003 Tournament Results Only]] |

### E. The exclude-from-decks tag beats the place
| ID | Level | Requirement | Source |
|---|---|---|---|
| COPY-040 | MUST | **Card first, then its folder or deck.** An excluded copy is **never free** and **never counts as held**, whatever its place: in a folder that allows decks it is still not free; in a deck it doesn't count toward that deck. Tags stay on printings (SPEC-007 COLL-019/020) and are unchanged by places; moving a copy never changes its tags. | *RJ* (ADR-0010 §3.7) |
| COPY-041 | MUST | **The user is told.** (a) Collection card dialog, on each "Where your copies are" row holding excluded copies: a muted line with an info icon "Not used for decks: tagged `<tag label>`" (the first excluding tag's label; *Direction* used "tagged Exclude from decks", proposal). (b) Folder header (a deck-allowed folder holding excluded copies): "`<n>` cop(y/ies) here aren't used for decks because of a tag." with **Show** (applies a filter to those copies). (c) Deck detail card details, when free copies are missing because of a tag: "`<e>` more `<is/are>` tagged `<tag label>`" (COPY-079). (d) Never colour alone. | *RJ* (§3.7: "the user is told why"); wording *Direction* §1, §2.3, §5, proposal |
| COPY-042 | MUST | **An excluded copy can't be moved into a deck by hand**: in the Move dialog every deck is disabled with "Tagged `<tag label>`" for that copy key (COPY-021). | *default, proposed* |
| COPY-043 | MUST | **An excluded copy already in a deck** (the tag was added or synced after the copy went in) stays in the deck until the deck's next auto-fill, which moves it to Not in a folder (COPY-032 (a)); until then it doesn't count toward the deck and the deck's card details say "`<e>` cop(y/ies) here `<is/are>` tagged `<tag label>` and `<isn't/aren't>` counted." The copy can also be moved out by hand. | *default, proposed* |
| COPY-044 | MUST | Today no screen creates or changes tags (SPEC-007 COLL-100 (e), tags and the exclude UI are deferred); COPY-040…043 apply to tags that exist in the data and to the tag UI when it returns. | SPEC-007 COLL-100 |

### F. Locks (per deck)
| ID | Level | Requirement | Source |
|---|---|---|---|
| COPY-050 | MUST | **Locks are per deck only.** A deck is locked or not; there is no lock on a card name. SPEC-008's card-name locks (SHARE-080…095), the derived deck lock (SHARE-083), "partly locked" decks and the per-name Lock / Unlock control in the card dialog (OWN-121 (b)) are **withdrawn**. | *RJ* (ADR-0010 answers part 1 item 2: "let's just keep it to the decks now since it only locks editing cards from the deck") |
| COPY-051 | MUST | **A lock freezes the deck's cards and copies.** While locked: no card can be added, removed or moved between zones (Edit cards shows "Can't edit cards. This deck is locked.", DECK-123), no version can be restored (DECK-135), no copy moves in or out **by hand** (COPY-021, COPY-022) and **auto-fill never takes from or runs on it** (COPY-030, COPY-031). **Rename, description and source stay allowed**, and so do Export, Duplicate, Fork, Version history (view) and Delete. | *RJ* (ADR-0010 §1.6: "It only locks moving cards"; answers part 1 item 2) |
| COPY-052 | MUST | **Lock in needs a complete deck** (held covers every need) that is writable and whose data is readable. The deck lock toggle (OWN-010 (g)) checks, in this order: read-only → "This deck is read-only"; locks, folders or decks unreadable → "Locked decks could not be read"; ownership unavailable → "Ownership unavailable"; no cards → "Lock in needs at least one card"; not complete → the toggle stays operable and pressing it shows **"Can't lock. Missing `<x>` cards."** ("Missing 1 card.", x = Σ missing(D, k)), and for the other reasons "Can't lock. `<reason>`." These strings are SPEC-008 SHARE-096 / SHARE-097, carried over (RJ-approved 2026-11-26). | *RJ* 2026-11-26 (SHARE-096 "Can't lock. Missing x cards"; SHARE-097 "Yes, show a notice"); complete-before-lock carried over from SHARE-020 |
| COPY-053 | MUST | **Lock in confirmation and feedback** (*default, proposed* rewording of SHARE-021 / SHARE-029, whose texts spoke of the shared pool): confirmation "Lock in '`<deck name>`'? Its cards and copies stay as they are until you unlock it." with **Lock in** / **Cancel**; after: "`<deck name>` is locked in." (RJ-approved, SHARE-029 (a)); after Unlock (no confirmation): "`<deck name>` is unlocked. You can change its cards and copies again." No Undo for either. Unlock moves no copy: the deck keeps what it holds. | *default, proposed*; "is locked in." RJ-approved 2026-11-26 |
| COPY-054 | MUST | **New decks are unlocked** (Import deck, Add to your decks, Add another copy, Duplicate, Fork, New deck); a lock says nothing about legality (an illegal deck can be locked). Carries over SHARE-026, SHARE-027; DECK-141 (b) unchanged. | SHARE-026, SHARE-027 |
| COPY-055 | MUST | **Deleting a deck frees its copies** to Not in a folder **when the 10 s Undo window ends** (DECK-082, DECK-083). During the window the copies stay with the deleted deck (they are not free), so **Undo** restores the deck with the same copies and, if it was locked, its lock (RJ 2026-11-26, "Yes, keep its locks", SHARE-024). The delete confirmation adds "Its `<n>` copies go back to Not in a folder." when n ≥ 1. | *RJ* (ADR-0010 §3.10: "deleting a deck returns its copies to no folder"); window timing *default, proposed* |
| COPY-056 | MUST | **A locked deck that loses copies** is unlocked: only through a Replace import or Undo where the user chose to take copies from it (COPY-062, the confirmation says so) or through the repair of a change from another device (COPY-065, with a notice). A locked deck is never short and stays locked. | *default, proposed* (follows RJ 2026-11-26: a change that leaves a lock short unlocks it) |
| COPY-057 | MUST | **Lock storage:** `StoredDeckLocks` `schemaVersion: 3` holds one `DeckLock { deckId, lockedAt }` per locked deck (COPY-102). `lockedAt` is stored, never shown, and orders locked decks only in the migration (COPY-091) and the repair (COPY-065). A lock whose deck no longer exists is ignored and removed at the next save. | SHARE-030, SHARE-062 carried over |

### G. Collection changes
| ID | Level | Requirement | Source |
|---|---|---|---|
| COPY-060 | MUST | **Added copies land in Not in a folder.** An import in Add mode, an Undo that restores more copies, or a sync that adds copies raises owned(k, c); the new copies are in Not in a folder (COPY-003). **No deck takes them by itself** (*default, proposed*): a short deck shows them as free (COPY-079) and the user runs **Fill with free copies** (COPY-080) or moves them by hand. An import commit that adds copies also counts matching wishlist entries down ([[Wishlist]] SPEC-016 WISH-070…072). | *default, proposed* (auto-fill is tied to saving a deck, RJ §3.5) |
| COPY-061 | MUST | **Removing copies takes Not in a folder first.** Any change that lowers owned(k, c) (Replace import, Undo of an import, Delete from collection, a future manual edit) first takes the copies from Not in a folder. Only when inNone(k, c) is too small does it take from folders and decks (COPY-062). | *RJ* (ADR-0010 §3.10: "Replace import takes copies in no folder first") |
| COPY-062 | MUST | **Then it asks which folder or deck to take the rest from.** For a Replace import or an Undo, after the IMP-050 / Undo confirmation and before anything is written, a step **"Where should the rest come from?"** lists one line per (card, printing) still to remove: "`<card name>` · `<printing label>` · `<r>` more to remove" and, for each place holding it, a row "`<place>` · has `<h>`" with a stepper 0…h; the steppers must add up to r before **Continue** is enabled. **Defaults** (*default, proposed*, prefilled): folders that don't allow decks first, then deck-allowed folders (both newest folder first), then unlocked decks (Decks list order reversed: least recently updated first), then locked decks (newest lock first). A locked deck's row says "(unlocks this deck)", and the step's last line lists the decks that will be unlocked. **Use suggested** fills every line with the defaults; **Back** returns to the confirmation; **Cancel** writes nothing. When nothing beyond Not in a folder is needed the step is skipped. | *RJ* (§3.10: "then asks which folder or deck to take the rest from"); layout, defaults *default, proposed* |
| COPY-063 | MUST | **A printing change keeps decks filled** (*default, proposed*). When one change both lowers a copy key of k and raises another copy key of k (e.g. a Replace turns 3 unassigned Ion Arc into 3 OGN-012), every deck that lost copies of k in COPY-062 then takes the same number back from the **newly added** copies of k in Not in a folder (locked decks too, so they stay locked), before anything is written. The confirmation's lines already count this, so a deck that ends with the same number of copies is not listed and not unlocked. | *default, proposed* |
| COPY-064 | MUST | **Undo of an import restores places too.** The IMP-052 snapshot also keeps the folders' placements and every deck's `copies` as they were before the commit; Undo restores them when they haven't changed since the commit; when they have, Undo restores quantities by COPY-060 / COPY-061 / COPY-062 instead. | *default, proposed* |
| COPY-065 | MUST | **Repair.** When stored data breaks COPY-004 (a sync from another device, an older build), on load the app removes placements until it holds, per (k, c), in this order: folders (newest first), unlocked decks (least recently updated first), locked decks (newest lock first). A locked deck that loses copies is **unlocked** (COPY-056). One notice (info, top): "Some copies were no longer in your collection, so they were taken out of folders and decks." plus, per unlocked deck, "'`<deck name>`' is no longer locked." The repair is written like a user change so it syncs. | *default, proposed* (follows SPEC-008 SHARE-091 / SYNC-074 pattern, RJ-approved wording style) |
| COPY-066 | MUST | **Delete from collection never takes from a deck.** A deck isn't offered as the From place for Delete from collection (COPY-073); to delete a copy in a deck the user moves it out or removes the card in the editor first. | *default, proposed* |

### H. Display
| ID | Level | Requirement | Source |
|---|---|---|---|
| COPY-070 | MUST | **"Where your copies are"** (Collection card dialog, in Master and in every place view; SPEC-007 COLL-116): heading "Where your copies are", then one row per place holding copies of **this card** (all printings): **Not in a folder** first, folders in folder order, then decks in Decks list order. Each row: the place icon (Not in a folder `inbox`, Binder, Box, Top loader, deck), its name, the count, the printing label when the card has more than one copy key there ("Main binder · OGN-012a Showcase"; one row per (place, copy key) then), and **Move** (COPY-021). Deck rows link to `/decks/:id`; a locked deck row shows a lock icon with "Locked" and no Move. Rows with excluded copies carry COPY-041 (a). | *RJ* (ADR-0010 §3.9); order *default, proposed*; *Direction* §5 |
| COPY-071 | MUST | **In a folder or in Not in a folder**, the dialog leads with "In this folder: `<n>` cop(y/ies)" ("Not in a folder: `<n>` …") for the opened printing and offers **Move…**, **Remove from folder** (folders only) and **Delete from collection**; "Where your copies are" follows. In **Master** it offers **Move…** and **Delete from collection…** (which first asks the From place, COPY-073). In **In decks** it offers **Move…** only. | *RJ* (answers part 1 item 1: both actions) |
| COPY-072 | MUST | **Remove from folder:** the chosen number of copies of this printing (a stepper when n > 1) move to Not in a folder; **the copies stay owned**. No confirmation; notice "Moved `<n>` cop(y/ies) of `<card name>` to Not in a folder." with Undo (COPY-023). | *RJ* (answers part 1 item 1: "Remove from folder (the copy stays owned, in no folder)") |
| COPY-073 | MUST | **Delete from collection:** confirmation "Delete `<n>` cop(y/ies) of `<card name>` from your collection?" with **Delete** (danger) / **Cancel**; the copies leave the collection (SPEC-003 `byPrinting[c]` and `quantity`, or `quantity` for `u`, go down by n; a card at 0 is removed) and leave the place they were in (a folder, or Not in a folder). From Master, a **From** select lists Not in a folder and folders holding the printing (never decks, COPY-066). Notice "Deleted `<n>` cop(y/ies) of `<card name>`." with Undo for 10 s (restores the quantity and the copies to the same place). This is the only manual quantity edit; COLL-050…054 stay deferred. | *RJ* (answers part 1 item 1: "Delete from collection (the copy is gone entirely)"; ADR-0010 §3.8: "the current delete stays") |
| COPY-074 | MUST | **"Decks that need this card"** (replaces SPEC-007's "Could fit in", COLL-106): every deck with missing(D, k) ≥ 1, in Decks list order, each row "`<deck name>` · needs `<m>` more" linking to the deck (a locked deck is complete, so it never appears). Empty: "None of your decks need more of this card." The Wishlist's "Needed for" list uses the same decks and counts ([[Wishlist]] SPEC-016 WISH-060, WISH-061). | *RJ* (H-707 Q5: "renamed 'Decks that need this card' with 'needs 1 more'"); empty text *default, proposed* |
| COPY-075 | MUST | **Location rail** (Collection; SPEC-007 COLL-112): **Master collection** (all copies, the default), **Not in a folder**, **In decks** (every copy any deck holds), then every folder in folder order with its icon and copy count, then **New folder**. A folder not used for decks shows a `block` glyph with the accessible suffix ", not used for decks". URL `/collection?in=none`, `in=decks`, `in=<folderId>`; no `in` = Master; an unknown id falls back to Master with the COLL-062 notice. Desktop ≥ 64rem: a left rail; below: a location button that opens a menu (tablet) or sheet (phone). The SPEC-014 Location filter (SEARCH-035) is this rail; there is no separate Location filter group. | *RJ* (H-707 Q6: "In decks" entry in the location rail); layout *Direction* §2 |
| COPY-076 | MUST | **Tiles per place** (SPEC-007 COLL-115, amending COLL-101): in Master the badge is all copies of the printing and a **deck band** replaces the lock band: "`<n>` in `<deck name>`" or "`<n>` in `<m>` decks" on the printing tile those decks hold (copies are per printing now); in a folder or Not in a folder the badge counts copies **there** and there is no band; in In decks the badge counts copies in decks and the band names the deck(s). Count line in a place: "`<n>` copies of `<m>` cards". | *Direction* §6; *default, proposed* |
| COPY-077 | MUST | **Editor search counts** (SPEC-006 DECK-125): "Own `<N>` · `<M>` in deck" plus " · `<F>` free" when F ≠ N, where **F = availableTo(D, k)** (held by this deck + free; a new deck holds 0). Examples: own 3, another deck holds 2, this deck holds 0, 1 in Not in a folder, the draft has 1 → "Own 3 · 1 in deck · 1 free"; own 3, this deck holds 2, 1 free → F = 3 = N → "Own 3 · 2 in deck"; own 3, another deck holds 3, the draft has 1 → "Own 3 · 1 in deck · 0 free". | *RJ* (H-706 Q6: "Own 3 · 1 free" when they differ) |
| COPY-078 | MUST | **Owned but not available** (SPEC-005 OWN-126): in Deck detail's card details, when owned(k) > availableTo(D, k): "`<u>` owned but not available" (u = owned(k) − availableTo(D, k) − excluded copies not in this deck) heads one row per **other deck** holding copies ("`<deck name>` · holds `<h>`", link, lock icon when locked) and one row per **folder not used for decks** holding copies ("`<folder>` · `<n>` · not used for decks"), then "`<e>` excluded from decks" when e ≥ 1. Hidden when u = 0 and e = 0. | *RJ* (answers part 2 item 8: "the other decks holding its copies"); folder rows *default, proposed* |
| COPY-079 | MUST | **Deck detail fill = held.** SPEC-005's pool for (D, k) is **held(D, k)** (OWN-020): full colour when held ≥ need, partial left to right, darkened at 0; the labels keep their words, "`<a>` of `<q>` available" ("… locked in" in a locked deck) with `a` = held (SPEC-005 OWN-033, OWN-140; *default, proposed*: no wording change). The card details add (a) "In this deck: `<held>` of `<need>`" with one line per copy key held ("2 × OGN-012"), and (b) when missing > 0, the **shortfall lines**: "`<f>` free cop(y/ies) can go in" (f = min(free(k), missing(D, k)); with **Fill with free copies**), "`<n>` more in `<folder>` (not used for decks)", "`<e>` more `<is/are>` tagged `<tag>`", "`<h>` more `<is/are>` in `<deck>`" (each place with a **Move here** action where a move is allowed: not out of a locked or read-only deck, not an excluded copy). | *RJ* (ADR-0010 §3.4 and RJ answers part 2 item 8); anything beyond that, including the "held" reading, *default, proposed*; *Direction* H-706 §7 (wording, proposal) |
| COPY-080 | MUST | **Fill with free copies** (*default, proposed*): on Deck detail of an unlocked, writable deck with at least one card where missing > 0 and free > 0, a button **Fill with free copies** (in the Missing area and in the card details) runs auto-fill for this deck (COPY-030 (e)), all cards or (from card details) that card only. Notice "Moved `<n>` cop(y/ies) into `<deck>` from `<places>`." Hidden when nothing is free. | *default, proposed* |
| COPY-081 | MUST | **Decks list.** The deck tile's copies line, fill, completion % and ownership chip use held (OWN-050, OWN-100…102): "Ready to build" = complete (holds everything); "Partly available" / "None available" as before but on held. *Default, proposed:* a short deck with free copies shows the muted line "`<f>` free copies can fill this" under the copies line. | SPEC-005 OWN-050, OWN-101, SHARE-051 carried over |

### I. Migration from the shared pool
| ID | Level | Requirement | Source |
|---|---|---|---|
| COPY-090 | MUST | **One migration, once per account.** On the first load of this build with a readable collection, decks and lock store, and no `StoredFolders` with `copiesMigratedAt` set, the app runs `migrateToCopies()`: all copies start in Not in a folder (there are no folders), then decks take copies by COPY-091 and COPY-092, then locks become per deck by COPY-093. It writes the decks that took copies, the lock store and a new `StoredFolders` with `copiesMigratedAt` = now, as one major action (SYNC-126). A device that pulls a `StoredFolders` with `copiesMigratedAt` set never migrates again. | *RJ* (§3.10: "existing locks and decks need a migration") |
| COPY-091 | MUST | **Fill order** (*default, proposed*): (1) decks **fully locked** in the v2 store (every counted name locked), by their earliest name `lockedAt`; (2) the **locked names** of partly locked decks, by each name lock's `lockedAt` (that deck takes only those names in this step); (3) every deck's remaining needs, in **Decks list order** (most recently updated first). Each step uses the COPY-033 take rules from Not in a folder. | *default, proposed* (locked copies were reserved before, so they keep them; then the top of the user's list) |
| COPY-092 | MUST | **Nothing else changes.** The migration changes no deck's zones, `name`, `updatedAt`, order or version history, no quantity and no tag. | design rule |
| COPY-093 | MUST | **Locks** (*default, proposed*): a v2 deck whose every counted name was locked becomes a `DeckLock` with `lockedAt` = its **latest** name `lockedAt` (the moment it became fully locked), if it is complete after COPY-091; otherwise it is unlocked. A partly locked deck becomes **unlocked** (its locked names were filled first in step (2)). A v1 store (one lock per deck) is read as every name locked. | *default, proposed* |
| COPY-094 | MUST | **Notice, once** (after the migration, info, top): "Your decks now hold their own copies. Cards that didn't fit stay missing." plus, when a deck lost its lock, "'`<deck name>`' is no longer locked: it didn't have all its copies." (*Direction* §8, wording proposal). | *Direction* §8 |
| COPY-095 | MUST | **Unreadable or newer data** stops the migration: nothing is written, the Decks and Collection pages show the existing unavailable states (OWN-062, COLL-071), and it runs on a later load. | design rule |
| COPY-096 | MUST | **Test data** (SPEC-013): generated test decks and guest test data are written in the new model directly (with `copies` and per-deck locks); the test-data generator is changed with this build. | [[Test Data]] |

### J. Storage and computation
| ID | Level | Requirement | Source |
|---|---|---|---|
| COPY-100 | MUST | **Folders record** `StoredFolders` (`schemaVersion: 1`): the folders and their placements (Data contract), in the signed-in account with a browser cache like the other stores (SPEC-010 SYNC-140…). Not in a folder is not stored (COPY-003). | design rule; [[Accounts and Sync]] |
| COPY-101 | MUST | **Deck copies live in the deck:** a new optional `UserDeck.copies: CopyCounts` (absent = holds nothing). A copies-only change (a move, an auto-fill release) sets `copiesUpdatedAt`, not `updatedAt`, so moving copies doesn't move the deck to the top of the list (OWN-005) and doesn't count as a card change (DECK-121); `UserDeck.schemaVersion` stays 1 (an optional field). This field is SPEC-006's data contract (change listed for a later pass). | *default, proposed* (keeps each deck's copies with the deck; one shared document for all decks' copies could pass the 1 MiB limit, COPY-106) |
| COPY-102 | MUST | **Lock store v3:** `StoredDeckLocks { schemaVersion: 3, updatedAt, locks: DeckLock[] }`, at most one per deck. A v2 record is converted by COPY-093 on migration; a newer or unreadable record is never overwritten, and then lock toggles are disabled ("Locked decks could not be read") and no deck counts as locked. | SHARE-061 carried over |
| COPY-103 | MUST | **Computed, never stored:** free, held, missing, availableTo, completeness and every count shown. Only folders, placements, deck `copies` and locks are stored. | SHARE-035 carried over |
| COPY-104 | MUST | **Unreadable folders record** (newer `schemaVersion` or damaged): never overwritten; Collection shows Master only with the banner "Your folders couldn't be read. Copies are shown in Master collection only."; moves and auto-fill are off (COPY-026); Deck detail still shows held from the decks. | design rule (same pattern as SHARE-061, COLL-071) |
| COPY-105 | MUST | **One user action, one write set.** A move writes its source and destination (folders record and/or one or two decks); an auto-fill writes the deck and, when copies left folders, the folders record; taking only from Not in a folder writes the deck alone. Which of these are SYNC-126 major actions is SPEC-010's (H-714); *default, proposed*: auto-fill with its Save, folder delete, the migration, and lock / unlock are major; single moves and folder edits use the normal debounce. | SPEC-010 SYNC-126; *default, proposed* |
| COPY-106 | MUST | **Size** (from [[Firestore Data Shape]] item sizes: `printingId` ≈ 8 B, a count 8 B, `cardKey` ≈ 19 B, a map +32 B; 1 MiB document limit, fact 3; as of 2026-11-23): a placement entry ≈ 17 B plus ≈ 51 B per card map. **Folders record:** a heavy user (3,000 printings spread over folders, 1,200 cards × 2 folders each) ≈ 1,200 × 2 × 51 + 3,000 × 1.5 × 17 ≈ 200 KB; the worst case (10,000 printings, 3,000 cards, each card in 3 folders) ≈ 3,000 × 3 × 51 + 10,000 × 3 × 17 ≈ 970 KB, so at the 100-folder cap the builder measures it and SYNC-123's 700 KB warning applies (Open question 3). **Deck copies:** a realistic deck (30 entries, about 1.2 copy keys each) ≈ 30 × 51 + 36 × 17 ≈ 2.1 KB; the largest allowed deck (150 entries × 3 copy keys) ≈ 15 KB more per deck document, still far under 1 MiB with the version history (≈ 441 KB worst case, DECK-137). These are `unverified` estimates for the builder to measure. | [[Firestore Data Shape]] facts 3, 6; sizing assumptions |
| COPY-107 | MUST | **Performance:** `computePlaces()` for 10,000 printings, 200 decks of 150 entries and 100 folders finishes in under 100 ms on a mid-range laptop; `autoFill()` for the largest deck in under 20 ms. The Decks list and every deck view read the same `PlacesView` (as SHARE-071). | SHARE-072 carried over |

## Data contract
```ts
// shapes only; no implementation
import type { CardKey, PrintingId, StoredCollection } from './collection-import';   // SPEC-003
import type { StoredTags, CollectionCatalogView } from './my-collection';           // SPEC-007
import type { UserDeck, DeckZone } from './deck-import';                            // SPEC-006

type IsoDateTime = string;               // ISO 8601 UTC
type CopyKey = PrintingId | 'u';         // 'u' = the card's unassigned copies (COLL-002)
type CopyCounts = Record<CardKey, Record<CopyKey, number>>; // integers ≥ 1; absent = 0 (COPY-004)

type FolderId = string;                  // 'f_' + 6 chars [0-9A-Za-z], unique per account (like TagId)
type FolderIcon = 'binder' | 'box' | 'topLoader';

interface Folder {
  id: FolderId;
  name: string;                          // trimmed, 1..40 chars (COPY-010); duplicates allowed (COPY-011)
  icon: FolderIcon;
  useForDecks: boolean;                  // default true (COPY-010)
  createdAt: IsoDateTime;                // folder order (COPY-014)
  updatedAt: IsoDateTime;
}

interface StoredFolders {                // COPY-100
  schemaVersion: 1;
  updatedAt: IsoDateTime;
  folders: Folder[];                     // max 100 (COPY-016)
  placements: Record<FolderId, CopyCounts>;
  copiesMigratedAt: IsoDateTime | null;  // COPY-090
}

// SPEC-006 UserDeck gains (COPY-101; listed for SPEC-006):
//   copies?: CopyCounts;               // the copies this deck holds
//   copiesUpdatedAt?: IsoDateTime;     // last copies-only change; not updatedAt

interface DeckLock { deckId: string; lockedAt: IsoDateTime; }       // COPY-057
interface StoredDeckLocks {              // COPY-102 (v3; v2 = SPEC-008 NameLock[], migrated by COPY-093)
  schemaVersion: 3;
  updatedAt: IsoDateTime;
  locks: DeckLock[];
}

type PlaceRef =
  | { kind: 'none' }
  | { kind: 'folder'; folderId: FolderId }
  | { kind: 'deck'; deckId: string };

interface CopyMove { cardKey: CardKey; copyKey: CopyKey; count: number; from: PlaceRef; to: PlaceRef; }

interface PlacesInput {
  collection: StoredCollection; tags: StoredTags; folders: StoredFolders;
  decks: UserDeck[]; locks: StoredDeckLocks; catalog: CollectionCatalogView;
}

interface CardPlaces {                   // one card, every place (COPY-070)
  cardKey: CardKey;
  owned: number;                         // SPEC-003 quantity
  rows: { place: PlaceRef; copyKey: CopyKey; count: number; excluded: boolean; excludedByTagIds: string[] }[];
  free: number;                          // free(k)
  excludedFree: number;                  // excluded copies in deck-allowed places (COPY-041)
  inFoldersNotForDecks: number;
}

interface DeckHolding {                  // one deck, one card (SPEC-005 reads this)
  deckId: string; cardKey: CardKey;
  need: number; held: number; heldExcluded: number; missing: number; extra: number;
  heldByCopyKey: Record<CopyKey, number>;
  availableTo: number;                   // held + free (COPY-077)
  otherDecks: { deckId: string; deckName: string; holds: number; locked: boolean }[]; // COPY-078
}

interface PlacesView {
  byCard: Record<CardKey, CardPlaces>;
  byDeck: Record<string, { complete: boolean; locked: boolean; cards: Record<CardKey, DeckHolding> }>;
  folderCounts: Record<FolderId, { copies: number; cards: number; excludedCopies: number }>;
  noneCounts: { copies: number; cards: number };
  inDecksCounts: { copies: number; cards: number };
}

interface AutoFillResult { moves: CopyMove[]; released: number; taken: number; shortBy: Record<CardKey, number>; }
interface RemovalLine { cardKey: CardKey; copyKey: CopyKey; toRemove: number;
  options: { place: PlaceRef; has: number; suggested: number; unlocksDeck: boolean }[]; }
interface RemovalPlan { fromNone: CopyMove[]; lines: RemovalLine[]; reKeyed: CopyMove[] /* COPY-063 */; }

declare function computePlaces(input: PlacesInput): PlacesView;                          // pure
declare function autoFill(input: PlacesInput, deckId: string, only?: CardKey): AutoFillResult; // pure, COPY-032/033
declare function planRemoval(input: PlacesInput, after: StoredCollection): RemovalPlan;  // pure, COPY-061..063
declare function repairPlacements(input: PlacesInput): { moves: CopyMove[]; unlockedDeckIds: string[] }; // COPY-065
declare function migrateToCopies(input: Omit<PlacesInput, 'folders' | 'locks'> & { locksV2: unknown }):
  { decks: UserDeck[]; locks: StoredDeckLocks; folders: StoredFolders; unlockedDeckIds: string[] }; // COPY-090..093
```

## Acceptance criteria
Example data unless an AC says otherwise: **Ion Arc** owned 4 = `byPrinting { OGN-012: 3, OGN-012a: 1 }` (OGN-012a Showcase). Folders (creation order): **Main binder** (Binder, used for decks), **Showcase** (Top loader, **not** used for decks). Decks: **Jinx Aggro** (2 Ion Arc in Main), **Kennen Tempo** (2 Ion Arc in Main), both unlocked unless stated.

1. **Master and places (COPY-001, 002, 070).** **Given** Not in a folder holds 1 OGN-012, Main binder 2 OGN-012, Showcase 1 OGN-012a, no deck holds any, **When** the user opens Ion Arc in Master, **Then** the badge counts are ×3 (OGN-012) and none on OGN-012a, and "Where your copies are" lists "Not in a folder 1", "Main binder 2", "Showcase · OGN-012a Showcase 1", each with Move.
2. **Auto-fill on Save, take order (COPY-030, 031, 033, 035).** **Given** AC 1's places, **When** the user saves Jinx Aggro in the editor, **Then** it takes 1 OGN-012 from Not in a folder and 1 from Main binder, Showcase is untouched, and the notice reads "Deck saved. 2 copies moved in from Not in a folder and Main binder."
3. **Two decks each needing 2 need 4 (COPY-002, 031, 079).** **Given** AC 2 done, **When** the user saves Kennen Tempo, **Then** it takes the last OGN-012 from Main binder (held 1 of 2), never a copy from Jinx Aggro, and its Ion Arc card details show "In this deck: 1 of 2", "1 more in Showcase (not used for decks)" and "2 more are in Jinx Aggro" with Move here on both; its tile is partly coloured (½).
4. **Locked decks are never a source (COPY-051, 021).** **Given** AC 3 and Jinx Aggro locked, **When** the user opens the Move dialog for Ion Arc from Showcase, **Then** Kennen Tempo is listed "needs 1 more" and Jinx Aggro is not listed (it needs none); and from Jinx Aggro's "Where your copies are" row there is no Move, only "Locked".
5. **Tag beats folder (COPY-040, 041, 042).** **Given** Showcase is switched to "used for decks" and OGN-012a carries the tag Collector (`excludeFromDecks: true`), **When** Kennen Tempo saves, **Then** it takes nothing from Showcase, its card details read "1 more is tagged Collector", the Showcase row in Collection reads "Not used for decks: tagged Collector", and the Move dialog shows every deck disabled with "Tagged Collector" for OGN-012a.
6. **Fewer needed after an edit (COPY-032).** **Given** Jinx Aggro (unlocked) holds 2 OGN-012, **When** the user edits it to 1 Ion Arc and saves, **Then** 1 OGN-012 goes to Not in a folder and the notice ends "1 copy went back to Not in a folder."
7. **Deck delete frees copies after the window (COPY-055).** **Given** Jinx Aggro holds 2, **When** the user deletes it, **Then** during the 10 s window the copies are not free (Kennen's free count is unchanged), Undo restores it holding 2; without Undo, at the end of the window both go to Not in a folder.
8. **Folder delete (COPY-015).** **Given** Main binder holds 2, **When** the user deletes it, **Then** the confirmation reads "Delete Main binder? Its 2 copies move to Not in a folder.", afterwards Not in a folder holds 3 OGN-012, and Undo within 10 s restores Main binder with its 2 copies.
9. **Remove vs delete (COPY-072, 073).** **Given** Main binder holds 2, **When** the user picks Remove from folder for 1, **Then** Ion Arc's quantity stays 4 and Not in a folder gains 1; **When** instead the user picks Delete from collection for 1, **Then** the confirmation reads "Delete 1 copy of Ion Arc from your collection?" and afterwards `byPrinting.OGN-012` is 2 and `quantity` 3.
10. **Replace import order (COPY-061, 062).** **Given** OGN-012: Not in a folder 1, Main binder 1, Jinx Aggro 1 (Jinx locked, holds its need of 1), **When** a Replace leaves OGN-012 at 1, **Then** 1 is taken from Not in a folder at once, and the step "Where should the rest come from?" shows "Ion Arc · OGN-012 · 1 more to remove" with "Main binder · has 1" (suggested 1) and "Jinx Aggro · has 1 (unlocks this deck)" (suggested 0); Continue writes the result only when the steppers add up to 1; Cancel writes nothing.
11. **Printing change keeps decks (COPY-063).** **Given** 3 unassigned Ion Arc all held by Jinx Aggro (locked), **When** a Replace sets Ion Arc to 3 × OGN-012, **Then** Jinx Aggro takes the 3 new OGN-012 copies, stays locked and isn't listed in any confirmation.
12. **Migration (COPY-090…094).** **Given** the pre-migration data: owned 3 Ion Arc (OGN-012), Jinx Aggro **fully locked** (v2 name locks on all its names, 2 Ion Arc), Kennen Tempo unlocked and updated after Jinx, **When** the migration runs, **Then** Jinx Aggro holds 2 and stays locked (one `DeckLock`), Kennen Tempo holds 1 of 2, no deck's `updatedAt` changes, `copiesMigratedAt` is set, and the notice "Your decks now hold their own copies. Cards that didn't fit stay missing." shows once.
13. **Partly locked migrates to unlocked (COPY-091, 093).** **Given** Kennen Tempo had only Ion Arc name-locked and owns enough for it, **When** the migration runs, **Then** Kennen Tempo takes its Ion Arc first in step (2), and is unlocked.
14. **Editor counts (COPY-077).** **Given** AC 3 (Kennen holds 1, Jinx holds 2, Showcase 1 not for decks, nothing else free), **When** Kennen's editor shows Ion Arc, **Then** it reads "Own 4 · 2 in deck · 1 free".
15. **Owned but not available (COPY-078).** **Given** AC 14, **When** Kennen's Deck detail opens Ion Arc, **Then** it reads "3 owned but not available" with rows "Jinx Aggro · holds 2" and "Showcase · 1 · not used for decks".
16. **Folder names (COPY-010, 011, 016).** **Given** a folder "Trade binder", **When** the user types "trade binder" for a new folder, **Then** "You already have a folder called trade binder." shows and Create folder stays enabled; a 41st character can't be entered; with 100 folders New folder is disabled.
17. **Import Add (COPY-060, 080).** **Given** Kennen Tempo holds 1 of 2 Ion Arc, **When** an import adds 1 OGN-012, **Then** it lands in Not in a folder, Kennen still holds 1, its Missing area offers Fill with free copies, and pressing it moves the copy in with "Moved 1 copy into Kennen Tempo from Not in a folder."
18. **Repair (COPY-065).** **Given** a pull leaves OGN-012 owned 1 while Main binder holds 1 and Jinx Aggro (locked) holds 2, **When** the app loads, **Then** Main binder loses 1 first, then Jinx Aggro loses 1 and is unlocked, and the notice lists "'Jinx Aggro' is no longer locked."
19. **Locked deck freezes copies but not its name (COPY-051).** **Given** Jinx Aggro locked, **When** the user renames it, **Then** the rename saves; **When** the user presses Edit cards, **Then** "Can't edit cards. This deck is locked." shows; and no auto-fill or Fill with free copies is offered for it.
20. **Lock needs a complete deck (COPY-052).** **Given** Kennen Tempo holds 1 of 2 Ion Arc and every other card, **When** the user presses the lock toggle, **Then** nothing is locked and "Can't lock. Missing 1 card." shows.

## Out of scope
- Drag and drop between places (a later addition, never the only way).
- Folder order by drag, folders inside folders, folder colours or sharing.
- Per-copy identity (condition, language, grading): copies of one printing are interchangeable here.
- Wishlist: [[Wishlist]] SPEC-016. It reads `free(k)`, `missing(D, k)` and `CardPlaces` from this spec (WISH-033, WISH-051, WISH-060), and it treats copies added by COPY-060 as free unless they are excluded (WISH-072). Nothing in this spec changes a wishlist count (WISH-041, WISH-075).
- Prices and trading.

## Open questions / BLOCKED
Nothing is BLOCKED on research. The *default, proposed* items below need RJ's yes or change:
1. **SPEC-006 changes** (owned by another session, H-704): DECK-119, DECK-123, DECK-125, DECK-132, DECK-140, the Data contract (`copies`, `copiesUpdatedAt`), DECK-082/083 (copies on delete). **Done:** applied in SPEC-006 0.23.
2. **SPEC-010 impacts (H-714):** new folders document, deck `copies` in the deck document, locks per deck (v3), what is a major action, write counts, migration writes, merge rules. **Done:** applied in SPEC-010 0.22 and 0.23.
3. **Folders record size at the cap** (COPY-106): ≈ 970 KB worst case near the 1 MiB limit; measure, and if needed split placements per folder.
4. Auto-fill **take order**: Not in a folder first, then folders in creation order; `u`, then base printings, then other printings (COPY-033).
5. **Released copies go to Not in a folder**, not back to the folder they came from (COPY-032).
6. Auto-fill also on **Restore and Fork** (COPY-030 (b), (c); ADR-0010 §3.5 says only "saved or edited") and on **every new deck** (Import deck, Add to your decks, Add another copy, Duplicate) (COPY-030 (d)).
7. **Fill with free copies** on Deck detail, and **no automatic fill after an import** (COPY-060, COPY-080, COPY-081 line).
8. **No Undo for auto-fill** (COPY-035).
9. **Excluded copies**: can't be moved into a deck; one already in a deck stays until the next auto-fill, which moves it out (COPY-042, COPY-043).
10. **Deck delete** frees copies when the Undo window ends, not at once (COPY-055).
11. **Replace / Undo removal step**: layout, the suggested order, locked decks last and "(unlocks this deck)" (COPY-062); the printing-change rule (COPY-063); Undo restores places (COPY-064).
12. **Repair order** after a sync and its notice (COPY-065).
13. **Migration**: fully locked decks first by lock time, then partly locked names, then Decks list order; latest name `lockedAt` becomes the deck's; partly locked → unlocked (COPY-091, COPY-093).
14. Lock confirmation and unlock texts reworded for the new model (COPY-053).
15. Folder limits (100), default icon Binder, the empty-name and long-name messages (COPY-011, COPY-016).
16. "Decks that need this card" empty text; "Where your copies are" row order; folder rows in "owned but not available" (COPY-070, COPY-074, COPY-078).
17. Copies-only changes don't move a deck to the top of Decks (`copiesUpdatedAt`, COPY-101).
18. Moves need every store readable (COPY-026).

## Changelog
- 0.1.2 (H-719 validation fixes, 2026-11-28; text only): Depends-on pins updated, Open questions 1 and 2 marked done, COPY-030 (b), (c) relabelled *default, proposed*, COPY-037 and COPY-079 sources corrected.
- 0.1.1 (H-705, 2026-11-28; text only, no requirement changed): Wishlist cross-references to [[Wishlist]] SPEC-016 in COPY-060, COPY-074 and Out of scope.
- 0.1 (H-703, 2026-11-28): first draft from ADR-0010 §3 and RJ's answers (parts 1 and 2, RJ 2026-11-28, chat): places, folders, moves, auto-fill, tag priority, per-deck locks, collection changes, display, migration, storage. Supersedes SPEC-008's pool and lock rules.
