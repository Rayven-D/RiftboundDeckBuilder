---
tags: [validation]
item: H-383
---
# Validation H-383

2026-11-25 · H-383 · PASS · V-009 documentation checks plus the item's Accept column (notes agree with `deck-tile.ts` and `decks-list.spec.ts`) · no failures (two non-blocking notes; one P3 item filed, H-400).

## Checks
- **OWN-002 / OWN-102 / AC 25 (PASS):** OWN-002 says the lock badge is a separate `app-lock-badge` next to the chip, not a chip variant, with no date. OWN-102 is rewritten as (a) chip only for `ready` / `partial` / `none`, none for `locked` and `unavailable`; (b) badge `Locked` or `Locked · n cards short`, no date; (c) the four combinations (locked complete: no chip, "Locked"; short: Partly / None available chip plus the short badge; unavailable: no chip, "Locked", never "short"; unlocked: chip, no badge). Its Source cell cites RJ 2026-11-25 (H-382 (2)). AC 25 now says the badge "Locked" with no chip, and the short case "Partly available" plus "Locked · 2 cards short".
- **SHARE-041 / SHARE-050 / SHARE-053 (b) (PASS):** SHARE-041 puts "Locked in on `<date>`" in the Deck detail header only and the tile badge without a date; SHARE-050 and SHARE-053 (b) agree. SHARE-051 (groups `locked` / `unavailable` match none of the three options; rules 4, 5 for a short locked deck) is unchanged and consistent with OWN-102 (c).
- **`brain/04-UI/Decks.md` (PASS):** wireframe locked tile shows "[Locked] badge only", "(no ownership chip, no date)"; chip table now has a Lock badge column with the same rows as OWN-102; the date is stated as header-only. Consistent with [[Decks Components]] lines 144-148, which already said so.
- **Agreement with code (PASS):** `deck-tile.ts` renders `app-deck-status-chip` then `app-lock-badge [label]="s.lockBadge" [showDate]="false"` then `.copies`, and its doc comment states the same combinations. `decks-list.spec.ts` AC 25 test (lines 218-242) asserts: locked complete deck badge "Locked", no date (`app-lock-badge .date` null), "54 of 54 copies locked in"; short deck "Locked · 2 cards short" with `.badge--short`, order `['app-deck-status-chip', 'app-lock-badge']`; ownership unavailable (line 208-210) badge "Locked" and no chip. All match the notes. Code and tests were not run (docs-only item; `web/` unchanged).
- **Versions and indexes (PASS):** SPEC-005 0.10.3, SPEC-008 0.4.7 (frontmatter, `board` adds H-383, changelog "Current" lines say no ownership or lock rule changed); Spec Index rows for SPEC-005 and SPEC-008 agree, and the SPEC-005 to SPEC-008 0.4.7 / SPEC-008 to SPEC-005 0.10.3 pins agree in both specs and the Index; UI Index updated. Status stays `draft`.
- **V-009 (PASS):** every wikilink in SPEC-005, SPEC-008 and Decks.md resolves; numbered requirements and Given/When/Then intact.
- **Scope (PASS):** only brain notes changed (SPEC-005, SPEC-008, Spec Index, Decks, UI Index, board). No `web/`, `services/` edit.
- **Left-over "Locked in on `<date>`" (PASS):** remaining hits are the Deck detail header (Decks.md lines 213, 385; Decks Components line 214; SHARE-041, SHARE-053 header wording, SHARE-053 AC at line 450 about the detail view) and the H-254 build note. None describe the tile.

## Judgement: pin-only staleness (acceptable)
SPEC-003, SPEC-006, SPEC-007, SPEC-010, Accounts and Sync, Collection Import, Deck Import, My Collection (pins to SPEC-008 0.4.6) and API Contracts (changelog lines citing SPEC-005 0.10.2) were left as they are. Acceptable: those specs depend on engine, lock-store and import behaviour, none of which changed in 0.10.3 / 0.4.7 (tile presentation wording only), and API Contracts changelog entries are historical. The 0.10.3 change touches no contract, type, or shape. It does diverge from H-330, which refreshed pins, so the pins now trail by one patch; this stays harmless and is consistent with the stated pin-only practice. No fix required.

## Notes (non-blocking)
1. `web/src/app/shared/deck/deck-status-chip.ts` has a stale doc comment (says a locked deck shows its lock badge as the chip) and unused `locked` / `short` kinds. Code is out of scope here; filed as **H-400** (P3, builder).
2. Board row H-060 / H-254 text and the Decks Components note are not touched by this item; no action.
