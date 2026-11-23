---
tags: [moc, specs]
---
# Spec Index

Owner: **spec-writer**. Status: `draft` · `review` · `approved` · `blocked` · `superseded`

| ID | Spec | Version | Status | Depends on research |
|---|---|---|---|---|
| SPEC-001 | [[Card Data Model]] | 0.1 | draft | [[Card Data & Images]], [[Sets]] |
| SPEC-002 | [[Deck Legality]] | 0.1 | draft | [[Deck Construction Rules]], [[Ban List]], [[Formats]] |
| SPEC-003 | [[Collection Import]] | 0.1 | draft | [[Collection Import Formats]] |
| SPEC-004 | [[Tournament Deck Catalog]] | 0.1 | draft | [[Tournament Results]], [[ADR-0003 Tournament Results Only]] |
| SPEC-005 | [[Your Decks Ownership View]] | — | todo | SPEC-001, SPEC-002, SPEC-006, SPEC-007 |
| SPEC-006 | [[Deck Import]] | — | todo | [[Collection Import Formats]], SPEC-003 |
| SPEC-007 | [[My Collection]] | — | todo | SPEC-001, SPEC-003 |

## Cross-cutting constraints (apply to every spec)
- **Stack:** an Angular front end and a TypeScript (Node) API ([[ADR-0001 Tech Stack]]).
- **Local-first:** build and run everything locally until the MVP is done.
- **Hosting:** Firebase or AWS, whichever is cheaper, decided after the MVP ([[ADR-0004 Hosting (Deferred)]]).
  Specs must not depend on host-specific features. Storage, config, and file access stay behind interfaces.
- **Riot API compliance** ([[Riot Developer Rules]]):
  - Card data and images come only from the Riot API (`riftbound-content-v1`).
  - `RIOT_API_KEY` lives server-side in `.env` and never reaches the Angular app.
  - Development key for local prototyping only; production key before anyone else can use the site.
  - The app is completely free (no paid tiers or exclusive access).
  - No Riot/Riftbound logos and no lookalike of Riot branding.
  - Show the Legal Jibber Jabber notice.
- **Product model:** two imports, owned cards → My collection and community decks → Your decks ([[ADR-0006 Two Imports - Collection and Decks]]).
- **No metagame statistics:** tournament results only, the full Top 8 with placing labels ([[ADR-0003 Tournament Results Only]]).
