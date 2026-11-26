---
tags: [validation]
item: H-481
---
# Validation H-481

2026-11-26 · H-481 · PASS · Accept column (SPEC-005 states (4), (6) and the tile % with ACs, RJ-attributed), no over-claiming vs [[Decks Review]] and the H-392 board answer, cross-spec read, live pin grep, V-009 · no failures (one judgement, one non-blocking note).

## Checks
- **Accept column (PASS):** [[Your Decks Ownership View]] 0.11: OWN-110 (b)/(c) (Legend / Champion count only when empty, "Legend 0" / "Champion 0" as visible text, never colour alone; Main, Battlefields, Runes, Sideboard always count), AC 34; OWN-119 (b) (no "Deck detail" heading, H1 "This deck isn't in your decks", exactly one H1), AC 35; OWN-101 (d) (tile % 16 px, weight 600, like the deck name; header % unchanged), AC 36. ACs are Given/When/Then and numbered after AC 33 with no gap or clash. Source cells cite RJ 2026-11-26 (H-392).
- **No over-claiming (PASS):** matches the H-392 row on the board (RJ 2026-11-26) and the [[Decks Review]] recommendations he accepted (lines 179-184, 195). The not-found document title is NOT written as decided: Open question 19 says it is the reviewer's proposal, not RJ's answer. The back-link look is left to H-467 (S7). (1), (2), (3), (5) are written as settled as built (Open question 18) with no requirement text change, as RJ said. Status stays `draft`.
- **Cross-spec / UI notes (PASS):** no conflict found. [[Decks]] wireframe ("Legend · Champion · Main 39 · Battlefields 3 ...") already agrees with the new rule; no note elsewhere says the tile % is 20 px or keeps a "Deck detail" not-found heading. OWN-054 / ADR-0003 (no percentages on the Missing tab etc.) untouched; OWN-101 (d) place list unchanged.
- **Version and pins (PASS):** SPEC-005 frontmatter 0.11 = Spec Index row 0.11; `board` adds H-481; changelog "Current" line states no ownership rule, data field or filter changed. SPEC-008 (Shared Cards and Lock-in) stays 0.4.7 and its "Depends on" and changelog now pin SPEC-005 0.11 (pin-only, noted as such). Spec Index SPEC-008 row cites SPEC-005 0.11.
- **Board (PASS):** H-481 row keeps 12 columns; H-482 (build) depends on H-481 and its Accept names the same three changes.
- **V-009 (PASS):** wikilinks in the four changed notes resolve (the two hits in the board file are pre-existing code-span text, not links). Requirements numbered, ACs Given/When/Then.
- **Scope (PASS):** brain-only (4 files); no `web/`, `services/` change, so no code or UI checks apply (SKIPPED: tests, build, design skills).

## Judgement: SPEC-010 pin at SPEC-005 0.10.2 (acceptable, no bump)
Spec Index SPEC-010 row and [[Accounts and Sync]] pin SPEC-005 0.10.2, already one patch behind (0.10.3). Acceptable, same reasoning as [[Validation H-383]]: SPEC-010 depends on the sync and gate behaviour, and 0.11 only changes Deck detail presentation (section bar counts, not-found heading, tile % size). Nothing SPEC-010 relies on changed. Bump it only the next time SPEC-010 is edited for another reason.

## Notes (non-blocking)
1. Open question 19 (not-found document title) is unanswered. H-482's builder keeps the built title; if RJ wants "Deck not found · Rift Builder" it needs his answer first.
2. SPEC-005 remains `draft`, RJ has not approved the whole spec.
