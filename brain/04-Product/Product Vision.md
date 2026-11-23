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
1. **Import** your physical collection (paste a list, upload a CSV, or import from other tools).
2. **Match** it against the Top 8 decks from recent tournaments.
3. **See** which of those decks you can build, sorted by completion % then how recent the event is, with official card images.
4. **Drill in** to a deck: each card marked owned or missing, with a missing-cards shopping list.

## MVP scope
- [ ] Card database with official images
- [ ] Collection import (text list + CSV)
- [ ] Tournament deck catalog: recent events and their winning decklists (no meta stats, see [[ADR-0003 Tournament Results Only]])
- [ ] Legality check against the current rules and ban list
- [ ] "Decks I can build" view + deck detail

## Later
- Hosting on Firebase or AWS, whichever is cheaper (deferred: [[ADR-0004 Hosting (Deferred)]])
- Accounts & saved collections · near-miss suggestions ("buy these 3 cards to unlock 4 decks")
- Card-substitution suggestions · price data · collection scanning by camera · alerts when the meta shifts

## Decided
See [[ADR-0005 MVP Product Defaults]]: browser-only storage, variants count as the same card, banned decks shown with a label, Riot data only.

## Open questions
- Which regions and events do we include? (Decided: the full Top 8, with placing labels.)
