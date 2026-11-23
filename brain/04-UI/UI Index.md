---
tags: [moc, ui]
---
# UI Index

Owner: **ui-builder** with RJ. Record agreed screens and design decisions here.

## Screens
| Screen | Status | Notes |
|---|---|---|
| Import collection | scaffolded | paste / CSV upload, parse errors per line |
| My collection | scaffolded | card image grid, filters (domain, type, set, rarity) |
| Decks I can build | scaffolded | sorted by completion %, then event recency; placing label (ADR-0003) |
| Tournaments | scaffolded | recent events, with winning decks and their lists |
| Deck detail | scaffolded | owned/missing per card, missing list, export |

## Design decisions
See [[Design Direction]]: candidate visual directions awaiting RJ's choice, and the decisions taken in the H-009 scaffold.

Routes: `/import`, `/collection`, `/decks` (default), `/decks/:id`, `/tournaments`.
