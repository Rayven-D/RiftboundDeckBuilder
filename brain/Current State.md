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
| SPEC-001 [[Card Data Model]] | 0.3 | nullable attrs, `cardKey`, `printingSortKey`, `catalogVersion`, `defaultPrintingId` |
| SPEC-002 [[Deck Legality]] | 0.3 | 4 ban waves as data, `banStatus()`, display rules LEGAL-R08 |
| SPEC-003 [[Collection Import]] | 0.3 | owned cards; Part A = shared parsers |
| SPEC-004 [[Tournament Deck Catalog]] | 0.4 | Top 8, Add to Your decks |
| SPEC-005 [[Your Decks Ownership View]] | 0.1 | full / darkened / partial fill, zone allocation, ban labels |
| SPEC-006 [[Deck Import]] | 0.3 | community decks; shared tournament source |
| SPEC-007 [[My Collection]] | 0.3 | per-printing, tags, `deckOwnership()` |

## Waiting on RJ
- **H-020:** fetch the live Riot payload (or `cd services; npm install; npm run ingest:cards`). This unblocks most open card questions.
- **H-042:** recreate the weekly research refresh as a scheduled task inside the Claude project (the old one was deleted; there is no automatic refresh until then).
- **H-011:** apply for the production key once there's a demo ([[Riot App Application]]).

## Next for the loop
All 7 specs drafted and validated. Next: small SPEC-005 fixes (H-040), then **build the UI screens** against [[API Contracts]] v1 and the specs. Design direction A is picked and applied (H-023 done, H-024 in verify on `loop/ui-direction-a`): Rift Builder name and favicon, blue accent, Archivo headlines, a home page at `/`, Import dialogs (paste or CSV / Excel upload, shared parser), shared deck components and a `/styleguide` preview. Screens that need no live card data come first: the two import flows, Tournaments, and the Your decks layout on the fixture.

## Biggest unknowns
How the live API represents variants (is a foil its own printing?), domains, champion and
signature flags, and set order. All depend on H-020.

## Where things live
Board: [[Handoff Board]] · Decisions: [[Decision Log]] · Research: [[Research Index]] ·
Loop rules: [[Loop Protocol]] · Checks: [[Validation Checks]] · History: `Archive/` (low priority)
