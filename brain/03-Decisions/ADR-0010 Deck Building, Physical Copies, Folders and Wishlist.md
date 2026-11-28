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

## RJ answers to the direction drafts (2026-11-28, chat, H-709 part 1)
From the open questions in [[Direction H-706 Search and Deck Editor]], [[Direction H-707 Collection Folders]]
and [[Direction H-708 Wishlist]]:
1. **Folder delete (H-707 Q1):** the card dialog offers **both** "Remove from folder" (the copy stays
   owned, in no folder) **and** "Delete from collection" (the copy is gone entirely).
2. **Locks (H-706 Q8):** **locks are per deck only** ("let's just keep it to the decks now since it only
   locks editing cards from the deck"). A locked deck's cards can't be added, removed or moved; rename
   and description stay allowed (§1.6). This replaces SPEC-008's per-card-name locks (SHARE-080…095).
3. **Five phone tabs (H-708 Q1):** accepted the recommendation: Tournaments is labelled **"Events"** in
   the phone bottom bar only. Order Decks · Collection · Wishlist · Events · Account.
4. **Editor saving (H-706 Q10):** **explicit Save**, no autosave. **Leaving while editing shows a
   warning** (unsaved changes).
5. **Which copies satisfy a wishlist entry (H-708 Q2):** accepted the recommendation: entries added from
   a deck accept **any printing**; an entry where the user picked a variant counts **only that printing**.

## RJ answers, part 2 (2026-11-28, chat, closes H-709)
6. **Search and deck editor:** "Yes to all decks recommendations": H-706 Q1 (name search plus an "Include
   rules text" toggle), Q3 (Collection search stays owned-only), Q4 ("New deck" as a title-row button on
   phones), Q6 ("Own 3 · 1 free" when they differ), Q7 (a new deck's name follows its Legend), Q9 (no
   "Reset to the tournament list" for now), Q11 (each deck stores one main format, Standard by default,
   other formats as status chips).
7. **Folders:** "Folder recs are good": H-707 Q2 (deleting a folder moves its copies to Not in a folder,
   with Undo), Q3 ("Use cards in this folder for decks" on by default), Q4 (copies tracked per printing in
   folders and decks), Q5 ("Could fit in" kept, renamed "Decks that need this card" with "needs 1 more"),
   Q6 ("In decks" entry in the location rail), Q7 (creation order), Q8 (names up to 40 characters,
   duplicates allowed with a warning).
8. **Wishlist:** H-708 Q3 (count goes down: "Want 2"), Q4 (deck-linked counts don't follow later deck edits;
   the "Needed for" chip stays live), Q5 (only **free** copies satisfy deck-linked entries), Q6 (desktop
   sidebar on the Wishlist only for now), Q7 (`bookmark` icon). **Addition to Q5 (RJ):** in a deck, the
   card details for a card show **the other decks holding its copies**: "owned but not available".
9. **New: deck version history (RJ):** "a versioning style like git when the user edits cards (removed
   card, changed a cards count, added a new card). Every save is like a commit and the user can go back
   to any point." Each Save of a deck's cards records a version with what changed; the user can return the
   deck to any earlier version. (Spec: H-702.)

H-706 Q2 and Q5 are rules questions for the spec-writer.

## RJ answers, part 3: deck version history (2026-11-28, chat)
1. **Restoring adds a new version on top** (git-revert style); the user can **view each version**.
2. **A rotating window: only the last 15 versions are kept.**
3. **Only card edits make a version** ("Anything outside of the cards editing isn't a new version").
4. **A locked deck can't be restored**: "You have to unlock a deck to edit it at all" (cards).
5. **The imported or added list is version 1.**
6. **Don't store the whole deck per version:** "replicate what git does to save memory", i.e. store changes
   (deltas), not full copies. Recommended shape (Claude, for the spec-writer): the current deck stays in full and
   each older version is a reverse delta to the next one, so dropping the oldest of the 15 is trivial.

## RJ answers, part 4 (2026-11-28, chat)
1. **H-715: "Yes to all"**: version 1 labels "Created" / "Duplicated from <name>" / "Before version history"
   (DECK-136); a format change makes no version (DECK-134); Clear all keeps the typed search text (SEARCH-050);
   the empty Decks page also shows New deck (OWN-123).
2. **New: start a new deck from any version (fork).** RJ: "allow the user to create a new deck from any version
   on the deck. The deck doesn't have to be on that version. Like forking from a specific commit in git."
   The original deck is unchanged. (Spec: H-716.)
3. **Cost filter (SEARCH-026):** RJ: "Cost means the energy and power costs." The search filters on both;
   which payload fields carry them still waits on H-020.
