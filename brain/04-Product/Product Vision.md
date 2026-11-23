---
tags: [product]
status: draft
---
# Product Vision

## Problem
Riftbound players own a physical collection but can't easily tell which competitive decks
they can actually build from it, or how few cards they'd need to buy to get there.

## Core loop
1. **Import** your physical collection (paste a list, upload a CSV, or import from other tools).
2. **Match** it against the winning decks from recent tournaments.
3. **See** which of those decks you can build, sorted by completion % then how recent the event is, with official card images.
4. **Drill in** to a deck: each card marked owned or missing, with a missing-cards shopping list.

## MVP scope
- [ ] Card database with official images
- [ ] Collection import (text list + CSV)
- [ ] Tournament deck catalog: recent events and their winning decklists (no meta stats, see [[ADR-0003 Tournament Results Only]])
- [ ] Legality check against the current rules and ban list
- [ ] "Decks I can build" view + deck detail

## Later
- Accounts & saved collections · near-miss suggestions ("buy these 3 cards to unlock 4 decks")
- Card-substitution suggestions · price data · collection scanning by camera · alerts when the meta shifts

## Open questions
- Do we treat printings and variants (foil, alt-art) as the same card for matching? (likely yes, but confirm)
- Do we need accounts for MVP, or is local-only (browser storage) enough?
- Which regions and events do we include? Winners only, or all published top placings?
