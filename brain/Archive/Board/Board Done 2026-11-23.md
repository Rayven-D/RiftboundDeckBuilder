---
tags: [archive, handoffs]
archived: true
archived_on: 2026-11-23
reason: finished board items
---
# Finished board items (archived)

| ID | Owner | Request | Result |
|---|---|---|---|
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
