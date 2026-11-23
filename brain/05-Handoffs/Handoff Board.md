---
tags: [handoffs, loop]
next_id: 13
---
# Handoff Board

The loop's state. See [[Loop Protocol]]. One row per item. Take the next ID from `next_id` and increment it.

**Status:** `todo` · `doing` · `verify` · `done` · `blocked` · `needs-RJ`  **Priority:** P0 (urgent) → P3
**Owners:** researcher · spec-writer · service-builder · ui-builder · validator · RJ

## Open
| ID | Pri | Owner | Status | Depends | From | Request | Accept | Tries | Link |
|---|---|---|---|---|---|---|---|---|---|
| H-011 | P1 | RJ | needs-RJ | — | researcher | Apply for a Riot Riftbound API key (needs a mockup + URL); ask Riot Developer Support about caching vs. hotlinking images and the metagame-data rule | Key requested; questions sent | 0 | [[Card Data & Images]] |
| H-003 | P1 | spec-writer | todo | H-001 | RJ | SPEC-001 Card Data Model: official ID + set + collector no. + variant; the card name is the copy-limit and matching key; external IDs (TCGplayer, Riftcodex); images only via the Riot API | Spec `draft`+, numbered reqs, Given/When/Then; V-009 | 0 | [[Spec Index]] |
| H-004 | P1 | spec-writer | todo | H-001 | RJ | SPEC-002 Deck Legality: the 10-point construction checklist; the ban list as versioned data (format × region × effective date); format legality (legal sets per format, dated); "legal as of <date>"; MVP = Standard Constructed | as H-003, with every rule linked to research | 0 | [[Spec Index]] |
| H-005 | P1 | spec-writer | todo | H-001 | RJ | SPEC-003 Collection Import: Riot-style sectioned text, plain qty + name, Piltover deck code, TTS tokens, CSV with a card-name column | as H-003 | 0 | [[Spec Index]] |
| H-006 | P1 | spec-writer | todo | H-001 | RJ | SPEC-004 Tournament Deck Catalog per ADR-0003: events and their full published Top 8 decklists, each labelled with its placing (1st–8th), plus event, date, and region; no stats or scores; decklists get `format` + `legal_as_of` (add both to the Decklist template); the 8 European Championship lists are historical | as H-003; V-010 | 0 | [[Spec Index]] |
| H-007 | P2 | spec-writer | todo | H-003, H-004, H-006 | RJ | SPEC-005 Build Matching (sort by completion %, then event recency) | as H-003; V-010 | 0 | [[Spec Index]] |
| H-008 | P1 | service-builder | todo | H-002, H-003 | RJ | Scaffold the TypeScript API in `services/`, host-neutral per ADR-0001, and the card data pipeline (prototype on Riftcodex until the Riot API key arrives; Radiance is missing there) | V-003, V-008, V-011 activated and passing | 0 | [[API Contracts]] |
| H-009 | P1 | ui-builder | todo | H-002 | RJ | Scaffold the Angular app in `web/` (standalone + signals) with routing for the 5 MVP screens (placeholders; see [[UI Index]]) | V-008 passes; screen review gate filed | 0 | [[UI Index]] |
| H-012 | P3 | RJ | blocked | MVP complete | RJ | Choose hosting: Firebase vs. AWS, whichever is cheaper | ADR-0004 accepted | 0 | [[ADR-0004 Hosting (Deferred)]] |

## Done
| ID | Owner | Request | Result |
|---|---|---|---|
| H-002 | RJ | Tech stack | Accepted: Angular + TypeScript API, local-first; hosting deferred ([[ADR-0001 Tech Stack]]) |
| H-010 | RJ | Metagame-data policy | Decided: tournament results only, no stats ([[ADR-0003 Tournament Results Only]]) |
| H-001 | researcher | First research pass | PASS 2026-11-23: 9 topic notes + 8 European Championship Top 8 decklists ([[Validation Runs]]) |
