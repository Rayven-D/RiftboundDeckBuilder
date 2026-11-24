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
| SPEC-003 | [[Collection Import]] | 0.6 | draft | [[Collection Import Formats]], SPEC-001, SPEC-008 (IMP-050 warning) |
| SPEC-004 | [[Tournament Deck Catalog]] | 0.4 | draft | [[Tournament Results]], [[ADR-0003 Tournament Results Only]] |
| SPEC-005 | [[Your Decks Ownership View]] | 0.4 | draft | SPEC-001 0.3, SPEC-002 0.3, SPEC-004 0.4, SPEC-006 0.6, SPEC-007 0.5, SPEC-008 0.2, SPEC-009 0.2, [[Physical Copies Across Decks]] |
| SPEC-006 | [[Deck Import]] | 0.6 | draft | [[Collection Import Formats]], SPEC-001 0.3, SPEC-002 0.3, SPEC-003 0.6, SPEC-004 0.4, SPEC-008 0.2 |
| SPEC-007 | [[My Collection]] | 0.5 | draft | SPEC-001 0.3, SPEC-002 0.3, SPEC-003 0.6, SPEC-008 0.2, SPEC-009 0.2, [[Physical Copies Across Decks]] |
| SPEC-008 | [[Shared Cards and Lock-in]] | 0.2 | draft | [[Physical Copies Across Decks]], [[Deck Construction Rules]], SPEC-001 0.3, SPEC-003 0.6, SPEC-005 0.4, SPEC-006 0.6, SPEC-007 0.5, SPEC-009 0.2 |
| SPEC-009 | [[Runes Assumed Owned]] | 0.2 | draft | [[Physical Copies Across Decks]], [[Deck Construction Rules]], SPEC-001 0.3, SPEC-002 0.3, SPEC-005 0.4, SPEC-006 0.6, SPEC-007 0.5, SPEC-008 0.2 |
| SPEC-010 | [[Accounts and Sync]] | 0.5 | draft | [[ADR-0007 Firebase Accounts and Firestore]], [[Firestore Data Shape]], SPEC-003 0.6, SPEC-005 0.4, SPEC-006 0.6, SPEC-007 0.5, SPEC-008 0.2, SPEC-009 0.2 |

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
