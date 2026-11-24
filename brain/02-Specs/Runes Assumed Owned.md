---
tags: [spec]
id: SPEC-009
version: 0.3
status: withdrawn
withdrawn_on: 2026-11-24
superseded_by: ["[[Your Decks Ownership View]] OWN-028", "[[Shared Cards and Lock-in]] SHARE-006", "[[My Collection]] COLL-089", "[[Collection Import]] IMP-071"]
depends_on: []
research: ["[[Physical Copies Across Decks]]", "[[Deck Construction Rules]]"]
decisions: ["[[ADR-0006 Two Imports - Collection and Decks]]"]
board: H-097
as_of: 2026-11-24
---
# SPEC-009: Runes Assumed Owned (withdrawn)

## Summary
> **Withdrawn 2026-11-24 (v0.3, H-097). Don't build from this note.** It is kept for history and so
> the RUNE-001…010 IDs stay traceable. No requirement here is in force.

**RJ's decision (2026-11-24):** "Let's change the rune specifications. Allow users to import runes as well
and treat them like any other card." This reverses the 2026-11-23 rule (ADR-0006 "Shared cards, lock in
and runes") that runes are assumed owned.

**What replaces it:** runes have **no special case anywhere**. A rune is a card with `category: 'rune'`
in the `runes` zone, imported, counted, shared, locked, listed and exported like every other card:
- SPEC-003 [[Collection Import]] **IMP-071**: runes are imported and exported like any card.
- SPEC-005 [[Your Decks Ownership View]] **OWN-028**: rune entries are counted entries (full / partial /
  none, missing list, summary); OWN-022a withdrawn.
- SPEC-007 [[My Collection]] **COLL-089**: runes are listed and count toward decks like any card;
  COLL-087 withdrawn.
- SPEC-008 [[Shared Cards and Lock-in]] **SHARE-006**: the Runes zone is a counted zone (shared pool,
  completeness, lock in, holds).
- SPEC-002 [[Deck Legality]]: unchanged (LEGAL-008, LEGAL-009, LEGAL-015 still check the Rune Deck).
- SPEC-006 [[Deck Import]]: unchanged (runes were always imported into the `runes` zone and exported
  under `Rune Pool:`).

**Why withdraw instead of rewriting as "Runes are cards":** the new behaviour is the absence of a rule.
Each consequence belongs to the spec that owns that behaviour (allocation in SPEC-005, the pool in
SPEC-008, the list in SPEC-007, the parser in SPEC-003), and each of those now states it with a new ID
and an AC. A rewritten SPEC-009 would hold only cross-references, keep a dependency edge from four specs
to a note with no rules of its own, and invite a future "rune exception" to be added back there. The
`isRuneEntry()` test it defined is no longer needed by any spec.

## Withdrawn requirements
| ID | Was | Status | Replaced by |
|---|---|---|---|
| RUNE-001 | Definition of a rune entry (`runes` zone or `category: 'rune'`), `isRuneEntry()` | withdrawn 2026-11-24 | none: no spec distinguishes rune entries for ownership any more |
| RUNE-002 | Rune entries always full colour, no `deckOwnership()` call | withdrawn 2026-11-24 | SPEC-005 OWN-028 (allocated like any card) |
| RUNE-003 | Never in the missing list, `Rune Pool:` copy text or summary counts | withdrawn 2026-11-24 | SPEC-005 OWN-028, OWN-050, OWN-051, OWN-052 |
| RUNE-004 | Never block completeness or lock in | withdrawn 2026-11-24 | SPEC-008 SHARE-006, SHARE-014 |
| RUNE-005 | Never shared or locked | withdrawn 2026-11-24 | SPEC-008 SHARE-001, SHARE-006 |
| RUNE-006 | Runes section "not tracked", tiles "Assumed owned" | withdrawn 2026-11-24 | SPEC-005 OWN-011, OWN-033 (same heading and labels as any section) |
| RUNE-007 | MAY: rune tile shows Collection copies as information only | withdrawn 2026-11-24 | SPEC-005 OWN-041, OWN-042 (the normal expand) |
| RUNE-008 | Collection never needs runes; imported runes never affect Decks | withdrawn 2026-11-24 | SPEC-007 COLL-089, SPEC-003 IMP-071 |
| RUNE-009 | Legality unchanged | withdrawn 2026-11-24 (still true) | SPEC-002 LEGAL-008, LEGAL-009, LEGAL-015, unchanged |
| RUNE-010 | Deck storage, import and export unchanged | withdrawn 2026-11-24 (still true) | SPEC-006 DECK-020, DECK-085, DECK-096, unchanged |

Tests named after RUNE-xxx IDs are renamed or replaced by tests named after the new IDs (H-098).

## Facts behind the change
- A Rune Deck is 12 Rune cards matching the Domain Identity ([[Deck Construction Rules]] #7). There are
  six basic runes and no per-name copy limit, so one deck can need up to 12 of one rune name, e.g. 9
  `Chaos Rune` in [[2026-11 RC Europe - 1 - ASC Evansrhim - Kennen]] ([[Physical Copies Across Decks]]
  fact 10).
- Rune printings exist beyond the basic one: an Origins booster's Token/Rune slot is "usually a basic
  rune, sometimes a foil or a very rare alt-art rune" ([[Physical Copies Across Decks]] fact 11, official,
  as of 2026-11-23). All printings of a name share it (fact 14), so they share one pool like any card.
- **Not yet verified:** whether the Riot API (`riftbound-content-v1`) lists rune cards with their own
  printings, set codes and collector numbers, so that Collection can show one tile per rune printing.
  [[Card Data & Images]] has no rune fact. Research item: H-099 (needs H-020).

## Previous content (v0.2, 2026-11-23, history only)
v0.2 defined RUNE-001…010 above: runes were assumed owned, left out of the missing list, summary,
completeness, lock in and shared counting, shown as "Assumed owned" under "Runes · `<n>` cards · not
tracked", and never needed in Collection. Full text: git history of this note before 2026-11-24, and
[[Runes Assumed Owned changelog]].

## Changelog
Current: 0.3 (2026-11-24, H-097, withdrawn). Full history: [[Runes Assumed Owned changelog]] (archived). New entries go in the archive note.
