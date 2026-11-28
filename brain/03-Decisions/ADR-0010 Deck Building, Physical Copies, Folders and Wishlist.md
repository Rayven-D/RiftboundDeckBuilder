---
tags: [adr, product]
status: accepted
date: 2026-11-28
supersedes_part_of: "[[ADR-0006 Two Imports - Collection and Decks]] (decks only from imports; one shared pool across decks), [[Shared Cards and Lock-in]] SPEC-008 (shared pool; what a lock means), [[Deck Import]] DECK-080 deferral"
board: H-700, H-701, H-702, H-703, H-704, H-705, H-706, H-707, H-708
---
# ADR-0010: Deck Building, Physical Copies, Folders and Wishlist

## Context
Until now decks came only from Deck Import or "Add to your decks" on Tournaments, and only a
deck's name, description and source could be changed (DECK-080 card editor deferred by RJ on
2026-11-25). All decks counted against **one shared pool** of the user's cards, and lock-in
reserved copies for a deck (SPEC-008). RJ talked through deck building and a physical-collection
model in chat on 2026-11-28. Every decision below is RJ's, given in that chat, unless marked
"default RJ accepted" (Claude proposed it, RJ answered "Defaults to all").

## Decision (RJ, 2026-11-28, chat)

### 1. Deck building
1. Users can **add and remove cards on any deck**: imported, tournament copies, and decks they
   build themselves. A new **"New deck"** path builds a deck from scratch (revives DECK-080).
2. Decks are **validated live**; users can plan decks that are **legal or not legal**, and see
   legality in **multiple formats**: "any formats you can find. 2v2 is also very popular".
3. Users can add **any card**, owned or not, from the whole catalog.
4. **While searching for cards to add, every result is in full colour** so it is easy to spot.
   Back on Deck detail the normal ownership fill (progress) returns.
5. An edited **tournament copy keeps its event source** and gets an **"Edited"** label; "In your
   decks" still points to it.
6. **Lock-in stays, and only locks moving cards:** a locked deck's cards can't be added, removed
   or moved. **Rename and description (and source) changes stay allowed** on a locked deck.
   (RJ: "Allow rename and description changes on lock. It only locks moving cards.")

### 2. Card search (shared)
1. Search by **card name, rarity, domain, type, cost, might, "just about anything"**.
2. The same search goes into the deck editor **and Collection** (and the Wishlist).
3. Which fields exist depends on the live Riot data (H-020); until then it is built and tested
   on the fixture cards.

### 3. Physical copies, folders and decks
1. **Master collection** is the user's **entire catalog**, not a folder.
2. Users create **folders**: any name, any number of cards, an icon chosen from **binder, box or
   top loader** (showcase). **One level only**, no folders inside folders.
3. **Each physical copy is in at most one place.** Owning 3 copies of a printing allows e.g. 1 in
   a binder, 1 in a box, 1 in no folder. **Moving a copy is like physically moving it:** it leaves
   the old folder.
4. **Decks hold physical copies like folders** ("Treat decks like the user is physically making
   those decks"). A copy in one deck isn't in any other deck or folder. Two decks that each need 2
   Ion Arc need 4 copies. This **replaces the shared pool** of SPEC-008.
5. **Copies get into decks automatically** (RJ chose option A): when a deck is saved or edited it
   takes free copies from copies in no folder and from folders that allow decks. The user can
   also move a copy into or out of a deck by hand.
6. **Each folder has an option to allow or disallow its cards in decks.**
7. **Tags stay as they are** on printings, for search, and the existing **"exclude from decks"**
   tag option stays. **Priority: the card first, then its folder or deck.** A card tagged "exclude
   from decks" stays excluded even in a folder that allows decks, and **the user is told** why.
8. **Deleting:** the current delete stays (including Replace import). Deleting a copy from a
   card's **details dialog is folder-specific**: it removes that copy from its folder. A copy in
   no folder is removed from the Master collection.
9. Opening a card from the **Master collection shows which folders and decks hold its copies**.
10. Defaults RJ accepted: **deleting a deck returns its copies** to no folder; **Replace import
    takes copies in no folder first**, then asks which folder or deck to take the rest from;
    existing locks and decks need a **migration** to the new model.

### 4. Wishlist (new tab)
1. A **separate tab**: lists of cards the user is looking for, with **full-colour** images, card
   names and the number of copies of each.
2. **Any card, any amount**, and **variants are told apart**. An entry is the card's **default
   printing by default**; the user can pick the variant they want.
3. Clicking a card opens the **card details: a dialog on phones, a sidebar on desktop**.
4. **Deck detail: one click adds the deck's missing cards** to the wishlist. Missing counts **sum
   across decks**, since each deck needs its own copies.
5. A wishlist card needed by one of the user's decks shows a **chip or small subtext** naming
   the deck.
6. When the user gets a wishlisted card (it enters the collection), **the wishlist updates**.

## Consequences
- **SPEC-006 Deck Import:** DECK-080 comes back as the deck editor; new-deck path
  (`sourceFormat: 'manual'` already exists); tournament "Edited" label. H-702.
- **SPEC-008 Shared Cards and Lock-in:** reworked or superseded by a physical-copies spec: copies
  assigned to folders and decks, auto-fill, manual moves, lock = cards frozen, migration. H-703.
- **SPEC-005, SPEC-007, SPEC-003, SPEC-010:** ownership fill counts the copies a deck holds;
  Collection gets folders, locations and the shared search; Replace import order; Firestore data
  shape and sync for folders, assignments and the wishlist. H-701, H-703.
- **SPEC-002 Deck Legality:** formats beyond Standard, after research (H-700, H-704).
- **New specs:** card search and filters (H-701), folders and physical copies (H-703), wishlist
  (H-705). The spec-writer assigns the numbers.
- **UI:** briefs for search + editor (H-706), folders (H-707), wishlist + desktop card sidebar +
  a fifth phone tab (H-708). The desktop sidebar touches the card dialog that H-698 is cleaning up.
- **Suggested order (Claude, RJ did not object):** search → deck editor → physical copies and
  folders → wishlist; formats research in parallel.
- The spec-writer files the `builder` items after each spec passes.
