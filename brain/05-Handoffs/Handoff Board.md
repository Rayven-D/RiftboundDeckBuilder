---
tags: [handoffs, loop]
next_id: 38
---
# Handoff Board

The loop's state. See [[Loop Protocol]]. One row per item. Take the next ID from `next_id` and increment it.

**Status:** `todo` · `doing` · `verify` · `done` · `blocked` · `needs-RJ`  **Priority:** P0 (urgent) → P3
**Owners:** researcher · spec-writer · service-builder · ui-builder · validator · RJ

## Open
| ID | Pri | Owner | Status | Depends | From | Request | Accept | Tries | Link |
|---|---|---|---|---|---|---|---|---|---|
| H-034 | P1 | spec-writer | todo | H-036 | validator | SPEC-007 fixes: types per SPEC-003 v0.2 (`CardKey`, `printingId` keys, keep the public code for display); COLL-065 count/source (Riot API; 1,451 community count); use SPEC-002 `banStatus()`/`BanStatus`; category `unknown` bucket; refresh open questions; When in AC17; apply the H-036 answers (ADR-0006): one entry per printing with a count badge (no default name grouping), **tags on printings**, a tag "exclude from decks" flag, default order printingSortKey | Validator PASS | 0 | [[My Collection]] |
| H-035 | P1 | spec-writer | todo | H-036 | validator | SPEC-004 fixes: CAT-050 `cardKey`; a source for `BannedCardRef.kind` (add `banKind` to SPEC-002 `Violation` or look it up in banlist.json); refresh open questions; apply the H-036 answers | Validator PASS | 0 | [[Tournament Deck Catalog]] |
| H-037 | P2 | spec-writer | todo | H-036 | validator | One meaning for `legal_as_of` (template, 8 notes, CAT-017); dates as `Nov 23, 2026` and the incomplete label "Not fully checked" across SPEC-004/006/007 | Validator PASS | 0 | [[Spec Index]] |
| H-020 | P0 | RJ | needs-RJ | — | validator | Fetch one live Riot API response on your PC (the sandboxes are blocked) and save it to `data/raw/riftbound-content-en.json` (the PowerShell command is in the Session Log) | File exists, valid JSON | 0 | [[Card Data Model]] |
| H-023 | P1 | RJ | needs-RJ | — | ui-builder | UI review gate: run the app (`cd web; npm install; npx ng serve`), pick design direction A/B/C + accent, wordmark and nav OK? (product defaults are answered in ADR-0005) | Choice recorded in [[Design Direction]] | 0 | [[Design Direction]] |
| H-030 | P0 | spec-writer | todo | H-036 | RJ | SPEC-006 Deck Import, retry 1 (WIP on branch `loop/H-030-deck-import`). Make the tournament deck source ONE type shared with SPEC-004 `TournamentDeckSource`; default name and duplicate handling identical to CAT-072–074 per H-036; `isChampion` → `isChampionUnit`; zone inference on the SPEC-001 category enum (`unknown`; rules for champion/spell/gear/token); DECK-065 vs CAT-071 (no name parsing for catalog decks); DECK-092 = 66; When in AC7/16; refresh open questions; DECK-013 vs SPEC-003 Part A | Validator PASS on cross-spec checks | 1 | [[Deck Import]] |
| H-021 | P1 | researcher | todo | H-020 | spec-writer | Analyze the live API payload: field names, id format, type and domain lists, champion/signature/championTag fields, preview flag, variants, promos and tokens, image aspect ratio and size; propose the first `variant-rules.json` entries | Card Data & Images note updated; BLOCKED items in SPEC-001/002 resolved or listed | 0 | [[Card Data & Images]] |
| H-022 | P2 | researcher | todo | — | spec-writer | Open research: rotation conflict; whether the Signature cap spans the sideboard; canonical name for "The Dreaming Tree"; time zone of ban effective dates; whether promos (OPP/JDG/PR) are legal; official release dates for OGN–VEN; battlefield domains; Piltover set table (UNL/VEN/RAD, ARC, variant letters, sample codes); CSV/TXT export samples; TTS COPY suffix; RC Europe official name, player total, bracket; a verbatim Riot decklist text sample | Notes updated, statuses honest | 0 | [[Research Index]] |
| H-024 | P1 | ui-builder | blocked | H-023 | ui-builder | Apply the chosen design direction to the tokens; original favicon (no Riot marks) | V-008, V-012 | 0 | [[Design Direction]] |
| H-011 | P2 | RJ | needs-RJ | H-009 | researcher | Once there's a working local prototype, put a demo or mockup at a reachable URL and apply via Register Product ([[Riot App Application]]). Ask in an App Note: (a) caching vs. hotlinking card images, (b) whether decklists hand-copied from Riot's articles are OK, (c) storing an API snapshot locally for development, (d) a permitted source for TCGplayer IDs | Application submitted with the App Note | 0 | [[Riot Developer Rules]] |
| H-007 | P1 | spec-writer | todo | H-030, H-034, H-035 | RJ | SPEC-005 Your Decks Ownership View (replaces Build Matching): per-card owned/required by name; full colour / darkened-but-readable / partial colour fill by fraction, **left to right**; ban status and card info on every card; deck-level summary; grouped by card name with expand to show owned printings; owned(cardKey) excludes printings with an "exclude from decks" tag (shown as owned but excluded) (ADR-0006 H-036) | as H-003; V-010 | 0 | [[ADR-0006 Two Imports - Collection and Decks]] |
| H-008 | P1 | service-builder | todo | H-015 | RJ | Scaffold the TypeScript API in `services/`, host-neutral per ADR-0001, and the card data pipeline from the Riot API using the dev key in `.env`, snapshotted to `data/`. No Riftcodex ([[Riot Developer Rules]]) | V-003, V-008, V-011, V-012 activated and passing | 0 | [[API Contracts]] |
| H-012 | P3 | RJ | blocked | MVP complete | RJ | Choose hosting: Firebase vs. AWS, whichever is cheaper | ADR-0004 accepted | 0 | [[ADR-0004 Hosting (Deferred)]] |

## Done
| ID | Owner | Request | Result |
|---|---|---|---|
| H-036 | RJ | Gate decisions | Recorded in [[ADR-0006 Two Imports - Collection and Decks]]: name Legend + pilot + placing; In Your decks + Add another copy; printings separate in My Collection with count badge and tags on printings; Your decks grouped by name with expand; tags excludable from decks |
| H-015 | spec-writer | SPEC-001/002 alignment | PASS: v0.2, nullable attrs, isChampionUnit, catalogVersion, CARD-036/037, printingSortKey, Riot-only set legality |
| H-016 | spec-writer | SPEC-004 fixes | PASS v0.2 with follow-ups → H-035 |
| H-017 | spec-writer | Wrong ACs + counts | PASS (SPEC-001 AC5, SPEC-003 AC10, SPEC-004 AC7, IMP-006) |
| H-018 | spec-writer | Spec clean-ups | PASS |
| H-019 | researcher | Decklist backfill | PASS: placing = published rank, format, legal_as_of (no separate rank field); meaning of legal_as_of → H-037 |
| H-026 | spec-writer | Apply ADR-0005/0006 | PASS; Add to Your decks contradiction moved to H-030 |
| H-031 | spec-writer | SPEC-007 My Collection | PASS v0.1 with follow-ups → H-034 |
| H-025 | validator | Activate V-008 (web), extend V-010 | Done ([[Validation Checks]]) |
| H-033 | ui-builder | Import screen option cards (RJ feedback) | Two cards, Owned Cards Import and Deck Import, with subtext ([[Design Direction]]) |
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
