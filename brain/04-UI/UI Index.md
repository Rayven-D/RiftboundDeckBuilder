---
tags: [moc, ui]
---
# UI Index

Owner: **builder** with RJ. Record agreed screens and design decisions here.

## Screens
| Screen | Status | Notes |
|---|---|---|
| Import (owned cards / deck) | scaffolded | paste / CSV upload, parse errors per line |
| My collection | scaffolded | owned cards; user tags; sort/filter by name, attributes, tags; default set → collector number (overnumbered included) |
| Your decks | scaffolded | imported community decks; per-card ownership colouring (full / darkened / partial fraction), ban status on every card ([[ADR-0006 Two Imports - Collection and Decks]]) |
| Tournaments | scaffolded | recent events, with winning decks and their lists |
| Deck detail | scaffolded | owned/missing per card, missing list, export |

## Design decisions
See [[Design Direction]]: candidate visual directions awaiting RJ's choice, and the decisions taken in the H-009 scaffold.

Routes: `/import`, `/collection`, `/decks` (default), `/decks/:id`, `/tournaments`.

## Engine
Decks screens read the pure ownership engine in `web/src/app/core/decks/` (H-059): shared pool, lock
checks, shortfalls, `computeDeckOwnership()` and `summarizeDeck()`. Types and notes:
[[API Contracts]] → "Browser-side shared types". Components only render its output.
