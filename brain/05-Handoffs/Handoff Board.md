---
tags: [handoffs, loop]
next_id: 12
---
# Handoff Board

The loop's state. See [[Loop Protocol]]. One row per item. Take the next ID from `next_id` and increment it.

**Status:** `todo` · `doing` · `verify` · `done` · `blocked` · `needs-RJ`  **Priority:** P0 (urgent) → P3
**Owners:** researcher · spec-writer · service-builder · ui-builder · validator · RJ

## Open
| ID | Pri | Owner | Status | Depends | From | Request | Accept | Tries | Link |
|---|---|---|---|---|---|---|---|---|---|
| H-001 | researcher | First research pass | PASS 2026-11-23: 9 topic notes + 8 European Championship Top 8 decklists ([[Validation Runs]]) |
| H-002 | P1 | RJ | needs-RJ | — | RJ | Accept or change the tech stack | ADR-0001 status `accepted` | 0 | [[ADR-0001 Tech Stack]] |
| H-010 | P0 | RJ | needs-RJ | — | researcher | Riot's developer policy forbids publishing or storing "metagame-defining data" (play rates, win rates, matchups). Decide how the meta deck ranking should work within that. | Decision recorded as an ADR | 0 | [[Card Data & Images]] |
| H-011 | P1 | RJ | needs-RJ | — | researcher | Apply for a Riot Riftbound API key (needs a mockup + URL); ask Riot Developer Support about caching vs. hotlinking images and the metagame-data rule | Key requested; questions sent | 0 | [[Card Data & Images]] |
| H-003 | P1 | spec-writer | todo | H-001 | RJ | SPEC-001 Card Data Model: official ID + set + collector no. + variant; the card name is the copy-limit and matching key; external IDs (TCGplayer, Riftcodex); images only via the Riot API | Spec `draft`+, numbered reqs, Given/When/Then; V-009 | 0 | [[Spec Index]] |
| H-004 | P1 | spec-writer | todo | H-001 | RJ | SPEC-002 Deck Legality: the 10-point construction checklist; the ban list as versioned data (format × region × effective date); format legality (legal sets per format, dated); "legal as of <date>"; MVP = Standard Constructed | as H-003, with every rule linked to research | 0 | [[Spec Index]] |
| H-005 | P1 | spec-writer | todo | H-001 | RJ | SPEC-003 Collection Import: Riot-style sectioned text, plain qty + name, Piltover deck code, TTS tokens, CSV with a card-name column | as H-003 | 0 | [[Spec Index]] |
| H-006 | P2 | spec-writer | blocked | H-010 | RJ | SPEC-004 Meta Deck Catalog & Ranking (show the scoring formula); decklists get `format` + `legal_as_of` fields (also add them to the Decklist template); all 8 European Championship Top 8 lists are now historical | as H-003 | 0 | [[Spec Index]] |
| H-007 | P2 | spec-writer | todo | H-003, H-004, H-006 | RJ | SPEC-005 Build Matching | as H-003 | 0 | [[Spec Index]] |
| H-008 | P1 | service-builder | todo | H-002, H-003 | RJ | Scaffold `services/` and the card data pipeline (prototype on Riftcodex until the Riot API key arrives; Radiance is missing there) | V-003 + V-008 activated and passing | 0 | [[API Contracts]] |
| H-009 | P1 | ui-builder | todo | H-002 | RJ | Scaffold `web/` with routing for the 4 MVP screens (placeholders) | V-008 passes; screen review gate filed | 0 | [[UI Index]] |

## Done
| ID | Owner | Request | Result |
|---|---|---|---|
