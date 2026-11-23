---
tags: [adr, product]
status: accepted
date: 2026-11-23
supersedes_part_of: "[[ADR-0003 Tournament Results Only]] (the Your decks part), [[ADR-0005 MVP Product Defaults]] (decision 3)"
---
# ADR-0006: Two Imports, Collection and Decks

## Context
Earlier notes treated "Your decks" as tournament decks matched against the collection. That was
wrong. RJ clarified the product model on 2026-11-23.

## Decision (RJ)
### Two kinds of import
1. **Owned-card import:** card lists the user scanned or kept in another app, brought in here.
   These go into **My collection**. ([[Collection Import]])
2. **Deck import:** complete deck builds made by the community (forums, deck sites) that the user
   doesn't necessarily own. These go into **Your decks**. ([[Deck Import]])

### Your decks
- Shows the decks the user imported. **Tournament Top 8 decks are not part of this screen.**
- Every card in the deck is shown with all its information, **including ban status**, whether
  or not the user owns it.
- Ownership is shown visually on each card:
  - Owned in full (owned ≥ required): the card in **full colour**.
  - Not owned at all: the card **darkened/faded but still readable**.
  - Partly owned (owned < required): that **fraction of the card is in colour** and the rest is
    darkened. 1 of 3 → ⅓ in colour, 1 of 2 → ½, 2 of 3 → ⅔.
- Ownership is matched by card name across all printings and variants (ADR-0005), against My collection.

### My collection
- A full list of the cards the user owns.
- Users can add **their own tags** (any text) to cards.
- Sort, order and filter by name, **any card attribute**, or user tag.
- **Default order (no sort or filter):** by set (set order), then by collector number within the
  set, with **overnumbered** cards included in their numeric position after the regular numbers.

### Tournaments
- Stays its own screen: recent events with their full Top 8 and placing labels (ADR-0003).
  Its decks are not shown in Your decks unless the user adds one with "Add to Your decks".

## Consequences
- SPEC-003 Collection Import covers owned cards only. New **SPEC-006 Deck Import**.
- SPEC-005 is now **Your Decks: Ownership View** (per-card owned/required, partial colouring, ban
  status), replacing "Build Matching".
- New **SPEC-007 My Collection** (tags, sort, filter, default order).
- SPEC-004 CAT-042/043 ("Decks I can build" behaviour) no longer apply. ADR-0005 decision 3 now
  applies to the Tournaments screen only (banned decks shown with a label).
- User decks and tags are stored in the browser, like the collection (ADR-0005).

## Follow-up decisions (RJ, 2026-11-23)
- **Partial fill runs left to right:** owning 1 of 3 colours the left third of the card, and the
  rest stays darkened.
- **One-click "Add to Your decks"** on every Top 8 deck in Tournaments. It copies the list into Your
  decks as if imported, with the event and placing recorded as its source.
