---
tags: [moc, specs]
---
# Spec Index

> Every spec starts with a **Summary** block. Read that first. Changelogs live in `Archive/Spec-Changelogs/`.

Owner: **spec-writer**. Status: `draft` · `review` · `approved` · `blocked` · `superseded`

| ID | Spec | Version | Status | Depends on research |
|---|---|---|---|---|
| SPEC-001 | [[Card Data Model]] | 0.3 | draft | [[Card Data & Images]], [[Sets]] |
| SPEC-002 | [[Deck Legality]] | 0.3 | draft | [[Deck Construction Rules]], [[Ban List]], [[Formats]] |
| SPEC-003 | [[Collection Import]] | 0.5 | draft | [[Collection Import Formats]] |
| SPEC-004 | [[Tournament Deck Catalog]] | 0.4 | draft | [[Tournament Results]], [[ADR-0003 Tournament Results Only]] |
| SPEC-005 | [[Your Decks Ownership View]] | 0.3 | draft | SPEC-001, SPEC-002, SPEC-004, SPEC-006, SPEC-007, SPEC-008, SPEC-009, [[Physical Copies Across Decks]] |
| SPEC-006 | [[Deck Import]] | 0.6 | draft | [[Collection Import Formats]], SPEC-003 |
| SPEC-007 | [[My Collection]] | 0.4 | draft | SPEC-001, SPEC-003, [[Physical Copies Across Decks]] |
| SPEC-008 | [[Shared Cards and Lock-in]] | 0.1 | draft | [[Physical Copies Across Decks]], [[Deck Construction Rules]], SPEC-005, SPEC-006, SPEC-007 |
| SPEC-009 | [[Runes Assumed Owned]] | 0.1 | draft | [[Physical Copies Across Decks]], [[Deck Construction Rules]] |

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
- **Product model:** two imports, owned cards → Collection and community decks → Decks ([[ADR-0006 Two Imports - Collection and Decks]]).
- **Shared physical cards:** decks compete for one per-name pool; locked-in decks hold their copies; runes are assumed owned (SPEC-008, SPEC-009).
- **No metagame statistics:** tournament results only, the full Top 8 with placing labels ([[ADR-0003 Tournament Results Only]]).
