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
  Cards are grouped by name and expand to show owned printings. Decks share one pool of physical cards;
  a complete deck can be **locked in** so other decks stop counting its copies; runes are assumed owned
  (SPEC-008/009). Available cards are in full colour,
  missing ones darkened, partly owned ones filled left to right (1 of 3 → ⅓). Ban status is shown on
  every card.
- **Tournaments:** recent events, Top 8 with published placings. Its job is a source of winning constructed decks to add as a goal (RJ, 2026-11-23), not a feature of its own. No meta statistics, ever (ADR-0003).
- **Constraints:** free, browser storage by default (optional sign-in and sync planned, ADR-0007), Riot API is
  the only card data source, no Riot logos, key server-side only, Riot data only (no curated alias or date tables).

## Built
| Area | State |
|---|---|
| `web/` | Direction A applied (H-024, see [[Design Direction]]): Rift Builder name and favicon, blue accent, Archivo headlines, 4/6/8px corners, Angular Material. **Home page** at `/` (headline "Know what you own. Own what you need.", ownership fan, step tiles, Ownership and Winning decks example panels; Winning decks = events expanding to Top 8 Legend cards, 8 across on desktop, swipe on phones; American spelling). **Import** page: Collection / Deck cards open a paste-or-upload dialog (text, CSV, Excel) with the shared parser (quantity on either side, printing codes like `RAD 001/167`, one upload path, size / encoding checks). Skip link focuses main; card art alt = card name. `/api` in dev and prod (dev proxy to services :3000). Shared card art / tile / chip / deck heading; `/styleguide`. Decks, Collection, Tournaments and Deck detail pages are still placeholders. Lint, build and 157 tests green. |
| Git / deploy | Work lands on `loop/<ID>` or `claude/*` branches → `dev`; RJ asked for `dev` → `main` pushes directly (no PR). 2026-11-23: `dev` pushed at `af8806a` (home page copy + Winning decks, plus the earlier Firestore / SPEC-008/009 / H-030 WIP commits); `main` at `e8a4ae2` (merge of `dev`), deployed by GitHub Actions to https://riftbound-deckbuilder.web.app, then redeployed locally with `riot.txt` (H-056). Preview channel `home-copy` (expires 2026-11-30) was used for phone review. |
| Firebase | Project `riftbound-deckbuilder`, Spark (free). Hosting serves the SPA. **Firestore** `(default)`, Standard, `us-south1`, created 2026-11-23, rules deny all (ADR-0007); deploy rules with `firebase deploy --only firestore`. Auth providers not enabled yet (H-063). The `!/api{,/**}` hosting rule only excludes `/api/` on real Hosting (`/api/health` still gets the SPA); harmless until an API exists. Data shape and free-tier sizing: [[Firestore Data Shape]] (input to H-061). |
| In progress | The Collection page still needs building. Invented fixture cards are committed (`data/samples/fixture/`, `web/public/fixture-cards/`; `npm run ingest:fixture`). `data/raw/` holds the fixture, not a live payload. |
| `services/` | TypeScript API (no runtime deps): card ingest pipeline from the Riot API, `/api/health`, `/api/sets`, `/api/cards`. Tested on the fixture only. Not hosted: proposed to ship card data as a static snapshot built in CI instead of a server (ADR-0004 still open). |
| `data/` | No live card snapshot yet (RJ runs `npm run ingest:cards` on his PC). |

## Specs ([[Spec Index]])
| Spec | Ver | Notes |
|---|---|---|
| SPEC-001 [[Card Data Model]] | 0.3 | nullable attrs, `cardKey`, `printingSortKey`, `catalogVersion`, `defaultPrintingId` |
| SPEC-002 [[Deck Legality]] | 0.3 | 4 ban waves as data, `banStatus()`, display rules LEGAL-R08 |
| SPEC-003 [[Collection Import]] | 0.7 | owned cards; Part A = shared parsers; quantity required (any side), printing codes, .xlsx; upload rejections and `;`/tab delimiter as built; Replace and Undo confirmations warn about locked decks |
| SPEC-004 [[Tournament Deck Catalog]] | 0.4 | Top 8, Add to your decks |
| SPEC-005 [[Your Decks Ownership View]] | 0.4 | full / darkened / partial fill of **available** copies, Riot section order, ban labels |
| SPEC-006 [[Deck Import]] | 0.6 | community decks; CSV / Excel too; shared tournament source; locked decks can't change cards |
| SPEC-007 [[My Collection]] | 0.6 | per-printing, tags, `deckOwnership()` |
| SPEC-008 [[Shared Cards and Lock-in]] | 0.3 | one per-name pool across decks; lock in a complete deck (H-058 PASS 2026-11-23; build: H-059 engine → H-060 Decks UI) |
| SPEC-009 [[Runes Assumed Owned]] | 0.2 | runes never missing, never shared or locked |

## Waiting on RJ
- **Push rule:** CLAUDE.md and ADR-0002 say agents never push; RJ has asked for pushes (and `dev` → `main` merges) case by case. Update them if that should be the standing rule.
- **H-063:** enable Firebase Auth sign-in providers; decide Firestore delete protection.
- **H-056:** angular.json analytics id; `riot.txt` is still uncommitted (RJ unsure whether it should be in the repo). It is live only because of a local `firebase deploy --only hosting` on 2026-11-23; **every GitHub Actions deploy of `main` removes it again** until it is committed or the workflow adds it.
- **H-020:** fetch the live Riot payload (or `cd services; npm install; npm run ingest:cards`). This unblocks most open card questions.
- **H-042:** recreate the weekly research refresh as a scheduled task inside the Claude project (the old one was deleted; there is no automatic refresh until then).
- **H-011:** apply for the production key once there's a demo ([[Riot App Application]]).

## Next for the loop
Code fixes H-046, H-053, H-054, H-055 PASS (2026-11-23). Next: **DB sizing and shape** for Firestore (its own session), then H-061 (accounts and sync spec) → H-062 (build). Spec work: H-045 (export Tags column vs positional CSV), H-049 (follow-ups incl. the interim CSV delimiter rule), H-050 (version bumps); H-058 shared cards / lock-in PASS (validated + code review); next H-059 engine, then H-060 UI. Then the Collection page, Tournaments from `data/events/` and the Decks layout on the fixture. Card search, name matching and printing-code resolution (H-057) wait on H-020.

## Biggest unknowns
How the live API represents variants (is a foil its own printing?), domains, champion and
signature flags, and set order. All depend on H-020.

## Where things live
Board: [[Handoff Board]] · Decisions: [[Decision Log]] · Research: [[Research Index]] ·
Loop rules: [[Loop Protocol]] · Checks: [[Validation Checks]] · History: `Archive/` (low priority)
