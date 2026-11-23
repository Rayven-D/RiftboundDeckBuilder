---
tags: [handoffs, loop]
next_id: 40
---
# Handoff Board

The loop's state. See [[Loop Protocol]]. One row per item. Take the next ID from `next_id` and increment it.

**Status:** `todo` · `doing` · `verify` · `done` · `blocked` · `needs-RJ`  **Priority:** P0 (urgent) → P3
**Owners:** researcher · spec-writer · service-builder · ui-builder · validator · RJ

## Open
| ID | Pri | Owner | Status | Depends | From | Request | Accept | Tries | Link |
|---|---|---|---|---|---|---|---|---|---|
| H-039 | P1 | spec-writer | todo | — | RJ | Add a **Summary** block (~20 lines: purpose, key requirements, shared types, open blockers) at the top of every spec; move each spec's Changelog to `Archive/Spec-Changelogs/<spec>.md` (leave a one-line link); apply the round-3 P2 clean-ups from [[Validation Runs]] (CAT-021 row, CAT-071→DECK-065, CAT-073 80-char trim, stale open questions in SPEC-004/006/007, SPEC-007 input contracts carry catalog/ban data/today, CARD-016 MUST or fallback for COLL-012/014, SPEC-002 messages use Nov 23, 2026 and "Standard", SPEC-003 Part A preamble lists deck exceptions) | V-009; summaries ≤ 25 lines | 0 | [[Spec Index]] |
| H-020 | P0 | RJ | needs-RJ | — | validator | Fetch one live Riot API response on your PC (the sandboxes are blocked) and save it to `data/raw/riftbound-content-en.json` (the PowerShell command is in the Session Log) ; or `cd services; npm install; npm run ingest:cards` then `npm run check:decklists` (closes V-003 for H-008) | File exists, valid JSON; V-003 passes | 0 | [[Card Data Model]] |
| H-023 | P1 | RJ | needs-RJ | — | ui-builder | UI review gate: run the app (`cd web; npm install; npx ng serve`), pick design direction A/B/C + accent, wordmark and nav OK? (product defaults are answered in ADR-0005) | Choice recorded in [[Design Direction]] | 0 | [[Design Direction]] |
| H-021 | P1 | researcher | todo | H-020 | spec-writer | Analyze the live API payload: field names, id format, type and domain lists, champion/signature/championTag fields, preview flag, variants, promos and tokens, image aspect ratio and size; propose the first `variant-rules.json` entries | Card Data & Images note updated; BLOCKED items in SPEC-001/002 resolved or listed | 0 | [[Card Data & Images]] |
| H-022 | P2 | researcher | todo | — | spec-writer | Open research: rotation conflict; whether the Signature cap spans the sideboard; canonical name for "The Dreaming Tree"; time zone of ban effective dates; whether promos (OPP/JDG/PR) are legal; official release dates for OGN–VEN; battlefield domains; Piltover set table (UNL/VEN/RAD, ARC, variant letters, sample codes); CSV/TXT export samples; TTS COPY suffix; RC Europe official name, player total, bracket; a verbatim Riot decklist text sample | Notes updated, statuses honest | 0 | [[Research Index]] |
| H-024 | P1 | ui-builder | blocked | H-023 | ui-builder | Apply the chosen design direction to the tokens; original favicon (no Riot marks) | V-008, V-012 | 0 | [[Design Direction]] |
| H-011 | P2 | RJ | needs-RJ | H-009 | researcher | Once there's a working local prototype, put a demo or mockup at a reachable URL and apply via Register Product ([[Riot App Application]]). Ask in an App Note: (a) caching vs. hotlinking card images, (b) whether decklists hand-copied from Riot's articles are OK, (c) storing an API snapshot locally for development, (d) a permitted source for TCGplayer IDs | Application submitted with the App Note | 0 | [[Riot Developer Rules]] |
| H-007 | P1 | spec-writer | todo | — | RJ | SPEC-005 Your Decks Ownership View (replaces Build Matching): per-card owned/required by name; full colour / darkened-but-readable / partial colour fill by fraction, **left to right**; ban status and card info on every card; deck-level summary; grouped by card name with expand to show owned printings; owned(cardKey) excludes printings with an "exclude from decks" tag (shown as owned but excluded) (ADR-0006 H-036) | as H-003; V-010; reads SPEC-007 `deckOwnership()` (COLL-081) | 0 | [[ADR-0006 Two Imports - Collection and Decks]] |
| H-012 | P3 | RJ | blocked | MVP complete | RJ | Choose hosting: Firebase vs. AWS, whichever is cheaper | ADR-0004 accepted | 0 | [[ADR-0004 Hosting (Deferred)]] |

## Done
Latest 10 only. Older: [[Board Done 2026-11-23]] (archived).
| ID | Owner | Request | Result |
|---|---|---|---|
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
