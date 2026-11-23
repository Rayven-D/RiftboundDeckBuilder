---
tags: [moc, state]
updated: 2026-11-23
---
# Current State

> **Read this first.** One screen: what exists, what's decided, what's next. Open other notes
> only when your task needs them. Skip `Archive/` (history only). The `/loop` run updates this note.

## Product (ADR-0006)
Product name: **Rift Builder** (was "Riftbound Deck Builder", briefly "Rift Decks"). Tabs: **Decks**, **Collection**, **Tournaments**, plus an **Import** button and a home page at `/`.
- **Collection:** cards the user owns, from **Owned Cards Import**. Every printing is its own
  entry with a count badge. Tags go on printings, and a tag can be marked "exclude from decks".
  Default order is set → collector number.
- **Decks:** community decks from **Deck Import**, or "Add to your decks" from Tournaments.
  Cards are grouped by name and expand to show owned printings. Owned cards are in full colour,
  missing ones darkened, partly owned ones filled left to right (1 of 3 → ⅓). Ban status is shown on
  every card.
- **Tournaments:** recent events, Top 8 with published placings. No meta statistics, ever (ADR-0003).
- **Constraints:** free, no accounts (browser storage), Riot API is the only card data source, no Riot
  logos, key server-side only, Riot data only (no curated alias or date tables).

## Built
| Area | State |
|---|---|
| `web/` | Direction A applied (H-024, see [[Design Direction]]): Rift Builder name and favicon, blue accent, Archivo headlines, 4/6/8px corners, Angular Material. **Home page** at `/` (ownership fan, step tiles, example panels). **Import** page: Collection / Deck cards open a paste-or-upload dialog (text, CSV, Excel) with the shared parser (quantity required, one-word section labels). Shared card art / tile / chip / deck heading; `/styleguide`. Decks, Collection, Tournaments and Deck detail pages are still placeholders. Lint, build and 54 tests green. |
| Git / deploy | PR #2 (`loop/ui-direction-a`, through the Rift Builder rename) merged into `dev`, then PR #3 `dev` → `main` on 2026-11-23; the Firebase Hosting deploy from `main` succeeded. Two later commits (tabs renamed to Decks / Collection; home example deck in ascending order) are on `loop/ui-direction-a` and go to `dev` in a follow-up PR. |
| In progress | Uncommitted Collection work in RJ's working folder (not from this session): `core/catalog.ts`, `core/collection.ts` (browser CollectionStore), `shared/import/resolve-collection.ts`, a real Collection page, `web/proxy.conf.json`, `web/public/fixture-cards/`. Finish it on its own `loop/` branch. |
| `services/` | TypeScript API (no runtime deps): card ingest pipeline from the Riot API, `/api/health`, `/api/sets`, `/api/cards`. Tested on a synthetic fixture only. |
| `data/` | No live card snapshot yet (RJ runs `npm run ingest:cards` on his PC). |

## Specs ([[Spec Index]])
| Spec | Ver | Notes |
|---|---|---|
| SPEC-001 [[Card Data Model]] | 0.3 | nullable attrs, `cardKey`, `printingSortKey`, `catalogVersion`, `defaultPrintingId` |
| SPEC-002 [[Deck Legality]] | 0.3 | 4 ban waves as data, `banStatus()`, display rules LEGAL-R08 |
| SPEC-003 [[Collection Import]] | 0.3 | owned cards; Part A = shared parsers |
| SPEC-004 [[Tournament Deck Catalog]] | 0.4 | Top 8, Add to your decks |
| SPEC-005 [[Your Decks Ownership View]] | 0.1 | full / darkened / partial fill, zone allocation, ban labels |
| SPEC-006 [[Deck Import]] | 0.3 | community decks; shared tournament source |
| SPEC-007 [[My Collection]] | 0.3 | per-printing, tags, `deckOwnership()` |

## Waiting on RJ
- **Follow-up PR** for the last two `loop/ui-direction-a` commits → `dev`.
- **Push rule:** CLAUDE.md and ADR-0002 say agents never push; PRs #2 and the follow-up were pushed because RJ asked. Update them if agents should open PRs from now on.
- **H-020:** fetch the live Riot payload (or `cd services; npm install; npm run ingest:cards`). This unblocks most open card questions.
- **H-042:** recreate the weekly research refresh as a scheduled task inside the Claude project (the old one was deleted; there is no automatic refresh until then).
- **H-011:** apply for the production key once there's a demo ([[Riot App Application]]).

## Next for the loop
All 7 specs drafted and validated; design direction picked and applied (H-023 done, H-024 merged). Next: spec updates H-040 (SPEC-005 fixes), H-043 (import decisions: quantity required, .xlsx, deck CSV, one-word labels) and H-044 (screen names Decks / Collection); finish the in-progress Collection work; then Tournaments from `data/events/` and the Decks layout on the fixture. Card search, name matching against real cards and My-collection sorting wait on H-020.

## Biggest unknowns
How the live API represents variants (is a foil its own printing?), domains, champion and
signature flags, and set order. All depend on H-020.

## Where things live
Board: [[Handoff Board]] · Decisions: [[Decision Log]] · Research: [[Research Index]] ·
Loop rules: [[Loop Protocol]] · Checks: [[Validation Checks]] · History: `Archive/` (low priority)
