---
tags: [moc, specs]
---
# Spec Index

Owner: **spec-writer**. Status: `draft` · `review` · `approved` · `blocked` · `superseded`

| ID | Spec | Version | Status | Depends on research |
|---|---|---|---|---|
| SPEC-001 | [[Card Data Model]] | — | todo | [[Card Data & Images]], [[Sets]] |
| SPEC-002 | [[Deck Legality]] | — | todo | [[Deck Construction Rules]], [[Ban List]], [[Formats]] |
| SPEC-003 | [[Collection Import]] | — | todo | [[Collection Import Formats]] |
| SPEC-004 | [[Tournament Deck Catalog]] | — | todo | [[Tournament Results]], [[ADR-0003 Tournament Results Only]] |
| SPEC-005 | [[Build Matching]] | — | todo | SPEC-001, SPEC-002, SPEC-004 |

## Cross-cutting constraints (apply to every spec)
- **Stack:** an Angular front end and a TypeScript (Node) API ([[ADR-0001 Tech Stack]]).
- **Local-first:** build and run everything locally until the MVP is done.
- **Hosting:** Firebase or AWS, whichever is cheaper, decided after the MVP ([[ADR-0004 Hosting (Deferred)]]).
  Specs must not depend on host-specific features. Storage, config, and file access stay behind interfaces.
- **No metagame statistics:** tournament results only, the full Top 8 with placing labels ([[ADR-0003 Tournament Results Only]]).
