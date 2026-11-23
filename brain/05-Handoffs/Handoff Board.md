---
tags: [handoffs, loop]
next_id: 10
---
# Handoff Board

The loop's state. See [[Loop Protocol]]. One row per item. Take the next ID from `next_id` and increment it.

**Status:** `todo` · `doing` · `verify` · `done` · `blocked` · `needs-RJ`  **Priority:** P0 (urgent) → P3
**Owners:** researcher · spec-writer · service-builder · ui-builder · validator · RJ

## Open
| ID | Pri | Owner | Status | Depends | From | Request | Accept | Tries | Link |
|---|---|---|---|---|---|---|---|---|---|
| H-001 | P0 | researcher | doing | — | RJ | First research pass over the whole [[Research Index]] queue | No queue item still `todo`; V-009 passes | 0 | [[Research Index]] |
| H-002 | P1 | RJ | needs-RJ | — | RJ | Accept or change the tech stack | ADR-0001 status `accepted` | 0 | [[ADR-0001 Tech Stack]] |
| H-003 | P1 | spec-writer | todo | H-001 | RJ | SPEC-001 Card Data Model | Spec `draft`+, numbered reqs, Given/When/Then; V-009 | 0 | [[Spec Index]] |
| H-004 | P1 | spec-writer | todo | H-001 | RJ | SPEC-002 Deck Legality (rules + current ban list) | as H-003, with every rule linked to research | 0 | [[Spec Index]] |
| H-005 | P1 | spec-writer | todo | H-001 | RJ | SPEC-003 Collection Import | as H-003 | 0 | [[Spec Index]] |
| H-006 | P2 | spec-writer | todo | H-001 | RJ | SPEC-004 Meta Deck Catalog & Ranking (show the scoring formula) | as H-003 | 0 | [[Spec Index]] |
| H-007 | P2 | spec-writer | todo | H-003, H-004, H-006 | RJ | SPEC-005 Build Matching | as H-003 | 0 | [[Spec Index]] |
| H-008 | P1 | service-builder | todo | H-002, H-003 | RJ | Scaffold `services/` and the card data pipeline | V-003 + V-008 activated and passing | 0 | [[API Contracts]] |
| H-009 | P1 | ui-builder | todo | H-002 | RJ | Scaffold `web/` with routing for the 4 MVP screens (placeholders) | V-008 passes; screen review gate filed | 0 | [[UI Index]] |

## Done
| ID | Owner | Request | Result |
|---|---|---|---|
