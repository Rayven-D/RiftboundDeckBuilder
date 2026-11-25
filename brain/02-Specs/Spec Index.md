---
tags: [moc, specs]
---
# Spec Index

> Every spec starts with a **Summary** block. Read that first. Changelogs live in `Archive/Spec-Changelogs/`.

Owner: **spec-writer**. Status: `draft` · `review` · `approved` · `blocked` · `superseded` · `withdrawn` (kept for history, nothing in force)

| ID | Spec | Version | Status | Depends on research |
|---|---|---|---|---|
| SPEC-001 | [[Card Data Model]] | 0.3 | draft | [[Card Data & Images]], [[Sets]] |
| SPEC-002 | [[Deck Legality]] | 0.3.1 | draft | [[Deck Construction Rules]], [[Ban List]], [[Formats]]; 0.3.1: LEGAL-B02 `remove` before `add` inside a wave (H-076) |
| SPEC-003 | [[Collection Import]] | 0.11 | draft | [[Collection Import Formats]], [[Physical Copies Across Decks]], SPEC-001, SPEC-008 0.4.4 (IMP-050a warning); 0.11: account-only, IMP-053 / IMP-076 without modes (H-171); 0.10.1: IMP-053 per-mode storage wording, IMP-076 SYNC-009 gate note (H-160); 0.7: CSV export round-trips `byPrinting`, no Tags column (H-045); 0.8: import code behaviour as built, IMP-050a (H-049); 0.9: runes imported and exported like any card, IMP-071 (H-097); 0.9.1: IMP-053 browser by default, synced when signed in (H-071); 0.10: IMP-072…075 commit lands on `/collection` with an Undo snack bar (H-087) |
| SPEC-004 | [[Tournament Deck Catalog]] | 0.6 | draft | [[Tournament Results]], [[ADR-0003 Tournament Results Only]]; 0.6: account-only CAT-077 / CAT-078, CAT-079 smooth scrolling, no pagination (H-171); 0.5.1: CAT-077 per-mode storage wording, CAT-078 SYNC-009 gate note (H-160) |
| SPEC-005 | [[Your Decks Ownership View]] | 0.6 | **review** (RJ: ownership-unavailable wording and filter group, SPEC-008 open question 5) | SPEC-001 0.3, SPEC-002 0.3.1, SPEC-004 0.6, SPEC-006 0.8, SPEC-007 0.11, SPEC-008 0.4.4, [[Physical Copies Across Decks]]; 0.6: OWN-066 gate always on, OWN-093 reworded, OWN-084 smooth scrolling, no pagination (H-171); 0.5: runes are counted entries, OWN-028/029 (H-097); 0.5.1: OWN-065 ownership unavailable (H-076); 0.5.2: OWN-066 SYNC-009 gate note (H-160) |
| SPEC-006 | [[Deck Import]] | 0.8 | draft | [[Collection Import Formats]], SPEC-001 0.3, SPEC-002 0.3.1, SPEC-003 0.11, SPEC-004 0.6, SPEC-008 0.4.4; 0.8: account-only DECK-090 / DECK-097 (H-171); 0.7: DECK-074 monotonic `updatedAt` (H-071); 0.7.1: DECK-090 per-mode storage wording, DECK-097 SYNC-009 gate note (H-160) |
| SPEC-007 | [[My Collection]] | 0.11 | draft | SPEC-001 0.3, SPEC-002 0.3.1, SPEC-003 0.11, SPEC-008 0.4.4, [[Physical Copies Across Decks]]; 0.11: account-only COLL-070, **COLL-074 withdrawn**, COLL-092 gate always on, COLL-093 smooth scrolling, no pagination (H-171); 0.8: runes are cards, COLL-087 withdrawn, COLL-089 (H-097); 0.9: short `TagId`, `StoredTags` schemaVersion 3 (H-071); 0.10: COLL-090 card data unavailable, COLL-091 arriving from an import (H-087); 0.10.1: COLL-070 per-mode storage wording, COLL-074 not offered in account-required mode, COLL-092 SYNC-009 gate note (H-160) |
| SPEC-008 | [[Shared Cards and Lock-in]] | 0.4.4 | **review** (RJ: SHARE-053 locked decks while ownership is unavailable, SHARE-034 per-card warning; open questions 5, 6) | [[Physical Copies Across Decks]], [[Deck Construction Rules]], SPEC-001 0.3, SPEC-003 0.11, SPEC-005 0.6, SPEC-006 0.8, SPEC-007 0.11; 0.4.4: SHARE-060 account-only (H-171); 0.4: Runes is a counted zone, SHARE-006 (H-097); 0.4.1: out-of-scope line superseded (H-071); 0.4.2: SHARE-020 `isLocked`, SHARE-030 unparseable `lockedAt`, SHARE-034 per card, SHARE-051/053 `unavailable` (H-076); 0.4.3: SHARE-060 per-mode storage wording (H-160) |
| SPEC-009 | [[Runes Assumed Owned]] | 0.3 | **withdrawn** 2026-11-24 (RJ: runes are cards; RUNE-001…010 withdrawn, replaced by IMP-071, OWN-028, COLL-089, SHARE-006; H-097) | (none) |
| SPEC-010 | [[Accounts and Sync]] | 0.13 | draft (privacy notice text awaits RJ approval, [[Privacy Notice Draft]]) | [[ADR-0007 Firebase Accounts and Firestore]] (amendments 2026-11-24 and 2026-11-24 (2)), [[Firestore Data Shape]], SPEC-003 0.11, SPEC-004 0.6, SPEC-005 0.6, SPEC-006 0.8, SPEC-007 0.11, SPEC-008 0.4.4 (SPEC-009 withdrawn), [[Privacy Notice Requirements]]; 0.13 (H-152): SYNC-101 unblocked, SYNC-103 notice contents, SYNC-104 `/privacy` route and links, ACs 65–70; 0.12 (H-171, RJ decision 17): **account-only**: no `signInEnabled`, no local-only mode (SYNC-008, SYNC-052 withdrawn), SYNC-007 production release rule (no production deploy until H-063, H-152 and the Firestore rules), browser cache SYNC-140…146, ACs 59–64, build H-172; 0.11.2 (H-160): Impacts for SPEC-003…008 marked applied; 0.10: UI review 2026-11-24 sign-in, menu and dialog text, RJ decision 15 panel line (H-103…H-121; built H-140…H-145); 0.11 (H-146, documents the build): "disabled" = `aria-disabled` with focus kept, confirm dialog strings, SYNC-087 notice kinds, AC 52 URL wording, home-copy impact per H-126; RJ confirmed Open questions 1–9 (decision 16) |
| SPEC-011 | [[Keyword Explanations]] | 0.2.1 | review (engine and hidden section testable on fixtures; definition source blocked on [[ADR-0008 Keyword Glossary Source]], keyword string format on H-020) | [[Card Keywords]] (H-089), [[Card Data & Images]], SPEC-001 0.3, SPEC-007 0.7 |

## Cross-cutting constraints (apply to every spec)
- **Stack:** an Angular front end and a TypeScript (Node) API ([[ADR-0001 Tech Stack]]).
- **Local-first:** build and run everything locally until the MVP is done.
- **Account-only user data** (RJ 2026-11-24, ADR-0007 amendment 2): a user's collection, tags, locks and decks live in their signed-in account; the browser only caches them (SPEC-010 SYNC-140…); no local-only mode. The account-only build is not deployed to production until H-063, H-152 and the Firestore rules are done (SYNC-007). Card and deck lists scroll with no pagination (SPEC-007 COLL-093).
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
- **Shared physical cards:** decks compete for one per-name pool; locked-in decks hold their copies; runes are cards like any other (SPEC-008 SHARE-006; RJ 2026-11-24, SPEC-009 withdrawn).
- **No metagame statistics:** tournament results only, the full Top 8 with placing labels ([[ADR-0003 Tournament Results Only]]).
