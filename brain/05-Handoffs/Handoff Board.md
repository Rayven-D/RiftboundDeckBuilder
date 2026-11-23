---
tags: [handoffs, loop]
next_id: 27
---
# Handoff Board

The loop's state. See [[Loop Protocol]]. One row per item. Take the next ID from `next_id` and increment it.

**Status:** `todo` · `doing` · `verify` · `done` · `blocked` · `needs-RJ`  **Priority:** P0 (urgent) → P3
**Owners:** researcher · spec-writer · service-builder · ui-builder · validator · RJ

## Open
| ID | Pri | Owner | Status | Depends | From | Request | Accept | Tries | Link |
|---|---|---|---|---|---|---|---|---|---|
| H-020 | P0 | RJ | needs-RJ | — | validator | Fetch one live Riot API response on your PC (the sandboxes are blocked) and save it to `data/raw/riftbound-content-en.json` (the PowerShell command is in the Session Log) | File exists, valid JSON | 0 | [[Card Data Model]] |
| H-023 | P1 | RJ | needs-RJ | — | ui-builder | UI review gate: run the app (`cd web; npm install; npx ng serve`), pick design direction A/B/C + accent, wordmark and nav OK? (product defaults are answered in ADR-0005) | Choice recorded in [[Design Direction]] | 0 | [[Design Direction]] |
| H-026 | P1 | spec-writer | todo | — | RJ | Apply [[ADR-0005 MVP Product Defaults]]: SPEC-001 remove the alias and release-date tables; SPEC-002 set legality from the API's released sets plus Riot-published dates only; SPEC-004 CAT-042/043 show banned decks by default with a label; SPEC-003 confirm IMP-048/053 | Specs bumped to 0.2; validator re-check | 0 | [[ADR-0005 MVP Product Defaults]] |
| H-015 | P1 | spec-writer | todo | — | validator | Align SPEC-001 ↔ SPEC-002: nullable/unknown `domains`/`isSignature`/`isChampion`/`championTag`; one champion field name; overnumbered → `variant.kind`; `type`/`category` mapping; define `catalogVersion`; CARD-036 set+number lookup → MUST with collector-number normalization; SPEC-003 A1 resolved / A2 bound to CARD-036 | Validator re-check of the cross-spec issues passes | 0 | [[Card Data Model]] |
| H-016 | P1 | spec-writer | todo | — | validator | SPEC-004: FormatId `standard` (also in the Decklist template), `cardKey` instead of `cardId`, DecklistLegality ↔ LegalityResult mapping (historical = LEGAL-016 fail; handling `incomplete`) | as H-015 | 0 | [[Tournament Deck Catalog]] |
| H-017 | P1 | spec-writer | todo | — | validator | Fix the ACs that are wrong under CARD-030 (SPEC-001 AC5, SPEC-003 AC10, SPEC-004 AC7) and the IMP-006 printing count (1,451) | as H-015 | 0 | [[Spec Index]] |
| H-018 | P2 | spec-writer | todo | H-015 | validator | Clean-up: When clauses in SPEC-003 ACs 10/12/14/15/17/18/21; IMP-011→IMP-031; LEGAL-C04 level; ADR-0003 wikilinks; CAT-004 reference; LEGAL-B08 announced-date semantics; source links on LEGAL-019/R02/R04/R07 | V-009 | 0 | [[Spec Index]] |
| H-019 | P1 | researcher | todo | — | validator | Add `rank`, `format: standard`, `legal_as_of` to the 8 RC Europe decklist notes; fix the template's `placing` comment | V-009; CAT-011 consistent | 0 | [[Tournament Results]] |
| H-021 | P1 | researcher | todo | H-020 | spec-writer | Analyze the live API payload: field names, id format, type and domain lists, champion/signature/championTag fields, preview flag, variants, promos and tokens, image aspect ratio and size; propose the first `variant-rules.json` entries | Card Data & Images note updated; BLOCKED items in SPEC-001/002 resolved or listed | 0 | [[Card Data & Images]] |
| H-022 | P2 | researcher | todo | — | spec-writer | Open research: rotation conflict; whether the Signature cap spans the sideboard; canonical name for "The Dreaming Tree"; time zone of ban effective dates; whether promos (OPP/JDG/PR) are legal; official release dates for OGN–VEN; battlefield domains; Piltover set table (UNL/VEN/RAD, ARC, variant letters, sample codes); CSV/TXT export samples; TTS COPY suffix; RC Europe official name, player total, bracket; a verbatim Riot decklist text sample | Notes updated, statuses honest | 0 | [[Research Index]] |
| H-024 | P1 | ui-builder | blocked | H-023 | ui-builder | Apply the chosen design direction to the tokens; original favicon (no Riot marks) | V-008, V-012 | 0 | [[Design Direction]] |
| H-025 | P2 | validator | todo | — | ui-builder | Activate V-008 for web/ (lint, build, test) and extend V-010 search terms for cross-deck counts and shares (CAT-061/063) | Validation Checks updated | 0 | [[Validation Checks]] |
| H-011 | P2 | RJ | needs-RJ | H-009 | researcher | Once there's a working local prototype, put a demo or mockup at a reachable URL and apply via Register Product ([[Riot App Application]]). Ask in an App Note: (a) caching vs. hotlinking card images, (b) whether decklists hand-copied from Riot's articles are OK, (c) storing an API snapshot locally for development, (d) a permitted source for TCGplayer IDs | Application submitted with the App Note | 0 | [[Riot Developer Rules]] |
| H-007 | P2 | spec-writer | todo | H-015, H-016, H-026 | RJ | SPEC-005 Build Matching (sort by completion %, then event recency) | as H-003; V-010 | 0 | [[Spec Index]] |
| H-008 | P1 | service-builder | todo | H-015 | RJ | Scaffold the TypeScript API in `services/`, host-neutral per ADR-0001, and the card data pipeline from the Riot API using the dev key in `.env`, snapshotted to `data/`. No Riftcodex ([[Riot Developer Rules]]) | V-003, V-008, V-011, V-012 activated and passing | 0 | [[API Contracts]] |
| H-012 | P3 | RJ | blocked | MVP complete | RJ | Choose hosting: Firebase vs. AWS, whichever is cheaper | ADR-0004 accepted | 0 | [[ADR-0004 Hosting (Deferred)]] |

## Done
| ID | Owner | Request | Result |
|---|---|---|---|
| H-003 | spec-writer | SPEC-001 Card Data Model | PASS v0.1 draft, 45 reqs; follow-ups H-015, H-017 ([[Card Data Model]]) |
| H-004 | spec-writer | SPEC-002 Deck Legality | PASS v0.1 draft, 43 reqs, 4 ban waves as data; follow-up H-015 ([[Deck Legality]]) |
| H-005 | spec-writer | SPEC-003 Collection Import | PASS v0.1 draft, 57 reqs; follow-ups H-017, H-018 ([[Collection Import]]) |
| H-006 | spec-writer | SPEC-004 Tournament Deck Catalog | PASS v0.1 draft, 46 reqs; follow-up H-016 ([[Tournament Deck Catalog]]) |
| H-009 | ui-builder | Angular scaffold | PASS: Angular 22.3, 5 routed placeholder screens, legal footer, lint/build/tests green; review gate H-023 ([[Design Direction]]) |
| H-013 | RJ | Riot dev key + developer rules | Key stored in gitignored `.env`; rules applied to specs, agents, and checks ([[Riot Developer Rules]]) |
| H-002 | RJ | Tech stack | Accepted: Angular + TypeScript API, local-first; hosting deferred ([[ADR-0001 Tech Stack]]) |
| H-010 | RJ | Metagame-data policy | Decided: tournament results only, no stats ([[ADR-0003 Tournament Results Only]]) |
| H-001 | researcher | First research pass | PASS 2026-11-23: 9 topic notes + 8 European Championship Top 8 decklists ([[Validation Runs]]) |
