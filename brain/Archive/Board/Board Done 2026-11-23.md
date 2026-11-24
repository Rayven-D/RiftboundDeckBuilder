---
tags: [archive, handoffs]
archived: true
archived_on: 2026-11-23
reason: finished board items
---
# Finished board items (archived)

| ID | Owner | Request | Result |
|---|---|---|---|
| H-055 | service-builder | `/api` routing in dev and on Hosting | PASS: dev `apiBaseUrl` `/api` + `proxy.conf.json` (`ng serve` on :4321 → `GET /api/health` 200 JSON from services); `firebase.json` SPA rewrite `!/api{,/**}` (superstatic with the real config + dist: `/`, `/decks/abc`, `/import`, `/apix` → index.html; `/api`, `/api/`, `/api/health` → 404); prod API host plan in [[API Contracts]] (pending ADR-0004); not deployed |
| H-054 | ui-builder | Skip link, card-art alt | PASS: skip link cancels navigation and focuses `<main>` on `/import` (test); `alt` defaults to the card name, `decorative` gives `alt=""` (tile, home fan) (tests) |
| H-053 | ui-builder | Import upload path fixes | PASS: interim delimiter rule (RJ), multi-line cells flattened, `.txt` 1 MB / CSV+xlsx 5 MB, label-in-own-cell rows, dead paths removed; all tested through `readImportFile` (probe agrees); spec follow-ups → H-049 (4), (9)–(14) |
| H-046 | ui-builder | Parser conformance with SPEC-003 | PASS: `2.5`/`x2.5`/`.5` → BAD_QUANTITY, 2,000-char row limit, raw ≤ 120, INPUT_ENCODING, catalog-free summary + format + upload (probe + tests); follow-ups → H-049 (15)–(18) |
| H-048 | spec-writer → ui-builder | `x3 Name` / `Name x3` and printing codes on a line | PASS (parser part): SPEC-003/006 v0.5, Line grammar; probe on the real parser matches ACs 27, 28, 29 (parse part), 30–34 and DECK AC 23 parse part; V-008 web (lint, build, 105 tests); V-009 ok except AC 28 lacks **Given**; resolution IMP-066…070 → H-057; spec follow-ups (6)–(8) → H-049 |
| H-007 | spec-writer | SPEC-005 Your Decks Ownership View | PASS v0.1: 63 reqs, zone allocation main first, fill left to right, exclude-from-decks tags; follow-ups H-040 |
| H-039 | spec-writer | Spec summaries + clean-ups | PASS: Summary blocks on all specs, changelogs archived, versions 0.3/0.4 |
| H-030 | spec-writer | SPEC-006 Deck Import | PASS v0.2 (retry 1): one shared tournament source with SPEC-004, H-036 naming and duplicates |
| H-034 | spec-writer | SPEC-007 v0.2 | PASS: per-printing entries + ×N badge, tags on printings, exclude from decks, deckOwnership() |
| H-035 | spec-writer | SPEC-004 v0.3 | PASS |
| H-037 | spec-writer | legal_as_of + display rules | PASS: legal_as_of = event start date; Nov 23, 2026; "Not fully checked" |
| H-008 | service-builder | services scaffold | PASS (lint, build, 88 tests, fixture ingest); V-003 pending the live payload (H-020) |
| H-038 | RJ | Lighter brain | [[Current State]], `Archive/` (sessions, board, validation, meta overview), reading-order rule in CLAUDE.md and agents |
| H-036 | RJ | Gate decisions | Recorded in [[ADR-0006 Two Imports - Collection and Decks]]: name Legend + pilot + placing; In Your decks + Add another copy; printings separate in My Collection with count badge and tags on printings; Your decks grouped by name with expand; tags excludable from decks |
| H-015 | spec-writer | SPEC-001/002 alignment | PASS: v0.2, nullable attrs, isChampionUnit, catalogVersion, CARD-036/037, printingSortKey, Riot-only set legality |
| H-016 | spec-writer | SPEC-004 fixes | PASS v0.2 with follow-ups → H-035 |
| H-017 | spec-writer | Wrong ACs + counts | PASS (SPEC-001 AC5, SPEC-003 AC10, SPEC-004 AC7, IMP-006) |
| H-032 | RJ | Fill direction + tournament add | Left-to-right partial fill; one-click Add to Your decks from Tournaments (ADR-0006) |
| H-029 | RJ | Product model correction | Two imports: owned cards → My collection, community decks → Your decks; ownership colouring; tags and default order ([[ADR-0006 Two Imports - Collection and Decks]]) |
| H-028 | ui-builder | Shorter page descriptions + rename (RJ feedback) | One-line descriptions; "Decks I can build" → "Your decks" across app and vault ([[Design Direction]]) |
| H-027 | ui-builder | Straight button borders (RJ feedback) | Square corners on nav links and .button; active state is a straight accent bottom border ([[Design Direction]]) |
| H-003 | spec-writer | SPEC-001 Card Data Model | PASS v0.1 draft, 45 reqs; follow-ups H-015, H-017 ([[Card Data Model]]) |
| H-004 | spec-writer | SPEC-002 Deck Legality | PASS v0.1 draft, 43 reqs, 4 ban waves as data; follow-up H-015 ([[Deck Legality]]) |
| H-005 | spec-writer | SPEC-003 Collection Import | PASS v0.1 draft, 57 reqs; follow-ups H-017, H-018 ([[Collection Import]]) |
| H-006 | spec-writer | SPEC-004 Tournament Deck Catalog | PASS v0.1 draft, 46 reqs; follow-up H-016 ([[Tournament Deck Catalog]]) |
| H-009 | ui-builder | Angular scaffold | PASS: Angular 22.3, 5 routed placeholder screens, legal footer, lint/build/tests green; review gate H-023 ([[Design Direction]]) |
| H-013 | RJ | Riot dev key + developer rules | Key stored in gitignored `.env`; rules applied to specs, agents, and checks ([[Riot Developer Rules]]) |
| H-002 | RJ | Tech stack | Accepted: Angular + TypeScript API, local-first; hosting deferred ([[ADR-0001 Tech Stack]]) |
| H-010 | RJ | Metagame-data policy | Decided: tournament results only, no stats ([[ADR-0003 Tournament Results Only]]) |
| H-001 | researcher | First research pass | PASS 2026-11-23: 9 topic notes + 8 European Championship Top 8 decklists ([[Validation Runs]]) |
| H-018 | spec-writer | Spec clean-ups | PASS |
| H-019 | researcher | Decklist backfill | PASS: placing = published rank, format, legal_as_of (no separate rank field); meaning of legal_as_of → H-037 |
| H-026 | spec-writer | Apply ADR-0005/0006 | PASS; Add to Your decks contradiction moved to H-030 |
| H-031 | spec-writer | SPEC-007 My Collection | PASS v0.1 with follow-ups → H-034 |
| H-025 | validator | Activate V-008 (web), extend V-010 | Done ([[Validation Checks]]) |
| H-033 | ui-builder | Import screen option cards (RJ feedback) | Two cards, Owned Cards Import and Deck Import, with subtext ([[Design Direction]]) |
| H-051 | RJ | Broken Firebase workflows | Deleted `firebase-hosting-merge.yml` and `firebase-hosting-pull-request.yml` (RJ, 2026-11-23); `firebase-hosting-deploy.yml` stays |
| H-052 | RJ | Unused `firebase` dep in services | Removed; lockfile restored, `npm prune`, 88 tests pass |
| H-044 | spec-writer | Screen names Decks / Collection | PASS: ADR-0006 rename section + SPEC-001…007, Spec Index; button/status copy lower-case "your decks"; links and titles unchanged; version bump for changed MUST strings → H-050 |
| H-043 | spec-writer | SPEC-003 / SPEC-006 v0.4 import decisions | PASS: quantity required, .xlsx first sheet, deck CSV/Excel, labels with/without spaces, one dialog writing uploads into the text box all match the code (probe); spec'd code gaps → H-046, H-047, H-048; follow-ups H-045, H-049, H-053 |
| H-040 | spec-writer | SPEC-005 v0.2 fixes | PASS: all 7 fixes; OWN-062/063 ownership unavailable without catalog or tags (deliberate); follow-ups → H-049 |
