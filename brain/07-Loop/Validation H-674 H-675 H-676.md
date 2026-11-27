---
tags: [loop, validation]
board: H-674, H-675, H-676
as_of: 2026-11-26
---
# Validation H-674 H-675 H-676

2026-11-26 · H-674 + H-675 + H-676 · PASS · lint, build, unit (97 files / 1551 tests), spec and pin checks, `LISTED_REASONS` review · no failures

Branch `loop/H-674-rj-answers` (dev 142c358 + 2bab39e, 06cfb98, 7361516), Node 22.23.5.

## H-674 (spec): PASS
- RJ's four answers are recorded as his: (1) "Approve as built" in SPEC-008 0.8 and SPEC-010 0.19.1 (removal dialog, sync notice, "Lock these copies" / "Unlock these copies", the two snack bars); (2) "Yes, show a notice" (SHARE-097); (3) "Approve both" in SPEC-003 0.17.1 IMP-077 (c)/(d) and SPEC-006 DECK-106 (b)/(c), H-653 (3) and (4) left open; (4) "Shorten to a count" in LEGAL-R09 / DECK-107 with his option text.
- Not attributed to RJ: SHARE-097 exact strings ("builder defaults for RJ to confirm"), "Show cards" / "Hide cards" and count phrasing (DECK-107 builder defaults), and the extension to "Set status unknown", "Printing type unknown", "Unknown cards not checked" (LEGAL-R09 (c), "spec-writer's reading, not RJ's").
- Versions agree with the Spec Index: SPEC-008 0.8, 002 0.7, 006 0.18, 005 0.18, 003 0.17.1, 010 0.19.1; SPEC-013 pins updated (no bump).

## H-675: PASS
`cantLockReasonNotice` gives "Can't lock. <reason>."; deck toggle and card dialog control stay `aria-disabled` and focusable; save in progress ignored; unlock silent; first reason only. Covered by `lock-actions.spec.ts` and `deck-detail.spec.ts` (all pass). The card-name control has no UI test for "Ownership unavailable" because it is not rendered then (Open question 20): accepted.

## H-676: PASS
`notEvaluatedItems` built in `result()`; `app-not-checked-list` shows count lines with singulars, "{n} unknown cards not checked", "Show cards" / "Hide cards" with `aria-expanded` and 44 px targets; used by the import review and the Rule check dialog.

### `LISTED_REASONS` verdict: not a failure
- Correctness: the key is the full reason text, which embeds every name, and the value is built from those same names, so a hit always returns the names of the same text. No stale names across decks.
- Only edge: a name containing ", " (e.g. "Fizz, Trickster") could collide with two separate cards "Fizz" and "Trickster" in a different deck; neither pair exists as real cards today, so not filed.
- Leak: one small entry per distinct reason text per session (bounded by distinct decks checked); negligible. A cleaner design would return the items from the rule instead of a map; optional tidy-up. Also the two stacked JSDoc blocks above the map should be merged.

## Checks
| Check | Result |
|---|---|
| `npm run lint` | PASS |
| `npm run build` | PASS |
| `ng test` | PASS, 97 files / 1551 tests |
| Spec and pin consistency | PASS |
| e2e, test:rules | SKIPPED (not requested) |
