---
tags: [moc, state]
updated: 2026-11-23
---
# Current State

> **Read this first.** One screen: what exists, what's decided, what's next. Open other notes
> only when your task needs them. Skip `Archive/` (history only). The `/loop` run updates this note.

## Product (ADR-0006)
- **My collection:** cards the user owns, from **Owned Cards Import**. Every printing is its own
  entry with a count badge. Tags go on printings, and a tag can be marked "exclude from decks".
  Default order is set → collector number.
- **Your decks:** community decks from **Deck Import**, or "Add to Your decks" from Tournaments.
  Cards are grouped by name and expand to show owned printings. Owned cards are in full colour,
  missing ones darkened, partly owned ones filled left to right (1 of 3 → ⅓). Ban status is shown on
  every card.
- **Tournaments:** recent events, Top 8 with published placings. No meta statistics, ever (ADR-0003).
- **Constraints:** free, no accounts (browser storage), Riot API is the only card data source, no Riot
  logos, key server-side only, Riot data only (no curated alias or date tables).

## Built
| Area | State |
|---|---|
| `web/` | Angular 22.3 scaffold: 5 routes with placeholder pages, legal footer, square buttons, Import option cards. Lint, build, and tests green. |
| `services/` | TypeScript API (no runtime deps): card ingest pipeline from the Riot API, `/api/health`, `/api/sets`, `/api/cards`. Tested on a synthetic fixture only. |
| `data/` | No live card snapshot yet (RJ runs `npm run ingest:cards` on his PC). |

## Specs ([[Spec Index]])
| Spec | Ver | Notes |
|---|---|---|
| SPEC-001 [[Card Data Model]] | 0.2 | nullable attrs, `cardKey`, `printingSortKey`, `catalogVersion` |
| SPEC-002 [[Deck Legality]] | 0.2 | 4 ban waves as data, `banStatus()` |
| SPEC-003 [[Collection Import]] | 0.2 | owned cards; Part A = shared parsers |
| SPEC-004 [[Tournament Deck Catalog]] | 0.3 | Top 8, Add to Your decks |
| SPEC-005 Your Decks Ownership View | — | **next (H-007)** |
| SPEC-006 [[Deck Import]] | 0.2 | community decks; shared tournament source |
| SPEC-007 [[My Collection]] | 0.2 | per-printing, tags, deckOwnership() |

## Waiting on RJ
- **H-020:** fetch the live Riot payload (or `cd services; npm install; npm run ingest:cards`). This unblocks most open card questions.
- **H-023:** run the app and pick design direction A/B/C ([[Design Direction]]).
- **H-011:** apply for the production key once there's a demo ([[Riot App Application]]).

## Next for the loop
H-039 (spec summaries + clean-ups) and H-007 (SPEC-005) → UI screens against [[API Contracts]] v1.

## Biggest unknowns
How the live API represents variants (is a foil its own printing?), domains, champion and
signature flags, and set order. All depend on H-020.

## Where things live
Board: [[Handoff Board]] · Decisions: [[Decision Log]] · Research: [[Research Index]] ·
Loop rules: [[Loop Protocol]] · Checks: [[Validation Checks]] · History: `Archive/` (low priority)
