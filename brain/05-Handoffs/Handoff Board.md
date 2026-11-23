---
tags: [handoffs, loop]
next_id: 43
---
# Handoff Board

The loop's state. See [[Loop Protocol]]. One row per item. Take the next ID from `next_id` and increment it.

**Status:** `todo` · `doing` · `verify` · `done` · `blocked` · `needs-RJ`  **Priority:** P0 (urgent) → P3
**Owners:** researcher · spec-writer · service-builder · ui-builder · validator · RJ

## Open
| ID | Pri | Owner | Status | Depends | From | Request | Accept | Tries | Link |
|---|---|---|---|---|---|---|---|---|---|
| H-042 | P2 | RJ | needs-RJ | — | RJ | Recreate the weekly research refresh (Mon 6:58 pm Central, requires RJ's PC) as a scheduled task inside the Claude project "Riftbound Deck Generator". The prompt is in the 2026-11-23 chat. The old task was deleted. Until then, run `/research-refresh` manually. | Scheduled task exists in the project | 0 | [[Loop Protocol]] |
| H-040 | P2 | spec-writer | todo | — | validator | SPEC-005 fixes: section order = Riot decklist order (Legend, Champion, Main, Battlefields, Runes, Sideboard; ADR-0006 "Your decks view decisions"; also update OWN-022 allocation to Main first in that order: Legend → Champion → Main → Battlefields → Runes → Sideboard); verdict labels match CAT-045/DECK-051 via LEGAL-R08 and `FormatDef.name`; pass tag names (TagStore/tag lookup) into the expand; reuse SPEC-007 `CollectionCatalogView` and `DeckOwnershipInput`, and call `deckOwnership(input, cardKey)`; add `isChampionUnit` to OWN-060; bump dependency versions; OWN-061 cites the right CARD rule | V-009 + cross-spec re-check | 0 | [[Your Decks Ownership View]] |
| H-020 | P0 | RJ | needs-RJ | — | validator | Fetch one live Riot API response on your PC (the sandboxes are blocked) and save it to `data/raw/riftbound-content-en.json` (the PowerShell command is in the Session Log) ; or `cd services; npm install; npm run ingest:cards` then `npm run check:decklists` (closes V-003 for H-008) | File exists, valid JSON; V-003 passes | 0 | [[Card Data Model]] |
| H-023 | P1 | RJ | needs-RJ | — | ui-builder | UI review gate: run the app (`cd web; npm install; npx ng serve`), pick design direction A/B/C + accent, wordmark and nav OK? (product defaults are answered in ADR-0005) | Choice recorded in [[Design Direction]] | 0 | [[Design Direction]] |
| H-021 | P1 | researcher | todo | H-020 | spec-writer | Analyze the live API payload: field names, id format, type and domain lists, champion/signature/championTag fields, preview flag, variants, promos and tokens, image aspect ratio and size; propose the first `variant-rules.json` entries | Card Data & Images note updated; BLOCKED items in SPEC-001/002 resolved or listed | 0 | [[Card Data & Images]] |
| H-022 | P2 | researcher | todo | — | spec-writer | Open research: rotation conflict; whether the Signature cap spans the sideboard; canonical name for "The Dreaming Tree"; time zone of ban effective dates; whether promos (OPP/JDG/PR) are legal; official release dates for OGN–VEN; battlefield domains; Piltover set table (UNL/VEN/RAD, ARC, variant letters, sample codes); CSV/TXT export samples; TTS COPY suffix; RC Europe official name, player total, bracket; a verbatim Riot decklist text sample | Notes updated, statuses honest | 0 | [[Research Index]] |
| H-024 | P1 | ui-builder | blocked | H-023 | ui-builder | Apply the chosen design direction to the tokens; original favicon (no Riot marks) | V-008, V-012 | 0 | [[Design Direction]] |
| H-011 | P2 | RJ | needs-RJ | H-009 | researcher | Once there's a working local prototype, put a demo or mockup at a reachable URL and apply via Register Product ([[Riot App Application]]). Ask in an App Note: (a) caching vs. hotlinking card images, (b) whether decklists hand-copied from Riot's articles are OK, (c) storing an API snapshot locally for development, (d) a permitted source for TCGplayer IDs | Application submitted with the App Note | 0 | [[Riot Developer Rules]] |
| H-012 | P3 | RJ | blocked | MVP complete | RJ | Choose hosting: Firebase vs. AWS, whichever is cheaper | ADR-0004 accepted | 0 | [[ADR-0004 Hosting (Deferred)]] |

## Done
Latest 10 only. Older: [[Board Done 2026-11-23]] (archived).
| ID | Owner | Request | Result |
|---|---|---|---|
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
