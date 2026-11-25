---
tags: [validation]
item: H-252
---
# Validation H-252

2026-11-25 · H-252 · FAIL · two small wording / count errors, no design gap (see below).

## Checks
- **H-260 and section 13a trace (PASS):** #1 Legend art fill by deck A/R plus % (OWN-100, 101, AC 23 to 25); header name, description, "X of Y copies available" (OWN-010, AC 28); #8 persistent right panel, first card selected, phones dialog (OWN-111, 113, AC 27, 29); #12 tabs Card / Missing (OWN-111); #14 Rename only, card editor deferred (OWN-118, DECK-080, DECK-081); Legend-named import (DECK-070, AC 26); rename while locked (SHARE-025, AC 22, 31); tile = one link (OWN-002, AC 26); tournament player and event (OWN-003, 104); Collection-like scroll with section bar (OWN-110); Card / List view (OWN-114, AC 30); #13 jump bar kept. Deferred: OWN-013, OWN-039, DECK-080 marked deferred. Unsettled items are Open questions 10 to 15 (SPEC-005) and (a) to (c) (SPEC-006) with options and a default. RJ answers attributed with date.
- **OWN-101 formula (PASS):** 34/66 = 51 %, 65/66 = 98 %, 1/300 = 1 %, 299/300 = 99 %, 66/66 = 100 %, 0/66 = 0 %, 50/54 = 92 %; data contract and ACs agree; R = 0 and unavailable give null.
- **No over-claiming (PASS):** OWN-054 and design decision 6 match ADR-0003 (forbids play / win rates, matchup data, tier lists, archetype shares, meta score; the old "no percentage" was this spec's own rule). No research fact edited; research frontmatter untouched.
- **Lock rules (PASS):** SHARE-025 / DECK-081 rename and description while locked change no lock, hold, need or lock order (SHARE-030); DECK-080 deferred keeps its lock hint; DECK-082...085 consistent. SHARE-015 ordering by name is noted.
- **Cross-spec (PASS):** SPEC-007 and SPEC-003 only pins; SPEC-010 pins only; SPEC-013 TEST-025 byte arithmetic checks (3 decks about 11,200 B, total about 268 KB).
- **H-256 (PASS):** SHARE-034, 051, 053, Open questions 5 and 6, OWN-065 untouched.
- **V-009 pins (PASS):** Spec Index (SPEC-005 0.9, 006 0.11, 008 0.4.5, 013 0.1.4 and every row), `Depends on` lines and inline pins in Accounts and Sync, Collection Import, My Collection, Deck Import, Shared Cards, Test Data match; remaining older versions are changelog history only. Wikilinks in the 9 changed files resolve (two pre-existing broken line-wrapped links on the board are not from this change). API Contracts not edited.
- **Board rows (PASS with one fix):** H-060 / H-253 / H-254 scope and depends match; H-310, H-311 well-formed (12 columns), in range, `next_id: 310` untouched; Current State and Session Log not edited.

## Failures
1. `brain/02-Specs/Test Data.md` line 185 (AC 18): "five non-empty card sections" should be six (TEST-025 fills all six zones).
2. `brain/05-Handoffs/Handoff Board.md` H-311 (line 24): "locked deck short 50 of 54 → 92 %" should read "50 of 54 locked in (4 short) → 92 %".

## Attempt 2 (2026-11-25): PASS
Both failures confirmed fixed: Test Data.md AC 18 now says "six non-empty card sections"; H-311 reads "locked deck 50 of 54 locked in (4 short) → 92 