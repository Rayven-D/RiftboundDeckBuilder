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
| `web/` | Direction A applied (H-024, see [[Design Direction]]): Rift Builder name and favicon, blue accent, Archivo headlines, 4/6/8px corners, Angular Material. **Home page** at `/` (ownership fan, step tiles, example panels). **Import** page: Collection / Deck cards open a paste-or-upload dialog (text, CSV, Excel) with the shared parser (quantity required, one-word section labels). Shared card art / tile / chip / deck heading; `/styleguide`. Decks, Collection, Tournaments and Deck detail pages are still placeholders. Lint, build and 105 tests green. |
| Git / deploy | PR #2 (`loop/ui-direction-a`, through the Rift Builder rename) merged into `dev`, then PR #3 `dev` → `main` on 2026-11-23; the Firebase Hosting deploy from `main` succeeded. Two later commits (tabs renamed to Decks / Collection; home example deck in ascending order) are on `loop/ui-direction-a` and go to `dev` in a follow-up PR. |
| In progress | The earlier Collection work (`core/catalog.ts`, `core/collection.ts`, `resolve-collection.ts`) is no longer in the working folder; only `web/public/fixture-cards/` remains. The Collection page still needs building. `data/raw/` holds the fixture, not a live payload. |
| `services/` | TypeScript API (no runtime deps): card ingest pipeline from the Riot API, `/api/health`, `/api/sets`, `/api/cards`. Tested on a synthetic fixture only. |
| `data/` | No live card snapshot yet (RJ runs `npm run ingest:cards` on his PC). |

## Specs ([[Spec Index]])
| Spec | Ver | Notes |
|---|---|---|
| SPEC-001 [[Card Data Model]] | 0.3 | nullable attrs, `cardKey`, `printingSortKey`, `catalogVersion`, `defaultPrintingId` |
| SPEC-002 [[Deck Legality]] | 0.3 | 4 ban waves as data, `banStatus()`, display rules LEGAL-R08 |
| SPEC-003 [[Collection Import]] | 0.5 | owned cards; Part A = shared parsers; quantity required (any side), printing codes, .xlsx |
| SPEC-004 [[Tournament Deck Catalog]] | 0.4 | Top 8, Add to your decks |
| SPEC-005 [[Your Decks Ownership View]] | 0.2 | full / darkened / partial fill, Riot section order, ban labels |
| SPEC-006 [[Deck Import]] | 0.5 | community decks; CSV / Excel too; shared tournament source |
| SPEC-007 [[My Collection]] | 0.3 | per-printing, tags, `deckOwnership()` |

## Waiting on RJ
- **Follow-up PR** for the last two `loop/ui-direction-a` commits → `dev`.
- **Push rule:** CLAUDE.md and ADR-0002 say agents never push; PRs #2 and the follow-up were pushed because RJ asked. Update them if agents should open PRs from now on.
- **H-020:** fetch the live Riot payload (or `cd services; npm install; npm run ingest:cards`). This unblocks most open card questions.
- **H-042:** recreate the weekly research refresh as a scheduled task inside the Claude project (the old one was deleted; there is no automatic refresh until then).
- **H-011:** apply for the production key once there's a demo ([[Riot App Application]]).

## Next for the loop
All 7 specs drafted and validated; H-040, H-043, H-044 PASS (SPEC-003/006 v0.4, SPEC-005 v0.2, screens named Decks / Collection). Next spec work: H-045 (collection export Tags column vs positional CSV), H-049 (follow-ups), H-050 (version bump for H-044). Next code: H-046 / H-053 (parser gaps and review fixes), H-054 (skip link, alt text), H-055 (`/api` hosting rewrite). H-048 PASS (parser accepts `x3 Name`, `Name x3` and printing codes like `RAD 001/167`); resolving codes waits on the catalog (H-057). H-051 / H-052 done. RJ: H-056 (analytics id, `riot.txt` path). Then the Collection page, Tournaments from `data/events/` and the Decks layout on the fixture. Card search, name matching against real cards and Collection sorting wait on H-020.

## Biggest unknowns
How the live API represents variants (is a foil its own printing?), domains, champion and
signature flags, and set order. All depend on H-020.

## Where things live
Board: [[Handoff Board]] · Decisions: [[Decision Log]] · Research: [[Research Index]] ·
Loop rules: [[Loop Protocol]] · Checks: [[Validation Checks]] · History: `Archive/` (low priority)
