---
tags: [spec]
id: SPEC-009
version: 0.2
status: draft
depends_on: [SPEC-001, SPEC-002, SPEC-005, SPEC-006, SPEC-007, SPEC-008]
research: ["[[Physical Copies Across Decks]]", "[[Deck Construction Rules]]"]
decisions: ["[[ADR-0006 Two Imports - Collection and Decks]]"]
board: H-058
as_of: 2026-11-23
---
# SPEC-009: Runes Assumed Owned

## Summary
> Read this first. Full detail below only if needed.

**Purpose:** RJ's simplification (ADR-0006 "Shared cards, lock in and runes"): **the user always has the
runes a deck needs.** Runes never count as missing, never block "complete" or lock in, never take part in
shared or locked counting, and are not needed in the Collection.

**Key rules**
- RUNE-001: a **rune entry** is any deck entry in the `runes` zone, or any entry whose catalog card has
  `category: 'rune'`.
- RUNE-002/003: rune entries are always full colour and never in the missing list, the copy-missing text or
  the SPEC-005 summary counts.
- RUNE-004/005: they never affect completeness, lock in, shared indicators or holds (SPEC-008).
- RUNE-006: the Runes section is still shown, tiles labelled "Assumed owned", with the note "Runes
  aren't tracked. Rift Builder assumes you have the runes this deck needs."
- RUNE-008: Collection never asks for runes; imported runes are listed but never read by Decks.
- RUNE-009: legality (SPEC-002 LEGAL-008/009) is unchanged.

**Depends on:** [[Card Data Model]] v0.3, [[Deck Legality]] v0.3, [[Your Decks Ownership View]] v0.4,
[[Deck Import]] v0.6, [[My Collection]] v0.5, [[Shared Cards and Lock-in]] v0.2. **Consumers:** SPEC-005,
SPEC-007, SPEC-008.
**Known simplification (not a requirement):** domain split and possible non-basic runes in later sets (see
Open questions).

## Purpose
A Riftbound deck has a 12-card Rune Deck of basic runes ([[Deck Construction Rules]] #7). Runes have no
per-name copy limit, every Champion Deck ships 12 of them and every booster has a rune slot
([[Physical Copies Across Decks]] facts 10, 11, 12). Tracking them would make almost every deck look
incomplete for users who never import their runes. RJ decided to ignore them.

## Definitions
- **Rune entry**: RUNE-001.
- **Counted entry**, **complete**, **hold**: SPEC-008.

## Requirements
| ID | Level | Requirement | Source |
|---|---|---|---|
| RUNE-001 | MUST | A **rune entry** is a `DeckCard` in the `runes` zone, or a `DeckCard` in any zone whose catalog card has `category === 'rune'` (SPEC-001 CARD-024). When the catalog is not loaded, the card is unknown (OWN-061) or its category is `'unknown'`, only the zone decides. `isRuneEntry(zone, card)` is the one shared test. | [[ADR-0006 Two Imports - Collection and Decks]] "Shared cards, lock in and runes"; [[Physical Copies Across Decks]] fact 10; [[Card Data Model]] CARD-024 |
| RUNE-002 | MUST | A rune entry is **always treated as owned**: in SPEC-005 its tile is full colour (`allocated = qty`, `fill = 1`), never darkened or partly filled, whatever the collection holds and even when ownership is unavailable. No `deckOwnership()` call is made for it. | [[ADR-0006 Two Imports - Collection and Decks]] ("assume the user always has the required runes") |
| RUNE-003 | MUST | Rune entries **never count as missing**: they are not in the SPEC-005 missing list (OWN-051), the "Copy missing list" text has no `Rune Pool:` section (OWN-052, OWN-053), and they are left out of the deck summary counts R, A, C and F (OWN-050) and the section owned counts. | [[ADR-0006 Two Imports - Collection and Decks]] |
| RUNE-004 | MUST | Rune entries **never block completeness or lock in** (SPEC-008 SHARE-014, SHARE-020), whether or not the user owns any runes. | [[ADR-0006 Two Imports - Collection and Decks]] |
| RUNE-005 | MUST | Rune entries **never take part in shared or locked counting** (SPEC-008 SHARE-001): no need, no hold, no "Also in N other decks" indicator, no breakdown, and they never appear in another deck's "Other decks using this card" list. | [[ADR-0006 Two Imports - Collection and Decks]] |
| RUNE-006 | MUST | **Display.** The Runes section stays in its SPEC-005 place (OWN-011) with the heading "Runes · `<n>` cards · not tracked" and the note "Runes aren't tracked. Rift Builder assumes you have the runes this deck needs." Each rune tile shows its card info and ban status like any card (OWN-014, OWN-015) and the label **"Assumed owned"** instead of "`<a>` of `<q>` …", with an info icon distinct from the owned check icon (so "assumed" is not shown as "owned"). Accessible name e.g. "Chaos Rune, Runes, 9 copies, assumed owned". | design rule; [[Your Decks Ownership View]] OWN-011, OWN-014, OWN-015, OWN-033 |
| RUNE-007 | MAY | A rune tile's details MAY show the copies the user has in Collection ("You have 6 in your collection") as information only; nothing counts. | design rule |
| RUNE-008 | MUST | **Collection doesn't need runes.** Collection and Owned Cards Import never ask for runes or warn that runes are missing. Runes the user does import are listed, tagged and edited like any card (SPEC-007), but their counts and tags never affect Decks. | [[ADR-0006 Two Imports - Collection and Decks]] ("not required in the Collection") |
| RUNE-009 | MUST | **Legality is unchanged.** SPEC-002 still checks the Rune Deck (LEGAL-008 exactly 12 runes, LEGAL-009 domain identity) and LEGAL-015 still flags a rune in `main`. This spec only changes ownership. | [[Deck Legality]] LEGAL-008, LEGAL-009, LEGAL-015; [[Deck Construction Rules]] #7 |
| RUNE-010 | MUST | Deck storage, import and export are unchanged: rune entries are stored, imported and exported (DECK-085 `Rune Pool:`) as before. | [[Deck Import]] DECK-085, DECK-096 |

## Data contract
```ts
// shapes only; no implementation
import type { DeckZone } from './deck-import';          // SPEC-006
import type { PlayableCard } from './card-data-model';  // SPEC-001
// isRuneEntry(zone: DeckZone, card: PlayableCard | null): boolean — pure (RUNE-001)
//   zone === 'runes' || card?.category === 'rune'
// SPEC-005 OwnershipCard gets `isRune: boolean` and the label 'Assumed owned' (RUNE-006).
```

## Acceptance criteria
`KENNEN_1` is [[2026-11 RC Europe - 1 - ASC Evansrhim - Kennen]]: 66 copies in 32 distinct cards, of which
12 copies (`Chaos Rune` ×9, `Order Rune` ×3) in 2 rune cards, so 54 counted copies in 30 counted cards.

1. **Empty collection** (RUNE-002, RUNE-003, RUNE-006)
   **Given** `KENNEN_1` and an empty collection **When** the deck view opens **Then** the Runes section reads
   "Runes · 12 cards · not tracked" with the note, `Chaos Rune` ×9 and `Order Rune` ×3 are full colour and
   labelled "Assumed owned"; the summary reads "0 of 54 copies available" and "0 of 30 cards fully
   available"; the missing list has 54 copies and no Runes group; "Copy missing list" has no `Rune Pool:` line.
2. **All but runes owned** (RUNE-004)
   **Given** `KENNEN_1` and a collection with every counted card in full and no runes **When** the deck view
   opens **Then** the summary reads "54 of 54 copies available", "All cards available" shows for the missing
   list, and Lock in is enabled.
3. **Runes are never shared** (RUNE-005)
   **Given** two decks with `Chaos Rune` in their Runes, and one of them locked **When** either deck's view
   opens **Then** neither Chaos Rune tile shows "Also in 1 other deck", and neither deck's breakdowns list the
   other for Chaos Rune.
4. **Rune in the wrong zone** (RUNE-001, RUNE-009)
   **Given** a deck with `Chaos Rune` ×1 in Main and a catalog where it has `category: 'rune'` **When** the
   deck view opens **Then** its tile is "Assumed owned", it is not in the missing list, and SPEC-002
   LEGAL-015 still reports it.
5. **Imported runes are listed, not used** (RUNE-008)
   **Given** a deck that needs `Fury Rune` ×6 and an empty collection **When** the user imports `6 Fury Rune`
   with Owned Cards Import and then opens Collection and the deck **Then** Collection lists it like any card,
   and the deck's counts are the same as before the import. **Given** a collection with no runes **When**
   Collection opens **Then** it shows no "missing runes" warning.

## Out of scope
- Tracking rune counts or domains per deck.
- Tokens (not cards, [[Physical Copies Across Decks]] fact 13).

## Open questions / BLOCKED
1. **Known simplification (not a requirement):** a user with 6 Fury runes has none of the 9 Chaos runes a
   deck needs; this spec still treats them as owned. Runes are cheap and plentiful (facts 11, 12).
2. **Known simplification, recheck with H-021:** whether **non-basic runes** (special rune cards) exist in
   later sets wasn't checked against the live card list ([[Physical Copies Across Decks]], Conflicts). If they
   appear, RJ decides whether they should be tracked; until then RUNE-001 treats every rune alike.

## Changelog
Current: 0.2 (2026-11-23, H-065/H-067). Full history: [[Runes Assumed Owned changelog]] (archived). New entries go in the archive note.
