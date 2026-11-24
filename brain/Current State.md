---
tags: [moc, state]
updated: 2026-11-24
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
- **Account required to import (RJ 2026-11-24, [[Accounts and Sync]] v0.8, [[ADR-0007 Firebase Accounts and Firestore]] amendment accepted):** importing cards or decks needs an account; Tournaments and Home need none; signed out, Tournaments shows no "Add to your decks"; sign-out clears the device; first sign-in clears old browser data, then downloads. Built in H-081 (`loop/H-081-account-required`, validator PASS). Production keeps no-account imports until sign-in is turned on.
- **Constraints:** free; storage by mode (ADR-0007 amendment): `signInEnabled: false` (production today) = browser storage only, no accounts; `signInEnabled: true` = account required to import, browser is a cache of the account. Riot API is
  the only card data source, no Riot logos, key server-side only, Riot data only (no curated alias or date tables).

## Built
| Area | State |
|---|---|
| `web/` | Direction A applied (H-024, see [[Design Direction]]): Rift Builder name and favicon, **teal accent `#14B8A6`** (was blue; green preview on `/styleguide`, H-085), Archivo headlines, 4/6/8px corners, Angular Material. **Fluid pass (H-085, 2026-11-24):** motion tokens, hover lift / press, route view transitions, sticky header on the content edges, **phone bottom tab bar** (Decks, Collection, Tournaments, Import), reduced-motion safe, drag-and-drop files on Import. **Home page** at `/` (hero fills the first screen, cards dealt in once on load then the ownership fill plays; headline "Know what you own. Own what you need.", ownership fan, "How it works" step tiles, Ownership and Winning decks example panels; Winning decks = events expanding to Top 8 Legend cards, 8 across on desktop, swipe on phones; American spelling). **Import** page: Collection / Deck cards open a paste-or-upload dialog (text, CSV, Excel) with the shared parser (quantity on either side, printing codes like `RAD 001/167`, one upload path, size / encoding checks). Skip link focuses main; card art alt = card name. `/api` in dev and prod (dev proxy to services :3000). Shared card art / tile / chip / deck heading; `/styleguide`. Deck ownership / shared pool / lock-in engine in `web/src/app/core/decks/` (H-059, no UI yet). Optional sign-in and Firestore sync in `web/src/app/shared/sync/` and `core/sync/` (H-062, sign-in off in production). Decks, Collection, Tournaments and Deck detail pages are still placeholders (empty states show the deck mark). Accounts and sync (H-062, behind `signInEnabled`) with Cancel deletion and the account-menu Try again (H-086) and account-required mode (H-081: sign-in gate on Decks / Collection / Import, first sign-in and sign-out clear the device, no Combine) are on `loop/` branches, not in `dev` yet. On `loop/H-081-account-required` (built on H-086): lint, build, 341 web and 33 emulator tests green. Per-build `appVersion` (`web-<prod|preview>-<7 hex>`, `web/scripts/build.mjs`) and the preview deploy path (`cd web; npm run deploy:preview -- <channel> [expires]`, `firebase.preview.json`, never `live`) are on `loop/H-078-appversion-preview` (H-078 PASS, chained on H-077): 376 web and 33 emulator tests green. |
| Git / deploy | Work lands on `loop/<ID>` or `claude/*` branches → `dev`; RJ asked for `dev` → `main` pushes directly (no PR). **2026-11-24:** `loop/H-065-fluid-ui` (H-085) merged into `dev` (`38aab0b`), `dev` merged into `main` (`36ceb2c`, also brings the H-058 family and sign-in/sync), both pushed by RJ's request; the GitHub Actions deploy of `main` removes `riot.txt` again (H-056). 2026-11-23: `dev` pushed at `af8806a` (home page copy + Winning decks, plus the earlier Firestore / SPEC-008/009 / H-030 WIP commits); `main` at `e8a4ae2` (merge of `dev`), deployed by GitHub Actions to https://riftbound-deckbuilder.web.app, then redeployed locally with `riot.txt` (H-056). Preview channel `home-copy` (expires 2026-11-30) was used for phone review. |
| Firebase | Project `riftbound-deckbuilder`, Spark (free). Hosting serves the SPA. **Firestore** `(default)`, Standard, `us-south1`, created 2026-11-23, rules deny all (ADR-0007); deploy rules with `firebase deploy --only firestore`. Auth providers not enabled yet (H-063). The `!/api{,/**}` hosting rule only excludes `/api/` on real Hosting (`/api/health` still gets the SPA); harmless until an API exists. Data shape and free-tier sizing: [[Firestore Data Shape]] (input to H-061). |
| In progress | The Collection page still needs building. Invented fixture cards are committed (`data/samples/fixture/`, `web/public/fixture-cards/`; `npm run ingest:fixture`). `data/raw/` holds the fixture, not a live payload. |
| `services/` | TypeScript API (no runtime deps): card ingest pipeline from the Riot API, `/api/health`, `/api/sets`, `/api/cards`. Tested on the fixture only. Not hosted: proposed to ship card data as a static snapshot built in CI instead of a server (ADR-0004 still open). |
| `data/` | No live card snapshot yet (RJ runs `npm run ingest:cards` on his PC). |

## Specs ([[Spec Index]])
| Spec | Ver | Notes |
|---|---|---|
| SPEC-001 [[Card Data Model]] | 0.3 | nullable attrs, `cardKey`, `printingSortKey`, `catalogVersion`, `defaultPrintingId` |
| SPEC-002 [[Deck Legality]] | 0.3 | 4 ban waves as data, `banStatus()`, display rules LEGAL-R08 |
| SPEC-003 [[Collection Import]] | 0.8 | owned cards; Part A = shared parsers; quantity required (any side), printing codes, .xlsx; upload rejections and `;`/tab delimiter as built; Replace and Undo confirmations warn about locked decks; CSV export `Quantity,Card Name` round-trips per printing (H-045) |
| SPEC-004 [[Tournament Deck Catalog]] | 0.5 | Top 8, Add to your decks |
| SPEC-005 [[Your Decks Ownership View]] | 0.4.1 | full / darkened / partial fill of **available** copies, Riot section order, ban labels |
| SPEC-006 [[Deck Import]] | 0.6 | community decks; CSV / Excel too; shared tournament source; locked decks can't change cards |
| SPEC-007 [[My Collection]] | 0.7 | per-printing, tags, `deckOwnership()`; tags not in the CSV export (COLL-059 withdrawn) |
| SPEC-008 [[Shared Cards and Lock-in]] | 0.3 | one per-name pool across decks; lock in a complete deck (H-058 PASS 2026-11-23; build: H-059 engine → H-060 Decks UI) |
| SPEC-009 [[Runes Assumed Owned]] | 0.2 | runes never missing, never shared or locked |
| SPEC-010 [[Accounts and Sync]] | 0.9 | v0.9 (H-093, built H-094): RJ decision 14, gated pages keep their header, signed-out panel text "You need a free account to import cards or decks." v0.8 (H-080): two modes by `signInEnabled`; account-required mode gates Decks / Collection / Import / Tournaments deck controls, sign-out clears the device, no Combine (built H-081 PASS; follow-ups H-089…H-092), first sign-in at most 1 write (H-077 PASS on `loop/H-077-write-budget`, `PushChanges.batch` removed; spec text H-097); `appVersion` per build and preview deploy path (H-078 PASS on `loop/H-078-appversion-preview`; spec text H-098; first real preview deploy is RJ's H-099); H-062 clean-ups (AC 22 `duplicatedFrom` rules test, stale comments; H-079 PASS on `loop/H-079-rules-cleanups`, the last item of the chain). Earlier: sign-in (email link now, Google later via `authProviders`) + Firestore sync, LWW per card / tag target / lock / deck, same deck status on every device, owner-only rules (H-061 PASS; RJ's 11 decisions applied, H-073 PASS 2026-11-23; H-062 built and PASS on `loop/H-062-accounts-sync-build`, sign-in off in production; v0.7 documents the build, H-074 PASS; a deletion that removed nothing can be cancelled, built in H-086 PASS on `loop/H-086-cancel-deletion`, spec catch-up H-087, H-088) |

## Waiting on RJ
- **H-085 review:** the fluid pass is live; RJ to try it on a phone and pick teal or green (`/styleguide` Accent switch). New strings to confirm: "How it works", "Drop to import". No validator run yet.
- **H-058 family:** merged into `dev` and `main` (2026-11-24). H-074 (SPEC-010 follow-ups) is still running in its own session.
- **Push rule:** CLAUDE.md and ADR-0002 say agents never push; RJ has asked for pushes (and `dev` → `main` merges) case by case. Update them if that should be the standing rule.
- **H-099:** first real preview deploy (`cd web; npm run deploy:preview -- sync-test`) to check AC 35 by hand. An empty preview channel `sync-test` already exists (created by mistake in H-078 validation, nothing uploaded, expires 2026-12-01): reuse or delete it.
- **H-063:** enable Firebase Auth sign-in providers; decide Firestore delete protection.
- **H-056:** angular.json analytics id; `riot.txt` is still uncommitted (RJ unsure whether it should be in the repo). The 2026-11-24 deploy of `main` removed it again; run `firebase deploy --only hosting` locally to restore it. **Every GitHub Actions deploy of `main` removes it** until it is committed or the workflow adds it.
- **H-020:** fetch the live Riot payload (or `cd services; npm install; npm run ingest:cards`). This unblocks most open card questions.
- **H-042:** recreate the weekly research refresh as a scheduled task inside the Claude project (the old one was deleted; there is no automatic refresh until then).
- **H-011:** apply for the production key once there's a demo ([[Riot App Application]]).

## Next for the loop
**First thing next session (RJ, 2026-11-24):** builder chain for SPEC-010 v0.8: H-086 and H-081 done (`loop/H-081-account-required`, on top of H-086), H-077 done (`loop/H-077-write-budget`, on top of H-081), H-078 done (`loop/H-078-appversion-preview`, on top of H-077), H-079 done (`loop/H-079-rules-cleanups`, on top of H-078): the chain is complete; RJ merges `loop/H-079-rules-cleanups` (it contains the whole chain) into `dev`. RJ also owes H-083 (2 questions, defaults specced).

Code fixes H-046, H-053, H-054, H-055 PASS (2026-11-23). Next: **DB sizing and shape** for Firestore (its own session), then H-061 (accounts and sync spec) → H-062 (build). Spec work: H-045 PASS (export has no Tags column and writes printing codes, SPEC-003 0.7 / SPEC-007 0.6), H-049 (follow-ups incl. the interim CSV delimiter rule), H-050 (version bumps); H-058 shared cards / lock-in PASS; H-059 engine and H-062 sign-in/sync built (merge PR pending); next H-076 spec decisions, then H-060 UI. Then the Collection page, Tournaments from `data/events/` and the Decks layout on the fixture. Card search, name matching and printing-code resolution (H-057) wait on H-020.

## Biggest unknowns
How the live API represents variants (is a foil its own printing?), domains, champion and
signature flags, and set order. All depend on H-020.

## Where things live
Board: [[Handoff Board]] · Decisions: [[Decision Log]] · Research: [[Research Index]] ·
Loop rules: [[Loop Protocol]] · Checks: [[Validation Checks]] · History: `Archive/` (low priority)
