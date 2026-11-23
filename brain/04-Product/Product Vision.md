---
tags: [product]
status: draft
---
# Product Vision

## Problem
Riftbound players own a physical collection but can't easily tell which competitive decks
they can actually build from it, or how few cards they'd need to buy to get there.

## Constraints
- Free for everyone, with no paid tiers or exclusive access ([[Riot Developer Rules]]).
- Our own branding: no Riot or Riftbound logos.

## Core loop
1. **Import your cards:** bring in the cards you own from another app into **My collection**, then tag, sort and filter them.
2. **Import decks:** bring in community decks from forums and deck sites into **Your decks**.
3. **See what you own:** each deck shows every card with its info and ban status. Owned cards are in full colour, missing ones are darkened, and partly owned ones are partly coloured (1 of 3 → ⅓).
4. **Browse tournaments:** recent events and their Top 8 decks with placings.

See [[ADR-0006 Two Imports - Collection and Decks]].

## MVP scope
- [ ] Card database with official images (Riot API)
- [ ] Owned-card import into My collection
- [ ] Deck import into Your decks
- [ ] Your decks view: ownership colouring, ban status per card
- [ ] My collection: tags, sort/filter, default set + collector-number order
- [ ] Legality and ban checks (official rules)
- [ ] Tournaments: recent events, Top 8 with placings

## Later
- Hosting on Firebase or AWS, whichever is cheaper (deferred: [[ADR-0004 Hosting (Deferred)]])
- Accounts & saved collections · near-miss suggestions ("buy these 3 cards to unlock 4 decks")
- Card-substitution suggestions · price data · collection scanning by camera · alerts when the meta shifts

## Decided
See [[ADR-0005 MVP Product Defaults]]: browser-only storage, variants count as the same card, banned decks shown with a label, Riot data only.

## Open questions
- Which regions and events do we include? (Decided: the full Top 8, with placing labels.)
