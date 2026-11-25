---
tags: [moc, state]
updated: 2026-11-24
---
# Current State

> **Read this first.** One screen: what exists, what's decided, what's next. Open other notes
> only when your task needs them. Skip `Archive/` (history only). The `/board` run updates this note.

## Product (ADR-0006)
Product name: **Rift Builder** (was "Riftbound Deck Builder", briefly "Rift Decks"). Tabs: **Decks**, **Collection**, **Tournaments**, plus an **Import** button and a home page at `/`.
- **Collection:** cards the user owns, from **Owned Cards Import**. Every printing is its own
  entry with a count badge. Tags go on printings, and a tag can be marked "exclude from decks".
  Default order is set → collector number.
- **Decks:** community decks from **Deck Import**, or "Add to your decks" from Tournaments.
  Cards are grouped by name and expand to show owned printings. Decks share one pool of physical cards;
  a complete deck can be **locked in** so other decks stop counting its copies. **Runes are cards like any
  other** (RJ, 2026-11-24: imported, counted, shared and locked; SPEC-009 withdrawn, build H-098). Available cards are in full colour,
  missing ones darkened, partly owned ones filled left to right (1 of 3 → ⅓). Ban status is shown on
  every card.
- **Tournaments:** recent events, Top 8 with published placings. Its job is a source of winning constructed decks to add as a goal (RJ, 2026-11-23), not a feature of its own. No meta statistics, ever (ADR-0003).
- **Constraints:** free, browser storage by default (optional sign-in and sync planned, ADR-0007), Riot API is
  the only card data source, no Riot logos, key server-side only, Riot data only (no curated alias or date tables).

## Built
| Area | State |
|---|---|
| `web/` | Direction A applied (H-024, see [[Design Direction]]): Rift Builder name and favicon, **teal accent `#14B8A6`** (was blue; green preview on `/styleguide`, H-085), Archivo headlines, 4/6/8px corners, Angular Material. **Fluid pass (H-085, 2026-11-24):** motion tokens, hover lift / press, route view transitions, sticky header on the content edges, **phone bottom tab bar** (Decks, Collection, Tournaments, Import), reduced-motion safe, drag-and-drop files on Import. **Home page** at `/` (hero fills the first screen, cards dealt in once on load then the ownership fill plays; headline "Know what you own. Own what you need.", ownership fan, "How it works" step tiles, Ownership and Winning decks example panels; Winning decks = events expanding to Top 8 Legend cards, 8 across on desktop, swipe on phones; American spelling). **Import** page: Collection / Deck cards open a paste-or-upload dialog (text, CSV, Excel) with the shared parser (quantity on either side, printing codes like `RAD 001/167`, one upload path, size / encoding checks). Skip link focuses main; card art alt = card name. `/api` in dev and prod (dev proxy to services :3000). Shared card art / tile / chip / deck heading; `/styleguide`. Deck ownership / shared pool / lock-in engine in `web/src/app/core/decks/` (H-059, no UI yet). Optional sign-in and Firestore sync in `web/src/app/shared/sync/` and `core/sync/` (H-062, sign-in off in production). Decks, Collection, Tournaments and Deck detail pages are still placeholders (empty states show the deck mark). Lint, build and 346 tests green. |
| Git / deploy | Work lands on `loop/<ID>` or `claude/*` branches → `dev`; RJ asked for `dev` → `main` pushes directly (no PR). **2026-11-24:** `loop/H-065-fluid-ui` (H-085) merged into `dev` (`38aab0b`), `dev` merged into `main` (`36ceb2c`, also brings the H-058 family and sign-in/sync), both pushed by RJ's request; the GitHub Actions deploy of `main` removes `riot.txt` again (H-056). 2026-11-23: `dev` pushed at `af8806a` (home page copy + Winning decks, plus the earlier Firestore / SPEC-008/009 / H-030 WIP commits); `main` at `e8a4ae2` (merge of `dev`), deployed by GitHub Actions to https://riftbound-deckbuilder.web.app, then redeployed locally with `riot.txt` (H-056). Preview channel `home-copy` (expires 2026-11-30) was used for phone review. |
| Firebase | Project `riftbound-deckbuilder`, Spark (free). Hosting serves the SPA. **Firestore** `(default)`, Standard, `us-south1`, created 2026-11-23, rules deny all (ADR-0007); deploy rules with `firebase deploy --only firestore`. Auth providers not enabled yet (H-063). The `!/api{,/**}` hosting rule only excludes `/api/` on real Hosting (`/api/health` still gets the SPA); harmless until an API exists. Data shape and free-tier sizing: [[Firestore Data Shape]] (input to H-061). |
| In progress | The Collection page still needs building. Invented fixture cards are committed (`data/samples/fixture/`, `web/public/fixture-cards/`; `npm run ingest:fixture`). `data/raw/` holds the fixture, not a live payload. |
| `services/` | TypeScript API (no runtime deps): card ingest pipeline from the Riot API, `/api/health`, `/api/sets`, `/api/cards`. Tested on the fixture only. Not hosted: proposed to ship card data as a static snapshot built in CI instead of a server (ADR-0004 still open). |
| `data/` | No live card snapshot yet (RJ runs `npm run ingest:cards` on his PC). |

## Specs ([[Spec Index]])
| Spec | Ver | Notes |
|---|---|---|
| SPEC-001 [[Card Data Model]] | 0.3 | nullable attrs, `cardKey`, `printingSortKey`, `catalogVersion`, `defaultPrintingId` |
| SPEC-002 [[Deck Legality]] | 0.3.1 | 4 ban waves as data (remove before add inside a wave, LEGAL-B02), `banStatus()`, display rules LEGAL-R08 |
| SPEC-003 [[Collection Import]] | 0.10 (H-087: a commit lands on `/collection` with an Undo snack bar, IMP-072…075) | owned cards; Part A = shared parsers; quantity required (any side), printing codes, .xlsx; upload rejections and `;`/tab delimiter as built; Replace and Undo confirmations warn about locked decks; CSV export `Quantity,Card Name` round-trips per printing (H-045); runes imported and exported like any card (IMP-071, H-097) |
| SPEC-004 [[Tournament Deck Catalog]] | 0.5 | Top 8, Add to your decks |
| SPEC-005 [[Your Decks Ownership View]] | 0.5.1 `review` (H-105) | OWN-065 ownership unavailable; full / darkened / partial fill of **available** copies, Riot section order, ban labels; runes counted like any card, no migration (OWN-028/029) |
| SPEC-006 [[Deck Import]] | 0.7 | monotonic `updatedAt` (DECK-074), synced when signed in; community decks; CSV / Excel too; shared tournament source; locked decks can't change cards |
| SPEC-007 [[My Collection]] | 0.10 (H-087: COLL-090 card data unavailable, COLL-091) | per-printing, tags, `deckOwnership()`; tags not in the CSV export (COLL-059 withdrawn); runes are cards (COLL-089, COLL-087 withdrawn) |
| SPEC-008 [[Shared Cards and Lock-in]] | 0.4.2 `review` (H-105) | per-card shortfall (SHARE-034), ownership unavailable (SHARE-053), `unavailable` filter group; one per-name pool across decks, Runes included (SHARE-006); lock in a complete deck (H-058 PASS 2026-11-23; build: H-059 engine → H-098 runes → H-060 Decks UI) |
| SPEC-009 [[Runes Assumed Owned]] | 0.3 | **withdrawn 2026-11-24** (RJ: runes are cards; RUNE-001…010 withdrawn, H-097) |
| SPEC-010 [[Accounts and Sync]] | 0.6.1 | Impacts applied to SPEC-003/006/007/008 (H-071, pins current); optional sign-in (email link now, Google later via `authProviders`) + Firestore sync, LWW per card / tag target / lock / deck, same deck status on every device, owner-only rules (H-061 PASS; RJ's 11 decisions applied, H-073 PASS 2026-11-23; H-062 built and PASS, sign-in off in production; pins of SPEC-003/007/008 are stale until H-074) |

## Waiting on RJ
- **H-087 defaults (no gate, optional):** SPEC-003 open questions: is a 10 s Undo window right; add a persistent "Undo last import" on Collection; Cancel at the Undo confirmation re-shows the notice.
- **H-105 (parked by the nightly run, 2026-11-24):** two lock choices from H-076, defaults already in SPEC-008 0.4.2 / SPEC-005 0.5.1 (both `review`): (1) locked decks while ownership is unavailable still show the lock, tile line "Ownership unavailable", own `unavailable` filter group; (2) the shortfall warning compares per card, not the total. Build H-103 waits on it.
- **H-097 (runes are cards):** RJ answered "No notice" (2026-11-24). Build is H-098; it touches the uncommitted H-086 Collection files.
- **H-085 review:** the fluid pass is live; RJ to try it on a phone and pick teal or green (`/styleguide` Accent switch). New strings to confirm: "How it works", "Drop to import". No validator run yet.
- **H-058 family:** merged into `dev` and `main` (2026-11-24). H-074 (SPEC-010 follow-ups) is still running in its own session.
- **Push rule:** CLAUDE.md and ADR-0002 say agents never push; RJ has asked for pushes (and `dev` → `main` merges) case by case. Update them if that should be the standing rule.
- **H-063:** enable Firebase Auth sign-in providers; decide Firestore delete protection.
- **H-056:** angular.json analytics id; `riot.txt` is still uncommitted (RJ unsure whether it should be in the repo). The 2026-11-24 deploy of `main` removed it again; run `firebase deploy --only hosting` locally to restore it. **Every GitHub Actions deploy of `main` removes it** until it is committed or the workflow adds it.
- **H-020:** fetch the live Riot payload (or `cd services; npm install; npm run ingest:cards`). This unblocks most open card questions.
- **H-042:** recreate the weekly research refresh as a scheduled task inside the Claude project (the old one was deleted; there is no automatic refresh until then).
- **H-011:** apply for the production key once there's a demo ([[Riot App Application]]).

## Next for the loop
Nightly run 2026-11-24: H-071, H-101, H-076, H-087, H-107 done (specs only). Next actionable: **H-091** (Collection simplification spec, P1, needs RJ choices), H-102 (Delete local data UI, COLL-074), H-104 (SPEC-008 AC 19 fix), H-106 (import commit wiring + Undo snack bar, after H-086 is closed); then P2 research H-022 / H-069 / H-070, H-072 (V-011 web adapter path), H-093 (keyword engine). H-103 (engine for H-076) waits on H-105. Board rows H-085 / H-086 / H-095 / H-098 still say `verify` although `cb6111f` merged H-086 / H-098 into `dev`: RJ or a validator run should close them. Printing codes (H-057) and card search wait on H-020.

## Biggest unknowns
How the live API represents variants (is a foil its own printing?), domains, champion and
signature flags, and set order. All depend on H-020.

## Where things live
Board: [[Handoff Board]] · Decisions: [[Decision Log]] · Research: [[Research Index]] ·
Loop rules: [[Loop Protocol]] · Checks: [[Validation Checks]] · History: `Archive/` (low priority)
